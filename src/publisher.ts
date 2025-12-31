import { Telegraf } from 'telegraf';
import { MinerMetrics } from './types';
import { config } from './config';

/**
 * Formatta un numero con 2 decimali
 */
function formatNumber(num: number): string {
  return num.toFixed(2);
}

/**
 * Formatta il prezzo in USD
 */
function formatPrice(price: number): string {
  return `$${formatNumber(price)}`;
}

/**
 * Genera il messaggio di analisi per un singolo miner
 */
function formatMinerAnalysis(metric: MinerMetrics, index: number): string {
  const { miner, upgradeCost, equivalentPricePerTh, primaryPricePerTh, spreadPct } = metric;

  const spreadEmoji = spreadPct < -10 ? '🟢' : spreadPct < 0 ? '🟡' : '🔴';
  const spreadLabel = spreadPct < 0 ? 'OTTIMA OCCASIONE!' : 'NON conveniente';

  let analysis = `${index}. 🔹 #${miner.id}\n`;
  analysis += `   • ${formatNumber(miner.hashrateTh)} TH | ${formatNumber(miner.efficiencyWPerTh)} W/TH`;

  if (upgradeCost > 0) {
    analysis += ` → (upgrade: +${formatPrice(upgradeCost)})`;
  }

  analysis += `\n   • Prezzo equivalente: ${formatPrice(equivalentPricePerTh)}/TH\n`;
  analysis += `   • Primary reference (${formatNumber(miner.hashrateTh)} TH): ${formatPrice(primaryPricePerTh)}/TH\n`;
  analysis += `   ${spreadEmoji} Spread: ${spreadPct > 0 ? '+' : ''}${formatNumber(spreadPct)}% → ${spreadLabel}`;

  if (miner.roi) {
    analysis += `\n   • ROI dichiarato: ${formatNumber(miner.roi)}%`;
  }

  return analysis;
}

/**
 * Genera il messaggio completo di analisi
 */
function generateAnalysisMessage(opportunities: MinerMetrics[]): string {
  const now = new Date();
  const dateStr = now.toLocaleString('it-IT');

  let message = `🔍 ANALISI GOMINING — ${dateStr}\n`;
  message += `${'='.repeat(40)}\n\n`;

  if (opportunities.length === 0) {
    message += '❌ Nessuna opportunità trovata con i criteri attuali.\n';
    return message;
  }

  opportunities.forEach((metric, index) => {
    message += formatMinerAnalysis(metric, index + 1);
    message += '\n\n';
  });

  message += `${'='.repeat(40)}\n`;
  message += `📊 Totale opportunità: ${opportunities.length}`;

  return message;
}

/**
 * Pubblica l'analisi sul canale Telegram
 */
export async function publishAnalysis(
  bot: Telegraf,
  opportunities: MinerMetrics[]
): Promise<void> {
  // Pubblica solo se ci sono opportunità
  if (opportunities.length === 0) {
    console.log('No opportunities found, skipping publication');
    return;
  }

  const message = generateAnalysisMessage(opportunities);

  try {
    await bot.telegram.sendMessage(config.channelChatId, message, {
      parse_mode: 'HTML',
    });
    console.log(`Published ${opportunities.length} opportunities to channel`);
  } catch (error) {
    console.error('Error publishing to channel:', error);
    throw error;
  }
}

/**
 * Invia un messaggio di risposta all'utente
 */
export async function sendUserResponse(
  bot: Telegraf,
  chatId: number,
  opportunities: MinerMetrics[]
): Promise<void> {
  const message = generateAnalysisMessage(opportunities);

  try {
    await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('Error sending user response:', error);
    throw error;
  }
}
