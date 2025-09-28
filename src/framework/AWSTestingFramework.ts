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
import type { ExecutionDetails, FrameworkConfig } from './types';

export class AWSTestingFramework {
  // AWS Service clients
  private s3Client: S3Client;
  private sqsClient: SQSClient;
  private lambdaClient: LambdaClient;
  private sfnClient: SFNClient;
  private cloudWatchLogsClient: CloudWatchLogsClient;

  // Service classes
  public s3Service: S3Service;
  public sqsService: SQSService;
  public lambdaService: LambdaService;
  public stepFunctionService: StepFunctionService;
  public performanceMonitor: PerformanceMonitor;
  public stepContextManager: StepContextManager;
  public healthValidator: HealthValidator;

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
}
