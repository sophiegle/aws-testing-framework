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
