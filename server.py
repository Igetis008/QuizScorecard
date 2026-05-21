import os
import sqlite3
import uuid
import random
import string
from datetime import datetime, timezone
from functools import wraps

import bcrypt
import jwt
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

# ── App setup ────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
DB_PATH = "quiz_scoreboard.db"

# ── Database ──────────────────────────────────────────────────────────────────
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db:
        db.close()

def init_db():
    with sqlite3.connect(DB_PATH) as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS quiz_sessions (
                id        TEXT PRIMARY KEY,
                title     TEXT NOT NULL,
                host_id   INTEGER,
                room_code TEXT UNIQUE NOT NULL,
                status    TEXT DEFAULT 'active',
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (host_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS teams (
                id         TEXT PRIMARY KEY,
                session_id TEXT,
                name       TEXT NOT NULL,
                score      INTEGER DEFAULT 0,
                color      TEXT,
                position   INTEGER,
                FOREIGN KEY (session_id) REFERENCES quiz_sessions(id)
            );
            CREATE TABLE IF NOT EXISTS score_history (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id    TEXT,
                team_id       TEXT,
                team_name     TEXT,
                old_score     INTEGER,
                new_score     INTEGER,
                change_amount INTEGER,
                timestamp     TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (session_id) REFERENCES quiz_sessions(id)
            );
        """)

init_db()

# ── Helpers ───────────────────────────────────────────────────────────────────
def gen_room_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

def make_token(user_id: int, username: str) -> str:
    return jwt.encode({"id": user_id, "username": username}, JWT_SECRET, algorithm="HS256")

def decode_token(token: str):
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Unauthorised"}), 401
        try:
            g.user = decode_token(auth.split(" ", 1)[1])
        except jwt.PyJWTError:
            return jsonify({"error": "Invalid token"}), 403
        return f(*args, **kwargs)
    return wrapper

def session_to_dict(row, db):
    teams = db.execute(
        "SELECT * FROM teams WHERE session_id=? ORDER BY position", (row["id"],)
    ).fetchall()
    return {
        "id": row["id"],
        "sessionId": row["id"],
        "title": row["title"],
        "roomCode": row["room_code"],
        "hostId": row["host_id"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "teams": [dict(t) for t in teams],
    }

# ── Auth routes ───────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
def register():
    data = request.get_json(force=True)
    username, password = data.get("username", ""), data.get("password", "")
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed)
        )
        db.commit()
        user_id = cur.lastrowid
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 400

    token = make_token(user_id, username)
    return jsonify({"token": token, "user": {"id": user_id, "username": username}})

@app.post("/api/auth/login")
def login():
    data = request.get_json(force=True)
    username, password = data.get("username", ""), data.get("password", "")
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    if not row or not bcrypt.checkpw(password.encode(), row["password"].encode()):
        return jsonify({"error": "Invalid credentials"}), 401

    token = make_token(row["id"], row["username"])
    return jsonify({"token": token, "user": {"id": row["id"], "username": row["username"]}})

# ── Session routes ────────────────────────────────────────────────────────────
@app.post("/api/sessions")
@require_auth
def create_session():
    data = request.get_json(force=True)
    title = data.get("title", "Untitled Quiz")
    teams_data = data.get("teams", [])

    session_id = str(uuid.uuid4())
    room_code = gen_room_code()
    db = get_db()

    db.execute(
        "INSERT INTO quiz_sessions (id, title, host_id, room_code) VALUES (?,?,?,?)",
        (session_id, title, g.user["id"], room_code),
    )

    colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"]
    for i, team in enumerate(teams_data):
        team_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO teams (id, session_id, name, color, position) VALUES (?,?,?,?,?)",
            (team_id, session_id, team["name"], colors[i % len(colors)], i),
        )

    db.commit()
    row = db.execute("SELECT * FROM quiz_sessions WHERE id=?", (session_id,)).fetchone()
    return jsonify(session_to_dict(row, db)), 201

@app.get("/api/sessions/<session_id>")
@require_auth
def get_session(session_id):
    db = get_db()
    row = db.execute("SELECT * FROM quiz_sessions WHERE id=?", (session_id,)).fetchone()
    if not row:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(session_to_dict(row, db))

@app.post("/api/sessions/join")
def join_session_api():
    data = request.get_json(force=True)
    room_code = data.get("roomCode", "").upper()
    db = get_db()
    row = db.execute("SELECT * FROM quiz_sessions WHERE room_code=?", (room_code,)).fetchone()
    if not row:
        return jsonify({"error": "Session not found"}), 404
    result = session_to_dict(row, db)
    result["isSpectator"] = True
    return jsonify(result)

@app.get("/api/sessions/<session_id>/history")
@require_auth
def get_history(session_id):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM score_history WHERE session_id=? ORDER BY timestamp DESC LIMIT 100",
        (session_id,),
    ).fetchall()
    return jsonify([dict(r) for r in rows])

# ── Score update (REST fallback) ──────────────────────────────────────────────
@app.post("/api/sessions/<session_id>/score")
@require_auth
def update_score_rest(session_id):
    data = request.get_json(force=True)
    team_id = data["teamId"]
    new_score = data["newScore"]
    change = data["changeAmount"]

    db = get_db()
    team = db.execute("SELECT * FROM teams WHERE id=? AND session_id=?", (team_id, session_id)).fetchone()
    if not team:
        return jsonify({"error": "Team not found"}), 404

    db.execute("UPDATE teams SET score=? WHERE id=?", (new_score, team_id))
    db.execute(
        "INSERT INTO score_history (session_id, team_id, team_name, old_score, new_score, change_amount) VALUES (?,?,?,?,?,?)",
        (session_id, team_id, team["name"], team["score"], new_score, change),
    )
    db.commit()
    teams = db.execute("SELECT * FROM teams WHERE session_id=? ORDER BY position", (session_id,)).fetchall()
    return jsonify({"teams": [dict(t) for t in teams]})

# ── Socket.IO events ──────────────────────────────────────────────────────────
active_sessions: dict[str, dict] = {}   # session_id -> {host_sid, spectator_sids}

@socketio.on("join-session")
def on_join(data):
    session_id = data.get("sessionId")
    is_host = data.get("isHost", False)
    token_str = data.get("token")

    if not session_id:
        emit("error", {"message": "No session ID"})
        return

    with app.app_context():
        with sqlite3.connect(DB_PATH) as db:
            db.row_factory = sqlite3.Row
            row = db.execute("SELECT * FROM quiz_sessions WHERE id=?", (session_id,)).fetchone()
            if not row:
                emit("error", {"message": "Session not found"})
                return
            sess_dict = session_to_dict(row, db)

    join_room(session_id)
    if session_id not in active_sessions:
        active_sessions[session_id] = {"spectators": set()}
    if not is_host:
        active_sessions[session_id]["spectators"].add(request.sid)
        emit("spectator-joined", {"count": len(active_sessions[session_id]["spectators"])}, to=session_id)

    emit("session-joined", {"isHost": is_host, "session": sess_dict})

@socketio.on("update-score")
def on_update_score(data):
    session_id = data.get("sessionId")
    team_id = data.get("teamId")
    new_score = data.get("newScore", 0)
    change = data.get("changeAmount", 0)

    with app.app_context():
        with sqlite3.connect(DB_PATH) as db:
            db.row_factory = sqlite3.Row
            team = db.execute("SELECT * FROM teams WHERE id=?", (team_id,)).fetchone()
            if not team:
                return
            db.execute("UPDATE teams SET score=? WHERE id=?", (new_score, team_id))
            db.execute(
                "INSERT INTO score_history (session_id, team_id, team_name, old_score, new_score, change_amount) VALUES (?,?,?,?,?,?)",
                (session_id, team_id, team["name"], team["score"], new_score, change),
            )
            db.commit()
            teams = db.execute("SELECT * FROM teams WHERE session_id=? ORDER BY position", (session_id,)).fetchall()
            teams_list = [dict(t) for t in teams]

    emit("score-updated", {"teamId": team_id, "newScore": new_score, "changeAmount": change, "teams": teams_list}, to=session_id)

@socketio.on("reset-scores")
def on_reset(data):
    session_id = data.get("sessionId")
    with app.app_context():
        with sqlite3.connect(DB_PATH) as db:
            db.row_factory = sqlite3.Row
            db.execute("UPDATE teams SET score=0 WHERE session_id=?", (session_id,))
            db.commit()
            teams = db.execute("SELECT * FROM teams WHERE session_id=? ORDER BY position", (session_id,)).fetchall()
            teams_list = [dict(t) for t in teams]

    emit("scores-reset", {"teams": teams_list}, to=session_id)

@socketio.on("disconnect")
def on_disconnect():
    for session_id, info in active_sessions.items():
        if request.sid in info["spectators"]:
            info["spectators"].discard(request.sid)
            emit("spectator-left", {"count": len(info["spectators"])}, to=session_id)

# ── Serve frontend ────────────────────────────────────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path=""):
    if path.startswith("api/") or path.startswith("socket.io"):
        return jsonify({"error": "Not found"}), 404
    static_file = os.path.join(app.static_folder, path)
    if path and os.path.isfile(static_file):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.template_folder, "index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3001))
    print(f"✅ Quiz Scorecard running on http://localhost:{port}")
    socketio.run(app, host="0.0.0.0", port=port, debug=True)
