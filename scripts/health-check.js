#!/usr/bin/env node

/**
 * System Health Check Script
 * Monitors API health, workflow status, and system performance
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class HealthChecker {
  constructor() {
    this.healthData = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      apis: {},
      performance: {},
      warnings: [],
      errors: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${new Date().toLocaleTimeString()}] ${message}${colors.reset}`);
  }

  // API Health Checks
  async checkOpenAIHealth() {
    const startTime = Date.now();
    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        timeout: 10000
      });

      const responseTime = Date.now() - startTime;
      const models = response.data.data;
      const hasGPT4 = models.some(model => model.id.includes('gpt-4'));

      this.healthData.apis.openai = {
        status: 'healthy',
        responseTime,
        modelsAvailable: models.length,
        gpt4Available: hasGPT4,
        lastChecked: new Date().toISOString()
      };

      this.log(`✅ OpenAI API: Healthy (${responseTime}ms, ${models.length} models)`, 'success');
      
      if (!hasGPT4) {
        this.healthData.warnings.push('GPT-4 model not available');
        this.log(`⚠️  GPT-4 model not available`, 'warning');
      }

      return { healthy: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.healthData.apis.openai = {
        status: 'unhealthy',
        error: error.message,
        responseTime,
        lastChecked: new Date().toISOString()
      };

      this.healthData.errors.push(`OpenAI API: ${error.message}`);
      this.log(`❌ OpenAI API: ${error.message}`, 'error');
      return { healthy: false, error: error.message };
    }
  }

  async checkRapidAPIHealth() {
    const apis = [
      {
        name: 'Instagram Scraper',
        url: 'https://instagram-scraper21.p.rapidapi.com/api/v1/posts',
        params: { username: 'instagram' },
        host: 'instagram-scraper21.p.rapidapi.com'
      },
      {
        name: 'TikTok API',
        url: 'https://tiktok-api23.p.rapidapi.com/search',
        params: { keywords: 'test' },
        host: 'tiktok-api23.p.rapidapi.com'
      }
    ];

    const results = {};
    
    for (const api of apis) {
      const startTime = Date.now();
      try {
        const response = await axios.get(api.url, {
          params: api.params,
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': api.host
          },
          timeout: 15000
        });

        const responseTime = Date.now() - startTime;
        results[api.name.toLowerCase().replace(' ', '_')] = {
          status: 'healthy',
          responseTime,
          lastChecked: new Date().toISOString()
        };

        this.log(`✅ ${api.name}: Healthy (${responseTime}ms)`, 'success');
      } catch (error) {
        const responseTime = Date.now() - startTime;
        results[api.name.toLowerCase().replace(' ', '_')] = {
          status: 'unhealthy',
          error: error.message,
          responseTime,
          lastChecked: new Date().toISOString()
        };

        this.healthData.errors.push(`${api.name}: ${error.message}`);
        this.log(`❌ ${api.name}: ${error.message}`, 'error');
      }
    }

    this.healthData.apis.rapidapi = results;
    return results;
  }

  async checkApifyHealth() {
    const startTime = Date.now();
    try {
      const response = await axios.get('https://api.apify.com/v2/acts', {
        headers: {
          'Authorization': `Bearer ${process.env.APIFY_TOKEN}`
        },
        timeout: 10000
      });

      const responseTime = Date.now() - startTime;
      const actorCount = response.data.data?.items?.length || 0;

      this.healthData.apis.apify = {
        status: 'healthy',
        responseTime,
        actorsAvailable: actorCount,
        lastChecked: new Date().toISOString()
      };

      this.log(`✅ Apify API: Healthy (${responseTime}ms, ${actorCount} actors)`, 'success');
      return { healthy: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.healthData.apis.apify = {
        status: 'unhealthy',
        error: error.message,
        responseTime,
        lastChecked: new Date().toISOString()
      };

      this.healthData.errors.push(`Apify API: ${error.message}`);
      this.log(`❌ Apify API: ${error.message}`, 'error');
      return { healthy: false, error: error.message };
    }
  }

  async checkAirTableHealth() {
    const startTime = Date.now();
    try {
      const response = await axios.get(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/content_sources`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
          },
          params: { maxRecords: 1 },
          timeout: 10000
        }
      );

      const responseTime = Date.now() - startTime;
      const recordCount = response.data.records?.length || 0;

      this.healthData.apis.airtable = {
        status: 'healthy',
        responseTime,
        recordsAccessible: recordCount >= 0,
        lastChecked: new Date().toISOString()
      };

      this.log(`✅ AirTable API: Healthy (${responseTime}ms)`, 'success');
      return { healthy: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.healthData.apis.airtable = {
        status: 'unhealthy',
        error: error.message,
        responseTime,
        lastChecked: new Date().toISOString()
      };

      this.healthData.errors.push(`AirTable API: ${error.message}`);
      this.log(`❌ AirTable API: ${error.message}`, 'error');
      return { healthy: false, error: error.message };
    }
  }

  // Performance Monitoring
  async checkSystemPerformance() {
    const startTime = Date.now();
    
    // Memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    // Disk space
    let diskSpace = null;
    try {
      const { execSync } = require('child_process');
      const dfOutput = execSync('df -h .', { encoding: 'utf8' });
      const lines = dfOutput.split('\n');
      if (lines.length > 1) {
        const spaceInfo = lines[1].split(/\s+/);
        diskSpace = {
          total: spaceInfo[1],
          used: spaceInfo[2],
          available: spaceInfo[3],
          usedPercentage: spaceInfo[4]
        };
      }
    } catch (error) {
      this.log(`⚠️  Could not check disk space: ${error.message}`, 'warning');
    }

    // File system checks
    const criticalFiles = [
      'config/airtable-schema.json',
      'config/platforms.json',
      'workflows/n8n/viral-content-research.json',
      'workflows/n8n/content-generation-pipeline.json'
    ];

    const fileStatus = {};
    for (const file of criticalFiles) {
      const filePath = path.join(__dirname, '..', file);
      fileStatus[file] = {
        exists: fs.existsSync(filePath),
        size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
        lastModified: fs.existsSync(filePath) ? fs.statSync(filePath).mtime : null
      };
    }

    const performanceCheckTime = Date.now() - startTime;

    this.healthData.performance = {
      memory: memUsageMB,
      diskSpace,
      files: fileStatus,
      checkDuration: performanceCheckTime,
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime()
    };

    // Performance warnings
    if (memUsageMB.heapUsed > 512) {
      this.healthData.warnings.push(`High memory usage: ${memUsageMB.heapUsed}MB`);
      this.log(`⚠️  High memory usage: ${memUsageMB.heapUsed}MB`, 'warning');
    }

    if (diskSpace && parseInt(diskSpace.usedPercentage) > 80) {
      this.healthData.warnings.push(`High disk usage: ${diskSpace.usedPercentage}`);
      this.log(`⚠️  High disk usage: ${diskSpace.usedPercentage}`, 'warning');
    }

    this.log(`📊 System Performance: Memory ${memUsageMB.heapUsed}MB, Uptime ${Math.round(process.uptime())}s`, 'info');
  }

  // Rate Limit Monitoring
  async checkRateLimits() {
    const rateLimits = {
      openai: await this.checkOpenAIRateLimit(),
      rapidapi: await this.checkRapidAPIRateLimit(),
      apify: await this.checkApifyRateLimit()
    };

    this.healthData.rateLimits = rateLimits;
    return rateLimits;
  }

  async checkOpenAIRateLimit() {
    try {
      // Make a small request to check headers
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });

      return {
        status: 'ok',
        remainingRequests: response.headers['x-ratelimit-remaining-requests'],
        remainingTokens: response.headers['x-ratelimit-remaining-tokens'],
        resetTime: response.headers['x-ratelimit-reset-requests']
      };
    } catch (error) {
      if (error.response?.status === 429) {
        return {
          status: 'limited',
          retryAfter: error.response.headers['retry-after']
        };
      }
      return { status: 'error', error: error.message };
    }
  }

  async checkRapidAPIRateLimit() {
    // RapidAPI doesn't always provide rate limit headers, so we'll track usage
    return {
      status: 'unknown',
      note: 'RapidAPI rate limits vary by subscription and endpoint'
    };
  }

  async checkApifyRateLimit() {
    try {
      const response = await axios.get('https://api.apify.com/v2/acts', {
        headers: {
          'Authorization': `Bearer ${process.env.APIFY_TOKEN}`
        },
        params: { limit: 1 }
      });

      return {
        status: 'ok',
        note: 'Apify rate limits are based on subscription plan'
      };
    } catch (error) {
      if (error.response?.status === 429) {
        return {
          status: 'limited',
          retryAfter: error.response.headers['retry-after']
        };
      }
      return { status: 'error', error: error.message };
    }
  }

  // Workflow Status Check
  checkWorkflowStatus() {
    // This would integrate with n8n API if available
    // For now, we'll check file integrity
    const workflows = [
      'workflows/n8n/viral-content-research.json',
      'workflows/n8n/content-generation-pipeline.json'
    ];

    const workflowStatus = {};
    
    for (const workflow of workflows) {
      const filePath = path.join(__dirname, '..', workflow);
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        workflowStatus[workflow] = {
          status: 'valid',
          nodeCount: content.nodes?.length || 0,
          hasConnections: Object.keys(content.connections || {}).length > 0,
          lastModified: fs.statSync(filePath).mtime
        };
      } catch (error) {
        workflowStatus[workflow] = {
          status: 'invalid',
          error: error.message
        };
      }
    }

    this.healthData.workflows = workflowStatus;
    return workflowStatus;
  }

  // Generate Health Report
  async generateHealthReport() {
    this.log('🔍 Starting System Health Check...', 'info');

    // Run all health checks
    await Promise.all([
      this.checkOpenAIHealth(),
      this.checkRapidAPIHealth(),
      this.checkApifyHealth(),
      this.checkAirTableHealth()
    ]);

    await this.checkSystemPerformance();
    await this.checkRateLimits();
    this.checkWorkflowStatus();

    // Determine overall health status
    const hasErrors = this.healthData.errors.length > 0;
    const hasWarnings = this.healthData.warnings.length > 0;
    
    if (hasErrors) {
      this.healthData.status = 'unhealthy';
    } else if (hasWarnings) {
      this.healthData.status = 'degraded';
    } else {
      this.healthData.status = 'healthy';
    }

    return this.healthData;
  }

  // Save health report to file
  saveHealthReport() {
    const reportsDir = path.join(__dirname, '..', 'monitoring', 'reports');
    
    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportsDir, `health-report-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(this.healthData, null, 2));
    this.log(`📄 Health report saved to: ${reportPath}`, 'info');

    // Keep only last 10 reports
    const reports = fs.readdirSync(reportsDir)
      .filter(file => file.startsWith('health-report-'))
      .sort()
      .reverse();

    if (reports.length > 10) {
      const oldReports = reports.slice(10);
      oldReports.forEach(report => {
        fs.unlinkSync(path.join(reportsDir, report));
      });
    }
  }

  // Print summary
  printSummary() {
    this.log('\n' + '='.repeat(50), 'info');
    this.log('🏥 HEALTH CHECK SUMMARY', 'info');
    this.log('='.repeat(50), 'info');

    // Overall status
    const statusEmoji = {
      healthy: '🟢',
      degraded: '🟡',
      unhealthy: '🔴'
    };

    this.log(`\n${statusEmoji[this.healthData.status]} Overall Status: ${this.healthData.status.toUpperCase()}`, 
             this.healthData.status === 'healthy' ? 'success' : 
             this.healthData.status === 'degraded' ? 'warning' : 'error');

    // API Status
    this.log('\n📡 API Status:', 'info');
    Object.entries(this.healthData.apis).forEach(([service, data]) => {
      const status = data.status === 'healthy' ? '✅' : '❌';
      const responseTime = data.responseTime ? ` (${data.responseTime}ms)` : '';
      this.log(`   ${status} ${service.toUpperCase()}${responseTime}`, 
               data.status === 'healthy' ? 'success' : 'error');
    });

    // Performance
    if (this.healthData.performance) {
      this.log('\n📊 Performance:', 'info');
      this.log(`   Memory: ${this.healthData.performance.memory.heapUsed}MB`, 'info');
      this.log(`   Uptime: ${Math.round(this.healthData.performance.uptime)}s`, 'info');
    }

    // Warnings and Errors
    if (this.healthData.warnings.length > 0) {
      this.log('\n⚠️  Warnings:', 'warning');
      this.healthData.warnings.forEach(warning => {
        this.log(`   • ${warning}`, 'warning');
      });
    }

    if (this.healthData.errors.length > 0) {
      this.log('\n❌ Errors:', 'error');
      this.healthData.errors.forEach(error => {
        this.log(`   • ${error}`, 'error');
      });
    }

    if (this.healthData.status === 'healthy') {
      this.log('\n🎉 All systems operational!', 'success');
    }
  }

  // Main execution
  async run() {
    try {
      await this.generateHealthReport();
      this.saveHealthReport();
      this.printSummary();
      
      return {
        success: this.healthData.status !== 'unhealthy',
        status: this.healthData.status,
        data: this.healthData
      };
    } catch (error) {
      this.log(`❌ Health check failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run health check if called directly
if (require.main === module) {
  const checker = new HealthChecker();
  checker.run()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}

module.exports = HealthChecker;