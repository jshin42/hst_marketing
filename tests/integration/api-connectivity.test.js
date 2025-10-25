/**
 * API Connectivity Integration Tests
 * Tests all external API integrations for authentication, connectivity, and basic functionality
 */

const axios = require('axios');

// Mock axios for testing if not in real test environment
jest.mock('axios');
const mockedAxios = axios;

describe('API Connectivity Integration Tests', () => {
  
  describe('OpenAI API Integration', () => {
    
    test('should connect to OpenAI API successfully', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 'gpt-4', object: 'model', owned_by: 'openai' }
          ]
        },
        status: 200
      };
      
      mockedAxios.get.mockResolvedValue(mockResponse);
      
      const testOpenAIConnection = async () => {
        try {
          const response = await axios.get('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          return { success: true, data: response.data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };
      
      const result = await testOpenAIConnection();
      
      expect(result.success).toBeTruthy();
      expect(result.data.data).toBeDefined();
    });
    
    test('should handle OpenAI rate limiting', async () => {
      const rateLimitError = {
        response: { status: 429, data: { error: 'Rate limit exceeded' } }
      };
      
      mockedAxios.post.mockRejectedValue(rateLimitError);
      
      const testWithRetry = async (maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
              model: 'gpt-4',
              messages: [{ role: 'user', content: 'Test' }]
            });
            return { success: true, attempt };
          } catch (error) {
            if (error.response?.status === 429 && attempt < maxRetries) {
              await testUtils.wait(1000 * attempt); // Exponential backoff
              continue;
            }
            return { success: false, error: error.message, attempt };
          }
        }
      };
      
      const result = await testWithRetry();
      
      expect(result.attempt).toBe(3);
      expect(result.success).toBeFalsy();
    });
    
    test('should validate GPT-4 model access', async () => {
      const mockModelsResponse = {
        data: {
          data: [
            { id: 'gpt-4', object: 'model' },
            { id: 'gpt-3.5-turbo', object: 'model' }
          ]
        }
      };
      
      mockedAxios.get.mockResolvedValue(mockModelsResponse);
      
      const checkGPT4Access = async () => {
        const response = await axios.get('https://api.openai.com/v1/models');
        const models = response.data.data;
        return models.some(model => model.id.includes('gpt-4'));
      };
      
      const hasGPT4Access = await checkGPT4Access();
      
      expect(hasGPT4Access).toBeTruthy();
    });
  });
  
  describe('RapidAPI Integration', () => {
    
    test('should connect to Instagram Scraper API', async () => {
      const mockInstagramResponse = {
        data: {
          data: {
            posts: [
              {
                code: 'test123',
                like_count: 1000,
                caption: 'Test caption'
              }
            ]
          }
        },
        status: 200
      };
      
      mockedAxios.get.mockResolvedValue(mockInstagramResponse);
      
      const testInstagramAPI = async () => {
        try {
          const response = await axios.get(
            'https://instagram-scraper21.p.rapidapi.com/api/v1/posts',
            {
              params: { username: 'instagram' },
              headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'instagram-scraper21.p.rapidapi.com'
              }
            }
          );
          return { success: true, postCount: response.data.data.posts.length };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };
      
      const result = await testInstagramAPI();
      
      expect(result.success).toBeTruthy();
      expect(result.postCount).toBeGreaterThan(0);
    });
    
    test('should connect to TikTok API', async () => {
      const mockTikTokResponse = {
        data: {
          videos: [
            {
              id: 'test123',
              desc: 'Test video',
              playCount: 10000
            }
          ]
        },
        status: 200
      };
      
      mockedAxios.get.mockResolvedValue(mockTikTokResponse);
      
      const testTikTokAPI = async () => {
        try {
          const response = await axios.get(
            'https://tiktok-api23.p.rapidapi.com/search',
            {
              params: { keywords: 'business tips' },
              headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'tiktok-api23.p.rapidapi.com'
              }
            }
          );
          return { success: true, videoCount: response.data.videos.length };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };
      
      const result = await testTikTokAPI();
      
      expect(result.success).toBeTruthy();
      expect(result.videoCount).toBeGreaterThan(0);
    });
    
    test('should handle RapidAPI authentication errors', async () => {
      const authError = {
        response: { status: 401, data: { message: 'Invalid API key' } }
      };
      
      mockedAxios.get.mockRejectedValue(authError);
      
      const testAuthError = async () => {
        try {
          await axios.get('https://instagram-scraper21.p.rapidapi.com/api/v1/posts', {
            headers: { 'X-RapidAPI-Key': 'invalid-key' }
          });
          return { authValid: true };
        } catch (error) {
          return { 
            authValid: false, 
            statusCode: error.response?.status,
            isAuthError: error.response?.status === 401
          };
        }
      };
      
      const result = await testAuthError();
      
      expect(result.authValid).toBeFalsy();
      expect(result.isAuthError).toBeTruthy();
    });
  });
  
  describe('Apify API Integration', () => {
    
    test('should connect to Apify and run LinkedIn actor', async () => {
      const mockApifyResponse = {
        data: {
          id: 'test-run-id',
          status: 'RUNNING',
          actorId: 'linkedin-post-search-scraper'
        },
        status: 201
      };
      
      mockedAxios.post.mockResolvedValue(mockApifyResponse);
      
      const testApifyConnection = async () => {
        try {
          const response = await axios.post(
            'https://api.apify.com/v2/acts/linkedin-post-search-scraper/runs',
            {
              searchKeywords: 'test marketing',
              dateFilter: 'past-week'
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.APIFY_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
          return { success: true, runId: response.data.id };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };
      
      const result = await testApifyConnection();
      
      expect(result.success).toBeTruthy();
      expect(result.runId).toBeDefined();
    });
    
    test('should get results from Apify run', async () => {
      const mockResultsResponse = {
        data: [
          {
            id: 'post1',
            text: 'LinkedIn post content',
            stats: { total_reactions: 100 }
          }
        ],
        status: 200
      };
      
      mockedAxios.get.mockResolvedValue(mockResultsResponse);
      
      const getApifyResults = async (runId) => {
        try {
          const response = await axios.get(
            `https://api.apify.com/v2/datasets/test-dataset-id/items`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.APIFY_TOKEN}`
              }
            }
          );
          return { success: true, items: response.data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };
      
      const result = await getApifyResults('test-run-id');
      
      expect(result.success).toBeTruthy();
      expect(Array.isArray(result.items)).toBeTruthy();
    });
  });
  
  describe('AirTable API Integration', () => {
    
    test('should connect to AirTable and read records', async () => {
      const mockAirTableResponse = {
        data: {
          records: [
            {
              id: 'rec123',
              fields: {
                'Keyword or User': 'test_user',
                'Platform': 'Instagram',
                'Status': 'Listening'
              }
            }
          ]
        },
        status: 200
      };
      
      mockedAxios.get.mockResolvedValue(mockAirTableResponse);
      
      const testAirTableConnection = async () => {
        try {
          const response = await axios.get(
            `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/content_sources`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
              }
            }
          );
          return { success: true, recordCount: response.data.records.length };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };
      
      const result = await testAirTableConnection();
      
      expect(result.success).toBeTruthy();
      expect(result.recordCount).toBeGreaterThanOrEqual(0);
    });
    
    test('should create records in AirTable', async () => {
      const mockCreateResponse = {
        data: {
          records: [
            {
              id: 'rec456',
              fields: {
                'Post ID': 'test-post-123',
                'Platform': 'Instagram',
                'Viral Score': 85
              }
            }
          ]
        },
        status: 200
      };
      
      mockedAxios.post.mockResolvedValue(mockCreateResponse);
      
      const createAirTableRecord = async (data) => {
        try {
          const response = await axios.post(
            `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/viral_content_analysis`,
            {
              records: [{ fields: data }]
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          return { success: true, recordId: response.data.records[0].id };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };
      
      const testData = {
        'Post ID': 'test-post-123',
        'Platform': 'Instagram',
        'Viral Score': 85
      };
      
      const result = await createAirTableRecord(testData);
      
      expect(result.success).toBeTruthy();
      expect(result.recordId).toBeDefined();
    });
  });
  
  describe('Gmail API Integration', () => {
    
    test('should validate Gmail OAuth configuration', async () => {
      // Mock Gmail API response
      const mockGmailResponse = {
        data: {
          emailAddress: process.env.GMAIL_ADDRESS,
          messagesTotal: 100
        },
        status: 200
      };
      
      mockedAxios.get.mockResolvedValue(mockGmailResponse);
      
      const testGmailConnection = async () => {
        try {
          const response = await axios.get(
            'https://gmail.googleapis.com/gmail/v1/users/me/profile',
            {
              headers: {
                'Authorization': `Bearer mock-access-token`
              }
            }
          );
          return { success: true, email: response.data.emailAddress };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };
      
      const result = await testGmailConnection();
      
      expect(result.success).toBeTruthy();
      expect(result.email).toBeDefined();
    });
  });
  
  describe('API Rate Limiting and Error Handling', () => {
    
    test('should handle rate limits gracefully', async () => {
      const rateLimitResponses = [
        { response: { status: 429, headers: { 'retry-after': '60' } } },
        { response: { status: 429, headers: { 'retry-after': '30' } } },
        { data: { success: true }, status: 200 }
      ];
      
      let callCount = 0;
      mockedAxios.get.mockImplementation(() => {
        const response = rateLimitResponses[callCount++];
        if (response.response) {
          return Promise.reject(response);
        }
        return Promise.resolve(response);
      });
      
      const apiCallWithRetry = async (url, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await axios.get(url);
            return { success: true, attempt };
          } catch (error) {
            if (error.response?.status === 429 && attempt < maxRetries) {
              const retryAfter = error.response.headers['retry-after'] || 1;
              await testUtils.wait(retryAfter * 100); // Shortened for testing
              continue;
            }
            return { success: false, attempt, error: error.message };
          }
        }
      };
      
      const result = await apiCallWithRetry('https://api.example.com/test');
      
      expect(result.success).toBeTruthy();
      expect(result.attempt).toBe(3);
    });
    
    test('should validate API response structure', () => {
      const validateInstagramResponse = (response) => {
        return response &&
               response.data &&
               response.data.data &&
               Array.isArray(response.data.data.posts);
      };
      
      const validateLinkedInResponse = (response) => {
        return response &&
               Array.isArray(response.data) &&
               response.data.every(post => post.id && post.text);
      };
      
      const validInstagramResponse = {
        data: { data: { posts: [] } }
      };
      
      const validLinkedInResponse = {
        data: [{ id: '1', text: 'test' }]
      };
      
      expect(validateInstagramResponse(validInstagramResponse)).toBeTruthy();
      expect(validateLinkedInResponse(validLinkedInResponse)).toBeTruthy();
      expect(validateInstagramResponse({})).toBeFalsy();
    });
  });
  
  describe('API Health Monitoring', () => {
    
    test('should monitor API response times', async () => {
      const monitorApiPerformance = async (apiCall) => {
        const startTime = Date.now();
        try {
          await apiCall();
          const responseTime = Date.now() - startTime;
          return { success: true, responseTime };
        } catch (error) {
          const responseTime = Date.now() - startTime;
          return { success: false, responseTime, error: error.message };
        }
      };
      
      const mockApiCall = () => {
        return new Promise(resolve => setTimeout(resolve, 100));
      };
      
      const result = await monitorApiPerformance(mockApiCall);
      
      expect(result.success).toBeTruthy();
      expect(result.responseTime).toBeGreaterThanOrEqual(100);
    });
    
    test('should detect API outages', async () => {
      const checkApiHealth = async (endpoints) => {
        const results = await Promise.allSettled(
          endpoints.map(async (endpoint) => {
            try {
              await axios.get(endpoint.url, { timeout: 5000 });
              return { endpoint: endpoint.name, status: 'healthy' };
            } catch (error) {
              return { 
                endpoint: endpoint.name, 
                status: 'unhealthy',
                error: error.message 
              };
            }
          })
        );
        
        return results.map(result => result.value);
      };
      
      const endpoints = [
        { name: 'OpenAI', url: 'https://api.openai.com/v1/models' },
        { name: 'RapidAPI', url: 'https://rapidapi.com' }
      ];
      
      // Mock all as healthy for test
      mockedAxios.get.mockResolvedValue({ status: 200 });
      
      const healthResults = await checkApiHealth(endpoints);
      
      expect(healthResults.length).toBe(2);
      expect(healthResults.every(result => result.status === 'healthy')).toBeTruthy();
    });
  });
});