# Testing Guide

This guide covers testing the AWS Testing Framework itself and best practices for writing tests.

## Framework Testing

### Unit Tests

Run unit tests for the framework:

```bash
npm run test:unit
```

### Integration Tests

Run integration tests with real AWS services:

```bash
npm test
```

### Mutation Testing

Run mutation testing to ensure test quality:

```bash
npm run test:mutation
```

## Writing Tests

### Test Structure

Follow this structure for your tests:

```gherkin
Feature: Feature Name
  As a [role]
  I want to [action]
  So that [benefit]

  Background:
    Given I have [prerequisites]

  Scenario: Scenario description
    Given [setup]
    When [action]
    Then [verification]
```

### Best Practices

#### 1. Use Descriptive Names

```gherkin
# Good
Scenario: Process uploaded CSV file successfully

# Bad
Scenario: Test upload
```

#### 2. Keep Scenarios Focused

```gherkin
# Good - Single responsibility
Scenario: Verify file upload triggers Lambda
  Given I have an S3 bucket named "test-bucket"
  When I upload a file "test.txt" to the S3 bucket
  Then the Lambda function should be invoked

# Bad - Multiple responsibilities
Scenario: Test entire pipeline
  Given I have an S3 bucket named "test-bucket"
  And I have a Lambda function named "test-function"
  And I have a Step Function named "test-pipeline"
  When I upload a file "test.txt" to the S3 bucket
  Then the Lambda function should be invoked
  And the Step Function should be executed
  And the file should be processed correctly
  And the results should be stored in the database
```

#### 3. Use Background for Common Setup

```gherkin
Feature: File Processing Pipeline

  Background:
    Given I have an S3 bucket named "test-bucket"
    And I have a Lambda function named "test-processor"
    And I have a Step Function named "test-pipeline"

  Scenario: Process valid file
    When I upload a file "valid.txt" with content "valid-data" to the S3 bucket
    Then the Lambda function should be invoked

  Scenario: Handle invalid file
    When I upload a file "invalid.txt" with content "invalid-data" to the S3 bucket
    Then the Lambda function logs should contain "Error processing file"
```

#### 4. Use Data Tables for Multiple Test Cases

```gherkin
Scenario Outline: Process different file types
  Given I have an S3 bucket named "test-bucket"
  When I upload a file "<filename>" with content "<content>" to the S3 bucket
  Then the Lambda function logs should contain "<expected-log>"

  Examples:
    | filename    | content      | expected-log        |
    | data.csv    | csv-data     | Processing CSV      |
    | data.json   | json-data    | Processing JSON     |
    | data.xml    | xml-data     | Processing XML      |
```

#### 5. Test Error Scenarios

```gherkin
Scenario: Handle missing file
  Given I have an S3 bucket named "test-bucket"
  When I try to process a non-existent file
  Then the Lambda function logs should contain "File not found"

Scenario: Handle invalid data
  Given I have an S3 bucket named "test-bucket"
  When I upload a file "invalid.json" with content "invalid-json" to the S3 bucket
  Then the Lambda function logs should contain "Invalid JSON format"
```

## Test Data Management

### Use Unique Test Data

```gherkin
Scenario: Process user data
  Given I have an S3 bucket named "test-bucket"
  When I upload a file "user-123.json" with content '{"userId": "123", "name": "Test User"}' to the S3 bucket
  Then the Lambda function should process the exact file "user-123.json"
```

### Clean Up Test Data

```typescript
// In your step definitions
After(async function() {
  // Clean up test data
  if (this.correlationId) {
    await framework.cleanupTestData(this.correlationId);
  }
});
```

### Use Test Fixtures

```typescript
// test-fixtures.ts
export const testData = {
  validUser: {
    userId: 'test-123',
    name: 'Test User',
    email: 'test@example.com'
  },
  invalidUser: {
    userId: 'invalid',
    name: '',
    email: 'invalid-email'
  }
};
```

## Performance Testing

### Test Response Times

```gherkin
Scenario: Verify performance SLAs
  Given I have a Lambda function named "test-processor"
  When I upload a file "large-data.json" to the S3 bucket
  Then the Lambda function should execute within 5000 milliseconds
  And the Step Function should meet performance SLAs
```

### Load Testing

```gherkin
Scenario: Handle multiple concurrent requests
  When I upload multiple files to the S3 bucket
  Then the Lambda function should be invoked multiple times
  And the Lambda function should have acceptable execution metrics
```

## Monitoring and Observability

### Test Log Analysis

```gherkin
Scenario: Verify logging behavior
  When I upload a file "test-data.json" to the S3 bucket
  Then the Lambda function logs should contain "Processing file"
  And the Lambda function logs should not contain errors
  And the Lambda function should have acceptable execution metrics
```

### Test Data Flow

```gherkin
Scenario: Verify end-to-end data flow
  When I upload a file "test-data.json" to the S3 bucket
  Then I should be able to trace the file "test-data.json" through the entire pipeline
  And the Lambda execution should correlate with the SQS message
  And the Step Function execution should correlate with the Lambda execution
```

## Test Configuration

### Environment-Specific Tests

```gherkin
@dev
Scenario: Test in development environment
  Given I have an S3 bucket named "dev-bucket"
  When I upload a file "test.txt" to the S3 bucket
  Then the Lambda function should be invoked

@prod
Scenario: Test in production environment
  Given I have an S3 bucket named "prod-bucket"
  When I upload a file "test.txt" to the S3 bucket
  Then the Lambda function should be invoked
```

### Tagged Scenarios

```bash
# Run only smoke tests
npx cucumber-js --tags @smoke

# Run tests excluding slow tests
npx cucumber-js --tags "not @slow"

# Run tests for specific environment
npx cucumber-js --tags @dev
```

## Debugging Tests

### Enable Debug Logging

```bash
DEBUG=aws-testing-framework:* npx cucumber-js
```

### Use Dry Run

```bash
npx cucumber-js --dry-run
```

### Step-by-Step Debugging

```typescript
// In your step definitions
When('I upload a file {string} to the S3 bucket', async function(fileName: string) {
  console.log(`Debug: Uploading file ${fileName}`);
  
  try {
    await framework.uploadFile(this.bucketName, fileName, 'test-content');
    console.log(`Debug: File ${fileName} uploaded successfully`);
  } catch (error) {
    console.error(`Debug: Failed to upload file ${fileName}:`, error);
    throw error;
  }
});
```

## Test Reports

### Generate Reports

```bash
npm run test:coverage
```

### View Reports

- HTML reports: `reports/cucumber-report.html`
- JSON reports: `reports/cucumber-report.json`
- Coverage reports: `coverage/lcov-report/index.html`

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit
      - run: npm test
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: reports/
```

## Best Practices Summary

1. **Write descriptive test names**
2. **Keep scenarios focused and single-purpose**
3. **Use Background for common setup**
4. **Test both happy path and error scenarios**
5. **Use unique test data**
6. **Clean up after tests**
7. **Test performance and SLAs**
8. **Verify logging and observability**
9. **Use tags for test organization**
10. **Enable debug logging when needed** 