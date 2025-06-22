---
name: Bug report
about: Create a report to help us improve
title: ''
labels: 'bug'
assignees: 'sophiegle'

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Create feature file
2. Run script ...
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment:**
 - OS: [e.g. macOS, Windows, Linux]
 - Node.js version: [e.g. 18.17.0]
 - AWS Testing Framework version: [e.g. 0.1.5]
 - AWS region: [e.g. eu-west-2]

**Additional context**
Add any other context about the problem here.

**Code example**
If applicable, add a code example to help explain your problem:

```typescript
// Your code here
```

**Error logs**
If applicable, add error logs or stack traces:

```
Error: ...
```

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