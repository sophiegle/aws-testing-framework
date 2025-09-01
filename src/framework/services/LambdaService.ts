import {
  type CloudWatchLogsClient,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  GetFunctionCommand,
  InvokeCommand,
  type LambdaClient,
} from '@aws-sdk/client-lambda';

export interface LambdaServiceConfig {
  /** Default timeout for Lambda invocations in milliseconds */
  defaultInvocationTimeout?: number;
  /** Maximum timeout for Lambda invocations in milliseconds */
  maxInvocationTimeout?: number;
}

export class LambdaService {
  private lambdaClient: LambdaClient;
  private cloudWatchLogsClient: CloudWatchLogsClient;
  private config: LambdaServiceConfig;

  constructor(
    lambdaClient: LambdaClient,
    cloudWatchLogsClient: CloudWatchLogsClient,
    config: LambdaServiceConfig = {}
  ) {
    this.lambdaClient = lambdaClient;
    this.cloudWatchLogsClient = cloudWatchLogsClient;
    this.config = {
      defaultInvocationTimeout: 300000, // 5 minutes default
      maxInvocationTimeout: 900000, // 15 minutes max
      ...config,
    };
  }

  async findFunction(functionName: string): Promise<void> {
    const command = new GetFunctionCommand({
      FunctionName: functionName,
    });
    const response = await this.lambdaClient.send(command);
    if (!response) {
      throw new Error(`Lambda function ${functionName} not found`);
    }
  }

  async invokeFunction(
    functionName: string,
    payload: Record<string, unknown>,
    options?: {
      timeout?: number;
      invocationType?: 'RequestResponse' | 'Event' | 'DryRun';
    }
  ): Promise<{ Payload?: string } | null> {
    const timeout = options?.timeout || this.config.defaultInvocationTimeout;

    // Validate timeout is within limits
    if (timeout && timeout > (this.config.maxInvocationTimeout || 900000)) {
      throw new Error(
        `Lambda invocation timeout (${timeout}ms) exceeds maximum allowed timeout (${this.config.maxInvocationTimeout}ms)`
      );
    }

    const invokeCommand = new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(payload)),
      InvocationType: options?.invocationType || 'RequestResponse',
    });

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Lambda invocation timed out after ${timeout}ms`));
      }, timeout);
    });

    // Race between the actual invocation and timeout
    const response = await Promise.race([
      this.lambdaClient.send(invokeCommand),
      timeoutPromise,
    ]);

    return {
      Payload: response.Payload
        ? Buffer.from(response.Payload).toString()
        : undefined,
    };
  }

  /**
   * Get Lambda function logs from CloudWatch
   */
  async getLambdaLogs(
    functionName: string,
    startTime: Date,
    endTime: Date
  ): Promise<string[]> {
    try {
      const logGroupName = `/aws/lambda/${functionName}`;

      const response = await this.cloudWatchLogsClient.send(
        new FilterLogEventsCommand({
          logGroupName,
          startTime: startTime.getTime(),
          endTime: endTime.getTime(),
        })
      );

      return response.events?.map((event) => event.message || '') || [];
    } catch {
      // Failed to get logs - returning empty array
      return [];
    }
  }

  /**
   * Check if Lambda function has been executed recently
   */
  async checkLambdaExecution(functionName: string): Promise<boolean> {
    try {
      // Check if the function exists and is accessible
      await this.findFunction(functionName);

      // Check CloudWatch logs for execution evidence
      const startTime = new Date(Date.now() - 300000); // 5 minutes ago
      const endTime = new Date();

      const logs = await this.getLambdaLogs(functionName, startTime, endTime);

      // Look for execution indicators in logs
      const executionIndicators = [
        'START RequestId:',
        'END RequestId:',
        'REPORT RequestId:',
        'Duration:',
        'Billed Duration:',
      ];

      const hasExecutions = logs.some((log) =>
        executionIndicators.some((indicator) => log.includes(indicator))
      );

      return hasExecutions;
    } catch {
      // Error checking Lambda execution - returning false
      return false;
    }
  }

  /**
   * Count Lambda function executions within a time period
   */
  async countLambdaExecutions(
    functionName: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    try {
      // Check if the function exists and is accessible
      await this.findFunction(functionName);

      const logs = await this.getLambdaLogs(functionName, startTime, endTime);

      // Count START RequestId: entries to get execution count
      const executionCount = logs.filter((log) =>
        log.includes('START RequestId:')
      ).length;

      return executionCount;
    } catch {
      // Error counting Lambda executions - returning 0
      return 0;
    }
  }

  /**
   * Count Lambda function executions in the last N minutes
   */
  async countLambdaExecutionsInLastMinutes(
    functionName: string,
    minutes: number
  ): Promise<number> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - minutes * 60 * 1000);

    return await this.countLambdaExecutions(functionName, startTime, endTime);
  }
}
