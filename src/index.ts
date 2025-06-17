export { AWSTestingFramework } from './framework/AWSTestingFramework';

// Re-export commonly used AWS types
export type { S3Client } from '@aws-sdk/client-s3';
export type { SQSClient } from '@aws-sdk/client-sqs';
export type { LambdaClient } from '@aws-sdk/client-lambda';
export type { SFNClient } from '@aws-sdk/client-sfn';
export type { SNSClient } from '@aws-sdk/client-sns';

// Export the base steps
export * from './steps/base-steps';
