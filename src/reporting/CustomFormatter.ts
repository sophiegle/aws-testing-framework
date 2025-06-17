import { Formatter, type IFormatterOptions } from '@cucumber/cucumber';
import { TestReporter } from './TestReporter';

export default class CustomFormatter extends Formatter {
  private reporter: TestReporter;

  constructor(options: IFormatterOptions, reporter?: TestReporter) {
    super(options);
    this.reporter = reporter ?? new TestReporter();
  }

  onTestRunFinished(options: IFormatterOptions) {
    this.reporter.onTestRunFinished(options);
  }

  onFeatureStarted(feature: { name: string }) {
    this.reporter.onFeatureStarted(feature);
  }

  onScenarioStarted(scenario: { name: string }) {
    this.reporter.onScenarioStarted(scenario);
  }

  onScenarioFinished(scenario: { name: string }, result: { status: string; duration: number }) {
    this.reporter.onScenarioFinished(scenario, result);
  }

  onStepFinished(
    step: { text: string },
    result: { status: string; duration: number; error?: string }
  ) {
    this.reporter.onStepFinished(step, result);
  }
}
