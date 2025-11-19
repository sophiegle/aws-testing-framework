import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IServiceContainer } from '../../../framework/container/ServiceContainer';
import type { HealthValidator } from '../../../framework/services/HealthValidator';
import type { LambdaService } from '../../../framework/services/LambdaService';
import type { S3Service } from '../../../framework/services/S3Service';
import type { FrameworkConfig, StepContext } from '../../../framework/types';

// Mock Cucumber before importing LambdaSteps
const mockGiven = jest.fn();
const mockWhen = jest.fn();
const mockThen = jest.fn();

jest.mock('@cucumber/cucumber', () => ({
  Given: mockGiven,
  When: mockWhen,
  Then: mockThen,
}));

import { LambdaSteps } from '../../../framework/steps/LambdaSteps';

type StepCallback = (
  this: StepContext,
  ...args: (string | number)[]
) => Promise<void> | void;

describe('LambdaSteps', () => {
  let lambdaSteps: LambdaSteps;
  let mockContainer: IServiceContainer;
  let mockContext: StepContext;
  let registeredSteps: Map<string, StepCallback>;
  let mockGetConfig: jest.Mock<() => FrameworkConfig>;

  // Properly typed mock services
  const mockLambdaService = {
    findFunction: jest.fn(),
    invokeFunction: jest.fn(),
    checkLambdaExecution: jest.fn(),
    countLambdaExecutionsInLastMinutes: jest.fn(),
    getLambdaLogs: jest.fn(),
  } as unknown as jest.Mocked<LambdaService>;

  const mockS3Service = {
    uploadFile: jest.fn(),
  } as unknown as jest.Mocked<S3Service>;

  const mockHealthValidator = {
    waitForCondition: jest.fn(),
  } as unknown as jest.Mocked<HealthValidator>;

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
    mockGetConfig = jest.fn<() => FrameworkConfig>();
    mockGetConfig.mockReturnValue({ enableLogging: false } as FrameworkConfig);

    const mockIsDisposed = jest.fn<() => boolean>();
    mockIsDisposed.mockReturnValue(false);

    const mockDispose = jest.fn<() => Promise<void>>();

    mockContainer = {
      lambdaService: mockLambdaService,
      s3Service: mockS3Service,
      healthValidator: mockHealthValidator,
      getConfig: mockGetConfig,
      isDisposed: mockIsDisposed,
      dispose: mockDispose,
    } as unknown as IServiceContainer;

    // Create fresh context for each test
    mockContext = {};

    // Create and register steps
    lambdaSteps = new LambdaSteps(mockContainer);
    lambdaSteps.registerSteps();
  });

  describe('Step Registration', () => {
    it('should register all Lambda step definitions', () => {
      expect(mockGiven).toHaveBeenCalled();
      expect(mockWhen).toHaveBeenCalled();
      expect(mockThen).toHaveBeenCalled();
      expect(registeredSteps.size).toBeGreaterThan(0);
    });

    it('should register Given step for Lambda function', () => {
      expect(mockGiven).toHaveBeenCalledWith(
        'I have a Lambda function named {string}',
        expect.any(Function)
      );
    });

    it('should register When steps for invocation', () => {
      expect(mockWhen).toHaveBeenCalledWith(
        'I invoke the Lambda function with payload {string}',
        expect.any(Function)
      );
      expect(mockWhen).toHaveBeenCalledWith(
        'I invoke the Lambda function with payload {string} and timeout {int} seconds',
        expect.any(Function)
      );
    });

    it('should register Then steps for verification', () => {
      expect(mockThen).toHaveBeenCalledWith(
        'the Lambda function should be invoked',
        expect.any(Function)
      );
      expect(mockThen).toHaveBeenCalledWith(
        'the Lambda function should be invoked {int} times within {int} minutes',
        expect.any(Function)
      );
    });
  });

  describe('Given: I have a Lambda function named {string}', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('I have a Lambda function named {string}');
    });

    it('should set function name in context', async () => {
      mockLambdaService.findFunction.mockResolvedValue(undefined);

      await step.call(mockContext, 'test-function');

      expect(mockContext.functionName).toBe('test-function');
    });

    it('should verify function exists', async () => {
      mockLambdaService.findFunction.mockResolvedValue(undefined);

      await step.call(mockContext, 'test-function');

      expect(mockLambdaService.findFunction).toHaveBeenCalledWith(
        'test-function'
      );
    });

    it('should throw error when function not found', async () => {
      mockLambdaService.findFunction.mockRejectedValue(
        new Error('Function not found')
      );

      await expect(step.call(mockContext, 'non-existent')).rejects.toThrow(
        'Function not found'
      );
    });
  });

  describe('When: I invoke the Lambda function with payload {string}', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('I invoke the Lambda function with payload {string}');
      mockContext.functionName = 'test-function';
    });

    it('should invoke Lambda function with valid JSON payload', async () => {
      const payload = '{"key":"value"}';
      mockLambdaService.invokeFunction.mockResolvedValue({});

      await step.call(mockContext, payload);

      expect(mockLambdaService.invokeFunction).toHaveBeenCalledWith(
        'test-function',
        { key: 'value' }
      );
    });

    it('should throw error when function name not set', async () => {
      mockContext.functionName = undefined;

      await expect(step.call(mockContext, '{}')).rejects.toThrow(
        'Function name is not set'
      );
    });

    it('should throw error for invalid JSON payload', async () => {
      const invalidPayload = 'not valid json';

      await expect(step.call(mockContext, invalidPayload)).rejects.toThrow(
        'Invalid JSON payload'
      );
    });

    it('should handle complex JSON payloads', async () => {
      const complexPayload = '{"nested":{"data":"value"},"array":[1,2,3]}';
      mockLambdaService.invokeFunction.mockResolvedValue({});

      await step.call(mockContext, complexPayload);

      expect(mockLambdaService.invokeFunction).toHaveBeenCalledWith(
        'test-function',
        { nested: { data: 'value' }, array: [1, 2, 3] }
      );
    });
  });

  describe('When: I invoke the Lambda function with payload {string} and timeout {int} seconds', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep(
        'I invoke the Lambda function with payload {string} and timeout {int} seconds'
      );
      mockContext.functionName = 'test-function';
    });

    it('should invoke function with timeout in seconds', async () => {
      const payload = '{"test":"data"}';
      mockLambdaService.invokeFunction.mockResolvedValue({});

      await step.call(mockContext, payload, 30);

      expect(mockLambdaService.invokeFunction).toHaveBeenCalledWith(
        'test-function',
        { test: 'data' },
        { timeout: 30000 } // 30 seconds in ms
      );
    });

    it('should throw error for invalid timeout (too low)', async () => {
      await expect(step.call(mockContext, '{}', 0)).rejects.toThrow(
        'Timeout must be between 1 and 900 seconds'
      );
    });

    it('should throw error for invalid timeout (too high)', async () => {
      await expect(step.call(mockContext, '{}', 901)).rejects.toThrow(
        'Timeout must be between 1 and 900 seconds'
      );
    });

    it('should throw error when function name not set', async () => {
      mockContext.functionName = undefined;

      await expect(step.call(mockContext, '{}', 30)).rejects.toThrow(
        'Function name is not set'
      );
    });

    it('should throw error for invalid JSON', async () => {
      await expect(step.call(mockContext, 'invalid json', 30)).rejects.toThrow(
        'Invalid JSON payload'
      );
    });
  });

  describe('When: I invoke the Lambda function with payload {string} and timeout {int} minutes', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep(
        'I invoke the Lambda function with payload {string} and timeout {int} minutes'
      );
      mockContext.functionName = 'test-function';
    });

    it('should invoke function with timeout in minutes', async () => {
      const payload = '{"test":"data"}';
      mockLambdaService.invokeFunction.mockResolvedValue({});

      await step.call(mockContext, payload, 5);

      expect(mockLambdaService.invokeFunction).toHaveBeenCalledWith(
        'test-function',
        { test: 'data' },
        { timeout: 300000 } // 5 minutes in ms
      );
    });

    it('should throw error for invalid timeout (too low)', async () => {
      await expect(step.call(mockContext, '{}', 0)).rejects.toThrow(
        'Timeout must be between 1 and 15 minutes'
      );
    });

    it('should throw error for invalid timeout (too high)', async () => {
      await expect(step.call(mockContext, '{}', 16)).rejects.toThrow(
        'Timeout must be between 1 and 15 minutes'
      );
    });

    it('should handle maximum allowed timeout', async () => {
      mockLambdaService.invokeFunction.mockResolvedValue({});

      await step.call(mockContext, '{}', 15);

      expect(mockLambdaService.invokeFunction).toHaveBeenCalledWith(
        'test-function',
        {},
        { timeout: 900000 } // 15 minutes
      );
    });
  });

  describe('When: I trigger multiple concurrent operations', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('I trigger multiple concurrent operations');
      mockContext.bucketName = 'test-bucket';
      mockS3Service.uploadFile.mockResolvedValue(undefined);
    });

    it('should upload multiple files concurrently', async () => {
      await step.call(mockContext);

      expect(mockS3Service.uploadFile).toHaveBeenCalledTimes(5);
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'concurrent1.txt',
        'test data 1'
      );
      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        'test-bucket',
        'concurrent5.txt',
        'test data 5'
      );
    });

    it('should throw error when bucket name not set', async () => {
      mockContext.bucketName = undefined;

      await expect(step.call(mockContext)).rejects.toThrow(
        'Bucket name is not set'
      );
    });

    it('should handle upload errors gracefully', async () => {
      mockS3Service.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(step.call(mockContext)).rejects.toThrow();
    });
  });

  describe('Then: the Lambda function should return {string}', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('the Lambda function should return {string}');
      mockContext.functionName = 'test-function';
    });

    it('should verify Lambda function returns expected result', async () => {
      mockLambdaService.invokeFunction.mockResolvedValue({
        Payload: 'expected-result',
      });
      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition: () => Promise<boolean>) => {
          await condition();
        }
      );

      await step.call(mockContext, 'expected-result');

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalled();
      expect(mockLambdaService.invokeFunction).toHaveBeenCalledWith(
        'test-function',
        {}
      );
    });

    it('should throw error when function name not set', async () => {
      mockContext.functionName = undefined;

      await expect(step.call(mockContext, 'result')).rejects.toThrow(
        'Function name is not set'
      );
    });
  });

  describe('Then: the Lambda function should be invoked', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('the Lambda function should be invoked');
      mockContext.functionName = 'test-function';
    });

    it('should verify Lambda function was invoked', async () => {
      mockLambdaService.checkLambdaExecution.mockResolvedValue(true);
      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition: () => Promise<boolean>) => {
          const result = await condition();
          if (!result) throw new Error('Condition not met');
        }
      );

      await step.call(mockContext);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalledWith(
        expect.any(Function),
        60000, // Default timeout
        2000 // Default interval
      );
      expect(mockLambdaService.checkLambdaExecution).toHaveBeenCalledWith(
        'test-function'
      );
    });

    it('should throw error when function name not set', async () => {
      mockContext.functionName = undefined;

      await expect(step.call(mockContext)).rejects.toThrow(
        'Function name is not set'
      );
    });

    it('should wait for condition to be met', async () => {
      let callCount = 0;
      mockLambdaService.checkLambdaExecution.mockImplementation(async () => {
        callCount++;
        return callCount >= 2; // Return true on second call
      });

      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition: () => Promise<boolean>) => {
          // Simulate polling
          let result = await condition();
          if (!result) {
            result = await condition();
          }
          if (!result) throw new Error('Timeout');
        }
      );

      await step.call(mockContext);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalledWith(
        expect.any(Function),
        60000, // Default timeout
        2000 // Default interval
      );
      expect(mockLambdaService.checkLambdaExecution).toHaveBeenCalled();
    });

    it('should use custom timeout from environment variable', async () => {
      const originalEnv = process.env.LAMBDA_TIMEOUT_MS;
      process.env.LAMBDA_TIMEOUT_MS = '120000'; // 2 minutes

      mockLambdaService.checkLambdaExecution.mockResolvedValue(true);
      mockHealthValidator.waitForCondition.mockResolvedValue(undefined);
      mockGetConfig.mockReturnValue({
        enableLogging: false,
        lambda: {}, // Empty lambda config, so env var will be used
      } as FrameworkConfig);

      await step.call(mockContext);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalledWith(
        expect.any(Function),
        120000, // Custom timeout from env var
        2000 // Default interval
      );

      // Restore original env
      if (originalEnv) {
        process.env.LAMBDA_TIMEOUT_MS = originalEnv;
      } else {
        delete process.env.LAMBDA_TIMEOUT_MS;
      }
    });

    it('should use custom timeout from config (takes precedence over env var)', async () => {
      const originalEnv = process.env.LAMBDA_TIMEOUT_MS;
      process.env.LAMBDA_TIMEOUT_MS = '120000'; // This should be ignored

      mockLambdaService.checkLambdaExecution.mockResolvedValue(true);
      mockHealthValidator.waitForCondition.mockResolvedValue(undefined);
      mockGetConfig.mockReturnValue({
        enableLogging: false,
        lambda: {
          timeout: 180000, // 3 minutes - should be used
        },
      } as FrameworkConfig);

      await step.call(mockContext);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalledWith(
        expect.any(Function),
        180000, // Custom timeout from config (not env var)
        2000 // Default interval
      );

      // Restore original env
      if (originalEnv) {
        process.env.LAMBDA_TIMEOUT_MS = originalEnv;
      } else {
        delete process.env.LAMBDA_TIMEOUT_MS;
      }
    });
  });

  describe('Then: the Lambda function should be invoked {int} times within {int} minutes', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep(
        'the Lambda function should be invoked {int} times within {int} minutes'
      );
      mockContext.functionName = 'test-function';
    });

    it('should verify Lambda function invocation count', async () => {
      mockLambdaService.countLambdaExecutionsInLastMinutes.mockResolvedValue(5);
      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition: () => Promise<boolean>) => {
          await condition();
        }
      );

      await step.call(mockContext, 5, 10);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalled();
      expect(
        mockLambdaService.countLambdaExecutionsInLastMinutes
      ).toHaveBeenCalledWith('test-function', 10);
    });

    it('should throw error when function name not set', async () => {
      mockContext.functionName = undefined;

      await expect(step.call(mockContext, 5, 10)).rejects.toThrow(
        'Function name is not set'
      );
    });

    it('should throw error for invalid expected count', async () => {
      await expect(step.call(mockContext, 0, 10)).rejects.toThrow(
        'Expected count must be greater than 0'
      );

      await expect(step.call(mockContext, -1, 10)).rejects.toThrow(
        'Expected count must be greater than 0'
      );
    });

    it('should throw error for invalid minutes (too low)', async () => {
      await expect(step.call(mockContext, 5, 0)).rejects.toThrow(
        'Minutes must be between 1 and 60'
      );
    });

    it('should throw error for invalid minutes (too high)', async () => {
      await expect(step.call(mockContext, 5, 61)).rejects.toThrow(
        'Minutes must be between 1 and 60'
      );
    });

    it('should handle boundary values', async () => {
      mockLambdaService.countLambdaExecutionsInLastMinutes.mockResolvedValue(1);
      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition: () => Promise<boolean>) => {
          await condition();
        }
      );

      // Test minimum values
      await step.call(mockContext, 1, 1);

      expect(
        mockLambdaService.countLambdaExecutionsInLastMinutes
      ).toHaveBeenCalledWith('test-function', 1);

      // Test maximum values
      mockLambdaService.countLambdaExecutionsInLastMinutes.mockResolvedValue(
        100
      );
      await step.call(mockContext, 100, 60);

      expect(
        mockLambdaService.countLambdaExecutionsInLastMinutes
      ).toHaveBeenCalledWith('test-function', 60);
    });

    it('should use 60 second timeout for waitForCondition', async () => {
      mockLambdaService.countLambdaExecutionsInLastMinutes.mockResolvedValue(5);
      mockHealthValidator.waitForCondition.mockResolvedValue(undefined);

      await step.call(mockContext, 5, 10);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalledWith(
        expect.any(Function),
        60000
      );
    });
  });

  describe('Then: the Lambda function logs should not contain errors', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('the Lambda function logs should not contain errors');
      mockContext.functionName = 'test-function';
    });

    it('should verify logs do not contain errors', async () => {
      mockLambdaService.getLambdaLogs.mockResolvedValue([
        'INFO: Processing started',
        'INFO: Processing completed',
      ]);

      await step.call(mockContext);

      expect(mockLambdaService.getLambdaLogs).toHaveBeenCalled();
      const callArgs = mockLambdaService.getLambdaLogs.mock.calls[0];
      expect(callArgs[0]).toBe('test-function');
      expect(callArgs[1]).toBeInstanceOf(Date); // startTime
      expect(callArgs[2]).toBeInstanceOf(Date); // endTime
    });

    it('should throw error when logs contain ERROR', async () => {
      mockLambdaService.getLambdaLogs.mockResolvedValue([
        'INFO: Processing started',
        'ERROR: Something went wrong',
      ]);

      await expect(step.call(mockContext)).rejects.toThrow(
        'Lambda logs contain error indicators'
      );
    });

    it('should throw error when logs contain Exception', async () => {
      mockLambdaService.getLambdaLogs.mockResolvedValue([
        'INFO: Processing started',
        'Exception: Unhandled exception occurred',
      ]);

      await expect(step.call(mockContext)).rejects.toThrow(
        'Lambda logs contain error indicators'
      );
    });

    it('should throw error when logs contain Error:', async () => {
      mockLambdaService.getLambdaLogs.mockResolvedValue([
        'INFO: Processing started',
        'Error: Something failed',
      ]);

      await expect(step.call(mockContext)).rejects.toThrow(
        'Lambda logs contain error indicators'
      );
    });

    it('should throw error when logs contain FAILED', async () => {
      mockLambdaService.getLambdaLogs.mockResolvedValue([
        'INFO: Processing started',
        'FAILED: Operation failed',
      ]);

      await expect(step.call(mockContext)).rejects.toThrow(
        'Lambda logs contain error indicators'
      );
    });

    it('should throw error when function name not set', async () => {
      mockContext.functionName = undefined;

      await expect(step.call(mockContext)).rejects.toThrow(
        'Function name is not set'
      );
    });

    it('should check logs from last 60 seconds', async () => {
      mockLambdaService.getLambdaLogs.mockResolvedValue([]);

      await step.call(mockContext);

      const callArgs = mockLambdaService.getLambdaLogs.mock.calls[0];
      const startTime = callArgs[1] as Date;
      const endTime = callArgs[2] as Date;

      const timeDiff = endTime.getTime() - startTime.getTime();
      expect(timeDiff).toBeGreaterThanOrEqual(59000); // ~60 seconds
      expect(timeDiff).toBeLessThanOrEqual(61000);
    });

    it('should pass when logs are clean', async () => {
      mockLambdaService.getLambdaLogs.mockResolvedValue([
        'START RequestId: abc-123',
        'INFO: Processing file upload',
        'INFO: File processed successfully',
        'END RequestId: abc-123',
      ]);

      await expect(step.call(mockContext)).resolves.not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty payload strings', async () => {
      mockContext.functionName = 'test-function';
      const step = getStep(
        'I invoke the Lambda function with payload {string}'
      );

      // Empty object is valid JSON
      mockLambdaService.invokeFunction.mockResolvedValue({});
      await step.call(mockContext, '{}');

      expect(mockLambdaService.invokeFunction).toHaveBeenCalledWith(
        'test-function',
        {}
      );
    });

    it('should handle payload with special characters', async () => {
      mockContext.functionName = 'test-function';
      const step = getStep(
        'I invoke the Lambda function with payload {string}'
      );

      const specialPayload = '{"message":"Hello\\nWorld","unicode":"emoji🎉"}';
      mockLambdaService.invokeFunction.mockResolvedValue({});

      await step.call(mockContext, specialPayload);

      expect(mockLambdaService.invokeFunction).toHaveBeenCalled();
    });

    it('should handle concurrent operations with S3 errors', async () => {
      mockContext.bucketName = 'test-bucket';
      const step = getStep('I trigger multiple concurrent operations');

      // Simulate upload failing on second call
      let callCount = 0;
      mockS3Service.uploadFile.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Upload failed');
        }
        return undefined;
      });

      await expect(step.call(mockContext)).rejects.toThrow('Upload failed');
    });
  });

  describe('Integration with Services', () => {
    it('should use container services correctly', async () => {
      mockContext.functionName = 'test-function';
      const invokeStep = getStep(
        'I invoke the Lambda function with payload {string}'
      );

      mockLambdaService.invokeFunction.mockResolvedValue({});

      await invokeStep.call(mockContext, '{"test":"data"}');

      // Verify it used the container's lambdaService
      expect(mockLambdaService.invokeFunction).toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      mockContext.functionName = 'test-function';
      const step = getStep('I have a Lambda function named {string}');

      mockLambdaService.findFunction.mockRejectedValue(
        new Error('AWS Service Error')
      );

      await expect(step.call(mockContext, 'test-function')).rejects.toThrow(
        'AWS Service Error'
      );
    });
  });
});
