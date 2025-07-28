Feature: S3 to Lambda Integration via SQS
  As a developer
  I want to test my S3 to Lambda integration
  So that I can ensure my file processing pipeline works correctly

  Scenario: Upload basic file to S3
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    When I upload a file "test.txt" to the S3 bucket
    Then the S3 bucket should contain the file "test.txt"

  Scenario: Upload file with custom content
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    When I upload a file "test-custom-content.txt" with content "custom data" to the S3 bucket
    Then the S3 bucket should contain the file "test-custom-content.txt"

  Scenario: Upload multiple files to S3
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    When I upload multiple files to the S3 bucket
    Then the S3 bucket should contain the file "file1.json"
    And the S3 bucket should contain the file "file2.json"
    And the S3 bucket should contain the file "file3.json"

  Scenario: Upload file triggers Lambda via SQS
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    And I have an SQS queue named "afti-queue"
    And I have a Lambda function named "afti-lambda-function"
    When I upload a file "test.txt" to the S3 bucket
    Then the S3 bucket should contain the file "test.txt"
    Then the Lambda function should be invoked

  Scenario: Upload file executes a state machine
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    And I have a Lambda function named "afti-lambda-function"
    And I have a Step Function named "AftiStateMachineC1791690-QAqGBKOfbfLM"
    When I upload a file "test.txt" to the S3 bucket