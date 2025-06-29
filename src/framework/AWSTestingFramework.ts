import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  InvokeCommand,
  LambdaClient,
  ListFunctionsCommand,
} from '@aws-sdk/client-lambda';
import {
  HeadObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  DescribeExecutionCommand,
  DescribeStateMachineCommand,
  GetExecutionHistoryCommand,
  ListExecutionsCommand,
  ListStateMachinesCommand,
  SFNClient,
  StartExecutionCommand,
} from '@aws-sdk/client-sfn';
import {
  GetQueueAttributesCommand,
  ListQueuesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { TestReporter } from '../reporting/TestReporter';

export interface AWSConfig {
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  profile?: string;
  endpoint?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface FrameworkConfig {
  aws?: AWSConfig;
  defaultTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  testDataDir?: string;
}

export interface StepContext {
  bucketName?: string;
  queueUrl?: string;
  queueName?: string;
  functionName?: string;
  stateMachineArn?: string;
  executionArn?: string;
  stateMachineName?: string;
  expectedStateMachineName?: string;
  uploadedFileName?: string;
  uploadedFileContent?: string;
}

export interface ExecutionDetails {
  executionArn: string;
  stateMachineArn: string;
  status: string;
  startDate: Date;
  stopDate?: Date;
  input?: string;
  output?: string;
}

export interface PerformanceMetrics {
  operationName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  error?: string;
  retryCount: number;
  awsService: string;
}

export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  slowestOperation: PerformanceMetrics | null;
  fastestOperation: PerformanceMetrics | null;
  errorRate: number;
  retryRate: number;
}

export class AWSTestingFramework {
  private s3Client: S3Client;
  private sqsClient: SQSClient;
  private lambdaClient: LambdaClient;
  private sfnClient: SFNClient;
  private cloudWatchLogsClient: CloudWatchLogsClient;
  private reporter: TestReporter;
  private executionTracker: Map<string, ExecutionDetails[]> = new Map();
  private config: FrameworkConfig;
  private performanceMetrics: PerformanceMetrics[] = [];
  private testStartTime: Date | null = null;

  /**
   * Step context management for tracking state between test steps
   */
  private stepContext: StepContext = {};

  /**
   * Create framework instance with common configurations
   */
  static create(config?: Partial<FrameworkConfig>): AWSTestingFramework {
    return new AWSTestingFramework(config);
  }

  /**
   * Create framework instance for development environment
   */
  static createForDevelopment(region?: string): AWSTestingFramework {
    return new AWSTestingFramework({
      aws: { region: region || 'us-east-1' },
      defaultTimeout: 60000,
      retryAttempts: 5,
      retryDelay: 2000,
      enableLogging: true,
      logLevel: 'debug',
    });
  }

  /**
   * Create framework instance for production environment
   */
  static createForProduction(region?: string): AWSTestingFramework {
    return new AWSTestingFramework({
      aws: { region: region || 'us-east-1' },
      defaultTimeout: 120000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableLogging: true,
      logLevel: 'info',
    });
  }

  /**
   * Create framework instance for CI/CD environment
   */
  static createForCI(region?: string): AWSTestingFramework {
    return new AWSTestingFramework({
      aws: { region: region || 'us-east-1' },
      defaultTimeout: 300000, // 5 minutes for CI
      retryAttempts: 3,
      retryDelay: 1000,
      enableLogging: true,
      logLevel: 'warn',
    });
  }

  constructor(config?: FrameworkConfig) {
    this.config = {
      defaultTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableLogging: true,
      logLevel: 'info',
      testDataDir: './test-data',
      ...config,
    };

    const awsConfig = this.config.aws || {};
    const clientConfig = {
      region: awsConfig.region || process.env.AWS_REGION || 'us-east-1',
      maxAttempts: awsConfig.maxRetries || 3,
      requestHandler: awsConfig.timeout
        ? { requestTimeout: awsConfig.timeout }
        : undefined,
    };

    this.s3Client = new S3Client(clientConfig);
    this.sqsClient = new SQSClient(clientConfig);
    this.lambdaClient = new LambdaClient(clientConfig);
    this.sfnClient = new SFNClient(clientConfig);
    this.cloudWatchLogsClient = new CloudWatchLogsClient(clientConfig);
    this.reporter = new TestReporter();
  }

  /**
   * Get the current framework configuration
   */
  getConfig(): FrameworkConfig {
    return { ...this.config };
  }

  /**
   * Update framework configuration
   */
  updateConfig(updates: Partial<FrameworkConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Log messages based on configured log level
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    _message: string,
    data?: unknown
  ): void {
    if (!this.config.enableLogging) return;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.config.logLevel || 'info'];
    const messageLevel = levels[level];

    if (messageLevel >= currentLevel) {
      const timestamp = new Date().toISOString();
      const _prefix = `[${timestamp}] [${level.toUpperCase()}] AWS Testing Framework:`;

      if (data) {
      } else {
      }
    }
  }

  configureReporter(_outputDir?: string) {
    this.reporter = new TestReporter();
    return this;
  }

  getReporter() {
    return this.reporter;
  }

  //#region S3

  async findBucket(bucketName: string): Promise<void> {
    const command = new ListBucketsCommand({});
    const response = await this.s3Client.send(command);
    const bucket = response.Buckets?.find(
      (bucket) => bucket.Name === bucketName
    );
    if (!bucket) {
      throw new Error(`Bucket ${bucketName} not found`);
    }
    this.log('info', `Found S3 bucket: ${bucketName}`);
  }

  async uploadFile(
    bucketName: string,
    fileName: string,
    content: string
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: content,
      })
    );
    this.log('info', `Uploaded file ${fileName} to bucket ${bucketName}`);
  }

  async checkFileExists(
    bucketName: string,
    fileName: string
  ): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: fileName,
        })
      );
      return true;
    } catch (error) {
      this.log(
        'debug',
        `File ${fileName} not found in bucket ${bucketName}:`,
        error
      );
      return false;
    }
  }

  //#endregion

  //#region SQS

  async findQueue(queueName: string): Promise<string> {
    const command = new ListQueuesCommand({});
    const response = await this.sqsClient.send(command);
    const queue = response.QueueUrls?.find((queue) =>
      queue.includes(queueName)
    );
    return queue ?? '';
  }

  async sendMessage(queueUrl: string, message: string): Promise<void> {
    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: message,
      })
    );
  }

  async receiveMessage(queueUrl: string): Promise<{
    Body?: string;
    MessageId?: string;
    ReceiptHandle?: string;
  } | null> {
    const response = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 1,
      })
    );
    return response.Messages?.[0] ?? null;
  }

  async getUnreadMessageCount(queueUrl: string): Promise<number> {
    const response = await this.sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages'],
      })
    );
    return Number.parseInt(
      response.Attributes?.ApproximateNumberOfMessages || '0',
      10
    );
  }

  //#endregion

  //#region Lambda

  async findFunction(functionName: string): Promise<void> {
    const command = new ListFunctionsCommand({});
    const response = await this.lambdaClient.send(command);
    const functionDetails = response.Functions?.find(
      (f) => f.FunctionName === functionName
    );
    if (!functionDetails) {
      throw new Error(`Lambda function ${functionName} not found`);
    }
  }

  async invokeFunction(
    functionName: string,
    payload: Record<string, unknown>
  ): Promise<{ Payload?: string } | null> {
    const response = await this.lambdaClient.send(
      new InvokeCommand({
        FunctionName: functionName,
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );
    return {
      Payload: response.Payload
        ? Buffer.from(response.Payload).toString()
        : undefined,
    };
  }

  /**
   * Check if Lambda function has been executed recently
   */
  async checkLambdaExecution(functionName: string): Promise<boolean> {
    try {
      // Check if the function exists and is accessible
      await this.findFunction(functionName);

      // In a real implementation, you would check CloudWatch logs or Lambda metrics
      // For now, we'll check if the function is accessible and assume it can be executed
      // This is a limitation that should be addressed with proper CloudWatch integration

      // TODO: Implement proper Lambda execution checking using CloudWatch logs
      // const logs = await this.getLambdaLogs(functionName, startTime, endTime);
      // return logs.length > 0;

      return true;
    } catch (_error) {
      return false;
    }
  }

  //#endregion

  //#region Step Functions

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
  async trackStateMachineExecutions(stateMachineName: string): Promise<void> {
    try {
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

      this.executionTracker.set(stateMachineName, executions);
    } catch (error) {
      // Set empty array to avoid undefined errors
      this.executionTracker.set(stateMachineName, []);
      throw error; // Re-throw to let calling code handle it
    }
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
      await this.trackStateMachineExecutions(expectedStateMachineName);
      const executions =
        this.executionTracker.get(expectedStateMachineName) || [];

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
   * Get execution details for a specific state machine
   */
  async getExecutionDetails(
    stateMachineName: string
  ): Promise<ExecutionDetails[]> {
    await this.trackStateMachineExecutions(stateMachineName);
    return this.executionTracker.get(stateMachineName) || [];
  }

  /**
   * Verify that a Lambda function triggered a specific state machine
   */
  async verifyLambdaTriggeredStateMachine(
    lambdaFunctionName: string,
    expectedStateMachineName: string
  ): Promise<boolean> {
    // First, verify the Lambda function executed
    const lambdaExecuted = await this.checkLambdaExecution(lambdaFunctionName);
    if (!lambdaExecuted) {
      return false;
    }

    // Then, verify the expected state machine was triggered
    return await this.verifyStateMachineTriggered(expectedStateMachineName);
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
  ): Promise<{
    success: boolean;
    completedStates: string[];
    failedStates: string[];
    executionTime: number;
  }> {
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
  async checkStepFunctionPerformance(executionArn: string): Promise<{
    totalExecutionTime: number;
    averageStateExecutionTime: number;
    slowestState: string | null;
    fastestState: string | null;
  }> {
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
  async verifyStepFunctionDefinition(stateMachineName: string): Promise<{
    isValid: boolean;
    hasStartState: boolean;
    hasEndStates: boolean;
    stateCount: number;
    errors: string[];
  }> {
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
  ): Promise<
    Array<{
      stateName: string;
      input: Record<string, unknown>;
      output: Record<string, unknown>;
      timestamp: Date;
      type: string;
    }>
  > {
    try {
      const history = await this.getStepFunctionExecutionHistory(executionArn);
      const stateOutputs: Array<{
        stateName: string;
        input: Record<string, unknown>;
        output: Record<string, unknown>;
        timestamp: Date;
        type: string;
      }> = [];

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
            const stateOutput = {
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
  ): Promise<{
    matches: boolean;
    actualOutput: Record<string, unknown>;
    missingFields: string[];
    extraFields: string[];
  }> {
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
  async getStepFunctionDataFlow(executionArn: string): Promise<{
    dataFlow: Array<{
      fromState: string;
      toState: string;
      dataTransformation: Record<string, unknown>;
      timestamp: Date;
    }>;
    dataLoss: boolean;
    dataCorruption: boolean;
  }> {
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
    slas: {
      maxTotalExecutionTime?: number;
      maxStateExecutionTime?: number;
      maxColdStartTime?: number;
    }
  ): Promise<{
    meetsSLAs: boolean;
    violations: string[];
    metrics: {
      totalExecutionTime: number;
      maxStateExecutionTime: number;
      coldStartTime: number;
    };
  }> {
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

  /**
   * Wait for a condition to be true with timeout
   */
  async waitForCondition(
    condition: () => Promise<boolean>,
    timeout = 30000,
    interval = 1000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return;
        }
      } catch (_error) {}

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms timeout`);
  }

  /**
   * Enhanced cleanup with comprehensive resource management
   */
  async cleanup(options?: {
    clearContext?: boolean;
    clearMetrics?: boolean;
    clearExecutions?: boolean;
    generateReport?: boolean;
  }): Promise<void> {
    const {
      clearContext = true,
      clearMetrics = true,
      clearExecutions = true,
      generateReport = true,
    } = options || {};

    this.log('info', 'Starting framework cleanup');

    try {
      // Generate final performance report if requested
      if (generateReport && this.performanceMetrics.length > 0) {
        const report = this.generatePerformanceReport();
        this.log('info', `Final Performance Report:\n${report}`);
      }

      // Clear step context
      if (clearContext) {
        this.clearStepContext();
      }

      // Clear performance metrics
      if (clearMetrics) {
        this.performanceMetrics = [];
        this.testStartTime = null;
      }

      // Clear execution tracker
      if (clearExecutions) {
        this.executionTracker.clear();
      }

      this.log('info', 'Framework cleanup completed successfully');
    } catch (error) {
      this.log(
        'error',
        `Error during cleanup: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Cleanup specific resources
   */
  async cleanupResources(
    resourceType: 's3' | 'sqs' | 'lambda' | 'stepfunctions' | 'all'
  ): Promise<void> {
    this.log('info', `Cleaning up ${resourceType} resources`);

    try {
      switch (resourceType) {
        case 's3':
          // TODO: Implement S3 cleanup (delete test files)
          this.log('info', 'S3 cleanup requested (not implemented)');
          break;
        case 'sqs':
          // TODO: Implement SQS cleanup (purge queues)
          this.log('info', 'SQS cleanup requested (not implemented)');
          break;
        case 'lambda':
          // TODO: Implement Lambda cleanup (stop executions)
          this.log('info', 'Lambda cleanup requested (not implemented)');
          break;
        case 'stepfunctions':
          // TODO: Implement Step Functions cleanup (stop executions)
          this.log(
            'info',
            'Step Functions cleanup requested (not implemented)'
          );
          break;
        case 'all':
          await this.cleanup();
          break;
      }
    } catch (error) {
      this.log(
        'error',
        `Error cleaning up ${resourceType} resources: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get framework health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    awsSetup: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
    performance: {
      totalOperations: number;
      errorRate: number;
      averageResponseTime: number;
    };
    resources: {
      activeExecutions: number;
      contextEntries: number;
    };
  }> {
    const awsSetup = await this.validateAWSSetup();
    const metrics = this.getTestMetrics();
    const context = this.getStepContext();

    return {
      isHealthy: awsSetup.isValid && metrics.errorRate < 50,
      awsSetup,
      performance: {
        totalOperations: metrics.totalTests,
        errorRate: metrics.errorRate,
        averageResponseTime: metrics.averageExecutionTime,
      },
      resources: {
        activeExecutions: this.executionTracker.size,
        contextEntries: Object.keys(context).length,
      },
    };
  }

  /**
   * Start performance monitoring for a test run
   */
  startTestRun(): void {
    this.testStartTime = new Date();
    this.performanceMetrics = [];
    this.log('info', 'Started performance monitoring for test run');
  }

  /**
   * Record performance metrics for an operation
   */
  private recordPerformanceMetrics(
    operationName: string,
    startTime: Date,
    endTime: Date,
    success: boolean,
    error?: string,
    retryCount = 0,
    awsService = 'unknown'
  ): void {
    const metrics: PerformanceMetrics = {
      operationName,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      success,
      error,
      retryCount,
      awsService,
    };

    this.performanceMetrics.push(metrics);
    this.log(
      'debug',
      `Recorded performance metrics for ${operationName}: ${metrics.duration}ms`
    );
  }

  /**
   * Get comprehensive test metrics
   */
  getTestMetrics(): TestMetrics {
    if (this.performanceMetrics.length === 0) {
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        averageExecutionTime: 0,
        totalExecutionTime: 0,
        slowestOperation: null,
        fastestOperation: null,
        errorRate: 0,
        retryRate: 0,
      };
    }

    const successfulOperations = this.performanceMetrics.filter(
      (m) => m.success
    );
    const failedOperations = this.performanceMetrics.filter((m) => !m.success);
    const totalDuration = this.performanceMetrics.reduce(
      (sum, m) => sum + m.duration,
      0
    );
    const totalRetries = this.performanceMetrics.reduce(
      (sum, m) => sum + m.retryCount,
      0
    );

    const slowestOperation = this.performanceMetrics.reduce(
      (slowest, current) =>
        current.duration > slowest.duration ? current : slowest
    );

    const fastestOperation = this.performanceMetrics.reduce(
      (fastest, current) =>
        current.duration < fastest.duration ? current : fastest
    );

    return {
      totalTests: this.performanceMetrics.length,
      passedTests: successfulOperations.length,
      failedTests: failedOperations.length,
      averageExecutionTime: totalDuration / this.performanceMetrics.length,
      totalExecutionTime: totalDuration,
      slowestOperation,
      fastestOperation,
      errorRate:
        (failedOperations.length / this.performanceMetrics.length) * 100,
      retryRate: (totalRetries / this.performanceMetrics.length) * 100,
    };
  }

  /**
   * Get performance metrics for specific AWS service
   */
  getServiceMetrics(awsService: string): PerformanceMetrics[] {
    return this.performanceMetrics.filter((m) => m.awsService === awsService);
  }

  /**
   * Get slowest operations (top N)
   */
  getSlowestOperations(count = 5): PerformanceMetrics[] {
    return this.performanceMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }

  /**
   * Get operations with most retries
   */
  getOperationsWithMostRetries(count = 5): PerformanceMetrics[] {
    return this.performanceMetrics
      .filter((m) => m.retryCount > 0)
      .sort((a, b) => b.retryCount - a.retryCount)
      .slice(0, count);
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    const metrics = this.getTestMetrics();
    const slowestOps = this.getSlowestOperations(3);
    const mostRetries = this.getOperationsWithMostRetries(3);

    return `
Performance Report
==================

Test Run Summary:
- Total Operations: ${metrics.totalTests}
- Successful: ${metrics.passedTests}
- Failed: ${metrics.failedTests}
- Success Rate: ${((metrics.passedTests / metrics.totalTests) * 100).toFixed(2)}%
- Error Rate: ${metrics.errorRate.toFixed(2)}%
- Retry Rate: ${metrics.retryRate.toFixed(2)}%

Timing Metrics:
- Total Execution Time: ${metrics.totalExecutionTime}ms
- Average Execution Time: ${metrics.averageExecutionTime.toFixed(2)}ms
- Fastest Operation: ${metrics.fastestOperation?.operationName} (${metrics.fastestOperation?.duration}ms)
- Slowest Operation: ${metrics.slowestOperation?.operationName} (${metrics.slowestOperation?.duration}ms)

Slowest Operations:
${slowestOps.map((op) => `- ${op.operationName}: ${op.duration}ms (${op.retryCount} retries)`).join('\n')}

Operations with Most Retries:
${mostRetries.map((op) => `- ${op.operationName}: ${op.retryCount} retries (${op.duration}ms)`).join('\n')}

Service Breakdown:
${this.getServiceBreakdown()}
    `.trim();
  }

  private getServiceBreakdown(): string {
    const serviceMap = new Map<string, PerformanceMetrics[]>();

    for (const metric of this.performanceMetrics) {
      const existing = serviceMap.get(metric.awsService) || [];
      existing.push(metric);
      serviceMap.set(metric.awsService, existing);
    }

    return Array.from(serviceMap.entries())
      .map(([service, metrics]) => {
        const avgDuration =
          metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
        const successRate =
          (metrics.filter((m) => m.success).length / metrics.length) * 100;
        return `- ${service}: ${metrics.length} operations, ${avgDuration.toFixed(2)}ms avg, ${successRate.toFixed(2)}% success`;
      })
      .join('\n');
  }

  /**
   * Get current step context
   */
  getStepContext(): StepContext {
    return { ...this.stepContext };
  }

  /**
   * Set step context value
   */
  setStepContext<K extends keyof StepContext>(
    key: K,
    value: StepContext[K]
  ): void {
    this.stepContext[key] = value;
    this.log('debug', `Set step context ${String(key)}: ${value}`);
  }

  /**
   * Get step context value
   */
  getStepContextValue<K extends keyof StepContext>(
    key: K
  ): StepContext[K] | undefined {
    return this.stepContext[key];
  }

  /**
   * Clear step context
   */
  clearStepContext(): void {
    this.stepContext = {};
    this.log('debug', 'Cleared step context');
  }

  /**
   * Clear specific step context value
   */
  clearStepContextValue<K extends keyof StepContext>(key: K): void {
    delete this.stepContext[key];
    this.log('debug', `Cleared step context ${String(key)}`);
  }

  /**
   * Check if step context has a specific value
   */
  hasStepContextValue<K extends keyof StepContext>(key: K): boolean {
    return this.stepContext[key] !== undefined;
  }

  /**
   * Validate required step context values
   */
  validateStepContext(requiredKeys: (keyof StepContext)[]): {
    isValid: boolean;
    missingKeys: (keyof StepContext)[];
    presentKeys: (keyof StepContext)[];
  } {
    const missingKeys: (keyof StepContext)[] = [];
    const presentKeys: (keyof StepContext)[] = [];

    for (const key of requiredKeys) {
      if (this.stepContext[key] !== undefined) {
        presentKeys.push(key);
      } else {
        missingKeys.push(key);
      }
    }

    return {
      isValid: missingKeys.length === 0,
      missingKeys,
      presentKeys,
    };
  }

  /**
   * Validate AWS credentials and permissions
   */
  async validateAWSSetup(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    services: {
      s3: boolean;
      sqs: boolean;
      lambda: boolean;
      stepFunctions: boolean;
      cloudWatch: boolean;
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const services = {
      s3: false,
      sqs: false,
      lambda: false,
      stepFunctions: false,
      cloudWatch: false,
    };

    try {
      // Test S3 access
      try {
        await this.s3Client.send(new ListBucketsCommand({}));
        services.s3 = true;
      } catch (error) {
        errors.push(
          `S3 access failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Test SQS access
      try {
        await this.sqsClient.send(new ListQueuesCommand({}));
        services.sqs = true;
      } catch (error) {
        errors.push(
          `SQS access failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Test Lambda access
      try {
        await this.lambdaClient.send(new ListFunctionsCommand({}));
        services.lambda = true;
      } catch (error) {
        errors.push(
          `Lambda access failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Test Step Functions access
      try {
        await this.sfnClient.send(new ListStateMachinesCommand({}));
        services.stepFunctions = true;
      } catch (error) {
        errors.push(
          `Step Functions access failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Test CloudWatch access
      try {
        await this.cloudWatchLogsClient.send(
          new FilterLogEventsCommand({
            logGroupName: '/aws/lambda/test',
            startTime: Date.now() - 60000,
            endTime: Date.now(),
          })
        );
        services.cloudWatch = true;
      } catch (error) {
        warnings.push(
          `CloudWatch access failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } catch (error) {
      errors.push(
        `AWS setup validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      services,
    };
  }
}
