import {
  DescribeExecutionCommand,
  DescribeStateMachineCommand,
  ExecutionStatus,
  GetExecutionHistoryCommand,
  HistoryEventType,
  ListExecutionsCommand,
  ListStateMachinesCommand,
  SFNClient,
  StartExecutionCommand,
  StateMachineStatus,
  StateMachineType,
} from '@aws-sdk/client-sfn';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import {
  StepFunctionError,
  StepFunctionService,
} from '../../../framework/services/StepFunctionService';

const sfnMock = mockClient(SFNClient);

describe('StepFunctionService', () => {
  let service: StepFunctionService;
  let sfnClient: SFNClient;

  beforeEach(() => {
    sfnMock.reset();
    sfnClient = new SFNClient({ region: 'us-east-1' });
    service = new StepFunctionService(sfnClient);
  });

  describe('findStateMachine', () => {
    it('should find state machine by name', async () => {
      const mockStateMachineArn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';

      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: 'test-machine',
            stateMachineArn: mockStateMachineArn,
            type: StateMachineType.STANDARD,
            creationDate: new Date(),
          },
        ],
      });

      const result = await service.findStateMachine('test-machine');

      expect(result).toBe(mockStateMachineArn);
    });

    it('should throw error when state machine not found', async () => {
      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [],
      });

      await expect(
        service.findStateMachine('non-existent-machine')
      ).rejects.toThrow(StepFunctionError);
    });

    it('should handle AWS SDK errors', async () => {
      sfnMock.on(ListStateMachinesCommand).rejects(new Error('AWS error'));

      await expect(service.findStateMachine('test-machine')).rejects.toThrow(
        StepFunctionError
      );
    });

    it('should find state machine from multiple results', async () => {
      const targetArn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:target-machine';

      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: 'other-machine',
            stateMachineArn:
              'arn:aws:states:us-east-1:123456789012:stateMachine:other-machine',
            type: StateMachineType.STANDARD,
            creationDate: new Date(),
          },
          {
            name: 'target-machine',
            stateMachineArn: targetArn,
            type: StateMachineType.STANDARD,
            creationDate: new Date(),
          },
        ],
      });

      const result = await service.findStateMachine('target-machine');

      expect(result).toBe(targetArn);
    });
  });

  describe('startExecution', () => {
    const mockStateMachineArn =
      'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';
    const mockExecutionArn =
      'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123';

    beforeEach(() => {
      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: 'test-machine',
            stateMachineArn: mockStateMachineArn,
            type: StateMachineType.STANDARD,
            creationDate: new Date(),
          },
        ],
      });
    });

    it('should start execution with valid input', async () => {
      sfnMock.on(StartExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        startDate: new Date(),
      });

      const result = await service.startExecution('test-machine', {
        test: 'data',
      });

      expect(result).toBe(mockExecutionArn);
    });

    it('should handle complex input objects', async () => {
      sfnMock.on(StartExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        startDate: new Date(),
      });

      const complexInput = {
        nested: { data: 'value' },
        array: [1, 2, 3],
        string: 'test',
      };

      const result = await service.startExecution('test-machine', complexInput);

      expect(result).toBe(mockExecutionArn);
    });

    it('should handle AWS SDK errors during execution start', async () => {
      sfnMock.on(StartExecutionCommand).rejects(new Error('Execution failed'));

      await expect(
        service.startExecution('test-machine', { test: 'data' })
      ).rejects.toThrow(StepFunctionError);
    });

    it('should throw error when state machine not found', async () => {
      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [],
      });

      await expect(
        service.startExecution('non-existent', { test: 'data' })
      ).rejects.toThrow(StepFunctionError);
    });
  });

  describe('listExecutions', () => {
    const mockStateMachineArn =
      'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';

    beforeEach(() => {
      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: 'test-machine',
            stateMachineArn: mockStateMachineArn,
            type: StateMachineType.STANDARD,
            creationDate: new Date(),
          },
        ],
      });
    });

    it('should list executions for state machine', async () => {
      const mockExecutions = [
        {
          executionArn:
            'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-1',
          stateMachineArn: mockStateMachineArn,
          name: 'exec-1',
          status: ExecutionStatus.SUCCEEDED,
          startDate: new Date(),
        },
        {
          executionArn:
            'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-2',
          stateMachineArn: mockStateMachineArn,
          name: 'exec-2',
          status: ExecutionStatus.RUNNING,
          startDate: new Date(),
        },
      ];

      sfnMock.on(ListExecutionsCommand).resolves({
        executions: mockExecutions,
      });

      const result = await service.listExecutions('test-machine');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('executionArn');
      expect(result[0]).toHaveProperty('status');
    });

    it('should return empty array when no executions found', async () => {
      sfnMock.on(ListExecutionsCommand).resolves({
        executions: [],
      });

      const result = await service.listExecutions('test-machine');

      expect(result).toEqual([]);
    });

    it('should handle AWS SDK errors', async () => {
      sfnMock.on(ListExecutionsCommand).rejects(new Error('AWS error'));

      await expect(service.listExecutions('test-machine')).rejects.toThrow(
        StepFunctionError
      );
    });
  });

  describe('getExecutionStatus', () => {
    const mockExecutionArn =
      'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123';

    it('should get execution status - SUCCEEDED', async () => {
      sfnMock.on(DescribeExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        status: ExecutionStatus.SUCCEEDED,
        startDate: new Date(),
      });

      const result = await service.getExecutionStatus(mockExecutionArn);

      expect(result).toBe('SUCCEEDED');
    });

    it('should get execution status - RUNNING', async () => {
      sfnMock.on(DescribeExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        status: ExecutionStatus.RUNNING,
        startDate: new Date(),
      });

      const result = await service.getExecutionStatus(mockExecutionArn);

      expect(result).toBe('RUNNING');
    });

    it('should get execution status - FAILED', async () => {
      sfnMock.on(DescribeExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        status: ExecutionStatus.FAILED,
        startDate: new Date(),
        stopDate: new Date(),
      });

      const result = await service.getExecutionStatus(mockExecutionArn);

      expect(result).toBe('FAILED');
    });

    it('should get execution status - TIMED_OUT', async () => {
      sfnMock.on(DescribeExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        status: ExecutionStatus.TIMED_OUT,
        startDate: new Date(),
        stopDate: new Date(),
      });

      const result = await service.getExecutionStatus(mockExecutionArn);

      expect(result).toBe('TIMED_OUT');
    });

    it('should throw error when execution not found', async () => {
      sfnMock
        .on(DescribeExecutionCommand)
        .rejects(new Error('ExecutionDoesNotExist'));

      await expect(
        service.getExecutionStatus(mockExecutionArn)
      ).rejects.toThrow(StepFunctionError);
    });
  });

  describe('getExecutionDetails', () => {
    const mockExecutionArn =
      'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123';
    const mockStateMachineArn =
      'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';

    it('should get execution details', async () => {
      const startDate = new Date('2024-01-01T10:00:00Z');
      const stopDate = new Date('2024-01-01T10:05:00Z');

      sfnMock.on(DescribeExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        stateMachineArn: mockStateMachineArn,
        name: 'exec-123',
        status: ExecutionStatus.SUCCEEDED,
        startDate,
        stopDate,
        input: '{"test":"data"}',
        output: '{"result":"success"}',
      });

      const result = await service.getExecutionDetails(mockExecutionArn);

      expect(result.executionArn).toBe(mockExecutionArn);
      expect(result.stateMachineArn).toBe(mockStateMachineArn);
      expect(result.status).toBe('SUCCEEDED');
      expect(result.startDate).toEqual(startDate);
      expect(result.stopDate).toEqual(stopDate);
      expect(result.input).toBe('{"test":"data"}');
      expect(result.output).toBe('{"result":"success"}');
    });

    it('should handle execution without stop date (running)', async () => {
      const startDate = new Date('2024-01-01T10:00:00Z');

      sfnMock.on(DescribeExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        stateMachineArn: mockStateMachineArn,
        name: 'exec-123',
        status: ExecutionStatus.RUNNING,
        startDate,
      });

      const result = await service.getExecutionDetails(mockExecutionArn);

      expect(result.status).toBe('RUNNING');
      expect(result.stopDate).toBeUndefined();
    });

    it('should throw error on AWS SDK failure', async () => {
      sfnMock.on(DescribeExecutionCommand).rejects(new Error('AWS error'));

      await expect(
        service.getExecutionDetails(mockExecutionArn)
      ).rejects.toThrow(StepFunctionError);
    });
  });

  describe('checkStateMachineExecution', () => {
    const mockStateMachineArn =
      'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';

    beforeEach(() => {
      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: 'test-machine',
            stateMachineArn: mockStateMachineArn,
            type: StateMachineType.STANDARD,
            creationDate: new Date(),
          },
        ],
      });
    });

    it('should return true when recent executions exist', async () => {
      sfnMock.on(ListExecutionsCommand).resolves({
        executions: [
          {
            executionArn:
              'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-1',
            stateMachineArn: mockStateMachineArn,
            name: 'exec-1',
            status: ExecutionStatus.SUCCEEDED,
            startDate: new Date(),
          },
        ],
      });

      const result = await service.checkStateMachineExecution('test-machine');

      expect(result).toBe(true);
    });

    it('should return false when no recent executions exist', async () => {
      sfnMock.on(ListExecutionsCommand).resolves({
        executions: [],
      });

      const result = await service.checkStateMachineExecution('test-machine');

      expect(result).toBe(false);
    });

    it('should throw error when state machine not found', async () => {
      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [],
      });

      await expect(
        service.checkStateMachineExecution('non-existent')
      ).rejects.toThrow(StepFunctionError);
    });
  });

  describe('getStepFunctionExecutionHistory', () => {
    const mockExecutionArn =
      'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123';

    it('should get execution history', async () => {
      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            timestamp: new Date(),
            type: HistoryEventType.ExecutionStarted,
            id: 1,
          },
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateEntered,
            id: 2,
            stateEnteredEventDetails: {
              name: 'ProcessData',
            },
          },
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateExited,
            id: 3,
            stateExitedEventDetails: {
              name: 'ProcessData',
              output: '{"status":"success"}',
            },
          },
          {
            timestamp: new Date(),
            type: HistoryEventType.ExecutionSucceeded,
            id: 4,
          },
        ],
      });

      const result =
        await service.getStepFunctionExecutionHistory(mockExecutionArn);

      expect(result).toHaveLength(4);
      expect(result[0].type).toBe('ExecutionStarted');
      expect(result[3].type).toBe('ExecutionSucceeded');
    });

    it('should handle empty history', async () => {
      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [],
      });

      const result =
        await service.getStepFunctionExecutionHistory(mockExecutionArn);

      expect(result).toEqual([]);
    });

    it('should throw error on AWS SDK failure', async () => {
      sfnMock.on(GetExecutionHistoryCommand).rejects(new Error('AWS error'));

      await expect(
        service.getStepFunctionExecutionHistory(mockExecutionArn)
      ).rejects.toThrow(StepFunctionError);
    });
  });

  describe('verifyStepFunctionExecutionSuccess', () => {
    const mockExecutionArn =
      'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123';

    it('should verify successful execution without expected states', async () => {
      sfnMock.on(DescribeExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        status: ExecutionStatus.SUCCEEDED,
        startDate: new Date(),
        stopDate: new Date(),
      });

      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [],
      });

      const result =
        await service.verifyStepFunctionExecutionSuccess(mockExecutionArn);

      expect(result.success).toBe(true);
    });

    it('should return false for failed execution', async () => {
      sfnMock.on(DescribeExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        status: ExecutionStatus.FAILED,
        startDate: new Date(),
        stopDate: new Date(),
      });

      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [],
      });

      const result =
        await service.verifyStepFunctionExecutionSuccess(mockExecutionArn);

      expect(result.success).toBe(false);
    });

    it('should verify execution with expected states', async () => {
      sfnMock.on(DescribeExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        status: ExecutionStatus.SUCCEEDED,
        startDate: new Date(),
        stopDate: new Date(),
      });

      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateEntered,
            id: 2,
            stateEnteredEventDetails: {
              name: 'State1',
            },
          },
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateEntered,
            id: 4,
            stateEnteredEventDetails: {
              name: 'State2',
            },
          },
        ],
      });

      const result = await service.verifyStepFunctionExecutionSuccess(
        mockExecutionArn,
        ['State1', 'State2']
      );

      expect(result.success).toBe(true);
      expect(result.completedStates).toContain('State1');
      expect(result.completedStates).toContain('State2');
    });
  });

  describe('checkStepFunctionPerformance', () => {
    const mockExecutionArn =
      'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123';

    it('should calculate performance metrics', async () => {
      const startDate = new Date('2024-01-01T10:00:00Z');
      const stopDate = new Date('2024-01-01T10:05:00Z'); // 5 minutes

      sfnMock.on(DescribeExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        status: ExecutionStatus.SUCCEEDED,
        startDate,
        stopDate,
      });

      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            timestamp: startDate,
            type: HistoryEventType.ExecutionStarted,
            id: 1,
          },
          {
            timestamp: new Date('2024-01-01T10:02:00Z'),
            type: HistoryEventType.TaskStateEntered,
            id: 2,
            stateEnteredEventDetails: {
              name: 'FastState',
            },
          },
          {
            timestamp: new Date('2024-01-01T10:02:30Z'),
            type: HistoryEventType.TaskStateExited,
            id: 3,
            stateExitedEventDetails: {
              name: 'FastState',
            },
          },
          {
            timestamp: new Date('2024-01-01T10:03:00Z'),
            type: HistoryEventType.TaskStateEntered,
            id: 4,
            stateEnteredEventDetails: {
              name: 'SlowState',
            },
          },
          {
            timestamp: new Date('2024-01-01T10:04:30Z'),
            type: HistoryEventType.TaskStateExited,
            id: 5,
            stateExitedEventDetails: {
              name: 'SlowState',
            },
          },
          {
            timestamp: stopDate,
            type: HistoryEventType.ExecutionSucceeded,
            id: 6,
          },
        ],
      });

      const result =
        await service.checkStepFunctionPerformance(mockExecutionArn);

      expect(result.totalExecutionTime).toBe(300000); // 5 minutes in ms
      expect(result.averageStateExecutionTime).toBeGreaterThan(0);
      expect(result.slowestState).toBe('SlowState');
      expect(result.fastestState).toBe('FastState');
    });

    it('should handle execution without stop date', async () => {
      sfnMock.on(DescribeExecutionCommand).resolves({
        executionArn: mockExecutionArn,
        status: ExecutionStatus.RUNNING,
        startDate: new Date(),
      });

      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [],
      });

      const result =
        await service.checkStepFunctionPerformance(mockExecutionArn);

      expect(result.totalExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('verifyStepFunctionDefinition', () => {
    const mockStateMachineArn =
      'arn:aws:states:us-east-1:123456789012:stateMachine:test-machine';

    it('should verify valid state machine definition', async () => {
      const validDefinition = {
        StartAt: 'ProcessData',
        States: {
          ProcessData: {
            Type: 'Task',
            Resource: 'arn:aws:lambda:us-east-1:123456789012:function:process',
            End: true,
          },
        },
      };

      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: 'test-machine',
            stateMachineArn: mockStateMachineArn,
            type: StateMachineType.STANDARD,
            creationDate: new Date(),
          },
        ],
      });

      sfnMock.on(DescribeStateMachineCommand).resolves({
        stateMachineArn: mockStateMachineArn,
        name: 'test-machine',
        status: StateMachineStatus.ACTIVE,
        definition: JSON.stringify(validDefinition),
        creationDate: new Date(),
        type: StateMachineType.STANDARD,
        roleArn: 'arn:aws:iam::123456789012:role/test-role',
      });

      const result = await service.verifyStepFunctionDefinition('test-machine');

      expect(result.isValid).toBe(true);
      expect(result.hasStartState).toBe(true);
      expect(result.hasEndStates).toBe(true);
      expect(result.stateCount).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing start state', async () => {
      const invalidDefinition = {
        States: {
          ProcessData: {
            Type: 'Task',
            Resource: 'arn:aws:lambda:us-east-1:123456789012:function:process',
            End: true,
          },
        },
      };

      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: 'test-machine',
            stateMachineArn: mockStateMachineArn,
            type: StateMachineType.STANDARD,
            creationDate: new Date(),
          },
        ],
      });

      sfnMock.on(DescribeStateMachineCommand).resolves({
        stateMachineArn: mockStateMachineArn,
        name: 'test-machine',
        status: StateMachineStatus.ACTIVE,
        definition: JSON.stringify(invalidDefinition),
        creationDate: new Date(),
        type: StateMachineType.STANDARD,
        roleArn: 'arn:aws:iam::123456789012:role/test-role',
      });

      const result = await service.verifyStepFunctionDefinition('test-machine');

      expect(result.isValid).toBe(false);
      expect(result.hasStartState).toBe(false);
      expect(result.errors).toContain(
        'State machine definition missing StartAt property'
      );
    });

    it('should detect missing end states', async () => {
      const invalidDefinition = {
        StartAt: 'ProcessData',
        States: {
          ProcessData: {
            Type: 'Task',
            Resource: 'arn:aws:lambda:us-east-1:123456789012:function:process',
            Next: 'NonExistentState',
          },
        },
      };

      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: 'test-machine',
            stateMachineArn: mockStateMachineArn,
            type: StateMachineType.STANDARD,
            creationDate: new Date(),
          },
        ],
      });

      sfnMock.on(DescribeStateMachineCommand).resolves({
        stateMachineArn: mockStateMachineArn,
        name: 'test-machine',
        status: StateMachineStatus.ACTIVE,
        definition: JSON.stringify(invalidDefinition),
        creationDate: new Date(),
        type: StateMachineType.STANDARD,
        roleArn: 'arn:aws:iam::123456789012:role/test-role',
      });

      const result = await service.verifyStepFunctionDefinition('test-machine');

      // Note: isValid is based on errors array, not hasEndStates
      expect(result.isValid).toBe(true); // No errors in errors array
      expect(result.hasEndStates).toBe(false); // But hasEndStates is false
      expect(result.errors).toEqual([]); // No validation errors added
    });

    it('should handle multiple states with Succeed type', async () => {
      const validDefinition = {
        StartAt: 'ProcessData',
        States: {
          ProcessData: {
            Type: 'Task',
            Resource: 'arn:aws:lambda:us-east-1:123456789012:function:process',
            Next: 'Success',
          },
          Success: {
            Type: 'Succeed',
          },
        },
      };

      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: 'test-machine',
            stateMachineArn: mockStateMachineArn,
            type: StateMachineType.STANDARD,
            creationDate: new Date(),
          },
        ],
      });

      sfnMock.on(DescribeStateMachineCommand).resolves({
        stateMachineArn: mockStateMachineArn,
        name: 'test-machine',
        status: StateMachineStatus.ACTIVE,
        definition: JSON.stringify(validDefinition),
        creationDate: new Date(),
        type: StateMachineType.STANDARD,
        roleArn: 'arn:aws:iam::123456789012:role/test-role',
      });

      const result = await service.verifyStepFunctionDefinition('test-machine');

      expect(result.isValid).toBe(true);
      expect(result.hasEndStates).toBe(true);
      expect(result.stateCount).toBe(2);
    });
  });

  describe('getStepFunctionStateOutput', () => {
    const mockExecutionArn =
      'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123';

    it('should get state outputs from execution history', async () => {
      const outputData = { status: 'success', count: 5 };

      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateEntered,
            id: 2,
            stateEnteredEventDetails: {
              name: 'ProcessData',
              input: '{"input":"data"}',
            },
          },
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateExited,
            id: 3,
            stateExitedEventDetails: {
              name: 'ProcessData',
              output: JSON.stringify(outputData),
            },
          },
        ],
      });

      const result = await service.getStepFunctionStateOutput(
        mockExecutionArn,
        'ProcessData'
      );

      expect(result).toHaveLength(1);
      expect(result[0].stateName).toBe('ProcessData');
      expect(result[0].output).toEqual(outputData);
    });

    it('should return empty array when state not found', async () => {
      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            timestamp: new Date(),
            type: HistoryEventType.ExecutionStarted,
            id: 1,
          },
        ],
      });

      const result = await service.getStepFunctionStateOutput(
        mockExecutionArn,
        'NonExistentState'
      );

      expect(result).toEqual([]);
    });

    it('should get all state outputs when no state name specified', async () => {
      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateEntered,
            id: 1,
            stateEnteredEventDetails: {
              name: 'State1',
              input: '{}',
            },
          },
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateEntered,
            id: 2,
            stateEnteredEventDetails: {
              name: 'State2',
              input: '{}',
            },
          },
        ],
      });

      const result = await service.getStepFunctionStateOutput(mockExecutionArn);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('verifyStepFunctionStateOutput', () => {
    const mockExecutionArn =
      'arn:aws:states:us-east-1:123456789012:execution:test-machine:exec-123';

    beforeEach(() => {
      // Mock getStepFunctionStateOutput since verifyStepFunctionStateOutput uses it
      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [],
      });
    });

    it('should verify matching state output', async () => {
      const outputData = { status: 'success', count: 5 };

      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateEntered,
            id: 2,
            stateEnteredEventDetails: {
              name: 'ProcessData',
              input: '{}',
            },
          },
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateExited,
            id: 3,
            stateExitedEventDetails: {
              name: 'ProcessData',
              output: JSON.stringify(outputData),
            },
          },
        ],
      });

      const result = await service.verifyStepFunctionStateOutput(
        mockExecutionArn,
        'ProcessData',
        outputData
      );

      expect(result.matches).toBe(true);
      expect(result.missingFields).toEqual([]);
      expect(result.extraFields).toEqual([]);
    });

    it('should detect missing fields', async () => {
      const outputData = { status: 'success' };

      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateEntered,
            id: 2,
            stateEnteredEventDetails: {
              name: 'ProcessData',
              input: '{}',
            },
          },
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateExited,
            id: 3,
            stateExitedEventDetails: {
              name: 'ProcessData',
              output: JSON.stringify(outputData),
            },
          },
        ],
      });

      const result = await service.verifyStepFunctionStateOutput(
        mockExecutionArn,
        'ProcessData',
        { status: 'success', count: 5 }
      );

      expect(result.matches).toBe(false);
      expect(result.missingFields).toContain('count');
    });

    it('should detect extra fields (but still match)', async () => {
      const outputData = { status: 'success', count: 5, extra: 'field' };

      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateEntered,
            id: 2,
            stateEnteredEventDetails: {
              name: 'ProcessData',
              input: '{}',
            },
          },
          {
            timestamp: new Date(),
            type: HistoryEventType.TaskStateExited,
            id: 3,
            stateExitedEventDetails: {
              name: 'ProcessData',
              output: JSON.stringify(outputData),
            },
          },
        ],
      });

      const result = await service.verifyStepFunctionStateOutput(
        mockExecutionArn,
        'ProcessData',
        { status: 'success', count: 5 }
      );

      // Note: matches is based only on missingFields, not extraFields
      expect(result.matches).toBe(true);
      expect(result.extraFields).toContain('extra');
      expect(result.missingFields).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should create StepFunctionError with proper properties', () => {
      const originalError = new Error('Original AWS error');
      const sfError = new StepFunctionError(
        'Operation failed',
        'testOperation',
        originalError
      );

      expect(sfError.message).toBe('Operation failed');
      expect(sfError.operation).toBe('testOperation');
      expect(sfError.originalError).toBe(originalError);
      expect(sfError.name).toBe('StepFunctionError');
    });
  });
});
