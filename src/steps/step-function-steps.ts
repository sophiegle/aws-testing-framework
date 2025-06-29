import { Given, Then, When } from '@cucumber/cucumber';
import {
  AWSTestingFramework,
  type StepContext,
} from '../framework/AWSTestingFramework';

const framework = new AWSTestingFramework();

// Basic Step Function setup steps
Given(
  'I have a Step Function named {string}',
  async function (this: StepContext, stateMachineName: string) {
    this.stateMachineName = stateMachineName;
    const stateMachineArn = await framework.findStateMachine(stateMachineName);
    this.stateMachineArn = stateMachineArn;
  }
);

When(
  'I start a Step Function execution with input {string}',
  async function (this: StepContext, input: string) {
    if (!this.stateMachineArn) {
      throw new Error(
        'State machine ARN is not set. Make sure to create a Step Function first.'
      );
    }

    const executionInput = JSON.parse(input);
    const executionArn = await framework.startExecution(
      this.stateMachineArn,
      executionInput
    );
    this.executionArn = executionArn;
  }
);

// Basic Step Function verification steps
Then(
  'the Step Function execution should succeed',
  async function (this: StepContext) {
    if (!this.executionArn) {
      throw new Error(
        'Execution ARN is not set. Make sure to start an execution first.'
      );
    }

    // Wait for execution to complete
    let status = await framework.getExecutionStatus(this.executionArn);
    const startTime = Date.now();
    const timeout = 60000; // 1 minute timeout

    while (status === 'RUNNING' && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      status = await framework.getExecutionStatus(this.executionArn);
    }

    if (status !== 'SUCCEEDED') {
      throw new Error(`Step Function execution failed with status: ${status}`);
    }
  }
);

Then(
  'the Step Function should have valid state machine definition',
  async function (this: StepContext) {
    if (!this.stateMachineName) {
      throw new Error(
        'State machine name is not set. Make sure to create a Step Function first.'
      );
    }

    const definition = await framework.verifyStepFunctionDefinition(
      this.stateMachineName
    );

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

Then(
  'the Step Function should be executed',
  async function (this: StepContext) {
    if (!this.stateMachineName) {
      throw new Error(
        'State machine name is not set. Make sure to create a Step Function first.'
      );
    }

    // Wait a bit for execution to complete
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // First, try to check if the Step Function was triggered by the Lambda function
    if (this.functionName) {
      console.log(`Checking if Lambda function "${this.functionName}" triggered Step Function "${this.stateMachineName}"`);
      const lambdaTriggeredStepFunction = await framework.verifyLambdaTriggeredStateMachine(
        this.functionName,
        this.stateMachineName
      );
      if (lambdaTriggeredStepFunction) {
        console.log(`Success: Lambda function "${this.functionName}" triggered Step Function "${this.stateMachineName}"`);
        return; // Success - Lambda triggered the Step Function
      } else {
        console.log(`Lambda function "${this.functionName}" did not trigger Step Function "${this.stateMachineName}"`);
      }
    } else {
      console.log('No Lambda function name available in context, checking for direct Step Function execution');
    }

    // If Lambda didn't trigger it, check for any recent executions
    console.log(`Checking for recent executions of Step Function "${this.stateMachineName}"`);
    const stateMachineTriggered = await framework.verifyStateMachineTriggered(
      this.stateMachineName,
      30000 // 30 second timeout
    );
    
    if (!stateMachineTriggered) {
      console.log(`No recent executions found for Step Function "${this.stateMachineName}", checking for any executions`);
      // As a fallback, check if there are any executions at all
      const executions = await framework.listExecutions(this.stateMachineName);
      if (executions.length === 0) {
        throw new Error(`Step Function "${this.stateMachineName}" was not executed - no executions found`);
      } else {
        console.log(`Found ${executions.length} executions for Step Function "${this.stateMachineName}", checking if any are recent`);
        // There are executions, but they might not be recent enough
        // Let's check the execution details to see if any are recent
        const executionDetails = await framework.getExecutionDetails(this.stateMachineName);
        const recentExecutions = executionDetails.filter((execution) => {
          const executionTime = new Date(execution.startDate).getTime();
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          return executionTime > fiveMinutesAgo;
        });
        
        if (recentExecutions.length === 0) {
          throw new Error(`Step Function "${this.stateMachineName}" was not executed recently - only old executions found (${executionDetails.length} total executions, none in last 5 minutes)`);
        } else {
          console.log(`Found ${recentExecutions.length} recent executions for Step Function "${this.stateMachineName}"`);
        }
      }
    } else {
      console.log(`Success: Step Function "${this.stateMachineName}" was executed recently`);
    }
  }
);

// Advanced Step Function verification steps (using executionArn directly)
Then(
  'the Step Function execution should complete all expected states: {string}',
  async function (this: StepContext, expectedStates: string) {
    if (!this.executionArn) {
      throw new Error(
        'Execution ARN is not set. Make sure to start an execution first.'
      );
    }

    const stateList = expectedStates.split(',').map((s) => s.trim());
    const result = await framework.verifyStepFunctionExecutionSuccess(
      this.executionArn,
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

Then(
  'the Step Function execution should complete within {int} milliseconds',
  async function (this: StepContext, maxExecutionTimeMs: number) {
    if (!this.executionArn) {
      throw new Error(
        'Execution ARN is not set. Make sure to start an execution first.'
      );
    }

    const result = await framework.verifyStepFunctionExecutionSuccess(
      this.executionArn
    );

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
    // If executionArn is not set, fetch the most recent execution for the state machine
    if (!this.executionArn) {
      if (!this.stateMachineName) {
        throw new Error(
          'Execution ARN is not set and state machine name is not available. Make sure to create a Step Function first.'
        );
      }
      const executions = await framework.getExecutionDetails(this.stateMachineName);
      if (!executions.length) {
        throw new Error(
          `No executions found for Step Function "${this.stateMachineName}". Cannot check performance.`
        );
      }
      // Use the most recent execution
      executions.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      this.executionArn = executions[0].executionArn;
    }

    const performance = await framework.checkStepFunctionPerformance(
      this.executionArn
    );

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
