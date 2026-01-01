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

  // Calcola le stelle in base allo sconto (spread negativo)
  let stars = '⭐';
  let rating = '';
  
  if (spreadPct <= -20) {
    stars = '⭐⭐⭐⭐⭐';
    rating = 'Eccezionale!';
  } else if (spreadPct <= -10) {
    stars = '⭐⭐⭐⭐';
    rating = 'Ottimo affare';
  } else if (spreadPct <= -5) {
    stars = '⭐⭐⭐';
    rating = 'Buona occasione';
  } else if (spreadPct <= -1) {
    stars = '⭐⭐';
    rating = 'Conveniente';
  } else if (spreadPct < 0) {
    stars = '⭐';
    rating = 'Leggermente scontato';
  } else {
    stars = '❌';
    rating = 'Non conveniente';
  }

  let analysis = `${index}. 🔹 <b>Miner #${miner.id}</b>\n`;
  analysis += `   <b>Specifiche:</b>\n`;
  analysis += `   • Potenza: ${formatNumber(miner.hashrateTh)} TH\n`;
  analysis += `   • Efficienza attuale: ${formatNumber(miner.efficiencyWPerTh)} W/TH\n`;
  
  analysis += `\n   <b>💰 Prezzo Marketplace:</b>\n`;
  analysis += `   • Prezzo totale: ${formatPrice(miner.priceUsd)}\n`;
  analysis += `   • Prezzo per TH: ${formatPrice(miner.pricePerThUsd)}/TH\n`;
  
  analysis += `\n   <b>🔧 Costo per portare a 15 W/TH:</b>\n`;
  if (upgradeCost > 0) {
    analysis += `   ${formatPrice(upgradeCost)} totali`;
  } else {
    analysis += `   ✅ Nessun costo (già a 15 W/TH)`;
  }

  analysis += `\n\n   <b>📊 Prezzo Equivalente (dopo upgrade):</b>\n`;
  analysis += `   • ${formatPrice(equivalentPricePerTh)}/TH\n`;
  analysis += `   • Prezzo di mercato primario: ${formatPrice(primaryPricePerTh)}/TH\n`;
  analysis += `   ${stars} <b>${rating}</b>\n`;
  analysis += `   Sconto: ${spreadPct > 0 ? '+' : ''}${formatNumber(spreadPct)}%`;

  if (miner.roi) {
    analysis += `\n\n   <b>ROI dichiarato:</b> ${formatNumber(miner.roi)}%`;
  }

  return analysis;
}

/**
 * Genera il messaggio completo di analisi
 */
function generateAnalysisMessage(opportunities: MinerMetrics[], username?: string): string {
  const now = new Date();
  const dateStr = now.toLocaleString('it-IT');

  console.log('Generating message with username:', username); // Debug

  let message = `<b>🔍 ANALISI GOMINING</b>\n`;
  message += `<i>${dateStr}</i>\n`;
  if (username) {
    message += `<b>👤 Analisi di:</b> @${username}\n`;
  }
  message += `${'═'.repeat(40)}\n\n`;

  if (opportunities.length === 0) {
    message += '❌ Nessuna opportunità trovata con i criteri attuali.\n';
    return message;
  }

  opportunities.forEach((metric, index) => {
    message += formatMinerAnalysis(metric, index + 1);
    if (index < opportunities.length - 1) {
      message += '\n\n' + '─'.repeat(40) + '\n\n';
    } else {
      message += '\n\n';
    }
  });

  message += `${'═'.repeat(40)}\n`;
  message += `<b>📊 Totale opportunità: ${opportunities.length}</b>`;

  return message;
}

/**
 * Pubblica l'analisi sul canale Telegram
 */
export async function publishAnalysis(
  bot: Telegraf,
  opportunities: MinerMetrics[],
  username?: string
): Promise<void> {
  // Pubblica solo se ci sono opportunità
  if (opportunities.length === 0) {
    console.log('No opportunities found, skipping publication');
    return;
  }

  const message = generateAnalysisMessage(opportunities, username);

  try {
    await bot.telegram.sendMessage(config.channelChatId, message, {
      parse_mode: 'HTML',
    });
    console.log(`Published ${opportunities.length} opportunities to channel by ${username || 'unknown'}`);
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
