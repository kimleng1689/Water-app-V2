# Dara Pichmony Water Station | Setup & Deployment Guide

## 📋 Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Production Deployment](#production-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Security Best Practices](#security-best-practices)
5. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites
- Windows 10/11 with PowerShell 5.1+
- Node.js 14+ (for backend services)
- Python 3.8+ (for invoice server)
- Modern web browser (Chrome, Firefox, Edge)
- Git for version control

### Step 1: Clone and Navigate
```powershell
cd "e:\My Code\customer-payment-portal"
```

### Step 2: Start Local Server
```powershell
# Option 1: Using PowerShell
.\server.ps1

# Option 2: Using Node.js (if Node is installed)
npm install
npm start
```

### Step 3: Access Application
Open browser and navigate to: `http://localhost:5500`

### Step 4: Set Up Backend Email Service (Optional)
```powershell
# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
$env:SMTP_USER="your-email@gmail.com"
$env:SMTP_PASS="your-app-password"
$env:TELEGRAM_BOT_TOKEN="your-bot-token"
$env:TELEGRAM_CHAT_ID="your-channel-id"
$env:FRONTEND_ORIGIN="http://localhost:5500"

# Start the backend service
python invoice_server.py
```

---

## Production Deployment

### 1. Environment Setup

#### AWS EC2 Deployment
```bash
# Update system
sudo apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python
sudo apt install -y python3 python3-pip

# Clone repository
git clone <repository-url>
cd customer-payment-portal
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://localhost:5500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API endpoint
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. SSL/TLS Certificate
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (free from Let's Encrypt)
sudo certbot certonly --nginx -d yourdomain.com
```

### 3. Docker Deployment
```dockerfile
# Dockerfile
FROM node:16-alpine

WORKDIR /app

# Copy files
COPY . .
RUN npm install

# Expose ports
EXPOSE 5500 3000

# Start application
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "5500:5500"
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    volumes:
      - ./data:/app/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
```

---

## Environment Configuration

### .env File Template
```env
# Application Settings
NODE_ENV=production
PORT=3000
FRONTEND_ORIGIN=https://yourdomain.com

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password

EMAIL_FROM=noreply@yourdomain.com

# Telegram Notifications (Optional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-channel-id

# Database
DB_HOST=localhost
DB_USER=root
DB_PASS=secure-password
DB_NAME=aquapure

# Security
JWT_SECRET=your-super-secret-key-here
API_KEY=your-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Gmail App Password Setup
1. Go to: https://myaccount.google.com/security
2. Enable 2-Factor Authentication
3. Go to App passwords
4. Select Mail and Windows Computer
5. Copy the generated 16-character password

### Telegram Bot Setup
1. Open Telegram and message `@BotFather`
2. Run `/newbot` command
3. Follow prompts to create bot
4. Copy the bot token
5. Add bot to your channel with admin rights
6. Get channel ID by posting a message and checking logs

---

## Security Best Practices

### 1. Input Validation
✅ All user inputs are validated on client-side  
⚠️ TODO: Implement server-side validation  

```javascript
// Always validate before processing
const { isValid, errors } = InputValidator.validateForm(data, rules);
```

### 2. Data Sanitization
✅ Implemented HTML/XSS sanitization  
✅ Phone numbers and emails are cleaned  

```javascript
const clean = InputSanitizer.sanitizeHtml(userInput);
```

### 3. HTTPS/TLS
```nginx
# Use SSL/TLS in production
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
```

### 4. CORS Configuration
```javascript
// src/config/cors.js
const corsOptions = {
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 5. Rate Limiting
```javascript
// Prevent brute force attacks
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 6. Environment Variables
- Never commit `.env` to Git
- Use `.gitignore` to exclude sensitive files
- Use different credentials for dev/prod

```gitignore
.env
.env.local
node_modules/
*.log
.DS_Store
```

### 7. Database Security
- Use parameterized queries to prevent SQL injection
- Hash passwords with bcrypt or Argon2
- Implement database backups

```javascript
// ❌ DON'T: Vulnerable to SQL injection
db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ DO: Use parameterized queries
db.query('SELECT * FROM users WHERE id = ?', [userId]);
```

### 8. Session Management
- Use secure cookies (httpOnly, secure, sameSite)
- Implement CSRF token protection
- Add session timeouts

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));
```

### 9. Logging & Monitoring
- Log all errors and suspicious activities
- Monitor for unusual patterns
- Set up alerts for critical issues

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 10. Regular Updates
- Keep dependencies updated
- Monitor security advisories
- Perform regular security audits

```bash
# Check for vulnerabilities
npm audit
npm audit fix

# Update packages
npm update
npm outdated
```

---

## Troubleshooting

### Issue: Server Won't Start
**Solution**:
```powershell
# Check port 5500 is not in use
netstat -ano | findstr :5500

# Kill process if needed
taskkill /PID <PID> /F

# Try different port
$env:PORT=3000
.\server.ps1
```

### Issue: SSL Certificate Error
**Solution**:
```bash
# Renew certificate
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Check certificate validity
openssl x509 -in cert.pem -noout -dates
```

### Issue: Email Not Sending
**Solution**:
```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Check logs
tail -f /var/log/mail.log

# Verify Gmail app password (not regular password)
# Check firewall rules for SMTP port 587
```

### Issue: High Memory Usage
**Solution**:
```javascript
// Implement pagination
const ITEMS_PER_PAGE = 50;
const offset = (page - 1) * ITEMS_PER_PAGE;
const items = db.getCustomers().slice(offset, offset + ITEMS_PER_PAGE);

// Clear cache periodically
setInterval(() => {
  cache.clear();
}, 60 * 60 * 1000); // 1 hour
```

### Issue: Slow Database Queries
**Solution**:
```javascript
// Add indexes for frequently searched fields
db.collection.createIndex({ email: 1 });
db.collection.createIndex({ meterId: 1 });

// Use pagination for large datasets
// Implement caching for read-heavy operations
```

---

## Monitoring & Maintenance

### Daily Checks
- [ ] Check error logs
- [ ] Verify email service is working
- [ ] Monitor server resource usage
- [ ] Check SSL certificate expiry (30 days before)

### Weekly Checks
- [ ] Review security logs
- [ ] Backup database
- [ ] Check for pending updates
- [ ] Verify backup integrity

### Monthly Checks
- [ ] Security audit
- [ ] Performance analysis
- [ ] User feedback review
- [ ] Dependency updates

### Annual Checks
- [ ] Full system audit
- [ ] Penetration testing
- [ ] Compliance verification
- [ ] Disaster recovery drill

---

## Backup & Recovery

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/aquapure"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup localStorage data
cp /app/data/*.json "$BACKUP_DIR/backup_$DATE/"

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR" s3://backup-bucket/aquapure/ --recursive

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete
```

### Recovery Procedure
```bash
# List available backups
ls -la /backups/aquapure/

# Restore from backup
cp /backups/aquapure/backup_YYYYMMDD_HHMMSS/* /app/data/

# Verify restoration
npm test
```

---

## Performance Optimization

### Frontend
```javascript
// Lazy load images
<img src="..." loading="lazy">

// Defer non-critical scripts
<script defer src="analytics.js"></script>

// Minimize bundle
npm run build --production
```

### Backend
```javascript
// Add caching headers
res.set('Cache-Control', 'public, max-age=3600');

// Enable compression
app.use(compression());

// Database query optimization
db.collection.find().lean().exec();
```

### Network
```nginx
# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json;

# Cache static assets
location ~* \.(js|css|png|jpg)$ {
  expires 1y;
}
```

---

## Status & Maintenance Page

```html
<!-- status.html -->
<!DOCTYPE html>
<html>
<head>
  <title>System Status</title>
</head>
<body>
  <h1>System Status</h1>
  <ul>
    <li>Database: <span id="db-status">Checking...</span></li>
    <li>Email Service: <span id="email-status">Checking...</span></li>
    <li>API: <span id="api-status">Checking...</span></li>
    <li>Uptime: <span id="uptime">-</span></li>
  </ul>
</body>
</html>
```

---

## Support & Escalation

### Level 1: Self-Service
- Check documentation
- Review error messages
- Clear browser cache

### Level 2: Technical Team
- Check logs: `/var/log/aquapure/`
- Restart services
- Rollback recent changes

### Level 3: Emergency
- Activate disaster recovery
- Restore from latest backup
- Contact hosting provider

---

**Last Updated**: 2026-08-31  
**Deployment Status**: Ready for Production  
**Security Rating**: ⭐⭐⭐⭐ (With recommendations implemented)
