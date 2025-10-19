import {
  type IServiceContainer,
  ServiceContainer,
} from './container/ServiceContainer';
import { StepDefinitionFactory } from './container/StepDefinitionFactory';
import type { ExecutionDetails, FrameworkConfig } from './types';

export class AWSTestingFramework implements IServiceContainer {
  // Service container for dependency injection
  private readonly container: ServiceContainer;
  private readonly stepFactory: StepDefinitionFactory;

  // Framework components
  private executionTracker: Map<string, ExecutionDetails[]> = new Map();
  private disposed = false;

  // Expose services through the container for backward compatibility
  public get s3Service() {
    return this.container.s3Service;
  }
  public get sqsService() {
    return this.container.sqsService;
  }
  public get lambdaService() {
    return this.container.lambdaService;
  }
  public get stepFunctionService() {
    return this.container.stepFunctionService;
  }
  public get stepContextManager() {
    return this.container.stepContextManager;
  }
  public get healthValidator() {
    return this.container.healthValidator;
  }
  public get reporter() {
    return this.container.reporter;
  }

  /**
   * Create framework instance with common configurations
   */
  static create(config?: Partial<FrameworkConfig>): AWSTestingFramework {
    return new AWSTestingFramework(config);
  }

  /**
   * Create framework instance for development environment
   */
  static createForDevelopment(region?: string): AWSTestingFramework {
    const container = ServiceContainer.createForDevelopment(region);
    return new AWSTestingFramework(container);
  }

  /**
   * Create framework instance for production environment
   */
  static createForProduction(region?: string): AWSTestingFramework {
    const container = ServiceContainer.createForCI(region); // Use CI config for production
    return new AWSTestingFramework(container);
  }

  /**
   * Create framework instance for CI/CD environment
   */
  static createForCI(region?: string): AWSTestingFramework {
    const container = ServiceContainer.createForCI(region);
    return new AWSTestingFramework(container);
  }

  /**
   * Create framework instance for testing
   */
  static createForTesting(
    config?: Partial<FrameworkConfig>
  ): AWSTestingFramework {
    const container = ServiceContainer.createForTesting(config);
    return new AWSTestingFramework(container);
  }

  constructor(containerOrConfig?: ServiceContainer | FrameworkConfig) {
    if (containerOrConfig instanceof ServiceContainer) {
      this.container = containerOrConfig;
    } else {
      this.container = new ServiceContainer(containerOrConfig);
    }

    this.stepFactory = new StepDefinitionFactory(this.container);
  }

  /**
   * Get the current framework configuration
   */
  getConfig(): FrameworkConfig {
    return this.container.getConfig();
  }

  /**
   * Update framework configuration
   * @deprecated Configuration updates require framework recreation. Use static factory methods instead.
   * @throws {Error} Always throws as configuration updates are not supported
   */
  updateConfig(_updates: Partial<FrameworkConfig>): void {
    throw new Error(
      'Configuration updates require framework recreation. Use static factory methods instead.'
    );
  }

  /**
   * Get the step definition factory for creating step definitions
   */
  getStepFactory(): StepDefinitionFactory {
    return this.stepFactory;
  }

  /**
   * Dispose of all resources and cleanup
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    try {
      // Clear execution tracker
      this.executionTracker.clear();

      // Dispose of the service container
      await this.container.dispose();

      this.disposed = true;
    } catch (error) {
      // Re-throw error with context
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error during framework disposal: ${message}`);
    }
  }

  /**
   * Check if the framework has been disposed
   */
  isDisposed(): boolean {
    return this.disposed || this.container.isDisposed();
  }
}
