import { Telegraf } from 'telegraf';
import { MinerMetrics } from './types';
/**
 * Pubblica l'analisi sul canale Telegram
 */
export declare function publishAnalysis(bot: Telegraf, opportunities: MinerMetrics[], username?: string): Promise<void>;
/**
 * Invia un messaggio di risposta all'utente
 */
export declare function sendUserResponse(bot: Telegraf, chatId: number, opportunities: MinerMetrics[]): Promise<void>;
//# sourceMappingURL=publisher.d.ts.map