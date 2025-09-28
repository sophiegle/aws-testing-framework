import { Given, Then } from '@cucumber/cucumber';
import type { ExecutionDetails, StepContext } from '../framework/types';

// import { StepFunctionService } from '../framework/services/StepFunctionService';
// import { SFNClient } from '@aws-sdk/client-sfn';

// TODO: (refactor): Uncomment this when the Step Function Service is implemented
// const stepFunctionService = new StepFunctionService(new SFNClient({ region: process.env.AWS_REGION }));

// Cross-service setup and expectations
Given(
  'I expect the Lambda function to trigger the Step Function named {string}',
  async function (this: StepContext, expectedStateMachineName: string) {
    this.expectedStateMachineName = expectedStateMachineName;
  }
);

// Cross-service correlation verification steps
Then(
  'the Lambda function should trigger the expected Step Function',
  async function (this: StepContext) {
    if (!this.functionName) {
      throw new Error(
        'Function name is not set. Make sure to create a Lambda function first.'
      );
    }
    if (!this.expectedStateMachineName) {
      throw new Error(
        'Expected state machine name is not set. Use the step "I expect the Lambda function to trigger the Step Function named {string}" first.'
      );
    }

    // TODO: (refactor): Uncomment this when the Step Function Service is implemented
    // const triggered = await stepFunctionService.verifyLambdaTriggeredStateMachine(
    //   this.functionName,
    //   this.expectedStateMachineName
    // );

    const triggered = false;

    if (!triggered) {
      throw new Error(
        `Lambda function ${this.functionName} did not trigger the expected state machine ${this.expectedStateMachineName}`
      );
    }
  }
);

Then(
  'the Step Function {string} should have recent executions',
  async function (this: StepContext, stateMachineName: string) {
    // TODO: (refactor): Uncomment this when the Step Function Service is implemented
    // const executions = await framework.getExecutionDetails(stateMachineName);
    const executions = [] as ExecutionDetails[];
    const recentExecutions = executions.filter(
      (execution: ExecutionDetails) => {
        const executionTime = new Date(execution.startDate).getTime();
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return executionTime > fiveMinutesAgo;
      }
    );

    if (recentExecutions.length === 0) {
      throw new Error(
        `No recent executions found for state machine ${stateMachineName}`
      );
    }
  }
);
