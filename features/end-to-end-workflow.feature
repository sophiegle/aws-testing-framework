Feature: End-to-End Serverless Data Pipeline
  As a DevOps engineer
  I want to test complete serverless data pipelines
  So that I can ensure data flows correctly through all AWS services

  Background:
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    And I have an SQS queue named "afti-queue"
    And I have a Lambda function named "afti-lambda-function"
    And I have a Step Function named "AftiStateMachineC1791690"

  Scenario: Complete pipeline with traceability
    When I upload a file "test-pipeline.txt" with content "test-data-123" to the S3 bucket
    Then the S3 bucket should contain the file "test-pipeline.txt"

  Scenario: Verify message correlation through the pipeline
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    And I have an SQS queue named "afti-queue"
    And I have a Lambda function named "afti-lambda-function"
    And I have a Step Function named "AftiStateMachineC1791690-QAqGBKOfbfLM"
    When I upload a file "correlation-test.txt" with content "correlation-data-456" to the S3 bucket

  Scenario: Verify Lambda function performance and configuration
    Given I have a Lambda function named "afti-lambda-function"
    When I upload a file "performance-test.txt" with content "performance-data" to the S3 bucket
    Then the Lambda function should be invoked

  Scenario: Verify Step Function performance and definition
    Given I have a Step Function named "AftiStateMachineC1791690-QAqGBKOfbfLM"
    When I upload a file "step-function-test.txt" with content "step-function-data" to the S3 bucket
    Then the Step Function should be executed
    And the Step Function should have valid state machine definition
    And the Step Function performance should be acceptable

  Scenario: Complete end-to-end pipeline with file processing
    When I upload a file "test-data.json" with content "test-content" to the S3 bucket
    Then the Lambda function should be invoked
    And the Step Function should be executed
    And the Step Function performance should be acceptable 