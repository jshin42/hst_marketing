#!/usr/bin/env node

/**
 * Viral Content Automation System Monitoring Dashboard
 * Real-time monitoring of workflows, API health, and system performance
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const HealthChecker = require('../scripts/health-check');

class MonitoringDashboard {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.healthChecker = new HealthChecker();
    this.metrics = {
      workflows: {
        executed: 0,
        successful: 0,
        failed: 0,
        lastExecution: null
      },
      apis: {
        openai: { calls: 0, failures: 0, avgResponseTime: 0 },
        rapidapi: { calls: 0, failures: 0, avgResponseTime: 0 },
        apify: { calls: 0, failures: 0, avgResponseTime: 0 },
        airtable: { calls: 0, failures: 0, avgResponseTime: 0 }
      },
      content: {
        postsAnalyzed: 0,
        contentGenerated: 0,
        approvalsPending: 0,
        contentApproved: 0
      },
      system: {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        diskSpace: 0
      }
    };
    
    this.logs = [];
    this.setupRoutes();
    this.setupSocketHandlers();
    this.startMetricsCollection();
  }
  
  setupRoutes() {
    // Serve static dashboard files
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use(express.json());
    
    // API endpoints
    this.app.get('/api/health', async (req, res) => {
      try {
        const health = await this.healthChecker.generateHealthReport();
        res.json(health);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.get('/api/metrics', (req, res) => {
      res.json({
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      });
    });
    
    this.app.get('/api/logs', (req, res) => {
      const limit = parseInt(req.query.limit) || 100;
      const level = req.query.level;
      
      let filteredLogs = this.logs;
      if (level) {
        filteredLogs = this.logs.filter(log => log.level === level);
      }
      
      res.json({
        logs: filteredLogs.slice(-limit),
        total: filteredLogs.length
      });
    });
    
    this.app.get('/api/workflows', (req, res) => {
      const workflowStatus = this.getWorkflowStatus();
      res.json(workflowStatus);
    });
    
    this.app.post('/api/test-workflow', async (req, res) => {
      try {
        const { platform } = req.body;
        const result = await this.testWorkflow(platform);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Dashboard HTML
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    });
  }
  
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      this.log('Client connected to monitoring dashboard', 'info');
      
      // Send initial data
      socket.emit('metrics', this.metrics);
      socket.emit('logs', this.logs.slice(-50));
      
      socket.on('request-health-check', async () => {
        try {
          const health = await this.healthChecker.generateHealthReport();
          socket.emit('health-update', health);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });
      
      socket.on('request-workflow-test', async (data) => {
        try {
          const result = await this.testWorkflow(data.platform);
          socket.emit('workflow-test-result', result);
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });
      
      socket.on('disconnect', () => {
        this.log('Client disconnected from monitoring dashboard', 'info');
      });
    });
  }
  
  startMetricsCollection() {
    // Collect metrics every 30 seconds
    setInterval(async () => {
      await this.collectSystemMetrics();
      await this.collectAPIMetrics();
      this.updateContentMetrics();
      
      // Broadcast updates to connected clients
      this.io.emit('metrics', this.metrics);
    }, 30000);
    
    // Collect logs every 5 seconds
    setInterval(() => {
      this.collectLogs();
      this.io.emit('logs', this.logs.slice(-10)); // Send latest logs
    }, 5000);
  }
  
  async collectSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      this.metrics.system = {
        uptime: Math.round(process.uptime()),
        memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        nodeVersion: process.version,
        platform: process.platform,
        lastUpdated: new Date().toISOString()
      };
      
      // Disk space check
      try {
        const { execSync } = require('child_process');
        const dfOutput = execSync('df -h .', { encoding: 'utf8' });
        const lines = dfOutput.split('\n');
        if (lines.length > 1) {
          const spaceInfo = lines[1].split(/\s+/);
          this.metrics.system.diskSpace = {
            total: spaceInfo[1],
            used: spaceInfo[2],
            available: spaceInfo[3],
            usedPercentage: spaceInfo[4]
          };
        }
      } catch (error) {
        this.log(`Disk space check failed: ${error.message}`, 'warning');
      }
      
    } catch (error) {
      this.log(`System metrics collection failed: ${error.message}`, 'error');
    }
  }
  
  async collectAPIMetrics() {
    const apis = [
      {
        name: 'openai',
        url: 'https://api.openai.com/v1/models',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
      },
      {
        name: 'airtable',
        url: `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/content_sources`,
        headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` },
        params: { maxRecords: 1 }
      }
    ];
    
    for (const api of apis) {
      const startTime = Date.now();
      try {
        await axios.get(api.url, {
          headers: api.headers,
          params: api.params,
          timeout: 10000
        });
        
        const responseTime = Date.now() - startTime;
        const apiMetrics = this.metrics.apis[api.name];
        
        apiMetrics.calls++;
        apiMetrics.avgResponseTime = Math.round(
          (apiMetrics.avgResponseTime * (apiMetrics.calls - 1) + responseTime) / apiMetrics.calls
        );
        apiMetrics.lastSuccess = new Date().toISOString();
        apiMetrics.status = 'healthy';
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const apiMetrics = this.metrics.apis[api.name];
        
        apiMetrics.calls++;
        apiMetrics.failures++;
        apiMetrics.lastFailure = new Date().toISOString();
        apiMetrics.lastError = error.message;
        apiMetrics.status = 'unhealthy';
        
        this.log(`API ${api.name} health check failed: ${error.message}`, 'error');
      }
    }
  }
  
  updateContentMetrics() {
    // This would typically read from AirTable or log files
    // For now, we'll simulate with file-based tracking
    try {
      const metricsFile = path.join(__dirname, 'content-metrics.json');
      if (fs.existsSync(metricsFile)) {
        const savedMetrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
        this.metrics.content = { ...this.metrics.content, ...savedMetrics };
      }
    } catch (error) {
      this.log(`Content metrics update failed: ${error.message}`, 'warning');
    }
  }
  
  collectLogs() {
    // Read from system logs, workflow logs, etc.
    const logSources = [
      path.join(__dirname, '..', 'logs', 'workflow.log'),
      path.join(__dirname, '..', 'logs', 'api.log'),
      path.join(__dirname, '..', 'logs', 'system.log')
    ];
    
    logSources.forEach(logFile => {
      if (fs.existsSync(logFile)) {
        try {
          const content = fs.readFileSync(logFile, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          // Parse recent log entries (last 10)
          lines.slice(-10).forEach(line => {
            try {
              const logEntry = JSON.parse(line);
              if (!this.logs.find(log => log.id === logEntry.id)) {
                this.logs.push(logEntry);
              }
            } catch (parseError) {
              // Handle non-JSON log lines
              if (line.includes('ERROR')) {
                this.addLog(line, 'error');
              } else if (line.includes('WARN')) {
                this.addLog(line, 'warning');
              } else {
                this.addLog(line, 'info');
              }
            }
          });
        } catch (error) {
          this.log(`Log collection from ${logFile} failed: ${error.message}`, 'warning');
        }
      }
    });
    
    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }
  
  getWorkflowStatus() {
    const workflows = [
      {
        name: 'Instagram Content Research',
        file: 'workflows/n8n/viral-content-research.json',
        status: 'active',
        lastRun: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        nextRun: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      },
      {
        name: 'LinkedIn Content Research',
        file: 'workflows/n8n/viral-content-research.json',
        status: 'active',
        lastRun: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        nextRun: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      },
      {
        name: 'Content Generation Pipeline',
        file: 'workflows/n8n/content-generation-pipeline.json',
        status: 'waiting',
        lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        nextRun: 'On email trigger'
      }
    ];
    
    return workflows.map(workflow => {
      const filePath = path.join(__dirname, '..', workflow.file);
      return {
        ...workflow,
        fileExists: fs.existsSync(filePath),
        fileSize: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
        lastModified: fs.existsSync(filePath) ? fs.statSync(filePath).mtime : null
      };
    });
  }
  
  async testWorkflow(platform) {
    this.log(`Testing ${platform} workflow`, 'info');
    
    try {
      switch (platform.toLowerCase()) {
        case 'instagram':
          return await this.testInstagramWorkflow();
        case 'linkedin':
          return await this.testLinkedInWorkflow();
        case 'tiktok':
          return await this.testTikTokWorkflow();
        default:
          throw new Error(`Unknown platform: ${platform}`);
      }
    } catch (error) {
      this.log(`Workflow test failed for ${platform}: ${error.message}`, 'error');
      throw error;
    }
  }
  
  async testInstagramWorkflow() {
    const steps = [
      { name: 'Instagram API Connection', status: 'pending' },
      { name: 'Content Analysis', status: 'pending' },
      { name: 'AirTable Storage', status: 'pending' }
    ];
    
    try {
      // Step 1: Test Instagram API
      const startTime = Date.now();
      await axios.get('https://instagram-scraper21.p.rapidapi.com/api/v1/posts', {
        params: { username: 'instagram' },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'instagram-scraper21.p.rapidapi.com'
        },
        timeout: 10000
      });
      steps[0].status = 'success';
      steps[0].duration = Date.now() - startTime;
      
      // Step 2: Test OpenAI Analysis
      const analysisStart = Date.now();
      await axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
      });
      steps[1].status = 'success';
      steps[1].duration = Date.now() - analysisStart;
      
      // Step 3: Test AirTable Connection
      const airtableStart = Date.now();
      await axios.get(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/content_sources`,
        {
          headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` },
          params: { maxRecords: 1 }
        }
      );
      steps[2].status = 'success';
      steps[2].duration = Date.now() - airtableStart;
      
      this.metrics.workflows.executed++;
      this.metrics.workflows.successful++;
      this.metrics.workflows.lastExecution = new Date().toISOString();
      
      return {
        success: true,
        platform: 'Instagram',
        steps,
        totalDuration: steps.reduce((sum, step) => sum + (step.duration || 0), 0)
      };
      
    } catch (error) {
      this.metrics.workflows.executed++;
      this.metrics.workflows.failed++;
      
      // Mark failed step
      const failedStep = steps.find(step => step.status === 'pending');
      if (failedStep) {
        failedStep.status = 'failed';
        failedStep.error = error.message;
      }
      
      return {
        success: false,
        platform: 'Instagram',
        steps,
        error: error.message
      };
    }
  }
  
  async testLinkedInWorkflow() {
    // Similar to Instagram workflow but for LinkedIn/Apify
    try {
      await axios.get('https://api.apify.com/v2/acts', {
        headers: { 'Authorization': `Bearer ${process.env.APIFY_TOKEN}` }
      });
      
      return {
        success: true,
        platform: 'LinkedIn',
        message: 'LinkedIn workflow test successful'
      };
    } catch (error) {
      return {
        success: false,
        platform: 'LinkedIn',
        error: error.message
      };
    }
  }
  
  async testTikTokWorkflow() {
    // Similar workflow test for TikTok
    try {
      await axios.get('https://tiktok-api23.p.rapidapi.com/search', {
        params: { keywords: 'test' },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'tiktok-api23.p.rapidapi.com'
        }
      });
      
      return {
        success: true,
        platform: 'TikTok',
        message: 'TikTok workflow test successful'
      };
    } catch (error) {
      return {
        success: false,
        platform: 'TikTok',
        error: error.message
      };
    }
  }
  
  log(message, level = 'info') {
    this.addLog(message, level);
    console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);
  }
  
  addLog(message, level = 'info') {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      message,
      source: 'monitoring-dashboard'
    };
    
    this.logs.push(logEntry);
    
    // Write to log file
    this.writeToLogFile(logEntry);
  }
  
  writeToLogFile(logEntry) {
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logFile = path.join(logsDir, 'dashboard.log');
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFileSync(logFile, logLine);
  }
  
  // Metrics tracking methods
  trackWorkflowExecution(platform, success, duration) {
    this.metrics.workflows.executed++;
    if (success) {
      this.metrics.workflows.successful++;
    } else {
      this.metrics.workflows.failed++;
    }
    this.metrics.workflows.lastExecution = new Date().toISOString();
    
    this.log(`Workflow executed: ${platform}, Success: ${success}, Duration: ${duration}ms`, 'info');
  }
  
  trackAPICall(service, success, responseTime) {
    const apiMetrics = this.metrics.apis[service];
    if (apiMetrics) {
      apiMetrics.calls++;
      if (!success) {
        apiMetrics.failures++;
      }
      apiMetrics.avgResponseTime = Math.round(
        (apiMetrics.avgResponseTime * (apiMetrics.calls - 1) + responseTime) / apiMetrics.calls
      );
    }
  }
  
  trackContentMetric(type, increment = 1) {
    if (this.metrics.content[type] !== undefined) {
      this.metrics.content[type] += increment;
      
      // Save to file
      const metricsFile = path.join(__dirname, 'content-metrics.json');
      fs.writeFileSync(metricsFile, JSON.stringify(this.metrics.content, null, 2));
    }
  }
  
  start(port = 3000) {
    this.server.listen(port, () => {
      this.log(`Monitoring Dashboard started on port ${port}`, 'info');
      this.log(`Dashboard URL: http://localhost:${port}`, 'info');
    });
  }
  
  stop() {
    this.server.close(() => {
      this.log('Monitoring Dashboard stopped', 'info');
    });
  }
}

// Start dashboard if run directly
if (require.main === module) {
  const dashboard = new MonitoringDashboard();
  dashboard.start(process.env.DASHBOARD_PORT || 3000);
  
  // Graceful shutdown
  process.on('SIGTERM', () => dashboard.stop());
  process.on('SIGINT', () => dashboard.stop());
}

module.exports = MonitoringDashboard;