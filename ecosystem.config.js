/**
 * PM2 Ecosystem Configuration for Viral Content Automation System
 * Production-ready process management with clustering, monitoring, and auto-restart
 */

module.exports = {
  apps: [
    {
      name: 'viral-content-startup',
      script: 'start.js',
      args: '--mode production --skip-tests --no-browser',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        LOG_LEVEL: 'info'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        LOG_LEVEL: 'debug'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
        LOG_LEVEL: 'info'
      },
      // Logging configuration
      log_file: 'logs/startup-combined.log',
      out_file: 'logs/startup-out.log',
      error_file: 'logs/startup-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart configuration
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '30s',
      max_memory_restart: '1G',
      
      // Health monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'coverage', '*.log'],
      
      // Advanced PM2 features
      kill_timeout: 5000,
      listen_timeout: 10000,
      wait_ready: true,
      
      // Auto-restart on file changes (development only)
      watch_options: {
        followSymlinks: false,
        usePolling: false
      }
    },
    {
      name: 'viral-content-dashboard',
      script: 'monitoring/dashboard.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        DASHBOARD_PORT: 3000,
        LOG_LEVEL: 'info'
      },
      env_development: {
        NODE_ENV: 'development',
        DASHBOARD_PORT: 3000,
        LOG_LEVEL: 'debug'
      },
      env_staging: {
        NODE_ENV: 'staging',
        DASHBOARD_PORT: 3001,
        LOG_LEVEL: 'info'
      },
      
      // Logging
      log_file: 'logs/dashboard-combined.log',
      out_file: 'logs/dashboard-out.log',
      error_file: 'logs/dashboard-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart configuration
      restart_delay: 3000,
      max_restarts: 15,
      min_uptime: '10s',
      max_memory_restart: '512M',
      
      // Health monitoring
      watch: false,
      kill_timeout: 3000,
      listen_timeout: 8000,
      wait_ready: true
    },
    {
      name: 'viral-content-health-monitor',
      script: 'scripts/health-check.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '*/15 * * * *', // Every 15 minutes
      autorestart: false, // Don't auto-restart, only run on cron
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        HEALTH_CHECK_MODE: 'continuous'
      },
      
      // Logging
      log_file: 'logs/health-monitor-combined.log',
      out_file: 'logs/health-monitor-out.log',
      error_file: 'logs/health-monitor-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Don't restart on failure for cron jobs
      max_restarts: 3,
      restart_delay: 60000, // 1 minute
      min_uptime: '5s'
    }
  ],
  
  // Global PM2 deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['production-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/jshin42/hst_marketing.git',
      path: '/opt/viral-content-system',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --only=production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get update && apt-get install -y git nodejs npm'
    },
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/jshin42/hst_marketing.git',
      path: '/opt/viral-content-system-staging',
      'post-deploy': 'npm ci && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  },
  
  // PM2+ Monitoring configuration (if using PM2+ service)
  pmx: {
    network: true,
    ports: true,
    module_conf: {
      'pm2-auto-pull': {
        repository: 'https://github.com/jshin42/hst_marketing.git',
        branch: 'main',
        interval: 300000 // 5 minutes
      }
    }
  }
};