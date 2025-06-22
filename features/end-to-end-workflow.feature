Feature: End-to-End Serverless Data Pipeline
  As a DevOps engineer
  I want to test complete serverless data pipelines
  So that I can ensure data flows correctly through all AWS services

  Background:
    Given I have an S3 bucket named "test-bucket"
    And I have an SQS queue named "test-queue"
    And I have a Lambda function named "test-processor"
    And I have a Step Function named "test-pipeline"

  Scenario: Complete pipeline with traceability
    When I upload a file "test-pipeline.txt" with content "test-data-123" to the S3 bucket
    Then the S3 bucket should contain the file "test-pipeline.txt"
    And the Lambda function should consume the SQS message
    And the Lambda function should process the exact file "test-pipeline.txt"
    And the Lambda function should trigger the Step Function "test-pipeline"
    And the Step Function execution should contain the file reference "test-pipeline.txt"
    And the Step Function execution should complete successfully
    And I should be able to trace the file "test-pipeline.txt" through the entire pipeline
    And the Lambda execution should correlate with the SQS message
    And the Step Function execution should correlate with the Lambda execution

  Scenario: Verify message correlation through the pipeline
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    And I have an SQS queue named "afti-queue"
    And I have a Lambda function named "afti-lambda-function"
    And I have a Step Function named "AftiStateMachineC1791690-QAqGBKOfbfLM"
    When I upload a file "correlation-test.txt" with content "correlation-data-456" to the S3 bucket
    Then I should be able to trace the file "correlation-test.txt" through the entire pipeline
    And the Lambda execution should correlate with the SQS message
    And the Step Function execution should correlate with the Lambda execution

  Scenario: Verify Lambda function performance and configuration
    Given I have a Lambda function named "test-processor"
    When I upload a file "performance-test.txt" with content "performance-data" to the S3 bucket
    Then the Lambda function should be invoked
    And the Lambda function should have no errors in the last 10 minutes
    And the Lambda function should execute within 5000 milliseconds
    And the Lambda function should have proper configuration

  Scenario: Verify Step Function performance and definition
    Given I have a Step Function named "test-pipeline"
    When I upload a file "step-function-test.txt" with content "step-function-data" to the S3 bucket
    Then the Step Function should be executed
    And the Step Function should complete all expected states: "HelloWorld"
    And the Step Function should have valid state machine definition
    And the Step Function performance should be acceptable

  Scenario: Complete end-to-end pipeline with file processing
    When I upload a file "test-data.json" with content "test-content" to the S3 bucket
    Then the Lambda function should be invoked
    And the Lambda function logs should contain "Processing file"
    And the Lambda function logs should not contain errors
    And the Lambda function should have acceptable execution metrics
    And the Step Function should be executed
    And the Step Function state "ProcessData" should have output containing '{"status": "success"}'
    And the Step Function should have no data loss or corruption
    And the Step Function should meet performance SLAs
    And the Step Function performance should be acceptable 