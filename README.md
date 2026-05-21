# Quiz Scorecard — Python Edition

A real-time quiz scoreboard rebuilt with:
- **Backend**: Python + Flask + Flask-SocketIO + SQLite
- **Frontend**: Plain HTML5 + CSS3 + Vanilla JavaScript (no build step needed)

## Quick Start

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Run the server
python server.py

# 3. Open your browser
#    Host:      http://localhost:3001
#    Spectator: http://localhost:3001?room=<ROOM_CODE>
```

## Project Structure

```
QuizScorecard-Python/
├── server.py          # Flask + SocketIO backend (all API + socket logic)
├── requirements.txt
├── templates/
│   └── index.html     # Single-page app shell
└── static/
    ├── css/style.css  # All styling (no Tailwind, pure CSS)
    └── js/app.js      # Vanilla JS SPA logic
```

## Features
- Host login / registration (bcrypt passwords, JWT auth)
- Create quiz sessions with up to 5 teams
- Real-time score updates via WebSocket (Socket.IO)
- Spectator view via shareable room-code link
- Score history log
- Reset all scores
- Works without any build tools or Node.js
