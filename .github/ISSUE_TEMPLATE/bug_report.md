---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: ['bug']
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## Steps to Reproduce

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

A clear and concise description of what actually happened.

## Environment

- **Framework Version**: [e.g. 0.1.0]
- **Node.js Version**: [e.g. 22.16.0]
- **AWS Region**: [e.g. us-east-1]
- **Operating System**: [e.g. macOS, Ubuntu, Windows]

## AWS Services Used

- [ ] S3
- [ ] SQS
- [ ] Lambda
- [ ] Step Functions
- [ ] CloudWatch Logs

## Error Messages

```
Paste any error messages here
```

## Test Code

```gherkin
Feature: Example Feature
  Scenario: Example Scenario
    Given I have an S3 bucket named "test-bucket"
    When I upload a file "test.txt" to the S3 bucket
    Then the Lambda function should be invoked
```

## Additional Context

Add any other context about the problem here, such as:
- Screenshots
- Log files
- AWS CloudWatch logs
- Related issues

## Checklist

- [ ] I have searched existing issues for similar problems
- [ ] I have provided all required information
- [ ] I have included error messages and logs
- [ ] I have tested with the latest version
- [ ] I have provided a minimal reproduction case 