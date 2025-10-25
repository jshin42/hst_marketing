/**
 * Port Management Utilities
 * Handles port conflicts, detection, and management across the system
 */

const { spawn } = require('child_process');
const os = require('os');
const net = require('net');

class PortManager {
  constructor() {
    this.reservedPorts = new Set();
    this.processPortMap = new Map();
  }
  
  /**
   * Find an available port, starting from the preferred port
   */
  async findAvailablePort(preferredPort, options = {}) {
    const {
      portRange = [3000, 9999],
      reservePort = true,
      avoid = []
    } = options;
    
    const excludePorts = new Set([...this.reservedPorts, ...avoid]);
    
    // Test if a port is available
    const testPort = (port) => {
      return new Promise((resolve) => {
        if (excludePorts.has(port)) {
          resolve(false);
          return;
        }
        
        const server = net.createServer();
        
        server.listen(port, () => {
          server.close(() => {
            resolve(true);
          });
        });
        
        server.on('error', () => {
          resolve(false);
        });
      });
    };
    
    // Start with preferred port
    if (await testPort(preferredPort)) {
      if (reservePort) {
        this.reservedPorts.add(preferredPort);
      }
      
      return {
        port: preferredPort,
        isPreferred: true,
        message: `Using preferred port ${preferredPort}`
      };
    }
    
    // Search for available port in range
    for (let port = preferredPort + 1; port <= portRange[1]; port++) {
      if (await testPort(port)) {
        if (reservePort) {
          this.reservedPorts.add(port);
        }
        
        return {
          port,
          isPreferred: false,
          message: `Port ${preferredPort} unavailable, using ${port}`
        };
      }
    }
    
    throw new Error(`Cannot find available port in range ${preferredPort}-${portRange[1]}`);
  }
  
  /**
   * Check if a specific port is available
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => {
          resolve(true);
        });
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }
  
  /**
   * Reserve a port to prevent conflicts
   */
  reservePort(port) {
    this.reservedPorts.add(port);
  }
  
  /**
   * Release a reserved port
   */
  releasePort(port) {
    this.reservedPorts.delete(port);
  }
  
  /**
   * Get all currently reserved ports
   */
  getReservedPorts() {
    return Array.from(this.reservedPorts);
  }
  
  /**
   * Kill process running on a specific port (Unix/Linux/macOS)
   */
  async killProcessOnPort(port) {
    return new Promise((resolve, reject) => {
      if (os.platform() === 'win32') {
        // Windows command
        const killCmd = spawn('netstat', ['-ano']);
        let output = '';
        
        killCmd.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        killCmd.on('close', () => {
          const lines = output.split('\n');
          const portLine = lines.find(line => 
            line.includes(`:${port} `) && line.includes('LISTENING')
          );
          
          if (portLine) {
            const pid = portLine.trim().split(/\s+/).pop();
            if (pid && !isNaN(pid)) {
              spawn('taskkill', ['/F', '/PID', pid])
                .on('close', (code) => {
                  resolve(code === 0 ? `Killed process ${pid} on port ${port}` : 'Failed to kill process');
                });
            } else {
              reject(new Error('Could not find PID'));
            }
          } else {
            resolve('No process found on port');
          }
        });
      } else {
        // Unix/Linux/macOS command
        const killCmd = spawn('lsof', ['-t', `-i:${port}`]);
        let pid = '';
        
        killCmd.stdout.on('data', (data) => {
          pid += data.toString().trim();
        });
        
        killCmd.on('close', (code) => {
          if (pid && !isNaN(pid)) {
            spawn('kill', ['-9', pid])
              .on('close', (killCode) => {
                resolve(killCode === 0 ? 
                  `Killed process ${pid} on port ${port}` : 
                  'Failed to kill process'
                );
              });
          } else {
            resolve('No process found on port');
          }
        });
        
        killCmd.on('error', () => {
          reject(new Error('lsof command not available'));
        });
      }
    });
  }
  
  /**
   * Get process information for a specific port
   */
  async getProcessOnPort(port) {
    return new Promise((resolve, reject) => {
      if (os.platform() === 'win32') {
        const netstatCmd = spawn('netstat', ['-ano']);
        let output = '';
        
        netstatCmd.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        netstatCmd.on('close', () => {
          const lines = output.split('\n');
          const portLine = lines.find(line => 
            line.includes(`:${port} `) && line.includes('LISTENING')
          );
          
          if (portLine) {
            const parts = portLine.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            resolve({ 
              port, 
              pid: parseInt(pid), 
              protocol: parts[0], 
              state: 'LISTENING' 
            });
          } else {
            resolve(null);
          }
        });
      } else {
        const lsofCmd = spawn('lsof', ['-i', `:${port}`, '-P', '-n']);
        let output = '';
        
        lsofCmd.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        lsofCmd.on('close', () => {
          const lines = output.trim().split('\n');
          if (lines.length > 1) {
            const processLine = lines[1];
            const parts = processLine.split(/\s+/);
            resolve({
              port,
              command: parts[0],
              pid: parseInt(parts[1]),
              user: parts[2],
              type: parts[4],
              node: parts[8]
            });
          } else {
            resolve(null);
          }
        });
        
        lsofCmd.on('error', () => {
          reject(new Error('lsof command not available'));
        });
      }
    });
  }
  
  /**
   * Check multiple ports and return their status
   */
  async checkMultiplePorts(ports) {
    const results = [];
    
    for (const port of ports) {
      try {
        const isAvailable = await this.isPortAvailable(port);
        const processInfo = isAvailable ? null : await this.getProcessOnPort(port);
        
        results.push({
          port,
          available: isAvailable,
          process: processInfo
        });
      } catch (error) {
        results.push({
          port,
          available: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Find next available port in sequence
   */
  async findPortSequence(startPort, count = 1) {
    const ports = [];
    let currentPort = startPort;
    
    while (ports.length < count) {
      try {
        const result = await this.findAvailablePort(currentPort, { reservePort: false });
        ports.push(result.port);
        currentPort = result.port + 1;
      } catch (error) {
        throw new Error(`Could not find ${count} sequential ports starting from ${startPort}`);
      }
    }
    
    return ports;
  }
  
  /**
   * Reserve a range of ports
   */
  async reservePortRange(startPort, count) {
    const ports = await this.findPortSequence(startPort, count);
    ports.forEach(port => this.reservePort(port));
    return ports;
  }
  
  /**
   * Clean up all reserved ports
   */
  cleanup() {
    this.reservedPorts.clear();
    this.processPortMap.clear();
  }
  
  /**
   * Get recommended ports for different services
   */
  getRecommendedPorts() {
    return {
      dashboard: 3000,
      api: 3001,
      websocket: 3002,
      health: 3003,
      metrics: 3004,
      debug: 9229
    };
  }
  
  /**
   * Auto-assign ports for services with conflict resolution
   */
  async autoAssignPorts(services = []) {
    const recommended = this.getRecommendedPorts();
    const assignments = {};
    
    for (const service of services) {
      const preferredPort = recommended[service] || 3000;
      
      try {
        const result = await this.findAvailablePort(preferredPort);
        assignments[service] = result.port;
        
        if (!result.isPreferred) {
          console.warn(`Service '${service}' assigned to port ${result.port} (preferred ${preferredPort} unavailable)`);
        }
      } catch (error) {
        throw new Error(`Failed to assign port for service '${service}': ${error.message}`);
      }
    }
    
    return assignments;
  }
}

// Singleton instance for global use
const portManager = new PortManager();

module.exports = {
  PortManager,
  portManager
};