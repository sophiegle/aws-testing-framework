@step-function @comprehensive
Feature: Comprehensive Step Function Testing
  As a developer testing AWS Step Functions
  I want to verify all Step Function service methods work correctly
  So that I can ensure robust Step Function testing capabilities

  Background:
    Given I have AWS credentials configured
    And I have a Step Function named "test-state-machine"

  @basic-operations
  Scenario: Basic Step Function operations work correctly
    Given I have a Step Function named "test-state-machine"
    When I start a Step Function execution with input '{"test": "data"}'
    Then the Step Function execution should succeed
    And the Step Function should have valid state machine definition
    And the Step Function should be executed

  @execution-tracking
  Scenario: Step Function execution tracking and monitoring
    Given I have a Step Function named "test-state-machine"
    When I start a Step Function execution with input '{"test": "data"}'
    Then I should be able to list executions for the Step Function
    And I should be able to track execution details for the Step Function
    And I should be able to get execution history for the Step Function
    And the Step Function should have been triggered within 30 seconds

  @performance-analysis
  Scenario: Step Function performance analysis
    Given I have a Step Function named "test-state-machine"
    When I start a Step Function execution with input '{"test": "data"}'
    Then the Step Function execution should succeed
    And the Step Function performance should be acceptable
    And the Step Function execution should complete within 60000 milliseconds

  @state-verification
  Scenario: Step Function state verification and output analysis
    Given I have a Step Function named "test-state-machine"
    When I start a Step Function execution with input '{"test": "data"}'
    Then the Step Function execution should succeed
    And I should be able to get state outputs for the Step Function execution
    And I should be able to verify state output for state "ProcessData" with expected data '{"status": "completed"}'

  @data-flow-analysis
  Scenario: Step Function data flow analysis
    Given I have a Step Function named "test-state-machine"
    When I start a Step Function execution with input '{"test": "data"}'
    Then the Step Function execution should succeed
    And I should be able to analyze data flow for the Step Function execution
    And the Step Function execution should have no data loss or corruption

  @sla-verification
  Scenario: Step Function SLA verification
    Given I have a Step Function named "test-state-machine"
    When I start a Step Function execution with input '{"test": "data"}'
    Then the Step Function execution should succeed
    And I should be able to verify SLAs for the Step Function execution

  @definition-validation
  Scenario: Step Function definition validation
    Given I have a Step Function named "test-state-machine"
    Then the Step Function should have valid state machine definition
    And the Step Function definition should have at least 2 states

  @execution-monitoring
  Scenario: Step Function execution monitoring and status checking
    Given I have a Step Function named "test-state-machine"
    When I start a Step Function execution with input '{"test": "data"}'
    Then I should be able to check if the Step Function has recent executions
    And the Step Function execution should complete all expected states: "StartState, ProcessData, EndState"

  @error-handling
  Scenario: Step Function error handling and resilience
    Given I have a Step Function named "non-existent-state-machine"
    When I try to start a Step Function execution with input '{"test": "data"}'
    Then the operation should fail with appropriate error message

  @configuration-testing
  Scenario: Step Function service with custom configuration
    Given I have a Step Function named "test-state-machine" with custom configuration
    When I start a Step Function execution with input '{"test": "data"}'
    Then the Step Function execution should succeed
    And all operations should use the custom configuration settings

  @retry-mechanism
  Scenario: Step Function service retry mechanism
    Given I have a Step Function named "test-state-machine"
    When I start a Step Function execution with input '{"test": "data"}'
    Then the service should handle transient failures gracefully
    And the operation should retry with exponential backoff

  @logging-verification
  Scenario: Step Function service logging and debugging
    Given I have a Step Function named "test-state-machine" with logging enabled
    When I start a Step Function execution with input '{"test": "data"}'
    Then the service should log all operations with appropriate detail
    And the logs should include timing and performance metrics

  @comprehensive-workflow
  Scenario: Complete Step Function testing workflow
    Given I have a Step Function named "test-state-machine"
    When I start a Step Function execution with input '{"test": "data"}'
    Then the Step Function execution should succeed
    And the Step Function should have valid state machine definition
    And I should be able to list executions for the Step Function
    And I should be able to track execution details for the Step Function
    And I should be able to get execution history for the Step Function
    And I should be able to get state outputs for the Step Function execution
    And I should be able to analyze data flow for the Step Function execution
    And I should be able to verify SLAs for the Step Function execution
    And the Step Function execution should have no data loss or corruption
    And the Step Function should have been triggered within 30 seconds
    And I should be able to check if the Step Function has recent executions
    And the Step Function definition should have at least 2 states
    And the Step Function execution should complete all expected states: "StartState, ProcessData, EndState"
    And the Step Function performance should be acceptable
    And the Step Function execution should complete within 60000 milliseconds 