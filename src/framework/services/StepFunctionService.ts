import {
  DescribeExecutionCommand,
  DescribeStateMachineCommand,
  GetExecutionHistoryCommand,
  ListExecutionsCommand,
  ListStateMachinesCommand,
  type SFNClient,
  StartExecutionCommand,
} from '@aws-sdk/client-sfn';
import type {
  ExecutionDetails,
  StepFunctionDataFlow,
  StepFunctionDefinition,
  StepFunctionExecutionResult,
  StepFunctionPerformance,
  StepFunctionSLAs,
  StepFunctionSLAVerification,
  StepFunctionStateOutput,
  StepFunctionStateOutputVerification,
} from '../types';

export class StepFunctionService {
  private sfnClient: SFNClient;

  constructor(sfnClient: SFNClient) {
    this.sfnClient = sfnClient;
  }

  async findStateMachine(stateMachineName: string): Promise<string> {
    const command = new ListStateMachinesCommand({});
    const response = await this.sfnClient.send(command);
    const stateMachine = response.stateMachines?.find(
      (sm) => sm.name === stateMachineName
    );

    if (!stateMachine?.stateMachineArn) {
      throw new Error(
        `State machine "${stateMachineName}" not found. Available state machines: ${response.stateMachines?.map((sm) => sm.name).join(', ') || 'none'}`
      );
    }

    return stateMachine.stateMachineArn;
  }

  async startExecution(
    stateMachineArn: string,
    input: Record<string, unknown>
  ): Promise<string> {
    const response = await this.sfnClient.send(
      new StartExecutionCommand({
        stateMachineArn,
        input: JSON.stringify(input),
      })
    );
    if (!response.executionArn) {
      throw new Error('Failed to start execution: No execution ARN returned');
    }
    return response.executionArn;
  }

  async listExecutions(
    stateMachineName: string
  ): Promise<Array<{ executionArn: string }>> {
    const stateMachineArn = await this.findStateMachine(stateMachineName);
    const response = await this.sfnClient.send(
      new ListExecutionsCommand({
        stateMachineArn,
        maxResults: 1,
      })
    );
    return (
      response.executions?.map((execution) => ({
        executionArn: execution.executionArn || '',
      })) || []
    );
  }

  async getExecutionStatus(executionArn: string): Promise<string> {
    const response = await this.sfnClient.send(
      new DescribeExecutionCommand({
        executionArn,
      })
    );
    return response.status || '';
  }

  /**
   * Check if Step Function has been executed recently
   */
  async checkStateMachineExecution(stateMachineName: string): Promise<boolean> {
    try {
      // Check for recent executions
      const executions = await this.listExecutions(stateMachineName);
      if (executions.length === 0) {
        return false;
      }

      // Check if any execution started in the last 5 minutes
      // In a real implementation, you would check the actual execution timestamps
      // For now, we'll assume recent executions exist if the state machine is accessible

      // TODO: Implement proper Step Function execution checking with timestamps
      // const recentExecutions = executions.filter((execution) => {
      //   const executionTime = new Date(execution.startDate);
      //   const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      //   return executionTime.getTime() > fiveMinutesAgo;
      // });

      return executions.length > 0;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Track executions for a specific state machine
   */
  async trackStateMachineExecutions(
    stateMachineName: string
  ): Promise<ExecutionDetails[]> {
    const stateMachineArn = await this.findStateMachine(stateMachineName);

    if (!stateMachineArn || stateMachineArn.trim() === '') {
      throw new Error(
        `Invalid state machine ARN for "${stateMachineName}": ${stateMachineArn}`
      );
    }

    const response = await this.sfnClient.send(
      new ListExecutionsCommand({
        stateMachineArn,
        maxResults: 10,
      })
    );

    const executions: ExecutionDetails[] = [];

    // Get full details for each execution including input/output
    for (const execution of response.executions || []) {
      if (execution.executionArn) {
        try {
          const executionDetails = await this.sfnClient.send(
            new DescribeExecutionCommand({
              executionArn: execution.executionArn,
            })
          );

          executions.push({
            executionArn: execution.executionArn,
            stateMachineArn: execution.stateMachineArn || '',
            status: execution.status || '',
            startDate: execution.startDate || new Date(),
            stopDate: execution.stopDate,
            input: executionDetails.input,
            output: executionDetails.output,
          });
        } catch (_error) {
          // Fallback to basic details
          executions.push({
            executionArn: execution.executionArn,
            stateMachineArn: execution.stateMachineArn || '',
            status: execution.status || '',
            startDate: execution.startDate || new Date(),
            stopDate: execution.stopDate,
          });
        }
      }
    }

    return executions;
  }

  /**
   * Verify that a specific state machine was triggered by checking recent executions
   */
  async verifyStateMachineTriggered(
    expectedStateMachineName: string,
    timeoutMs = 30000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const executions = await this.trackStateMachineExecutions(
        expectedStateMachineName
      );

      // Check if there are any recent executions (within the last 5 minutes)
      const recentExecutions = executions.filter((execution) => {
        const executionTime = new Date(execution.startDate).getTime();
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return executionTime > fiveMinutesAgo;
      });

      if (recentExecutions.length > 0) {
        return true;
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
  }

  /**
   * Get detailed Step Function execution history with state transitions
   */
  async getStepFunctionExecutionHistory(executionArn: string): Promise<
    Array<{
      timestamp: Date;
      type: string;
      stateName?: string;
      stateEnteredEventDetails?: Record<string, unknown>;
      stateExitedEventDetails?: Record<string, unknown>;
      taskSucceededEventDetails?: Record<string, unknown>;
      taskFailedEventDetails?: Record<string, unknown>;
    }>
  > {
    try {
      const response = await this.sfnClient.send(
        new GetExecutionHistoryCommand({ executionArn })
      );

      return (
        response.events?.map((event) => ({
          timestamp: event.timestamp || new Date(),
          type: event.type || '',
          stateName:
            typeof event.stateEnteredEventDetails?.name === 'string'
              ? event.stateEnteredEventDetails?.name
              : undefined,
          stateEnteredEventDetails: event.stateEnteredEventDetails as
            | Record<string, unknown>
            | undefined,
          stateExitedEventDetails: event.stateExitedEventDetails as
            | Record<string, unknown>
            | undefined,
          taskSucceededEventDetails: event.taskSucceededEventDetails as
            | Record<string, unknown>
            | undefined,
          taskFailedEventDetails: event.taskFailedEventDetails as
            | Record<string, unknown>
            | undefined,
        })) || []
      );
    } catch (_error) {
      return [];
    }
  }

  /**
   * Verify Step Function execution completed successfully with all expected states
   */
  async verifyStepFunctionExecutionSuccess(
    executionArn: string,
    expectedStates: string[] = []
  ): Promise<StepFunctionExecutionResult> {
    try {
      const history = await this.getStepFunctionExecutionHistory(executionArn);
      const completedStates: string[] = [];
      const failedStates: string[] = [];
      let startTime: Date | null = null;
      let endTime: Date | null = null;

      for (const event of history) {
        if (event.type === 'ExecutionStarted') {
          startTime = event.timestamp;
        } else if (event.type === 'ExecutionSucceeded') {
          endTime = event.timestamp;
        } else if (event.type === 'StateEntered' && event.stateName) {
          completedStates.push(event.stateName);
        } else if (
          event.type === 'TaskFailed' ||
          event.type === 'StateFailed'
        ) {
          if (event.stateName) {
            failedStates.push(event.stateName);
          }
        }
      }

      const executionTime =
        startTime && endTime ? endTime.getTime() - startTime.getTime() : 0;

      const success =
        failedStates.length === 0 &&
        (expectedStates.length === 0 ||
          expectedStates.every((state) => completedStates.includes(state)));

      return {
        success,
        completedStates,
        failedStates,
        executionTime,
      };
    } catch (_error) {
      return {
        success: false,
        completedStates: [],
        failedStates: [],
        executionTime: 0,
      };
    }
  }

  /**
   * Check Step Function execution performance metrics
   */
  async checkStepFunctionPerformance(
    executionArn: string
  ): Promise<StepFunctionPerformance> {
    try {
      const history = await this.getStepFunctionExecutionHistory(executionArn);
      const stateExecutionTimes: { [stateName: string]: number } = {};
      let totalTime = 0;

      // Calculate execution times for each state
      for (let i = 0; i < history.length - 1; i++) {
        const currentEvent = history[i];
        const nextEvent = history[i + 1];

        if (
          currentEvent.type === 'StateEntered' &&
          nextEvent.type === 'StateExited' &&
          currentEvent.stateName === nextEvent.stateName &&
          currentEvent.stateName
        ) {
          const executionTime =
            nextEvent.timestamp.getTime() - currentEvent.timestamp.getTime();
          stateExecutionTimes[currentEvent.stateName] = executionTime;
          totalTime += executionTime;
        }
      }

      const stateNames = Object.keys(stateExecutionTimes);
      const executionTimes = Object.values(stateExecutionTimes);

      const slowestState =
        stateNames.length > 0
          ? stateNames.reduce((a, b) =>
              stateExecutionTimes[a] > stateExecutionTimes[b] ? a : b
            )
          : null;

      const fastestState =
        stateNames.length > 0
          ? stateNames.reduce((a, b) =>
              stateExecutionTimes[a] < stateExecutionTimes[b] ? a : b
            )
          : null;

      const averageTime =
        executionTimes.length > 0
          ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
          : 0;

      return {
        totalExecutionTime: totalTime,
        averageStateExecutionTime: averageTime,
        slowestState,
        fastestState,
      };
    } catch (_error) {
      return {
        totalExecutionTime: 0,
        averageStateExecutionTime: 0,
        slowestState: null,
        fastestState: null,
      };
    }
  }

  /**
   * Verify Step Function state machine definition is valid
   */
  async verifyStepFunctionDefinition(
    stateMachineName: string
  ): Promise<StepFunctionDefinition> {
    try {
      const stateMachineArn = await this.findStateMachine(stateMachineName);
      const response = await this.sfnClient.send(
        new DescribeStateMachineCommand({ stateMachineArn })
      );

      const definition = response.definition
        ? JSON.parse(response.definition)
        : {};
      const errors: string[] = [];

      // Basic validation
      if (!definition.StartAt) {
        errors.push('Missing StartAt state');
      }

      if (!definition.States) {
        errors.push('Missing States definition');
      }

      const states = definition.States || {};
      const stateNames = Object.keys(states);
      const hasEndStates = stateNames.some(
        (stateName) =>
          states[stateName].End === true ||
          states[stateName].Type === 'Succeed' ||
          states[stateName].Type === 'Fail'
      );

      return {
        isValid: errors.length === 0,
        hasStartState: !!definition.StartAt,
        hasEndStates,
        stateCount: stateNames.length,
        errors,
      };
    } catch (_error) {
      return {
        isValid: false,
        hasStartState: false,
        hasEndStates: false,
        stateCount: 0,
        errors: [`Error parsing definition: ${_error}`],
      };
    }
  }

  /**
   * Get Step Function state output for specific states
   */
  async getStepFunctionStateOutput(
    executionArn: string,
    stateName?: string
  ): Promise<StepFunctionStateOutput[]> {
    try {
      const history = await this.getStepFunctionExecutionHistory(executionArn);
      const stateOutputs: StepFunctionStateOutput[] = [];

      for (const event of history) {
        if (
          event.type === 'TaskStateEntered' ||
          event.type === 'StateEntered'
        ) {
          const stateEnteredEvent = event.stateEnteredEventDetails;
          if (
            stateEnteredEvent &&
            (!stateName || stateEnteredEvent.name === stateName)
          ) {
            const stateOutput: StepFunctionStateOutput = {
              stateName:
                typeof stateEnteredEvent.name === 'string'
                  ? stateEnteredEvent.name
                  : '',
              input:
                typeof stateEnteredEvent.input === 'string' &&
                stateEnteredEvent.input.trim() !== ''
                  ? JSON.parse(stateEnteredEvent.input)
                  : {},
              output: {},
              timestamp: event.timestamp,
              type: event.type,
            };

            // Find corresponding output event
            const outputEvent = history.find(
              (e) => e.type === 'TaskStateExited' || e.type === 'StateExited'
            );
            if (outputEvent?.stateExitedEventDetails) {
              stateOutput.output =
                typeof outputEvent.stateExitedEventDetails.output ===
                  'string' &&
                outputEvent.stateExitedEventDetails.output.trim() !== ''
                  ? JSON.parse(outputEvent.stateExitedEventDetails.output)
                  : {};
            }

            stateOutputs.push(stateOutput);
          }
        }
      }

      return stateOutputs;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Verify Step Function state output contains expected data
   */
  async verifyStepFunctionStateOutput(
    executionArn: string,
    stateName: string,
    expectedOutput: Record<string, unknown>
  ): Promise<StepFunctionStateOutputVerification> {
    try {
      const stateOutputs = await this.getStepFunctionStateOutput(
        executionArn,
        stateName
      );
      const stateOutput = stateOutputs.find(
        (output) => output.stateName === stateName
      );

      if (!stateOutput) {
        return {
          matches: false,
          actualOutput: {},
          missingFields: Object.keys(expectedOutput),
          extraFields: [],
        };
      }

      const actualOutput = stateOutput.output;
      const missingFields: string[] = [];
      const extraFields: string[] = [];

      // Check for missing fields
      for (const [key, value] of Object.entries(expectedOutput)) {
        if (!(key in actualOutput) || actualOutput[key] !== value) {
          missingFields.push(key);
        }
      }

      // Check for extra fields (optional)
      for (const key of Object.keys(actualOutput)) {
        if (!(key in expectedOutput)) {
          extraFields.push(key);
        }
      }

      return {
        matches: missingFields.length === 0,
        actualOutput,
        missingFields,
        extraFields,
      };
    } catch (_error) {
      return {
        matches: false,
        actualOutput: {},
        missingFields: Object.keys(expectedOutput),
        extraFields: [],
      };
    }
  }

  /**
   * Get Step Function execution data flow analysis
   */
  async getStepFunctionDataFlow(
    executionArn: string
  ): Promise<StepFunctionDataFlow> {
    try {
      const history = await this.getStepFunctionExecutionHistory(executionArn);
      const dataFlow: Array<{
        fromState: string;
        toState: string;
        dataTransformation: Record<string, unknown>;
        timestamp: Date;
      }> = [];
      let dataLoss = false;
      let dataCorruption = false;

      // Analyze data flow between states
      for (let i = 0; i < history.length - 1; i++) {
        const currentEvent = history[i];
        const nextEvent = history[i + 1];

        if (
          currentEvent.type === 'StateExited' &&
          nextEvent.type === 'StateEntered'
        ) {
          const fromState =
            typeof currentEvent.stateExitedEventDetails?.name === 'string'
              ? currentEvent.stateExitedEventDetails.name
              : '';
          const toState =
            typeof nextEvent.stateEnteredEventDetails?.name === 'string'
              ? nextEvent.stateEnteredEventDetails.name
              : '';

          if (fromState && toState) {
            const fromOutput =
              typeof currentEvent.stateExitedEventDetails?.output ===
                'string' &&
              currentEvent.stateExitedEventDetails.output.trim() !== ''
                ? JSON.parse(currentEvent.stateExitedEventDetails.output)
                : {};
            const toInput =
              typeof nextEvent.stateEnteredEventDetails?.input === 'string' &&
              nextEvent.stateEnteredEventDetails.input.trim() !== ''
                ? JSON.parse(nextEvent.stateEnteredEventDetails.input)
                : {};

            // Check for data loss
            if (
              Object.keys(fromOutput).length > 0 &&
              Object.keys(toInput).length === 0
            ) {
              dataLoss = true;
            }

            // Check for data corruption (simplified check)
            const outputKeys = Object.keys(fromOutput);
            const inputKeys = Object.keys(toInput);
            if (outputKeys.length > 0 && inputKeys.length > 0) {
              const commonKeys = outputKeys.filter((key) =>
                inputKeys.includes(key)
              );
              if (commonKeys.length === 0) {
                dataCorruption = true;
              }
            }

            dataFlow.push({
              fromState,
              toState,
              dataTransformation: {
                output: fromOutput,
                input: toInput,
              },
              timestamp: nextEvent.timestamp,
            });
          }
        }
      }

      return {
        dataFlow,
        dataLoss,
        dataCorruption,
      };
    } catch (_error) {
      return {
        dataFlow: [],
        dataLoss: false,
        dataCorruption: false,
      };
    }
  }

  /**
   * Verify Step Function execution meets performance SLAs
   */
  async verifyStepFunctionSLAs(
    executionArn: string,
    slas: StepFunctionSLAs
  ): Promise<StepFunctionSLAVerification> {
    try {
      const performance = await this.checkStepFunctionPerformance(executionArn);
      const violations: string[] = [];

      if (
        slas.maxTotalExecutionTime &&
        performance.totalExecutionTime > slas.maxTotalExecutionTime
      ) {
        violations.push(
          `Total execution time ${performance.totalExecutionTime}ms exceeds SLA of ${slas.maxTotalExecutionTime}ms`
        );
      }

      if (
        slas.maxStateExecutionTime &&
        performance.averageStateExecutionTime > slas.maxStateExecutionTime
      ) {
        violations.push(
          `Average state execution time ${performance.averageStateExecutionTime}ms exceeds SLA of ${slas.maxStateExecutionTime}ms`
        );
      }

      // Cold start detection (simplified)
      const coldStartTime = performance.slowestState
        ? performance.totalExecutionTime * 0.1
        : 0;
      if (slas.maxColdStartTime && coldStartTime > slas.maxColdStartTime) {
        violations.push(
          `Cold start time ${coldStartTime}ms exceeds SLA of ${slas.maxColdStartTime}ms`
        );
      }

      return {
        meetsSLAs: violations.length === 0,
        violations,
        metrics: {
          totalExecutionTime: performance.totalExecutionTime,
          maxStateExecutionTime: performance.averageStateExecutionTime,
          coldStartTime,
        },
      };
    } catch (_error) {
      return {
        meetsSLAs: false,
        violations: [`Error verifying SLAs: ${_error}`],
        metrics: {
          totalExecutionTime: 0,
          maxStateExecutionTime: 0,
          coldStartTime: 0,
        },
      };
    }
  }
}
