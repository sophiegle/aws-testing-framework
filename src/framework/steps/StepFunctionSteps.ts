import { Given, Then, When } from '@cucumber/cucumber';
import { BaseStepDefinition } from '../container/BaseStepDefinition';
import type { StepContext } from '../types';

/**
 * Step Function step definitions with proper dependency injection
 */
export class StepFunctionSteps extends BaseStepDefinition {
  /**
   * Register all Step Function step definitions
   */
  registerSteps(): void {
    const container = this.container;

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

    // Basic Step Function operations
    Given(
      'I have a Step Function named {string}',
      async function (this: StepContext, stateMachineName: string) {
        this.stateMachineName = stateMachineName;
        const stateMachineArn =
          await container.stepFunctionService.findStateMachine(
            stateMachineName
          );
        this.stateMachineArn = stateMachineArn;
      }
    );

    When(
      'I start the Step Function execution with input {string}',
      async function (this: StepContext, input: string) {
        const stateMachineName = requireStateMachineName(this);

        // Validate JSON input
        let parsedInput: Record<string, unknown>;
        try {
          parsedInput = JSON.parse(input);
        } catch (error) {
          throw new Error(
            `Invalid JSON input: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        const executionArn = await container.stepFunctionService.startExecution(
          stateMachineName,
          parsedInput
        );
        this.executionArn = executionArn;
      }
    );

    Then(
      'the Step Function execution should succeed',
      async function (this: StepContext) {
        const executionArn = requireExecutionArn(this);

        await container.healthValidator.waitForCondition(async () => {
          const status =
            await container.stepFunctionService.getExecutionStatus(
              executionArn
            );
          return status === 'SUCCEEDED';
        });
      }
    );

    Then(
      'the Step Function should be executed',
      async function (this: StepContext) {
        const executionArn = requireExecutionArn(this);

        await container.healthValidator.waitForCondition(async () => {
          const status =
            await container.stepFunctionService.getExecutionStatus(
              executionArn
            );
          return ['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED'].includes(
            status
          );
        });
      }
    );

    Then(
      'I should be able to verify state output for state {string} with expected data {string}',
      async function (
        this: StepContext,
        stateName: string,
        expectedData: string
      ) {
        const executionArn = requireExecutionArn(this);

        // Validate JSON expected data
        let parsedExpectedData: Record<string, unknown>;
        try {
          parsedExpectedData = JSON.parse(expectedData);
        } catch (error) {
          throw new Error(
            `Invalid JSON expected data: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        const verification =
          await container.stepFunctionService.verifyStepFunctionStateOutput(
            executionArn,
            stateName,
            parsedExpectedData
          );

        if (!verification.matches) {
          throw new Error(
            `State output verification failed for state ${stateName}. ` +
              `Missing fields: ${verification.missingFields.join(', ')}. ` +
              `Extra fields: ${verification.extraFields.join(', ')}`
          );
        }
      }
    );

    Then(
      'the Step Function execution should complete all expected states: {string}',
      async function (this: StepContext, expectedStates: string) {
        const executionArn = requireExecutionArn(this);
        const states = expectedStates.split(',').map((s) => s.trim());

        const result =
          await container.stepFunctionService.verifyStepFunctionExecutionSuccess(
            executionArn,
            states
          );

        if (!result.success) {
          throw new Error(
            'Step Function execution did not complete all expected states. ' +
              `Completed: ${result.completedStates.join(', ')}. ` +
              `Failed: ${result.failedStates.join(', ')}`
          );
        }
      }
    );
  }
}
