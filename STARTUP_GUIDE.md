# 🚀 Startup Guide - Viral Content Automation System

This guide provides comprehensive instructions for starting the viral content automation system using various methods, from simple one-click solutions to advanced configuration options.

## 🎯 Quick Start Options

### 1. **One-Click GUI Launcher** (Recommended for beginners)

```bash
npm run start:gui
```

- **What it does**: Opens a beautiful web-based GUI in your browser
- **Best for**: Non-technical users who want point-and-click simplicity
- **Features**: 
  - Visual system status
  - Real-time logs
  - Configurable startup options
  - One-click start/stop
  - System information display

### 2. **Simple CLI Start** (Recommended for developers)

```bash
npm start
```

- **What it does**: Runs the complete startup sequence with progress indicators
- **Best for**: Developers who want to see detailed progress
- **Features**:
  - Progress bars and visual feedback
  - Comprehensive system validation
  - Automatic browser opening
  - Error handling and recovery

### 3. **Quick Start** (Fastest option)

```bash
npm run start:quick
```

- **What it does**: Minimal startup sequence, skips tests and extensive validation
- **Best for**: Development and testing when you need fast iteration
- **Features**:
  - Skips unit tests
  - Skips coverage reports  
  - Basic validation only
  - Fastest startup time

## 📋 Complete Startup Commands Reference

### Basic Startup Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm start` | Full startup with all checks | Production-ready startup |
| `npm run start:gui` | Web-based GUI launcher | Non-technical users |
| `npm run start:quick` | Fast startup, minimal checks | Development/testing |
| `npm run start:dev` | Development mode with debug logging | Local development |
| `npm run start:prod` | Production mode with optimizations | Production deployment |

### Advanced CLI Options

```bash
# Full command syntax
node start.js [options]

# Available options:
--skip-tests          # Skip running unit tests
--skip-validation     # Skip configuration validation  
--skip-health-check   # Skip API health checks
--no-browser         # Don't open browser automatically
--port <number>      # Specify dashboard port (default: 3000)
--mode <mode>        # Set mode: development|production
--gui                # Launch built-in GUI interface
--quick              # Quick startup (skip tests and coverage)
--help               # Show help information
```

### Example Advanced Commands

```bash
# Production startup without tests
node start.js --skip-tests --mode production --port 8080

# Development with custom port, no browser
node start.js --mode development --port 3001 --no-browser

# Quick startup for testing
node start.js --quick --skip-validation

# GUI mode with custom port
node start.js --gui --port 8080
```

## 🔄 Process Management (Production)

### PM2 Process Manager

```bash
# Start with PM2 for production
npm run pm2:start

# Stop PM2 processes
npm run pm2:stop

# Restart PM2 processes
npm run pm2:restart

# View PM2 status
pm2 status

# View PM2 logs
pm2 logs
```

### PM2 Advanced Commands

```bash
# Start specific environment
pm2 start ecosystem.config.js --env production
pm2 start ecosystem.config.js --env staging

# Scale processes
pm2 scale viral-content-dashboard 3

# Monitor processes
pm2 monit

# Auto-restart on file changes (development)
pm2 start ecosystem.config.js --watch
```

## 🛠️ Pre-Startup Requirements

### 1. Install Dependencies

```bash
# Install all dependencies
npm install

# Production-only dependencies
npm ci --only=production
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your API credentials
nano .env  # or vim, code, etc.
```

### 3. System Validation

```bash
# Validate complete system setup
npm run validate-setup

# Check system health
npm run health-check
```

## 📊 Monitoring and Management

### Real-time Monitoring

Once started, the system provides multiple monitoring interfaces:

- **Main Dashboard**: `http://localhost:3000`
- **API Health**: `http://localhost:3000/api/health`
- **System Metrics**: `http://localhost:3000/api/metrics`
- **GUI Launcher**: `http://localhost:8080` (if using GUI mode)

### Command-line Monitoring

```bash
# View real-time health status
npm run health-check

# Run system tests
npm test

# Check API connectivity
npm run test:integration

# View system logs
tail -f logs/viral-content-system-combined.log
```

## ⚙️ Startup Sequence Details

### Full Startup Process (npm start)

1. **System Requirements Check**
   - Node.js version validation
   - Memory availability check
   - Disk space verification
   - Environment file validation

2. **Dependency Installation** (if needed)
   - Install/update npm packages
   - Verify package integrity

3. **Test Execution**
   - Run unit tests (39 tests)
   - Generate coverage report
   - Validate test thresholds

4. **System Validation**
   - Configuration file validation
   - API credential verification
   - Workflow file integrity check

5. **Health Checks**
   - API connectivity tests
   - Service availability checks
   - Performance baseline measurement

6. **Service Startup**
   - Start monitoring dashboard
   - Initialize logging infrastructure
   - Open browser interface

### Quick Startup Process (npm run start:quick)

1. **Basic Requirements Check**
   - Node.js version only
   - Environment file check

2. **Essential Services**
   - Start monitoring dashboard
   - Basic health check
   - Open browser interface

## 🚨 Troubleshooting

### Common Startup Issues

#### Port Conflicts

```bash
# Error: Port 3000 already in use
node start.js --port 3001

# Or check what's using the port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

#### Missing Dependencies

```bash
# Error: Module not found
npm install

# Clear cache if needed
npm cache clean --force
npm install
```

#### API Credential Issues

```bash
# Validate credentials
npm run validate-setup

# Check specific API
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

#### Memory Issues

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm start
```

### Emergency Recovery

```bash
# Kill all processes
pkill -f "viral-content"

# Force port cleanup
npm run pm2:delete
pm2 kill

# Reset system
npm run start:quick
```

## 🔧 Configuration Options

### Environment Variables

```bash
# Core settings
NODE_ENV=development|production
LOG_LEVEL=error|warn|info|debug
DASHBOARD_PORT=3000

# Feature toggles
SKIP_TESTS=true|false
OPEN_BROWSER=true|false
ENABLE_MONITORING=true|false

# Performance settings
MAX_CONCURRENT_WORKFLOWS=5
API_RATE_LIMIT_PER_MINUTE=60
MEMORY_LIMIT=2048
```

### Runtime Configuration

The system supports dynamic configuration through:
- Command-line arguments (highest priority)
- Environment variables
- Configuration files
- Default values (lowest priority)

## 📈 Performance Optimization

### Development Mode

```bash
# Fast development startup
npm run start:quick

# Development with file watching
npm run start:dev -- --watch
```

### Production Mode

```bash
# Optimized production startup
npm run start:prod

# With PM2 clustering
npm run pm2:start
pm2 scale viral-content-dashboard max
```

### Resource Management

```bash
# Monitor resource usage
npm run benchmark

# Check memory usage
node -e "console.log(process.memoryUsage())"

# Monitor CPU usage
top | grep node  # macOS/Linux
tasklist | findstr node  # Windows
```

## 🎛️ GUI Launcher Features

The GUI launcher (`npm run start:gui`) provides:

### Control Panel
- **System Status**: Visual indicators for system state
- **Start/Stop Controls**: One-click system management
- **Configuration Options**: Checkbox controls for startup options
- **Quick Links**: Direct access to dashboard and documentation

### Real-time Monitoring
- **Live Logs**: Real-time system log display
- **System Information**: CPU, memory, and platform details
- **Process Status**: Individual service monitoring
- **Performance Metrics**: Resource usage tracking

### Advanced Features
- **Auto-refresh**: Automatic status updates every 5 seconds
- **Error Handling**: Graceful error display and recovery
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Responsive Design**: Mobile-friendly interface

## 📞 Support and Resources

### Getting Help

- **Documentation**: Check `/docs/` directory for detailed guides
- **Logs**: Review `logs/` directory for diagnostic information
- **Health Check**: Run `npm run health-check` for system status
- **GitHub Issues**: Report issues at repository issue tracker

### Useful Commands

```bash
# Show all available npm scripts
npm run

# Check system status
npm run health-check

# View comprehensive logs
ls -la logs/

# Test specific components
npm run test:unit
npm run test:integration
npm run test:e2e
```

---

**Note**: This system is designed to be robust and self-healing. If you encounter issues, try the quick start option first, then gradually enable more features as needed.