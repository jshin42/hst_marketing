/**
 * Browser Automation Utilities
 * Handles browser opening, GUI management, and web interface automation
 */

const open = require('open');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const os = require('os');

class BrowserAutomation {
  constructor() {
    this.openBrowsers = new Set();
    this.preferredBrowser = null;
    this.defaultUrls = {
      dashboard: 'http://localhost:3000',
      docs: 'http://localhost:3000/docs',
      api: 'http://localhost:3000/api',
      health: 'http://localhost:3000/api/health'
    };
  }
  
  /**
   * Detect available browsers on the system
   */
  async detectAvailableBrowsers() {
    const browsers = [];
    const platform = os.platform();
    
    try {
      if (platform === 'darwin') {
        // macOS browser detection
        const macBrowsers = [
          { name: 'Chrome', path: '/Applications/Google Chrome.app', command: 'google chrome' },
          { name: 'Firefox', path: '/Applications/Firefox.app', command: 'firefox' },
          { name: 'Safari', path: '/Applications/Safari.app', command: 'safari' },
          { name: 'Edge', path: '/Applications/Microsoft Edge.app', command: 'microsoft edge' }
        ];
        
        for (const browser of macBrowsers) {
          try {
            await fs.access(browser.path);
            browsers.push(browser);
          } catch (error) {
            // Browser not installed
          }
        }
      } else if (platform === 'win32') {
        // Windows browser detection
        const winBrowsers = [
          { name: 'Chrome', command: 'chrome' },
          { name: 'Firefox', command: 'firefox' },
          { name: 'Edge', command: 'msedge' },
          { name: 'Internet Explorer', command: 'iexplore' }
        ];
        
        for (const browser of winBrowsers) {
          try {
            // Try to detect if browser is available via PATH
            await new Promise((resolve, reject) => {
              const process = spawn('where', [browser.command], { stdio: 'pipe' });
              process.on('close', (code) => {
                if (code === 0) resolve();
                else reject();
              });
            });
            browsers.push(browser);
          } catch (error) {
            // Browser not available
          }
        }
      } else {
        // Linux browser detection
        const linuxBrowsers = [
          { name: 'Chrome', command: 'google-chrome' },
          { name: 'Chromium', command: 'chromium-browser' },
          { name: 'Firefox', command: 'firefox' },
          { name: 'Opera', command: 'opera' }
        ];
        
        for (const browser of linuxBrowsers) {
          try {
            await new Promise((resolve, reject) => {
              const process = spawn('which', [browser.command], { stdio: 'pipe' });
              process.on('close', (code) => {
                if (code === 0) resolve();
                else reject();
              });
            });
            browsers.push(browser);
          } catch (error) {
            // Browser not available
          }
        }
      }
    } catch (error) {
      console.warn('Browser detection failed:', error.message);
    }
    
    return browsers;
  }
  
  /**
   * Open a URL in the browser with options
   */
  async openUrl(url, options = {}) {
    const {
      browser = this.preferredBrowser,
      newWindow = false,
      incognito = false,
      fullscreen = false,
      wait = true,
      retries = 3
    } = options;
    
    const openOptions = {
      wait,
      newInstance: newWindow
    };
    
    // Add browser-specific options
    if (browser) {
      openOptions.app = { name: browser };
    }
    
    // Add special flags for different browsers
    if (incognito) {
      if (browser && browser.toLowerCase().includes('chrome')) {
        openOptions.app.arguments = ['--incognito'];
      } else if (browser && browser.toLowerCase().includes('firefox')) {
        openOptions.app.arguments = ['-private-window'];
      }
    }
    
    if (fullscreen) {
      openOptions.app = openOptions.app || {};
      openOptions.app.arguments = openOptions.app.arguments || [];
      openOptions.app.arguments.push('--start-fullscreen');
    }
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const subprocess = await open(url, openOptions);
        this.openBrowsers.add(subprocess);
        
        return {
          success: true,
          url,
          browser: browser || 'default',
          process: subprocess
        };
      } catch (error) {
        if (attempt === retries) {
          throw new Error(`Failed to open browser after ${retries} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  /**
   * Open the main dashboard
   */
  async openDashboard(port = 3000, options = {}) {
    const url = `http://localhost:${port}`;
    
    // Wait for service to be ready
    if (options.waitForReady !== false) {
      await this.waitForService(url, 30000);
    }
    
    return this.openUrl(url, {
      ...options,
      newWindow: true
    });
  }
  
  /**
   * Wait for a service to be ready by polling
   */
  async waitForService(url, timeoutMs = 30000) {
    const startTime = Date.now();
    const pollInterval = 1000;
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Service not ready yet, continue polling
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Service at ${url} did not become ready within ${timeoutMs}ms`);
  }
  
  /**
   * Create and open a temporary HTML file
   */
  async openTemporaryPage(htmlContent, options = {}) {
    const { 
      filename = 'temp-page.html',
      autoDelete = true,
      deleteAfter = 30000 // 30 seconds
    } = options;
    
    const tempPath = path.join(os.tmpdir(), filename);
    
    try {
      await fs.writeFile(tempPath, htmlContent);
      const result = await this.openUrl(`file://${tempPath}`, options);
      
      // Auto-delete after specified time
      if (autoDelete) {
        setTimeout(async () => {
          try {
            await fs.unlink(tempPath);
          } catch (error) {
            // File may already be deleted
          }
        }, deleteAfter);
      }
      
      return { ...result, tempPath };
    } catch (error) {
      throw new Error(`Failed to create temporary page: ${error.message}`);
    }
  }
  
  /**
   * Create a status page with real-time updates
   */
  async createStatusPage(config = {}) {
    const {
      title = 'Viral Content Automation - Status',
      refreshInterval = 5000,
      services = []
    } = config;
    
    const statusHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; padding: 2rem; color: white;
        }
        .container {
            max-width: 1200px; margin: 0 auto;
            background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
            border-radius: 20px; padding: 2rem;
        }
        h1 { text-align: center; margin-bottom: 2rem; font-size: 2.5rem; }
        .services { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
        .service {
            background: rgba(255,255,255,0.1); border-radius: 10px; padding: 1.5rem;
            border-left: 4px solid #27ae60; transition: all 0.3s;
        }
        .service.error { border-left-color: #e74c3c; }
        .service.warning { border-left-color: #f39c12; }
        .service-name { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
        .service-status { margin-bottom: 1rem; }
        .status-indicator {
            display: inline-block; width: 12px; height: 12px; border-radius: 50%;
            margin-right: 0.5rem; background: #27ae60;
        }
        .status-indicator.error { background: #e74c3c; }
        .status-indicator.warning { background: #f39c12; }
        .service-url { 
            color: rgba(255,255,255,0.8); font-size: 0.9rem; 
            text-decoration: none; border-bottom: 1px dotted;
        }
        .service-url:hover { color: white; }
        .last-updated { 
            text-align: center; margin-top: 2rem; 
            color: rgba(255,255,255,0.7); font-size: 0.9rem;
        }
        .controls {
            text-align: center; margin-bottom: 2rem;
        }
        .btn {
            background: rgba(255,255,255,0.2); color: white; border: none;
            padding: 0.75rem 1.5rem; border-radius: 8px; margin: 0 0.5rem;
            cursor: pointer; text-decoration: none; display: inline-block;
        }
        .btn:hover { background: rgba(255,255,255,0.3); }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 ${title}</h1>
        
        <div class="controls">
            <a href="http://localhost:3000" class="btn">📊 Dashboard</a>
            <a href="http://localhost:3000/api/health" class="btn">💓 Health Check</a>
            <button onclick="refreshStatus()" class="btn">🔄 Refresh</button>
        </div>
        
        <div class="services" id="services">
            <!-- Services will be populated by JavaScript -->
        </div>
        
        <div class="last-updated" id="lastUpdated">
            Loading...
        </div>
    </div>
    
    <script>
        const services = ${JSON.stringify(services)};
        
        async function checkServiceStatus(service) {
            try {
                const response = await fetch(service.url, { 
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: AbortSignal.timeout(5000)
                });
                return { ...service, status: 'online', error: null };
            } catch (error) {
                return { ...service, status: 'offline', error: error.message };
            }
        }
        
        async function refreshStatus() {
            const servicesContainer = document.getElementById('services');
            servicesContainer.innerHTML = '<div style="text-align: center; grid-column: 1/-1;">Checking services...</div>';
            
            const statusPromises = services.map(checkServiceStatus);
            const statuses = await Promise.all(statusPromises);
            
            servicesContainer.innerHTML = statuses.map(service => \`
                <div class="service \${service.status === 'offline' ? 'error' : ''}">
                    <div class="service-name">\${service.name}</div>
                    <div class="service-status">
                        <span class="status-indicator \${service.status === 'offline' ? 'error' : ''}"></span>
                        \${service.status === 'online' ? 'Online' : 'Offline'}
                        \${service.error ? \` - \${service.error}\` : ''}
                    </div>
                    <a href="\${service.url}" class="service-url" target="_blank">\${service.url}</a>
                </div>
            \`).join('');
            
            document.getElementById('lastUpdated').textContent = 
                \`Last updated: \${new Date().toLocaleTimeString()}\`;
        }
        
        // Initial load
        refreshStatus();
        
        // Auto-refresh every ${refreshInterval}ms
        setInterval(refreshStatus, ${refreshInterval});
    </script>
</body>
</html>`;
    
    return this.openTemporaryPage(statusHTML, {
      filename: 'viral-content-status.html',
      autoDelete: false
    });
  }
  
  /**
   * Close all opened browsers
   */
  async closeAllBrowsers() {
    const closePromises = Array.from(this.openBrowsers).map(async (browserProcess) => {
      try {
        if (browserProcess && typeof browserProcess.kill === 'function') {
          browserProcess.kill();
        }
      } catch (error) {
        // Browser might already be closed
      }
    });
    
    await Promise.all(closePromises);
    this.openBrowsers.clear();
  }
  
  /**
   * Set preferred browser
   */
  setPreferredBrowser(browserName) {
    this.preferredBrowser = browserName;
  }
  
  /**
   * Get preferred browser
   */
  getPreferredBrowser() {
    return this.preferredBrowser;
  }
  
  /**
   * Open multiple URLs in tabs/windows
   */
  async openMultipleUrls(urls, options = {}) {
    const { 
      delay = 1000,
      sameWindow = true 
    } = options;
    
    const results = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      try {
        const result = await this.openUrl(url, {
          ...options,
          newWindow: i === 0 || !sameWindow
        });
        results.push(result);
        
        // Delay between opens to prevent overwhelming the system
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        results.push({
          success: false,
          url,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Check if URL is accessible
   */
  async isUrlAccessible(url, timeoutMs = 5000) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(timeoutMs)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.closeAllBrowsers();
  }
}

// Singleton instance for global use
const browserAutomation = new BrowserAutomation();

module.exports = {
  BrowserAutomation,
  browserAutomation
};