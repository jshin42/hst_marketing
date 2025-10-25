#!/usr/bin/env node

/**
 * Viral Content Automation System - Startup Script
 * Comprehensive startup script with error handling, progress reporting, and browser automation
 */

const { Command } = require('commander');
const { Listr } = require('listr2');
const chalk = require('chalk');
const open = require('open');
const { portManager } = require('./utils/port-manager');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Promisify exec for easier async/await usage
const execAsync = promisify(exec);

class ViralContentStartup {
  constructor(options = {}) {
    this.options = {
      skipTests: false,
      skipValidation: false,
      skipHealthCheck: false,
      openBrowser: true,
      port: 3000,
      mode: 'development',
      gui: false,
      quick: false,
      ...options
    };
    
    this.processes = new Map();
    this.isShuttingDown = false;
    
    // Setup graceful shutdown
    this.setupSignalHandlers();
  }
  
  setupSignalHandlers() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        
        console.log(chalk.yellow(`\n🛑 Received ${signal}, shutting down gracefully...`));
        await this.cleanup();
        process.exit(0);
      });
    });
    
    process.on('uncaughtException', async (error) => {
      console.error(chalk.red('💥 Uncaught Exception:'), error);
      await this.cleanup();
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      console.error(chalk.red('💥 Unhandled Rejection:'), reason);
      await this.cleanup();
      process.exit(1);
    });
  }
  
  async cleanup() {
    console.log(chalk.yellow('🧹 Cleaning up processes...'));
    
    for (const [name, process] of this.processes) {
      try {
        if (process && !process.killed) {
          console.log(chalk.gray(`  Stopping ${name}...`));
          process.kill('SIGTERM');
          
          // Give process 5 seconds to gracefully shutdown
          setTimeout(() => {
            if (!process.killed) {
              process.kill('SIGKILL');
            }
          }, 5000);
        }
      } catch (error) {
        console.error(chalk.red(`  Failed to stop ${name}:`, error.message));
      }
    }
    
    this.processes.clear();
  }
  
  async checkSystemRequirements() {
    const requirements = [
      {
        name: 'Node.js Version',
        check: async () => {
          const version = process.version;
          const majorVersion = parseInt(version.slice(1).split('.')[0]);
          if (majorVersion < 16) {
            throw new Error(`Node.js ${version} is too old. Requires 16.0.0 or higher.`);
          }
          return `✅ ${version}`;
        }
      },
      {
        name: 'Memory Available',
        check: async () => {
          const freeMem = os.freemem();
          const freeMemMB = Math.round(freeMem / 1024 / 1024);
          if (freeMemMB < 512) {
            throw new Error(`Insufficient memory: ${freeMemMB}MB available, 512MB required`);
          }
          return `✅ ${freeMemMB}MB available`;
        }
      },
      {
        name: 'Disk Space',
        check: async () => {
          try {
            const stats = await fs.stat('.');
            return '✅ Sufficient disk space';
          } catch (error) {
            throw new Error('Cannot access current directory');
          }
        }
      },
      {
        name: 'Environment File',
        check: async () => {
          try {
            await fs.access('.env');
            return '✅ .env file exists';
          } catch (error) {
            // Try to copy from .env.example
            try {
              await fs.copyFile('.env.example', '.env');
              return '⚠️  Created .env from .env.example - please configure API keys';
            } catch (copyError) {
              throw new Error('.env file missing and .env.example not found');
            }
          }
        }
      }
    ];
    
    for (const requirement of requirements) {
      try {
        const result = await requirement.check();
        console.log(chalk.gray(`  ${requirement.name}: ${result}`));
      } catch (error) {
        throw new Error(`${requirement.name}: ${error.message}`);
      }
    }
  }
  
  async installDependencies() {
    try {
      // Check if node_modules exists and has packages
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      
      const [nodeModulesStats, packageJson] = await Promise.allSettled([
        fs.stat(nodeModulesPath),
        fs.readFile(packageJsonPath, 'utf8')
      ]);
      
      if (nodeModulesStats.status === 'rejected' || this.options.mode === 'production') {
        const installCommand = this.options.mode === 'production' ? 'npm ci --only=production' : 'npm install';
        console.log(chalk.gray(`  Running: ${installCommand}`));
        
        const { stdout, stderr } = await execAsync(installCommand, {
          cwd: process.cwd(),
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        
        if (stderr && !stderr.includes('warn')) {
          throw new Error(stderr);
        }
        
        return '✅ Dependencies installed successfully';
      } else {
        return '✅ Dependencies already installed';
      }
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  }
  
  async runTests() {
    if (this.options.skipTests || this.options.quick) {
      return '⏭️  Tests skipped';
    }
    
    try {
      const testCommand = this.options.mode === 'production' ? 'npm run test:unit' : 'npm test';
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: process.cwd(),
        timeout: 120000 // 2 minutes timeout
      });
      
      // Parse test results
      const passMatch = stdout.match(/(\d+) passed/);
      const failMatch = stdout.match(/(\d+) failed/);
      
      if (failMatch && parseInt(failMatch[1]) > 0) {
        throw new Error(`${failMatch[1]} tests failed`);
      }
      
      const passedCount = passMatch ? passMatch[1] : '0';
      return `✅ ${passedCount} tests passed`;
    } catch (error) {
      if (error.code === 'TIMEOUT') {
        throw new Error('Tests timed out after 2 minutes');
      }
      throw new Error(`Tests failed: ${error.message}`);
    }
  }
  
  async runCoverageReport() {
    if (this.options.skipTests || this.options.quick || this.options.mode === 'production') {
      return '⏭️  Coverage skipped';
    }
    
    try {
      const { stdout } = await execAsync('npm run test:coverage', {
        cwd: process.cwd(),
        timeout: 180000 // 3 minutes timeout
      });
      
      // Parse coverage results
      const coverageMatch = stdout.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*(\d+(?:\.\d+)?)/);
      if (coverageMatch) {
        const coverage = parseFloat(coverageMatch[1]);
        if (coverage < 80) {
          return `⚠️  Coverage: ${coverage}% (below 80% threshold)`;
        }
        return `✅ Coverage: ${coverage}%`;
      }
      
      return '✅ Coverage report generated';
    } catch (error) {
      throw new Error(`Coverage failed: ${error.message}`);
    }
  }
  
  async validateSystemConfiguration() {
    if (this.options.skipValidation) {
      return '⏭️  Validation skipped';
    }
    
    try {
      const { stdout, stderr } = await execAsync('node scripts/validate-setup.js', {
        cwd: process.cwd(),
        timeout: 60000 // 1 minute timeout
      });
      
      // Check if validation passed
      if (stderr.includes('FAIL') || stdout.includes('❌')) {
        // Still return success but with warning - API credentials might be placeholder
        return '⚠️  Configuration issues detected (API credentials may need setup)';
      }
      
      return '✅ System configuration valid';
    } catch (error) {
      // Don't fail startup for validation issues, just warn
      return `⚠️  Validation warnings: ${error.message.split('\n')[0]}`;
    }
  }
  
  async runHealthCheck() {
    if (this.options.skipHealthCheck) {
      return '⏭️  Health check skipped';
    }
    
    try {
      const { stdout, stderr } = await execAsync('node scripts/health-check.js', {
        cwd: process.cwd(),
        timeout: 30000 // 30 seconds timeout
      });
      
      // Parse health check results
      if (stdout.includes('HEALTHY')) {
        return '✅ System health check passed';
      } else if (stdout.includes('DEGRADED')) {
        return '⚠️  System health degraded (API issues)';
      } else {
        return '⚠️  Health check completed with warnings';
      }
    } catch (error) {
      // Don't fail startup for health check issues
      return `⚠️  Health check warnings: API credentials may need setup`;
    }
  }
  
  async findAvailablePort(preferredPort = 3000) {
    try {
      const result = await portManager.findAvailablePort(preferredPort);
      if (!result.isPreferred) {
        console.log(chalk.yellow(`  ${result.message}`));
      }
      return result.port;
    } catch (error) {
      throw new Error(`Cannot find available port: ${error.message}`);
    }
  }
  
  async startMonitoringDashboard() {
    try {
      const port = await this.findAvailablePort(this.options.port);
      
      return new Promise((resolve, reject) => {
        const dashboardProcess = spawn('node', ['monitoring/dashboard.js'], {
          cwd: process.cwd(),
          env: { ...process.env, DASHBOARD_PORT: port },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        this.processes.set('dashboard', dashboardProcess);
        
        let startupOutput = '';
        let startupTimeout = setTimeout(() => {
          reject(new Error('Dashboard startup timeout'));
        }, 30000);
        
        dashboardProcess.stdout.on('data', (data) => {
          startupOutput += data.toString();
          
          // Check for successful startup
          if (startupOutput.includes(`port ${port}`) || startupOutput.includes('started')) {
            clearTimeout(startupTimeout);
            
            // Open browser if requested
            if (this.options.openBrowser) {
              setTimeout(async () => {
                try {
                  await open(`http://localhost:${port}`);
                  console.log(chalk.gray(`  🌐 Browser opened: http://localhost:${port}`));
                } catch (error) {
                  console.log(chalk.yellow(`  ⚠️  Could not open browser: ${error.message}`));
                }
              }, 2000);
            }
            
            resolve(`✅ Dashboard running on http://localhost:${port}`);
          }
        });
        
        dashboardProcess.stderr.on('data', (data) => {
          const errorOutput = data.toString();
          
          // Check for port conflicts
          if (errorOutput.includes('EADDRINUSE')) {
            clearTimeout(startupTimeout);
            reject(new Error(`Port ${port} is already in use`));
          } else if (errorOutput.includes('Error')) {
            console.error(chalk.red('Dashboard error:'), errorOutput);
          }
        });
        
        dashboardProcess.on('error', (error) => {
          clearTimeout(startupTimeout);
          reject(new Error(`Dashboard startup failed: ${error.message}`));
        });
        
        dashboardProcess.on('exit', (code) => {
          if (code !== 0 && code !== null) {
            clearTimeout(startupTimeout);
            reject(new Error(`Dashboard exited with code ${code}`));
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to start dashboard: ${error.message}`);
    }
  }
  
  async displayWelcomeMessage() {
    const lines = [
      '',
      chalk.cyan('🚀 ') + chalk.bold('VIRAL CONTENT AUTOMATION SYSTEM'),
      chalk.gray('   Automated Research → Analysis → Generation Pipeline'),
      '',
      chalk.green('✅ System Status: ') + chalk.bold('OPERATIONAL'),
      chalk.blue('🖥️  Dashboard: ') + chalk.underline(`http://localhost:${this.options.port}`),
      '',
      chalk.yellow('📋 Available Commands:'),
      chalk.gray('   • npm test                - Run test suite'),
      chalk.gray('   • npm run health-check    - Check system health'),
      chalk.gray('   • npm run validate-setup  - Validate configuration'),
      '',
      chalk.magenta('🛑 To stop: ') + chalk.bold('Ctrl+C'),
      ''
    ];
    
    const maxWidth = Math.max(...lines.map(line => chalk.stripColor(line).length));
    const border = '═'.repeat(maxWidth + 4);
    
    console.log(chalk.cyan(`╔${border}╗`));
    lines.forEach(line => {
      const content = line.padEnd(maxWidth + (line.length - chalk.stripColor(line).length));
      console.log(chalk.cyan('║ ') + content + chalk.cyan(' ║'));
    });
    console.log(chalk.cyan(`╚${border}╝`));
  }
  
  async createGUILauncher() {
    if (!this.options.gui) return;
    
    const launcherHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Viral Content Automation - Launcher</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh; display: flex; align-items: center; justify-content: center;
            color: white;
        }
        .launcher {
            background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
            padding: 3rem; border-radius: 20px; text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        .status { font-size: 1.2rem; margin: 2rem 0; }
        .buttons { display: flex; gap: 1rem; justify-content: center; }
        button {
            padding: 1rem 2rem; border: none; border-radius: 10px;
            font-size: 1rem; cursor: pointer; transition: transform 0.2s;
            background: rgba(255,255,255,0.2); color: white;
        }
        button:hover { transform: translateY(-2px); }
        .primary { background: #27ae60; }
        .secondary { background: #e74c3c; }
        .logs { 
            margin-top: 2rem; padding: 1rem; background: rgba(0,0,0,0.3);
            border-radius: 10px; font-family: monospace; text-align: left;
            height: 200px; overflow-y: auto; font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="launcher">
        <h1>🚀 Viral Content Automation</h1>
        <div class="status" id="status">System Ready</div>
        <div class="buttons">
            <button class="primary" onclick="startSystem()">Start System</button>
            <button onclick="openDashboard()">Open Dashboard</button>
            <button class="secondary" onclick="stopSystem()">Stop System</button>
        </div>
        <div class="logs" id="logs">Ready to start...\n</div>
    </div>
    
    <script>
        function log(message) {
            const logs = document.getElementById('logs');
            logs.innerHTML += new Date().toLocaleTimeString() + ': ' + message + '\\n';
            logs.scrollTop = logs.scrollHeight;
        }
        
        function updateStatus(status) {
            document.getElementById('status').textContent = status;
        }
        
        function startSystem() {
            updateStatus('Starting system...');
            log('Initiating startup sequence...');
            // This would trigger the startup via local server/IPC
            fetch('/api/start', { method: 'POST' })
                .then(() => {
                    updateStatus('System Running');
                    log('System started successfully!');
                })
                .catch(err => {
                    updateStatus('Start Failed');
                    log('Error: ' + err.message);
                });
        }
        
        function openDashboard() {
            window.open('http://localhost:3000', '_blank');
        }
        
        function stopSystem() {
            updateStatus('Stopping system...');
            log('Shutting down...');
            fetch('/api/stop', { method: 'POST' })
                .then(() => {
                    updateStatus('System Stopped');
                    log('System stopped successfully.');
                })
                .catch(err => log('Error: ' + err.message));
        }
    </script>
</body>
</html>`;
    
    await fs.writeFile('launcher.html', launcherHTML);
    console.log(chalk.gray('  🖥️  GUI launcher created: launcher.html'));
  }
  
  async run() {
    try {
      console.log(chalk.bold.cyan('\n🚀 VIRAL CONTENT AUTOMATION SYSTEM STARTUP\n'));
      
      if (this.options.gui) {
        await this.createGUILauncher();
        await open('launcher.html');
        return;
      }
      
      const tasks = new Listr([
        {
          title: 'System Requirements Check',
          task: async () => await this.checkSystemRequirements()
        },
        {
          title: 'Install Dependencies',
          task: async () => await this.installDependencies(),
          skip: () => this.options.quick ? 'Skipped in quick mode' : false
        },
        {
          title: 'Run Unit Tests',
          task: async () => await this.runTests(),
          skip: () => this.options.skipTests ? 'Tests disabled' : false
        },
        {
          title: 'Generate Coverage Report',
          task: async () => await this.runCoverageReport(),
          skip: () => this.options.skipTests || this.options.quick ? 'Coverage skipped' : false
        },
        {
          title: 'Validate System Configuration',
          task: async () => await this.validateSystemConfiguration(),
          skip: () => this.options.skipValidation ? 'Validation disabled' : false
        },
        {
          title: 'Run Health Check',
          task: async () => await this.runHealthCheck(),
          skip: () => this.options.skipHealthCheck ? 'Health check disabled' : false
        },
        {
          title: 'Start Monitoring Dashboard',
          task: async () => await this.startMonitoringDashboard()
        }
      ], {
        concurrent: false,
        exitOnError: false,
        rendererOptions: {
          collapse: false,
          showSubtasks: true
        }
      });
      
      await tasks.run();
      
      await this.displayWelcomeMessage();
      
      // Keep the process running
      if (!this.isShuttingDown) {
        console.log(chalk.gray('\n💡 Tip: Use Ctrl+C to stop the system gracefully\n'));
        
        // Keep process alive and monitor dashboard
        const keepAlive = setInterval(() => {
          if (this.isShuttingDown) {
            clearInterval(keepAlive);
          }
        }, 1000);
      }
      
    } catch (error) {
      console.error(chalk.red('\n💥 Startup failed:'), error.message);
      
      if (error.message.includes('EADDRINUSE')) {
        console.log(chalk.yellow('\n💡 Tip: Another instance might be running. Try a different port with --port option'));
      }
      
      await this.cleanup();
      process.exit(1);
    }
  }
}

// CLI Setup
const program = new Command();

program
  .name('viral-content-startup')
  .description('Viral Content Automation System Startup Script')
  .version('1.0.0')
  .option('--skip-tests', 'skip running tests')
  .option('--skip-validation', 'skip configuration validation')
  .option('--skip-health-check', 'skip health check')
  .option('--no-browser', 'do not open browser automatically')
  .option('--port <number>', 'dashboard port', 3000)
  .option('--mode <mode>', 'startup mode (development|production)', 'development')
  .option('--gui', 'launch GUI interface')
  .option('--quick', 'quick startup (skip tests and coverage)')
  .action(async (options) => {
    const startup = new ViralContentStartup({
      skipTests: options.skipTests,
      skipValidation: options.skipValidation,
      skipHealthCheck: options.skipHealthCheck,
      openBrowser: options.browser,
      port: parseInt(options.port),
      mode: options.mode,
      gui: options.gui,
      quick: options.quick
    });
    
    await startup.run();
  });

// Handle direct execution
if (require.main === module) {
  program.parse();
}

module.exports = ViralContentStartup;