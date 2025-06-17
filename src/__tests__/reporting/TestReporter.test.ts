import * as fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { IFormatterOptions } from '@cucumber/cucumber';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { TestReporter } from '../../reporting/TestReporter';

// Mock fs module
jest.mock('node:fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Mock path module
jest.mock('node:path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

interface TestFeature {
  name: string;
}

interface TestScenario {
  name: string;
}

interface TestStep {
  text: string;
}

interface TestResult {
  status: string;
  duration: number;
}

interface TestReporterResults {
  feature: string;
  scenarios: Array<{
    name: string;
    status: string;
    steps: Array<{
      name: string;
      status: string;
      duration: number;
    }>;
  }>;
}

describe('TestReporter', () => {
  let reporter: TestReporter;

  beforeEach(() => {
    reporter = new TestReporter();
  });

  describe('onFeatureStarted', () => {
    it('should add feature to results', () => {
      const feature: TestFeature = { name: 'Test Feature' };
      reporter.onFeatureStarted(feature);
      const results = (reporter as unknown as { results: TestReporterResults[] }).results;
      expect(results).toHaveLength(1);
      expect(results[0].feature).toBe('Test Feature');
    });
  });

  describe('onScenarioStarted', () => {
    it('should add scenario to current feature', () => {
      const feature: TestFeature = { name: 'Test Feature' };
      const scenario: TestScenario = { name: 'Test Scenario' };
      reporter.onFeatureStarted(feature);
      reporter.onScenarioStarted(scenario);

      const results = (reporter as unknown as { results: TestReporterResults[] }).results;
      expect(results[0].scenarios).toHaveLength(1);
      expect(results[0].scenarios[0].name).toBe('Test Scenario');
      expect(results[0].scenarios[0].status).toBe('skipped');
    });
  });

  describe('onStepFinished', () => {
    it('should add step to current scenario', () => {
      const feature: TestFeature = { name: 'Test Feature' };
      const scenario: TestScenario = { name: 'Test Scenario' };
      const step: TestStep = { text: 'test step' };
      const result: TestResult = { status: 'passed', duration: 100 };

      reporter.onFeatureStarted(feature);
      reporter.onScenarioStarted(scenario);
      reporter.onStepFinished(step, result);

      const results = (reporter as unknown as { results: TestReporterResults[] }).results;
      expect(results[0].scenarios[0].steps).toHaveLength(1);
      expect(results[0].scenarios[0].steps[0].name).toBe('test step');
      expect(results[0].scenarios[0].steps[0].status).toBe('passed');
      expect(results[0].scenarios[0].steps[0].duration).toBe(100);
    });
  });

  describe('onTestRunFinished', () => {
    it('should generate reports', () => {
      const formatterOptions: IFormatterOptions = {
        colorFns: {
          forStatus: jest.fn(),
          location: jest.fn(),
          errorMessage: jest.fn(),
          errorStack: jest.fn(),
          tag: jest.fn(),
          diffAdded: jest.fn(),
          diffRemoved: jest.fn(),
        },
        cwd: process.cwd(),
        eventBroadcaster: new EventEmitter(),
        // @ts-expect-error: Cucumber type is not mockable
        eventDataCollector: {
          getTestCaseAttempts: jest.fn(),
          getTestCaseAttempt: jest.fn(),
          undefinedParameterTypes: [],
        } as unknown as object,
        log: jest.fn(),
        parsedArgvOptions: {},
        stream: process.stdout,
        cleanup: jest.fn(),
        // @ts-expect-error: Cucumber type is not mockable
        snippetBuilder: {
          build: jest.fn(),
        } as unknown as object,
        // @ts-expect-error: Cucumber type is not mockable
        supportCodeLibrary: {
          afterTestCaseHookDefinitions: [],
          afterTestRunHookDefinitions: [],
          beforeTestCaseHookDefinitions: [],
          beforeTestRunHookDefinitions: [],
          beforeTestStepHookDefinitions: [],
          afterTestStepHookDefinitions: [],
          defaultTimeout: 0,
          parameterTypeRegistry: {
            parameterTypeToSource: new Map(),
            defineSourcedParameterType: jest.fn(),
            lookupSource: jest.fn(),
            parameterTypeByName: new Map(),
            parameterTypes: {
              next: () => ({ done: true, value: undefined }),
              [Symbol.iterator]: function () { return this; }
            },
            parameterTypesByRegexp: new Map(),
            defineParameterType: jest.fn(),
            lookupByTypeName: jest.fn(),
            lookupByRegexp: jest.fn(),
            [Symbol.iterator]: function* () {},
          },
          stepDefinitions: [],
          World: jest.fn(),
          originalCoordinates: {
            requireModules: [],
            requirePaths: [],
            importPaths: [],
            loaders: [],
          },
          undefinedParameterTypes: [],
          parallelCanAssign: jest.fn(),
        } as unknown as object,
      };

      // Add some test data
      reporter.onFeatureStarted({ name: 'Test Feature' });
      reporter.onScenarioStarted({ name: 'Test Scenario' });
      reporter.onStepFinished(
        { text: 'Test Step' },
        { status: 'passed', duration: 100 }
      );

      reporter.onTestRunFinished(formatterOptions);

      expect(fs.mkdirSync).toHaveBeenCalledWith('test-reports', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'test-reports/cucumber-report.json',
        expect.stringContaining('Test Feature')
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'test-reports/report.html',
        expect.stringContaining('Test Feature')
      );
    });
  });
});
