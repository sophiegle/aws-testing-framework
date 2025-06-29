import { beforeEach, describe, expect, it } from '@jest/globals';
import { AWSTestingFrameworkRefactored } from '../../framework/AWSTestingFrameworkRefactored';

describe('AWSTestingFrameworkRefactored', () => {
  let framework: AWSTestingFrameworkRefactored;

  beforeEach(() => {
    // Create a new framework instance for each test
    framework = new AWSTestingFrameworkRefactored();
  });

  describe('Static Factory Methods', () => {
    it('should create framework with default config', () => {
      const defaultFramework = AWSTestingFrameworkRefactored.create();
      const config = defaultFramework.getConfig();

      expect(config.defaultTimeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.logLevel).toBe('info');
    });

    it('should create framework for development environment', () => {
      const devFramework =
        AWSTestingFrameworkRefactored.createForDevelopment('eu-west-1');
      const config = devFramework.getConfig();

      expect(config.aws?.region).toBe('eu-west-1');
      expect(config.defaultTimeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
      expect(config.logLevel).toBe('debug');
    });

    it('should create framework for production environment', () => {
      const prodFramework =
        AWSTestingFrameworkRefactored.createForProduction('eu-west-1');
      const config = prodFramework.getConfig();

      expect(config.aws?.region).toBe('eu-west-1');
      expect(config.defaultTimeout).toBe(120000);
      expect(config.retryAttempts).toBe(3);
      expect(config.logLevel).toBe('info');
    });

    it('should create framework for CI environment', () => {
      const ciFramework =
        AWSTestingFrameworkRefactored.createForCI('ap-southeast-1');
      const config = ciFramework.getConfig();

      expect(config.aws?.region).toBe('ap-southeast-1');
      expect(config.defaultTimeout).toBe(300000);
      expect(config.retryAttempts).toBe(3);
      expect(config.logLevel).toBe('warn');
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = framework.getConfig();

      expect(config).toBeDefined();
      expect(config.defaultTimeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.enableLogging).toBe(true);
    });

    it('should update configuration', () => {
      framework.updateConfig({
        defaultTimeout: 60000,
        logLevel: 'debug',
      });

      const config = framework.getConfig();
      expect(config.defaultTimeout).toBe(60000);
      expect(config.logLevel).toBe('debug');
    });
  });

  describe('Step Context Management', () => {
    it('should set and get step context', () => {
      framework.setStepContext('bucketName', 'test-bucket');
      framework.setStepContext('functionName', 'test-function');

      const context = framework.getStepContext();
      expect(context.bucketName).toBe('test-bucket');
      expect(context.functionName).toBe('test-function');
    });

    it('should get specific step context value', () => {
      framework.setStepContext('bucketName', 'test-bucket');

      const bucketName = framework.getStepContextValue('bucketName');
      expect(bucketName).toBe('test-bucket');
    });

    it('should check if step context has value', () => {
      framework.setStepContext('bucketName', 'test-bucket');

      expect(framework.hasStepContextValue('bucketName')).toBe(true);
      expect(framework.hasStepContextValue('functionName')).toBe(false);
    });

    it('should clear step context', () => {
      framework.setStepContext('bucketName', 'test-bucket');
      framework.clearStepContext();

      const context = framework.getStepContext();
      expect(context.bucketName).toBeUndefined();
    });

    it('should clear specific step context value', () => {
      framework.setStepContext('bucketName', 'test-bucket');
      framework.setStepContext('functionName', 'test-function');
      framework.clearStepContextValue('bucketName');

      const context = framework.getStepContext();
      expect(context.bucketName).toBeUndefined();
      expect(context.functionName).toBe('test-function');
    });

    it('should validate step context', () => {
      framework.setStepContext('bucketName', 'test-bucket');
      framework.setStepContext('functionName', 'test-function');

      const validation = framework.validateStepContext([
        'bucketName',
        'functionName',
        'queueName',
      ]);

      expect(validation.isValid).toBe(false);
      expect(validation.presentKeys).toContain('bucketName');
      expect(validation.presentKeys).toContain('functionName');
      expect(validation.missingKeys).toContain('queueName');
    });
  });

  describe('Performance Monitoring', () => {
    it('should start test run', () => {
      expect(() => framework.startTestRun()).not.toThrow();
    });

    it('should get test metrics', () => {
      const metrics = framework.getTestMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalTests).toBe(0);
      expect(metrics.passedTests).toBe(0);
      expect(metrics.failedTests).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
      expect(metrics.totalExecutionTime).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.retryRate).toBe(0);
    });

    it('should get service metrics', () => {
      const metrics = framework.getServiceMetrics('s3');
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should get slowest operations', () => {
      const operations = framework.getSlowestOperations(3);
      expect(Array.isArray(operations)).toBe(true);
    });

    it('should get operations with most retries', () => {
      const operations = framework.getOperationsWithMostRetries(3);
      expect(Array.isArray(operations)).toBe(true);
    });

    it('should generate performance report', () => {
      const report = framework.generatePerformanceReport();
      expect(typeof report).toBe('string');
      expect(report).toContain('Performance Report');
    });
  });

  describe('Reporter Management', () => {
    it('should configure reporter', () => {
      const result = framework.configureReporter('./test-output');
      expect(result).toBe(framework);
    });

    it('should get reporter', () => {
      const reporter = framework.getReporter();
      expect(reporter).toBeDefined();
    });
  });

  describe('Health and Validation', () => {
    it('should get health status', async () => {
      const healthStatus = await framework.getHealthStatus();

      expect(healthStatus).toBeDefined();
      expect(healthStatus.isHealthy).toBeDefined();
      expect(healthStatus.awsSetup).toBeDefined();
      expect(healthStatus.performance).toBeDefined();
      expect(healthStatus.resources).toBeDefined();
    });

    it('should validate AWS setup', async () => {
      const validation = await framework.validateAWSSetup();

      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
      expect(validation.errors).toBeDefined();
      expect(validation.warnings).toBeDefined();
      expect(validation.services).toBeDefined();
    });

    it('should wait for condition', async () => {
      let counter = 0;
      const condition = async () => {
        counter++;
        return counter >= 3;
      };

      await framework.waitForCondition(condition, 5000, 100);
      expect(counter).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup framework', async () => {
      // Set some context and start test run
      framework.setStepContext('bucketName', 'test-bucket');
      framework.startTestRun();

      // Verify context exists
      expect(framework.getStepContext().bucketName).toBe('test-bucket');

      // Cleanup
      await framework.cleanup();

      // Verify context is cleared
      expect(framework.getStepContext().bucketName).toBeUndefined();
    });

    it('should cleanup specific resources', async () => {
      await expect(framework.cleanupResources('s3')).resolves.not.toThrow();
      await expect(framework.cleanupResources('all')).resolves.not.toThrow();
    });
  });
});
