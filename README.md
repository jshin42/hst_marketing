# Viral Content Intake Funnel

**Automated Research → Analysis → Generation Pipeline**

A complete system that automatically finds viral content, analyzes what makes it work, and generates original content ideas with detailed frameworks - all automated.

## 🔍 How It Works

### Research Phase (Automated Weekly)
- Scrapes Instagram posts, LinkedIn content, and TikTok videos based on keywords you're tracking
- Filters content by engagement thresholds (likes, views, reactions)  
- Only processes content from the past week to stay current

### Analysis Phase
For each viral post, the workflow:
- **Instagram Reels**: Extracts audio → transcribes with OpenAI Whisper → analyzes script + caption
- **Instagram Carousels**: Screenshots first slide → uses GPT to extract text → analyzes design + copy
- **LinkedIn Posts**: Analyzes text content, author positioning, and engagement patterns
- **TikTok Videos**: Downloads audio → transcribes → analyzes against viral TikTok frameworks

### AI Analysis Engine
Each piece of content gets scored (1-100) across multiple dimensions:
- Viral mechanics (hook effectiveness, engagement drivers)
- Content frameworks (Problem-Solution, Story-Lesson-CTA, etc.)  
- Platform optimization (algorithm factors, audience psychology)
- Authenticity factors (relatability, emotional resonance)

The AI identifies the top 3 frameworks that made the content successful and provides actionable implementation steps.

### Content Generation Pipeline  
When you find a framework you want to use:
- AI generates completely original content inspired by the viral patterns
- Creates platform-specific adaptations (LinkedIn = professional tone, TikTok = Gen Z energy)
- Includes detailed production notes (scripts, visual directions, image prompts)
- Sends you email approval requests with rationale for why it should work

### Feedback Loop
- You can approve/reject via email
- If rejected, you provide feedback and it regenerates
- Approved content goes to your \"Post Pipeline\" AirTable for scheduling

## 🚀 Quick Start

### Prerequisites
- [n8n](https://n8n.io) instance (cloud or self-hosted)
- [AirTable](https://airtable.com) account
- [OpenAI API](https://openai.com/api) key
- [RapidAPI](https://rapidapi.com) account
- [Apify](https://apify.com) account
- Gmail account for email automation

### 1. Set Up AirTable Base

1. Create a new AirTable base called \"Viral Content Intelligence\"
2. Import the schema from `config/airtable-schema.json`
3. Create the three main tables:
   - **Content Sources**: Keywords/accounts to track
   - **Viral Content Analysis**: AI-analyzed viral content with frameworks
   - **Generated Content Pipeline**: Original content with approval workflow

### 2. Configure API Credentials

Copy `.env.example` to `.env` and fill in your credentials:

```bash
# AirTable
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_API_KEY=your_api_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# RapidAPI
RAPIDAPI_KEY=your_rapidapi_key

# Apify
APIFY_TOKEN=your_apify_token

# Gmail
GMAIL_ADDRESS=your_email@gmail.com
```

### 3. Import n8n Workflows

1. Import `workflows/n8n/viral-content-research.json` into your n8n instance
2. Import `workflows/n8n/content-generation-pipeline.json`
3. Configure credentials for each service in n8n
4. Set up the weekly schedule trigger (Sunday 11 PM recommended)

### 4. Set Up AirTable Automations

Create automations in AirTable to trigger content generation:

```
When: Record in \"Viral Content Analysis\" matches conditions:
- Selected Framework: is not empty
- Action: equals \"Generate Content\"

Then: Send email with subject \"Content Generation Request - [Platform]\"
```

### 5. Configure Content Sources

In your AirTable \"Content Sources\" table, add:

**Instagram Sources** (usernames):
- @garyvee
- @themarketingmillennials  
- @socialmediacreator
- @contentcreatorcoach

**LinkedIn Keywords**:
- \"marketing strategy\"
- \"business growth\"
- \"content creation\"
- \"social media tips\"

**TikTok Keywords**:
- \"business tips\"
- \"marketing hacks\"  
- \"entrepreneur life\"
- \"content creation\"

## 📊 System Architecture

```
Weekly Trigger → AirTable Sources → Platform Router
       ↓
Instagram Branch → Scraper → Filters → Content Analysis → Framework ID → Storage
LinkedIn Branch  → Scraper → Filters → Content Analysis → Framework ID → Storage  
TikTok Branch   → Scraper → Filters → Content Analysis → Framework ID → Storage
       ↓
Content Selection → Email Trigger → Generation → Approval → Pipeline Storage
```

## 🔧 Configuration

### Engagement Thresholds
Adjust minimum engagement requirements in AirTable \"Content Sources\":
- **Instagram**: 500+ likes (business), 2000+ likes (lifestyle)
- **LinkedIn**: 25+ reactions (business), 50+ reactions (marketing)
- **TikTok**: 10,000+ views (business), 50,000+ views (lifestyle)

### Content Analysis Prompts
Customize analysis prompts in `prompts/` directory:
- `instagram-analysis.md`: Instagram-specific viral mechanics
- `linkedin-analysis.md`: Professional content optimization  
- `tiktok-analysis.md`: TikTok algorithm and Gen Z factors
- `content-generation.md`: Original content creation guidelines

### Platform Settings
Modify `config/platforms.json` for:
- API rate limits and endpoints
- Content type detection rules
- Framework categories by platform
- Engagement thresholds by niche

## 📈 Performance Monitoring

### Research Metrics
- **Content Volume**: 50+ viral posts analyzed weekly
- **Quality Filter**: 80%+ analyzed content has viral score >70
- **Platform Coverage**: Balanced across Instagram (40%), LinkedIn (35%), TikTok (25%)

### Generation Quality
- **Approval Rate**: Target 85%+ first-generation approval
- **Framework Accuracy**: Generated content correctly applies frameworks
- **Originality**: 100% unique content, zero duplication

### System Reliability  
- **Automation Success**: 95%+ successful weekly research runs
- **Processing Speed**: Complete analysis in <2 hours
- **Error Handling**: Robust retry logic for API failures

## 🛠️ Advanced Configuration

### Custom Frameworks
Add new content frameworks in `config/platforms.json`:

```json
{
  \"content_frameworks\": {
    \"custom_frameworks\": [
      \"Problem-Agitation-Solution\",
      \"Story-Insight-Action\",
      \"Question-Research-Answer\"
    ]
  }
}
```

### Multi-Language Support
Configure language detection and translation:
- Add language detection in content analysis
- Include translation services for global content
- Adapt frameworks for different cultural contexts

### Industry Specialization
Customize for specific industries:
- Adjust keyword lists for your niche
- Modify engagement thresholds by industry
- Create industry-specific framework libraries

## 🔍 Troubleshooting

### Common Issues

**Workflow Not Triggering**
- Check n8n schedule trigger is active
- Verify AirTable has \"Listening\" sources
- Confirm credentials are properly configured

**Low Content Volume**
- Adjust engagement thresholds lower
- Add more diverse content sources
- Check API rate limits and quotas

**Poor Analysis Quality**
- Review and update analysis prompts
- Adjust scoring weights in prompts
- Validate OpenAI model settings

**Email Approval Issues**
- Check Gmail permissions and OAuth
- Verify email format in AirTable automation
- Test email trigger workflow manually

### API Rate Limits

**RapidAPI Instagram**: 500 requests/minute, 10,000/day
**Apify LinkedIn**: 5 concurrent runs, $5/1000 results  
**OpenAI GPT-4**: 500 requests/minute
**OpenAI Whisper**: 50 requests/minute

### Performance Optimization

1. **Batch Processing**: Group API calls to minimize requests
2. **Caching**: Store analysis results to avoid re-processing
3. **Filtering**: Use strict engagement thresholds to reduce volume
4. **Scheduling**: Spread processing across multiple time windows

## 📚 Framework Library

### Universal Frameworks
- **Problem-Solution-Proof**: Issue identification → fix → results
- **Hook-Educate-CTA**: Attention → value → action
- **Story-Lesson-Application**: Narrative → insight → implementation

### Platform-Specific Frameworks

**Instagram**:
- **Visual-Hook-Value-CTA**: Eye-catching → information → engagement
- **Before-During-After**: Transformation journey documentation
- **Tutorial-Tip-Transform**: Educational progression

**LinkedIn**:
- **Problem-Insight-Solution**: Business challenge → analysis → strategy
- **Experience-Lesson-Application**: Professional story → learning → business use
- **Data-Analysis-Prediction**: Statistics → interpretation → implications

**TikTok**:
- **Hook-Deliver-Twist**: Immediate grab → value → surprise
- **Trend-Remix-Personal**: Popular format → unique angle → personal touch
- **Quick-Tip-Implementation**: Fast education → immediate action

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test your changes thoroughly
4. Submit a pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check `/docs` directory for detailed guides
- **Issues**: Report bugs and feature requests in GitHub Issues
- **Community**: Join our Discord for support and discussions

---

**Built for content creators who want to scale their viral content research and generation without losing quality or authenticity.**