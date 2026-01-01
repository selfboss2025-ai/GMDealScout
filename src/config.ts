import dotenv from 'dotenv';

dotenv.config();

export const config = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  channelChatId: process.env.CHANNEL_CHAT_ID || '',
  minHashrateTh: parseInt(process.env.MIN_HASHRATE_TH || '10', 10),
  minRoi: parseInt(process.env.MIN_ROI || '20', 10),
  maxResults: parseInt(process.env.MAX_RESULTS || '5', 10),
};

// Validate required config
if (!config.botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is required in .env');
}

if (!config.channelChatId) {
  throw new Error('CHANNEL_CHAT_ID is required in .env');
}
