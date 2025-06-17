# Contributing to AWS Testing Framework

Thank you for your interest in contributing to the AWS Testing Framework! This document provides guidelines and instructions for contributing.

## Development Setup

1. Fork and clone the repository:
```bash
git clone https://github.com/your-username/aws-testing-framework.git
cd aws-testing-framework
```

2. Install dependencies:
```bash
npm install
```

3. Set up AWS credentials:
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=your_region
```

## Development Workflow

1. Create a new branch for your feature or bugfix:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bugfix-name
```

2. Make your changes and ensure they follow our coding standards:
```bash
# Format code
npm run format

# Lint code
npm run lint

# Run tests
npm test
```

3. Commit your changes with a descriptive message:
```bash
git commit -m "feat: add new AWS service support"
# or
git commit -m "fix: resolve S3 bucket creation issue"
```

4. Push your branch and create a pull request:
```bash
git push origin feature/your-feature-name
```

## Code Style

We use Biome for code formatting and linting. Please ensure your code:

- Follows TypeScript best practices
- Uses proper type definitions
- Includes JSDoc comments for public APIs
- Has appropriate test coverage
- Passes all linting rules

## Testing

1. Write feature files in Gherkin syntax
2. Implement step definitions
3. Run tests:
```bash
npm test
```

4. Generate and review test reports:
```bash
npm run generate-report
```

## Pull Request Process

1. Update documentation for any new features
2. Add tests for new functionality
3. Ensure all tests pass
4. Update the README.md if necessary
5. Follow the PR template
6. Request review from maintainers

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a release tag
4. Publish to npm

## Questions or Issues?

- Open an issue for bugs or feature requests
- Join our discussions for questions
- Check existing issues before creating new ones

## Code of Conduct

Please be respectful and considerate of others when contributing. We aim to maintain a welcoming and inclusive community. 