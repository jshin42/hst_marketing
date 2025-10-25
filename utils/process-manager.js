/**
 * Process Management Utilities
 * Handles spawning, monitoring, and coordinating multiple processes
 */

const { spawn, exec } = require('child_process');
const { EventEmitter } = require('events');
const { promisify } = require('util');
const chalk = require('chalk');
const os = require('os');

const execAsync = promisify(exec);

class ProcessManager extends EventEmitter {
  constructor() {
    super();
    this.processes = new Map();
    this.isShuttingDown = false;
    this.healthCheckInterval = null;
    
    // Setup graceful shutdown
    this.setupSignalHandlers();
  }
  
  setupSignalHandlers() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) return;
        await this.shutdown();
      });
    });
  }
  
  /**
   * Spawn a new process with monitoring
   */
  async spawnProcess(name, command, args = [], options = {}) {
    const {
      cwd = process.cwd(),
      env = process.env,
      stdio = ['pipe', 'pipe', 'pipe'],
      timeout = 0,
      retries = 0,
      restartDelay = 5000,
      healthCheck = null,
      onOutput = null,
      onError = null,
      onExit = null
    } = options;
    
    if (this.processes.has(name)) {
      throw new Error(`Process '${name}' is already running`);
    }
    
    const processConfig = {
      name,
      command,
      args,
      options,
      startTime: Date.now(),
      restartCount: 0,
      maxRestarts: retries,
      restartDelay,
      healthCheck,
      status: 'starting'
    };
    
    const childProcess = spawn(command, args, {
      cwd,
      env,
      stdio,
      detached: false
    });
    
    processConfig.process = childProcess;
    processConfig.pid = childProcess.pid;
    this.processes.set(name, processConfig);
    
    // Setup timeout if specified
    if (timeout > 0) {
      processConfig.timeoutHandle = setTimeout(() => {
        this.killProcess(name, 'SIGKILL');
        this.emit('processTimeout', name, timeout);
      }, timeout);
    }
    
    // Handle process output
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        this.emit('processOutput', name, 'stdout', output);
        if (onOutput) onOutput('stdout', output);
      });
    }
    
    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        const output = data.toString();
        this.emit('processOutput', name, 'stderr', output);
        if (onError) onError('stderr', output);
      });
    }
    
    // Handle process exit
    childProcess.on('exit', async (code, signal) => {
      if (processConfig.timeoutHandle) {
        clearTimeout(processConfig.timeoutHandle);
      }
      
      processConfig.status = 'exited';
      processConfig.exitCode = code;
      processConfig.exitSignal = signal;
      processConfig.endTime = Date.now();
      
      this.emit('processExit', name, code, signal);
      if (onExit) onExit(code, signal);
      
      // Handle automatic restart
      if (code !== 0 && processConfig.restartCount < processConfig.maxRestarts && !this.isShuttingDown) {
        processConfig.restartCount++;
        this.emit('processRestart', name, processConfig.restartCount);
        
        setTimeout(async () => {
          try {
            this.processes.delete(name);
            await this.spawnProcess(name, command, args, options);
          } catch (error) {
            this.emit('processRestartFailed', name, error);
          }
        }, processConfig.restartDelay);
      } else {
        this.processes.delete(name);
      }
    });
    
    // Handle process errors
    childProcess.on('error', (error) => {
      processConfig.status = 'error';
      processConfig.error = error;
      this.emit('processError', name, error);
    });
    
    // Wait for process to start
    await new Promise((resolve, reject) => {
      const startTimeout = setTimeout(() => {
        reject(new Error(`Process '${name}' failed to start within 10 seconds`));
      }, 10000);
      
      // Consider process started if it doesn't immediately exit
      setTimeout(() => {
        if (childProcess.exitCode === null) {
          processConfig.status = 'running';
          clearTimeout(startTimeout);
          resolve();
        }
      }, 1000);
      
      childProcess.on('exit', () => {
        clearTimeout(startTimeout);
        if (processConfig.status === 'starting') {
          reject(new Error(`Process '${name}' exited during startup`));
        }
      });
    });
    
    this.emit('processStarted', name, childProcess.pid);
    return processConfig;
  }
  
  /**
   * Execute a command and return result
   */
  async executeCommand(command, options = {}) {
    const {
      timeout = 30000,
      cwd = process.cwd(),
      env = process.env,
      encoding = 'utf8'
    } = options;
    
    try {
      const result = await execAsync(command, {
        timeout,
        cwd,
        env,
        encoding,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      return {
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        command
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        command,
        code: error.code
      };
    }
  }
  
  /**
   * Kill a process by name
   */
  async killProcess(name, signal = 'SIGTERM') {
    const processConfig = this.processes.get(name);
    if (!processConfig) {
      throw new Error(`Process '${name}' not found`);
    }
    
    const { process: childProcess } = processConfig;
    
    if (childProcess && !childProcess.killed) {
      processConfig.status = 'stopping';
      
      try {
        // Try graceful shutdown first
        childProcess.kill(signal);
        
        // If graceful shutdown fails, force kill after delay
        if (signal !== 'SIGKILL') {
          setTimeout(() => {
            if (!childProcess.killed) {
              childProcess.kill('SIGKILL');
            }
          }, 5000);
        }
        
        return true;
      } catch (error) {
        throw new Error(`Failed to kill process '${name}': ${error.message}`);
      }
    }
    
    return false;
  }
  
  /**
   * Get process status
   */
  getProcessStatus(name) {
    const processConfig = this.processes.get(name);
    if (!processConfig) {
      return null;
    }
    
    const uptime = processConfig.startTime ? Date.now() - processConfig.startTime : 0;
    
    return {
      name: processConfig.name,
      pid: processConfig.pid,
      status: processConfig.status,
      uptime,
      restartCount: processConfig.restartCount,
      command: processConfig.command,
      args: processConfig.args,
      exitCode: processConfig.exitCode,
      exitSignal: processConfig.exitSignal,
      error: processConfig.error
    };
  }
  
  /**
   * Get all process statuses
   */
  getAllProcessStatuses() {
    const statuses = {};
    for (const name of this.processes.keys()) {
      statuses[name] = this.getProcessStatus(name);
    }
    return statuses;
  }
  
  /**
   * Check if process is running
   */
  isProcessRunning(name) {
    const processConfig = this.processes.get(name);
    return processConfig && processConfig.status === 'running' && processConfig.process && !processConfig.process.killed;
  }
  
  /**
   * Wait for process to exit
   */
  async waitForProcessExit(name, timeoutMs = 30000) {
    const processConfig = this.processes.get(name);
    if (!processConfig) {
      return true; // Process doesn't exist, consider it exited
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Process '${name}' did not exit within ${timeoutMs}ms`));
      }, timeoutMs);
      
      if (processConfig.status === 'exited' || !processConfig.process) {
        clearTimeout(timeout);
        resolve(true);
        return;
      }
      
      const exitHandler = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      
      processConfig.process.on('exit', exitHandler);
    });
  }
  
  /**
   * Start health monitoring for processes
   */
  startHealthMonitoring(intervalMs = 30000) {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      for (const [name, processConfig] of this.processes) {
        if (processConfig.healthCheck && processConfig.status === 'running') {
          try {
            const isHealthy = await processConfig.healthCheck();
            if (!isHealthy) {
              this.emit('processUnhealthy', name);
            }
          } catch (error) {
            this.emit('processHealthCheckFailed', name, error);
          }
        }
      }
    }, intervalMs);
  }
  
  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
  
  /**
   * Get system resource usage
   */
  async getSystemResources() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Get CPU usage (approximate)
    const cpus = os.cpus();
    const numCpus = cpus.length;
    
    return {
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: (usedMem / totalMem) * 100
      },
      cpu: {
        cores: numCpus,
        model: cpus[0].model,
        loadAverage: os.loadavg()
      },
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch()
    };
  }
  
  /**
   * Get detailed process information
   */
  async getDetailedProcessInfo(name) {
    const processConfig = this.processes.get(name);
    if (!processConfig) {
      return null;
    }
    
    const basicInfo = this.getProcessStatus(name);
    
    // Try to get additional process info from system
    if (processConfig.pid) {
      try {
        let memoryUsage = null;
        let cpuUsage = null;
        
        if (os.platform() === 'linux' || os.platform() === 'darwin') {
          // Unix-like systems
          const psResult = await execAsync(`ps -p ${processConfig.pid} -o pid,ppid,pcpu,pmem,rss,vsz,state,time`);
          const lines = psResult.stdout.trim().split('\n');
          if (lines.length > 1) {
            const parts = lines[1].trim().split(/\s+/);
            cpuUsage = parseFloat(parts[2]);
            memoryUsage = {
              percentage: parseFloat(parts[3]),
              rss: parseInt(parts[4]) * 1024, // Convert from KB to bytes
              vsz: parseInt(parts[5]) * 1024  // Convert from KB to bytes
            };
          }
        }
        
        return {
          ...basicInfo,
          systemInfo: {
            memoryUsage,
            cpuUsage,
            lastChecked: new Date().toISOString()
          }
        };
      } catch (error) {
        // System info unavailable, return basic info
      }
    }
    
    return basicInfo;
  }
  
  /**
   * Graceful shutdown of all processes
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    this.emit('shutdown');
    this.stopHealthMonitoring();
    
    console.log(chalk.yellow('🛑 Shutting down all processes...'));
    
    const shutdownPromises = Array.from(this.processes.keys()).map(async (name) => {
      try {
        console.log(chalk.gray(`  Stopping ${name}...`));
        await this.killProcess(name, 'SIGTERM');
        await this.waitForProcessExit(name, 10000);
        console.log(chalk.green(`  ✅ ${name} stopped`));
      } catch (error) {
        console.log(chalk.red(`  ❌ Failed to stop ${name}: ${error.message}`));
        // Force kill as last resort
        try {
          await this.killProcess(name, 'SIGKILL');
        } catch (killError) {
          console.log(chalk.red(`  💥 Force kill failed for ${name}`));
        }
      }
    });
    
    await Promise.all(shutdownPromises);
    this.processes.clear();
    
    console.log(chalk.green('✅ All processes shut down'));
  }
  
  /**
   * List running processes on the system (utility function)
   */
  async listSystemProcesses(filterPattern = null) {
    try {
      let command;
      if (os.platform() === 'win32') {
        command = 'tasklist';
      } else {
        command = 'ps aux';
      }
      
      const result = await execAsync(command);
      let processes = result.stdout.split('\n').filter(line => line.trim());
      
      if (filterPattern) {
        processes = processes.filter(line => 
          line.toLowerCase().includes(filterPattern.toLowerCase())
        );
      }
      
      return processes;
    } catch (error) {
      throw new Error(`Failed to list system processes: ${error.message}`);
    }
  }
}

// Singleton instance for global use
const processManager = new ProcessManager();

module.exports = {
  ProcessManager,
  processManager
};