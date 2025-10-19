import { beforeEach, describe, expect, it } from '@jest/globals';
import { AWSTestingFramework } from '../../framework/AWSTestingFramework';

describe('AWSTestingFramework', () => {
  let framework: AWSTestingFramework;

  beforeEach(() => {
    // Create a new framework instance for each test
    framework = new AWSTestingFramework();
  });

  describe('Static Factory Methods', () => {
    it('should create framework with default config', () => {
      const defaultFramework = AWSTestingFramework.create();
      const config = defaultFramework.getConfig();

      expect(config.defaultTimeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.logLevel).toBe('info');
    });

    it('should create framework for development environment', () => {
      const devFramework =
        AWSTestingFramework.createForDevelopment('eu-west-1');
      const config = devFramework.getConfig();

      expect(config.aws?.region).toBe('eu-west-1');
      expect(config.defaultTimeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
      expect(config.logLevel).toBe('debug');
    });

    it('should create framework for production environment', () => {
      const prodFramework =
        AWSTestingFramework.createForProduction('eu-west-1');
      const config = prodFramework.getConfig();

      expect(config.aws?.region).toBe('eu-west-1');
      expect(config.defaultTimeout).toBe(30000); // Uses CI config
      expect(config.retryAttempts).toBe(3);
      expect(config.logLevel).toBe('info'); // CI uses info
    });

    it('should create framework for CI environment', () => {
      const ciFramework = AWSTestingFramework.createForCI('ap-southeast-1');
      const config = ciFramework.getConfig();

      expect(config.aws?.region).toBe('ap-southeast-1');
      expect(config.defaultTimeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.logLevel).toBe('info');
    });

    it('should create framework for testing environment', () => {
      const testFramework = AWSTestingFramework.createForTesting({
        defaultTimeout: 10000,
      });
      const config = testFramework.getConfig();

      expect(config.defaultTimeout).toBe(10000);
    });

    it('should create framework with custom configuration', () => {
      const customFramework = AWSTestingFramework.create({
        aws: { region: 'us-west-2' },
        defaultTimeout: 45000,
        retryAttempts: 5,
        logLevel: 'debug',
      });
      const config = customFramework.getConfig();

      expect(config.aws?.region).toBe('us-west-2');
      expect(config.defaultTimeout).toBe(45000);
      expect(config.retryAttempts).toBe(5);
      expect(config.logLevel).toBe('debug');
    });
  });

  describe('Service Access', () => {
    it('should provide access to S3 service', () => {
      expect(framework.s3Service).toBeDefined();
    });

    it('should provide access to SQS service', () => {
      expect(framework.sqsService).toBeDefined();
    });

    it('should provide access to Lambda service', () => {
      expect(framework.lambdaService).toBeDefined();
    });

    it('should provide access to Step Function service', () => {
      expect(framework.stepFunctionService).toBeDefined();
    });

    it('should provide access to Step Context Manager', () => {
      expect(framework.stepContextManager).toBeDefined();
    });

    it('should provide access to Health Validator', () => {
      expect(framework.healthValidator).toBeDefined();
    });

    it('should provide access to Reporter', () => {
      expect(framework.reporter).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = framework.getConfig();

      expect(config).toBeDefined();
      expect(config.defaultTimeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
    });

    it('should throw error when trying to update config', () => {
      expect(() => {
        framework.updateConfig({ defaultTimeout: 60000 });
      }).toThrow(
        'Configuration updates require framework recreation. Use static factory methods instead.'
      );
    });
  });

  describe('Step Definition Factory', () => {
    it('should provide access to step definition factory', () => {
      const factory = framework.getStepFactory();

      expect(factory).toBeDefined();
    });

    it('should create step definitions through factory', () => {
      const factory = framework.getStepFactory();

      const s3Steps = factory.createS3Steps();
      const sqsSteps = factory.createSQSSteps();
      const lambdaSteps = factory.createLambdaSteps();
      const stepFunctionSteps = factory.createStepFunctionSteps();

      expect(s3Steps).toBeDefined();
      expect(sqsSteps).toBeDefined();
      expect(lambdaSteps).toBeDefined();
      expect(stepFunctionSteps).toBeDefined();
    });
  });

  describe('Resource Management', () => {
    it('should not be disposed initially', () => {
      expect(framework.isDisposed()).toBe(false);
    });

    it('should dispose framework resources', async () => {
      expect(framework.isDisposed()).toBe(false);

      await framework.dispose();

      expect(framework.isDisposed()).toBe(true);
    });

    it('should allow multiple dispose calls safely', async () => {
      await framework.dispose();
      await expect(framework.dispose()).resolves.not.toThrow();
    });
  });

  describe('Service Integration', () => {
    it('should have all services initialized and ready', () => {
      expect(framework.s3Service).toBeDefined();
      expect(framework.sqsService).toBeDefined();
      expect(framework.lambdaService).toBeDefined();
      expect(framework.stepFunctionService).toBeDefined();
      expect(framework.stepContextManager).toBeDefined();
      expect(framework.healthValidator).toBeDefined();
      expect(framework.reporter).toBeDefined();
    });

    it('should maintain service references after creation', () => {
      const s3Ref1 = framework.s3Service;
      const s3Ref2 = framework.s3Service;

      expect(s3Ref1).toBe(s3Ref2); // Same instance
    });
  });
});
