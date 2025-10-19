import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IServiceContainer } from '../../../framework/container/ServiceContainer';
import type { HealthValidator } from '../../../framework/services/HealthValidator';
import type { StepFunctionService } from '../../../framework/services/StepFunctionService';
import type { FrameworkConfig, StepContext } from '../../../framework/types';

// Mock Cucumber before importing StepFunctionSteps
const mockGiven = jest.fn();
const mockWhen = jest.fn();
const mockThen = jest.fn();

jest.mock('@cucumber/cucumber', () => ({
  Given: mockGiven,
  When: mockWhen,
  Then: mockThen,
}));

import { StepFunctionSteps } from '../../../framework/steps/StepFunctionSteps';

type StepCallback = (
  this: StepContext,
  ...args: (string | number)[]
) => Promise<void> | void;

describe('StepFunctionSteps', () => {
  let stepFunctionSteps: StepFunctionSteps;
  let mockContainer: IServiceContainer;
  let mockContext: StepContext;
  let registeredSteps: Map<string, StepCallback>;

  // Properly typed mock services
  const mockStepFunctionService = {
    findStateMachine: jest.fn(),
    startExecution: jest.fn(),
    getExecutionStatus: jest.fn(),
  } as unknown as jest.Mocked<StepFunctionService>;

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
    const mockGetConfig = jest.fn<() => FrameworkConfig>();
    mockGetConfig.mockReturnValue({ enableLogging: false } as FrameworkConfig);

    const mockIsDisposed = jest.fn<() => boolean>();
    mockIsDisposed.mockReturnValue(false);

    const mockDispose = jest.fn<() => Promise<void>>();

    mockContainer = {
      stepFunctionService: mockStepFunctionService,
      healthValidator: mockHealthValidator,
      getConfig: mockGetConfig,
      isDisposed: mockIsDisposed,
      dispose: mockDispose,
    } as unknown as IServiceContainer;

    // Create fresh context for each test
    mockContext = {};

    // Create and register steps
    stepFunctionSteps = new StepFunctionSteps(mockContainer);
    stepFunctionSteps.registerSteps();
  });

  describe('Step Registration', () => {
    it('should register all Step Function step definitions', () => {
      expect(mockGiven).toHaveBeenCalled();
      expect(mockWhen).toHaveBeenCalled();
      expect(mockThen).toHaveBeenCalled();
      expect(registeredSteps.size).toBeGreaterThan(0);
    });

    it('should register Given step for Step Function', () => {
      expect(mockGiven).toHaveBeenCalledWith(
        'I have a Step Function named {string}',
        expect.any(Function)
      );
    });

    it('should register When step for starting execution', () => {
      expect(mockWhen).toHaveBeenCalledWith(
        'I start the Step Function execution with input {string}',
        expect.any(Function)
      );
    });

    it('should register Then step for execution success', () => {
      expect(mockThen).toHaveBeenCalledWith(
        'the Step Function execution should succeed',
        expect.any(Function)
      );
    });

    it('should register Then step for execution completion', () => {
      expect(mockThen).toHaveBeenCalledWith(
        'the Step Function should be executed',
        expect.any(Function)
      );
    });
  });

  describe('Given: I have a Step Function named {string}', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('I have a Step Function named {string}');
    });

    it('should set state machine name and ARN in context', async () => {
      const arn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';
      mockStepFunctionService.findStateMachine.mockResolvedValue(arn);

      await step.call(mockContext, 'test-machine');

      expect(mockContext.stateMachineName).toBe('test-machine');
      expect(mockContext.stateMachineArn).toBe(arn);
      expect(mockStepFunctionService.findStateMachine).toHaveBeenCalledWith(
        'test-machine'
      );
    });

    it('should call stepFunctionService.findStateMachine', async () => {
      const arn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:my-machine';
      mockStepFunctionService.findStateMachine.mockResolvedValue(arn);

      await step.call(mockContext, 'my-machine');

      expect(mockStepFunctionService.findStateMachine).toHaveBeenCalledWith(
        'my-machine'
      );
      expect(mockStepFunctionService.findStateMachine).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from stepFunctionService.findStateMachine', async () => {
      mockStepFunctionService.findStateMachine.mockRejectedValue(
        new Error('State machine not found')
      );

      await expect(step.call(mockContext, 'missing-machine')).rejects.toThrow(
        'State machine not found'
      );
    });
  });

  describe('When: I start the Step Function execution with input {string}', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('I start the Step Function execution with input {string}');
      mockContext.stateMachineName = 'test-machine';
    });

    it('should start execution with valid JSON input', async () => {
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123';
      mockStepFunctionService.startExecution.mockResolvedValue(executionArn);

      await step.call(mockContext, '{"key":"value"}');

      expect(mockStepFunctionService.startExecution).toHaveBeenCalledWith(
        'test-machine',
        { key: 'value' }
      );
      expect(mockContext.executionArn).toBe(executionArn);
    });

    it('should parse complex JSON input', async () => {
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-456';
      mockStepFunctionService.startExecution.mockResolvedValue(executionArn);
      const complexInput = '{"nested":{"data":"value"},"array":[1,2,3]}';

      await step.call(mockContext, complexInput);

      expect(mockStepFunctionService.startExecution).toHaveBeenCalledWith(
        'test-machine',
        { nested: { data: 'value' }, array: [1, 2, 3] }
      );
    });

    it('should throw error if state machine name is not set', async () => {
      delete mockContext.stateMachineName;

      await expect(step.call(mockContext, '{"test":"data"}')).rejects.toThrow(
        'State machine name is not set. Make sure to create a Step Function first.'
      );
      expect(mockStepFunctionService.startExecution).not.toHaveBeenCalled();
    });

    it('should throw error for invalid JSON input', async () => {
      await expect(step.call(mockContext, 'invalid json')).rejects.toThrow(
        'Invalid JSON input:'
      );
      expect(mockStepFunctionService.startExecution).not.toHaveBeenCalled();
    });

    it('should throw error for incomplete JSON', async () => {
      await expect(step.call(mockContext, '{"key":"value"')).rejects.toThrow(
        'Invalid JSON input:'
      );
    });

    it('should propagate execution errors', async () => {
      mockStepFunctionService.startExecution.mockRejectedValue(
        new Error('Execution failed')
      );

      await expect(step.call(mockContext, '{"test":"data"}')).rejects.toThrow(
        'Execution failed'
      );
    });
  });

  describe('Then: the Step Function execution should succeed', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('the Step Function execution should succeed');
      mockContext.executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123';
    });

    it('should verify execution succeeds', async () => {
      mockStepFunctionService.getExecutionStatus.mockResolvedValue('SUCCEEDED');
      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition) => {
          await condition();
        }
      );

      await step.call(mockContext);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalled();
      expect(mockStepFunctionService.getExecutionStatus).toHaveBeenCalledWith(
        'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123'
      );
    });

    it('should wait for execution to succeed', async () => {
      let callCount = 0;
      mockStepFunctionService.getExecutionStatus.mockImplementation(
        async () => {
          callCount++;
          return callCount < 3 ? 'RUNNING' : 'SUCCEEDED';
        }
      );

      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition) => {
          while (!(await condition())) {
            // Keep checking until condition is true
          }
        }
      );

      await step.call(mockContext);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalled();
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it('should throw error if execution ARN is not set', async () => {
      delete mockContext.executionArn;

      await expect(step.call(mockContext)).rejects.toThrow(
        'Execution ARN is not set. Make sure to start an execution first.'
      );
      expect(mockHealthValidator.waitForCondition).not.toHaveBeenCalled();
    });

    it('should use health validator for polling', async () => {
      mockStepFunctionService.getExecutionStatus.mockResolvedValue('SUCCEEDED');
      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition) => {
          await condition();
        }
      );

      await step.call(mockContext);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('Then: the Step Function should be executed', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('the Step Function should be executed');
      mockContext.executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123';
    });

    it('should verify execution completes with SUCCEEDED status', async () => {
      mockStepFunctionService.getExecutionStatus.mockResolvedValue('SUCCEEDED');
      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition) => {
          await condition();
        }
      );

      await step.call(mockContext);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalled();
      expect(mockStepFunctionService.getExecutionStatus).toHaveBeenCalledWith(
        'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123'
      );
    });

    it('should verify execution completes with FAILED status', async () => {
      mockStepFunctionService.getExecutionStatus.mockResolvedValue('FAILED');
      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition) => {
          await condition();
        }
      );

      await step.call(mockContext);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalled();
    });

    it('should verify execution completes with TIMED_OUT status', async () => {
      mockStepFunctionService.getExecutionStatus.mockResolvedValue('TIMED_OUT');
      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition) => {
          await condition();
        }
      );

      await step.call(mockContext);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalled();
    });

    it('should verify execution completes with ABORTED status', async () => {
      mockStepFunctionService.getExecutionStatus.mockResolvedValue('ABORTED');
      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition) => {
          await condition();
        }
      );

      await step.call(mockContext);

      expect(mockHealthValidator.waitForCondition).toHaveBeenCalled();
    });

    it('should wait for execution to complete from RUNNING status', async () => {
      let callCount = 0;
      mockStepFunctionService.getExecutionStatus.mockImplementation(
        async () => {
          callCount++;
          return callCount < 3 ? 'RUNNING' : 'SUCCEEDED';
        }
      );

      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition) => {
          while (!(await condition())) {
            // Keep checking until condition is true
          }
        }
      );

      await step.call(mockContext);

      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it('should throw error if execution ARN is not set', async () => {
      delete mockContext.executionArn;

      await expect(step.call(mockContext)).rejects.toThrow(
        'Execution ARN is not set. Make sure to start an execution first.'
      );
      expect(mockHealthValidator.waitForCondition).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty state machine name gracefully', async () => {
      const step = getStep('I have a Step Function named {string}');
      mockStepFunctionService.findStateMachine.mockResolvedValue(
        'arn:aws:states:us-east-1:123456789012:stateMachine:'
      );

      await step.call(mockContext, '');

      expect(mockContext.stateMachineName).toBe('');
      expect(mockStepFunctionService.findStateMachine).toHaveBeenCalledWith('');
    });

    it('should handle empty JSON object as input', async () => {
      const step = getStep(
        'I start the Step Function execution with input {string}'
      );
      mockContext.stateMachineName = 'test-machine';
      mockStepFunctionService.startExecution.mockResolvedValue(
        'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123'
      );

      await step.call(mockContext, '{}');

      expect(mockStepFunctionService.startExecution).toHaveBeenCalledWith(
        'test-machine',
        {}
      );
    });

    it('should use container services correctly', async () => {
      const step = getStep('I have a Step Function named {string}');
      mockStepFunctionService.findStateMachine.mockResolvedValue(
        'arn:aws:states:us-east-1:123456789012:stateMachine:test'
      );

      await step.call(mockContext, 'test');

      expect(mockStepFunctionService.findStateMachine).toHaveBeenCalled();
    });
  });

  describe('Integration with Services', () => {
    it('should properly chain state machine creation and execution', async () => {
      const createStep = getStep('I have a Step Function named {string}');
      const executeStep = getStep(
        'I start the Step Function execution with input {string}'
      );

      const machineArn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:integration-machine';
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:integration-machine:exec-123';

      mockStepFunctionService.findStateMachine.mockResolvedValue(machineArn);
      mockStepFunctionService.startExecution.mockResolvedValue(executionArn);

      // Create state machine
      await createStep.call(mockContext, 'integration-machine');
      expect(mockContext.stateMachineName).toBe('integration-machine');
      expect(mockContext.stateMachineArn).toBe(machineArn);

      // Start execution
      await executeStep.call(mockContext, '{"test":"data"}');
      expect(mockContext.executionArn).toBe(executionArn);
      expect(mockStepFunctionService.startExecution).toHaveBeenCalledWith(
        'integration-machine',
        { test: 'data' }
      );
    });

    it('should properly chain state machine creation, execution, and verification', async () => {
      const createStep = getStep('I have a Step Function named {string}');
      const executeStep = getStep(
        'I start the Step Function execution with input {string}'
      );
      const verifyStep = getStep('the Step Function execution should succeed');

      const machineArn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:full-test';
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:full-test:exec-456';

      mockStepFunctionService.findStateMachine.mockResolvedValue(machineArn);
      mockStepFunctionService.startExecution.mockResolvedValue(executionArn);
      mockStepFunctionService.getExecutionStatus.mockResolvedValue('SUCCEEDED');
      mockHealthValidator.waitForCondition.mockImplementation(
        async (condition) => {
          await condition();
        }
      );

      // Create state machine
      await createStep.call(mockContext, 'full-test');

      // Start execution
      await executeStep.call(mockContext, '{"input":"value"}');

      // Verify execution
      await verifyStep.call(mockContext);

      expect(mockStepFunctionService.findStateMachine).toHaveBeenCalledWith(
        'full-test'
      );
      expect(mockStepFunctionService.startExecution).toHaveBeenCalledWith(
        'full-test',
        { input: 'value' }
      );
      expect(mockStepFunctionService.getExecutionStatus).toHaveBeenCalledWith(
        executionArn
      );
    });

    it('should propagate service errors correctly', async () => {
      const step = getStep('I have a Step Function named {string}');
      mockStepFunctionService.findStateMachine.mockRejectedValue(
        new Error('AWS Service Error')
      );

      await expect(step.call(mockContext, 'error-machine')).rejects.toThrow(
        'AWS Service Error'
      );
    });
  });
});
