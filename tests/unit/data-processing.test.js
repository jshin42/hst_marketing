/**
 * Data Processing Unit Tests
 * Tests data transformation, parsing, and validation functions
 */

describe('Data Processing Functions', () => {
  
  describe('Instagram Data Processing', () => {
    
    test('should parse Instagram reel data correctly', () => {
      const mockInstagramReel = testUtils.generateTestData('instagram_post');
      mockInstagramReel.product_type = 'clips';
      
      const parseInstagramReel = (data) => ({
        postId: data.code,
        platform: 'Instagram',
        contentType: 'Reel',
        engagementCount: data.like_count,
        caption: data.caption,
        createdAt: data.created_at_human_readable
      });
      
      const result = parseInstagramReel(mockInstagramReel);
      
      expect(result.postId).toBe('test-post-123');
      expect(result.platform).toBe('Instagram');
      expect(result.contentType).toBe('Reel');
      expect(result.engagementCount).toBe(1500);
      expect(result.caption).toContain('#hashtags');
    });
    
    test('should parse Instagram carousel data correctly', () => {
      const mockInstagramCarousel = testUtils.generateTestData('instagram_post');
      mockInstagramCarousel.product_type = 'carousel_container';
      mockInstagramCarousel.edge_sidecar_to_children = {
        edges: [{}, {}, {}] // 3 slides
      };
      
      const parseInstagramCarousel = (data) => ({
        postId: data.code,
        platform: 'Instagram',
        contentType: 'Carousel',
        engagementCount: data.like_count,
        slideCount: data.edge_sidecar_to_children ? data.edge_sidecar_to_children.edges.length : 1,
        caption: data.caption
      });
      
      const result = parseInstagramCarousel(mockInstagramCarousel);
      
      expect(result.contentType).toBe('Carousel');
      expect(result.slideCount).toBe(3);
    });
    
    test('should extract audio URL from Instagram reel manifest', () => {
      const mockManifest = `
        <AdaptationSet contentType="video">
          <BaseURL>video_url_here</BaseURL>
        </AdaptationSet>
        <AdaptationSet contentType="audio">
          <BaseURL>https://example.com/audio.mp4?token=123&amp;version=1</BaseURL>
        </AdaptationSet>
      `;
      
      const extractAudioUrl = (manifest) => {
        const audioAdaptationSetMatch = manifest.match(/<AdaptationSet[^>]*contentType="audio"[^>]*>[\s\S]*?<\/AdaptationSet>/);
        if (!audioAdaptationSetMatch) return null;
        
        const baseUrlMatch = audioAdaptationSetMatch[0].match(/<BaseURL>(.*?)<\/BaseURL>/);
        if (!baseUrlMatch || !baseUrlMatch[1]) return null;
        
        return baseUrlMatch[1].replace(/&amp;/g, '&');
      };
      
      const result = extractAudioUrl(mockManifest);
      
      expect(result).toBe('https://example.com/audio.mp4?token=123&version=1');
    });
    
    test('should filter posts by date correctly', () => {
      const posts = [
        { created_at_human_readable: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }, // 2 days ago
        { created_at_human_readable: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }, // 10 days ago
        { created_at_human_readable: new Date().toISOString() } // today
      ];
      
      const filterRecentPosts = (posts, daysAgo = 7) => {
        const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        return posts.filter(post => new Date(post.created_at_human_readable) > cutoffDate);
      };
      
      const recentPosts = filterRecentPosts(posts, 7);
      
      expect(recentPosts.length).toBe(2); // Should exclude 10-day-old post
    });
    
    test('should filter posts by engagement threshold', () => {
      const posts = [
        { like_count: 100 },
        { like_count: 1500 },
        { like_count: 50 }
      ];
      
      const filterByEngagement = (posts, threshold) => {
        return posts.filter(post => post.like_count > threshold);
      };
      
      const highEngagementPosts = filterByEngagement(posts, 500);
      
      expect(highEngagementPosts.length).toBe(1);
      expect(highEngagementPosts[0].like_count).toBe(1500);
    });
  });
  
  describe('LinkedIn Data Processing', () => {
    
    test('should parse LinkedIn post data correctly', () => {
      const mockLinkedInPost = testUtils.generateTestData('linkedin_post');
      
      const parseLinkedInPost = (data) => ({
        postId: data.id,
        platform: 'LinkedIn',
        contentType: data.content.type,
        engagementCount: data.stats.total_reactions,
        content: data.text,
        author: data.author.name,
        authorHeadline: data.author.headline,
        stats: data.stats
      });
      
      const result = parseLinkedInPost(mockLinkedInPost);
      
      expect(result.postId).toBe('test-linkedin-123');
      expect(result.platform).toBe('LinkedIn');
      expect(result.engagementCount).toBe(150);
      expect(result.author).toBe('Test Author');
    });
    
    test('should filter LinkedIn posts by engagement threshold', () => {
      const posts = [
        { stats: { total_reactions: 10 } },
        { stats: { total_reactions: 50 } },
        { stats: { total_reactions: 5 } }
      ];
      
      const filterLinkedInPosts = (posts, threshold) => {
        return posts.filter(post => post.stats.total_reactions > threshold);
      };
      
      const filteredPosts = filterLinkedInPosts(posts, 25);
      
      expect(filteredPosts.length).toBe(1);
      expect(filteredPosts[0].stats.total_reactions).toBe(50);
    });
  });
  
  describe('TikTok Data Processing', () => {
    
    test('should parse TikTok video data correctly', () => {
      const mockTikTokVideo = testUtils.generateTestData('tiktok_video');
      
      const parseTikTokVideo = (data) => ({
        postId: data.id,
        platform: 'TikTok',
        contentType: 'Video',
        engagementCount: data.playCount,
        description: data.desc,
        author: data.authorMeta.name,
        hasOriginalSound: data.musicMeta.musicName === 'original sound'
      });
      
      const result = parseTikTokVideo(mockTikTokVideo);
      
      expect(result.postId).toBe('test-tiktok-123');
      expect(result.platform).toBe('TikTok');
      expect(result.engagementCount).toBe(50000);
      expect(result.hasOriginalSound).toBeTruthy();
    });
    
    test('should filter TikTok videos by original sound', () => {
      const videos = [
        { musicMeta: { musicName: 'original sound' } },
        { musicMeta: { musicName: 'trending song xyz' } },
        { musicMeta: { musicName: 'original sound' } }
      ];
      
      const filterOriginalSound = (videos) => {
        return videos.filter(video => video.musicMeta.musicName === 'original sound');
      };
      
      const originalSoundVideos = filterOriginalSound(videos);
      
      expect(originalSoundVideos.length).toBe(2);
    });
    
    test('should filter TikTok videos by play count threshold', () => {
      const videos = [
        { playCount: 5000 },
        { playCount: 15000 },
        { playCount: 100000 }
      ];
      
      const filterByPlayCount = (videos, threshold) => {
        return videos.filter(video => video.playCount > threshold);
      };
      
      const popularVideos = filterByPlayCount(videos, 10000);
      
      expect(popularVideos.length).toBe(2);
    });
  });
  
  describe('Viral Score Calculation', () => {
    
    test('should calculate viral score correctly', () => {
      const mockAnalysisResult = {
        viral_mechanics: 85,
        content_structure: 90,
        platform_optimization: 75,
        authenticity_factors: 80
      };
      
      const calculateViralScore = (analysis, weights = {
        viral_mechanics: 0.3,
        content_structure: 0.25,
        platform_optimization: 0.25,
        authenticity_factors: 0.2
      }) => {
        let score = 0;
        Object.entries(weights).forEach(([dimension, weight]) => {
          score += analysis[dimension] * weight;
        });
        return Math.round(score);
      };
      
      const score = calculateViralScore(mockAnalysisResult);
      
      expect(score).toBe(83); // Weighted average
    });
    
    test('should validate scoring dimensions are within range', () => {
      const validateScore = (score) => {
        return score >= 1 && score <= 100 && Number.isInteger(score);
      };
      
      expect(validateScore(85)).toBeTruthy();
      expect(validateScore(0)).toBeFalsy();
      expect(validateScore(101)).toBeFalsy();
      expect(validateScore(85.5)).toBeFalsy();
    });
  });
  
  describe('Content Framework Identification', () => {
    
    test('should identify Problem-Solution-Proof framework', () => {
      const content = `
        Many creators struggle with low engagement rates.
        The solution is posting during peak audience hours.
        I increased my engagement by 300% using this method.
      `;
      
      const identifyFramework = (content) => {
        const frameworks = [];
        
        if (content.includes('struggle') && content.includes('solution') && content.includes('increased')) {
          frameworks.push('Problem-Solution-Proof');
        }
        
        if (content.includes('Here\'s how') || content.includes('step')) {
          frameworks.push('Hook-Educate-CTA');
        }
        
        return frameworks;
      };
      
      const identifiedFrameworks = identifyFramework(content);
      
      expect(identifiedFrameworks).toContain('Problem-Solution-Proof');
    });
    
    test('should validate framework structure', () => {
      const framework = {
        name: 'Problem-Solution-Proof',
        description: 'Identify problem, provide solution, show proof',
        structure: ['Problem', 'Solution', 'Proof'],
        platforms: ['Instagram', 'LinkedIn', 'TikTok']
      };
      
      const validateFramework = (framework) => {
        return framework.name && 
               framework.description && 
               Array.isArray(framework.structure) && 
               framework.structure.length >= 2 &&
               Array.isArray(framework.platforms) &&
               framework.platforms.length > 0;
      };
      
      expect(validateFramework(framework)).toBeTruthy();
    });
  });
  
  describe('Content Generation Data Processing', () => {
    
    test('should format generated content for AirTable', () => {
      const generatedContent = {
        content: { main_content: 'Generated post content' },
        caption: { hook_caption: 'Engaging caption', hashtags: '#viral #content' },
        framework_application: { framework_used: 'Problem-Solution-Proof' }
      };
      
      const formatForAirTable = (content, sourceData) => ({
        'Platform Target': sourceData.platform,
        'Framework Used': content.framework_application.framework_used,
        'Generated Content': content.content.main_content,
        'Caption': content.caption.hook_caption,
        'Hashtags': content.caption.hashtags,
        'Approval Status': 'Pending Approval',
        'Generation Date': new Date().toISOString()
      });
      
      const result = formatForAirTable(generatedContent, { platform: 'Instagram' });
      
      expect(result['Platform Target']).toBe('Instagram');
      expect(result['Framework Used']).toBe('Problem-Solution-Proof');
      expect(result['Approval Status']).toBe('Pending Approval');
    });
    
    test('should validate generated content structure', () => {
      const validateGeneratedContent = (content) => {
        const required = ['content', 'caption', 'framework_application'];
        return required.every(field => field in content) &&
               'main_content' in content.content &&
               'hook_caption' in content.caption &&
               'framework_used' in content.framework_application;
      };
      
      const validContent = {
        content: { main_content: 'test' },
        caption: { hook_caption: 'test' },
        framework_application: { framework_used: 'test' }
      };
      
      const invalidContent = {
        content: { main_content: 'test' }
        // missing required fields
      };
      
      expect(validateGeneratedContent(validContent)).toBeTruthy();
      expect(validateGeneratedContent(invalidContent)).toBeFalsy();
    });
  });
  
  describe('Error Handling in Data Processing', () => {
    
    test('should handle missing data gracefully', () => {
      const safeParseEngagement = (data) => {
        try {
          return {
            likes: data?.like_count || 0,
            reactions: data?.stats?.total_reactions || 0,
            views: data?.playCount || 0
          };
        } catch (error) {
          return { likes: 0, reactions: 0, views: 0 };
        }
      };
      
      expect(safeParseEngagement(null)).toEqual({ likes: 0, reactions: 0, views: 0 });
      expect(safeParseEngagement({})).toEqual({ likes: 0, reactions: 0, views: 0 });
      expect(safeParseEngagement({ like_count: 100 })).toEqual({ likes: 100, reactions: 0, views: 0 });
    });
    
    test('should validate data before processing', () => {
      const validatePostData = (data) => {
        const errors = [];
        
        if (!data.id && !data.code) {
          errors.push('Missing post identifier');
        }
        
        if (!data.like_count && !data.stats?.total_reactions && !data.playCount) {
          errors.push('Missing engagement metrics');
        }
        
        if (!data.caption && !data.text && !data.desc) {
          errors.push('Missing content text');
        }
        
        return { isValid: errors.length === 0, errors };
      };
      
      const validPost = { id: '123', like_count: 100, caption: 'test' };
      const invalidPost = {};
      
      expect(validatePostData(validPost).isValid).toBeTruthy();
      expect(validatePostData(invalidPost).isValid).toBeFalsy();
      expect(validatePostData(invalidPost).errors.length).toBeGreaterThan(0);
    });
  });
});