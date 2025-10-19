# Getting Started with AWS Testing Framework

**Welcome!** This guide will walk you through setting up the AWS Testing Framework from scratch and writing your first test.

**Time to first test**: ~15 minutes

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js 18+** installed ([Download](https://nodejs.org/))
- ✅ **AWS Account** with access to create resources
- ✅ **AWS CLI** installed and configured ([AWS CLI Setup](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
- ✅ **Basic knowledge** of Cucumber/Gherkin (helpful but not required)

---

## 🚀 Method 1: Quick Start (Recommended for New Users)

### Step 1: Install the Framework

```bash
# Create a new project directory
mkdir my-aws-tests
cd my-aws-tests

# Install the framework
npm install aws-testing-framework
```

### Step 2: Initialize Your Project

```bash
# Interactive setup (recommended for first-time users)
npx aws-testing-framework init --interactive
```

**You'll be prompted for:**
- Project name
- Template type (basic, comprehensive, ci, enterprise)
- AWS region
- Which AWS services to test (S3, Lambda, SQS, Step Functions)

**This creates:**
- `features/` directory with example feature files
- `cucumber.js` configuration
- `aws-testing-framework.config.json`
- Sample test files
- `.gitignore`

### Step 3: Configure AWS Credentials

```bash
# Option 1: Use AWS CLI (recommended)
aws configure
# Enter your AWS Access Key ID, Secret Key, and region

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key_here
export AWS_SECRET_ACCESS_KEY=your_secret_key_here
export AWS_REGION=us-east-1
```

### Step 4: Verify Your Environment

```bash
# Run the doctor command to check everything is set up correctly
npx aws-testing-framework doctor

# Expected output:
# ✅ Node.js version
# ✅ AWS credentials
# ✅ AWS service access (S3, Lambda, SQS, Step Functions)
# ✅ Configuration
# ✅ Project structure
```

### Step 5: Discover Available Steps

```bash
# See all available step definitions
npx aws-testing-framework steps

# Search for specific functionality
npx aws-testing-framework steps --search "lambda"
npx aws-testing-framework steps --search "upload"

# Filter by service
npx aws-testing-framework steps --service s3
```

### Step 6: Set Up AWS Resources

**Before running tests, you need AWS resources to test against.**

**Option A: Use Existing Resources**
```gherkin
# In features/my-test.feature, use your existing AWS resources
Feature: Test My Existing Lambda
  Scenario: Verify Lambda exists
    Given I have a Lambda function named "my-actual-lambda-name"
    Then the Lambda function should be invoked
```

**Option B: Deploy Test Infrastructure** (Recommended)

See the [AWS Environment Setup](#aws-environment-setup) section below for CloudFormation templates.

### Step 7: Write Your First Test

```bash
# Create a feature file
mkdir -p features
cat > features/my-first-test.feature << 'EOF'
Feature: My First AWS Test
  
  Scenario: Verify S3 bucket exists
    Given I have an S3 bucket named "your-actual-bucket-name"
    When I upload a file "test.txt" to the S3 bucket
    Then the S3 bucket should contain the file "test.txt"
EOF
```

### Step 8: Run Your Tests

```bash
# Run all tests
npx cucumber-js

# Run with HTML report
npx cucumber-js --format html:reports/test-results.html
```

---

## 🛠️ Method 2: Manual Setup (For Experienced Users)

### Step 1: Install Dependencies

```bash
npm install --save-dev aws-testing-framework @cucumber/cucumber ts-node typescript
```

### Step 2: Create Project Structure

```bash
mkdir -p features step_definitions reports
```

### Step 3: Configure Cucumber

Create `cucumber.js`:

```javascript
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['node_modules/aws-testing-framework/dist/cucumber-support.js'],
    format: [
      'progress',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json'
    ],
    formatOptions: { snippetInterface: 'async-await' }
  }
};
```

### Step 4: Create Your First Feature

Create `features/example.feature`:

```gherkin
Feature: AWS S3 Testing

  Scenario: Upload and verify file
    Given I have an S3 bucket named "my-test-bucket"
    When I upload a file "test-data.json" with content "{'test': true}" to the S3 bucket
    Then the S3 bucket should contain the file "test-data.json"
```

### Step 5: Configure AWS

Create `aws-testing-framework.config.json` (optional):

```json
{
  "aws": {
    "region": "us-east-1"
  },
  "defaultTimeout": 30000,
  "retryAttempts": 3,
  "enableLogging": true,
  "logLevel": "info"
}
```

### Step 6: Add NPM Scripts

Update your `package.json`:

```json
{
  "scripts": {
    "test": "cucumber-js",
    "test:watch": "cucumber-js --watch",
    "test:report": "cucumber-js --format html:reports/test-results.html"
  }
}
```

### Step 7: Run Tests

```bash
npm test
```

---

## 🏗️ AWS Environment Setup

### Option 1: Minimal Setup (Testing Existing Resources)

**No infrastructure needed!** Just point tests at your existing AWS resources:

```gherkin
Given I have an S3 bucket named "my-existing-bucket"
And I have a Lambda function named "my-existing-function"
```

### Option 2: Full Pipeline Setup (Recommended for Learning)

For end-to-end testing, you'll want:

**Required AWS Resources:**
1. **S3 Bucket** with event notifications
2. **SQS Queue** to receive S3 events
3. **Lambda Function** triggered by SQS
4. **Step Function** (optional) triggered by Lambda
5. **IAM Roles** with proper permissions

**Quick Deploy with CloudFormation:**

```yaml
# test-infrastructure.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AWS Testing Framework - Test Infrastructure'

Resources:
  # S3 Bucket for testing
  TestBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'aws-testing-${AWS::AccountId}'
      NotificationConfiguration:
        QueueConfigurations:
          - Event: 's3:ObjectCreated:*'
            Queue: !GetAtt TestQueue.Arn
  
  # SQS Queue
  TestQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: 'aws-testing-queue'
      VisibilityTimeout: 300
  
  # Queue Policy (allows S3 to send messages)
  TestQueuePolicy:
    Type: AWS::SQS::QueuePolicy
    Properties:
      Queues:
        - !Ref TestQueue
      PolicyDocument:
        Statement:
          - Effect: Allow
            Principal:
              Service: s3.amazonaws.com
            Action: 'SQS:SendMessage'
            Resource: !GetAtt TestQueue.Arn
            Condition:
              ArnLike:
                aws:SourceArn: !GetAtt TestBucket.Arn
  
  # Lambda Execution Role
  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: 'sts:AssumeRole'
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        - 'arn:aws:iam::aws:policy/AWSStepFunctionsFullAccess'
      Policies:
        - PolicyName: S3Access
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - 's3:GetObject'
                  - 's3:PutObject'
                Resource: !Sub '${TestBucket.Arn}/*'
        - PolicyName: SQSAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - 'sqs:ReceiveMessage'
                  - 'sqs:DeleteMessage'
                  - 'sqs:GetQueueAttributes'
                Resource: !GetAtt TestQueue.Arn
  
  # Lambda Function (simple example)
  TestFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: 'aws-testing-function'
      Runtime: nodejs18.x
      Role: !GetAtt LambdaRole.Arn
      Handler: index.handler
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            console.log('Event received:', JSON.stringify(event, null, 2));
            
            // Log the S3 file key for tracking
            if (event.Records && event.Records[0].s3) {
              const key = event.Records[0].s3.object.key;
              console.log(`Processing file: ${key}`);
            }
            
            return { statusCode: 200, body: 'Success' };
          };
      Timeout: 60
  
  # Lambda SQS Event Source
  LambdaEventSource:
    Type: AWS::Lambda::EventSourceMapping
    Properties:
      EventSourceArn: !GetAtt TestQueue.Arn
      FunctionName: !Ref TestFunction
      BatchSize: 1

Outputs:
  BucketName:
    Value: !Ref TestBucket
    Description: 'S3 Bucket for testing'
  
  QueueName:
    Value: !GetAtt TestQueue.QueueName
    Description: 'SQS Queue name'
  
  QueueUrl:
    Value: !Ref TestQueue
    Description: 'SQS Queue URL'
  
  FunctionName:
    Value: !Ref TestFunction
    Description: 'Lambda function name'
```

**Deploy the stack:**

```bash
# Deploy the infrastructure
aws cloudformation create-stack \
  --stack-name aws-testing-framework-infra \
  --template-body file://test-infrastructure.yaml \
  --capabilities CAPABILITY_IAM

# Wait for stack to complete
aws cloudformation wait stack-create-complete \
  --stack-name aws-testing-framework-infra

# Get the output values
aws cloudformation describe-stacks \
  --stack-name aws-testing-framework-infra \
  --query 'Stacks[0].Outputs'
```

**Use the outputs in your tests:**

```gherkin
Feature: Test AWS Infrastructure

  Scenario: End-to-end file processing
    Given I have an S3 bucket named "aws-testing-123456789012"
    And I have an SQS queue named "aws-testing-queue"
    And I have a Lambda function named "aws-testing-function"
    
    When I upload a file "test.txt" to the S3 bucket
    Then the S3 bucket should contain the file "test.txt"
    And the Lambda function should be invoked
```

---

## 🎓 Learning Path

### Level 1: Basic Testing (15 minutes)

**Goal**: Verify AWS resources exist

```gherkin
Feature: Resource Validation

  Scenario: Verify resources exist
    Given I have an S3 bucket named "my-bucket"
    And I have a Lambda function named "my-function"
    # That's it! Tests pass if resources exist
```

### Level 2: Integration Testing (30 minutes)

**Goal**: Test service interactions

```gherkin
Feature: File Upload Integration

  Scenario: Upload triggers Lambda
    Given I have an S3 bucket named "uploads"
    And I have a Lambda function named "file-processor"
    
    When I upload a file "data.json" with content "{'test': true}" to the S3 bucket
    
    Then the S3 bucket should contain the file "data.json"
    And the Lambda function should be invoked
```

### Level 3: Advanced Testing (1 hour)

**Goal**: Full pipeline validation with verification

```gherkin
Feature: Complete Workflow

  Scenario: End-to-end processing
    Given I have an S3 bucket named "uploads"
    And I have a Lambda function named "processor"
    And I have a Step Function named "workflow"
    
    When I upload a file "order.json" with content "{'orderId': '123'}" to the S3 bucket
    
    Then the Lambda function should be invoked
    And the Lambda function logs should not contain errors
    And the Step Function should be executed
    And the Step Function execution should succeed
```

### Level 4: Expert Testing (2+ hours)

**Goal**: Performance, load, and execution counting

```gherkin
Feature: Performance Testing

  Scenario: Verify Lambda execution count
    Given I have an S3 bucket named "uploads"
    And I have a Lambda function named "processor"
    
    When I upload multiple files to the S3 bucket
    Then the Lambda function should be invoked 3 times within 5 minutes
    
  Scenario: Concurrent processing
    Given I have a Lambda function named "processor"
    When I trigger multiple concurrent operations
    Then the Lambda function should be invoked 5 times within 2 minutes
```

---

## 🔧 Configuration Options

### Minimal Configuration (Default)

No config file needed! The framework uses sensible defaults:

```javascript
{
  aws: { region: process.env.AWS_REGION || 'us-east-1' },
  defaultTimeout: 30000,
  retryAttempts: 3,
  enableLogging: false
}
```

### Custom Configuration

Create `aws-testing-framework.config.json`:

```json
{
  "aws": {
    "region": "us-west-2",
    "profile": "my-aws-profile"
  },
  "defaultTimeout": 60000,
  "retryAttempts": 5,
  "retryDelay": 2000,
  "enableLogging": true,
  "logLevel": "debug",
  "lambda": {
    "defaultInvocationTimeout": 300000,
    "maxInvocationTimeout": 900000
  }
}
```

### Environment-Specific Configuration

```bash
# development-config.js
module.exports = {
  aws: { region: 'us-east-1' },
  enableLogging: true,
  logLevel: 'debug'
};

# production-config.js
module.exports = {
  aws: { region: 'us-west-2' },
  enableLogging: false,
  defaultTimeout: 60000
};

# Use with:
NODE_ENV=development npm test
NODE_ENV=production npm test
```

---

## 🎯 Common Scenarios

### Scenario 1: Testing a Single Lambda

**What you need:**
- One Lambda function deployed in AWS

**Test file:**
```gherkin
Feature: Lambda Testing

  Scenario: Verify Lambda can be invoked
    Given I have a Lambda function named "my-function-name"
    When I invoke the Lambda function with payload "{"test":"data"}"
    Then the Lambda function should return "success"
```

**Run:**
```bash
npx cucumber-js features/lambda-test.feature
```

### Scenario 2: Testing S3 to Lambda Pipeline

**What you need:**
- S3 bucket with event notifications to SQS
- SQS queue
- Lambda function with SQS trigger

**Test file:**
```gherkin
Feature: S3 to Lambda Pipeline

  Scenario: File upload triggers Lambda
    Given I have an S3 bucket named "my-bucket"
    And I have a Lambda function named "my-processor"
    
    When I upload a file "test.txt" to the S3 bucket
    
    Then the S3 bucket should contain the file "test.txt"
    And the Lambda function should be invoked
```

### Scenario 3: Complete Serverless Workflow

**What you need:**
- S3 bucket → SQS queue → Lambda function → Step Function

**Test file:**
```gherkin
Feature: Complete Workflow

  Scenario: End-to-end data processing
    Given I have an S3 bucket named "uploads"
    And I have an SQS queue named "file-queue"
    And I have a Lambda function named "processor"
    And I have a Step Function named "workflow"
    
    When I upload a file "data.json" with content "{"id":1}" to the S3 bucket
    
    Then the S3 bucket should contain the file "data.json"
    And the Lambda function should be invoked
    And the Step Function should be executed
    And the Step Function execution should succeed
```

---

## 🐛 Troubleshooting

### Problem: "Step definitions not found"

**Solution:**
```bash
# Check cucumber.js configuration
cat cucumber.js

# Should include:
require: ['node_modules/aws-testing-framework/dist/cucumber-support.js']
```

### Problem: "AWS credentials not found"

**Solution:**
```bash
# Verify AWS credentials
aws sts get-caller-identity

# If this fails, configure AWS:
aws configure

# Or use environment variables:
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_REGION=us-east-1
```

### Problem: "Resource not found"

**Solution:**
```bash
# Run doctor to check AWS access
npx aws-testing-framework doctor

# Verify resource names match exactly:
aws s3 ls  # List your S3 buckets
aws lambda list-functions --query 'Functions[].FunctionName'
aws sqs list-queues
aws stepfunctions list-state-machines --query 'stateMachines[].name'
```

### Problem: "Tests timeout"

**Solution:**
```javascript
// Increase timeout in cucumber.js
module.exports = {
  default: {
    timeout: 60000,  // 60 seconds
    // ... rest of config
  }
};

// Or in config file:
{
  "defaultTimeout": 60000,
  "lambda": {
    "defaultInvocationTimeout": 300000
  }
}
```

### Problem: "Lambda function not invoked"

**Checklist:**
1. ✅ S3 event notifications configured?
2. ✅ SQS queue receiving messages?
3. ✅ Lambda has SQS trigger configured?
4. ✅ Lambda has permissions to be invoked?
5. ✅ Wait long enough (S3→SQS→Lambda can take 1-5 seconds)

**Debug:**
```bash
# Check CloudWatch logs manually
aws logs tail /aws/lambda/your-function-name --follow

# In your test, add delay:
When I upload a file "test.txt" to the S3 bucket
And I wait for 5 seconds  # Give time for propagation
Then the Lambda function should be invoked
```

---

## 📖 Example Tests

### S3 Operations

```gherkin
Feature: S3 Testing

  Scenario: Upload single file
    Given I have an S3 bucket named "test-bucket"
    When I upload a file "test.txt" to the S3 bucket
    Then the S3 bucket should contain the file "test.txt"
  
  Scenario: Upload with custom content
    Given I have an S3 bucket named "test-bucket"
    When I upload a file "data.json" with content "{"key":"value"}" to the S3 bucket
    Then the S3 bucket should contain the file "data.json"
  
  Scenario: Upload multiple files
    Given I have an S3 bucket named "test-bucket"
    When I upload multiple files to the S3 bucket
    Then the S3 bucket should contain the file "file1.txt"
    And the S3 bucket should contain the file "file2.txt"
    And the S3 bucket should contain the file "file3.txt"
```

### Lambda Testing

```gherkin
Feature: Lambda Testing

  Scenario: Invoke Lambda directly
    Given I have a Lambda function named "test-function"
    When I invoke the Lambda function with payload "{"test":"data"}"
    Then the Lambda function should return "success"
  
  Scenario: Verify Lambda logs
    Given I have a Lambda function named "test-function"
    When I invoke the Lambda function with payload "{"action":"process"}"
    Then the Lambda function logs should not contain errors
  
  Scenario: Count Lambda executions
    Given I have an S3 bucket named "uploads"
    And I have a Lambda function named "processor"
    When I upload multiple files to the S3 bucket
    Then the Lambda function should be invoked 3 times within 5 minutes
```

### SQS Operations

```gherkin
Feature: SQS Testing

  Scenario: Send and receive message
    Given I have an SQS queue named "test-queue"
    When I send a message "test message" to the SQS queue
    Then the SQS queue should receive a notification
```

### Step Functions

```gherkin
Feature: Step Function Testing

  Scenario: Execute state machine
    Given I have a Step Function named "test-workflow"
    When I start the Step Function execution with input "{"test":"data"}"
    Then the Step Function execution should succeed
  
  Scenario: Verify execution completes
    Given I have a Step Function named "test-workflow"
    When I start the Step Function execution with input "{"action":"process"}"
    Then the Step Function should be executed
```

---

## 🔑 Key Concepts

### Step Context

Each scenario maintains a context that carries information between steps:

```gherkin
Given I have an S3 bucket named "my-bucket"
# Sets: this.bucketName = "my-bucket"

When I upload a file "test.txt" to the S3 bucket
# Uses: this.bucketName (from previous step)
# Sets: this.uploadedFileName = "test.txt"

Then the S3 bucket should contain the file "test.txt"
# Uses: this.bucketName and this.uploadedFileName
```

### Service Classes

The framework provides service classes you can use programmatically:

```typescript
import { AWSTestingFramework } from 'aws-testing-framework';

const framework = AWSTestingFramework.create({
  aws: { region: 'us-east-1' }
});

// Access services directly
await framework.container.s3Service.uploadFile('bucket', 'file', 'content');
await framework.container.lambdaService.invokeFunction('fn', {});
await framework.container.healthValidator.validateAWSSetup();
```

---

## 💡 Best Practices

### 1. Use Descriptive Resource Names

```gherkin
# ❌ Bad
Given I have a Lambda function named "lambda1"

# ✅ Good
Given I have a Lambda function named "order-processor"
```

### 2. Test Realistic Scenarios

```gherkin
# ❌ Too simple
When I upload a file "test.txt" to the S3 bucket

# ✅ Realistic
When I upload a file "customer-order-12345.json" with content "{"customerId":123,"items":[1,2,3]}" to the S3 bucket
```

### 3. Use Background for Common Setup

```gherkin
Feature: Order Processing

  Background:
    Given I have an S3 bucket named "orders"
    And I have a Lambda function named "order-processor"
    And I have a Step Function named "order-workflow"
  
  Scenario: Process valid order
    When I upload a file "order-001.json" with content "..." to the S3 bucket
    Then the Lambda function should be invoked
  
  Scenario: Process invalid order
    When I upload a file "invalid.json" with content "..." to the S3 bucket
    Then the Lambda function should be invoked
```

### 4. Clean Up After Tests

```gherkin
Feature: Clean Testing

  Scenario: Test with cleanup
    Given I have an S3 bucket named "test-bucket"
    When I upload a file "temp-test.txt" to the S3 bucket
    Then the S3 bucket should contain the file "temp-test.txt"
    # Cleanup happens automatically in After hooks
```

---

## 🚀 Next Steps

### Once You're Comfortable:

1. **Explore Advanced Features**
   - Lambda execution counting
   - CloudWatch log analysis
   - Step Function state verification
   - Custom step definitions

2. **Integrate with CI/CD**
   - Add to GitHub Actions / GitLab CI
   - Generate HTML reports
   - Upload reports to S3
   - Send Slack notifications

3. **Write Custom Steps**
   - Extend existing step classes
   - Create domain-specific steps
   - Add custom validation logic

4. **Explore the Example Project**
   - Clone: https://github.com/sophiegle/aws-testing-framework-test
   - See all usage patterns
   - Use as template for your tests

---

## 📚 Additional Resources

- **[README](README.md)** - Feature overview and API reference
- **[CHANGELOG](CHANGELOG.md)** - Version history and updates
- **[CONTRIBUTING](CONTRIBUTING.md)** - How to contribute
- **[Examples](examples/)** - Code examples and configurations
- **[GitHub Issues](https://github.com/sophiegle/aws-testing-framework/issues)** - Report bugs or request features

---

## 🆘 Getting Help

**Stuck?** Here's how to get help:

1. **Run the doctor:**
   ```bash
   npx aws-testing-framework doctor --verbose
   ```

2. **Check available steps:**
   ```bash
   npx aws-testing-framework steps --search "what you're trying to do"
   ```

3. **Review examples:**
   - Check the [examples directory](examples/)
   - Clone the [example project](https://github.com/sophiegle/aws-testing-framework-test)

4. **Ask for help:**
   - [Create an issue](https://github.com/sophiegle/aws-testing-framework/issues/new)
   - [Start a discussion](https://github.com/sophiegle/aws-testing-framework/discussions)

---

**Happy Testing!** 🎉

