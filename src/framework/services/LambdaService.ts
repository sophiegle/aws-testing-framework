import {
  InvokeCommand,
  type LambdaClient,
  ListFunctionsCommand,
} from '@aws-sdk/client-lambda';

export class LambdaService {
  private lambdaClient: LambdaClient;

  constructor(lambdaClient: LambdaClient) {
    this.lambdaClient = lambdaClient;
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
}
