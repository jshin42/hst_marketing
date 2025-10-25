# Testing Guide - Viral Content Automation System

This guide provides comprehensive instructions for testing the viral content automation system, including unit tests, integration tests, end-to-end tests, and system validation.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Environment Setup](#test-environment-setup)
3. [Running Tests](#running-tests)
4. [Test Coverage](#test-coverage)
5. [Test Types](#test-types)
6. [Continuous Integration](#continuous-integration)
7. [Troubleshooting](#troubleshooting)
8. [Performance Testing](#performance-testing)

## Prerequisites

### System Requirements

- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: Latest version
- **API Keys**: Valid credentials for all external services

### Required API Credentials

```bash
# Copy environment template
cp .env.example .env

# Configure the following variables:
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_API_KEY=keyXXXXXXXXXXXXXX
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXX
RAPIDAPI_KEY=XXXXXXXXXXXXXXXX
APIFY_TOKEN=apify_api_XXXXXXXX
GMAIL_ADDRESS=your-email@gmail.com
```

## Test Environment Setup

### 1. Install Dependencies

```bash
# Install all dependencies including dev dependencies
npm install

# Verify Jest installation
npx jest --version
```

### 2. Validate System Setup

```bash
# Run comprehensive setup validation
node scripts/validate-setup.js

# Expected output:
# ✅ All validation checks passed! Your system is ready for deployment.
```

### 3. Initialize Test Database

```bash
# Create test data directories
mkdir -p test-data/generated
mkdir -p logs/test

# Verify test fixtures are present
ls test-data/fixtures/
# Should show: sample-instagram-data.json, sample-linkedin-data.json, sample-tiktok-data.json
```

## Running Tests

### Quick Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with verbose output
npm run test:verbose
```

### Detailed Test Execution

#### 1. Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific unit test files
npx jest tests/unit/config.test.js
npx jest tests/unit/data-processing.test.js

# Run with debugging
npx jest tests/unit/config.test.js --verbose --detectOpenHandles
```

**Expected Output:**
```
Configuration Validation
  ✓ should have valid AirTable schema structure
  ✓ should have all required tables
  ✓ should have valid field definitions for content_sources table
  ✓ should have valid Instagram configuration
  ✓ should have consistent platform names across configurations
```

#### 2. Integration Tests

```bash
# Run API connectivity tests
npm run test:integration

# Test specific API integrations
npx jest tests/integration/api-connectivity.test.js --testNamePattern="OpenAI"
npx jest tests/integration/api-connectivity.test.js --testNamePattern="RapidAPI"
npx jest tests/integration/api-connectivity.test.js --testNamePattern="AirTable"
```

**Expected Output:**
```
API Connectivity Integration Tests
  OpenAI API Integration
    ✓ should connect to OpenAI API successfully
    ✓ should handle OpenAI rate limiting
    ✓ should validate GPT-4 model access
  RapidAPI Integration
    ✓ should connect to Instagram Scraper API
    ✓ should connect to TikTok API
```

#### 3. End-to-End Tests

```bash
# Run complete workflow tests
npm run test:e2e

# Run specific platform workflows
npx jest tests/e2e/workflow-validation.test.js --testNamePattern="Instagram"
npx jest tests/e2e/workflow-validation.test.js --testNamePattern="LinkedIn"
npx jest tests/e2e/workflow-validation.test.js --testNamePattern="TikTok"
```

**Expected Output:**
```
Complete Workflow End-to-End Tests
  Content Research Workflow
    ✓ should complete Instagram content research workflow
    ✓ should complete LinkedIn content research workflow
    ✓ should complete TikTok content research workflow
  Content Generation Workflow
    ✓ should complete email-triggered content generation workflow
```

### 4. System Health Checks

```bash
# Run comprehensive health check
node scripts/health-check.js

# Expected output includes:
# 🟢 Overall Status: HEALTHY
# ✅ OPENAI API: Healthy (234ms, 15 models)
# ✅ RAPIDAPI APIs: Healthy
# ✅ AIRTABLE API: Healthy (156ms)
```

## Test Coverage

### Coverage Requirements

- **Overall Coverage**: Minimum 90%
- **Functions**: Minimum 85%
- **Lines**: Minimum 90%
- **Branches**: Minimum 80%

### Generating Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Generate HTML coverage report
npm run test:coverage:html

# View coverage report
open coverage/lcov-report/index.html
```

### Coverage Analysis

```bash
# Check coverage thresholds
npx jest --coverage --coverageThreshold='{"global":{"branches":80,"functions":85,"lines":90,"statements":90}}'

# Coverage by file type
npx jest --coverage --collectCoverageFrom='tests/**/*.js'
npx jest --coverage --collectCoverageFrom='lib/**/*.js'
npx jest --coverage --collectCoverageFrom='scripts/**/*.js'
```

## Test Types

### 1. Unit Tests (`tests/unit/`)

**Purpose**: Test individual functions and modules in isolation

**Coverage Areas**:
- Configuration validation (`config.test.js`)
- Data processing functions (`data-processing.test.js`)
- Utility functions
- Framework identification logic
- Viral score calculations

**Example Test Run**:
```bash
npx jest tests/unit/data-processing.test.js --verbose

# Tests functions like:
# - parseInstagramReel()
# - calculateViralScore()
# - identifyFramework()
# - validatePostData()
```

### 2. Integration Tests (`tests/integration/`)

**Purpose**: Test API integrations and external service connectivity

**Coverage Areas**:
- OpenAI API authentication and model access
- RapidAPI Instagram/TikTok scraping
- Apify LinkedIn automation
- AirTable data operations
- Gmail API integration
- Rate limiting and error handling

**Example Test Run**:
```bash
npx jest tests/integration/api-connectivity.test.js --testNamePattern="should connect to OpenAI"

# Validates:
# - API authentication
# - Response time monitoring
# - Error handling
# - Rate limit compliance
```

### 3. End-to-End Tests (`tests/e2e/`)

**Purpose**: Test complete workflows from start to finish

**Coverage Areas**:
- Full content research workflows
- Content generation pipelines
- Email-triggered automations
- Approval workflows
- Error recovery mechanisms
- Performance monitoring

**Example Test Run**:
```bash
npx jest tests/e2e/workflow-validation.test.js --testNamePattern="Instagram content research"

# Simulates complete flow:
# 1. Instagram content scraping
# 2. OpenAI analysis
# 3. AirTable record creation
# 4. Notification sending
```

### 4. Performance Tests

**Purpose**: Validate system performance under load

**Running Performance Tests**:
```bash
# Basic performance test
node tests/performance/load-test.js

# Stress test with concurrent workflows
node tests/performance/stress-test.js --concurrent=10 --duration=300

# Memory leak detection
node --inspect tests/performance/memory-test.js
```

## Continuous Integration

### GitHub Actions Integration

**Workflow File**: `.github/workflows/test.yml`

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run validate:setup
```

### Pre-commit Hooks

**Setup**:
```bash
# Install pre-commit hooks
npm install --save-dev husky
npx husky install

# Add test hook
npx husky add .husky/pre-commit "npm run test:quick"
```

### Automated Testing Pipeline

1. **Pre-commit**: Run quick unit tests and linting
2. **Push**: Run full test suite with coverage
3. **Pull Request**: Run integration and E2E tests
4. **Deploy**: Run health checks and smoke tests

## Troubleshooting

### Common Test Failures

#### 1. API Authentication Errors

**Error**: `401 Unauthorized` or `403 Forbidden`

**Solutions**:
```bash
# Verify API keys are set
echo $OPENAI_API_KEY | head -c 10  # Should show: sk-xxxxxxx
echo $AIRTABLE_API_KEY | head -c 10  # Should show: keyxxxxxxx

# Test API credentials
node scripts/validate-setup.js

# Update environment variables
vim .env  # Update with valid credentials
```

#### 2. Rate Limiting Issues

**Error**: `429 Too Many Requests`

**Solutions**:
```bash
# Run tests with delays
npm run test:integration -- --testTimeout=30000

# Use test API keys with higher limits
export OPENAI_API_KEY="sk-test-xxxxxxxxxxxx"

# Run tests sequentially instead of parallel
npx jest --runInBand
```

#### 3. Network Connectivity

**Error**: `ECONNREFUSED` or `Network timeout`

**Solutions**:
```bash
# Check internet connectivity
curl -I https://api.openai.com/v1/models

# Increase timeout values
export JEST_TIMEOUT=60000
npm test

# Use offline mode for unit tests
npm run test:unit -- --offline
```

#### 4. Memory Issues

**Error**: `JavaScript heap out of memory`

**Solutions**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm test

# Run tests in smaller batches
npx jest tests/unit/
npx jest tests/integration/
npx jest tests/e2e/
```

### Test Data Issues

#### Missing Test Fixtures

```bash
# Verify all fixtures exist
ls -la test-data/fixtures/
# Should show: sample-instagram-data.json, sample-linkedin-data.json, sample-tiktok-data.json

# Regenerate missing fixtures
node scripts/generate-test-data.js
```

#### Invalid Test Data

```bash
# Validate test data format
node scripts/validate-test-data.js

# Update test data to match API changes
npm run update:fixtures
```

### Debugging Test Failures

#### Enable Debug Mode

```bash
# Run with debug output
DEBUG=* npm test

# Jest debugging
node --inspect-brk node_modules/.bin/jest --runInBand tests/unit/config.test.js

# Log API requests/responses
export LOG_LEVEL=debug
npm run test:integration
```

#### Test Isolation

```bash
# Run single test file
npx jest tests/unit/config.test.js

# Run specific test case
npx jest -t "should have valid AirTable schema structure"

# Run with no cache
npx jest --no-cache --clearCache
```

## Performance Testing

### Load Testing

```bash
# Basic load test (10 concurrent workflows)
node tests/performance/load-test.js --workflows=10 --duration=60

# Stress test (maximum load)
node tests/performance/stress-test.js --max-load

# Memory profiling
node --inspect tests/performance/memory-profile.js
```

### Performance Benchmarks

**Expected Performance Metrics**:
- Instagram workflow: < 5 seconds
- LinkedIn workflow: < 10 seconds (Apify processing)
- TikTok workflow: < 3 seconds
- Content generation: < 8 seconds
- Memory usage: < 512MB steady state

### Monitoring During Tests

```bash
# Start monitoring dashboard
npm run monitor &

# Run performance tests
npm run test:performance

# View results
open http://localhost:3000  # Monitoring dashboard
```

## Advanced Testing

### Custom Test Configurations

**Jest Configuration** (`jest.config.js`):
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'lib/**/*.js',
    'scripts/**/*.js',
    '!**/node_modules/**'
  ],
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
```

### Environment-Specific Testing

```bash
# Test against production APIs (careful!)
NODE_ENV=production npm run test:integration

# Test with staging environment
NODE_ENV=staging npm run test:e2e

# Test with mock servers
USE_MOCK_APIS=true npm test
```

### Test Reporting

```bash
# Generate test report
npm run test:report

# Send test results to external service
npm run test:report -- --reporter=junit --outputFile=test-results.xml

# Generate performance report
npm run test:performance:report
```

## Best Practices

### Writing New Tests

1. **Follow naming conventions**: `describe()` for modules, `test()` for specific functionality
2. **Use proper setup/teardown**: Clean up resources after tests
3. **Mock external dependencies**: Don't rely on external APIs for unit tests
4. **Test edge cases**: Include error conditions and boundary values
5. **Keep tests isolated**: Each test should be independent

### Maintaining Tests

1. **Update tests with code changes**: Keep tests synchronized with implementation
2. **Review test coverage regularly**: Ensure new code is properly tested
3. **Clean up obsolete tests**: Remove tests for deprecated functionality
4. **Monitor test performance**: Keep test execution time reasonable

### Test Data Management

1. **Use realistic test data**: Base fixtures on actual API responses
2. **Keep test data minimal**: Only include necessary fields
3. **Version control test data**: Track changes to test fixtures
4. **Refresh test data periodically**: Update to match current API formats

This comprehensive testing guide ensures the viral content automation system is thoroughly tested at all levels, from individual functions to complete workflows. Regular testing helps maintain system reliability and catches issues early in the development process.