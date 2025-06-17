import {
  CreateFunctionCommand,
  DeleteFunctionCommand,
  InvokeCommand,
  LambdaClient,
  ListFunctionsCommand,
} from '@aws-sdk/client-lambda';
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  PutBucketNotificationConfigurationCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  CreateStateMachineCommand,
  DeleteStateMachineCommand,
  DescribeExecutionCommand,
  DescribeStateMachineCommand,
  ListExecutionsCommand,
  ListStateMachinesCommand,
  SFNClient,
  StartExecutionCommand,
  GetExecutionHistoryCommand,
} from '@aws-sdk/client-sfn';
import {
  CreateQueueCommand,
  DeleteQueueCommand,
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

export class AWSTestingFramework {
  private s3Client: S3Client;
  private sqsClient: SQSClient;
  private lambdaClient: LambdaClient;
  private sfnClient: SFNClient;
  private reporter: TestReporter;
  private executionTracker: Map<string, ExecutionDetails[]> = new Map();

  constructor() {
    this.s3Client = new S3Client({});
    this.sqsClient = new SQSClient({});
    this.lambdaClient = new LambdaClient({});
    this.sfnClient = new SFNClient({});
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
    const bucket = response.Buckets?.find((bucket) => bucket.Name === bucketName);
    if (!bucket) {
      throw new Error(`Bucket ${bucketName} not found`);
    }
  }

  async uploadFile(bucketName: string, fileName: string, content: string): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: content,
      })
    );
  }

  async checkFileExists(bucketName: string, fileName: string): Promise<boolean> {
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
    const queue = response.QueueUrls?.find((queue) => queue.includes(queueName));
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

  async receiveMessage(queueUrl: string): Promise<{ Body?: string } | null> {
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
    return Number.parseInt(response.Attributes?.ApproximateNumberOfMessages || '0', 10);
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
    const functionDetails = response.Functions?.find((f) => f.FunctionName === functionName);
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
        Payload: Uint8ArrayBlobAdapter.from(JSON.stringify(payload)),
      })
    );
    return {
      Payload: response.Payload ? Buffer.from(response.Payload).toString() : undefined,
    };
  }

  async checkLambdaExecution(functionName: string): Promise<boolean> {
    try {
      const command = new ListFunctionsCommand({});
      const response = await this.lambdaClient.send(command);
      const functionDetails = response.Functions?.find((f) => f.FunctionName === functionName);
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
              Resource: 'arn:aws:lambda:us-east-1:123456789012:function:hello-world',
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
    const stateMachine = response.stateMachines?.find((sm) => sm.name === stateMachineName);
    return stateMachine?.stateMachineArn || '';
  }

  async startExecution(stateMachineArn: string, input: Record<string, unknown>): Promise<string> {
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

  async listExecutions(stateMachineName: string): Promise<Array<{ executionArn: string }>> {
    const stateMachineArn = await this.findStateMachine(stateMachineName);
    const response = await this.sfnClient.send(
      new ListExecutionsCommand({
        stateMachineArn,
        maxResults: 1,
      })
    );
    return response.executions?.map((execution) => ({
      executionArn: execution.executionArn || '',
    })) || [];
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
    } catch (error) {
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
    
    const executions: ExecutionDetails[] = response.executions?.map((execution) => ({
      executionArn: execution.executionArn || '',
      stateMachineArn: execution.stateMachineArn || '',
      status: execution.status || '',
      startDate: execution.startDate || new Date(),
      stopDate: execution.stopDate,
    })) || [];
    
    this.executionTracker.set(stateMachineName, executions);
  }

  /**
   * Verify that a specific state machine was triggered by checking recent executions
   */
  async verifyStateMachineTriggered(
    expectedStateMachineName: string,
    timeoutMs: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      await this.trackStateMachineExecutions(expectedStateMachineName);
      const executions = this.executionTracker.get(expectedStateMachineName) || [];
      
      // Check if there are any recent executions (within the last 5 minutes)
      const recentExecutions = executions.filter(execution => {
        const executionTime = new Date(execution.startDate).getTime();
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return executionTime > fiveMinutesAgo;
      });
      
      if (recentExecutions.length > 0) {
        return true;
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }

  /**
   * Get execution details for a specific state machine
   */
  async getExecutionDetails(stateMachineName: string): Promise<ExecutionDetails[]> {
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
  async getExecutionHistory(executionArn: string): Promise<any[]> {
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
  }
}
