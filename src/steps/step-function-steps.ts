import { Given, Then, When } from '@cucumber/cucumber';
import { AWSTestingFramework, type StepContext } from '../framework/AWSTestingFramework';

const framework = new AWSTestingFramework();

// Basic Step Function operations
Given(
  'I have a Step Function named {string}',
  async function (this: StepContext, stateMachineName: string) {
    this.stateMachineName = stateMachineName;
    this.stateMachineArn = await framework.findStateMachine(stateMachineName);
  }
);

When('I start an execution with input {string}', async function (this: StepContext, input: string) {
  if (!this.stateMachineArn) {
    throw new Error('State machine ARN is not set. Make sure to create a Step Function first.');
  }
  this.executionArn = await framework.startExecution(this.stateMachineArn, JSON.parse(input));
});

Then('the Step Function should be triggered', async function (this: StepContext) {
  if (!this.stateMachineName) {
    throw new Error('State machine name is not set. Make sure to create a Step Function first.');
  }
  await framework.waitForCondition(async () => {
    if (!this.stateMachineName) return false;
    const stateMachineTriggered = await framework.checkStateMachineExecution(this.stateMachineName);
    if (stateMachineTriggered && !this.executionArn) {
      // If the state machine was triggered by an S3 event, we need to get the execution ARN
      const executions = await framework.listExecutions(this.stateMachineName);
      if (executions.length > 0) {
        this.executionArn = executions[0].executionArn;
      }
    }
    return stateMachineTriggered;
  });
});

Then('the Step Function should be executed', async function (this: StepContext) {
  if (!this.stateMachineName) {
    throw new Error('State machine name is not set. Make sure to create a Step Function first.');
  }
  await framework.waitForCondition(async () => {
    if (!this.stateMachineName) return false;
    const stateMachineTriggered = await framework.checkStateMachineExecution(this.stateMachineName);
    if (stateMachineTriggered && !this.executionArn) {
      // If the state machine was triggered by an S3 event, we need to get the execution ARN
      const executions = await framework.listExecutions(this.stateMachineName);
      if (executions.length > 0) {
        this.executionArn = executions[0].executionArn;
      }
    }
    return stateMachineTriggered;
  });
});

Then('the execution should complete successfully', async function (this: StepContext) {
  if (!this.executionArn) {
    throw new Error('Execution ARN is not set. Make sure to start an execution first.');
  }
  await framework.waitForCondition(async () => {
    if (!this.executionArn) return false;
    const status = await framework.getExecutionStatus(this.executionArn);
    return status === 'SUCCEEDED';
  });
});

// Workflow-specific Step Function operations
Then(
  'the Step Function execution should contain the file reference {string}',
  async function (this: StepContext, fileName: string) {
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const trace = framework.getWorkflowTrace(this.correlationId);
    console.log(`Debug: Step Function trace: ${JSON.stringify(trace?.stepFunctionExecution, null, 2)}`);
    
    const containsFile = await framework.verifyStepFunctionContainsFile(this.correlationId, fileName);
    if (!containsFile) {
      throw new Error(`Step Function execution does not contain reference to file ${fileName}`);
    }
  }
);

Then(
  'the Step Function execution should complete successfully',
  async function (this: StepContext) {
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const trace = framework.getWorkflowTrace(this.correlationId);
    if (!trace?.stepFunctionExecution) {
      throw new Error('Step Function execution not found in workflow trace');
    }
    
    const executionArn = trace.stepFunctionExecution.executionArn;
    await framework.waitForCondition(async () => {
      const status = await framework.getExecutionStatus(executionArn);
      return status === 'SUCCEEDED';
    });
  }
);

// Advanced Step Function verification steps
Then(
  'the Step Function should complete all expected states: {string}',
  async function (this: StepContext, expectedStates: string) {
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const trace = framework.getWorkflowTrace(this.correlationId);
    if (!trace?.stepFunctionExecution) {
      throw new Error('Step Function execution not found in workflow trace');
    }
    
    const stateList = expectedStates.split(',').map(s => s.trim());
    const result = await framework.verifyStepFunctionExecutionSuccess(
      trace.stepFunctionExecution.executionArn,
      stateList
    );
    
    if (!result.success) {
      const missingStates = stateList.filter(state => !result.completedStates.includes(state));
      const errorMsg = `Step Function execution failed. Missing states: ${missingStates.join(', ')}. Failed states: ${result.failedStates.join(', ')}`;
      throw new Error(errorMsg);
    }
  }
);

Then(
  'the Step Function execution should complete within {int} milliseconds',
  async function (this: StepContext, maxExecutionTimeMs: number) {
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const trace = framework.getWorkflowTrace(this.correlationId);
    if (!trace?.stepFunctionExecution) {
      throw new Error('Step Function execution not found in workflow trace');
    }
    
    const result = await framework.verifyStepFunctionExecutionSuccess(
      trace.stepFunctionExecution.executionArn
    );
    
    if (result.executionTime > maxExecutionTimeMs) {
      throw new Error(`Step Function execution time ${result.executionTime}ms exceeds limit of ${maxExecutionTimeMs}ms`);
    }
  }
);

Then(
  'the Step Function should have valid state machine definition',
  async function (this: StepContext) {
    if (!this.stateMachineName) {
      throw new Error('State machine name is not set. Make sure to create a Step Function first.');
    }
    
    const definition = await framework.verifyStepFunctionDefinition(this.stateMachineName);
    
    if (!definition.isValid) {
      throw new Error(`Step Function definition is invalid: ${definition.errors.join(', ')}`);
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
  'the Step Function performance should be acceptable',
  async function (this: StepContext) {
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const trace = framework.getWorkflowTrace(this.correlationId);
    if (!trace?.stepFunctionExecution) {
      throw new Error('Step Function execution not found in workflow trace');
    }
    
    const performance = await framework.checkStepFunctionPerformance(
      trace.stepFunctionExecution.executionArn
    );
    
    // Log performance metrics for analysis
    console.log(`Debug: Step Function Performance - Total: ${performance.totalExecutionTime}ms, Average: ${performance.averageStateExecutionTime}ms, Slowest: ${performance.slowestState}, Fastest: ${performance.fastestState}`);
    
    // Basic performance checks
    if (performance.totalExecutionTime > 60000) { // 1 minute
      throw new Error(`Step Function execution time ${performance.totalExecutionTime}ms is too slow`);
    }
    
    if (performance.averageStateExecutionTime > 10000) { // 10 seconds per state
      throw new Error(`Average state execution time ${performance.averageStateExecutionTime}ms is too slow`);
    }
  }
);

Then('the Step Function should be executed multiple times', async function (this: StepContext) {
  if (!this.stateMachineName) {
    throw new Error('State machine name is not set. Make sure to create a Step Function first.');
  }
  
  // Wait a bit for all executions to complete
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check that the Step Function was executed at least once
  const stateMachineTriggered = await framework.checkStateMachineExecution(this.stateMachineName);
  if (!stateMachineTriggered) {
    throw new Error('Step Function was not executed');
  }
  
  console.log(`Debug: Step Function ${this.stateMachineName} was successfully executed`);
}); 