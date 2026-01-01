"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    channelChatId: process.env.CHANNEL_CHAT_ID || '',
    minHashrateTh: parseInt(process.env.MIN_HASHRATE_TH || '10', 10),
    minRoi: parseInt(process.env.MIN_ROI || '20', 10),
    maxResults: parseInt(process.env.MAX_RESULTS || '5', 10),
};
// Validate required config
if (!exports.config.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required in .env');
}
if (!exports.config.channelChatId) {
    throw new Error('CHANNEL_CHAT_ID is required in .env');
}
//# sourceMappingURL=config.js.map