// Core framework exports
export { AWSTestingFramework } from './framework/AWSTestingFramework';
export type {
  StepContext,
  ExecutionDetails,
  WorkflowTrace,
} from './framework/AWSTestingFramework';

// Re-export commonly used AWS types
export type { S3Client } from '@aws-sdk/client-s3';
export type { SQSClient } from '@aws-sdk/client-sqs';
export type { LambdaClient } from '@aws-sdk/client-lambda';
export type { SFNClient } from '@aws-sdk/client-sfn';
export type { SNSClient } from '@aws-sdk/client-sns';
export type { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';

// Export reporting utilities
export { TestReporter } from './reporting/TestReporter';
export { default as CustomFormatter } from './reporting/CustomFormatter';
export { generateHtmlReport } from './reporting/generateReport';

// Export reporting interfaces for documentation
export type {
  TestFeature,
  TestScenario,
  TestStep,
  TestResult,
  TestReporterResults
} from './reporting/TestReporter';
export type { TestReporterResults as GenerateReportResults } from './reporting/generateReport';
