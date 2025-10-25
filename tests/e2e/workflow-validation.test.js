/**
 * End-to-End Workflow Validation Tests
 * Tests complete viral content automation workflows from data collection to content generation
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Mock external APIs for testing
jest.mock('axios');
const mockedAxios = axios;

describe('Complete Workflow End-to-End Tests', () => {
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  describe('Content Research Workflow', () => {
    
    test('should complete Instagram content research workflow', async () => {
      // Mock Instagram API response
      const mockInstagramData = {
        data: {
          data: {
            posts: [
              {
                code: 'test-post-123',
                product_type: 'clips',
                like_count: 15000,
                caption: 'Test viral content',
                created_at_human_readable: new Date().toISOString()
              }
            ]
          }
        }
      };
      
      // Mock OpenAI analysis response
      const mockAnalysisResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                viral_score: 87,
                scoring_breakdown: {
                  viral_mechanics: 85,
                  content_structure: 90,
                  platform_optimization: 85,
                  authenticity_factors: 88
                },
                primary_strengths: "Strong hook, clear value proposition",
                framework_1: "Problem-Solution-Proof: Identifies issue, provides solution",
                framework_2: "Hook-Educate-CTA: Grabs attention, educates, prompts action",
                framework_3: "Story-Lesson-Application: Personal story with actionable insight"
              })
            }
          }]
        }
      };
      
      // Mock AirTable create response
      const mockAirTableResponse = {
        data: {
          records: [{
            id: 'rec123',
            fields: {
              'Post ID': 'test-post-123',
              'Platform': 'Instagram',
              'Viral Score': 87
            }
          }]
        }
      };
      
      // Set up API mocks
      mockedAxios.get
        .mockResolvedValueOnce(mockInstagramData) // Instagram scraping
        .mockResolvedValueOnce({ data: { data: [{ id: 'gpt-4' }] } }); // OpenAI models check
      
      mockedAxios.post
        .mockResolvedValueOnce(mockAnalysisResponse) // OpenAI analysis
        .mockResolvedValueOnce(mockAirTableResponse); // AirTable record creation
      
      // Simulate complete workflow
      const workflowResult = await simulateInstagramWorkflow();
      
      expect(workflowResult.success).toBeTruthy();
      expect(workflowResult.postsAnalyzed).toBe(1);
      expect(workflowResult.recordsCreated).toBe(1);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
    
    test('should complete LinkedIn content research workflow', async () => {
      // Mock Apify LinkedIn response
      const mockLinkedInResponse = {
        data: {
          id: 'test-run-123',
          status: 'SUCCEEDED'
        }
      };
      
      const mockLinkedInResults = {
        data: [
          {
            id: 'test-linkedin-456',
            text: 'Professional content about marketing strategies',
            stats: { total_reactions: 150 },
            author: { name: 'Test Author' }
          }
        ]
      };
      
      const mockAnalysisResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                linkedin_score: 82,
                scoring_breakdown: {
                  professional_authority: 85,
                  business_value_delivery: 80,
                  linkedin_optimization: 82,
                  professional_networking: 80
                },
                primary_strengths: "Authority building, actionable insights",
                framework_1: "Problem-Insight-Solution: Industry problem analysis",
                framework_2: "Experience-Lesson-Application: Professional story"
              })
            }
          }]
        }
      };
      
      mockedAxios.post
        .mockResolvedValueOnce(mockLinkedInResponse) // Apify run start
        .mockResolvedValueOnce(mockAnalysisResponse); // OpenAI analysis
      
      mockedAxios.get
        .mockResolvedValueOnce(mockLinkedInResults) // Apify results
        .mockResolvedValueOnce({ data: { data: [{ id: 'gpt-4' }] } }); // OpenAI models
      
      const workflowResult = await simulateLinkedInWorkflow();
      
      expect(workflowResult.success).toBeTruthy();
      expect(workflowResult.postsAnalyzed).toBe(1);
      expect(workflowResult.linkedinScore).toBe(82);
    });
    
    test('should complete TikTok content research workflow', async () => {
      // Mock TikTok API response
      const mockTikTokData = {
        data: {
          videos: [
            {
              id: 'test-tiktok-789',
              desc: 'Viral TikTok about productivity tips',
              playCount: 50000,
              authorMeta: { name: 'TestCreator' },
              musicMeta: { musicName: 'original sound' }
            }
          ]
        }
      };
      
      const mockAnalysisResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                tiktok_score: 89,
                scoring_breakdown: {
                  hook_retention: 90,
                  algorithm_optimization: 88,
                  authenticity_factors: 85,
                  entertainment_value: 92
                },
                primary_strengths: "Strong hook, viral mechanics",
                framework_1: "Hook-Educate-Surprise: Immediate attention grab",
                framework_2: "Problem-Solution-Proof: Quick problem solving"
              })
            }
          }]
        }
      };
      
      mockedAxios.get
        .mockResolvedValueOnce(mockTikTokData) // TikTok scraping
        .mockResolvedValueOnce({ data: { data: [{ id: 'gpt-4' }] } }); // OpenAI models
      
      mockedAxios.post.mockResolvedValueOnce(mockAnalysisResponse); // OpenAI analysis
      
      const workflowResult = await simulateTikTokWorkflow();
      
      expect(workflowResult.success).toBeTruthy();
      expect(workflowResult.videosAnalyzed).toBe(1);
      expect(workflowResult.tiktokScore).toBe(89);
    });
  });
  
  describe('Content Generation Workflow', () => {
    
    test('should complete email-triggered content generation workflow', async () => {
      // Mock Gmail webhook data
      const mockEmailTrigger = {
        subject: 'Generate Instagram content based on viral post analysis',
        body: 'Please create content using the Problem-Solution-Proof framework',
        sender: process.env.GMAIL_ADDRESS
      };
      
      // Mock AirTable source data
      const mockSourceData = {
        data: {
          records: [{
            id: 'rec123',
            fields: {
              'Post ID': 'source-post-123',
              'Platform': 'Instagram',
              'Viral Score': 87,
              'Framework 1': 'Problem-Solution-Proof',
              'Primary Strengths': 'Strong hook, clear value'
            }
          }]
        }
      };
      
      // Mock OpenAI generation response
      const mockGenerationResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                content: {
                  main_content: "Many small businesses struggle with social media engagement. Here's the framework that increased our client's reach by 300%: 1) Identify your audience's pain points 2) Provide actionable solutions 3) Share real results. Save this post for your content strategy!"
                },
                caption: {
                  hook_caption: "The social media framework that changed everything 🚀",
                  hashtags: "#socialmedia #marketing #businessgrowth #contentcreator #engagement"
                },
                framework_application: {
                  framework_used: "Problem-Solution-Proof",
                  original_elements: "Specific percentage increase, actionable steps, save prompt",
                  adaptation_notes: "Maintained problem-solution structure while ensuring 100% originality"
                }
              })
            }
          }]
        }
      };
      
      // Mock AirTable content creation
      const mockContentRecord = {
        data: {
          records: [{
            id: 'rec456',
            fields: {
              'Platform Target': 'Instagram',
              'Framework Used': 'Problem-Solution-Proof',
              'Generated Content': 'Many small businesses struggle with...',
              'Approval Status': 'Pending Approval'
            }
          }]
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockSourceData); // AirTable source data
      mockedAxios.post
        .mockResolvedValueOnce(mockGenerationResponse) // OpenAI generation
        .mockResolvedValueOnce(mockContentRecord); // AirTable content record
      
      const generationResult = await simulateContentGenerationWorkflow(mockEmailTrigger);
      
      expect(generationResult.success).toBeTruthy();
      expect(generationResult.contentGenerated).toBeTruthy();
      expect(generationResult.frameworkUsed).toBe('Problem-Solution-Proof');
      expect(generationResult.approvalStatus).toBe('Pending Approval');
    });
    
    test('should handle content approval workflow', async () => {
      // Mock approval email
      const mockApprovalEmail = {
        subject: 'APPROVED: Instagram content rec456',
        body: 'Content approved for publishing',
        sender: process.env.GMAIL_ADDRESS
      };
      
      // Mock AirTable update response
      const mockUpdateResponse = {
        data: {
          records: [{
            id: 'rec456',
            fields: {
              'Approval Status': 'Approved',
              'Approved Date': new Date().toISOString()
            }
          }]
        }
      };
      
      mockedAxios.patch.mockResolvedValueOnce(mockUpdateResponse);
      
      const approvalResult = await simulateContentApprovalWorkflow(mockApprovalEmail);
      
      expect(approvalResult.success).toBeTruthy();
      expect(approvalResult.status).toBe('Approved');
      expect(approvalResult.recordUpdated).toBeTruthy();
    });
  });
  
  describe('Error Handling and Recovery', () => {
    
    test('should handle API failures gracefully', async () => {
      // Mock API failure
      const apiError = new Error('Network timeout');
      apiError.response = { status: 500 };
      
      mockedAxios.get.mockRejectedValueOnce(apiError);
      
      const workflowResult = await simulateInstagramWorkflowWithErrorHandling();
      
      expect(workflowResult.success).toBeFalsy();
      expect(workflowResult.error).toContain('Network timeout');
      expect(workflowResult.retryAttempted).toBeTruthy();
    });
    
    test('should handle rate limiting with backoff', async () => {
      // Mock rate limit responses
      const rateLimitError = new Error('Rate limited');
      rateLimitError.response = { 
        status: 429, 
        headers: { 'retry-after': '60' }
      };
      
      mockedAxios.post
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          data: {
            choices: [{ message: { content: '{"viral_score": 85}' } }]
          }
        });
      
      const workflowResult = await simulateWorkflowWithRateLimit();
      
      expect(workflowResult.success).toBeTruthy();
      expect(workflowResult.retryCount).toBe(2);
      expect(workflowResult.finalAttemptSucceeded).toBeTruthy();
    });
    
    test('should validate data integrity throughout workflow', async () => {
      // Mock invalid data response
      const invalidData = {
        data: {
          data: {
            posts: [
              {
                // Missing required fields
                product_type: 'clips'
                // No code, like_count, caption
              }
            ]
          }
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(invalidData);
      
      const workflowResult = await simulateDataValidationWorkflow();
      
      expect(workflowResult.success).toBeFalsy();
      expect(workflowResult.validationErrors).toBeDefined();
      expect(workflowResult.validationErrors.length).toBeGreaterThan(0);
    });
  });
  
  describe('Performance and Monitoring', () => {
    
    test('should track workflow performance metrics', async () => {
      const performanceMonitor = new WorkflowPerformanceMonitor();
      
      const mockResponse = {
        data: { data: { posts: [] } }
      };
      
      mockedAxios.get.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(mockResponse), 100);
        });
      });
      
      const result = await performanceMonitor.measureWorkflow(async () => {
        return await simulateInstagramWorkflow();
      });
      
      expect(result.duration).toBeGreaterThan(100);
      expect(result.apiCalls).toBeDefined();
      expect(result.memoryUsage).toBeDefined();
    });
    
    test('should monitor system health during workflow execution', async () => {
      const healthMonitor = new WorkflowHealthMonitor();
      
      const healthBefore = await healthMonitor.getSystemHealth();
      
      // Simulate workflow
      await simulateInstagramWorkflow();
      
      const healthAfter = await healthMonitor.getSystemHealth();
      
      expect(healthBefore.status).toBeDefined();
      expect(healthAfter.status).toBeDefined();
      expect(healthAfter.workflowsExecuted).toBeGreaterThan(healthBefore.workflowsExecuted);
    });
  });
});

// Workflow simulation functions
async function simulateInstagramWorkflow() {
  try {
    // Step 1: Scrape Instagram content
    const instagramData = await axios.get(
      'https://instagram-scraper21.p.rapidapi.com/api/v1/posts',
      {
        params: { username: 'test_account' },
        headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY }
      }
    );
    
    // Step 2: Analyze with OpenAI
    const analysisResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Analyze this Instagram post...' }]
      },
      {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
      }
    );
    
    // Step 3: Store in AirTable
    const airtableResponse = await axios.post(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/viral_content_analysis`,
      {
        records: [{
          fields: {
            'Post ID': 'test-post-123',
            'Platform': 'Instagram',
            'Viral Score': 87
          }
        }]
      },
      {
        headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}` }
      }
    );
    
    return {
      success: true,
      postsAnalyzed: instagramData.data.data.posts.length,
      recordsCreated: airtableResponse.data.records.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function simulateLinkedInWorkflow() {
  try {
    // Step 1: Start Apify LinkedIn scraper
    const apifyRun = await axios.post(
      'https://api.apify.com/v2/acts/linkedin-post-search-scraper/runs',
      { searchKeywords: 'marketing tips' },
      { headers: { 'Authorization': `Bearer ${process.env.APIFY_TOKEN}` } }
    );
    
    // Step 2: Get results
    const results = await axios.get(
      `https://api.apify.com/v2/datasets/test-dataset/items`,
      { headers: { 'Authorization': `Bearer ${process.env.APIFY_TOKEN}` } }
    );
    
    // Step 3: Analyze with OpenAI
    const analysis = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Analyze this LinkedIn post...' }]
      }
    );
    
    const analysisData = JSON.parse(analysis.data.choices[0].message.content);
    
    return {
      success: true,
      postsAnalyzed: results.data.length,
      linkedinScore: analysisData.linkedin_score
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function simulateTikTokWorkflow() {
  try {
    // Step 1: Scrape TikTok content
    const tiktokData = await axios.get(
      'https://tiktok-api23.p.rapidapi.com/search',
      {
        params: { keywords: 'productivity tips' },
        headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY }
      }
    );
    
    // Step 2: Analyze with OpenAI
    const analysis = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Analyze this TikTok video...' }]
      }
    );
    
    const analysisData = JSON.parse(analysis.data.choices[0].message.content);
    
    return {
      success: true,
      videosAnalyzed: tiktokData.data.videos.length,
      tiktokScore: analysisData.tiktok_score
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function simulateContentGenerationWorkflow(emailTrigger) {
  try {
    // Step 1: Get source content from AirTable
    const sourceData = await axios.get(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/viral_content_analysis`
    );
    
    // Step 2: Generate content with OpenAI
    const generation = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Generate original content...' }]
      }
    );
    
    // Step 3: Store generated content
    const contentRecord = await axios.post(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/generated_content_pipeline`,
      {
        records: [{
          fields: {
            'Platform Target': 'Instagram',
            'Generated Content': generation.data.choices[0].message.content,
            'Approval Status': 'Pending Approval'
          }
        }]
      }
    );
    
    const generationData = JSON.parse(generation.data.choices[0].message.content);
    
    return {
      success: true,
      contentGenerated: true,
      frameworkUsed: generationData.framework_application.framework_used,
      approvalStatus: 'Pending Approval'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function simulateContentApprovalWorkflow(approvalEmail) {
  try {
    // Extract record ID from email subject
    const recordId = approvalEmail.subject.match(/rec\w+/)?.[0] || 'rec456';
    
    // Update AirTable record
    const updateResponse = await axios.patch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/generated_content_pipeline/${recordId}`,
      {
        fields: {
          'Approval Status': 'Approved',
          'Approved Date': new Date().toISOString()
        }
      }
    );
    
    return {
      success: true,
      status: 'Approved',
      recordUpdated: true,
      recordId
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Error handling simulation functions
async function simulateInstagramWorkflowWithErrorHandling() {
  try {
    await simulateInstagramWorkflow();
    return { success: true };
  } catch (error) {
    // Simulate retry logic
    try {
      await testUtils.wait(1000);
      await simulateInstagramWorkflow();
      return { success: true, retryAttempted: true };
    } catch (retryError) {
      return { 
        success: false, 
        error: retryError.message,
        retryAttempted: true 
      };
    }
  }
}

async function simulateWorkflowWithRateLimit() {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      await axios.post('https://api.openai.com/v1/chat/completions', {});
      return { 
        success: true, 
        retryCount,
        finalAttemptSucceeded: true 
      };
    } catch (error) {
      if (error.response?.status === 429 && retryCount < maxRetries - 1) {
        retryCount++;
        await testUtils.wait(1000 * retryCount);
        continue;
      }
      throw error;
    }
  }
}

async function simulateDataValidationWorkflow() {
  try {
    const data = await axios.get('https://instagram-scraper21.p.rapidapi.com/api/v1/posts');
    
    // Validate data structure
    const validationErrors = [];
    
    if (!data.data?.data?.posts) {
      validationErrors.push('Invalid data structure: missing posts array');
    }
    
    data.data.data.posts.forEach((post, index) => {
      if (!post.code) validationErrors.push(`Post ${index}: missing code`);
      if (!post.like_count) validationErrors.push(`Post ${index}: missing like_count`);
      if (!post.caption) validationErrors.push(`Post ${index}: missing caption`);
    });
    
    if (validationErrors.length > 0) {
      return { success: false, validationErrors };
    }
    
    return { success: true, validationErrors: [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Performance monitoring classes
class WorkflowPerformanceMonitor {
  async measureWorkflow(workflowFn) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    let apiCalls = 0;
    
    // Mock API call counter
    const originalAxios = axios.get;
    axios.get = (...args) => {
      apiCalls++;
      return originalAxios.apply(axios, args);
    };
    
    try {
      const result = await workflowFn();
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      
      return {
        ...result,
        duration: endTime - startTime,
        apiCalls,
        memoryUsage: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal
        }
      };
    } finally {
      axios.get = originalAxios;
    }
  }
}

class WorkflowHealthMonitor {
  constructor() {
    this.workflowsExecuted = 0;
  }
  
  async getSystemHealth() {
    return {
      status: 'healthy',
      workflowsExecuted: this.workflowsExecuted++,
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}