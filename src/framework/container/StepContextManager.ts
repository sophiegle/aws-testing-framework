import type { IServiceContainer } from '../container/ServiceContainer';
import type { StepContext } from '../types';

/**
 * Step context manager that injects the service container into step contexts
 */
export class StepContextManager {
  private container: IServiceContainer;

  constructor(container: IServiceContainer) {
    this.container = container;
  }

  /**
   * Enhance step context with container reference
   */
  enhanceStepContext(context: StepContext): StepContext {
    return {
      ...context,
      container: this.container,
    };
  }

  /**
   * Create a step function that has access to the container
   */
  createStepFunction<T extends unknown[]>(
    stepFunction: (this: StepContext, ...args: T) => Promise<void>
  ): (...args: T) => Promise<void> {
    return async function (this: StepContext, ...args: T) {
      // Enhance the context with container access
      const enhancedContext = this.container
        ? this
        : { ...this, container: this.container };

      return stepFunction.call(enhancedContext, ...args);
    };
  }
}
