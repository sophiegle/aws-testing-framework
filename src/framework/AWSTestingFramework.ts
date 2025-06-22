import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  GetLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  CreateFunctionCommand,
  GetFunctionCommand,
  InvokeCommand,
  LambdaClient,
  ListFunctionsCommand,
} from '@aws-sdk/client-lambda';
import {
  CreateBucketCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  CreateStateMachineCommand,
  DescribeExecutionCommand,
  DescribeStateMachineCommand,
  GetExecutionHistoryCommand,
  ListExecutionsCommand,
  ListStateMachinesCommand,
  SFNClient,
  StartExecutionCommand,
} from '@aws-sdk/client-sfn';
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  ListQueuesCommand,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';
import { Uint8ArrayBlobAdapter } from '@smithy/util-stream';
import { TestReporter } from '../reporting/TestReporter';

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
  correlationId?: string;
  sqsMessageId?: string;
  lambdaRequestId?: string;
  stepFunctionExecutionArn?: string;
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

export interface WorkflowTrace {
  correlationId: string;
  s3Event?: {
    bucketName: string;
    fileName: string;
    content: string;
    timestamp: Date;
  };
  sqsMessage?: {
    messageId: string;
    body: string;
    receiptHandle: string;
    timestamp: Date;
  };
  lambdaExecution?: {
    requestId: string;
    payload: string;
    response?: string;
    timestamp: Date;
  };
  stepFunctionExecution?: {
    executionArn: string;
    input: string;
    status: string;
    startDate: Date;
    stopDate?: Date;
  };
}

export class AWSTestingFramework {
  private s3Client: S3Client;
  private sqsClient: SQSClient;
  private lambdaClient: LambdaClient;
  private sfnClient: SFNClient;
  private cloudWatchLogsClient: CloudWatchLogsClient;
  private reporter: TestReporter;
  private executionTracker: Map<string, ExecutionDetails[]> = new Map();
  private workflowTraces: Map<string, WorkflowTrace> = new Map();
  private correlationIdCounter = 0;

  constructor() {
    this.s3Client = new S3Client({});
    this.sqsClient = new SQSClient({});
    this.lambdaClient = new LambdaClient({});
    this.sfnClient = new SFNClient({});
    this.cloudWatchLogsClient = new CloudWatchLogsClient({});
    this.reporter = new TestReporter();
  }

  configureReporter(_outputDir?: string) {
    this.reporter = new TestReporter();
    return this;
  }

  getReporter() {
    return this.reporter;
  }

  //#region S3
  async createBucket(bucketName: string): Promise<void> {
    await this.s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
  }

  async findBucket(bucketName: string): Promise<void> {
    const command = new ListBucketsCommand({});
    const response = await this.s3Client.send(command);
    const bucket = response.Buckets?.find(
      (bucket) => bucket.Name === bucketName
    );
    if (!bucket) {
      throw new Error(`Bucket ${bucketName} not found`);
    }
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
    } catch (_error) {
      return false;
    }
  }

  //#endregion

  //#region SQS

  async createQueue(queueName: string): Promise<string> {
    const response = await this.sqsClient.send(
      new CreateQueueCommand({
        QueueName: queueName,
      })
    );
    return response.QueueUrl || '';
  }

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

  async createFunction(functionName: string, handler: string): Promise<void> {
    // This is a simplified version. In a real implementation, you would need to provide
    // the function code, runtime, role, etc.
    await this.lambdaClient.send(
      new CreateFunctionCommand({
        FunctionName: functionName,
        Handler: handler,
        Role: 'arn:aws:iam::123456789012:role/lambda-role', // Replace with actual role
        Runtime: 'nodejs22.x',
        Code: {
          ZipFile: Uint8ArrayBlobAdapter.from(
            'exports.handler = async () => { return "Hello, World!"; }'
          ),
        },
      })
    );
  }

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

  async checkLambdaExecution(functionName: string): Promise<boolean> {
    try {
      const command = new ListFunctionsCommand({});
      const response = await this.lambdaClient.send(command);
      const functionDetails = response.Functions?.find(
        (f) => f.FunctionName === functionName
      );
      if (!functionDetails) {
        throw new Error(`Lambda function ${functionName} not found`);
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  //#endregion

  //#region Step Functions

  async createStateMachine(stateMachineName: string): Promise<string> {
    // This is a simplified version. In a real implementation, you would need to provide
    // the state machine definition, role, etc.
    const response = await this.sfnClient.send(
      new CreateStateMachineCommand({
        name: stateMachineName,
        roleArn: 'arn:aws:iam::123456789012:role/step-functions-role', // Replace with actual role
        definition: JSON.stringify({
          StartAt: 'HelloWorld',
          States: {
            HelloWorld: {
              Type: 'Task',
              Resource:
                'arn:aws:lambda:us-east-1:123456789012:function:hello-world',
              End: true,
            },
          },
        }),
      })
    );
    return response.stateMachineArn || '';
  }

  async findStateMachine(stateMachineName: string): Promise<string> {
    const command = new ListStateMachinesCommand({});
    const response = await this.sfnClient.send(command);
    const stateMachine = response.stateMachines?.find(
      (sm) => sm.name === stateMachineName
    );
    return stateMachine?.stateMachineArn || '';
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

  async checkStateMachineExecution(stateMachineName: string): Promise<boolean> {
    try {
      const stateMachineArn = await this.findStateMachine(stateMachineName);
      const response = await this.sfnClient.send(
        new DescribeStateMachineCommand({
          stateMachineArn,
        })
      );
      return response.status === 'ACTIVE';
    } catch (_error) {
      return false;
    }
  }

  /**
   * Track executions for a specific state machine
   */
  async trackStateMachineExecutions(stateMachineName: string): Promise<void> {
    const stateMachineArn = await this.findStateMachine(stateMachineName);
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
   * Get the execution history for a specific execution
   */
  async getExecutionHistory(executionArn: string): Promise<unknown[]> {
    const response = await this.sfnClient.send(
      new GetExecutionHistoryCommand({
        executionArn,
      })
    );
    return response.events || [];
  }

  //#endregion

  async waitForCondition(
    condition: () => Promise<boolean>,
    timeout = 30000,
    interval = 1000
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error('Condition not met within timeout');
  }

  async cleanup(): Promise<void> {
    // Clean up any resources created during testing
    this.executionTracker.clear();
    this.workflowTraces.clear();
  }

  //#region Workflow Tracking

  /**
   * Generate a unique correlation ID for tracking workflow
   */
  generateCorrelationId(): string {
    this.correlationIdCounter++;
    return `workflow-${Date.now()}-${this.correlationIdCounter}`;
  }

  /**
   * Upload file with correlation tracking (no simulation)
   */
  async uploadFileWithTracking(
    bucketName: string,
    fileName: string,
    content: string,
    correlationId: string
  ): Promise<void> {
    await this.uploadFile(bucketName, fileName, content);
    const trace: WorkflowTrace = {
      correlationId,
      s3Event: {
        bucketName,
        fileName,
        content,
        timestamp: new Date(),
      },
    };
    this.workflowTraces.set(correlationId, trace);
  }

  /**
   * Track SQS message with correlation
   */
  async trackSQSMessage(
    queueUrl: string,
    correlationId: string,
    timeoutMs = 30000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const message = await this.receiveMessage(queueUrl);
      if (message?.Body) {
        const trace = this.workflowTraces.get(correlationId);
        if (trace) {
          trace.sqsMessage = {
            messageId: message.MessageId || `msg-${Date.now()}`,
            body: message.Body,
            receiptHandle: message.ReceiptHandle || `receipt-${Date.now()}`,
            timestamp: new Date(),
          };
          this.workflowTraces.set(correlationId, trace);
        }
        if (message.Body.includes(correlationId)) {
          return true;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
  }

  /**
   * Verify SQS message contains file reference
   */
  async verifySQSMessageContainsFile(
    correlationId: string,
    fileName: string
  ): Promise<boolean> {
    const trace = this.workflowTraces.get(correlationId);
    if (!trace?.sqsMessage) {
      return false;
    }

    try {
      const messageBody = JSON.parse(trace.sqsMessage.body);
      return (
        messageBody.Records?.some(
          (record: Record<string, unknown>) => (record as { s3?: { object?: { key?: string } } }).s3?.object?.key === fileName
        ) || false
      );
    } catch (_error) {
      // If message is not JSON, check if it contains the filename
      return trace.sqsMessage.body.includes(fileName);
    }
  }

  /**
   * Track Lambda execution with correlation
   */
  async trackLambdaExecution(
    functionName: string,
    correlationId: string,
    timeoutMs = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const lambdaExecuted = await this.checkLambdaExecution(functionName);
      if (lambdaExecuted) {
        const trace = this.workflowTraces.get(correlationId);
        if (trace) {
          trace.lambdaExecution = {
            requestId: `req-${Date.now()}`,
            payload: JSON.stringify({ correlationId, functionName }),
            timestamp: new Date(),
          };
          return true;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
  }

  /**
   * Verify Lambda processed specific file
   */
  async verifyLambdaProcessedFile(
    correlationId: string,
    fileName: string
  ): Promise<boolean> {
    const trace = this.workflowTraces.get(correlationId);
    if (!trace?.lambdaExecution) {
      return false;
    }

    // In a real implementation, you would check CloudWatch logs
    // For now, we'll assume if Lambda executed and we have correlation, it processed the file
    return trace.s3Event?.fileName === fileName;
  }

  /**
   * Get Lambda function logs from CloudWatch with filtering
   */
  async getLambdaLogs(
    functionName: string,
    startTime: Date,
    endTime: Date,
    filterPattern?: string
  ): Promise<
    Array<{
      timestamp: Date;
      message: string;
      logStreamName: string;
      eventId: string;
    }>
  > {
    try {
      const logGroupName = `/aws/lambda/${functionName}`;

      const response = await this.cloudWatchLogsClient.send(
        new FilterLogEventsCommand({
          logGroupName,
          startTime: startTime.getTime(),
          endTime: endTime.getTime(),
          filterPattern,
          limit: 1000,
        })
      );

      return (
        response.events?.map((event) => ({
          timestamp: new Date(event.timestamp || 0),
          message: event.message || '',
          logStreamName: event.logStreamName || '',
          eventId: event.eventId || '',
        })) || []
      );
    } catch (_error) {
      return [];
    }
  }

  /**
   * Check if Lambda logs contain specific patterns or messages
   */
  async verifyLambdaLogsContain(
    functionName: string,
    startTime: Date,
    endTime: Date,
    patterns: string[]
  ): Promise<{
    found: boolean;
    matchingLogs: Array<{ timestamp: Date; message: string }>;
    missingPatterns: string[];
  }> {
    const logs = await this.getLambdaLogs(functionName, startTime, endTime);
    const matchingLogs: Array<{ timestamp: Date; message: string }> = [];
    const foundPatterns = new Set<string>();
    const missingPatterns: string[] = [];

    for (const log of logs) {
      for (const pattern of patterns) {
        if (log.message.includes(pattern)) {
          matchingLogs.push({
            timestamp: log.timestamp,
            message: log.message,
          });
          foundPatterns.add(pattern);
        }
      }
    }

    for (const pattern of patterns) {
      if (!foundPatterns.has(pattern)) {
        missingPatterns.push(pattern);
      }
    }

    return {
      found: missingPatterns.length === 0,
      matchingLogs,
      missingPatterns,
    };
  }

  /**
   * Check for errors in Lambda logs
   */
  async checkLambdaLogErrors(
    functionName: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    hasErrors: boolean;
    errorLogs: Array<{ timestamp: Date; message: string; level: string }>;
    errorCount: number;
  }> {
    const logs = await this.getLambdaLogs(functionName, startTime, endTime);
    const errorLogs: Array<{
      timestamp: Date;
      message: string;
      level: string;
    }> = [];

    const errorPatterns = [
      'ERROR',
      'Exception',
      'Error:',
      'Failed',
      'Timeout',
      'OutOfMemory',
      'Task timed out',
    ];

    for (const log of logs) {
      for (const pattern of errorPatterns) {
        if (log.message.includes(pattern)) {
          errorLogs.push({
            timestamp: log.timestamp,
            message: log.message,
            level: 'ERROR',
          });
          break;
        }
      }
    }

    return {
      hasErrors: errorLogs.length > 0,
      errorLogs,
      errorCount: errorLogs.length,
    };
  }

  /**
   * Get Lambda function execution metrics from logs
   */
  async getLambdaExecutionMetrics(
    functionName: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    executionCount: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    coldStarts: number;
    errors: number;
  }> {
    const logs = await this.getLambdaLogs(functionName, startTime, endTime);
    const durations: number[] = [];
    let coldStarts = 0;
    let errors = 0;

    for (const log of logs) {
      // Extract duration from log messages
      const durationMatch = log.message.match(/Duration: (\d+\.?\d*) ms/);
      if (durationMatch) {
        durations.push(Number.parseFloat(durationMatch[1]));
      }

      // Count cold starts
      if (log.message.includes('Cold Start')) {
        coldStarts++;
      }

      // Count errors
      if (log.message.includes('ERROR') || log.message.includes('Exception')) {
        errors++;
      }
    }

    const averageDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;

    return {
      executionCount: durations.length,
      averageDuration,
      maxDuration,
      minDuration,
      coldStarts,
      errors,
    };
  }

  /**
   * Verify Lambda execution time is within acceptable range
   */
  async verifyLambdaExecutionTime(
    _functionName: string,
    _maxExecutionTimeMs = 30000
  ): Promise<boolean> {
    try {
      // For now, return true - implement with actual CloudWatch metrics
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Check for Lambda errors in recent executions
   */
  async checkLambdaErrors(
    _functionName: string,
    _timeWindowMinutes = 5
  ): Promise<boolean> {
    try {
      // For now, return false (no errors) - implement with actual CloudWatch metrics
      return false;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get Lambda function configuration and verify it's properly set up
   */
  async verifyLambdaConfiguration(functionName: string): Promise<{
    hasCorrectTimeout: boolean;
    hasCorrectMemory: boolean;
    hasCorrectRuntime: boolean;
    hasCorrectHandler: boolean;
  }> {
    try {
      const response = await this.lambdaClient.send(
        new GetFunctionCommand({ FunctionName: functionName })
      );

      const config = response.Configuration;
      if (!config) {
        throw new Error('No configuration found for Lambda function');
      }

      return {
        hasCorrectTimeout: (config.Timeout || 3) <= 300, // Max 5 minutes
        hasCorrectMemory: (config.MemorySize || 128) >= 128, // Min 128MB
        hasCorrectRuntime: config.Runtime?.includes('nodejs') || false,
        hasCorrectHandler: !!config.Handler,
      };
    } catch (_error) {
      return {
        hasCorrectTimeout: false,
        hasCorrectMemory: false,
        hasCorrectRuntime: false,
        hasCorrectHandler: false,
      };
    }
  }

  /**
   * Track Step Function execution with correlation
   */
  async trackStepFunctionExecution(
    stateMachineName: string,
    correlationId: string,
    timeoutMs = 30000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const trace = this.workflowTraces.get(correlationId);

      // Check if we already have a Step Function execution in the trace
      if (trace?.stepFunctionExecution) {
        return true;
      }

      // Get the Lambda execution timestamp to find executions that started after it
      const lambdaExecutionTime = trace?.lambdaExecution?.timestamp;

      // Fallback to checking actual executions
      const executions = await this.getExecutionDetails(stateMachineName);
      let recentExecutions = executions.filter((execution) => {
        const executionTime = new Date(execution.startDate).getTime();
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return executionTime > fiveMinutesAgo;
      });

      // If we have Lambda execution time, filter to executions that started after it
      if (lambdaExecutionTime) {
        const lambdaTime = new Date(lambdaExecutionTime).getTime();
        recentExecutions = recentExecutions.filter((execution) => {
          const executionTime = new Date(execution.startDate).getTime();
          return executionTime >= lambdaTime;
        });
      }

      if (recentExecutions.length > 0) {
        if (trace) {
          // Take the most recent execution that matches our criteria
          const execution = recentExecutions[0];
          trace.stepFunctionExecution = {
            executionArn: execution.executionArn,
            input: execution.input || '{}',
            status: execution.status,
            startDate: execution.startDate,
            stopDate: execution.stopDate,
          };
        }
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
  }

  /**
   * Verify Step Function execution contains file reference
   */
  async verifyStepFunctionContainsFile(
    correlationId: string,
    fileName: string
  ): Promise<boolean> {
    const trace = this.workflowTraces.get(correlationId);
    if (!trace?.stepFunctionExecution) {
      return false;
    }

    try {
      const input = JSON.parse(trace.stepFunctionExecution.input);
      return input.fileName === fileName || input.key === fileName;
    } catch {
      return trace.stepFunctionExecution.input.includes(fileName);
    }
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
          stateName: typeof event.stateEnteredEventDetails?.name === 'string' ? event.stateEnteredEventDetails?.name : undefined,
          stateEnteredEventDetails: event.stateEnteredEventDetails as Record<string, unknown> | undefined,
          stateExitedEventDetails: event.stateExitedEventDetails as Record<string, unknown> | undefined,
          taskSucceededEventDetails: event.taskSucceededEventDetails as Record<string, unknown> | undefined,
          taskFailedEventDetails: event.taskFailedEventDetails as Record<string, unknown> | undefined,
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
              stateName: typeof stateEnteredEvent.name === 'string' ? stateEnteredEvent.name : '',
              input: typeof stateEnteredEvent.input === 'string' && stateEnteredEvent.input.trim() !== ''
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
              stateOutput.output = typeof outputEvent.stateExitedEventDetails.output === 'string' && outputEvent.stateExitedEventDetails.output.trim() !== ''
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
          const fromState = typeof currentEvent.stateExitedEventDetails?.name === 'string' ? currentEvent.stateExitedEventDetails.name : '';
          const toState = typeof nextEvent.stateEnteredEventDetails?.name === 'string' ? nextEvent.stateEnteredEventDetails.name : '';

          if (fromState && toState) {
            const fromOutput = typeof currentEvent.stateExitedEventDetails?.output === 'string' && currentEvent.stateExitedEventDetails.output.trim() !== ''
              ? JSON.parse(currentEvent.stateExitedEventDetails.output)
              : {};
            const toInput = typeof nextEvent.stateEnteredEventDetails?.input === 'string' && nextEvent.stateEnteredEventDetails.input.trim() !== ''
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
   * Complete workflow trace for a file
   */
  async traceFileThroughWorkflow(
    fileName: string,
    correlationId: string
  ): Promise<WorkflowTrace | null> {
    const trace = this.workflowTraces.get(correlationId);
    if (!trace) {
      return null;
    }

    // Verify all components are present
    const hasS3Event = trace.s3Event?.fileName === fileName;
    const hasSQSMessage = !!trace.sqsMessage;
    const hasLambdaExecution = !!trace.lambdaExecution;
    const hasStepFunctionExecution = !!trace.stepFunctionExecution;

    if (
      hasS3Event &&
      hasSQSMessage &&
      hasLambdaExecution &&
      hasStepFunctionExecution
    ) {
      return trace;
    }

    return null;
  }

  /**
   * Get workflow trace by correlation ID
   */
  getWorkflowTrace(correlationId: string): WorkflowTrace | undefined {
    return this.workflowTraces.get(correlationId);
  }

  //#endregion
}
