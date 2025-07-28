import {
  InvokeCommand,
  type LambdaClient,
  ListFunctionsCommand,
} from '@aws-sdk/client-lambda';
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

export class LambdaService {
  private lambdaClient: LambdaClient;
  private cloudWatchLogsClient: CloudWatchLogsClient;

  constructor(lambdaClient: LambdaClient, cloudWatchLogsClient: CloudWatchLogsClient) {
    this.lambdaClient = lambdaClient;
    this.cloudWatchLogsClient = cloudWatchLogsClient;
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

      return response.events?.map(event => event.message || '') || [];
    } catch (error) {
      console.warn(`Failed to get logs for ${functionName}: ${error}`);
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
        'Billed Duration:'
      ];

      const hasExecutions = logs.some(log => 
        executionIndicators.some(indicator => log.includes(indicator))
      );

      return hasExecutions;
    } catch (error) {
      console.warn(`Error checking Lambda execution for ${functionName}: ${error}`);
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
      const executionCount = logs.filter(log => 
        log.includes('START RequestId:')
      ).length;
      
      return executionCount;
    } catch (error) {
      console.warn(`Error counting Lambda executions for ${functionName}: ${error}`);
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
    const startTime = new Date(endTime.getTime() - (minutes * 60 * 1000));
    
    return await this.countLambdaExecutions(functionName, startTime, endTime);
  }
}
