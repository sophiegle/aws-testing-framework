import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Command } from 'commander';

interface StepDefinition {
  type: 'Given' | 'When' | 'Then';
  pattern: string;
  description?: string;
  service: string;
  file: string;
}

export class StepDiscoveryCommand {
  private steps: StepDefinition[] = [];

  async execute(): Promise<void> {
    console.log('🔍 AWS Testing Framework - Available Steps');
    console.log('==========================================\n');

    await this.discoverSteps();
    this.displaySteps();
    this.displayUsageExamples();
  }

  private async discoverSteps(): Promise<void> {
    const stepsDir = join(__dirname, '../steps');
    const stepFiles = readdirSync(stepsDir).filter(
      (file) =>
        (file.endsWith('.ts') || file.endsWith('.js')) &&
        file !== 'base-steps.ts' &&
        file !== 'base-steps.js' &&
        file !== 'support.ts' &&
        file !== 'support.js'
    );

    for (const file of stepFiles) {
      const filePath = join(stepsDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const service = file
        .replace('-steps.ts', '')
        .replace('-steps.js', '')
        .toUpperCase();

      this.parseStepFile(content, service, file);
    }
  }

  private parseStepFile(content: string, service: string, file: string): void {
    // Match both TypeScript and compiled JavaScript patterns
    const stepRegex =
      /(?:Given|When|Then)\(\s*['"`]([^'"`]+)['"`]|\(0,\s*cucumber_\d+\.(Given|When|Then)\)\(\s*['"`]([^'"`]+)['"`]/g;
    let match: RegExpExecArray | null;

    match = stepRegex.exec(content);
    while (match !== null) {
      let type: string;
      let pattern: string;

      if (match[1]) {
        // TypeScript pattern: Given('pattern')
        type = match[0].split('(')[0];
        pattern = match[1];
      } else {
        // JavaScript pattern: (0, cucumber_1.Given)('pattern')
        type = match[2];
        pattern = match[3];
      }

      // Extract description from comments above the step
      const lines = content.substring(0, match.index).split('\n');
      let description = '';

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('//') && line.length > 2) {
          description = line.substring(2).trim();
          break;
        }
        if (line === '') continue;
        if (
          line.startsWith('Given(') ||
          line.startsWith('When(') ||
          line.startsWith('Then(')
        ) {
          break;
        }
      }

      this.steps.push({
        type: type as 'Given' | 'When' | 'Then',
        pattern,
        description,
        service,
        file,
      });

      match = stepRegex.exec(content);
    }
  }

  private displaySteps(): void {
    const groupedSteps = this.groupStepsByService();

    for (const [service, steps] of Object.entries(groupedSteps)) {
      console.log(`📦 ${service} Steps`);
      console.log('─'.repeat(50));

      const givenSteps = steps.filter((s) => s.type === 'Given');
      const whenSteps = steps.filter((s) => s.type === 'When');
      const thenSteps = steps.filter((s) => s.type === 'Then');

      if (givenSteps.length > 0) {
        console.log('\n🔧 Given (Setup):');
        givenSteps.forEach((step) => {
          this.displayStep(step);
        });
      }

      if (whenSteps.length > 0) {
        console.log('\n⚡ When (Actions):');
        whenSteps.forEach((step) => {
          this.displayStep(step);
        });
      }

      if (thenSteps.length > 0) {
        console.log('\n✅ Then (Verifications):');
        thenSteps.forEach((step) => {
          this.displayStep(step);
        });
      }

      console.log('\n');
    }
  }

  private displayStep(step: StepDefinition): void {
    const icon =
      step.type === 'Given' ? '🔧' : step.type === 'When' ? '⚡' : '✅';
    console.log(`  ${icon} ${step.pattern}`);

    if (step.description) {
      console.log(`     💡 ${step.description}`);
    }
  }

  private groupStepsByService(): Record<string, StepDefinition[]> {
    return this.steps.reduce(
      (groups, step) => {
        if (!groups[step.service]) {
          groups[step.service] = [];
        }
        groups[step.service].push(step);
        return groups;
      },
      {} as Record<string, StepDefinition[]>
    );
  }

  private displayUsageExamples(): void {
    console.log('📚 Usage Examples');
    console.log('================\n');

    console.log('🔍 Search for specific steps:');
    console.log('  npx aws-testing-framework steps --search "lambda"');
    console.log('  npx aws-testing-framework steps --search "upload"');
    console.log('  npx aws-testing-framework steps --service s3\n');

    console.log('📖 Get step details:');
    console.log(
      '  npx aws-testing-framework steps --detail "I have an S3 bucket"'
    );
    console.log(
      '  npx aws-testing-framework steps --detail "Lambda function should be invoked"\n'
    );

    console.log('📋 Export steps to file:');
    console.log('  npx aws-testing-framework steps --export steps.md');
    console.log('  npx aws-testing-framework steps --export steps.json\n');
  }

  async searchSteps(searchTerm: string): Promise<void> {
    await this.discoverSteps();
    const filteredSteps = this.steps.filter(
      (step) =>
        step.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
        step.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    console.log(`🔍 Search Results for "${searchTerm}"`);
    console.log('='.repeat(50));
    filteredSteps.forEach((step) => {
      this.displayStep(step);
    });
  }

  async filterByService(service: string): Promise<void> {
    await this.discoverSteps();
    const serviceSteps = this.steps.filter(
      (step) => step.service.toLowerCase() === service.toLowerCase()
    );

    console.log(`📦 ${service.toUpperCase()} Steps`);
    console.log('='.repeat(50));
    serviceSteps.forEach((step) => {
      this.displayStep(step);
    });
  }

  async getStepDetail(stepPattern: string): Promise<void> {
    await this.discoverSteps();
    const step = this.steps.find((s) => s.pattern.includes(stepPattern));

    if (step) {
      console.log(`📖 Step Details: ${step.pattern}`);
      console.log('='.repeat(50));
      console.log(`Type: ${step.type}`);
      console.log(`Service: ${step.service}`);
      console.log(`File: ${step.file}`);
      if (step.description) console.log(`Description: ${step.description}`);
    } else {
      console.log(`❌ Step not found: ${stepPattern}`);
    }
  }

  async exportSteps(filename: string): Promise<void> {
    await this.discoverSteps();
    console.log(`📋 Exporting steps to ${filename}...`);
    // Implementation would write to file
    console.log('✅ Export functionality coming soon');
  }
}

// CLI integration
export function addStepDiscoveryCommand(program: Command): void {
  program
    .command('steps')
    .description('Discover available Gherkin step definitions')
    .option('-s, --search <term>', 'Search steps by keyword')
    .option(
      '--service <service>',
      'Filter by AWS service (s3, sqs, lambda, step-functions)'
    )
    .option(
      '-d, --detail <step>',
      'Get detailed information about a specific step'
    )
    .option('--export <file>', 'Export steps to file (md or json)')
    .action(async (options) => {
      const discovery = new StepDiscoveryCommand();

      if (options.search) {
        await discovery.searchSteps(options.search);
      } else if (options.service) {
        await discovery.filterByService(options.service);
      } else if (options.detail) {
        await discovery.getStepDetail(options.detail);
      } else if (options.export) {
        await discovery.exportSteps(options.export);
      } else {
        await discovery.execute();
      }
    });
}
