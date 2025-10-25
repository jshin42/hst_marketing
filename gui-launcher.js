#!/usr/bin/env node

/**
 * GUI Launcher for Viral Content Automation System
 * Simple graphical interface for non-technical users
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { browserAutomation } = require('./utils/browser-automation');
const { portManager } = require('./utils/port-manager');
const { processManager } = require('./utils/process-manager');
const ViralContentStartup = require('./start');
const chalk = require('chalk');
const path = require('path');

class GUILauncher {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });
    
    this.port = null;
    this.startup = null;
    this.systemStatus = 'stopped';
    this.logs = [];
    
    this.setupRoutes();
    this.setupSocketHandlers();
  }
  
  setupRoutes() {
    // Serve static GUI files
    this.app.use(express.static(path.join(__dirname, 'gui-assets')));
    this.app.use(express.json());
    
    // Main launcher page
    this.app.get('/', (req, res) => {
      res.send(this.generateLauncherHTML());
    });
    
    // API endpoints
    this.app.post('/api/start', async (req, res) => {
      try {
        await this.startSystem(req.body.options || {});
        res.json({ success: true, message: 'System starting...' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    this.app.post('/api/stop', async (req, res) => {
      try {
        await this.stopSystem();
        res.json({ success: true, message: 'System stopped' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: this.systemStatus,
        processes: processManager.getAllProcessStatuses(),
        logs: this.logs.slice(-50)
      });
    });
    
    this.app.get('/api/system-info', async (req, res) => {
      try {
        const systemInfo = await processManager.getSystemResources();
        res.json(systemInfo);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
  
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      this.addLog('GUI client connected', 'info');
      
      // Send current status
      socket.emit('statusUpdate', {
        status: this.systemStatus,
        logs: this.logs.slice(-20)
      });
      
      socket.on('startSystem', async (options) => {
        try {
          await this.startSystem(options);
        } catch (error) {
          socket.emit('error', error.message);
        }
      });
      
      socket.on('stopSystem', async () => {
        try {
          await this.stopSystem();
        } catch (error) {
          socket.emit('error', error.message);
        }
      });
      
      socket.on('requestLogs', () => {
        socket.emit('logsUpdate', this.logs);
      });
      
      socket.on('disconnect', () => {
        this.addLog('GUI client disconnected', 'info');
      });
    });
  }
  
  generateLauncherHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Viral Content Automation - Launcher</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; color: white;
        }
        
        .container {
            max-width: 1200px; margin: 0 auto; padding: 2rem;
        }
        
        .header {
            text-align: center; margin-bottom: 3rem;
        }
        
        .header h1 {
            font-size: 3rem; margin-bottom: 1rem;
            text-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.2rem; opacity: 0.9;
        }
        
        .main-content {
            display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .control-panel {
            background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
            border-radius: 20px; padding: 2rem; text-align: center;
        }
        
        .status-display {
            background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
            border-radius: 20px; padding: 2rem;
        }
        
        .system-status {
            text-align: center; margin-bottom: 2rem;
        }
        
        .status-indicator {
            width: 60px; height: 60px; border-radius: 50%;
            margin: 0 auto 1rem; display: flex; align-items: center;
            justify-content: center; font-size: 2rem;
            background: #e74c3c; transition: all 0.3s;
        }
        
        .status-indicator.running { background: #27ae60; }
        .status-indicator.starting { background: #f39c12; }
        
        .status-text {
            font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;
        }
        
        .status-description {
            opacity: 0.8;
        }
        
        .controls {
            display: flex; flex-direction: column; gap: 1rem;
            margin: 2rem 0;
        }
        
        .btn {
            background: rgba(255,255,255,0.2); color: white; border: none;
            padding: 1rem 2rem; border-radius: 12px; font-size: 1.1rem;
            cursor: pointer; transition: all 0.3s; font-weight: 600;
            text-decoration: none; display: block; text-align: center;
        }
        
        .btn:hover { 
            background: rgba(255,255,255,0.3); 
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        
        .btn:disabled {
            opacity: 0.5; cursor: not-allowed; transform: none;
        }
        
        .btn.primary { background: #27ae60; }
        .btn.primary:hover { background: #219a52; }
        
        .btn.danger { background: #e74c3c; }
        .btn.danger:hover { background: #c0392b; }
        
        .btn.secondary { background: #3498db; }
        .btn.secondary:hover { background: #2980b9; }
        
        .options {
            margin: 1rem 0;
        }
        
        .option {
            display: flex; align-items: center; margin-bottom: 0.5rem;
        }
        
        .option input[type="checkbox"] {
            margin-right: 0.5rem; transform: scale(1.2);
        }
        
        .logs-section {
            background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
            border-radius: 20px; padding: 2rem; margin-top: 2rem;
        }
        
        .logs-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 1rem;
        }
        
        .logs-container {
            background: rgba(0,0,0,0.3); border-radius: 10px;
            padding: 1rem; height: 300px; overflow-y: auto;
            font-family: 'Courier New', monospace; font-size: 0.9rem;
            line-height: 1.4;
        }
        
        .log-entry {
            margin-bottom: 0.5rem; padding: 0.25rem 0;
        }
        
        .log-timestamp {
            color: #95a5a6; margin-right: 0.5rem;
        }
        
        .log-level {
            margin-right: 0.5rem; padding: 0.1rem 0.4rem;
            border-radius: 3px; font-size: 0.7rem; font-weight: bold;
        }
        
        .log-level.info { background: #3498db; }
        .log-level.success { background: #27ae60; }
        .log-level.warning { background: #f39c12; }
        .log-level.error { background: #e74c3c; }
        
        .quick-links {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem; margin-top: 2rem;
        }
        
        .quick-link {
            background: rgba(255,255,255,0.1); border-radius: 10px;
            padding: 1rem; text-align: center; transition: all 0.3s;
            text-decoration: none; color: white;
        }
        
        .quick-link:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-2px);
        }
        
        .loading {
            opacity: 0.7; pointer-events: none;
        }
        
        @media (max-width: 768px) {
            .main-content { grid-template-columns: 1fr; }
            .header h1 { font-size: 2rem; }
            .quick-links { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Viral Content Automation</h1>
            <p>AI-Powered Content Research & Generation System</p>
        </div>
        
        <div class="main-content">
            <div class="control-panel">
                <h2>System Control</h2>
                
                <div class="system-status">
                    <div class="status-indicator" id="statusIndicator">⏹️</div>
                    <div class="status-text" id="statusText">System Stopped</div>
                    <div class="status-description" id="statusDescription">Ready to start</div>
                </div>
                
                <div class="controls">
                    <button class="btn primary" id="startBtn" onclick="startSystem()">
                        ▶️ Start System
                    </button>
                    <button class="btn danger" id="stopBtn" onclick="stopSystem()" disabled>
                        ⏹️ Stop System
                    </button>
                    <button class="btn secondary" onclick="openDashboard()" id="dashboardBtn" disabled>
                        📊 Open Dashboard
                    </button>
                </div>
                
                <div class="options">
                    <h3>Startup Options</h3>
                    <div class="option">
                        <input type="checkbox" id="skipTests" checked>
                        <label for="skipTests">Skip Tests (Faster startup)</label>
                    </div>
                    <div class="option">
                        <input type="checkbox" id="openBrowser" checked>
                        <label for="openBrowser">Open browser automatically</label>
                    </div>
                    <div class="option">
                        <input type="checkbox" id="quickMode">
                        <label for="quickMode">Quick mode (minimal checks)</label>
                    </div>
                </div>
            </div>
            
            <div class="status-display">
                <h2>System Information</h2>
                <div id="systemInfo">
                    <p>Loading system information...</p>
                </div>
            </div>
        </div>
        
        <div class="logs-section">
            <div class="logs-header">
                <h2>System Logs</h2>
                <button class="btn" onclick="clearLogs()">Clear Logs</button>
            </div>
            <div class="logs-container" id="logsContainer">
                <div class="log-entry">
                    <span class="log-timestamp">[${new Date().toLocaleTimeString()}]</span>
                    <span class="log-level info">INFO</span>
                    GUI Launcher ready. Configure options and click "Start System" to begin.
                </div>
            </div>
        </div>
        
        <div class="quick-links">
            <a href="http://localhost:3000" class="quick-link" target="_blank" id="dashboardLink">
                <div>📊</div>
                <div>Dashboard</div>
            </a>
            <a href="http://localhost:3000/api/health" class="quick-link" target="_blank">
                <div>💓</div>
                <div>Health Check</div>
            </a>
            <a href="/docs/TESTING_GUIDE.md" class="quick-link" target="_blank">
                <div>📖</div>
                <div>Documentation</div>
            </a>
            <a href="javascript:void(0)" class="quick-link" onclick="showSystemInfo()">
                <div>⚙️</div>
                <div>System Info</div>
            </a>
        </div>
    </div>
    
    <script>
        const socket = io();
        let systemStatus = 'stopped';
        
        // Socket event handlers
        socket.on('statusUpdate', (data) => {
            updateSystemStatus(data.status);
            if (data.logs) {
                data.logs.forEach(log => addLogEntry(log));
            }
        });
        
        socket.on('logUpdate', (log) => {
            addLogEntry(log);
        });
        
        socket.on('error', (error) => {
            addLogEntry({ 
                level: 'error', 
                message: error, 
                timestamp: new Date().toISOString() 
            });
        });
        
        // UI Functions
        function updateSystemStatus(status) {
            systemStatus = status;
            const indicator = document.getElementById('statusIndicator');
            const text = document.getElementById('statusText');
            const description = document.getElementById('statusDescription');
            const startBtn = document.getElementById('startBtn');
            const stopBtn = document.getElementById('stopBtn');
            const dashboardBtn = document.getElementById('dashboardBtn');
            
            switch (status) {
                case 'running':
                    indicator.className = 'status-indicator running';
                    indicator.textContent = '✅';
                    text.textContent = 'System Running';
                    description.textContent = 'All services operational';
                    startBtn.disabled = true;
                    stopBtn.disabled = false;
                    dashboardBtn.disabled = false;
                    break;
                case 'starting':
                    indicator.className = 'status-indicator starting';
                    indicator.textContent = '⏳';
                    text.textContent = 'System Starting';
                    description.textContent = 'Please wait...';
                    startBtn.disabled = true;
                    stopBtn.disabled = false;
                    dashboardBtn.disabled = true;
                    break;
                case 'stopping':
                    indicator.className = 'status-indicator';
                    indicator.textContent = '⏹️';
                    text.textContent = 'System Stopping';
                    description.textContent = 'Shutting down services...';
                    startBtn.disabled = true;
                    stopBtn.disabled = true;
                    dashboardBtn.disabled = true;
                    break;
                default:
                    indicator.className = 'status-indicator';
                    indicator.textContent = '⏹️';
                    text.textContent = 'System Stopped';
                    description.textContent = 'Ready to start';
                    startBtn.disabled = false;
                    stopBtn.disabled = true;
                    dashboardBtn.disabled = true;
            }
        }
        
        function addLogEntry(log) {
            const container = document.getElementById('logsContainer');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            
            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            
            entry.innerHTML = \`
                <span class="log-timestamp">[\${timestamp}]</span>
                <span class="log-level \${log.level}">\${log.level.toUpperCase()}</span>
                \${log.message}
            \`;
            
            container.appendChild(entry);
            container.scrollTop = container.scrollHeight;
            
            // Keep only last 100 entries
            while (container.children.length > 100) {
                container.removeChild(container.firstChild);
            }
        }
        
        function getStartupOptions() {
            return {
                skipTests: document.getElementById('skipTests').checked,
                openBrowser: document.getElementById('openBrowser').checked,
                quick: document.getElementById('quickMode').checked
            };
        }
        
        async function startSystem() {
            const options = getStartupOptions();
            
            try {
                updateSystemStatus('starting');
                addLogEntry({
                    level: 'info',
                    message: 'Starting system with options: ' + JSON.stringify(options),
                    timestamp: new Date().toISOString()
                });
                
                const response = await fetch('/api/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ options })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    addLogEntry({
                        level: 'success',
                        message: result.message,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                updateSystemStatus('stopped');
                addLogEntry({
                    level: 'error',
                    message: 'Failed to start system: ' + error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        async function stopSystem() {
            try {
                updateSystemStatus('stopping');
                addLogEntry({
                    level: 'info',
                    message: 'Stopping system...',
                    timestamp: new Date().toISOString()
                });
                
                const response = await fetch('/api/stop', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    updateSystemStatus('stopped');
                    addLogEntry({
                        level: 'success',
                        message: result.message,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                addLogEntry({
                    level: 'error',
                    message: 'Failed to stop system: ' + error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        function openDashboard() {
            window.open('http://localhost:3000', '_blank');
        }
        
        function clearLogs() {
            document.getElementById('logsContainer').innerHTML = '';
        }
        
        async function showSystemInfo() {
            try {
                const response = await fetch('/api/system-info');
                const info = await response.json();
                
                const infoDiv = document.getElementById('systemInfo');
                infoDiv.innerHTML = \`
                    <p><strong>Platform:</strong> \${info.platform} (\${info.arch})</p>
                    <p><strong>CPU:</strong> \${info.cpu.cores} cores</p>
                    <p><strong>Memory:</strong> \${Math.round(info.memory.used / 1024 / 1024 / 1024 * 100) / 100}GB / \${Math.round(info.memory.total / 1024 / 1024 / 1024 * 100) / 100}GB (\${Math.round(info.memory.percentage)}%)</p>
                    <p><strong>Uptime:</strong> \${Math.floor(info.uptime / 3600)}h \${Math.floor((info.uptime % 3600) / 60)}m</p>
                \`;
            } catch (error) {
                addLogEntry({
                    level: 'error',
                    message: 'Failed to get system info: ' + error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Initial load
        showSystemInfo();
        
        // Periodic status updates
        setInterval(async () => {
            try {
                const response = await fetch('/api/status');
                const status = await response.json();
                updateSystemStatus(status.status);
            } catch (error) {
                // Ignore errors in periodic updates
            }
        }, 5000);
    </script>
</body>
</html>`;
  }
  
  async startSystem(options = {}) {
    if (this.systemStatus === 'running' || this.systemStatus === 'starting') {
      throw new Error('System is already running or starting');
    }
    
    this.systemStatus = 'starting';
    this.broadcastStatus();
    this.addLog('Starting viral content automation system...', 'info');
    
    try {
      this.startup = new ViralContentStartup({
        skipTests: options.skipTests !== false,
        skipValidation: false,
        skipHealthCheck: false,
        openBrowser: options.openBrowser !== false,
        port: 3000,
        mode: 'development',
        gui: false,
        quick: options.quick === true
      });
      
      // Run startup in background
      this.startup.run().then(() => {
        this.systemStatus = 'running';
        this.broadcastStatus();
        this.addLog('System started successfully! 🎉', 'success');
      }).catch((error) => {
        this.systemStatus = 'stopped';
        this.broadcastStatus();
        this.addLog(`System startup failed: ${error.message}`, 'error');
      });
      
    } catch (error) {
      this.systemStatus = 'stopped';
      this.broadcastStatus();
      throw error;
    }
  }
  
  async stopSystem() {
    if (this.systemStatus === 'stopped') {
      return;
    }
    
    this.systemStatus = 'stopping';
    this.broadcastStatus();
    this.addLog('Stopping system...', 'info');
    
    try {
      if (this.startup) {
        await this.startup.cleanup();
      }
      
      await processManager.shutdown();
      
      this.systemStatus = 'stopped';
      this.broadcastStatus();
      this.addLog('System stopped successfully', 'success');
    } catch (error) {
      this.addLog(`Error stopping system: ${error.message}`, 'error');
      this.systemStatus = 'stopped';
      this.broadcastStatus();
    }
  }
  
  addLog(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    this.logs.push(logEntry);
    
    // Keep only last 200 logs
    if (this.logs.length > 200) {
      this.logs = this.logs.slice(-200);
    }
    
    // Broadcast to all connected clients
    this.io.emit('logUpdate', logEntry);
    
    // Also log to console with color
    let coloredMessage;
    switch (level) {
      case 'info':
        coloredMessage = chalk.cyan(`[GUI] ${message}`);
        break;
      case 'success':
        coloredMessage = chalk.green(`[GUI] ${message}`);
        break;
      case 'warning':
        coloredMessage = chalk.yellow(`[GUI] ${message}`);
        break;
      case 'error':
        coloredMessage = chalk.red(`[GUI] ${message}`);
        break;
      default:
        coloredMessage = chalk.white(`[GUI] ${message}`);
    }
    console.log(coloredMessage);
  }
  
  broadcastStatus() {
    this.io.emit('statusUpdate', {
      status: this.systemStatus,
      timestamp: new Date().toISOString()
    });
  }
  
  async start() {
    try {
      // Find available port
      const portResult = await portManager.findAvailablePort(8080, {
        portRange: [8080, 8090]
      });
      this.port = portResult.port;
      
      // Start the GUI server
      this.server.listen(this.port, () => {
        this.addLog(`GUI Launcher started on port ${this.port}`, 'success');
        console.log(chalk.green(`\n🖥️  GUI Launcher: http://localhost:${this.port}\n`));
      });
      
      // Open browser automatically
      setTimeout(async () => {
        try {
          await browserAutomation.openUrl(`http://localhost:${this.port}`, {
            newWindow: true
          });
        } catch (error) {
          this.addLog(`Could not open browser: ${error.message}`, 'warning');
        }
      }, 2000);
      
    } catch (error) {
      console.error(chalk.red('Failed to start GUI launcher:'), error.message);
      process.exit(1);
    }
  }
}

// Start GUI launcher if called directly
if (require.main === module) {
  const launcher = new GUILauncher();
  launcher.start();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Shutting down GUI launcher...'));
    await launcher.stopSystem();
    process.exit(0);
  });
}

module.exports = GUILauncher;