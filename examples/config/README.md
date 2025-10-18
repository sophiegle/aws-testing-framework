# AWS Testing Framework Configuration

The AWS Testing Framework supports automatic configuration detection to make testing setup effortless for users.

## Quick Start

1. **Create a configuration file** in your project root:

```json
// aws-testing-framework.config.json
{}
```

3. **Integrate with your test pipeline**:

```json
// package.json
{
  "scripts": {
    "test": "cucumber-js"
  }
}
```

## Configuration Files

The framework automatically searches for configuration files in this order:

1. `aws-testing-framework.config.js`
2. `aws-testing-framework.config.json`
3. `awstf.config.js`
4. `awstf.config.json`
5. `.awstf.json`
6. `.aws-testing-framework.json`
7. `package.json` (in `awsTestingFramework` section)

## Configuration Examples

### Basic Configuration
Simple setup for most projects:

```json
{
  "reporting": {
    "cucumberJsonPath": "./reports/cucumber-report.json"
  }
}
```

### Development Configuration
Optimized for local development:

```javascript
// development-config.js
module.exports = {
  testing: {
    verbose: true,
    defaultTimeout: 60000 // Longer timeout for debugging
  }
};
```

### CI/CD Configuration
Production-ready setup for continuous integration:

```javascript
// ci-config.js
module.exports = {
  ci: {
    environment: process.env.NODE_ENV,
    buildId: process.env.BUILD_ID,
    branch: process.env.BRANCH_NAME,
    
    // Upload to S3
    uploadToS3: process.env.S3_REPORTS_BUCKET ? {
      bucket: process.env.S3_REPORTS_BUCKET,
      prefix: `reports/${process.env.BRANCH_NAME}`
    } : undefined,
    
    // Slack notifications
    notifications: {
      slack: process.env.SLACK_WEBHOOK_URL ? {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#test-results',
        onFailure: true
      } : undefined
    }
  }
};
```

### Package.json Configuration
Embed configuration directly in package.json:

```json
{
  "name": "my-project",
  "scripts": {},
  "awsTestingFramework": {
    "aws": {
      "region": "us-west-2"
    }
  }
}
```

## Configuration Options

### Testing Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultTimeout` | number | `30000` | Default timeout for AWS operations |
| `retryAttempts` | number | `3` | Retry attempts for failed operations |
| `retryDelay` | number | `1000` | Retry delay in milliseconds |
| `verbose` | boolean | `false` | Enable verbose logging |

### AWS Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `region` | string | `us-east-1` | Default AWS region |
| `maxRetries` | number | `3` | Maximum retry attempts for AWS SDK |
| `timeout` | number | `10000` | Request timeout in milliseconds |

### Reporting Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseDir` | string | `./test-reports` | Base directory for reports |
| `cucumberJsonPath` | string | `./coverage/functional-tests/cucumber-report.json` | Cucumber JSON report path |
| `includePerformanceMetrics` | boolean | `true` | Include performance metrics |
| `includeStepDetails` | boolean | `true` | Include step details |
| `maxFeaturesToShow` | number | `50` | Maximum features to show |

### CI/CD Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `environment` | string | `development` | Environment name |
| `buildId` | string | | Build/pipeline identifier |
| `branch` | string | | Git branch name |
| `commitHash` | string | | Git commit hash |
| `uploadToS3` | object | | S3 upload configuration |
| `notifications` | object | | Notification settings |

## Environment Variables

The framework automatically reads common environment variables:

- `AWS_REGION` - Default AWS region
- `NODE_ENV` - Environment (development/production)
- `BUILD_ID` / `GITHUB_RUN_ID` - Build identifier
- `BRANCH_NAME` / `GITHUB_REF_NAME` - Git branch
- `COMMIT_SHA` / `GITHUB_SHA` - Git commit hash
- `PULL_REQUEST_NUMBER` - PR number
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications
- `S3_REPORTS_BUCKET` - S3 bucket for report uploads

## Programmatic Usage

```typescript
import { ConfigManager } from 'aws-testing-framework';
// Get configuration details
const configManager = ConfigManager.getInstance();
const config = configManager.autoDetectConfig();
console.log('Using config:', config);
```

## Integration Examples

### GitHub Actions

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm test
        env:
          S3_REPORTS_BUCKET: ${{ secrets.S3_REPORTS_BUCKET }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      
      - uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: test-reports/
```

### npm Scripts

```json
{
  "scripts": {
    "test": "cucumber-js",
    "test:dev": "NODE_ENV=development npm test",
    "test:ci": "npm test",
  }
}
```

## Best Practices

1. **Use environment-specific configs**: Create separate configs for dev, staging, and production
2. **Keep secrets in environment variables**: Don't commit webhook URLs or API keys
3. **Enable auto-generation**: Set `autoGenerate: true` for seamless integration
4. **Use appropriate themes**: Generate both themes for CI, single theme for development
5. **Configure timeouts appropriately**: Longer timeouts for complex tests, shorter for fast feedback

## Troubleshooting


### Configuration not found
- Ensure the config file is in your project root or parent directories
- Check the file name matches the supported patterns
- Verify JSON syntax is valid

### CLI command not found
- Install the package globally: `npm install -g aws-testing-framework`
- Or use npx: `npx aws-testing-framework <command>`
- Check that the package is installed in your project
