import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  GetFunctionCommand,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { LambdaService } from '../../../framework/services/LambdaService';

const lambdaMock = mockClient(LambdaClient);
const cwLogsMock = mockClient(CloudWatchLogsClient);

describe('LambdaService', () => {
  let service: LambdaService;
  let lambdaClient: LambdaClient;
  let cloudWatchLogsClient: CloudWatchLogsClient;

  beforeEach(() => {
    lambdaMock.reset();
    cwLogsMock.reset();
    lambdaClient = new LambdaClient({ region: 'us-east-1' });
    cloudWatchLogsClient = new CloudWatchLogsClient({ region: 'us-east-1' });
    service = new LambdaService(lambdaClient, cloudWatchLogsClient);
  });

  describe('findFunction', () => {
    it('should find existing function', async () => {
      lambdaMock.on(GetFunctionCommand).resolves({
        Configuration: {
          FunctionName: 'test-function',
          FunctionArn:
            'arn:aws:lambda:us-east-1:123456789012:function:test-function',
        },
      });

      await expect(
        service.findFunction('test-function')
      ).resolves.not.toThrow();
    });

    it('should throw error when function not found', async () => {
      lambdaMock
        .on(GetFunctionCommand)
        .rejects(new Error('Function not found'));

      await expect(service.findFunction('non-existent')).rejects.toThrow();
    });
  });

  describe('invokeFunction', () => {
    it('should invoke function with payload', async () => {
      const mockPayload = { message: 'test' };

      lambdaMock.on(InvokeCommand).resolves({
        StatusCode: 200,
      });

      const result = await service.invokeFunction('test-function', mockPayload);

      expect(result).toBeDefined();
    });

    it('should handle invocation with options', async () => {
      lambdaMock.on(InvokeCommand).resolves({
        StatusCode: 202,
      });

      const result = await service.invokeFunction(
        'test-function',
        { test: 'data' },
        { invocationType: 'Event', timeout: 60000 }
      );

      expect(result).toBeDefined();
    });

    it('should throw error when timeout exceeds maximum', async () => {
      await expect(
        service.invokeFunction('test-function', {}, { timeout: 999999999 })
      ).rejects.toThrow('exceeds maximum allowed timeout');
    });

    it('should handle invocation errors', async () => {
      lambdaMock.on(InvokeCommand).rejects(new Error('Invocation failed'));

      await expect(
        service.invokeFunction('test-function', {})
      ).rejects.toThrow();
    });
  });

  describe('getLambdaLogs', () => {
    it('should get logs from CloudWatch', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:05:00Z');

      cwLogsMock.on(FilterLogEventsCommand).resolves({
        events: [
          {
            message: 'Log message 1',
            timestamp: startTime.getTime(),
          },
          {
            message: 'Log message 2',
            timestamp: endTime.getTime(),
          },
        ],
      });

      const result = await service.getLambdaLogs(
        'test-function',
        startTime,
        endTime
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Log message 1');
      expect(result[1]).toBe('Log message 2');
    });

    it('should return empty array when no logs found', async () => {
      cwLogsMock.on(FilterLogEventsCommand).resolves({
        events: [],
      });

      const result = await service.getLambdaLogs(
        'test-function',
        new Date(),
        new Date()
      );

      expect(result).toEqual([]);
    });

    it('should handle undefined events', async () => {
      cwLogsMock.on(FilterLogEventsCommand).resolves({});

      const result = await service.getLambdaLogs(
        'test-function',
        new Date(),
        new Date()
      );

      expect(result).toEqual([]);
    });
  });

  describe('checkLambdaExecution', () => {
    it('should return true when executions found', async () => {
      lambdaMock.on(GetFunctionCommand).resolves({
        Configuration: {
          FunctionName: 'test-function',
        },
      });

      cwLogsMock.on(FilterLogEventsCommand).resolves({
        events: [
          {
            message: 'START RequestId: abc123',
            timestamp: Date.now(),
          },
        ],
      });

      const result = await service.checkLambdaExecution('test-function');

      expect(result).toBe(true);
    });

    it('should return false when no executions found', async () => {
      lambdaMock.on(GetFunctionCommand).resolves({
        Configuration: {
          FunctionName: 'test-function',
        },
      });

      cwLogsMock.on(FilterLogEventsCommand).resolves({
        events: [],
      });

      const result = await service.checkLambdaExecution('test-function');

      expect(result).toBe(false);
    });
  });

  describe('countLambdaExecutions', () => {
    it('should count executions in time range', async () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:05:00Z');

      lambdaMock.on(GetFunctionCommand).resolves({
        Configuration: {
          FunctionName: 'test-function',
        },
      });

      cwLogsMock.on(FilterLogEventsCommand).resolves({
        events: [
          { message: 'START RequestId: req1', timestamp: Date.now() },
          { message: 'START RequestId: req2', timestamp: Date.now() },
          { message: 'START RequestId: req3', timestamp: Date.now() },
        ],
      });

      const result = await service.countLambdaExecutions(
        'test-function',
        startTime,
        endTime
      );

      expect(result).toBe(3);
    });

    it('should return 0 when no executions found', async () => {
      lambdaMock.on(GetFunctionCommand).resolves({
        Configuration: {
          FunctionName: 'test-function',
        },
      });

      cwLogsMock.on(FilterLogEventsCommand).resolves({
        events: [],
      });

      const result = await service.countLambdaExecutions(
        'test-function',
        new Date(),
        new Date()
      );

      expect(result).toBe(0);
    });
  });

  describe('countLambdaExecutionsInLastMinutes', () => {
    it('should count executions in last N minutes', async () => {
      lambdaMock.on(GetFunctionCommand).resolves({
        Configuration: {
          FunctionName: 'test-function',
        },
      });

      cwLogsMock.on(FilterLogEventsCommand).resolves({
        events: [
          { message: 'START RequestId: req1', timestamp: Date.now() },
          { message: 'START RequestId: req2', timestamp: Date.now() },
        ],
      });

      const result = await service.countLambdaExecutionsInLastMinutes(
        'test-function',
        5
      );

      expect(result).toBe(2);
    });

    it('should handle zero minutes', async () => {
      lambdaMock.on(GetFunctionCommand).resolves({
        Configuration: {
          FunctionName: 'test-function',
        },
      });

      cwLogsMock.on(FilterLogEventsCommand).resolves({
        events: [],
      });

      const result = await service.countLambdaExecutionsInLastMinutes(
        'test-function',
        0
      );

      expect(result).toBe(0);
    });
  });
});
