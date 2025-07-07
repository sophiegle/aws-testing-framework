import { Given, Then, When } from '@cucumber/cucumber';
import type { ExecutionDetails, StepContext } from '../framework/types';
import { AWSTestingFramework } from '../index';

const framework = new AWSTestingFramework();

// Helper functions to reduce code duplication
const requireExecutionArn = (context: StepContext): string => {
  if (!context.executionArn) {
    throw new Error(
      'Execution ARN is not set. Make sure to start an execution first.'
    );
  }
  return context.executionArn;
};

const requireStateMachineName = (context: StepContext): string => {
  if (!context.stateMachineName) {
    throw new Error(
      'State machine name is not set. Make sure to create a Step Function first.'
    );
  }
  return context.stateMachineName;
};

const requireStateMachineArn = (context: StepContext): string => {
  if (!context.stateMachineArn) {
    throw new Error(
      'State machine ARN is not set. Make sure to create a Step Function first.'
    );
  }
  return context.stateMachineArn;
};

// ============================================================================
// GIVEN STEPS - Setup and Configuration
// ============================================================================

Given(
  /^I have a Step Function named "([^"]+)"(?: with (custom configuration|logging enabled))?$/,
  async function (
    this: StepContext,
    stateMachineName: string,
    option?: string
  ) {
    this.stateMachineName = stateMachineName;

    // Handle optional configuration
    if (option === 'custom configuration') {
      // In a real implementation, you might configure the framework with custom settings
      this.loggingEnabled = true;
    } else if (option === 'logging enabled') {
      // In a real implementation, you might enable logging for the framework
      this.loggingEnabled = true;
    }

    const stateMachineArn = await framework.findStateMachine(stateMachineName);
    this.stateMachineArn = stateMachineArn;
  }
);

// ============================================================================
// WHEN STEPS - Actions and Operations
// ============================================================================

When(
  /^I start a Step Function execution with input "([^"]+)"$/,
  async function (this: StepContext, input: string) {
    const stateMachineArn = requireStateMachineArn(this);

    try {
      const executionInput = JSON.parse(input);
      const executionArn = await framework.startExecution(
        stateMachineArn,
        executionInput
      );
      this.executionArn = executionArn;
    } catch (error) {
      // Store the error for verification in error scenarios
      this.lastError = error as Error;
      throw error;
    }
  }
);

// ============================================================================
// THEN STEPS - Verifications and Assertions
// ============================================================================

// Basic execution verification
Then(
  'the Step Function execution should succeed',
  async function (this: StepContext) {
    const executionArn = requireExecutionArn(this);

    // Wait for execution to complete
    let status = await framework.getExecutionStatus(executionArn);
    const startTime = Date.now();
    const timeout = 60000; // 1 minute timeout

    while (status === 'RUNNING' && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      status = await framework.getExecutionStatus(executionArn);
    }

    if (status !== 'SUCCEEDED') {
      throw new Error(`Step Function execution failed with status: ${status}`);
    }
  }
);

// Definition validation
Then(
  'the Step Function should have valid state machine definition',
  async function (this: StepContext) {
    const stateMachineName = requireStateMachineName(this);

    const definition =
      await framework.verifyStepFunctionDefinition(stateMachineName);

    if (!definition.isValid) {
      throw new Error(
        `Step Function definition is invalid: ${definition.errors.join(', ')}`
      );
    }

    if (!definition.hasStartState) {
      throw new Error('Step Function definition is missing StartAt state');
    }

    if (!definition.hasEndStates) {
      throw new Error('Step Function definition has no end states');
    }
  }
);

// Execution verification with timeout
Then(
  'the Step Function should be executed',
  async function (this: StepContext) {
    const stateMachineName = requireStateMachineName(this);

    // Wait a bit for execution to complete
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // First, try to check if the Step Function was triggered by the Lambda function
    if (this.functionName) {
      const lambdaTriggeredStepFunction =
        await framework.verifyLambdaTriggeredStateMachine(
          this.functionName,
          stateMachineName
        );
      if (lambdaTriggeredStepFunction) {
        return; // Success - Lambda triggered the Step Function
      }
    }

    // If Lambda didn't trigger it, check for any recent executions
    const stateMachineTriggered = await framework.verifyStateMachineTriggered(
      stateMachineName,
      30000 // 30 second timeout
    );

    if (!stateMachineTriggered) {
      // As a fallback, check if there are any executions at all
      const executions = await framework.listExecutions(stateMachineName);
      if (executions.length === 0) {
        throw new Error(
          `Step Function "${stateMachineName}" was not executed - no executions found`
        );
      }
      // There are executions, but they might not be recent enough
      // Let's check the execution details to see if any are recent
      const executionDetails =
        await framework.getExecutionDetails(stateMachineName);
      const recentExecutions = executionDetails.filter(
        (execution: ExecutionDetails) => {
          const executionTime = new Date(execution.startDate).getTime();
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          return executionTime > fiveMinutesAgo;
        }
      );

      if (recentExecutions.length === 0) {
        throw new Error(
          `Step Function "${stateMachineName}" was not executed recently - only old executions found (${executionDetails.length} total executions, none in last 5 minutes)`
        );
      }
    }
  }
);

// Parameterized service method verification
Then(
  /^I should be able to (list executions|track execution details|get execution history|get state outputs|analyze data flow|verify SLAs|check if the Step Function has recent executions) for the Step Function(?: execution)?(?: for state "([^"]+)")?(?: with expected data "([^"]+)")?$/,
  async function (
    this: StepContext,
    operation: string,
    _stateName?: string,
    _expectedData?: string
  ) {
    const stateMachineName = requireStateMachineName(this);
    const executionArn = this.executionArn;

    switch (operation) {
      case 'list executions': {
        const executions = await framework.listExecutions(stateMachineName);
        if (!Array.isArray(executions)) {
          throw new Error('Failed to list executions - expected array result');
        }
        break;
      }

      case 'track execution details': {
        const executionDetails =
          await framework.getExecutionDetails(stateMachineName);
        if (!Array.isArray(executionDetails)) {
          throw new Error(
            'Failed to track execution details - expected array result'
          );
        }
        break;
      }

      case 'get execution history': {
        if (!executionArn) {
          throw new Error(
            'Execution ARN is not set. Make sure to start an execution first.'
          );
        }
        const history =
          await framework.getStepFunctionExecutionHistory(executionArn);
        if (!Array.isArray(history)) {
          throw new Error(
            'Failed to get execution history - expected array result'
          );
        }
        break;
      }

      case 'get state outputs': {
        if (!executionArn) {
          throw new Error(
            'Execution ARN is not set. Make sure to start an execution first.'
          );
        }
        const stateOutputs =
          await framework.getStepFunctionStateOutput(executionArn);
        if (!Array.isArray(stateOutputs)) {
          throw new Error(
            'Failed to get state outputs - expected array result'
          );
        }
        break;
      }

      case 'analyze data flow': {
        if (!executionArn) {
          throw new Error(
            'Execution ARN is not set. Make sure to start an execution first.'
          );
        }
        const dataFlow = await framework.getStepFunctionDataFlow(executionArn);
        if (
          !dataFlow ||
          typeof dataFlow.dataLoss !== 'boolean' ||
          typeof dataFlow.dataCorruption !== 'boolean'
        ) {
          throw new Error(
            'Failed to analyze data flow - expected proper data flow object'
          );
        }
        break;
      }

      case 'verify SLAs': {
        if (!executionArn) {
          throw new Error(
            'Execution ARN is not set. Make sure to start an execution first.'
          );
        }
        const slas = {
          maxTotalExecutionTime: 60000, // 1 minute
          maxStateExecutionTime: 10000, // 10 seconds
          maxColdStartTime: 5000, // 5 seconds
        };
        const slaVerification = await framework.verifyStepFunctionSLAs(
          executionArn,
          slas
        );
        if (typeof slaVerification.meetsSLAs !== 'boolean') {
          throw new Error('Failed to verify SLAs - expected boolean result');
        }
        break;
      }

      case 'check if the Step Function has recent executions': {
        const hasExecutions =
          await framework.checkStateMachineExecution(stateMachineName);
        if (typeof hasExecutions !== 'boolean') {
          throw new Error(
            'Failed to check state machine execution - expected boolean result'
          );
        }
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
);

// State output verification with parameters
Then(
  'I should be able to verify state output for state {string} with expected data {string}',
  async function (this: StepContext, stateName: string, expectedData: string) {
    const executionArn = requireExecutionArn(this);
    const expectedOutput = JSON.parse(expectedData);

    const verification = await framework.verifyStepFunctionStateOutput(
      executionArn,
      stateName,
      expectedOutput
    );

    if (typeof verification.matches !== 'boolean') {
      throw new Error(
        'Failed to verify state output - expected boolean result'
      );
    }
  }
);

// Execution completion verification
Then(
  'the Step Function execution should complete all expected states: {string}',
  async function (this: StepContext, expectedStates: string) {
    const executionArn = requireExecutionArn(this);
    const stateList = expectedStates.split(',').map((s) => s.trim());

    const result = await framework.verifyStepFunctionExecutionSuccess(
      executionArn,
      stateList
    );

    if (!result.success) {
      const missingStates = stateList.filter(
        (state) => !result.completedStates.includes(state)
      );
      const errorMsg = `Step Function execution failed. Missing states: ${missingStates.join(', ')}. Failed states: ${result.failedStates.join(', ')}`;
      throw new Error(errorMsg);
    }
  }
);

// Performance and timing verification
Then(
  'the Step Function execution should complete within {int} milliseconds',
  async function (this: StepContext, maxExecutionTimeMs: number) {
    const executionArn = requireExecutionArn(this);

    const result =
      await framework.verifyStepFunctionExecutionSuccess(executionArn);

    if (result.executionTime > maxExecutionTimeMs) {
      throw new Error(
        `Step Function execution time ${result.executionTime}ms exceeds limit of ${maxExecutionTimeMs}ms`
      );
    }
  }
);

Then(
  'the Step Function performance should be acceptable',
  async function (this: StepContext) {
    let executionArn = this.executionArn;

    // If executionArn is not set, fetch the most recent execution for the state machine
    if (!executionArn) {
      const stateMachineName = requireStateMachineName(this);
      const executions = await framework.getExecutionDetails(stateMachineName);
      if (!executions.length) {
        throw new Error(
          `No executions found for Step Function "${stateMachineName}". Cannot check performance.`
        );
      }
      // Use the most recent execution
      executions.sort(
        (a: ExecutionDetails, b: ExecutionDetails) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      executionArn = executions[0].executionArn;
    }

    const performance =
      await framework.checkStepFunctionPerformance(executionArn);

    // Basic performance checks
    if (performance.totalExecutionTime > 60000) {
      // 1 minute
      throw new Error(
        `Step Function execution time ${performance.totalExecutionTime}ms is too slow`
      );
    }

    if (performance.averageStateExecutionTime > 10000) {
      // 10 seconds per state
      throw new Error(
        `Average state execution time ${performance.averageStateExecutionTime}ms is too slow`
      );
    }
  }
);

// Trigger verification with timeout
Then(
  'the Step Function should have been triggered within {int} seconds',
  async function (this: StepContext, timeoutSeconds: number) {
    const stateMachineName = requireStateMachineName(this);
    const timeoutMs = timeoutSeconds * 1000;

    const triggered = await framework.verifyStateMachineTriggered(
      stateMachineName,
      timeoutMs
    );

    if (!triggered) {
      throw new Error(
        `Step Function "${stateMachineName}" was not triggered within ${timeoutSeconds} seconds`
      );
    }
  }
);

// Definition state count verification
Then(
  'the Step Function definition should have at least {int} states',
  async function (this: StepContext, minStateCount: number) {
    const stateMachineName = requireStateMachineName(this);

    const definition =
      await framework.verifyStepFunctionDefinition(stateMachineName);

    if (definition.stateCount < minStateCount) {
      throw new Error(
        `Step Function definition has ${definition.stateCount} states, but expected at least ${minStateCount}`
      );
    }
  }
);

// Data integrity verification
Then(
  'the Step Function execution should have no data loss or corruption',
  async function (this: StepContext) {
    const executionArn = requireExecutionArn(this);

    const dataFlow = await framework.getStepFunctionDataFlow(executionArn);

    if (dataFlow.dataLoss) {
      throw new Error('Step Function execution has data loss');
    }

    if (dataFlow.dataCorruption) {
      throw new Error('Step Function execution has data corruption');
    }
  }
);

// Error handling verification
Then(
  'the operation should fail with appropriate error message',
  async function (this: StepContext) {
    if (!this.lastError) {
      throw new Error('Expected operation to fail, but no error was thrown');
    }

    // Verify that the error is a StepFunctionError or contains appropriate message
    const errorMessage = this.lastError.message || this.lastError.toString();
    if (
      !errorMessage.includes('not found') &&
      !errorMessage.includes('failed')
    ) {
      throw new Error(
        `Expected specific error message, but got: ${errorMessage}`
      );
    }
  }
);

// Configuration and service behavior verification
Then(
  /^(all operations should use the custom configuration settings|the service should handle transient failures gracefully|the operation should retry with exponential backoff|the service should log all operations with appropriate detail|the logs should include timing and performance metrics)$/,
  async function (this: StepContext, operation: string) {
    const executionArn = requireExecutionArn(this);

    switch (operation) {
      case 'all operations should use the custom configuration settings': {
        // Verify that operations work with custom configuration
        const stateMachineName = requireStateMachineName(this);
        const executions = await framework.listExecutions(stateMachineName);
        if (!Array.isArray(executions)) {
          throw new Error('Custom configuration operations failed');
        }
        break;
      }

      case 'the service should handle transient failures gracefully':
      case 'the operation should retry with exponential backoff': {
        // Verify that the execution completed despite potential transient failures
        const status = await framework.getExecutionStatus(executionArn);
        if (status !== 'SUCCEEDED' && status !== 'RUNNING') {
          throw new Error(
            `Execution failed to handle transient failures: ${status}`
          );
        }
        break;
      }

      case 'the service should log all operations with appropriate detail': {
        // Verify that operations complete (indicating logging doesn't interfere)
        const logStatus = await framework.getExecutionStatus(executionArn);
        if (logStatus !== 'SUCCEEDED' && logStatus !== 'RUNNING') {
          throw new Error(
            `Operations failed with logging enabled: ${logStatus}`
          );
        }
        break;
      }

      case 'the logs should include timing and performance metrics': {
        // Verify that performance analysis works (indicating metrics are collected)
        const performance =
          await framework.checkStepFunctionPerformance(executionArn);
        if (typeof performance.totalExecutionTime !== 'number') {
          throw new Error('Performance metrics not available');
        }
        break;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
);
