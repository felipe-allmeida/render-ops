// Simple wrapper to run the seed script
console.log('Starting seed wrapper...');

async function run() {
  try {
    console.log('Importing seed module...');
    // Dynamic import for ESM
    const tsx = await import('tsx/esm/api');
    console.log('TSX loaded, running seed...');

    // We'll run it directly using child process
    const { spawn } = require('child_process');

    const child = spawn('npx', ['tsx', 'scripts/seed-ecommerce.ts'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      console.log(`Seed process exited with code ${code}`);
    });

    child.on('error', (err) => {
      console.error('Failed to start seed process:', err);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
