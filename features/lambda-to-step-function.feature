Feature: Lambda to Step Function Integration
  As a developer
  I want to verify that my Lambda function triggers a specific Step Function
  So that I can ensure my workflow integration works correctly

  Scenario: Lambda triggers specific Step Function
    Given I have a Lambda function named "my-lambda-function"
    And I expect the Lambda function to trigger the Step Function named "my-state-machine"
    When I invoke the Lambda function with payload '{"trigger": "step-function"}'
    Then the Lambda function should trigger the expected Step Function
    And the Step Function "my-state-machine" should have recent executions

  Scenario: Verify Step Function execution details
    Given I have a Step Function named "my-state-machine"
    When I start an execution with input '{"data": "test"}'
    Then the execution should complete successfully
    And the Step Function "my-state-machine" should have recent executions 