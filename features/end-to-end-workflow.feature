Feature: End-to-End Serverless Workflow
  As a developer
  I want to test my complete serverless architecture
  So that I can ensure data flows correctly through the entire pipeline

  Background:
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    And I have an SQS queue named "afti-queue"
    And I have a Lambda function named "afti-lambda-function"
    And I have a Step Function named "AftiStateMachineC1791690-QAqGBKOfbfLM"

  Scenario: Complete workflow with traceability
    When I upload a file "test-workflow.txt" with content "test-data-123" to the S3 bucket
    Then the S3 bucket should contain the file "test-workflow.txt"
    # Skipping SQS message checks
    And the Lambda function should consume the SQS message
    And the Lambda function should process the exact file "test-workflow.txt"
    And the Lambda function should trigger the Step Function "AftiStateMachineC1791690-QAqGBKOfbfLM"
    And the Step Function execution should contain the file reference "test-workflow.txt"
    And the Step Function execution should complete successfully
    And the Lambda function should have no errors in the last 5 minutes
    And the Lambda function should execute within 30000 milliseconds
    And the Lambda function should have proper configuration
    And the Step Function should have valid state machine definition
    And the Step Function performance should be acceptable

  Scenario: Verify message correlation through the pipeline
    When I upload a file "correlation-test.txt" with content "correlation-data-456" to the S3 bucket
    Then I should be able to trace the file "correlation-test.txt" through the entire workflow
    # Skipping SQS message correlation checks
    And the Lambda execution should correlate with the SQS message
    And the Step Function execution should correlate with the Lambda execution

  Scenario: Advanced performance and reliability testing
    When I upload a file "performance-test.txt" with content "performance-data-789" to the S3 bucket
    Then the Lambda function should consume the SQS message
    And the Lambda function should trigger the Step Function "AftiStateMachineC1791690-QAqGBKOfbfLM"
    And the Step Function execution should complete within 60000 milliseconds
    And the Step Function should complete all expected states: "HelloWorld"
    And the Lambda function should have no errors in the last 10 minutes 

  Scenario: Complete end-to-end workflow with file processing
    When I upload a file "test-data.json" to the S3 bucket
    Then the Lambda function should be invoked
    And the Lambda function logs should contain "Processing file"
    And the Lambda function logs should not contain errors
    And the Lambda function should have acceptable execution metrics
    And the Step Function should be executed
    And the Step Function state "ProcessData" should have output containing '{"status": "success"}'
    And the Step Function should have no data loss or corruption
    And the Step Function should meet performance SLAs
    And the Step Function performance should be acceptable 