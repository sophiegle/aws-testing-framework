import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IServiceContainer } from '../../../framework/container/ServiceContainer';
import type { S3Service } from '../../../framework/services/S3Service';
import type { FrameworkConfig, StepContext } from '../../../framework/types';

// Mock Cucumber before importing S3Steps
const mockGiven = jest.fn();
const mockWhen = jest.fn();
const mockThen = jest.fn();

jest.mock('@cucumber/cucumber', () => ({
  Given: mockGiven,
  When: mockWhen,
  Then: mockThen,
}));

import { S3Steps } from '../../../framework/steps/S3Steps';

type StepCallback = (
  this: StepContext,
  ...args: (string | number)[]
) => Promise<void> | void;

describe('S3Steps', () => {
  let s3Steps: S3Steps;
  let mockContainer: IServiceContainer;
  let mockContext: StepContext;
  let registeredSteps: Map<string, StepCallback>;

  // Properly typed mock services
  const mockS3Service = {
    findBucket: jest.fn(),
    uploadFile: jest.fn(),
    checkFileExists: jest.fn(),
  } as unknown as jest.Mocked<S3Service>;

  // Helper to safely get registered steps
  const getStep = (pattern: string): StepCallback => {
    const step = registeredSteps.get(pattern);
    if (!step) {
      throw new Error(`Step not found: ${pattern}`);
    }
    return step;
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    registeredSteps = new Map();
    mockGiven.mockClear();
    mockWhen.mockClear();
    mockThen.mockClear();

    // Capture registered steps
    const captureStep = (
      pattern: string | RegExp,
      callback: StepCallback
    ): void => {
      const key = typeof pattern === 'string' ? pattern : pattern.toString();
      registeredSteps.set(key, callback);
    };

    mockGiven.mockImplementation(captureStep as never);
    mockWhen.mockImplementation(captureStep as never);
    mockThen.mockImplementation(captureStep as never);

    // Create mock container with proper typing
    const mockGetConfig = jest.fn<() => FrameworkConfig>();
    mockGetConfig.mockReturnValue({ enableLogging: false } as FrameworkConfig);

    const mockIsDisposed = jest.fn<() => boolean>();
    mockIsDisposed.mockReturnValue(false);

    const mockDispose = jest.fn<() => Promise<void>>();

    mockContainer = {
      s3Service: mockS3Service,
      getConfig: mockGetConfig,
      isDisposed: mockIsDisposed,
      dispose: mockDispose,
    } as unknown as IServiceContainer;

    // Create fresh context for each test
    mockContext = {};

    // Create and register steps
    s3Steps = new S3Steps(mockContainer);
    s3Steps.registerSteps();
  });

  describe('Step Registration', () => {
    it('should register all S3 step definitions', () => {
      expect(mockGiven).toHaveBeenCalled();
      expect(mockWhen).toHaveBeenCalled();
      expect(mockThen).toHaveBeenCalled();
      expect(registeredSteps.size).toBeGreaterThan(0);
    });

    it('should register Given step for S3 bucket', () => {
      expect(mockGiven).toHaveBeenCalledWith(
        'I have an S3 bucket named {string}',
        expect.any(Function)
      );
    });

    it('should register When steps for file upload', () => {
      expect(mockWhen).toHaveBeenCalledWith(
        'I upload a file {string} to the S3 bucket',
        expect.any(Function)
      );
      expect(mockWhen).toHaveBeenCalledWith(
        'I upload a file {string} with content {string} to the S3 bucket',
        expect.any(Function)
      );
      expect(mockWhen).toHaveBeenCalledWith(
        'I upload multiple files to the S3 bucket',
        expect.any(Function)
      );
      expect(mockWhen).toHaveBeenCalledWith(
        'I upload many files to the S3 bucket',
        expect.any(Function)
      );
    });

    it('should register Then steps for verification', () => {
      expect(mockThen).toHaveBeenCalledWith(
        'the S3 bucket should contain the file {string}',
        expect.any(Function)
      );
    });
  });

  describe('Given: I have an S3 bucket named {string}', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('I have an S3 bucket named {string}');
    });

    it('should set bucket name in context', async () => {
      mockS3Service.findBucket.mockResolvedValue(undefined);

      await step.call(mockContext, 'test-bucket');

      expect(mockContext.bucketName).toBe('test-bucket');
      expect(mockS3Service.findBucket).toHaveBeenCalledWith('test-bucket');
    });

    it('should call s3Service.findBucket', async () => {
      mockS3Service.findBucket.mockResolvedValue(undefined);

      await step.call(mockContext, 'my-bucket');

      expect(mockS3Service.findBucket).toHaveBeenCalledWith('my-bucket');
      expect(mockS3Service.findBucket).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from s3Service.findBucket', async () => {
      mockS3Service.findBucket.mockRejectedValue(new Error('Bucket not found'));

      await expect(step.call(mockContext, 'missing-bucket')).rejects.toThrow(
        'Bucket not found'
      );
    });
  });

  describe('When: I upload a file {string} to the S3 bucket', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('I upload a file {string} to the S3 bucket');
      mockContext.bucketName = 'test-bucket';
    });

    it('should upload file with default content', async () => {
      mockS3Service.uploadFile.mockResolvedValue(undefined);

      await step.call(mockContext, 'test.txt');

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'test.txt',
        'test content'
      );
      expect(mockContext.uploadedFileName).toBe('test.txt');
    });

    it('should throw error if bucket name is not set', async () => {
      delete mockContext.bucketName;

      await expect(step.call(mockContext, 'test.txt')).rejects.toThrow(
        'Bucket name is not set. Make sure to create an S3 bucket first.'
      );
      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should propagate upload errors', async () => {
      mockS3Service.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(step.call(mockContext, 'test.txt')).rejects.toThrow(
        'Upload failed'
      );
    });
  });

  describe('When: I upload a file {string} with content {string} to the S3 bucket', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep(
        'I upload a file {string} with content {string} to the S3 bucket'
      );
      mockContext.bucketName = 'test-bucket';
    });

    it('should upload file with custom content', async () => {
      mockS3Service.uploadFile.mockResolvedValue(undefined);

      await step.call(mockContext, 'custom.txt', 'custom content');

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'custom.txt',
        'custom content'
      );
      expect(mockContext.uploadedFileName).toBe('custom.txt');
      expect(mockContext.uploadedFileContent).toBe('custom content');
    });

    it('should set uploadedFileName and uploadedFileContent in context', async () => {
      mockS3Service.uploadFile.mockResolvedValue(undefined);

      await step.call(mockContext, 'test.txt', 'content');

      expect(mockContext.uploadedFileName).toBe('test.txt');
      expect(mockContext.uploadedFileContent).toBe('content');
      expect(mockS3Service.uploadFile).toHaveBeenCalled();
    });

    it('should throw error if bucket name is not set', async () => {
      delete mockContext.bucketName;

      await expect(
        step.call(mockContext, 'test.txt', 'content')
      ).rejects.toThrow(
        'Bucket name is not set. Make sure to create an S3 bucket first.'
      );
      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('When: I upload multiple files to the S3 bucket', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('I upload multiple files to the S3 bucket');
      mockContext.bucketName = 'test-bucket';
    });

    it('should upload 3 files in parallel', async () => {
      mockS3Service.uploadFile.mockResolvedValue(undefined);

      await step.call(mockContext);

      expect(mockS3Service.uploadFile).toHaveBeenCalledTimes(3);
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'file1.txt',
        'content1'
      );
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'file2.txt',
        'content2'
      );
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'file3.txt',
        'content3'
      );
    });

    it('should throw error if bucket name is not set', async () => {
      delete mockContext.bucketName;

      await expect(step.call(mockContext)).rejects.toThrow(
        'Bucket name is not set. Make sure to create an S3 bucket first.'
      );
      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should propagate upload errors', async () => {
      mockS3Service.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(step.call(mockContext)).rejects.toThrow('Upload failed');
    });
  });

  describe('When: I upload many files to the S3 bucket', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('I upload many files to the S3 bucket');
      mockContext.bucketName = 'test-bucket';
    });

    it('should upload 10 files in batches', async () => {
      mockS3Service.uploadFile.mockResolvedValue(undefined);

      await step.call(mockContext);

      expect(mockS3Service.uploadFile).toHaveBeenCalledTimes(10);

      // Verify files are named correctly
      for (let i = 1; i <= 10; i++) {
        expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
          'test-bucket',
          `file${i}.txt`,
          `content${i}`
        );
      }
    });

    it('should throw error if bucket name is not set', async () => {
      delete mockContext.bucketName;

      await expect(step.call(mockContext)).rejects.toThrow(
        'Bucket name is not set. Make sure to create an S3 bucket first.'
      );
      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('Then: the S3 bucket should contain the file {string}', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('the S3 bucket should contain the file {string}');
      mockContext.bucketName = 'test-bucket';
    });

    it('should verify file exists on first try', async () => {
      mockS3Service.checkFileExists.mockResolvedValue(true);

      await step.call(mockContext, 'test.txt');

      expect(mockS3Service.checkFileExists).toHaveBeenCalledWith(
        'test-bucket',
        'test.txt'
      );
      expect(mockS3Service.checkFileExists).toHaveBeenCalledTimes(1);
    });

    it('should retry up to 5 times if file not initially found', async () => {
      // Fail 4 times, succeed on 5th
      mockS3Service.checkFileExists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValue(true);

      await step.call(mockContext, 'test.txt');

      expect(mockS3Service.checkFileExists).toHaveBeenCalledTimes(5);
    });

    it('should throw error after max retries if file not found', async () => {
      mockS3Service.checkFileExists.mockResolvedValue(false);

      await expect(step.call(mockContext, 'missing.txt')).rejects.toThrow(
        'File missing.txt not found in bucket test-bucket'
      );
      expect(mockS3Service.checkFileExists).toHaveBeenCalledTimes(5);
    });

    it('should throw error if bucket name is not set', async () => {
      delete mockContext.bucketName;

      await expect(step.call(mockContext, 'test.txt')).rejects.toThrow(
        'Bucket name is not set. Make sure to create an S3 bucket first.'
      );
      expect(mockS3Service.checkFileExists).not.toHaveBeenCalled();
    });

    it('should eventually find file after one retry', async () => {
      mockS3Service.checkFileExists
        .mockResolvedValueOnce(false)
        .mockResolvedValue(true);

      await step.call(mockContext, 'test.txt');

      expect(mockS3Service.checkFileExists).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty bucket name gracefully', async () => {
      const step = getStep('I have an S3 bucket named {string}');
      mockS3Service.findBucket.mockResolvedValue(undefined);

      await step.call(mockContext, '');

      expect(mockContext.bucketName).toBe('');
      expect(mockS3Service.findBucket).toHaveBeenCalledWith('');
    });

    it('should handle special characters in file names', async () => {
      const step = getStep('I upload a file {string} to the S3 bucket');
      mockContext.bucketName = 'test-bucket';
      mockS3Service.uploadFile.mockResolvedValue(undefined);

      await step.call(mockContext, 'file-with-special_chars.test.txt');

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'file-with-special_chars.test.txt',
        'test content'
      );
    });

    it('should handle empty content string', async () => {
      const step = getStep(
        'I upload a file {string} with content {string} to the S3 bucket'
      );
      mockContext.bucketName = 'test-bucket';
      mockS3Service.uploadFile.mockResolvedValue(undefined);

      await step.call(mockContext, 'empty.txt', '');

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'empty.txt',
        ''
      );
    });

    it('should use container services correctly', async () => {
      const step = getStep('I upload a file {string} to the S3 bucket');
      mockContext.bucketName = 'test-bucket';
      mockS3Service.uploadFile.mockResolvedValue(undefined);

      await step.call(mockContext, 'test.txt');

      expect(mockS3Service.uploadFile).toHaveBeenCalled();
    });
  });

  describe('Integration with Services', () => {
    it('should properly chain bucket creation and file upload', async () => {
      const createBucketStep = getStep('I have an S3 bucket named {string}');
      const uploadStep = getStep('I upload a file {string} to the S3 bucket');

      mockS3Service.findBucket.mockResolvedValue(undefined);
      mockS3Service.uploadFile.mockResolvedValue(undefined);

      // Create bucket
      await createBucketStep.call(mockContext, 'integration-bucket');
      expect(mockContext.bucketName).toBe('integration-bucket');

      // Upload file
      await uploadStep.call(mockContext, 'integration-test.txt');
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'integration-bucket',
        'integration-test.txt',
        'test content'
      );
    });

    it('should propagate service errors correctly', async () => {
      const step = getStep('I have an S3 bucket named {string}');
      mockS3Service.findBucket.mockRejectedValue(
        new Error('AWS Service Error')
      );

      await expect(step.call(mockContext, 'error-bucket')).rejects.toThrow(
        'AWS Service Error'
      );
    });
  });
});
