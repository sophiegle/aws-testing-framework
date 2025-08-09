const { AWSTestingFramework } = require('../dist/index');

async function demonstrateLambdaVerification() {
  console.log('🔍 Lambda CloudWatch Log Verification Example');
  console.log('=============================================\n');

  // Create framework instance
  const framework = new AWSTestingFramework();

  const functionName = 'afti-lambda-function'; // Your Lambda function name

  try {
    console.log(`1. Checking if Lambda function "${functionName}" exists...`);
    await framework.findFunction(functionName);
    console.log('✅ Lambda function found and accessible\n');

    console.log('2. Checking for recent Lambda executions...');
    const hasExecutions = await framework.checkLambdaExecution(functionName);

    if (hasExecutions) {
      console.log('✅ Lambda function has been executed recently');
      console.log('   (Found execution indicators in CloudWatch logs)');
    } else {
      console.log('❌ No recent Lambda executions found');
      console.log('   (No execution indicators in CloudWatch logs)');
    }

    console.log('\n3. Getting Lambda logs for the last 5 minutes...');
    const startTime = new Date(Date.now() - 300000); // 5 minutes ago
    const endTime = new Date();

    console.log(
      `   Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`
    );

    const logs = await framework.getLambdaLogs(
      functionName,
      startTime,
      endTime
    );
    console.log(`   Found ${logs.length} log entries`);

    if (logs.length > 0) {
      console.log('   Sample log entries:');
      logs.slice(0, 3).forEach((log, index) => {
        console.log(
          `   ${index + 1}. ${log.substring(0, 100)}${log.length > 100 ? '...' : ''}`
        );
      });
    }

    console.log('\n4. Counting Lambda executions...');
    const executionCount = await framework.countLambdaExecutionsInLastMinutes(
      functionName,
      5
    );
    console.log(`   Executions in last 5 minutes: ${executionCount}`);

    if (executionCount > 0) {
      console.log('   ✅ Lambda function has been executed recently');
    } else {
      console.log('   ❌ No recent Lambda executions found');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the example
demonstrateLambdaVerification().catch((error) =>
  console.log('❌ Error:', error.message)
);
