# SanixHub - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Production Deployment](#production-deployment)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v20.x LTS or higher
- **npm**: v9.x or higher (comes with Node.js)
- **MongoDB**: v7.0 or higher (local) OR MongoDB Atlas account
- **Git**: Latest version

### Recommended Tools
- **PM2**: For production process management
- **Nginx**: For reverse proxy (production)
- **VS Code**: Code editor with ESLint/Prettier

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-repo/sanixhub.git
cd sanixhub
```

### Step 2: Install Dependencies

**Backend:**
```bash
npm install
```

**Frontend:**
```bash
cd client
npm install
cd ..
```

### Step 3: Create Environment Files

**Backend (.env):**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

MONGODB_URI=mongodb://localhost:27017/sanixhub

JWT_ACCESS_SECRET=your_super_secret_access_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

ADMIN_EMAIL=admin@sanixhub.com
ADMIN_PASSWORD=Admin123!@#

MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

**Frontend (client/.env.local):**
```bash
cd client
cp .env.local.example .env.local
```

Edit `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=SanixHub
NEXT_PUBLIC_WHATSAPP_NUMBER=+92xxxxxxxxxx
```

---

## Database Setup

### Option 1: Local MongoDB

**Install MongoDB:**
- **Ubuntu:**
  ```bash
  sudo apt-get install mongodb
  sudo systemctl start mongodb
  sudo systemctl enable mongodb
  ```

- **Windows/Mac:**
  Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

**Verify Installation:**
```bash
mongosh
# Should connect successfully
```

### Option 2: MongoDB Atlas (Recommended)

1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (Free M0 tier available)
3. Create database user
4. Whitelist your IP address (or 0.0.0.0/0 for development)
5. Get connection string
6. Update `MONGODB_URI` in `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sanixhub
   ```

### Create Initial Admin User

**Create seed script** `server/seeds/createAdmin.js`:
```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDatabase = require('../config/database');

async function createAdmin() {
  await connectDatabase();
  
  const adminExists = await User.findOne({ 
    email: process.env.ADMIN_EMAIL 
  });
  
  if (adminExists) {
    console.log('Admin user already exists');
    process.exit(0);
  }
  
  const admin = await User.create({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: 'superadmin',
    profile: {
      firstName: 'Admin',
      lastName: 'User',
      phone: '+923001234567',
      language: 'en'
    },
    isActive: true,
    isVerified: true
  });
  
  console.log('✅ Admin user created:', admin.email);
  process.exit(0);
}

createAdmin().catch(err => {
  console.error('Error creating admin:', err);
  process.exit(1);
});
```

**Run seed:**
```bash
node server/seeds/createAdmin.js
```

---

## Running the Application

### Development Mode

**Start Backend:**
```bash
npm run server:dev
```
Server runs on http://localhost:5000

**Start Frontend (separate terminal):**
```bash
npm run client:dev
```
Client runs on http://localhost:3000

**Or run both concurrently:**
```bash
npm run dev
```

### Test the Application

1. **Backend Health Check:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Login as Admin:**
   - Navigate to http://localhost:3000/login
   - Email: admin@sanixhub.com
   - Password: Admin123!@#

3. **Access Admin Dashboard:**
   - http://localhost:3000/admin

---

## Production Deployment

### Deployment Options

1. **VPS** (DigitalOcean, Linode, AWS EC2)
2. **PaaS** (Heroku, Railway, Render)
3. **Vercel/Netlify** (Frontend only - backend separate)

### VPS Deployment (Ubuntu 22.04)

#### Step 1: Server Setup

**Update system:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Install Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Install PM2:**
```bash
sudo npm install -g pm2
```

**Install Nginx:**
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Step 2: Clone and Setup

```bash
cd /var/www
sudo git clone https://github.com/your-repo/sanixhub.git
sudo chown -R $USER:$USER sanixhub
cd sanixhub
```

**Install dependencies:**
```bash
npm install
cd client && npm install && cd ..
```

**Setup environment:**
```bash
cp .env.example .env
nano .env  # Edit with production values
```

**Build frontend:**
```bash
cd client
npm run build
cd ..
```

#### Step 3: PM2 Setup

**Create PM2 ecosystem file** `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'sanixhub-backend',
      script: './server/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'sanixhub-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './client',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

**Start applications:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Monitor:**
```bash
pm2 status
pm2 logs
pm2 monit
```

---

#### Step 4: Nginx Configuration

**Create Nginx config** `/etc/nginx/sites-available/sanixhub`:
```nginx
server {
    listen 80;
    server_name sanixhub.com www.sanixhub.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /uploads {
        alias /var/www/sanixhub/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/sanixhub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d sanixhub.com -d www.sanixhub.com
```

Follow prompts and select redirect HTTP to HTTPS.

**Auto-renewal:**
```bash
sudo certbot renew --dry-run
```

#### Step 6: Firewall Setup

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## Post-Deployment

### Create Sample Data

**Categories seed** `server/seeds/categories.js`:
```javascript
const categories = [
  {
    name: { en: 'Muslim Showers', ur: 'مسلم شاورز' },
    slug: 'muslim-showers',
    description: { en: 'High-quality Muslim showers', ur: 'اعلیٰ معیار کے مسلم شاورز' },
    displayOrder: 1,
    isActive: true
  },
  {
    name: { en: 'Fittings', ur: 'فٹنگز' },
    slug: 'fittings',
    description: { en: 'GI, HE, and China fittings', ur: 'جی آئی، ایچ ای اور چائنا فٹنگز' },
    displayOrder: 2,
    isActive: true
  },
  {
    name: { en: 'Water Taps', ur: 'پانی کے نل' },
    slug: 'water-taps',
    description: { en: 'Kitchen and bathroom taps', ur: 'کچن اور باتھ روم کے نل' },
    displayOrder: 3,
    isActive: true
  },
  {
    name: { en: 'Pipes', ur: 'پائپس' },
    slug: 'pipes',
    description: { en: 'Plastic and metal pipes', ur: 'پلاسٹک اور دھاتی پائپس' },
    displayOrder: 4,
    isActive: true
  },
  {
    name: { en: 'Bath Sets', ur: 'باتھ سیٹس' },
    slug: 'bath-sets',
    description: { en: 'Complete bathroom sets', ur: 'مکمل باتھ روم سیٹس' },
    displayOrder: 5,
    isActive: true
  }
];

module.exports = categories;
```

### Monitoring Setup

**Install monitoring tools:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Monitor logs:**
```bash
pm2 logs sanixhub-backend --lines 100
pm2 logs sanixhub-frontend --lines 100
```

### Backup Strategy

**Automated MongoDB backup script** `scripts/backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mongodb"
mkdir -p $BACKUP_DIR

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/backup_$DATE"
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" "$BACKUP_DIR/backup_$DATE"
rm -rf "$BACKUP_DIR/backup_$DATE"

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

**Make executable and schedule:**
```bash
chmod +x scripts/backup.sh
crontab -e
```

Add cron job (daily at 2 AM):
```
0 2 * * * /var/www/sanixhub/scripts/backup.sh >> /var/log/mongodb-backup.log 2>&1
```

---

## Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Find process using port
sudo lsof -i :5000
# Kill process
sudo kill -9 <PID>
```

**2. MongoDB Connection Failed**
- Check MongoDB is running: `sudo systemctl status mongodb`
- Verify connection string in `.env`
- Check firewall rules
- For Atlas: Whitelist IP address

**3. PM2 Apps Not Starting**
```bash
pm2 delete all
pm2 start ecosystem.config.js
pm2 logs
```

**4. Nginx 502 Bad Gateway**
- Check if backend is running: `pm2 status`
- Verify proxy_pass ports in Nginx config
- Check backend logs: `pm2 logs sanixhub-backend`

**5. Frontend Build Errors**
```bash
cd client
rm -rf .next node_modules
npm install
npm run build
```

**6. Database Migrations**
- Keep migration scripts in `server/migrations/`
- Track applied migrations in database
- Always backup before running migrations

### Performance Optimization

**1. Enable Caching:**
- Use Redis for session storage (future enhancement)
- Implement API response caching
- Use CDN for static assets

**2. Database Optimization:**
- Ensure all indexes are created
- Monitor slow queries
- Use MongoDB Atlas Performance Advisor

**3. Frontend Optimization:**
- Use Next.js Image Optimization
- Implement lazy loading
- Enable compression

### Health Checks

**Create health check script** `scripts/healthcheck.sh`:
```bash
#!/bin/bash

# Check backend
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is down"
    pm2 restart sanixhub-backend
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend is down"
    pm2 restart sanixhub-frontend
fi
```

**Schedule health checks:**
```bash
chmod +x scripts/healthcheck.sh
crontab -e
```

Add (every 5 minutes):
```
*/5 * * * * /var/www/sanixhub/scripts/healthcheck.sh >> /var/log/healthcheck.log 2>&1
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database backups taken
- [ ] SSL certificate obtained
- [ ] Domain DNS configured

### Deployment
- [ ] Code deployed to server
- [ ] Dependencies installed
- [ ] Frontend built
- [ ] PM2 apps started
- [ ] Nginx configured and restarted

### Post-Deployment
- [ ] Health checks passing
- [ ] Admin login working
- [ ] Test order flow
- [ ] Monitor logs for errors
- [ ] Setup monitoring alerts
- [ ] Document deployment date

### Security Checklist
- [ ] Strong passwords used
- [ ] JWT secrets are random and secure
- [ ] Database user has minimal permissions
- [ ] Firewall configured
- [ ] SSL certificate valid
- [ ] Rate limiting enabled
- [ ] Input validation working
- [ ] CORS configured correctly

---

## Updating the Application

### Git Deployment

```bash
cd /var/www/sanixhub
git pull origin main
npm install
cd client && npm install && npm run build && cd ..
pm2 restart all
```

### Zero-Downtime Deployment

```bash
# Start new instances
pm2 start ecosystem.config.js --name sanixhub-backend-new
pm2 start ecosystem.config.js --name sanixhub-frontend-new

# Wait for health checks
sleep 10

# Update Nginx upstream
# Reload Nginx
sudo nginx -s reload

# Stop old instances
pm2 delete sanixhub-backend
pm2 delete sanixhub-frontend

# Rename new instances
pm2 restart sanixhub-backend-new --name sanixhub-backend
pm2 restart sanixhub-frontend-new --name sanixhub-frontend
```

---

## Support and Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review error logs
- Check disk space: `df -h`
- Monitor performance metrics
- Review security logs

**Monthly:**
- Update dependencies (security patches)
- Review and optimize database queries
- Analyze user feedback
- Check backup integrity

**Quarterly:**
- Full security audit
- Performance optimization review
- Infrastructure scaling assessment
- Update documentation

### Getting Help

- Check logs: `pm2 logs`
- Review documentation in `/docs`
- Check GitHub issues
- Contact: support@sanixhub.com

---

**Deployment guide complete. Your SanixHub platform is production-ready!**
