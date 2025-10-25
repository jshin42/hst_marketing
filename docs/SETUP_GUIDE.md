# Complete Setup Guide

This guide will walk you through setting up the entire Viral Content Intake Funnel system from scratch.

## Prerequisites

Before starting, ensure you have accounts and access to:

- ✅ **n8n instance** (cloud or self-hosted)
- ✅ **AirTable account** (Pro plan recommended)
- ✅ **OpenAI API** account with GPT-4 access
- ✅ **RapidAPI account** with credits
- ✅ **Apify account** with credits
- ✅ **Gmail account** for automation

## Phase 1: Service Setup (30 minutes)

### 1.1 OpenAI API Setup

1. **Get API Key**:
   - Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Click \"Create new secret key\"
   - Copy and save the key securely
   - Add billing information and set usage limits

2. **Test API Access**:
   ```bash
   curl https://api.openai.com/v1/models \
     -H \"Authorization: Bearer YOUR_API_KEY\"
   ```

3. **Verify GPT-4 Access**:
   - Ensure your account has GPT-4 model access
   - Check usage limits and pricing

### 1.2 RapidAPI Setup

1. **Create Account**: Sign up at [RapidAPI](https://rapidapi.com)

2. **Subscribe to Required APIs**:
   - [Instagram Scraper 21](https://rapidapi.com/premium-apis-oanor/api/instagram-scraper21)
   - [TikTok API 23](https://rapidapi.com/Lundehund/api/tiktok-api23)

3. **Get API Key**:
   - Go to [RapidAPI Developer Dashboard](https://rapidapi.com/developer/billing)
   - Copy your API key from the dashboard
   - Add credits to your account

4. **Test API Access**:
   ```bash
   curl -X GET \"https://instagram-scraper21.p.rapidapi.com/api/v1/posts?username=instagram\" \
     -H \"X-RapidAPI-Key: YOUR_API_KEY\" \
     -H \"X-RapidAPI-Host: instagram-scraper21.p.rapidapi.com\"
   ```

### 1.3 Apify Setup

1. **Create Account**: Sign up at [Apify](https://apify.com)

2. **Get API Token**:
   - Go to [Apify Integrations](https://console.apify.com/account/integrations)
   - Create new API token
   - Copy and save the token

3. **Find LinkedIn Actor**:
   - Search for \"LinkedIn Post Search\" actor
   - Note the Actor ID for configuration

### 1.4 Gmail Setup

1. **Enable Gmail API**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable Gmail API
   - Create OAuth 2.0 credentials

2. **Configure OAuth Consent**:
   - Set up OAuth consent screen
   - Add your email as test user
   - Configure scopes for Gmail access

## Phase 2: AirTable Configuration (20 minutes)

### 2.1 Create Base

1. **New Base**: Create \"Viral Content Intelligence\" base
2. **Import Schema**: Use `config/airtable-schema.json` as reference

### 2.2 Set Up Tables

**Table 1: Content Sources**
```
Fields:
- Keyword or User (Single Line Text)
- Platform (Single Select: Instagram, LinkedIn, TikTok)
- Status (Single Select: Listening, Paused)
- Min Engagement Threshold (Number)
- Content Focus (Single Select: Business, Marketing, Tech, etc.)
- Last Scraped (Date & Time)
- Notes (Long Text)
```

**Table 2: Viral Content Analysis**
```
Fields:
- Post ID (Single Line Text)
- Platform (Single Select: Instagram, LinkedIn, TikTok)
- URL (URL)
- Author (Single Line Text)
- Content Type (Single Select: Reel, Carousel, Text Post, Video)
- Engagement Count (Number)
- Caption Text (Long Text)
- Script/Transcript (Long Text)
- Viral Score (Number)
- Primary Strengths (Long Text)
- Framework 1, 2, 3 (Long Text)
- Selected Framework (Single Select: Framework 1, Framework 2, Framework 3)
- Action (Single Select: Generate Content, Reject, Archive)
- Analysis Date (Date & Time)
```

**Table 3: Generated Content Pipeline**
```
Fields:
- Source Post (Link to Viral Content Analysis table)
- Platform Target (Single Select: Instagram, LinkedIn, TikTok)
- Framework Used (Single Line Text)
- Generated Content (Long Text)
- Caption (Long Text)
- Hashtags (Single Line Text)
- Production Notes (Long Text)
- Image Prompt (Long Text)
- Approval Status (Single Select: Pending, Approved, Rejected, Needs Revision)
- User Feedback (Long Text)
- Content Score (Number)
- Generation Date (Date & Time)
```

### 2.3 Create Views

**Content Sources Views**:
- \"Active Sources\" (Status = Listening)
- \"By Platform\" (Grouped by Platform)

**Viral Content Analysis Views**:
- \"Ready for Generation\" (Action = Generate Content)
- \"High Performers\" (Viral Score >= 80)
- \"This Week's Content\" (Analysis Date >= 7 days ago)

**Generated Content Pipeline Views**:
- \"Pending Approval\" (Approval Status = Pending)
- \"Approved Content\" (Approval Status = Approved)

### 2.4 Set Up Automations

Create automation in AirTable:

```
Trigger: When record matches conditions
Table: Viral Content Analysis
Conditions:
  - Selected Framework: is not empty
  - Action: equals \"Generate Content\"

Action: Send Email
To: your-email@domain.com
Subject: \"Content Generation Request - {Platform} - {Content Type}\"
Body: Include Framework, Viral Score, Primary Strengths, URL, Post ID
```

## Phase 3: n8n Configuration (45 minutes)

### 3.1 Install n8n

**Option A: n8n Cloud**
1. Sign up at [n8n.cloud](https://n8n.cloud)
2. Create new instance
3. Access your n8n editor

**Option B: Self-Hosted**
```bash
# Using Docker
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n

# Using npm
npm install n8n -g
n8n start
```

### 3.2 Configure Credentials

In n8n, go to Settings → Credentials and create:

**1. AirTable Credential**
- Name: \"AirTable API\"
- API Key: Your AirTable API key
- Test connection

**2. OpenAI Credential**
- Name: \"OpenAI API\"
- API Key: Your OpenAI API key
- Test with simple completion

**3. RapidAPI Credential**
- Name: \"RapidAPI\"
- Type: Header Auth
- Header Name: \"X-RapidAPI-Key\"
- Header Value: Your RapidAPI key

**4. Apify Credential**
- Name: \"Apify API\"
- API Token: Your Apify token

**5. Gmail OAuth2 Credential**
- Name: \"Gmail OAuth2\"
- Follow OAuth setup wizard
- Authorize with your Gmail account

### 3.3 Import Workflows

1. **Import Research Workflow**:
   - Copy content from `workflows/n8n/viral-content-research.json`
   - In n8n: Workflows → Import from File/URL
   - Paste JSON content

2. **Import Generation Workflow**:
   - Copy content from `workflows/n8n/content-generation-pipeline.json`
   - Import using same process

3. **Configure Workflow Settings**:
   - Update credential references in each node
   - Set your AirTable Base ID in all AirTable nodes
   - Configure schedule trigger (Sunday 11 PM recommended)

### 3.4 Test Workflows

**Test Research Workflow**:
1. Add test source in AirTable (Instagram username like \"instagram\")
2. Set status to \"Listening\"
3. Set low engagement threshold (10 likes)
4. Manually trigger workflow in n8n
5. Check for results in \"Viral Content Analysis\" table

**Test Generation Workflow**:
1. Select a framework in analyzed content
2. Set action to \"Generate Content\"
3. Check email for generation request
4. Trigger generation workflow manually
5. Verify approval email received

## Phase 4: Content Source Configuration (15 minutes)

### 4.1 Add Instagram Sources

Popular business/marketing accounts:
```
@garyvee (Gary Vaynerchuk)
@themarketingmillennials
@socialmediaexaminer
@buffer
@hootsuite
@later
@canva
@hubspot
```

### 4.2 Add LinkedIn Keywords

Business and marketing keywords:
```
\"content marketing strategy\"
\"social media tips\"
\"business growth hacks\"
\"digital marketing trends\"
\"entrepreneur mindset\"
\"startup advice\"
\"marketing automation\"
\"personal branding\"
```

### 4.3 Add TikTok Keywords

Viral business content keywords:
```
\"business tips\"
\"marketing hacks\"
\"entrepreneur life\"
\"startup journey\"
\"side hustle ideas\"
\"passive income\"
\"content creator tips\"
\"social media strategy\"
```

### 4.4 Set Engagement Thresholds

**Instagram**:
- Business accounts: 500+ likes
- Marketing accounts: 800+ likes
- Lifestyle accounts: 2000+ likes

**LinkedIn**:
- Business posts: 25+ reactions
- Marketing posts: 50+ reactions
- Tech posts: 30+ reactions

**TikTok**:
- Business content: 10,000+ views
- Marketing content: 5,000+ views
- Lifestyle content: 50,000+ views

## Phase 5: Testing & Validation (30 minutes)

### 5.1 End-to-End Test

1. **Research Phase Test**:
   - Ensure content sources are active
   - Manually trigger research workflow
   - Verify content appears in analysis table
   - Check viral scores and frameworks

2. **Generation Phase Test**:
   - Select framework from analyzed content
   - Set action to \"Generate Content\"
   - Check email trigger fires
   - Verify content generation quality
   - Test approval workflow

3. **Approval Process Test**:
   - Respond to approval email with \"APPROVED\"
   - Check content saves to pipeline table
   - Test rejection with feedback
   - Verify regeneration process

### 5.2 Performance Validation

**Research Metrics**:
- ✅ 10+ pieces of content analyzed per test run
- ✅ Viral scores distributed 40-100 range
- ✅ All 3 frameworks populated for each piece
- ✅ No API errors or timeouts

**Generation Quality**:
- ✅ Generated content is completely original
- ✅ Framework application is clear and accurate
- ✅ Platform optimization is appropriate
- ✅ Production notes are actionable

**System Reliability**:
- ✅ Workflows complete without errors
- ✅ Email automation works consistently
- ✅ AirTable data updates correctly
- ✅ API rate limits respected

## Phase 6: Production Deployment (15 minutes)

### 6.1 Schedule Activation

1. **Enable Research Schedule**:
   - Set to Sunday 11 PM weekly
   - Verify timezone settings
   - Enable workflow in n8n

2. **Monitor First Week**:
   - Check execution logs Monday morning
   - Verify content volume and quality
   - Adjust thresholds if needed

### 6.2 Optimization

**Content Volume Tuning**:
- If too little content: Lower engagement thresholds
- If too much content: Raise thresholds or add filters
- Target: 30-50 pieces analyzed weekly

**Quality Improvements**:
- Review viral scores distribution
- Adjust analysis prompt weights if needed
- Refine content source selections

### 6.3 Monitoring Setup

**Weekly Review Process**:
1. Monday: Review weekend research results
2. Tuesday-Thursday: Select frameworks and generate content
3. Friday: Approve/reject generated content
4. Weekend: Content creation and posting

**Performance Tracking**:
- Track approval rates for generated content
- Monitor API usage and costs
- Measure time saved vs manual research

## Troubleshooting

### Common Issues

**No Content Analyzed**:
- Check AirTable sources have \"Listening\" status
- Verify engagement thresholds aren't too high
- Check API credentials and rate limits

**Poor Content Quality**:
- Review source account selections
- Adjust engagement thresholds higher
- Refine keyword selections

**Email Issues**:
- Verify Gmail OAuth permissions
- Check AirTable automation triggers
- Test email workflow manually

**API Errors**:
- Check credential configurations
- Verify API quotas and billing
- Review rate limiting settings

### Performance Optimization

**Speed Improvements**:
- Enable workflow batching
- Implement content caching
- Optimize API call sequences

**Cost Management**:
- Monitor OpenAI token usage
- Track RapidAPI consumption
- Optimize Apify actor usage

**Quality Enhancement**:
- Refine analysis prompts
- Update framework libraries
- Improve source curation

## Next Steps

Once your system is running smoothly:

1. **Scale Content Sources**: Add more accounts and keywords
2. **Custom Frameworks**: Develop industry-specific frameworks  
3. **Multi-Language**: Add support for international content
4. **Advanced Analytics**: Track performance of generated content
5. **Integration**: Connect to scheduling tools and social platforms

## Support

- **Technical Issues**: Check n8n community and documentation
- **API Problems**: Contact respective service support teams
- **Feature Requests**: Submit issues in project repository
- **Community**: Join Discord for peer support

---

**Total Setup Time: ~2.5 hours**
**Ongoing Maintenance: ~30 minutes/week**