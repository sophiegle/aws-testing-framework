import { Given, Then, When } from '@cucumber/cucumber';
import {
  AWSTestingFramework,
  type StepContext,
} from '../framework/AWSTestingFramework';

const framework = new AWSTestingFramework();

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

    const triggered = await framework.verifyLambdaTriggeredStateMachine(
      this.functionName,
      this.expectedStateMachineName
    );

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
    const executions = await framework.getExecutionDetails(stateMachineName);
    const recentExecutions = executions.filter((execution) => {
      const executionTime = new Date(execution.startDate).getTime();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return executionTime > fiveMinutesAgo;
    });

    if (recentExecutions.length === 0) {
      throw new Error(
        `No recent executions found for state machine ${stateMachineName}`
      );
    }
  }
);
