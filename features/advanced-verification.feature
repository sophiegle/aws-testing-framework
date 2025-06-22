Feature: Advanced AWS Service Monitoring
  As a DevOps engineer
  I want to verify detailed CloudWatch logs and Step Function state outputs
  So that I can ensure comprehensive monitoring and data integrity in my serverless data pipelines

  Background:
    Given I have a Lambda function named "test-processor"
    And I have a Step Function named "test-pipeline"
    And I have an S3 bucket named "test-bucket"
    And I have an SQS queue named "test-queue"

  Scenario: Verify Lambda function logs and execution metrics
    When I upload a file "test-data.json" to the S3 bucket
    Then the Lambda function should be invoked
    And the Lambda function logs should contain "Processing file"
    And the Lambda function logs should not contain errors
    And the Lambda function should have acceptable execution metrics

  Scenario: Verify Step Function state outputs and data flow
    When I upload a file "test-data.json" to the S3 bucket
    Then the Step Function should be executed
    And the Step Function state "ProcessData" should have output containing '{"status": "success", "processed": true}'
    And the Step Function should have no data loss or corruption
    And the Step Function should meet performance SLAs

  Scenario: Verify comprehensive pipeline monitoring
    When I upload a file "test-data.json" to the S3 bucket
    Then the Lambda function should be invoked
    And the Lambda function logs should contain "File processed successfully"
    And the Lambda function should have acceptable execution metrics
    And the Step Function should be executed
    And the Step Function state "ValidateData" should have output containing '{"valid": true, "recordCount": 1}'
    And the Step Function should have no data loss or corruption
    And the Step Function should meet performance SLAs

  Scenario: Verify error handling and logging
    When I upload a file "invalid-data.json" to the S3 bucket
    Then the Lambda function should be invoked
    And the Lambda function logs should contain "Error processing file"
    And the Step Function should be executed
    And the Step Function state "ErrorHandler" should have output containing '{"error": "Invalid data format", "handled": true}'
    And the Step Function should have no data loss or corruption

  Scenario: Verify performance under load
    When I upload multiple files to the S3 bucket
    Then the Lambda function should be invoked multiple times
    And the Lambda function should have acceptable execution metrics
    And the Step Function should be executed multiple times
    And the Step Function should meet performance SLAs
    And the Step Function should have no data loss or corruption 