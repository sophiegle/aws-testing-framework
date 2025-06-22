Feature: Basic Pipeline
  As a developer
  I want to test my S3 to Lambda to Step Function pipeline
  So that I can ensure data flows correctly

  Scenario: Process uploaded file
    Given I have an S3 bucket named "my-bucket"
    And I have a Lambda function named "my-processor"
    And I have a Step Function named "my-pipeline"
    When I upload a file "test-data.json" with content "test-content" to the S3 bucket
    Then the Lambda function should be invoked
    And the Step Function should be executed
    And I should be able to trace the file "test-data.json" through the entire pipeline 