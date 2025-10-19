// Export base class for step definitions
export { BaseStepDefinition } from './BaseStepDefinition';

// Import step definition classes
import { LambdaSteps } from '../steps/LambdaSteps';
import { S3Steps } from '../steps/S3Steps';
import { SQSSteps } from '../steps/SQSSteps';
import { StepFunctionSteps } from '../steps/StepFunctionSteps';
import type { IServiceContainer } from './ServiceContainer';

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
   * Create all step definitions
   */
  createAllSteps(): {
    s3Steps: S3Steps;
    sqsSteps: SQSSteps;
    lambdaSteps: LambdaSteps;
    stepFunctionSteps: StepFunctionSteps;
  } {
    return {
      s3Steps: this.createS3Steps(),
      sqsSteps: this.createSQSSteps(),
      lambdaSteps: this.createLambdaSteps(),
      stepFunctionSteps: this.createStepFunctionSteps(),
    };
  }
}
