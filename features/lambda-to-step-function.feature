Feature: Lambda to Step Function Integration
  As a developer
  I want to test Lambda function integration with Step Functions
  So that I can ensure my service integration works correctly

  Scenario: Lambda triggers specific Step Function
    Given I have a Lambda function named "afti-lambda-function"
    And I expect the Lambda function to trigger the Step Function named "AftiStateMachineC1791690-QAqGBKOfbfLM"
    When I invoke the Lambda function with payload '{"trigger": "step-function"}'
    Then the Lambda function should trigger the expected Step Function
    And the Step Function "AftiStateMachineC1791690-QAqGBKOfbfLM" should have recent executions

  Scenario: Verify Step Function execution details
    Given I have a Step Function named "AftiStateMachineC1791690-QAqGBKOfbfLM"
    When I start an execution with input '{"data": "test"}'
    Then the execution should complete successfully
    And the Step Function "AftiStateMachineC1791690-QAqGBKOfbfLM" should have recent executions 