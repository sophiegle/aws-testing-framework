import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateHtmlReport, main } from '../../reporting/generateReport';

// Mock fs module
jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Mock path module
jest.mock('node:path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

// Mock process.exit
jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('generateReport', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('generateHtmlReport', () => {
    it('should generate HTML report for empty report', () => {
      const html = generateHtmlReport([]);
      expect(html).toContain('No test results found');
    });

    it('should generate HTML report with test results', () => {
      const mockReport = [
        {
          feature: 'Test Feature',
          scenarios: [
            {
              name: 'Test Scenario',
              status: 'passed',
              steps: [
                {
                  name: 'Test Step',
                  status: 'passed',
                  duration: 100,
                },
              ],
            },
          ],
        },
      ];

      const html = generateHtmlReport(mockReport);
      expect(html).toContain('Test Feature');
      expect(html).toContain('Test Scenario');
      expect(html).toContain('Test Step');
      expect(html).toContain('100ms');
    });

    it('should handle failed test results', () => {
      const mockReport = [
        {
          feature: 'Test Feature',
          scenarios: [
            {
              name: 'Test Scenario',
              status: 'failed',
              steps: [
                {
                  name: 'Test Step',
                  status: 'failed',
                  duration: 100,
                },
              ],
            },
          ],
        },
      ];

      const html = generateHtmlReport(mockReport);
      expect(html).toContain('Test error');
    });

    it('should calculate correct summary statistics', () => {
      const mockReport = [
        {
          feature: 'Feature 1',
          scenarios: [
            {
              name: 'Scenario 1',
              status: 'passed',
              steps: [
                {
                  name: 'Step 1',
                  status: 'passed',
                  duration: 100,
                },
              ],
            },
            {
              name: 'Scenario 2',
              status: 'failed',
              steps: [
                {
                  name: 'Step 1',
                  status: 'failed',
                  duration: 100,
                },
              ],
            },
          ],
        },
        {
          feature: 'Feature 2',
          scenarios: [
            {
              name: 'Scenario 3',
              status: 'passed',
              steps: [
                {
                  name: 'Step 1',
                  status: 'passed',
                  duration: 100,
                },
              ],
            },
          ],
        },
      ];

      const html = generateHtmlReport(mockReport);
      expect(html).toContain('Total Scenarios: 3');
      expect(html).toContain('Passed: 2');
      expect(html).toContain('Failed: 1');
    });
  });

  describe('file operations', () => {
    it('should create test-reports directory if it does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      main();
      expect(mkdirSync).toHaveBeenCalledWith('test-reports', { recursive: true });
    });

    it('should handle missing report file', () => {
      (existsSync as jest.Mock).mockReturnValue(false);
      main();
      expect(console.error).toHaveBeenCalledWith(
        'Error: No test report found. Please run the tests first.'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should generate and write HTML report successfully', () => {
      const mockReport = {
        features: [
          {
            feature: 'Test Feature',
            scenarios: [
              {
                name: 'Test Scenario',
                status: 'passed',
                steps: [
                  {
                    name: 'Test Step',
                    status: 'passed',
                    duration: 100,
                  },
                ],
              },
            ],
          },
        ],
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockReport));

      main();

      expect(writeFileSync).toHaveBeenCalledWith(
        'test-reports/report.html',
        expect.stringContaining('Test Feature')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'HTML report generated successfully at test-reports/report.html'
      );
    });
  });
});
