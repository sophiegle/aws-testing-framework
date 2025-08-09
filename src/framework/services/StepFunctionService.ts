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

/**
 * Configuration for Step Function service operations
 */
export interface StepFunctionConfig {
  /** Default timeout for operations in milliseconds */
  defaultTimeoutMs: number;
  /** Maximum number of executions to retrieve */
  maxExecutionsToRetrieve: number;
  /** Time window for considering executions as "recent" in milliseconds */
  recentExecutionWindowMs: number;
  /** Polling interval for waiting operations in milliseconds */
  pollingIntervalMs: number;
  /** Maximum retry attempts for failed operations */
  maxRetryAttempts: number;
  /** Whether to enable detailed logging */
  enableLogging: boolean;
}

/**
 * Default configuration for Step Function service
 */
export const DEFAULT_STEP_FUNCTION_CONFIG: StepFunctionConfig = {
  defaultTimeoutMs: 30000,
  maxExecutionsToRetrieve: 10,
  recentExecutionWindowMs: 5 * 60 * 1000, // 5 minutes
  pollingIntervalMs: 1000,
  maxRetryAttempts: 3,
  enableLogging: false,
};

/**
 * Custom error class for Step Function operations
 */
export class StepFunctionError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StepFunctionError';
  }
}

export class StepFunctionService {
  private sfnClient: SFNClient;
  private config: StepFunctionConfig;

  constructor(sfnClient: SFNClient, config?: Partial<StepFunctionConfig>) {
    this.sfnClient = sfnClient;
    this.config = { ...DEFAULT_STEP_FUNCTION_CONFIG, ...config };
  }

  /**
   * Log message if logging is enabled
   */
  private log(
    _message: string,
    _level: 'debug' | 'info' | 'warn' | 'error' = 'info'
  ): void {
    if (this.config.enableLogging) {
      const _timestamp = new Date().toISOString();
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        this.log(
          `Attempting ${operationName} (attempt ${attempt}/${this.config.maxRetryAttempts})`
        );
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.log(`Attempt ${attempt} failed: ${error}`, 'warn');

        if (attempt < this.config.maxRetryAttempts) {
          const delay = 2 ** (attempt - 1) * 1000; // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new StepFunctionError(
      `Operation ${operationName} failed after ${this.config.maxRetryAttempts} attempts`,
      operationName,
      lastError
    );
  }

  /**
   * Find state machine by name and return its ARN
   * @param stateMachineName - Name of the state machine to find
   * @returns Promise resolving to the state machine ARN
   * @throws StepFunctionError if state machine is not found
   */
  async findStateMachine(stateMachineName: string): Promise<string> {
    return this.retryOperation(async () => {
      this.log(`Finding state machine: ${stateMachineName}`);

      const command = new ListStateMachinesCommand({});
      const response = await this.sfnClient.send(command);
      const stateMachine = response.stateMachines?.find(
        (sm) => sm.name === stateMachineName
      );

      if (!stateMachine?.stateMachineArn) {
        const availableMachines =
          response.stateMachines?.map((sm) => sm.name).join(', ') || 'none';
        throw new StepFunctionError(
          `State machine "${stateMachineName}" not found. Available state machines: ${availableMachines}`,
          'findStateMachine'
        );
      }

      this.log(`Found state machine: ${stateMachine.stateMachineArn}`);
      return stateMachine.stateMachineArn;
    }, 'findStateMachine');
  }

  /**
   * Start a new Step Function execution
   * @param stateMachineArn - ARN of the state machine to execute
   * @param input - Input data for the execution
   * @returns Promise resolving to the execution ARN
   * @throws StepFunctionError if execution fails to start
   */
  async startExecution(
    stateMachineArn: string,
    input: Record<string, unknown>
  ): Promise<string> {
    return this.retryOperation(async () => {
      this.log(`Starting execution for state machine: ${stateMachineArn}`);

      const response = await this.sfnClient.send(
        new StartExecutionCommand({
          stateMachineArn,
          input: JSON.stringify(input),
        })
      );

      if (!response.executionArn) {
        throw new StepFunctionError(
          'Failed to start execution: No execution ARN returned',
          'startExecution'
        );
      }

      this.log(`Execution started: ${response.executionArn}`);
      return response.executionArn;
    }, 'startExecution');
  }

  /**
   * List recent executions for a state machine
   * @param stateMachineName - Name of the state machine
   * @returns Promise resolving to array of execution details
   */
  async listExecutions(
    stateMachineName: string
  ): Promise<
    Array<{ executionArn: string; startDate?: Date; status?: string }>
  > {
    return this.retryOperation(async () => {
      this.log(`Listing executions for state machine: ${stateMachineName}`);

      const stateMachineArn = await this.findStateMachine(stateMachineName);
      const response = await this.sfnClient.send(
        new ListExecutionsCommand({
          stateMachineArn,
          maxResults: this.config.maxExecutionsToRetrieve,
        })
      );

      const executions =
        response.executions?.map((execution) => ({
          executionArn: execution.executionArn || '',
          startDate: execution.startDate,
          status: execution.status,
        })) || [];

      this.log(`Found ${executions.length} executions`);
      return executions;
    }, 'listExecutions');
  }

  /**
   * Get the current status of an execution
   * @param executionArn - ARN of the execution to check
   * @returns Promise resolving to the execution status
   */
  async getExecutionStatus(executionArn: string): Promise<string> {
    return this.retryOperation(async () => {
      this.log(`Getting execution status: ${executionArn}`);

      const response = await this.sfnClient.send(
        new DescribeExecutionCommand({
          executionArn,
        })
      );

      const status = response.status || '';
      this.log(`Execution status: ${status}`);
      return status;
    }, 'getExecutionStatus');
  }

  /**
   * Check if Step Function has been executed recently
   * @param stateMachineName - Name of the state machine to check
   * @returns Promise resolving to true if recent executions exist
   */
  async checkStateMachineExecution(stateMachineName: string): Promise<boolean> {
    try {
      this.log(`Checking for recent executions: ${stateMachineName}`);

      const executions = await this.listExecutions(stateMachineName);
      if (executions.length === 0) {
        this.log('No executions found');
        return false;
      }

      // Check for executions within the recent window
      const recentExecutions = executions.filter((execution) => {
        if (!execution.startDate) return false;
        const executionTime = new Date(execution.startDate).getTime();
        const cutoffTime = Date.now() - this.config.recentExecutionWindowMs;
        return executionTime > cutoffTime;
      });

      const hasRecentExecutions = recentExecutions.length > 0;
      this.log(`Found ${recentExecutions.length} recent executions`);
      return hasRecentExecutions;
    } catch (error) {
      this.log(`Error checking state machine execution: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Track executions for a specific state machine
   * @param stateMachineName - Name of the state machine to track
   * @returns Promise resolving to array of execution details
   * @throws StepFunctionError if state machine is not found or invalid
   */
  async trackStateMachineExecutions(
    stateMachineName: string
  ): Promise<ExecutionDetails[]> {
    return this.retryOperation(async () => {
      this.log(`Tracking executions for state machine: ${stateMachineName}`);

      const stateMachineArn = await this.findStateMachine(stateMachineName);

      if (!stateMachineArn || stateMachineArn.trim() === '') {
        throw new StepFunctionError(
          `Invalid state machine ARN for "${stateMachineName}": ${stateMachineArn}`,
          'trackStateMachineExecutions'
        );
      }

      const response = await this.sfnClient.send(
        new ListExecutionsCommand({
          stateMachineArn,
          maxResults: this.config.maxExecutionsToRetrieve,
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
          } catch (error) {
            this.log(
              `Failed to get details for execution ${execution.executionArn}: ${error}`,
              'warn'
            );
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

      this.log(`Tracked ${executions.length} executions`);
      return executions;
    }, 'trackStateMachineExecutions');
  }

  /**
   * Verify that a specific state machine was triggered by checking recent executions
   * @param expectedStateMachineName - Name of the state machine to verify
   * @param timeoutMs - Timeout for the verification in milliseconds
   * @returns Promise resolving to true if state machine was triggered
   */
  async verifyStateMachineTriggered(
    expectedStateMachineName: string,
    timeoutMs = 30000
  ): Promise<boolean> {
    try {
      this.log(
        `Verifying state machine triggered: ${expectedStateMachineName} (timeout: ${timeoutMs}ms)`
      );

      const startTime = Date.now();
      const timeout = timeoutMs || this.config.defaultTimeoutMs;

      while (Date.now() - startTime < timeout) {
        const executions = await this.trackStateMachineExecutions(
          expectedStateMachineName
        );

        // Check if there are any recent executions within the configured window
        const recentExecutions = executions.filter((execution) => {
          const executionTime = new Date(execution.startDate).getTime();
          const cutoffTime = Date.now() - this.config.recentExecutionWindowMs;
          return executionTime > cutoffTime;
        });

        if (recentExecutions.length > 0) {
          this.log(
            `State machine triggered: found ${recentExecutions.length} recent executions`
          );
          return true;
        }

        // Wait before checking again
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.pollingIntervalMs)
        );
      }

      this.log('State machine not triggered within timeout period');
      return false;
    } catch (error) {
      this.log(`Error verifying state machine trigger: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Get detailed Step Function execution history with state transitions
   * @param executionArn - ARN of the execution to get history for
   * @returns Promise resolving to array of execution history events
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
    return this.retryOperation(async () => {
      this.log(`Getting execution history: ${executionArn}`);

      const response = await this.sfnClient.send(
        new GetExecutionHistoryCommand({ executionArn })
      );

      const events =
        response.events?.map((event) => ({
          timestamp: event.timestamp || new Date(),
          type: event.type || '',
          stateName:
            typeof event.stateEnteredEventDetails?.name === 'string'
              ? event.stateEnteredEventDetails?.name
              : undefined,
          stateEnteredEventDetails: event.stateEnteredEventDetails as unknown as
            | Record<string, unknown>
            | undefined,
          stateExitedEventDetails: event.stateExitedEventDetails as unknown as
            | Record<string, unknown>
            | undefined,
          taskSucceededEventDetails:
            event.taskSucceededEventDetails as unknown as
              | Record<string, unknown>
              | undefined,
          taskFailedEventDetails: event.taskFailedEventDetails as unknown as
            | Record<string, unknown>
            | undefined,
        })) || [];

      this.log(`Retrieved ${events.length} history events`);
      return events;
    }, 'getStepFunctionExecutionHistory');
  }

  /**
   * Verify Step Function execution completed successfully with all expected states
   * @param executionArn - ARN of the execution to verify
   * @param expectedStates - Array of expected state names to verify completion
   * @returns Promise resolving to execution result with success status and details
   */
  async verifyStepFunctionExecutionSuccess(
    executionArn: string,
    expectedStates: string[] = []
  ): Promise<StepFunctionExecutionResult> {
    try {
      this.log(
        `Verifying execution success: ${executionArn} (expected states: ${expectedStates.join(', ')})`
      );

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

      this.log(
        `Execution verification result: success=${success}, completed=${completedStates.length}, failed=${failedStates.length}, time=${executionTime}ms`
      );

      return {
        success,
        completedStates,
        failedStates,
        executionTime,
      };
    } catch (error) {
      this.log(`Error verifying execution success: ${error}`, 'error');
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
   * @param executionArn - ARN of the execution to analyze
   * @returns Promise resolving to performance metrics
   */
  async checkStepFunctionPerformance(
    executionArn: string
  ): Promise<StepFunctionPerformance> {
    try {
      this.log(`Checking performance metrics: ${executionArn}`);

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

      this.log(
        `Performance analysis: total=${totalTime}ms, avg=${averageTime}ms, slowest=${slowestState}, fastest=${fastestState}`
      );

      return {
        totalExecutionTime: totalTime,
        averageStateExecutionTime: averageTime,
        slowestState,
        fastestState,
      };
    } catch (error) {
      this.log(`Error checking performance metrics: ${error}`, 'error');
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
   * @param stateMachineName - Name of the state machine to verify
   * @returns Promise resolving to definition validation result
   */
  async verifyStepFunctionDefinition(
    stateMachineName: string
  ): Promise<StepFunctionDefinition> {
    try {
      this.log(`Verifying state machine definition: ${stateMachineName}`);

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

      const isValid = errors.length === 0;
      this.log(
        `Definition validation: valid=${isValid}, states=${stateNames.length}, errors=${errors.length}`
      );

      return {
        isValid,
        hasStartState: !!definition.StartAt,
        hasEndStates,
        stateCount: stateNames.length,
        errors,
      };
    } catch (error) {
      this.log(`Error verifying state machine definition: ${error}`, 'error');
      return {
        isValid: false,
        hasStartState: false,
        hasEndStates: false,
        stateCount: 0,
        errors: [`Error parsing definition: ${error}`],
      };
    }
  }

  /**
   * Get Step Function state output for specific states
   * @param executionArn - ARN of the execution to analyze
   * @param stateName - Optional specific state name to filter by
   * @returns Promise resolving to array of state outputs
   */
  async getStepFunctionStateOutput(
    executionArn: string,
    stateName?: string
  ): Promise<StepFunctionStateOutput[]> {
    try {
      this.log(
        `Getting state output: ${executionArn}${stateName ? ` (state: ${stateName})` : ''}`
      );

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

      this.log(`Retrieved ${stateOutputs.length} state outputs`);
      return stateOutputs;
    } catch (error) {
      this.log(`Error getting state output: ${error}`, 'error');
      return [];
    }
  }

  /**
   * Verify Step Function state output contains expected data
   * @param executionArn - ARN of the execution to verify
   * @param stateName - Name of the state to verify output for
   * @param expectedOutput - Expected output data to verify against
   * @returns Promise resolving to verification result
   */
  async verifyStepFunctionStateOutput(
    executionArn: string,
    stateName: string,
    expectedOutput: Record<string, unknown>
  ): Promise<StepFunctionStateOutputVerification> {
    try {
      this.log(`Verifying state output: ${executionArn} (state: ${stateName})`);

      const stateOutputs = await this.getStepFunctionStateOutput(
        executionArn,
        stateName
      );
      const stateOutput = stateOutputs.find(
        (output) => output.stateName === stateName
      );

      if (!stateOutput) {
        this.log(`State output not found for state: ${stateName}`);
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

      const matches = missingFields.length === 0;
      this.log(
        `State output verification: matches=${matches}, missing=${missingFields.length}, extra=${extraFields.length}`
      );

      return {
        matches,
        actualOutput,
        missingFields,
        extraFields,
      };
    } catch (error) {
      this.log(`Error verifying state output: ${error}`, 'error');
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
   * @param executionArn - ARN of the execution to analyze
   * @returns Promise resolving to data flow analysis result
   */
  async getStepFunctionDataFlow(
    executionArn: string
  ): Promise<StepFunctionDataFlow> {
    try {
      this.log(`Analyzing data flow: ${executionArn}`);

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

      this.log(
        `Data flow analysis: flows=${dataFlow.length}, dataLoss=${dataLoss}, dataCorruption=${dataCorruption}`
      );

      return {
        dataFlow,
        dataLoss,
        dataCorruption,
      };
    } catch (error) {
      this.log(`Error analyzing data flow: ${error}`, 'error');
      return {
        dataFlow: [],
        dataLoss: false,
        dataCorruption: false,
      };
    }
  }

  /**
   * Verify Step Function execution meets performance SLAs
   * @param executionArn - ARN of the execution to verify
   * @param slas - SLA requirements to verify against
   * @returns Promise resolving to SLA verification result
   */
  async verifyStepFunctionSLAs(
    executionArn: string,
    slas: StepFunctionSLAs
  ): Promise<StepFunctionSLAVerification> {
    try {
      this.log(`Verifying SLAs: ${executionArn}`);

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

      const meetsSLAs = violations.length === 0;
      this.log(
        `SLA verification: meetsSLAs=${meetsSLAs}, violations=${violations.length}`
      );

      return {
        meetsSLAs,
        violations,
        metrics: {
          totalExecutionTime: performance.totalExecutionTime,
          maxStateExecutionTime: performance.averageStateExecutionTime,
          coldStartTime,
        },
      };
    } catch (error) {
      this.log(`Error verifying SLAs: ${error}`, 'error');
      return {
        meetsSLAs: false,
        violations: [`Error verifying SLAs: ${error}`],
        metrics: {
          totalExecutionTime: 0,
          maxStateExecutionTime: 0,
          coldStartTime: 0,
        },
      };
    }
  }
}
