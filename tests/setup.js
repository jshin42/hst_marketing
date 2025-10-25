/**
 * Test Setup Configuration
 * Sets up global test environment, mocks, and configurations
 */

require('dotenv').config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(30000);

// Mock console.log in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Keep error logs for debugging
};

// Test environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
process.env.RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'test-rapidapi-key';
process.env.APIFY_TOKEN = process.env.APIFY_TOKEN || 'test-apify-token';
process.env.AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'test-airtable-key';
process.env.AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'test-base-id';

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to generate test data
  generateTestData: (type) => {
    const testData = {
      instagram_post: {
        code: 'test-post-123',
        like_count: 1500,
        caption: 'Test Instagram caption with #hashtags',
        product_type: 'clips',
        created_at_human_readable: new Date().toISOString()
      },
      linkedin_post: {
        id: 'test-linkedin-123',
        text: 'Test LinkedIn post content with professional insights',
        author: { name: 'Test Author', headline: 'Marketing Expert' },
        stats: { total_reactions: 150, comments: 25, shares: 10 },
        content: { type: 'text_post' }
      },
      tiktok_video: {
        id: 'test-tiktok-123',
        desc: 'Test TikTok description',
        playCount: 50000,
        authorMeta: { name: 'testuser' },
        musicMeta: { musicName: 'original sound' }
      }
    };
    return testData[type] || {};
  },
  
  // Helper to mock API responses
  mockApiResponse: (data, status = 200) => ({
    status,
    data,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(data)
  }),
  
  // Helper to validate configuration objects
  validateConfig: (config, requiredFields) => {
    for (const field of requiredFields) {
      if (!(field in config)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    return true;
  }
};

// Test cleanup
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = {};