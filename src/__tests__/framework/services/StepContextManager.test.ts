import { beforeEach, describe, expect, it } from '@jest/globals';
import { StepContextManager } from '../../../framework/services/StepContextManager';

describe('StepContextManager', () => {
  let manager: StepContextManager;

  beforeEach(() => {
    manager = new StepContextManager();
  });

  describe('setStepContext and getStepContextValue', () => {
    it('should set and get context value', () => {
      manager.setStepContext('bucketName', 'test-bucket');

      const value = manager.getStepContextValue('bucketName');
      expect(value).toBe('test-bucket');
    });

    it('should overwrite existing value', () => {
      manager.setStepContext('bucketName', 'bucket-1');
      manager.setStepContext('bucketName', 'bucket-2');

      const value = manager.getStepContextValue('bucketName');
      expect(value).toBe('bucket-2');
    });

    it('should handle different context properties', () => {
      manager.setStepContext('bucketName', 'test-bucket');
      manager.setStepContext('functionName', 'test-function');
      manager.setStepContext('queueName', 'test-queue');

      expect(manager.getStepContextValue('bucketName')).toBe('test-bucket');
      expect(manager.getStepContextValue('functionName')).toBe('test-function');
      expect(manager.getStepContextValue('queueName')).toBe('test-queue');
    });

    it('should return undefined for non-existent key', () => {
      expect(manager.getStepContextValue('bucketName')).toBeUndefined();
    });
  });

  describe('getStepContext', () => {
    it('should get all context values', () => {
      manager.setStepContext('bucketName', 'test-bucket');
      manager.setStepContext('functionName', 'test-function');

      const context = manager.getStepContext();

      expect(context.bucketName).toBe('test-bucket');
      expect(context.functionName).toBe('test-function');
    });

    it('should return copy of context', () => {
      manager.setStepContext('bucketName', 'test-bucket');

      const context1 = manager.getStepContext();
      const context2 = manager.getStepContext();

      expect(context1).not.toBe(context2); // Different objects
      expect(context1).toEqual(context2); // But same content
    });
  });

  describe('hasStepContextValue', () => {
    it('should return true for existing key', () => {
      manager.setStepContext('bucketName', 'test-bucket');

      expect(manager.hasStepContextValue('bucketName')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(manager.hasStepContextValue('bucketName')).toBe(false);
    });
  });

  describe('clearStepContextValue', () => {
    it('should clear specific value', () => {
      manager.setStepContext('bucketName', 'test-bucket');
      manager.setStepContext('functionName', 'test-function');

      manager.clearStepContextValue('bucketName');

      expect(manager.hasStepContextValue('bucketName')).toBe(false);
      expect(manager.hasStepContextValue('functionName')).toBe(true);
    });

    it('should not throw error when clearing non-existent key', () => {
      expect(() => manager.clearStepContextValue('bucketName')).not.toThrow();
    });
  });

  describe('clearStepContext', () => {
    it('should clear all values', () => {
      manager.setStepContext('bucketName', 'test-bucket');
      manager.setStepContext('functionName', 'test-function');
      manager.setStepContext('queueName', 'test-queue');

      manager.clearStepContext();

      expect(manager.hasStepContextValue('bucketName')).toBe(false);
      expect(manager.hasStepContextValue('functionName')).toBe(false);
      expect(manager.hasStepContextValue('queueName')).toBe(false);
    });

    it('should work on empty context', () => {
      expect(() => manager.clearStepContext()).not.toThrow();
    });
  });

  describe('validateStepContext', () => {
    it('should validate all required keys present', () => {
      manager.setStepContext('bucketName', 'test-bucket');
      manager.setStepContext('functionName', 'test-function');

      const validation = manager.validateStepContext([
        'bucketName',
        'functionName',
      ]);

      expect(validation.isValid).toBe(true);
      expect(validation.missingKeys).toEqual([]);
      expect(validation.presentKeys).toEqual(['bucketName', 'functionName']);
    });

    it('should detect missing keys', () => {
      manager.setStepContext('bucketName', 'test-bucket');

      const validation = manager.validateStepContext([
        'bucketName',
        'functionName',
        'queueName',
      ]);

      expect(validation.isValid).toBe(false);
      expect(validation.missingKeys).toEqual(['functionName', 'queueName']);
      expect(validation.presentKeys).toEqual(['bucketName']);
    });

    it('should return valid for empty required keys', () => {
      const validation = manager.validateStepContext([]);

      expect(validation.isValid).toBe(true);
      expect(validation.missingKeys).toEqual([]);
    });
  });

  describe('getContextEntriesCount', () => {
    it('should return count of context entries', () => {
      expect(manager.getContextEntriesCount()).toBe(0);

      manager.setStepContext('bucketName', 'test-bucket');
      expect(manager.getContextEntriesCount()).toBe(1);

      manager.setStepContext('functionName', 'test-function');
      expect(manager.getContextEntriesCount()).toBe(2);
    });
  });

  describe('getContextKeys', () => {
    it('should return all context keys', () => {
      manager.setStepContext('bucketName', 'test-bucket');
      manager.setStepContext('functionName', 'test-function');

      const keys = manager.getContextKeys();

      expect(keys).toContain('bucketName');
      expect(keys).toContain('functionName');
      expect(keys).toHaveLength(2);
    });

    it('should return empty array for empty context', () => {
      const keys = manager.getContextKeys();

      expect(keys).toEqual([]);
    });
  });

  describe('isContextEmpty', () => {
    it('should return true for empty context', () => {
      expect(manager.isContextEmpty()).toBe(true);
    });

    it('should return false when context has values', () => {
      manager.setStepContext('bucketName', 'test-bucket');

      expect(manager.isContextEmpty()).toBe(false);
    });

    it('should return true after clearing context', () => {
      manager.setStepContext('bucketName', 'test-bucket');
      manager.clearStepContext();

      expect(manager.isContextEmpty()).toBe(true);
    });
  });
});
