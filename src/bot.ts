import { Telegraf, Context } from 'telegraf';
import { config } from './config';
import { parseMinersFromText } from './parser';
import { calculateMinerMetrics, filterAndSortOpportunities } from './economics';
import { publishAnalysis, sendUserResponse } from './publisher';

// ID dell'admin del bot (sostituisci con il tuo Telegram ID)
const ADMIN_USER_ID = 112983744; // ID di Luca

export class GoMiningBot {
  private bot: Telegraf;
  private userMinRoi: Map<number, number> = new Map();
  private rateLimiter: Map<number, number[]> = new Map();
  private activityLog: Array<{
    timestamp: Date;
    userId: number;
    username?: string;
    firstName?: string;
    action: string;
    details?: string;
  }> = [];

  constructor() {
    this.bot = new Telegraf(config.botToken);
    this.setupHandlers();
  }

  /**
   * Registra l'attività dell'utente
   */
  private logActivity(ctx: Context, action: string, details?: string): void {
    const logEntry = {
      timestamp: new Date(),
      userId: ctx.from!.id,
      username: ctx.from!.username,
      firstName: ctx.from!.first_name,
      action,
      details
    };
    
    this.activityLog.push(logEntry);
    
    // Mantieni solo gli ultimi 100 log per evitare memory leak
    if (this.activityLog.length > 100) {
      this.activityLog.shift();
    }
    
    // Log in console per Northflank
    console.log(`[${logEntry.timestamp.toISOString()}] User ${logEntry.userId} (@${logEntry.username}) - ${action}${details ? `: ${details}` : ''}`);
  }

  /**
   * Rate limiting: max 5 richieste per minuto per utente
   */
  private checkRateLimit(userId: number): boolean {
    const now = Date.now();
    const userRequests = this.rateLimiter.get(userId) || [];
    
    // Rimuovi richieste più vecchie di 1 minuto
    const recentRequests = userRequests.filter(time => now - time < 60000);
    
    if (recentRequests.length >= 5) {
      return false; // Rate limit superato
    }
    
    recentRequests.push(now);
    this.rateLimiter.set(userId, recentRequests);
    return true;
  }

  private setupHandlers(): void {
    // Comando ADMIN - Solo per l'admin del bot
    this.bot.command('admin', (ctx) => {
      if (ctx.from!.id !== ADMIN_USER_ID) {
        this.logActivity(ctx, 'UNAUTHORIZED_ADMIN_ACCESS');
        return; // Ignora silenziosamente
      }

      this.logActivity(ctx, 'ADMIN_COMMAND');

      const now = new Date();
      const last24h = this.activityLog.filter(log => 
        now.getTime() - log.timestamp.getTime() < 24 * 60 * 60 * 1000
      );

      let report = `🔒 <b>ADMIN REPORT</b>\n`;
      report += `📅 Ultimi 24h: ${last24h.length} attività\n`;
      report += `👥 Utenti unici: ${new Set(last24h.map(l => l.userId)).size}\n\n`;

      // Statistiche per azione
      const actionStats = last24h.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      report += `📊 <b>Azioni:</b>\n`;
      Object.entries(actionStats).forEach(([action, count]) => {
        report += `• ${action}: ${count}\n`;
      });

      // Ultimi 10 log
      report += `\n📝 <b>Ultimi 10 log:</b>\n`;
      const recent = this.activityLog.slice(-10).reverse();
      recent.forEach(log => {
        const time = log.timestamp.toLocaleTimeString('it-IT');
        const user = log.username ? `@${log.username}` : log.firstName || 'Unknown';
        report += `${time} - ${user} (${log.userId}): ${log.action}\n`;
      });

      ctx.reply(report, { parse_mode: 'HTML' });
    });

    // Comando /start
    this.bot.command('start', (ctx) => {
      this.logActivity(ctx, 'START_COMMAND');

      if (!this.checkRateLimit(ctx.from!.id)) {
        ctx.reply('⏳ Troppe richieste. Riprova tra un minuto.');
        this.logActivity(ctx, 'RATE_LIMITED');
        return;
      }

      const message = `
👋 Benvenuto nel GoMining NFT Analyzer Bot!

Questo bot analizza le opportunità di acquisto di NFT miner su GoMining basandosi su dati che incoli manualmente.

📋 Comandi disponibili:
/parse - Incolla il testo dal marketplace e analizza gli NFT
/set_roi <valore> - Imposta la soglia ROI minima (default: 20%)
/help - Mostra questa guida

📌 Come usare:
1. Copia il testo dal marketplace secondario di GoMining (app.gomining.com/marketplace)
2. Usa /parse e incolla il testo
3. Il bot analizzerà gli NFT e mostrerà le migliori opportunità

💡 Il bot calcola:
• Prezzo equivalente a 15 W/TH (standard GoMining)
• Prezzo per TH equivalente
• Prezzo di riferimento del primary market
• Spread corretto (% rispetto al primary)
• ROI dichiarato (se presente)

✅ Vengono mostrate solo le opportunità con spread < 0 (sconto)
      `;
      ctx.reply(message, {
        reply_markup: {
          keyboard: [
            [{ text: '📝 Analizza NFT' }, { text: '⚙️ Imposta ROI' }],
            [{ text: '📚 Aiuto' }],
          ],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      });
    });

    // Comando /help
    this.bot.command('help', (ctx) => {
      this.logActivity(ctx, 'HELP_COMMAND');

      const message = `
📚 Guida del Bot

/parse - Analizza il testo incollato
/set_roi <valore> - Imposta soglia ROI (es: /set_roi 25)
/start - Mostra il messaggio di benvenuto

📊 Cosa fa il bot:
1. Estrae hashrate, efficienza, prezzo e ROI dal testo
2. Calcola il costo per portare ogni NFT a 15 W/TH
3. Calcola il prezzo equivalente e lo spread rispetto al primary market
4. Filtra le migliori opportunità (spread < 0)
5. Pubblica i risultati sul canale

⚙️ Configurazione attuale:
• Min Hashrate: ${config.minHashrateTh} TH
• Min ROI: ${config.minRoi}%
• Max Risultati: ${config.maxResults}
      `;
      ctx.reply(message);
    });

    // Comando /set_roi
    this.bot.command('set_roi', (ctx) => {
      this.logActivity(ctx, 'SET_ROI_COMMAND');

      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        ctx.reply('Uso: /set_roi <valore>\nEsempio: /set_roi 25');
        return;
      }

      const roi = parseInt(args[1], 10);
      if (isNaN(roi) || roi < 0) {
        ctx.reply('❌ Valore ROI non valido. Deve essere un numero positivo.');
        return;
      }

      this.userMinRoi.set(ctx.from!.id, roi);
      this.logActivity(ctx, 'ROI_SET', `ROI: ${roi}%`);
      ctx.reply(`✅ Soglia ROI impostata a ${roi}%`);
    });

    // Comando /parse
    this.bot.command('parse', (ctx) => {
      this.logActivity(ctx, 'PARSE_COMMAND');
      ctx.reply(
        '📝 Incolla il testo dal marketplace di GoMining.\n\nIl bot analizzerà gli NFT e mostrerà le migliori opportunità.'
      );
    });

    // Handler per il testo incollato
    this.bot.on('text', async (ctx) => {
      try {
        // Ignora i comandi
        if (ctx.message.text.startsWith('/')) {
          return;
        }

        // Rate limiting
        if (!this.checkRateLimit(ctx.from!.id)) {
          ctx.reply('⏳ Troppe richieste. Riprova tra un minuto.');
          this.logActivity(ctx, 'RATE_LIMITED');
          return;
        }

        // Gestisci i bottoni
        if (ctx.message.text === '📝 Analizza NFT') {
          this.logActivity(ctx, 'BUTTON_ANALYZE');
          ctx.reply(
            '📝 Incolla il testo dal marketplace di GoMining.\n\nIl bot analizzerà gli NFT e mostrerà le migliori opportunità.',
            {
              reply_markup: {
                keyboard: [
                  [{ text: '📝 Analizza NFT' }, { text: '⚙️ Imposta ROI' }],
                  [{ text: '📚 Aiuto' }],
                ],
                resize_keyboard: true,
                one_time_keyboard: false,
              },
            }
          );
          return;
        }

        if (ctx.message.text === '⚙️ Imposta ROI') {
          this.logActivity(ctx, 'BUTTON_SET_ROI');
          ctx.reply('Scrivi il valore ROI desiderato (es: 25)', {
            reply_markup: {
              keyboard: [
                [{ text: '📝 Analizza NFT' }, { text: '⚙️ Imposta ROI' }],
                [{ text: '📚 Aiuto' }],
              ],
              resize_keyboard: true,
              one_time_keyboard: false,
            },
          });
          this.userMinRoi.set(ctx.from!.id, -1);
          return;
        }

        if (ctx.message.text === '📚 Aiuto') {
          this.logActivity(ctx, 'BUTTON_HELP');
          const message = `
📚 Guida del Bot

/parse - Analizza il testo incollato
/set_roi <valore> - Imposta soglia ROI (es: /set_roi 25)
/start - Mostra il messaggio di benvenuto

📊 Cosa fa il bot:
1. Estrae hashrate, efficienza, prezzo e ROI dal testo
2. Calcola il costo per portare ogni NFT a 15 W/TH
3. Calcola il prezzo equivalente e lo spread rispetto al primary market
4. Filtra le migliori opportunità (spread < 0)
5. Pubblica i risultati sul canale

⚙️ Configurazione attuale:
• Min Hashrate: ${config.minHashrateTh} TH
• Min ROI: ${config.minRoi}%
• Max Risultati: ${config.maxResults}
          `;
          ctx.reply(message);
          return;
        }

        // Se l'utente sta impostando il ROI
        if (this.userMinRoi.get(ctx.from!.id) === -1) {
          const roi = parseInt(ctx.message.text, 10);
          if (isNaN(roi) || roi < 0) {
            ctx.reply('❌ Valore ROI non valido. Deve essere un numero positivo.');
            return;
          }
          this.userMinRoi.set(ctx.from!.id, roi);
          this.logActivity(ctx, 'ROI_SET_BUTTON', `ROI: ${roi}%`);
          ctx.reply(`✅ Soglia ROI impostata a ${roi}%`, {
            reply_markup: {
              keyboard: [
                [{ text: '📝 Analizza NFT' }, { text: '⚙️ Imposta ROI' }],
                [{ text: '📚 Aiuto' }],
              ],
              resize_keyboard: true,
              one_time_keyboard: false,
            },
          });
          return;
        }

        await ctx.reply('⏳ Analizzando i dati...');
        this.logActivity(ctx, 'NFT_ANALYSIS_START', `Text length: ${ctx.message.text.length}`);

        // Parsa il testo
        const miners = parseMinersFromText(ctx.message.text);

        if (miners.length === 0) {
          this.logActivity(ctx, 'NFT_ANALYSIS_FAILED', 'No NFTs found');
          ctx.reply(
            '❌ Nessun NFT trovato nel testo. Assicurati di incollare il testo corretto dal marketplace.',
            {
              reply_markup: {
                keyboard: [
                  [{ text: '📝 Analizza NFT' }, { text: '⚙️ Imposta ROI' }],
                  [{ text: '📚 Aiuto' }],
                ],
                resize_keyboard: true,
                one_time_keyboard: false,
              },
            }
          );
          return;
        }

        // Calcola le metriche
        const metrics = miners.map((miner) => calculateMinerMetrics(miner));
        const opportunities = filterAndSortOpportunities(metrics);

        this.logActivity(ctx, 'NFT_ANALYSIS_SUCCESS', `Found ${miners.length} NFTs, ${opportunities.length} opportunities`);

        // Pubblica sul canale se ci sono opportunità
        if (opportunities.length > 0) {
          await publishAnalysis(this.bot, opportunities);
          ctx.reply(`✅ Analisi completata! ${opportunities.length} opportunità pubblicate sul canale.`, {
            reply_markup: {
              keyboard: [
                [{ text: '📝 Analizza NFT' }, { text: '⚙️ Imposta ROI' }],
                [{ text: '📚 Aiuto' }],
              ],
              resize_keyboard: true,
              one_time_keyboard: false,
            },
          });
        } else {
          ctx.reply('ℹ️ Nessuna opportunità trovata con i criteri attuali.', {
            reply_markup: {
              keyboard: [
                [{ text: '📝 Analizza NFT' }, { text: '⚙️ Imposta ROI' }],
                [{ text: '📚 Aiuto' }],
              ],
              resize_keyboard: true,
              one_time_keyboard: false,
            },
          });
        }
      } catch (error) {
        console.error('Error processing text:', error);
        this.logActivity(ctx, 'ERROR', `${error}`);
        ctx.reply('❌ Errore durante l\'analisi. Riprova con un testo valido.');
      }
    });

    // Error handler
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
      this.logActivity(ctx, 'BOT_ERROR', `${err}`);
      ctx.reply('❌ Si è verificato un errore. Riprova più tardi.');
    });
  }

  public async start(): Promise<void> {
    console.log('🤖 GoMining NFT Analyzer Bot avviato...');
    await this.bot.launch();

    // Graceful shutdown
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }
}