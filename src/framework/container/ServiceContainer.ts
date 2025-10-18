import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { SFNClient } from '@aws-sdk/client-sfn';
import { SQSClient } from '@aws-sdk/client-sqs';
import { TestReporter } from '../../reporting/TestReporter';
import { HealthValidator } from '../services/HealthValidator';
import { LambdaService } from '../services/LambdaService';
import { PerformanceMonitor } from '../services/PerformanceMonitor';
import { S3Service } from '../services/S3Service';
import { SQSService } from '../services/SQSService';
import { StepContextManager } from '../services/StepContextManager';
import { StepFunctionService } from '../services/StepFunctionService';
import type { FrameworkConfig } from '../types';

/**
 * Service container interface for dependency injection
 */
export interface IServiceContainer {
  readonly s3Service: S3Service;
  readonly sqsService: SQSService;
  readonly lambdaService: LambdaService;
  readonly stepFunctionService: StepFunctionService;
  readonly performanceMonitor: PerformanceMonitor;
  readonly stepContextManager: StepContextManager;
  readonly healthValidator: HealthValidator;
  readonly reporter: TestReporter;

  /**
   * Dispose of all resources and cleanup
   */
  dispose(): Promise<void>;

  /**
   * Check if the container has been disposed
   */
  isDisposed(): boolean;

  /**
   * Get the current configuration
   */
  getConfig(): FrameworkConfig;
}

/**
 * Service container implementation with proper resource management
 */
export class ServiceContainer implements IServiceContainer {
  // AWS Service clients
  private readonly s3Client: S3Client;
  private readonly sqsClient: SQSClient;
  private readonly lambdaClient: LambdaClient;
  private readonly sfnClient: SFNClient;
  private readonly cloudWatchLogsClient: CloudWatchLogsClient;

  // Service instances
  public readonly s3Service: S3Service;
  public readonly sqsService: SQSService;
  public readonly lambdaService: LambdaService;
  public readonly stepFunctionService: StepFunctionService;
  public readonly performanceMonitor: PerformanceMonitor;
  public readonly stepContextManager: StepContextManager;
  public readonly healthValidator: HealthValidator;
  public readonly reporter: TestReporter;

  // Configuration and cleanup
  private readonly config: FrameworkConfig;
  private readonly cleanupTasks: (() => Promise<void>)[] = [];
  private disposed = false;

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

    // Initialize AWS clients with proper configuration
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
    this.lambdaClient = new LambdaClient({
      ...clientConfig,
      ...this.config.lambda,
    });
    this.sfnClient = new SFNClient(clientConfig);
    this.cloudWatchLogsClient = new CloudWatchLogsClient(clientConfig);

    // Initialize service classes
    this.s3Service = new S3Service(this.s3Client);
    this.sqsService = new SQSService(this.sqsClient);
    this.lambdaService = new LambdaService(
      this.lambdaClient,
      this.cloudWatchLogsClient,
      this.config.lambda
    );
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
    this.reporter = new TestReporter();

    // Register cleanup tasks
    this.registerCleanupTasks();
  }

  /**
   * Register cleanup tasks for proper resource disposal
   */
  private registerCleanupTasks(): void {
    // Clear any pending timeouts or intervals
    this.cleanupTasks.push(async () => {
      // Performance monitor cleanup
      // The PerformanceMonitor maintains metrics in memory
      // These will be garbage collected when the container is disposed
    });

    // Clear step context
    this.cleanupTasks.push(async () => {
      // Step context cleanup
      // The StepContextManager maintains context in memory
      // These will be garbage collected when the container is disposed
    });

    // Clear execution tracker if it exists
    this.cleanupTasks.push(async () => {
      // This would be implemented in the framework if it had an execution tracker
      // For now, we'll just ensure any pending operations are cleaned up
    });
  }

  /**
   * Dispose of all resources and cleanup
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    // Execute all cleanup tasks
    await Promise.all(this.cleanupTasks.map((task) => task()));

    // Clear the cleanup tasks array
    this.cleanupTasks.length = 0;

    this.disposed = true;
  }

  /**
   * Get the current framework configuration
   */
  getConfig(): FrameworkConfig {
    return { ...this.config };
  }

  /**
   * Check if the container has been disposed
   */
  isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Create a scoped container for testing
   */
  static createForTesting(config?: Partial<FrameworkConfig>): ServiceContainer {
    const testConfig: FrameworkConfig = {
      defaultTimeout: 5000, // Shorter timeout for tests
      retryAttempts: 1, // Fewer retries for tests
      retryDelay: 100, // Faster retry for tests
      enableLogging: false, // Disable logging in tests
      logLevel: 'error', // Only log errors in tests
      testDataDir: './test-data',
      ...config,
    };

    return new ServiceContainer(testConfig);
  }

  /**
   * Create a container for development environment
   */
  static createForDevelopment(region?: string): ServiceContainer {
    const devConfig: FrameworkConfig = {
      defaultTimeout: 60000, // Longer timeout for development
      retryAttempts: 5, // More retries for development
      retryDelay: 2000, // Longer retry delay for development
      enableLogging: true,
      logLevel: 'debug', // Verbose logging for development
      testDataDir: './test-data',
      aws: {
        region: region || process.env.AWS_REGION || 'us-east-1',
        maxRetries: 5,
        timeout: 30000,
      },
    };

    return new ServiceContainer(devConfig);
  }

  /**
   * Create a container for CI environment
   */
  static createForCI(region?: string): ServiceContainer {
    const ciConfig: FrameworkConfig = {
      defaultTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableLogging: true,
      logLevel: 'info',
      testDataDir: './test-data',
      aws: {
        region: region || process.env.AWS_REGION || 'us-east-1',
        maxRetries: 3,
        timeout: 10000,
      },
    };

    return new ServiceContainer(ciConfig);
  }
}
