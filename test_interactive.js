const { spawn } = require('child_process');
const path = require('path');

// Interactive test script
const testInteractiveMode = () => {
  console.log('🧪 Testing Interactive Mode with RPC Configuration...');

  const process = spawn('tributary', ['init', '--interactive', '--force'], {
    cwd: 'C:\\tmp',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let step = 0;
  const responses = [
    'InteractiveTestProject\n',           // Project name
    'So11111111111111111111111111111111111111112\n', // Base token
    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU\n', // Admin wallet
    '\n',                                 // Network (use default - devnet)
    'y\n',                               // Configure custom RPC? Yes
    'https://custom-devnet.example.com\n', // Custom devnet RPC
    '\n',                                // Testnet RPC (empty for default)
    'https://custom-mainnet.example.com\n' // Custom mainnet RPC
  ];

  process.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('📤 OUTPUT:', output);

    if (step < responses.length) {
      setTimeout(() => {
        console.log('📥 SENDING:', responses[step].trim() || '(empty)');
        process.stdin.write(responses[step]);
        step++;
      }, 500);
    }
  });

  process.stderr.on('data', (data) => {
    console.log('❌ ERROR:', data.toString());
  });

  process.on('close', (code) => {
    console.log(`✅ Process finished with code: ${code}`);
  });

  // Timeout after 30 seconds
  setTimeout(() => {
    console.log('⏰ Test timeout - killing process');
    process.kill();
  }, 30000);
};

testInteractiveMode();