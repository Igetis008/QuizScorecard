const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const archiver = require('archiver');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Database setup
const db = new sqlite3.Database('./quiz_scoreboard.db');

// Initialize database tables
db.serialize(() => {
  // Users table for host authentication
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Quiz sessions table
  db.run(`CREATE TABLE IF NOT EXISTS quiz_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    host_id INTEGER,
    room_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users (id)
  )`);

  // Teams table
  db.run(`CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    name TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    color TEXT,
    position INTEGER,
    FOREIGN KEY (session_id) REFERENCES quiz_sessions (id)
  )`);

  // Score history table
  db.run(`CREATE TABLE IF NOT EXISTS score_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    team_id TEXT,
    old_score INTEGER,
    new_score INTEGER,
    change_amount INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES quiz_sessions (id),
    FOREIGN KEY (team_id) REFERENCES teams (id)
  )`);

  // Slide templates table
  db.run(`CREATE TABLE IF NOT EXISTS slide_templates (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    platform TEXT NOT NULL,
    template_data TEXT,
    mapping_config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES quiz_sessions (id)
  )`);
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pptx', '.ppt', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Active sessions and connections
const activeSessions = new Map();
const socketToSession = new Map();

// Utility functions
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        
        const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET);
        res.json({ token, user: { id: this.lastID, username } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user || !await bcrypt.compare(password, user.password)) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Quiz session routes
app.post('/api/sessions', authenticateToken, (req, res) => {
  const { title, teams } = req.body;
  const sessionId = uuidv4();
  const roomCode = generateRoomCode();
  
  db.serialize(() => {
    db.run(
      'INSERT INTO quiz_sessions (id, title, host_id, room_code) VALUES (?, ?, ?, ?)',
      [sessionId, title, req.user.id, roomCode],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create session' });
        }
        
        // Insert teams
        const teamInserts = teams.map((team, index) => {
          const teamId = uuidv4();
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO teams (id, session_id, name, score, color, position) VALUES (?, ?, ?, ?, ?, ?)',
              [teamId, sessionId, team.name, 0, team.color, index],
              function(err) {
                if (err) reject(err);
                else resolve({ ...team, id: teamId, score: 0 });
              }
            );
          });
        });
        
        Promise.all(teamInserts)
          .then(insertedTeams => {
            // Initialize session in memory
            activeSessions.set(sessionId, {
              id: sessionId,
              title,
              roomCode,
              hostId: req.user.id,
              teams: insertedTeams,
              connections: new Set(),
              hostSocket: null
            });
            
            res.json({
              sessionId,
              roomCode,
              title,
              teams: insertedTeams
            });
          })
          .catch(err => {
            res.status(500).json({ error: 'Failed to create teams' });
          });
      }
    );
  });
});

app.get('/api/sessions/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  
  db.get(
    'SELECT * FROM quiz_sessions WHERE id = ? AND host_id = ?',
    [sessionId, req.user.id],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      db.all(
        'SELECT * FROM teams WHERE session_id = ? ORDER BY position',
        [sessionId],
        (err, teams) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({ ...session, teams });
        }
      );
    }
  );
});

app.post('/api/sessions/join', (req, res) => {
  const { roomCode } = req.body;
  
  db.get(
    'SELECT * FROM quiz_sessions WHERE room_code = ? AND status = "active"',
    [roomCode],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      db.all(
        'SELECT * FROM teams WHERE session_id = ? ORDER BY position',
        [session.id],
        (err, teams) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({
            sessionId: session.id,
            title: session.title,
            teams,
            isSpectator: true
          });
        }
      );
    }
  );
});

// Score history route
app.get('/api/sessions/:sessionId/history', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  
  db.all(
    `SELECT h.*, t.name as team_name 
     FROM score_history h 
     JOIN teams t ON h.team_id = t.id 
     WHERE h.session_id = ? 
     ORDER BY h.timestamp DESC 
     LIMIT 100`,
    [sessionId],
    (err, history) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json(history);
    }
  );
});

// Slide template routes
app.post('/api/sessions/:sessionId/templates', authenticateToken, upload.single('template'), (req, res) => {
  const { sessionId } = req.params;
  const { platform, mappingConfig } = req.body;
  const templateId = uuidv4();
  
  let templateData = null;
  if (req.file) {
    templateData = fs.readFileSync(req.file.path, 'base64');
    fs.unlinkSync(req.file.path); // Clean up uploaded file
  }
  
  db.run(
    'INSERT INTO slide_templates (id, session_id, platform, template_data, mapping_config) VALUES (?, ?, ?, ?, ?)',
    [templateId, sessionId, platform, templateData, mappingConfig],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save template' });
      }
      
      res.json({ templateId, platform, mappingConfig });
    }
  );
});

app.get('/api/sessions/:sessionId/templates', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  
  db.all(
    'SELECT id, platform, mapping_config, created_at FROM slide_templates WHERE session_id = ?',
    [sessionId],
    (err, templates) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json(templates);
    }
  );
});

// Export updated slides
app.post('/api/sessions/:sessionId/export-slides', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const { templateId } = req.body;
  
  // Get current team scores
  db.all(
    'SELECT name, score FROM teams WHERE session_id = ? ORDER BY position',
    [sessionId],
    (err, teams) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get template
      db.get(
        'SELECT * FROM slide_templates WHERE id = ? AND session_id = ?',
        [templateId, sessionId],
        (err, template) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          if (!template) {
            return res.status(404).json({ error: 'Template not found' });
          }
          
          // Process template based on platform
          processSlideTemplate(template, teams, (err, result) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to process template' });
            }
            
            res.json(result);
          });
        }
      );
    }
  );
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-session', (data) => {
    const { sessionId, isHost, token } = data;
    
    // Verify host token if provided
    if (isHost && token) {
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          socket.emit('error', { message: 'Invalid token' });
          return;
        }
        
        const session = activeSessions.get(sessionId);
        if (session && session.hostId === user.id) {
          session.hostSocket = socket.id;
          socket.join(sessionId);
          socketToSession.set(socket.id, sessionId);
          socket.emit('session-joined', { isHost: true, session });
        } else {
          socket.emit('error', { message: 'Session not found or unauthorized' });
        }
      });
    } else {
      // Spectator joining
      const session = activeSessions.get(sessionId);
      if (session) {
        session.connections.add(socket.id);
        socket.join(sessionId);
        socketToSession.set(socket.id, sessionId);
        socket.emit('session-joined', { 
          isHost: false, 
          session: {
            id: session.id,
            title: session.title,
            teams: session.teams
          }
        });
        
        // Notify host of new spectator
        if (session.hostSocket) {
          io.to(session.hostSocket).emit('spectator-joined', {
            count: session.connections.size
          });
        }
      } else {
        socket.emit('error', { message: 'Session not found' });
      }
    }
  });
  
  socket.on('update-score', (data) => {
    const sessionId = socketToSession.get(socket.id);
    const session = activeSessions.get(sessionId);
    
    if (!session || session.hostSocket !== socket.id) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    
    const { teamId, newScore, changeAmount } = data;
    const team = session.teams.find(t => t.id === teamId);
    
    if (team) {
      const oldScore = team.score;
      team.score = Math.max(0, newScore);
      
      // Update database
      db.run(
        'UPDATE teams SET score = ? WHERE id = ?',
        [team.score, teamId],
        (err) => {
          if (!err) {
            // Log score change
            db.run(
              'INSERT INTO score_history (session_id, team_id, old_score, new_score, change_amount) VALUES (?, ?, ?, ?, ?)',
              [sessionId, teamId, oldScore, team.score, changeAmount]
            );
          }
        }
      );
      
      // Broadcast update to all clients in session
      io.to(sessionId).emit('score-updated', {
        teamId,
        newScore: team.score,
        changeAmount,
        teams: session.teams
      });
      
      // Trigger slide update if templates exist
      updateSlides(sessionId, session.teams);
    }
  });
  
  socket.on('reset-scores', () => {
    const sessionId = socketToSession.get(socket.id);
    const session = activeSessions.get(sessionId);
    
    if (!session || session.hostSocket !== socket.id) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    
    // Reset all team scores
    session.teams.forEach(team => {
      const oldScore = team.score;
      team.score = 0;
      
      // Update database
      db.run('UPDATE teams SET score = 0 WHERE id = ?', [team.id]);
      
      // Log score change
      db.run(
        'INSERT INTO score_history (session_id, team_id, old_score, new_score, change_amount) VALUES (?, ?, ?, ?, ?)',
        [sessionId, team.id, oldScore, 0, -oldScore]
      );
    });
    
    // Broadcast update
    io.to(sessionId).emit('scores-reset', {
      teams: session.teams
    });
    
    // Trigger slide update
    updateSlides(sessionId, session.teams);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const sessionId = socketToSession.get(socket.id);
    if (sessionId) {
      const session = activeSessions.get(sessionId);
      if (session) {
        if (session.hostSocket === socket.id) {
          session.hostSocket = null;
        } else {
          session.connections.delete(socket.id);
          
          // Notify host of spectator leaving
          if (session.hostSocket) {
            io.to(session.hostSocket).emit('spectator-left', {
              count: session.connections.size
            });
          }
        }
      }
      socketToSession.delete(socket.id);
    }
  });
});

// Slide processing functions
function processSlideTemplate(template, teams, callback) {
  try {
    const mappingConfig = JSON.parse(template.mapping_config);
    
    switch (template.platform) {
      case 'powerpoint':
        processPowerPointTemplate(template, teams, mappingConfig, callback);
        break;
      case 'google-slides':
        processGoogleSlidesTemplate(template, teams, mappingConfig, callback);
        break;
      case 'canva':
        processCanvaTemplate(template, teams, mappingConfig, callback);
        break;
      default:
        callback(new Error('Unsupported platform'));
    }
  } catch (error) {
    callback(error);
  }
}

function processPowerPointTemplate(template, teams, mappingConfig, callback) {
  // For PowerPoint, we'll create a JSON file with updated scores
  // In a production environment, you'd use python-pptx or similar
  const updatedData = {
    platform: 'powerpoint',
    teams: teams.map(team => ({
      name: team.name,
      score: team.score,
      placeholder: mappingConfig.teamMappings?.[team.name] || `{{${team.name}_score}}`
    })),
    instructions: 'Replace placeholders in your PowerPoint template with the corresponding scores',
    timestamp: new Date().toISOString()
  };
  
  callback(null, {
    type: 'json',
    data: updatedData,
    filename: `powerpoint-scores-${Date.now()}.json`
  });
}

function processGoogleSlidesTemplate(template, teams, mappingConfig, callback) {
  // For Google Slides, we'd use the Google Slides API
  // This is a simplified version - in production, implement full API integration
  const updatedData = {
    platform: 'google-slides',
    presentationId: mappingConfig.presentationId,
    updates: teams.map(team => ({
      elementId: mappingConfig.teamMappings?.[team.name],
      text: team.score.toString(),
      teamName: team.name
    })),
    timestamp: new Date().toISOString()
  };
  
  callback(null, {
    type: 'api-instructions',
    data: updatedData,
    filename: `google-slides-updates-${Date.now()}.json`
  });
}

function processCanvaTemplate(template, teams, mappingConfig, callback) {
  // For Canva, provide export data
  const updatedData = {
    platform: 'canva',
    teams: teams.map(team => ({
      name: team.name,
      score: team.score,
      elementId: mappingConfig.teamMappings?.[team.name]
    })),
    instructions: 'Manually update text elements in Canva with the provided scores',
    timestamp: new Date().toISOString()
  };
  
  callback(null, {
    type: 'manual-update',
    data: updatedData,
    filename: `canva-scores-${Date.now()}.json`
  });
}

function updateSlides(sessionId, teams) {
  // Check if there are any slide templates for this session
  db.all(
    'SELECT * FROM slide_templates WHERE session_id = ?',
    [sessionId],
    (err, templates) => {
      if (err || !templates.length) return;
      
      templates.forEach(template => {
        processSlideTemplate(template, teams, (err, result) => {
          if (!err && result) {
            // Emit slide update to host
            const session = activeSessions.get(sessionId);
            if (session && session.hostSocket) {
              io.to(session.hostSocket).emit('slide-update-available', {
                templateId: template.id,
                platform: template.platform,
                updateData: result
              });
            }
          }
        });
      });
    }
  );
}

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };