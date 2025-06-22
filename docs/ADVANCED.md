# Advanced Features and Examples

## Custom Step Definitions

### Creating Custom Steps

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { AWSTestingFramework } from 'aws-testing-framework';

const framework = new AWSTestingFramework();

// Custom S3 step with content validation
When('I upload a file {string} with content {string} to the S3 bucket', async function(fileName: string, content: string) {
  await framework.uploadFile(fileName, content);
  const downloadedContent = await framework.downloadFile(fileName);
  if (downloadedContent !== content) {
    throw new Error(`Content mismatch. Expected: ${content}, Got: ${downloadedContent}`);
  }
});

// Custom SQS step with message validation
Then('I should receive a message with content {string} from the queue', async function(expectedContent: string) {
  const messages = await framework.receiveMessages(this.queueUrl);
  const message = messages.find(m => m.Body === expectedContent);
  if (!message) {
    throw new Error(`Message with content ${expectedContent} not found`);
  }
});
```

### Complex AWS Workflows

#### S3 to Lambda via SQS

```gherkin
Feature: S3 to Lambda Integration via SQS
  As a developer
  I want to test my file processing pipeline
  So that I can ensure it works correctly

  Scenario: Process uploaded file
    Given I have an S3 bucket named "my-bucket"
    And I have an SQS queue named "my-queue"
    And I have a Lambda function named "my-function"
    When I upload a file "test.txt" with content "Hello, World!"
    Then the file should be processed by Lambda
    And the processed result should be "HELLO, WORLD!"
```

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { AWSTestingFramework } from 'aws-testing-framework';

const framework = new AWSTestingFramework();

Given('I have an S3 bucket named {string}', async function(bucketName: string) {
  await framework.createBucket(bucketName);
  this.bucketName = bucketName;
});

Given('I have an SQS queue named {string}', async function(queueName: string) {
  const queueUrl = await framework.createQueue(queueName);
  this.queueUrl = queueUrl;
});

Given('I have a Lambda function named {string}', async function(functionName: string) {
  const code = Buffer.from(`
    exports.handler = async (event) => {
      const records = event.Records;
      for (const record of records) {
        const body = JSON.parse(record.body);
        const s3Event = body.Records[0].s3;
        const bucket = s3Event.bucket.name;
        const key = s3Event.object.key;
        
        // Process the file
        const content = await getS3Object(bucket, key);
        const processed = content.toUpperCase();
        
        // Store the result
        await putS3Object(bucket, \`processed/\${key}\`, processed);
      }
    };
  `);
  
  await framework.createFunction(functionName, 'index.handler', code);
  this.functionName = functionName;
});

When('I upload a file {string} with content {string}', async function(fileName: string, content: string) {
  await framework.uploadFile(fileName, content);
});

Then('the file should be processed by Lambda', async function() {
  await framework.verifyLambdaInvocation(this.functionName);
});

Then('the processed result should be {string}', async function(expectedResult: string) {
  const processedKey = `processed/test.txt`;
  const result = await framework.downloadFile(processedKey);
  if (result !== expectedResult) {
    throw new Error(`Expected ${expectedResult}, got ${result}`);
  }
});
```

#### Step Functions with Error Handling

```gherkin
Feature: Step Functions Error Handling
  As a developer
  I want to test my error handling workflow
  So that I can ensure it handles failures gracefully

  Scenario: Handle Lambda failure
    Given I have a state machine named "error-handling-workflow"
    When I start an execution with input {"shouldFail": true}
    Then the execution should complete with status "FAILED"
    And the error should be handled correctly
```

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { AWSTestingFramework } from 'aws-testing-framework';

const framework = new AWSTestingFramework();

Given('I have a state machine named {string}', async function(name: string) {
  const definition = {
    StartAt: "ProcessData",
    States: {
      ProcessData: {
        Type: "Task",
        Resource: "arn:aws:lambda:region:account:function:process-data",
        Catch: [{
          ErrorEquals: ["States.ALL"],
          Next: "HandleError"
        }],
        Next: "Success"
      },
      HandleError: {
        Type: "Task",
        Resource: "arn:aws:lambda:region:account:function:handle-error",
        Next: "Success"
      },
      Success: {
        Type: "Succeed"
      }
    }
  };
  
  const arn = await framework.createStateMachine(name, JSON.stringify(definition));
  this.stateMachineArn = arn;
});

When('I start an execution with input {string}', async function(input: string) {
  const executionArn = await framework.startExecution(
    this.stateMachineArn,
    JSON.parse(input)
  );
  this.executionArn = executionArn;
});

Then('the execution should complete with status {string}', async function(expectedStatus: string) {
  const status = await framework.getExecutionStatus(this.executionArn);
  if (status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${status}`);
  }
});

Then('the error should be handled correctly', async function() {
  const executionDetails = await framework.getExecutionDetails(this.executionArn);
  const errorState = executionDetails.states.find(s => s.name === "HandleError");
  if (!errorState) {
    throw new Error("Error handling state was not executed");
  }
});
```

## Test Reporting

### Custom Report Format

```typescript
import { TestReporter } from 'aws-testing-framework';

class CustomReporter extends TestReporter {
  async generateCustomReport(): Promise<void> {
    const report = {
      summary: this.getSummary(),
      features: this.getFeatures(),
      scenarios: this.getScenarios(),
      steps: this.getSteps(),
      errors: this.getErrors(),
      duration: this.getDuration()
    };
    
    await this.writeReport('custom-report.json', report);
  }
}
```

### Report Analysis

```typescript
import { TestReporter } from 'aws-testing-framework';

const reporter = new TestReporter();

// Analyze test results
const analysis = {
  totalScenarios: reporter.getTotalScenarios(),
  passedScenarios: reporter.getPassedScenarios(),
  failedScenarios: reporter.getFailedScenarios(),
  averageDuration: reporter.getAverageDuration(),
  slowestScenarios: reporter.getSlowestScenarios(5),
  mostFailedSteps: reporter.getMostFailedSteps(5)
};

// Generate trend report
const trendReport = reporter.generateTrendReport({
  previousReports: ['report1.json', 'report2.json'],
  metrics: ['passRate', 'duration', 'errorRate']
});
```

## Performance Testing

### Load Testing Example

```typescript
import { AWSTestingFramework } from 'aws-testing-framework';

async function runLoadTest() {
  const framework = new AWSTestingFramework();
  const results = [];
  
  // Upload 100 files concurrently
  const uploads = Array(100).fill(null).map((_, i) => 
    framework.uploadFile(`test${i}.txt`, `content${i}`)
  );
  
  const startTime = Date.now();
  await Promise.all(uploads);
  const duration = Date.now() - startTime;
  
  // Measure Lambda processing time
  const processingTimes = await framework.measureLambdaProcessingTimes(
    'my-function',
    100
  );
  
  return {
    totalDuration: duration,
    averageProcessingTime: processingTimes.reduce((a, b) => a + b) / processingTimes.length,
    maxProcessingTime: Math.max(...processingTimes),
    minProcessingTime: Math.min(...processingTimes)
  };
}
```

## Best Practices

1. **Resource Management**
   - Always clean up resources after tests
   - Use unique resource names to avoid conflicts
   - Implement proper error handling

2. **Test Organization**
   - Group related scenarios in features
   - Use tags for test categorization
   - Keep step definitions focused and reusable

3. **Performance Considerations**
   - Use appropriate timeouts
   - Implement retry mechanisms
   - Monitor AWS service limits

4. **Security**
   - Use IAM roles with minimal permissions
   - Encrypt sensitive data
   - Follow AWS security best practices

5. **Maintenance**
   - Keep dependencies updated
   - Document custom steps
   - Regular test maintenance

## Real-World Examples

For comprehensive, real-world examples of these advanced features, check out the **[aws-testing-framework-test](https://github.com/sophiegle/aws-testing-framework-test)** repository.

This example project demonstrates:

- **Custom Step Definitions** - Creating business-specific step definitions
- **Extending Built-in Steps** - Overriding and enhancing framework functionality
- **Complex Workflows** - Testing multi-service integrations
- **Advanced Monitoring** - Custom validation and business logic
- **Error Handling** - Graceful failure scenarios
- **Performance Testing** - Load testing and metrics collection

The example project includes working implementations of:
- Custom notification workflows
- Data processing pipelines
- Extended validation and logging
- Business rule verification
- Error handling and recovery

```bash
# Explore the advanced examples
git clone https://github.com/sophiegle/aws-testing-framework-test.git
cd aws-testing-framework-test
npm install
# Follow the setup instructions to configure your AWS resources
npm run test:custom-steps    # Custom business logic examples
npm run test:extend-steps    # Extended framework examples
``` 