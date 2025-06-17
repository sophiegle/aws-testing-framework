Feature: S3 to Lambda Integration via SQS
  As a developer
  I want to test my S3 to Lambda integration
  So that I can ensure my file processing pipeline works correctly

  Scenario: Upload file triggers Lambda via SQS
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    And I have an SQS queue named "afti-queue"
    And I have a Lambda function named "afti-lambda-function"
    When I upload a file "test.txt" to the S3 bucket
    Then the Lambda function should be triggered

  Scenario: Upload file executes a state machine
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    And I have a Lambda function named "afti-lambda-function"
    And I have a Step Function named "AftiStateMachineC1791690-QAqGBKOfbfLM"
    When I upload a file "test.txt" to the S3 bucket
    Then the Step Function should be triggered
    Then the execution should complete successfully