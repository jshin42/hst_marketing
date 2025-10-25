/**
 * Configuration Validation Unit Tests
 * Tests all configuration files for structure, required fields, and data types
 */

const fs = require('fs');
const path = require('path');
const Joi = require('joi');

describe('Configuration Validation', () => {
  
  describe('AirTable Schema Configuration', () => {
    let airtableSchema;
    
    beforeAll(() => {
      const schemaPath = path.join(__dirname, '../../config/airtable-schema.json');
      airtableSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    });
    
    test('should have valid AirTable schema structure', () => {
      expect(airtableSchema).toHaveProperty('base_name');
      expect(airtableSchema).toHaveProperty('tables');
      expect(airtableSchema).toHaveProperty('automations');
      expect(airtableSchema).toHaveProperty('views');
    });
    
    test('should have all required tables', () => {
      const requiredTables = ['content_sources', 'viral_content_analysis', 'generated_content_pipeline'];
      requiredTables.forEach(table => {
        expect(airtableSchema.tables).toHaveProperty(table);
      });
    });
    
    test('should have valid field definitions for content_sources table', () => {
      const contentSourcesFields = airtableSchema.tables.content_sources.fields;
      const requiredFields = ['Keyword or User', 'Platform', 'Status', 'Min Engagement Threshold'];
      
      requiredFields.forEach(fieldName => {
        const field = contentSourcesFields.find(f => f.name === fieldName);
        expect(field).toBeDefined();
        expect(field).toHaveProperty('type');
      });
    });
    
    test('should have valid field definitions for viral_content_analysis table', () => {
      const analysisFields = airtableSchema.tables.viral_content_analysis.fields;
      const requiredFields = ['Post ID', 'Platform', 'Viral Score', 'Framework 1', 'Framework 2', 'Framework 3'];
      
      requiredFields.forEach(fieldName => {
        const field = analysisFields.find(f => f.name === fieldName);
        expect(field).toBeDefined();
        expect(field).toHaveProperty('type');
      });
    });
    
    test('should have valid automation configurations', () => {
      expect(Array.isArray(airtableSchema.automations)).toBeTruthy();
      airtableSchema.automations.forEach(automation => {
        expect(automation).toHaveProperty('name');
        expect(automation).toHaveProperty('trigger');
        expect(automation).toHaveProperty('action');
      });
    });
  });
  
  describe('Platforms Configuration', () => {
    let platformsConfig;
    
    beforeAll(() => {
      const configPath = path.join(__dirname, '../../config/platforms.json');
      platformsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    });
    
    test('should have valid platform configurations', () => {
      const requiredPlatforms = ['instagram', 'linkedin', 'tiktok'];
      requiredPlatforms.forEach(platform => {
        expect(platformsConfig).toHaveProperty(platform);
      });
    });
    
    test('should have valid Instagram configuration', () => {
      const instagram = platformsConfig.instagram;
      expect(instagram).toHaveProperty('api');
      expect(instagram.api).toHaveProperty('base_url');
      expect(instagram.api).toHaveProperty('endpoints');
      expect(instagram).toHaveProperty('content_types');
      expect(instagram).toHaveProperty('engagement_thresholds');
    });
    
    test('should have valid LinkedIn configuration', () => {
      const linkedin = platformsConfig.linkedin;
      expect(linkedin).toHaveProperty('api');
      expect(linkedin.api).toHaveProperty('actor_id');
      expect(linkedin).toHaveProperty('search_parameters');
      expect(linkedin).toHaveProperty('engagement_thresholds');
    });
    
    test('should have valid TikTok configuration', () => {
      const tiktok = platformsConfig.tiktok;
      expect(tiktok).toHaveProperty('api');
      expect(tiktok.api).toHaveProperty('base_url');
      expect(tiktok).toHaveProperty('audio_processing');
      expect(tiktok).toHaveProperty('engagement_thresholds');
    });
    
    test('should have valid AI services configuration', () => {
      const aiServices = platformsConfig.ai_services;
      expect(aiServices).toHaveProperty('openai');
      expect(aiServices.openai).toHaveProperty('models');
      expect(aiServices.openai.models).toHaveProperty('analysis');
      expect(aiServices.openai.models).toHaveProperty('generation');
      expect(aiServices.openai.models).toHaveProperty('whisper');
    });
    
    test('should have valid content frameworks', () => {
      const frameworks = platformsConfig.content_frameworks;
      expect(frameworks).toHaveProperty('universal');
      expect(frameworks).toHaveProperty('instagram_specific');
      expect(frameworks).toHaveProperty('linkedin_specific');
      expect(frameworks).toHaveProperty('tiktok_specific');
      
      // Validate framework arrays
      Object.values(frameworks).forEach(frameworkArray => {
        expect(Array.isArray(frameworkArray)).toBeTruthy();
        expect(frameworkArray.length).toBeGreaterThan(0);
      });
    });
    
    test('should have valid rate limits', () => {
      const platforms = ['instagram', 'linkedin', 'tiktok'];
      platforms.forEach(platform => {
        const config = platformsConfig[platform];
        if (config.api && config.api.rate_limits) {
          expect(typeof config.api.rate_limits).toBe('object');
        }
      });
    });
  });
  
  describe('Environment Configuration', () => {
    test('should validate .env.example structure', () => {
      const envPath = path.join(__dirname, '../../.env.example');
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Check for required environment variables
      const requiredEnvVars = [
        'AIRTABLE_BASE_ID',
        'AIRTABLE_API_KEY',
        'OPENAI_API_KEY',
        'RAPIDAPI_KEY',
        'APIFY_TOKEN',
        'GMAIL_ADDRESS'
      ];
      
      requiredEnvVars.forEach(envVar => {
        expect(envContent).toContain(envVar);
      });
    });
  });
  
  describe('Prompt Templates Validation', () => {
    const promptFiles = [
      'instagram-analysis.md',
      'linkedin-analysis.md', 
      'tiktok-analysis.md',
      'content-generation.md'
    ];
    
    promptFiles.forEach(filename => {
      test(`should validate ${filename} structure`, () => {
        const promptPath = path.join(__dirname, '../../prompts/', filename);
        const promptContent = fs.readFileSync(promptPath, 'utf8');
        
        // Check for required sections
        expect(promptContent).toContain('# ');  // Has main heading
        expect(promptContent).toContain('## '); // Has subheadings
        expect(promptContent).toContain('```'); // Has code blocks
        
        // Platform-specific checks
        if (filename.includes('instagram')) {
          expect(promptContent).toContain('Instagram');
          expect(promptContent).toContain('viral_score');
        }
        
        if (filename.includes('linkedin')) {
          expect(promptContent).toContain('LinkedIn');
          expect(promptContent).toContain('linkedin_score');
          expect(promptContent).toContain('professional');
        }
        
        if (filename.includes('tiktok')) {
          expect(promptContent).toContain('TikTok');
          expect(promptContent).toContain('tiktok_score');
          expect(promptContent).toContain('viral');
        }
        
        if (filename.includes('generation')) {
          expect(promptContent).toContain('original');
          expect(promptContent).toContain('framework');
        }
      });
    });
  });
  
  describe('Workflow Configuration Validation', () => {
    const workflowFiles = [
      'viral-content-research.json',
      'content-generation-pipeline.json'
    ];
    
    workflowFiles.forEach(filename => {
      test(`should validate ${filename} structure`, () => {
        const workflowPath = path.join(__dirname, '../../workflows/n8n/', filename);
        const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
        
        // Check basic n8n workflow structure
        expect(workflow).toHaveProperty('name');
        expect(workflow).toHaveProperty('nodes');
        expect(workflow).toHaveProperty('connections');
        expect(Array.isArray(workflow.nodes)).toBeTruthy();
        expect(workflow.nodes.length).toBeGreaterThan(0);
        
        // Validate node structure
        workflow.nodes.forEach(node => {
          expect(node).toHaveProperty('id');
          expect(node).toHaveProperty('name');
          expect(node).toHaveProperty('type');
          expect(node).toHaveProperty('position');
        });
      });
    });
  });
  
  describe('Configuration Cross-Validation', () => {
    test('should have consistent platform names across configurations', () => {
      const platformsPath = path.join(__dirname, '../../config/platforms.json');
      const airtablePath = path.join(__dirname, '../../config/airtable-schema.json');
      
      const platformsConfig = JSON.parse(fs.readFileSync(platformsPath, 'utf8'));
      const airtableSchema = JSON.parse(fs.readFileSync(airtablePath, 'utf8'));
      
      // Get platform names from both configs
      const platformNames = Object.keys(platformsConfig).filter(key => 
        ['instagram', 'linkedin', 'tiktok'].includes(key)
      );
      
      // Check if AirTable schema references these platforms
      const platformField = airtableSchema.tables.content_sources.fields
        .find(field => field.name === 'Platform');
      
      expect(platformField).toBeDefined();
      expect(platformField.options).toBeDefined();
      
      platformNames.forEach(platform => {
        const capitalizedPlatform = platform.charAt(0).toUpperCase() + platform.slice(1);
        expect(platformField.options.some(option => 
          option.toLowerCase() === capitalizedPlatform.toLowerCase()
        )).toBeTruthy();
      });
    });
    
    test('should have consistent framework references', () => {
      const platformsPath = path.join(__dirname, '../../config/platforms.json');
      const platformsConfig = JSON.parse(fs.readFileSync(platformsPath, 'utf8'));
      
      const frameworks = platformsConfig.content_frameworks;
      
      // Validate that frameworks exist and are non-empty
      Object.entries(frameworks).forEach(([category, frameworkList]) => {
        expect(Array.isArray(frameworkList)).toBeTruthy();
        expect(frameworkList.length).toBeGreaterThan(0);
        
        frameworkList.forEach(framework => {
          expect(typeof framework).toBe('string');
          expect(framework.length).toBeGreaterThan(0);
        });
      });
    });
  });
});