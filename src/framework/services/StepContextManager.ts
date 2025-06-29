import type { ContextValidation, StepContext } from '../types';

export class StepContextManager {
  private stepContext: StepContext = {};

  /**
   * Get current step context
   */
  getStepContext(): StepContext {
    return { ...this.stepContext };
  }

  /**
   * Set step context value
   */
  setStepContext<K extends keyof StepContext>(
    key: K,
    value: StepContext[K]
  ): void {
    this.stepContext[key] = value;
  }

  /**
   * Get step context value
   */
  getStepContextValue<K extends keyof StepContext>(
    key: K
  ): StepContext[K] | undefined {
    return this.stepContext[key];
  }

  /**
   * Clear step context
   */
  clearStepContext(): void {
    this.stepContext = {};
  }

  /**
   * Clear specific step context value
   */
  clearStepContextValue<K extends keyof StepContext>(key: K): void {
    delete this.stepContext[key];
  }

  /**
   * Check if step context has a specific value
   */
  hasStepContextValue<K extends keyof StepContext>(key: K): boolean {
    return this.stepContext[key] !== undefined;
  }

  /**
   * Validate required step context values
   */
  validateStepContext(requiredKeys: (keyof StepContext)[]): ContextValidation {
    const missingKeys: (keyof StepContext)[] = [];
    const presentKeys: (keyof StepContext)[] = [];

    for (const key of requiredKeys) {
      if (this.stepContext[key] !== undefined) {
        presentKeys.push(key);
      } else {
        missingKeys.push(key);
      }
    }

    return {
      isValid: missingKeys.length === 0,
      missingKeys,
      presentKeys,
    };
  }

  /**
   * Get context entries count
   */
  getContextEntriesCount(): number {
    return Object.keys(this.stepContext).length;
  }

  /**
   * Get all context keys
   */
  getContextKeys(): (keyof StepContext)[] {
    return Object.keys(this.stepContext) as (keyof StepContext)[];
  }

  /**
   * Check if context is empty
   */
  isContextEmpty(): boolean {
    return Object.keys(this.stepContext).length === 0;
  }
}
