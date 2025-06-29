// Core framework exports

export type { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
export type { LambdaClient } from '@aws-sdk/client-lambda';
// Re-export commonly used AWS types
export type { S3Client } from '@aws-sdk/client-s3';
export type { SFNClient } from '@aws-sdk/client-sfn';
export type { SNSClient } from '@aws-sdk/client-sns';
export type { SQSClient } from '@aws-sdk/client-sqs';
export {
  type AWSConfig,
  AWSTestingFramework,
  type ExecutionDetails,
  type FrameworkConfig,
  type PerformanceMetrics,
  type StepContext,
  type TestMetrics,
} from './framework/AWSTestingFramework';
export { default as CustomFormatter } from './reporting/CustomFormatter';
export type { TestReporterResults as GenerateReportResults } from './reporting/generateReport';
export { generateHtmlReport } from './reporting/generateReport';

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
