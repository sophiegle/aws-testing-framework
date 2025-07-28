@lambda @execution-counting
Feature: Lambda Execution Counting
  As a developer testing Lambda functions
  I want to verify that Lambda functions are invoked a specific number of times
  So that I can ensure proper scaling and performance of my serverless applications

  Background:
    Given I have an S3 bucket named "awstestingframeworkinfrastructu-aftibucket816930f0-eebqmqrjqual"
    And I have a Lambda function named "afti-lambda-function"

  @single-execution
  Scenario: Verify Lambda function is invoked once
    When I upload a file "test-single.txt" to the S3 bucket
    Then the Lambda function should be invoked 1 times within 5 minutes

  @multiple-executions
  Scenario: Verify Lambda function is invoked multiple times
    When I upload multiple files to the S3 bucket
    Then the Lambda function should be invoked 3 times within 5 minutes

  @load-testing
  Scenario: Verify Lambda function handles load
    When I upload many files to the S3 bucket
    Then the Lambda function should be invoked 10 times within 10 minutes

  @performance-testing
  Scenario: Verify Lambda function performance under stress
    When I trigger multiple concurrent operations
    Then the Lambda function should be invoked 5 times within 2 minutes 