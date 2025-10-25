#!/usr/bin/env node

/**
 * Setup Validation Script
 * Validates all system requirements, API credentials, and configuration files
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class SetupValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = 0;
    this.passed = 0;
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  check(description, validationFn) {
    this.checks++;
    this.log(`\n📋 Checking: ${description}`);
    
    try {
      const result = validationFn();
      if (result === true || (result && result.success)) {
        this.passed++;
        this.log(`✅ PASS: ${description}`, 'success');
        return true;
      } else {
        const message = result?.message || 'Check failed';
        this.errors.push(`${description}: ${message}`);
        this.log(`❌ FAIL: ${description} - ${message}`, 'error');
        return false;
      }
    } catch (error) {
      this.errors.push(`${description}: ${error.message}`);
      this.log(`❌ FAIL: ${description} - ${error.message}`, 'error');
      return false;
    }
  }

  async asyncCheck(description, validationFn) {
    this.checks++;
    this.log(`\n📋 Checking: ${description}`);
    
    try {
      const result = await validationFn();
      if (result === true || (result && result.success)) {
        this.passed++;
        this.log(`✅ PASS: ${description}`, 'success');
        return true;
      } else {
        const message = result?.message || 'Check failed';
        this.errors.push(`${description}: ${message}`);
        this.log(`❌ FAIL: ${description} - ${message}`, 'error');
        return false;
      }
    } catch (error) {
      this.errors.push(`${description}: ${error.message}`);
      this.log(`❌ FAIL: ${description} - ${error.message}`, 'error');
      return false;
    }
  }

  warn(message) {
    this.warnings.push(message);
    this.log(`⚠️  WARNING: ${message}`, 'warning');
  }

  // Environment Variables Validation
  validateEnvironmentVariables() {
    const requiredVars = [
      'AIRTABLE_BASE_ID',
      'AIRTABLE_API_KEY',
      'OPENAI_API_KEY',
      'RAPIDAPI_KEY',
      'APIFY_TOKEN',
      'GMAIL_ADDRESS'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        success: false,
        message: `Missing environment variables: ${missingVars.join(', ')}`
      };
    }

    // Validate format of certain variables
    if (process.env.AIRTABLE_BASE_ID && !process.env.AIRTABLE_BASE_ID.startsWith('app')) {
      return {
        success: false,
        message: 'AIRTABLE_BASE_ID should start with "app"'
      };
    }

    if (process.env.AIRTABLE_API_KEY && !process.env.AIRTABLE_API_KEY.startsWith('key')) {
      return {
        success: false,
        message: 'AIRTABLE_API_KEY should start with "key"'
      };
    }

    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
      return {
        success: false,
        message: 'OPENAI_API_KEY should start with "sk-"'
      };
    }

    if (process.env.APIFY_TOKEN && !process.env.APIFY_TOKEN.startsWith('apify_api_')) {
      return {
        success: false,
        message: 'APIFY_TOKEN should start with "apify_api_"'
      };
    }

    return { success: true };
  }

  // Configuration Files Validation
  validateConfigurationFiles() {
    const configFiles = [
      'config/airtable-schema.json',
      'config/platforms.json',
      '.env.example'
    ];

    for (const filePath of configFiles) {
      if (!fs.existsSync(path.join(__dirname, '..', filePath))) {
        return {
          success: false,
          message: `Missing configuration file: ${filePath}`
        };
      }
    }

    // Validate JSON files can be parsed
    try {
      const airtableSchema = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../config/airtable-schema.json'), 'utf8')
      );
      
      const platformsConfig = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../config/platforms.json'), 'utf8')
      );

      // Basic structure validation
      if (!airtableSchema.tables || !airtableSchema.base_name) {
        return {
          success: false,
          message: 'Invalid AirTable schema structure'
        };
      }

      if (!platformsConfig.instagram || !platformsConfig.linkedin || !platformsConfig.tiktok) {
        return {
          success: false,
          message: 'Invalid platforms configuration structure'
        };
      }

    } catch (error) {
      return {
        success: false,
        message: `Error parsing configuration files: ${error.message}`
      };
    }

    return { success: true };
  }

  // Workflow Files Validation
  validateWorkflowFiles() {
    const workflowFiles = [
      'workflows/n8n/viral-content-research.json',
      'workflows/n8n/content-generation-pipeline.json'
    ];

    for (const filePath of workflowFiles) {
      const fullPath = path.join(__dirname, '..', filePath);
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          message: `Missing workflow file: ${filePath}`
        };
      }

      try {
        const workflow = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        
        if (!workflow.name || !workflow.nodes || !workflow.connections) {
          return {
            success: false,
            message: `Invalid workflow structure in ${filePath}`
          };
        }

        if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
          return {
            success: false,
            message: `No nodes found in workflow ${filePath}`
          };
        }

      } catch (error) {
        return {
          success: false,
          message: `Error parsing workflow file ${filePath}: ${error.message}`
        };
      }
    }

    return { success: true };
  }

  // Prompt Files Validation
  validatePromptFiles() {
    const promptFiles = [
      'prompts/instagram-analysis.md',
      'prompts/linkedin-analysis.md',
      'prompts/tiktok-analysis.md',
      'prompts/content-generation.md'
    ];

    for (const filePath of promptFiles) {
      const fullPath = path.join(__dirname, '..', filePath);
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          message: `Missing prompt file: ${filePath}`
        };
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for essential prompt elements
      if (!content.includes('# ') || !content.includes('## ')) {
        return {
          success: false,
          message: `Invalid prompt structure in ${filePath}`
        };
      }

      if (filePath.includes('analysis') && !content.includes('JSON')) {
        this.warn(`Analysis prompt ${filePath} may be missing JSON output format`);
      }
    }

    return { success: true };
  }

  // Documentation Validation
  validateDocumentation() {
    const docFiles = [
      'README.md',
      'docs/SETUP_GUIDE.md',
      'docs/FRAMEWORK_LIBRARY.md'
    ];

    for (const filePath of docFiles) {
      const fullPath = path.join(__dirname, '..', filePath);
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          message: `Missing documentation file: ${filePath}`
        };
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.length < 100) {
        return {
          success: false,
          message: `Documentation file ${filePath} appears to be empty or too short`
        };
      }
    }

    return { success: true };
  }

  // System Dependencies Validation
  validateSystemDependencies() {
    const { execSync } = require('child_process');

    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 16) {
        return {
          success: false,
          message: `Node.js version ${nodeVersion} is too old. Requires 16.0.0 or higher.`
        };
      }

      // Check npm
      execSync('npm --version', { stdio: 'ignore' });

      // Check git
      execSync('git --version', { stdio: 'ignore' });

    } catch (error) {
      return {
        success: false,
        message: `Missing system dependency: ${error.message}`
      };
    }

    return { success: true };
  }

  // API Credentials Validation
  async validateOpenAICredentials() {
    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const models = response.data.data;
      const hasGPT4 = models.some(model => model.id.includes('gpt-4'));
      
      if (!hasGPT4) {
        this.warn('GPT-4 model not available with this API key. Content analysis may be limited.');
      }

      return { success: true };
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid OpenAI API key'
        };
      }
      return {
        success: false,
        message: `OpenAI API error: ${error.message}`
      };
    }
  }

  async validateRapidAPICredentials() {
    try {
      // Test Instagram scraper
      const response = await axios.get(
        'https://instagram-scraper21.p.rapidapi.com/api/v1/posts',
        {
          params: { username: 'instagram' },
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'instagram-scraper21.p.rapidapi.com'
          },
          timeout: 10000
        }
      );

      return { success: true };
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: false,
          message: 'Invalid RapidAPI key or insufficient permissions'
        };
      }
      return {
        success: false,
        message: `RapidAPI error: ${error.message}`
      };
    }
  }

  async validateApifyCredentials() {
    try {
      const response = await axios.get(
        'https://api.apify.com/v2/acts',
        {
          headers: {
            'Authorization': `Bearer ${process.env.APIFY_TOKEN}`
          },
          timeout: 10000
        }
      );

      return { success: true };
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid Apify token'
        };
      }
      return {
        success: false,
        message: `Apify API error: ${error.message}`
      };
    }
  }

  async validateAirTableCredentials() {
    try {
      const response = await axios.get(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/content_sources`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
          },
          timeout: 10000
        }
      );

      return { success: true };
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid AirTable API key'
        };
      }
      if (error.response?.status === 404) {
        return {
          success: false,
          message: 'AirTable base not found or table "content_sources" does not exist'
        };
      }
      return {
        success: false,
        message: `AirTable API error: ${error.message}`
      };
    }
  }

  // Main validation runner
  async runValidation() {
    this.log('🚀 Starting Viral Content Automation System Validation\n', 'info');

    // System requirements
    this.log('=== SYSTEM REQUIREMENTS ===', 'info');
    this.check('System dependencies (Node.js, npm, git)', () => this.validateSystemDependencies());

    // Configuration validation
    this.log('\n=== CONFIGURATION FILES ===', 'info');
    this.check('Environment variables', () => this.validateEnvironmentVariables());
    this.check('Configuration files', () => this.validateConfigurationFiles());
    this.check('Workflow files', () => this.validateWorkflowFiles());
    this.check('Prompt files', () => this.validatePromptFiles());
    this.check('Documentation files', () => this.validateDocumentation());

    // API credentials validation
    this.log('\n=== API CREDENTIALS ===', 'info');
    await this.asyncCheck('OpenAI API credentials', () => this.validateOpenAICredentials());
    await this.asyncCheck('RapidAPI credentials', () => this.validateRapidAPICredentials());
    await this.asyncCheck('Apify API credentials', () => this.validateApifyCredentials());
    await this.asyncCheck('AirTable API credentials', () => this.validateAirTableCredentials());

    // Results summary
    this.printSummary();
    
    return {
      success: this.errors.length === 0,
      passed: this.passed,
      total: this.checks,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  printSummary() {
    this.log('\n' + '='.repeat(50), 'info');
    this.log('📊 VALIDATION SUMMARY', 'info');
    this.log('='.repeat(50), 'info');
    
    this.log(`\n✅ Checks Passed: ${this.passed}/${this.checks}`, 'success');
    
    if (this.warnings.length > 0) {
      this.log(`⚠️  Warnings: ${this.warnings.length}`, 'warning');
      this.warnings.forEach(warning => {
        this.log(`   • ${warning}`, 'warning');
      });
    }
    
    if (this.errors.length > 0) {
      this.log(`❌ Errors: ${this.errors.length}`, 'error');
      this.errors.forEach(error => {
        this.log(`   • ${error}`, 'error');
      });
      this.log('\n🔧 Please fix the above errors before proceeding with system deployment.', 'error');
    } else {
      this.log('\n🎉 All validation checks passed! Your system is ready for deployment.', 'success');
      this.log('\n📋 Next steps:', 'info');
      this.log('   1. Run: npm install', 'info');
      this.log('   2. Run: npm run test', 'info');
      this.log('   3. Deploy n8n workflows', 'info');
      this.log('   4. Configure AirTable automations', 'info');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SetupValidator();
  validator.runValidation()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed with error:', error);
      process.exit(1);
    });
}

module.exports = SetupValidator;