// Import step definition classes
import { LambdaSteps } from '../steps/LambdaSteps';
import { MonitoringSteps } from '../steps/MonitoringSteps';
import { S3Steps } from '../steps/S3Steps';
import { SQSSteps } from '../steps/SQSSteps';
import { StepFunctionSteps } from '../steps/StepFunctionSteps';
import type { IServiceContainer } from './ServiceContainer';

/**
 * Base class for step definitions with dependency injection
 */
export abstract class BaseStepDefinition {
  constructor(protected readonly container: IServiceContainer) {}

  /**
   * Get the current configuration
   */
  protected getConfig() {
    return this.container.getConfig();
  }

  /**
   * Check if the container is disposed
   */
  protected isDisposed(): boolean {
    return this.container.isDisposed();
  }
}

/**
 * Factory for creating step definition instances with proper dependency injection
 */
export class StepDefinitionFactory {
  constructor(private readonly container: IServiceContainer) {}

  /**
   * Create S3 step definitions
   */
  createS3Steps(): S3Steps {
    return new S3Steps(this.container);
  }

  /**
   * Create SQS step definitions
   */
  createSQSSteps(): SQSSteps {
    return new SQSSteps(this.container);
  }

  /**
   * Create Lambda step definitions
   */
  createLambdaSteps(): LambdaSteps {
    return new LambdaSteps(this.container);
  }

  /**
   * Create Step Function step definitions
   */
  createStepFunctionSteps(): StepFunctionSteps {
    return new StepFunctionSteps(this.container);
  }

  /**
   * Create monitoring step definitions
   */
  createMonitoringSteps(): MonitoringSteps {
    return new MonitoringSteps(this.container);
  }

  /**
   * Create all step definitions
   */
  createAllSteps(): {
    s3Steps: S3Steps;
    sqsSteps: SQSSteps;
    lambdaSteps: LambdaSteps;
    stepFunctionSteps: StepFunctionSteps;
    monitoringSteps: MonitoringSteps;
  } {
    return {
      s3Steps: this.createS3Steps(),
      sqsSteps: this.createSQSSteps(),
      lambdaSteps: this.createLambdaSteps(),
      stepFunctionSteps: this.createStepFunctionSteps(),
      monitoringSteps: this.createMonitoringSteps(),
    };
  }
}
