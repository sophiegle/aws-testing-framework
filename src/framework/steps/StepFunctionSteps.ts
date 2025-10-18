import { Given, Then, When } from '@cucumber/cucumber';
import { BaseStepDefinition } from '../container/StepDefinitionFactory';
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

    // TODO: Implement validateStateMachineDefinition in StepFunctionService before enabling
    // Then(
    //   'the Step Function should have valid state machine definition',
    //   async function (this: StepContext) {
    //     const stateMachineName = requireStateMachineName(this);
    //
    //     const definition =
    //       await container.stepFunctionService.validateStateMachineDefinition(
    //         stateMachineName
    //       );
    //
    //     if (!definition.isValid) {
    //       throw new Error(
    //         `Invalid state machine definition: ${definition.errors.join(', ')}`
    //       );
    //     }
    //   }
    // );

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

    // TODO: Implement verifyStateOutput in StepFunctionService before enabling
    // Then(
    //   'I should be able to verify state output for state {string} with expected data {string}',
    //   async function (
    //     this: StepContext,
    //     stateName: string,
    //     expectedData: string
    //   ) {
    //     const executionArn = requireExecutionArn(this);
    //
    //     // Validate JSON expected data
    //     let parsedExpectedData: Record<string, unknown>;
    //     try {
    //       parsedExpectedData = JSON.parse(expectedData);
    //     } catch (error) {
    //       throw new Error(
    //         `Invalid JSON expected data: ${error instanceof Error ? error.message : String(error)}`
    //       );
    //     }
    //
    //     const verification =
    //       await container.stepFunctionService.verifyStateOutput(
    //         executionArn,
    //         stateName,
    //         parsedExpectedData
    //       );
    //
    //     if (!verification.matches) {
    //       throw new Error(
    //         `State output verification failed for state ${stateName}. ` +
    //           `Missing fields: ${verification.missingFields.join(', ')}. ` +
    //           `Extra fields: ${verification.extraFields.join(', ')}`
    //       );
    //     }
    //   }
    // );

    // TODO: Implement verifyExecutionCompletion in StepFunctionService before enabling
    // Then(
    //   'the Step Function execution should complete all expected states: {string}',
    //   async function (this: StepContext, expectedStates: string) {
    //     const executionArn = requireExecutionArn(this);
    //     const states = expectedStates.split(',').map((s) => s.trim());
    //
    //     const result =
    //       await container.stepFunctionService.verifyExecutionCompletion(
    //         executionArn,
    //         states
    //       );
    //
    //     if (!result.success) {
    //       throw new Error(
    //         'Step Function execution did not complete all expected states. ' +
    //           `Completed: ${result.completedStates.join(', ')}. ` +
    //           `Failed: ${result.failedStates.join(', ')}`
    //       );
    //     }
    //   }
    // );

    // TODO: Implement getExecutionPerformance in StepFunctionService before enabling
    // Then(
    //   'the Step Function execution should complete within {int} milliseconds',
    //   async function (this: StepContext, maxExecutionTime: number) {
    //     const executionArn = requireExecutionArn(this);
    //
    //     if (maxExecutionTime <= 0) {
    //       throw new Error('Maximum execution time must be greater than 0');
    //     }
    //
    //     const performance =
    //       await container.stepFunctionService.getExecutionPerformance(
    //         executionArn
    //       );
    //
    //     if (performance.totalExecutionTime > maxExecutionTime) {
    //       throw new Error(
    //         `Step Function execution took ${performance.totalExecutionTime}ms, ` +
    //           `exceeding the maximum allowed time of ${maxExecutionTime}ms`
    //       );
    //     }
    //   }
    // );

    // TODO: Implement getExecutionPerformance in StepFunctionService before enabling
    // Then(
    //   'the Step Function performance should be acceptable',
    //   async function (this: StepContext) {
    //     const executionArn = requireExecutionArn(this);
    //
    //     const performance =
    //       await container.stepFunctionService.getExecutionPerformance(
    //         executionArn
    //       );
    //
    //     // Define acceptable performance thresholds
    //     const maxTotalTime = 30000; // 30 seconds
    //     const maxAverageStateTime = 5000; // 5 seconds per state
    //
    //     if (performance.totalExecutionTime > maxTotalTime) {
    //       throw new Error(
    //         `Step Function execution took ${performance.totalExecutionTime}ms, ` +
    //           `exceeding the acceptable threshold of ${maxTotalTime}ms`
    //       );
    //     }
    //
    //     if (performance.averageStateExecutionTime > maxAverageStateTime) {
    //       throw new Error(
    //         `Average state execution time was ${performance.averageStateExecutionTime}ms, ` +
    //           `exceeding the acceptable threshold of ${maxAverageStateTime}ms`
    //       );
    //     }
    //   }
    // );

    // TODO: Implement getExecutionTriggerTime in StepFunctionService before enabling
    // Then(
    //   'the Step Function should have been triggered within {int} seconds',
    //   async function (this: StepContext, maxTriggerTime: number) {
    //     const executionArn = requireExecutionArn(this);
    //
    //     if (maxTriggerTime <= 0) {
    //       throw new Error('Maximum trigger time must be greater than 0');
    //     }
    //
    //     const triggerTime =
    //       await container.stepFunctionService.getExecutionTriggerTime(
    //         executionArn
    //       );
    //
    //     if (triggerTime > maxTriggerTime * 1000) {
    //       throw new Error(
    //         `Step Function was triggered after ${triggerTime}ms, ` +
    //           `exceeding the maximum allowed trigger time of ${maxTriggerTime} seconds`
    //       );
    //     }
    //   }
    // );

    // TODO: Implement validateStateMachineDefinition in StepFunctionService before enabling
    // Then(
    //   'the Step Function definition should have at least {int} states',
    //   async function (this: StepContext, minStateCount: number) {
    //     const stateMachineName = requireStateMachineName(this);
    //
    //     if (minStateCount <= 0) {
    //       throw new Error('Minimum state count must be greater than 0');
    //     }
    //
    //     const definition =
    //       await container.stepFunctionService.validateStateMachineDefinition(
    //         stateMachineName
    //       );
    //
    //     if (definition.stateCount < minStateCount) {
    //       throw new Error(
    //         `Step Function definition has ${definition.stateCount} states, ` +
    //           `but requires at least ${minStateCount} states`
    //       );
    //     }
    //   }
    // );

    // TODO: Implement analyzeDataFlow in StepFunctionService before enabling
    // Then(
    //   'the Step Function execution should have no data loss or corruption',
    //   async function (this: StepContext) {
    //     const executionArn = requireExecutionArn(this);
    //
    //     const dataFlow =
    //       await container.stepFunctionService.analyzeDataFlow(
    //         executionArn
    //       );
    //
    //     if (dataFlow.dataLoss) {
    //       throw new Error('Step Function execution resulted in data loss');
    //     }
    //
    //     if (dataFlow.dataCorruption) {
    //       throw new Error(
    //         'Step Function execution resulted in data corruption'
    //       );
    //     }
    //   }
    // );

    // TODO: Implement getExecutionFailureReason in StepFunctionService before enabling
    // Then(
    //   'the operation should fail with appropriate error message',
    //   async function (this: StepContext) {
    //     const executionArn = requireExecutionArn(this);
    //
    //     const status =
    //       await container.stepFunctionService.getExecutionStatus(
    //         executionArn
    //       );
    //
    //     if (status !== 'FAILED') {
    //       throw new Error(
    //         `Expected Step Function execution to fail, but it ${status.toLowerCase()}`
    //       );
    //     }
    //
    //     const failureReason =
    //       await container.stepFunctionService.getExecutionFailureReason(
    //         executionArn
    //       );
    //
    //     if (!failureReason || failureReason.trim() === '') {
    //       throw new Error(
    //         'Step Function execution failed but no error message was provided'
    //       );
    //     }
    //   }
    // );
  }
}
