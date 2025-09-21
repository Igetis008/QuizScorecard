# Deployment Guide

Complete guide for deploying the Real-Time Quiz Scoreboard System to production.

## Overview

This application consists of:
- **Backend**: Node.js server with Express, Socket.io, and SQLite
- **Frontend**: React SPA built with Vite
- **Database**: SQLite (file-based, no external database required)
- **File Storage**: Local filesystem for slide templates

## Deployment Options

### 1. Traditional VPS/Server Deployment
### 2. Docker Deployment
### 3. Cloud Platform Deployment (Heroku, Railway, etc.)
### 4. Serverless Deployment (with limitations)

## Prerequisites

- Node.js 16+ and npm
- Domain name (recommended)
- SSL certificate (required for WebSocket connections)
- Minimum 1GB RAM, 10GB storage

## Option 1: VPS/Server Deployment

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Application Setup

```bash
# Clone repository
git clone <your-repository-url>
cd quiz-scoreboard

# Install dependencies
npm install

# Build frontend
npm run build

# Create production environment file
cp .env.example .env
```

### Step 3: Environment Configuration

Create `.env` file:
```bash
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secure-jwt-secret-key-here
DATABASE_PATH=./quiz_scoreboard.db
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=52428800
CORS_ORIGIN=https://yourdomain.com
```

### Step 4: Database Setup

```bash
# Create database directory
mkdir -p data

# Set permissions
chmod 755 data
```

### Step 5: PM2 Configuration

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'quiz-scoreboard',
    script: 'server/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start application:
```bash
# Create logs directory
mkdir logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

### Step 6: Nginx Configuration

Create `/etc/nginx/sites-available/quiz-scoreboard`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (will be added by Certbot)
    
    # Serve static files
    location / {
        root /path/to/quiz-scoreboard/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API routes
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Socket.io WebSocket connections
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/quiz-scoreboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 8: Firewall Configuration

```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Option 2: Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Create directories and set permissions
RUN mkdir -p /app/data /app/uploads /app/logs
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

CMD ["node", "server/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  quiz-scoreboard:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3001
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - quiz-scoreboard
    restart: unless-stopped
```

### Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Update application
git pull
docker-compose build
docker-compose up -d
```

## Option 3: Cloud Platform Deployment

### Heroku Deployment

1. **Prepare for Heroku**:
```json
// package.json
{
  "scripts": {
    "start": "node server/index.js",
    "heroku-postbuild": "npm run build"
  }
}
```

2. **Create Procfile**:
```
web: node server/index.js
```

3. **Deploy**:
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-quiz-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key

# Deploy
git push heroku main
```

### Railway Deployment

1. **Connect GitHub repository** to Railway
2. **Set environment variables** in Railway dashboard
3. **Deploy automatically** on git push

### Render Deployment

1. **Connect repository** to Render
2. **Configure build settings**:
   - Build Command: `npm install && npm run build`
   - Start Command: `node server/index.js`
3. **Set environment variables**

## Database Considerations

### SQLite in Production

**Pros**:
- No external database required
- Simple deployment
- Good performance for moderate load

**Cons**:
- Single file can be a bottleneck
- Limited concurrent writes
- Backup complexity

### Migration to PostgreSQL (Optional)

For high-traffic deployments, consider PostgreSQL:

```javascript
// Add to package.json
"pg": "^8.8.0"

// Update database connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
});
```

## Performance Optimization

### 1. Enable Gzip Compression

```javascript
// server/index.js
const compression = require('compression');
app.use(compression());
```

### 2. Static File Caching

```nginx
# In Nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. Database Optimization

```javascript
// Enable WAL mode for better concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA cache_size = 1000000;');
```

### 4. Socket.io Optimization

```javascript
// server/index.js
const io = socketIo(server, {
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6
});
```

## Monitoring and Logging

### 1. Application Monitoring

```javascript
// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

### 2. Log Management

```javascript
// Use winston for structured logging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### 3. PM2 Monitoring

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart quiz-scoreboard
```

## Backup Strategy

### 1. Database Backup

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
cp quiz_scoreboard.db backups/quiz_scoreboard_$DATE.db
find backups/ -name "*.db" -mtime +7 -delete
```

### 2. File Backup

```bash
# Backup uploads directory
tar -czf backups/uploads_$DATE.tar.gz uploads/
```

### 3. Automated Backups

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

## Security Checklist

- [ ] Use HTTPS/SSL certificates
- [ ] Set secure JWT secret
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Monitor for vulnerabilities
- [ ] Secure file upload validation
- [ ] Database access controls

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check SSL certificate
   - Verify proxy configuration
   - Test with different transports

2. **Database Locked**
   - Enable WAL mode
   - Check file permissions
   - Monitor concurrent connections

3. **File Upload Issues**
   - Check disk space
   - Verify upload directory permissions
   - Review file size limits

### Debug Commands

```bash
# Check application status
pm2 status

# View real-time logs
pm2 logs --lines 100

# Check Nginx configuration
sudo nginx -t

# Test SSL certificate
openssl s_client -connect yourdomain.com:443

# Check port availability
netstat -tlnp | grep :3001
```

## Scaling Considerations

### Horizontal Scaling

For multiple server instances:

1. **Use Redis for session storage**
2. **Implement sticky sessions**
3. **Share file storage (NFS/S3)**
4. **Load balancer configuration**

### Vertical Scaling

- Monitor CPU and memory usage
- Optimize database queries
- Implement caching strategies
- Use CDN for static assets

This deployment guide ensures a robust, secure, and scalable production deployment of your quiz scoreboard system.