import { Given, Then, When } from '@cucumber/cucumber';
import type { StepContext } from '../framework/types';
import { AWSTestingFramework } from '../index';

const framework = new AWSTestingFramework();

// Basic S3 operations
Given(
  'I have an S3 bucket named {string}',
  async function (this: StepContext, bucketName: string) {
    this.bucketName = bucketName;
    await framework.s3Service.findBucket(bucketName);
  }
);

When(
  'I upload a file {string} to the S3 bucket',
  async function (this: StepContext, fileName: string) {
    if (!this.bucketName) {
      throw new Error(
        'Bucket name is not set. Make sure to create a bucket first.'
      );
    }

    this.uploadedFileName = fileName;
    this.uploadedFileContent = 'Test content';

    await framework.s3Service.uploadFile(
      this.bucketName,
      fileName,
      'Test content'
    );

    // Add a small delay to allow S3 event notification to propagate
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
);

Then(
  'the S3 bucket should contain the file {string}',
  async function (this: StepContext, fileName: string) {
    if (!this.bucketName) {
      throw new Error(
        'Bucket name is not set. Make sure to create a bucket first.'
      );
    }
    await framework.healthValidator.waitForCondition(async () => {
      if (!this.bucketName) return false;
      const exists = await framework.s3Service.checkFileExists(
        this.bucketName,
        fileName
      );
      return exists;
    });
  }
);

When(
  'I upload a file {string} with content {string} to the S3 bucket',
  async function (this: StepContext, fileName: string, content: string) {
    if (!this.bucketName) {
      throw new Error(
        'Bucket name is not set. Make sure to create a bucket first.'
      );
    }

    this.uploadedFileName = fileName;
    this.uploadedFileContent = content;

    await framework.s3Service.uploadFile(this.bucketName, fileName, content);

    // Add a small delay to allow S3 event notification to propagate
    await new Promise((resolve) => setTimeout(resolve, 2000));
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
      { name: 'file1.json', content: JSON.stringify({ id: 1, data: 'test1' }) },
      { name: 'file2.json', content: JSON.stringify({ id: 2, data: 'test2' }) },
      { name: 'file3.json', content: JSON.stringify({ id: 3, data: 'test3' }) },
    ];

    for (const file of files) {
      await framework.s3Service.uploadFile(
        this.bucketName,
        file.name,
        file.content
      );

      // Wait a bit between uploads to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
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

    // Upload 10 files to trigger multiple Lambda executions
    const files = [];
    for (let i = 1; i <= 10; i++) {
      files.push({
        name: `load-test-${i}.json`,
        content: JSON.stringify({
          id: i,
          data: `load-test-${i}`,
          timestamp: Date.now(),
        }),
      });
    }

    for (const file of files) {
      await framework.s3Service.uploadFile(
        this.bucketName,
        file.name,
        file.content
      );

      // Small delay between uploads to allow Lambda processing
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
);
