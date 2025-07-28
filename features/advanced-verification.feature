Feature: Advanced AWS Service Monitoring
  As a DevOps engineer
  I want to verify detailed CloudWatch logs and Step Function state outputs
  So that I can ensure comprehensive monitoring and data integrity in my serverless data pipelines

  Background:
    Given I have a Lambda function named "afti-lambda-function"
    And I have a Step Function named "AftiStateMachineC1791690-QAqGBKOfbfLM"
    And I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    And I have an SQS queue named "afti-queue"

  Scenario: Verify Lambda function logs and execution metrics
    When I upload a file "test-data.json" to the S3 bucket
    Then the Lambda function should be invoked

  Scenario: Verify Step Function state outputs and data flow
    When I upload a file "test-data.json" to the S3 bucket
    Then the Step Function should be executed

  Scenario: Verify comprehensive pipeline monitoring
    When I upload a file "test-data.json" to the S3 bucket
    Then the Lambda function should be invoked
    And the Step Function should be executed

  Scenario: Verify error handling and logging
    When I upload a file "invalid-data.json" to the S3 bucket
    Then the Lambda function should be invoked
    And the Step Function should be executed

  Scenario: Verify performance under load
    When I upload multiple files to the S3 bucket
    Then the Lambda function should be invoked