import { Given, Then, When } from '@cucumber/cucumber';
import { BaseStepDefinition } from '../container/BaseStepDefinition';
import type { StepContext } from '../types';

/**
 * S3 step definitions with proper dependency injection
 */
export class S3Steps extends BaseStepDefinition {
  /**
   * Register all S3 step definitions
   */
  registerSteps(): void {
    const container = this.container;

    // Basic S3 operations
    Given(
      'I have an S3 bucket named {string}',
      async function (this: StepContext, bucketName: string) {
        this.bucketName = bucketName;
        await container.s3Service.findBucket(bucketName);
      }
    );

    When(
      'I upload a file {string} to the S3 bucket',
      async function (this: StepContext, fileName: string) {
        if (!this.bucketName) {
          throw new Error(
            'Bucket name is not set. Make sure to create an S3 bucket first.'
          );
        }
        this.uploadedFileName = fileName;
        await container.s3Service.uploadFile(
          this.bucketName,
          fileName,
          'test content'
        );
      }
    );

    When(
      'I upload a file {string} with content {string} to the S3 bucket',
      async function (this: StepContext, fileName: string, content: string) {
        if (!this.bucketName) {
          throw new Error(
            'Bucket name is not set. Make sure to create an S3 bucket first.'
          );
        }
        this.uploadedFileName = fileName;
        this.uploadedFileContent = content;
        await container.s3Service.uploadFile(
          this.bucketName,
          fileName,
          content
        );
        // Add a small delay to allow S3 event notification to propagate
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    );

    When(
      'I upload multiple files to the S3 bucket',
      async function (this: StepContext) {
        if (!this.bucketName) {
          throw new Error(
            'Bucket name is not set. Make sure to create an S3 bucket first.'
          );
        }

        const files = [
          { name: 'file1.txt', content: 'content1' },
          { name: 'file2.txt', content: 'content2' },
          { name: 'file3.txt', content: 'content3' },
        ];

        // Upload files in parallel for better performance
        await Promise.all(
          files.map((file) =>
            container.s3Service.uploadFile(
              this.bucketName as string,
              file.name,
              file.content
            )
          )
        );

        // Add a small delay to allow S3 event notification to propagate
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    );

    When(
      'I upload many files to the S3 bucket',
      async function (this: StepContext) {
        if (!this.bucketName) {
          throw new Error(
            'Bucket name is not set. Make sure to create an S3 bucket first.'
          );
        }

        const files = Array.from({ length: 10 }, (_, i) => ({
          name: `file${i + 1}.txt`,
          content: `content${i + 1}`,
        }));

        // Upload files in batches to avoid overwhelming the system
        const batchSize = 3;
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          await Promise.all(
            batch.map((file) =>
              container.s3Service.uploadFile(
                this.bucketName as string,
                file.name,
                file.content
              )
            )
          );
          // Wait a bit between uploads to avoid overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    );

    Then(
      'the S3 bucket should contain the file {string}',
      async function (this: StepContext, fileName: string) {
        if (!this.bucketName) {
          throw new Error(
            'Bucket name is not set. Make sure to create an S3 bucket first.'
          );
        }

        // Wait for the file to be available with retry logic
        const maxRetries = 5;
        const retryDelay = 1000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const exists = await container.s3Service.checkFileExists(
            this.bucketName,
            fileName
          );

          if (exists) {
            return; // File exists, test passes
          }

          if (attempt < maxRetries) {
            // Add a small delay to allow S3 event notification to propagate
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }

        throw new Error(
          `File ${fileName} not found in bucket ${this.bucketName}`
        );
      }
    );
  }
}
