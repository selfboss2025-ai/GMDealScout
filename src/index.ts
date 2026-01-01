import { GoMiningBot } from './bot';

async function main(): Promise<void> {
  try {
    const bot = new GoMiningBot();
    await bot.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
