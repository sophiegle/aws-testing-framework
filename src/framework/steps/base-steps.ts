import { ServiceContainer } from '../container/ServiceContainer';
import { StepDefinitionFactory } from '../container/StepDefinitionFactory';
import type { FrameworkConfig } from '../types';

// Global service container instance
let globalContainer: ServiceContainer | null = null;
let stepFactory: StepDefinitionFactory | null = null;

/**
 * Initialize the global service container
 * This should be called before any step definitions are used
 */
export function initializeFramework(config?: FrameworkConfig): void {
  if (globalContainer) {
    globalContainer.dispose();
  }

  globalContainer = new ServiceContainer(config);
  stepFactory = new StepDefinitionFactory(globalContainer);

  // Register all step definitions
  registerAllSteps();
}

/**
 * Get the global service container
 */
export function getContainer(): ServiceContainer {
  if (!globalContainer) {
    throw new Error(
      'Framework not initialized. Call initializeFramework() first.'
    );
  }
  return globalContainer;
}

/**
 * Get the step definition factory
 */
export function getStepFactory(): StepDefinitionFactory {
  if (!stepFactory) {
    throw new Error(
      'Framework not initialized. Call initializeFramework() first.'
    );
  }
  return stepFactory;
}

/**
 * Dispose of the global framework
 */
export async function disposeFramework(): Promise<void> {
  if (globalContainer) {
    await globalContainer.dispose();
    globalContainer = null;
    stepFactory = null;
  }
}

/**
 * Register all step definitions
 */
function registerAllSteps(): void {
  if (!stepFactory) {
    throw new Error('Step factory not initialized');
  }

  const steps = stepFactory.createAllSteps();

  // Register all step definitions
  steps.s3Steps.registerSteps();
  steps.sqsSteps.registerSteps();
  steps.lambdaSteps.registerSteps();
  steps.stepFunctionSteps.registerSteps();
  steps.monitoringSteps.registerSteps();
}
