import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { SFNClient } from '@aws-sdk/client-sfn';
import { SQSClient } from '@aws-sdk/client-sqs';
import { TestReporter } from '../reporting/TestReporter';
import { HealthValidator } from './services/HealthValidator';
import { LambdaService } from './services/LambdaService';
import { PerformanceMonitor } from './services/PerformanceMonitor';
import { S3Service } from './services/S3Service';
import { SQSService } from './services/SQSService';
import { StepContextManager } from './services/StepContextManager';
import { StepFunctionService } from './services/StepFunctionService';
import type {
  CleanupOptions,
  ExecutionDetails,
  FrameworkConfig,
  StepContext,
  StepFunctionDataFlow,
  StepFunctionDefinition,
  StepFunctionExecutionResult,
  StepFunctionPerformance,
  StepFunctionSLAs,
  StepFunctionSLAVerification,
  StepFunctionStateOutput,
  StepFunctionStateOutputVerification,
} from './types';

export class AWSTestingFramework {
  // AWS Service clients
  private s3Client: S3Client;
  private sqsClient: SQSClient;
  private lambdaClient: LambdaClient;
  private sfnClient: SFNClient;
  private cloudWatchLogsClient: CloudWatchLogsClient;

  // Service classes
  private s3Service: S3Service;
  private sqsService: SQSService;
  private lambdaService: LambdaService;
  private stepFunctionService: StepFunctionService;
  private performanceMonitor: PerformanceMonitor;
  private stepContextManager: StepContextManager;
  private healthValidator: HealthValidator;

  // Framework components
  private reporter: TestReporter;
  private executionTracker: Map<string, ExecutionDetails[]> = new Map();
  private config: FrameworkConfig;

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

    // Initialize AWS clients
    this.s3Client = new S3Client(clientConfig);
    this.sqsClient = new SQSClient(clientConfig);
    this.lambdaClient = new LambdaClient(clientConfig);
    this.sfnClient = new SFNClient(clientConfig);
    this.cloudWatchLogsClient = new CloudWatchLogsClient(clientConfig);

    // Initialize service classes
    this.s3Service = new S3Service(this.s3Client);
    this.sqsService = new SQSService(this.sqsClient);
    this.lambdaService = new LambdaService(this.lambdaClient);
    this.stepFunctionService = new StepFunctionService(this.sfnClient);
    this.performanceMonitor = new PerformanceMonitor();
    this.stepContextManager = new StepContextManager();
    this.healthValidator = new HealthValidator(
      this.s3Client,
      this.sqsClient,
      this.lambdaClient,
      this.sfnClient,
      this.cloudWatchLogsClient
    );

    // Initialize framework components
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
        // In a real implementation, you would log the data
      } else {
        // In a real implementation, you would log the message
      }
    }
  }

  //#region S3 Operations (delegated to S3Service)
  async findBucket(bucketName: string): Promise<void> {
    await this.s3Service.findBucket(bucketName);
    this.log('info', `Found S3 bucket: ${bucketName}`);
  }

  async uploadFile(
    bucketName: string,
    fileName: string,
    content: string
  ): Promise<void> {
    await this.s3Service.uploadFile(bucketName, fileName, content);
    this.log('info', `Uploaded file ${fileName} to bucket ${bucketName}`);
  }

  async checkFileExists(
    bucketName: string,
    fileName: string
  ): Promise<boolean> {
    const exists = await this.s3Service.checkFileExists(bucketName, fileName);
    if (!exists) {
      this.log('debug', `File ${fileName} not found in bucket ${bucketName}`);
    }
    return exists;
  }
  //#endregion

  //#region SQS Operations (delegated to SQSService)
  async findQueue(queueName: string): Promise<string> {
    return await this.sqsService.findQueue(queueName);
  }

  async sendMessage(queueUrl: string, message: string): Promise<void> {
    await this.sqsService.sendMessage(queueUrl, message);
  }

  async receiveMessage(queueUrl: string): Promise<{
    Body?: string;
    MessageId?: string;
    ReceiptHandle?: string;
  } | null> {
    return await this.sqsService.receiveMessage(queueUrl);
  }

  async getUnreadMessageCount(queueUrl: string): Promise<number> {
    return await this.sqsService.getUnreadMessageCount(queueUrl);
  }
  //#endregion

  //#region Lambda Operations (delegated to LambdaService)
  async findFunction(functionName: string): Promise<void> {
    await this.lambdaService.findFunction(functionName);
  }

  async invokeFunction(
    functionName: string,
    payload: Record<string, unknown>
  ): Promise<{ Payload?: string } | null> {
    return await this.lambdaService.invokeFunction(functionName, payload);
  }

  async checkLambdaExecution(functionName: string): Promise<boolean> {
    return await this.lambdaService.checkLambdaExecution(functionName);
  }
  //#endregion

  //#region Step Functions Operations (delegated to StepFunctionService)
  async findStateMachine(stateMachineName: string): Promise<string> {
    return await this.stepFunctionService.findStateMachine(stateMachineName);
  }

  async startExecution(
    stateMachineArn: string,
    input: Record<string, unknown>
  ): Promise<string> {
    return await this.stepFunctionService.startExecution(
      stateMachineArn,
      input
    );
  }

  async listExecutions(
    stateMachineName: string
  ): Promise<Array<{ executionArn: string }>> {
    return await this.stepFunctionService.listExecutions(stateMachineName);
  }

  async getExecutionStatus(executionArn: string): Promise<string> {
    return await this.stepFunctionService.getExecutionStatus(executionArn);
  }

  async checkStateMachineExecution(stateMachineName: string): Promise<boolean> {
    return await this.stepFunctionService.checkStateMachineExecution(
      stateMachineName
    );
  }

  /**
   * Track executions for a specific state machine
   */
  async trackStateMachineExecutions(stateMachineName: string): Promise<void> {
    try {
      const executions =
        await this.stepFunctionService.trackStateMachineExecutions(
          stateMachineName
        );
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
    return await this.stepFunctionService.verifyStateMachineTriggered(
      expectedStateMachineName,
      timeoutMs
    );
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
    return await this.stepFunctionService.getStepFunctionExecutionHistory(
      executionArn
    );
  }

  /**
   * Verify Step Function execution completed successfully with all expected states
   */
  async verifyStepFunctionExecutionSuccess(
    executionArn: string,
    expectedStates: string[] = []
  ): Promise<StepFunctionExecutionResult> {
    return await this.stepFunctionService.verifyStepFunctionExecutionSuccess(
      executionArn,
      expectedStates
    );
  }

  /**
   * Check Step Function execution performance metrics
   */
  async checkStepFunctionPerformance(
    executionArn: string
  ): Promise<StepFunctionPerformance> {
    return await this.stepFunctionService.checkStepFunctionPerformance(
      executionArn
    );
  }

  /**
   * Verify Step Function state machine definition is valid
   */
  async verifyStepFunctionDefinition(
    stateMachineName: string
  ): Promise<StepFunctionDefinition> {
    return await this.stepFunctionService.verifyStepFunctionDefinition(
      stateMachineName
    );
  }

  /**
   * Get Step Function state output for specific states
   */
  async getStepFunctionStateOutput(
    executionArn: string,
    stateName?: string
  ): Promise<StepFunctionStateOutput[]> {
    return await this.stepFunctionService.getStepFunctionStateOutput(
      executionArn,
      stateName
    );
  }

  /**
   * Verify Step Function state output contains expected data
   */
  async verifyStepFunctionStateOutput(
    executionArn: string,
    stateName: string,
    expectedOutput: Record<string, unknown>
  ): Promise<StepFunctionStateOutputVerification> {
    return await this.stepFunctionService.verifyStepFunctionStateOutput(
      executionArn,
      stateName,
      expectedOutput
    );
  }

  /**
   * Get Step Function execution data flow analysis
   */
  async getStepFunctionDataFlow(
    executionArn: string
  ): Promise<StepFunctionDataFlow> {
    return await this.stepFunctionService.getStepFunctionDataFlow(executionArn);
  }

  /**
   * Verify Step Function execution meets performance SLAs
   */
  async verifyStepFunctionSLAs(
    executionArn: string,
    slas: StepFunctionSLAs
  ): Promise<StepFunctionSLAVerification> {
    return await this.stepFunctionService.verifyStepFunctionSLAs(
      executionArn,
      slas
    );
  }
  //#endregion

  //#region Step Context Management (delegated to StepContextManager)
  getStepContext(): StepContext {
    return this.stepContextManager.getStepContext();
  }

  setStepContext<K extends keyof StepContext>(
    key: K,
    value: StepContext[K]
  ): void {
    this.stepContextManager.setStepContext(key, value);
    this.log('debug', `Set step context ${String(key)}: ${value}`);
  }

  getStepContextValue<K extends keyof StepContext>(
    key: K
  ): StepContext[K] | undefined {
    return this.stepContextManager.getStepContextValue(key);
  }

  clearStepContext(): void {
    this.stepContextManager.clearStepContext();
    this.log('debug', 'Cleared step context');
  }

  clearStepContextValue<K extends keyof StepContext>(key: K): void {
    this.stepContextManager.clearStepContextValue(key);
    this.log('debug', `Cleared step context ${String(key)}`);
  }

  hasStepContextValue<K extends keyof StepContext>(key: K): boolean {
    return this.stepContextManager.hasStepContextValue(key);
  }

  /**
   * Validate required step context values
   */
  validateStepContext(requiredKeys: (keyof StepContext)[]): {
    isValid: boolean;
    missingKeys: (keyof StepContext)[];
    presentKeys: (keyof StepContext)[];
  } {
    return this.stepContextManager.validateStepContext(requiredKeys);
  }
  //#endregion

  //#region Performance Monitoring (delegated to PerformanceMonitor)
  startTestRun(): void {
    this.performanceMonitor.startTestRun();
    this.log('info', 'Started performance monitoring for test run');
  }

  getTestMetrics() {
    return this.performanceMonitor.getTestMetrics();
  }

  getServiceMetrics(awsService: string) {
    return this.performanceMonitor.getServiceMetrics(awsService);
  }

  getSlowestOperations(count = 5) {
    return this.performanceMonitor.getSlowestOperations(count);
  }

  getOperationsWithMostRetries(count = 5) {
    return this.performanceMonitor.getOperationsWithMostRetries(count);
  }

  generatePerformanceReport(): string {
    return this.performanceMonitor.generatePerformanceReport();
  }
  //#endregion

  //#region Health and Validation (delegated to HealthValidator)
  async getHealthStatus() {
    const metrics = this.getTestMetrics();
    const context = this.getStepContext();
    return await this.healthValidator.getHealthStatus(
      metrics,
      context,
      this.executionTracker.size
    );
  }

  async validateAWSSetup() {
    return await this.healthValidator.validateAWSSetup();
  }

  async waitForCondition(
    condition: () => Promise<boolean>,
    timeout = 30000,
    interval = 1000
  ): Promise<void> {
    return await this.healthValidator.waitForCondition(
      condition,
      timeout,
      interval
    );
  }
  //#endregion

  //#region Reporter Management
  configureReporter(_outputDir?: string) {
    this.reporter = new TestReporter();
    return this;
  }

  getReporter() {
    return this.reporter;
  }
  //#endregion

  //#region Cleanup and Resource Management
  async cleanup(options?: CleanupOptions): Promise<void> {
    const {
      clearContext = true,
      clearMetrics = true,
      clearExecutions = true,
      generateReport = true,
    } = options || {};

    this.log('info', 'Starting framework cleanup');

    try {
      // Generate final performance report if requested
      if (generateReport && this.performanceMonitor.getMetricsCount() > 0) {
        const report = this.generatePerformanceReport();
        this.log('info', `Final Performance Report:\n${report}`);
      }

      // Clear step context
      if (clearContext) {
        this.clearStepContext();
      }

      // Clear performance metrics
      if (clearMetrics) {
        this.performanceMonitor.clearMetrics();
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

  async cleanupResources(
    resourceType: 's3' | 'sqs' | 'lambda' | 'stepfunctions' | 'all'
  ): Promise<void> {
    this.log('info', `Cleaning up ${resourceType} resources`);

    try {
      switch (resourceType) {
        case 's3':
          this.log('info', 'S3 cleanup requested (not implemented)');
          break;
        case 'sqs':
          this.log('info', 'SQS cleanup requested (not implemented)');
          break;
        case 'lambda':
          this.log('info', 'Lambda cleanup requested (not implemented)');
          break;
        case 'stepfunctions':
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
  //#endregion
}
