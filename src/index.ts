// Core framework exports

export type { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
export type { LambdaClient } from '@aws-sdk/client-lambda';
// Re-export commonly used AWS types
export type { S3Client } from '@aws-sdk/client-s3';
export type { SFNClient } from '@aws-sdk/client-sfn';
export type { SNSClient } from '@aws-sdk/client-sns';
export type { SQSClient } from '@aws-sdk/client-sqs';
export type { AWSTestingFrameworkConfig } from './config/ConfigManager';
// Export configuration management
export { ConfigManager } from './config/ConfigManager';
// Export the main framework class
export { AWSTestingFramework } from './framework/AWSTestingFramework';
// Export framework types from the types file
export type {
  AWSConfig,
  AWSSetupValidation,
  CleanupOptions,
  ContextValidation,
  ExecutionDetails,
  FrameworkConfig,
  HealthStatus,
  PerformanceMetrics,
  StepContext,
  StepFunctionDataFlow,
  StepFunctionDefinition,
  StepFunctionExecutionResult,
  StepFunctionPerformance,
  StepFunctionSLAs,
  StepFunctionSLAVerification,
  StepFunctionStateOutput,
  StepFunctionStateOutputVerification,
  TestMetrics,
} from './framework/types';
export { default as CustomFormatter } from './reporting/CustomFormatter';
export type { TestReporterResults as GenerateReportResults } from './reporting/generateReport';
export {
  convertCucumberReportToResults,
  generateHtmlReport,
} from './reporting/generateReport';

// Export reporting interfaces for documentation
export type {
  TestFeature,
  TestReporterResults,
  TestResult,
  TestScenario,
  TestStep,
} from './reporting/TestReporter';
// Export reporting utilities
export { TestReporter } from './reporting/TestReporter';
export type {
  DataSize,
  DataType,
  TestDataOptions,
} from './utils/TestDataGenerator';
// Export test data generator utilities
export {
  generateLambdaPayloadData,
  generateS3EventData,
  generateSQSMessageData,
  generateStepFunctionInputData,
  generateTestData,
  TestDataGenerator,
  testDataGenerator,
} from './utils/TestDataGenerator';
