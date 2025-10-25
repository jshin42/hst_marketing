# Deployment Guide - Viral Content Automation System

This guide provides step-by-step instructions for deploying the viral content automation system to production, including environment setup, configuration management, monitoring, and maintenance procedures.

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Pre-deployment Checklist](#pre-deployment-checklist)
3. [Environment Setup](#environment-setup)
4. [Configuration Management](#configuration-management)
5. [Deployment Steps](#deployment-steps)
6. [Post-deployment Verification](#post-deployment-verification)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Scaling and Performance](#scaling-and-performance)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## Deployment Overview

### System Architecture

The viral content automation system consists of:

- **n8n Workflows**: Content research and generation automation
- **AirTable Database**: Content pipeline and analysis storage
- **API Integrations**: OpenAI, RapidAPI, Apify services
- **Monitoring Dashboard**: Real-time system monitoring
- **Logging Infrastructure**: Centralized logging and analysis

### Deployment Environments

1. **Development**: Local development and testing
2. **Staging**: Pre-production testing and validation
3. **Production**: Live system serving real workflows

## Pre-deployment Checklist

### 1. System Requirements Verification

```bash
# Verify Node.js version
node --version  # Should be 16.0.0 or higher

# Verify npm version
npm --version   # Should be 8.0.0 or higher

# Check available disk space
df -h  # Ensure at least 10GB free space

# Verify memory
free -h  # Recommend minimum 4GB RAM
```

### 2. API Credentials Validation

```bash
# Run comprehensive setup validation
node scripts/validate-setup.js

# Expected output:
# ✅ All validation checks passed! Your system is ready for deployment.
```

### 3. Test Suite Execution

```bash
# Run complete test suite
npm run test:all

# Verify test coverage
npm run test:coverage

# Expected: 90%+ coverage across all modules
```

### 4. Security Audit

```bash
# Run security audit
npm audit

# Fix any high/critical vulnerabilities
npm audit fix

# Verify no sensitive data in repository
git secrets --scan
```

## Environment Setup

### 1. Production Server Setup

#### Server Specifications

**Minimum Requirements**:
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Network**: Stable internet connection
- **OS**: Ubuntu 20.04 LTS or higher

**Recommended**:
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 100GB SSD

#### Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Git
sudo apt install git -y

# Create application user
sudo useradd -m -s /bin/bash viralcontent
sudo usermod -aG sudo viralcontent

# Create application directories
sudo mkdir -p /opt/viral-content-system
sudo chown viralcontent:viralcontent /opt/viral-content-system
```

### 2. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

### 3. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000  # Monitoring dashboard
sudo ufw enable
```

## Configuration Management

### 1. Environment Variables

Create production environment file:

```bash
# /opt/viral-content-system/.env
NODE_ENV=production
LOG_LEVEL=info

# API Credentials
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_API_KEY=keyXXXXXXXXXXXXXX
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXX
RAPIDAPI_KEY=XXXXXXXXXXXXXXXX
APIFY_TOKEN=apify_api_XXXXXXXX
GMAIL_ADDRESS=automation@yourdomain.com

# Database Configuration
DB_CONNECTION_LIMIT=10
DB_TIMEOUT=30000

# Monitoring
DASHBOARD_PORT=3000
ENABLE_MONITORING=true
HEALTH_CHECK_INTERVAL=30000

# Performance
MAX_CONCURRENT_WORKFLOWS=5
API_RATE_LIMIT_PER_MINUTE=60
MEMORY_LIMIT=2048

# Security
ALLOWED_ORIGINS=https://yourdomain.com
SESSION_SECRET=your-secure-session-secret
```

### 2. Application Configuration

**Production Configuration** (`config/production.json`):

```json
{
  "workflows": {
    "maxConcurrent": 5,
    "retryAttempts": 3,
    "timeoutMs": 300000
  },
  "apis": {
    "rateLimit": {
      "openai": {
        "requestsPerMinute": 50,
        "tokensPerMinute": 40000
      },
      "rapidapi": {
        "requestsPerMinute": 100
      },
      "apify": {
        "requestsPerMinute": 30
      }
    }
  },
  "monitoring": {
    "enabled": true,
    "retentionDays": 30,
    "alertThresholds": {
      "errorRate": 0.05,
      "responseTime": 5000,
      "memoryUsage": 0.8
    }
  }
}
```

### 3. Nginx Configuration

**Nginx Config** (`/etc/nginx/sites-available/viral-content-system`):

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Monitoring Dashboard
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting
        limit_req zone=api burst=10 nodelay;
    }

    # Static files
    location /static/ {
        alias /opt/viral-content-system/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Rate limiting configuration
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

## Deployment Steps

### 1. Code Deployment

```bash
# Switch to application user
sudo su - viralcontent

# Clone repository
cd /opt/viral-content-system
git clone https://github.com/your-username/viral-content-system.git .

# Install dependencies (production only)
npm ci --only=production

# Set up environment
cp .env.example .env
# Edit .env with production values
```

### 2. Database Setup

```bash
# Verify AirTable schema
node scripts/validate-airtable-schema.js

# Create initial data structures if needed
node scripts/setup-airtable.js
```

### 3. n8n Workflow Deployment

#### Option A: n8n Cloud

1. **Import Workflows**:
   - Upload `workflows/n8n/viral-content-research.json`
   - Upload `workflows/n8n/content-generation-pipeline.json`

2. **Configure Credentials**:
   - Add OpenAI API credentials
   - Add RapidAPI credentials
   - Add Apify token
   - Add AirTable credentials
   - Add Gmail OAuth

3. **Activate Workflows**:
   - Enable viral content research workflow
   - Enable content generation pipeline
   - Set appropriate schedules

#### Option B: Self-hosted n8n

```bash
# Install n8n globally
npm install -g n8n

# Create n8n directory
mkdir -p ~/.n8n

# Start n8n with custom configuration
N8N_BASIC_AUTH_ACTIVE=true \
N8N_BASIC_AUTH_USER=admin \
N8N_BASIC_AUTH_PASSWORD=your-secure-password \
n8n start --tunnel
```

### 4. Monitoring Dashboard Deployment

```bash
# Start monitoring dashboard with PM2
pm2 start monitoring/dashboard.js --name "viral-content-dashboard"

# Configure PM2 startup
pm2 startup
pm2 save
```

### 5. Process Management Setup

**PM2 Ecosystem Configuration** (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: 'viral-content-dashboard',
      script: 'monitoring/dashboard.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: 'logs/dashboard.log',
      error_file: 'logs/dashboard-error.log',
      out_file: 'logs/dashboard-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '1G',
      restart_delay: 5000
    },
    {
      name: 'health-monitor',
      script: 'scripts/health-check.js',
      cron_restart: '*/15 * * * *',  // Every 15 minutes
      autorestart: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

```bash
# Deploy with PM2 ecosystem
pm2 start ecosystem.config.js
pm2 save
```

## Post-deployment Verification

### 1. Health Checks

```bash
# Run comprehensive health check
node scripts/health-check.js

# Expected output:
# 🟢 Overall Status: HEALTHY
# ✅ All APIs operational
# 📊 System performance within normal range
```

### 2. Workflow Testing

```bash
# Test Instagram workflow
curl -X POST https://your-domain.com/api/test-workflow \
  -H "Content-Type: application/json" \
  -d '{"platform": "instagram"}'

# Test LinkedIn workflow
curl -X POST https://your-domain.com/api/test-workflow \
  -H "Content-Type: application/json" \
  -d '{"platform": "linkedin"}'

# Test TikTok workflow
curl -X POST https://your-domain.com/api/test-workflow \
  -H "Content-Type: application/json" \
  -d '{"platform": "tiktok"}'
```

### 3. Monitoring Dashboard Verification

```bash
# Check dashboard accessibility
curl -I https://your-domain.com

# Verify WebSocket connection
curl -I https://your-domain.com/socket.io/

# Check API endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/api/metrics
```

### 4. Log Verification

```bash
# Check log files
tail -f logs/viral-content-system-info-$(date +%Y-%m-%d).log
tail -f logs/dashboard.log

# Verify log rotation
ls -la logs/
```

## Monitoring and Maintenance

### 1. Real-time Monitoring

**Dashboard Access**: `https://your-domain.com`

**Key Metrics to Monitor**:
- System health status
- API response times
- Workflow success rates
- Memory and CPU usage
- Error rates and patterns

### 2. Automated Monitoring

**Health Check Cron Job**:
```bash
# Add to crontab
*/15 * * * * /opt/viral-content-system/scripts/health-check.js > /dev/null 2>&1
```

**Log Rotation**:
```bash
# /etc/logrotate.d/viral-content-system
/opt/viral-content-system/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 viralcontent viralcontent
    postrotate
        pm2 reload viral-content-dashboard
    endscript
}
```

### 3. Alerting Setup

**Email Alerts** (configure in monitoring dashboard):
```javascript
// monitoring/alerts.js
const alertThresholds = {
  errorRate: 0.05,        // Alert if error rate > 5%
  responseTime: 5000,     // Alert if response time > 5s
  memoryUsage: 0.8,       // Alert if memory usage > 80%
  diskSpace: 0.9          // Alert if disk usage > 90%
};
```

### 4. Backup Procedures

**Daily Backup Script**:
```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/opt/backups/viral-content-$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup configuration files
cp -r config/ $BACKUP_DIR/
cp .env $BACKUP_DIR/

# Backup logs (last 7 days)
find logs/ -name "*.log" -mtime -7 -exec cp {} $BACKUP_DIR/ \;

# Backup monitoring data
cp -r monitoring/reports/ $BACKUP_DIR/

# Create archive
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR.tar.gz s3://your-backup-bucket/
```

## Scaling and Performance

### 1. Horizontal Scaling

**Load Balancer Configuration**:
```nginx
upstream viral_content_backend {
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;
}

server {
    location / {
        proxy_pass http://viral_content_backend;
    }
}
```

### 2. Performance Optimization

**PM2 Cluster Mode**:
```bash
# Scale to use all CPU cores
pm2 scale viral-content-dashboard max
```

**Database Connection Pooling**:
```javascript
// lib/database.js
const poolConfig = {
  max: 20,              // Maximum connections
  min: 5,               // Minimum connections
  idle: 30000,          // Close after 30s idle
  acquire: 60000,       // Max time to get connection
  evict: 1000          // Check for idle connections every 1s
};
```

### 3. Caching Strategy

**Redis Setup** (optional):
```bash
# Install Redis
sudo apt install redis-server -y

# Configure caching
# cache/redis.js
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  password: 'your-redis-password'
});
```

## Backup and Recovery

### 1. Data Backup Strategy

**What to Backup**:
- Configuration files (.env, config/)
- Log files (last 30 days)
- Monitoring reports
- AirTable data export
- n8n workflow configurations

**Backup Schedule**:
- **Hourly**: Critical configuration changes
- **Daily**: Full system backup
- **Weekly**: Archive old logs
- **Monthly**: Long-term storage archive

### 2. Recovery Procedures

**System Recovery Steps**:

1. **Restore from Backup**:
```bash
# Download latest backup
wget https://backup-storage/viral-content-YYYYMMDD.tar.gz

# Extract backup
tar -xzf viral-content-YYYYMMDD.tar.gz

# Restore configuration
cp backup/config/* config/
cp backup/.env .env
```

2. **Reinstall Dependencies**:
```bash
npm ci --only=production
```

3. **Restore Services**:
```bash
pm2 start ecosystem.config.js
pm2 save
```

4. **Verify System Health**:
```bash
node scripts/health-check.js
```

### 3. Disaster Recovery

**RTO (Recovery Time Objective)**: 4 hours
**RPO (Recovery Point Objective)**: 1 hour

**Recovery Checklist**:
- [ ] New server provisioned
- [ ] Application code deployed
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database connections verified
- [ ] n8n workflows restored
- [ ] Monitoring dashboard operational
- [ ] All API integrations tested

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Symptoms**: PM2 shows app as errored or stopped

**Diagnosis**:
```bash
# Check PM2 logs
pm2 logs viral-content-dashboard

# Check system logs
journalctl -u nginx -f
```

**Solutions**:
- Verify environment variables
- Check port availability
- Validate configuration files
- Ensure sufficient memory

#### 2. API Rate Limiting

**Symptoms**: 429 errors in logs, workflows failing

**Diagnosis**:
```bash
# Check API usage in logs
grep "429" logs/viral-content-system-*.log

# Check rate limit status
node scripts/check-rate-limits.js
```

**Solutions**:
- Implement exponential backoff
- Reduce workflow frequency
- Upgrade API plan
- Distribute requests across multiple keys

#### 3. Memory Issues

**Symptoms**: Application restarting frequently, high memory usage

**Diagnosis**:
```bash
# Check memory usage
free -h
ps aux | grep node

# Check PM2 memory usage
pm2 monit
```

**Solutions**:
- Increase PM2 memory limit
- Optimize data processing
- Implement garbage collection tuning
- Scale horizontally

#### 4. Database Connection Issues

**Symptoms**: AirTable API errors, data not saving

**Diagnosis**:
```bash
# Test AirTable connection
node scripts/test-airtable.js

# Check network connectivity
curl -I https://api.airtable.com
```

**Solutions**:
- Verify API credentials
- Check network connectivity
- Implement connection retry logic
- Monitor API quotas

### Emergency Procedures

#### 1. System Shutdown

```bash
# Graceful shutdown
pm2 stop all

# Emergency stop
pm2 kill
sudo systemctl stop nginx
```

#### 2. Rollback Deployment

```bash
# Rollback to previous version
git checkout previous-stable-tag
npm ci --only=production
pm2 restart all
```

#### 3. Emergency Contact Information

**System Administrator**: admin@yourdomain.com
**API Support**: 
- OpenAI: platform.openai.com/help
- RapidAPI: rapidapi.com/support
- Apify: help.apify.com

### Maintenance Windows

**Scheduled Maintenance**: Every Sunday 2:00-4:00 AM UTC

**Pre-maintenance Checklist**:
- [ ] Backup current system
- [ ] Notify stakeholders
- [ ] Prepare rollback plan
- [ ] Test in staging environment

**Post-maintenance Checklist**:
- [ ] Verify all services running
- [ ] Run health checks
- [ ] Monitor for 2 hours
- [ ] Update documentation

This deployment guide ensures a smooth, reliable deployment of the viral content automation system with proper monitoring, maintenance, and recovery procedures in place.