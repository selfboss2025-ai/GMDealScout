import { Telegraf, Context } from 'telegraf';
import { config } from './config';
import { parseMinersFromText } from './parser';
import { calculateMinerMetrics, filterAndSortOpportunities } from './economics';
import { publishAnalysis, sendUserResponse } from './publisher';

// Lista utenti autorizzati (aggiungi i tuoi Telegram ID)
const AUTHORIZED_USERS = [
  // 123456789,  // Aggiungi qui i tuoi Telegram ID
  // 987654321,  // Esempio: ID di altri utenti autorizzati
];

export class GoMiningBot {
  private bot: Telegraf;
  private userMinRoi: Map<number, number> = new Map();
  private rateLimiter: Map<number, number[]> = new Map(); // Rate limiting

  constructor() {
    this.bot = new Telegraf(config.botToken);
    this.setupHandlers();
  }

  /**
   * Verifica se l'utente è autorizzato
   */
  private isAuthorized(userId: number): boolean {
    // Se la whitelist è vuota, permetti a tutti (per retrocompatibilità)
    if (AUTHORIZED_USERS.length === 0) return true;
    return AUTHORIZED_USERS.includes(userId);
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

  /**
   * Middleware di sicurezza
   */
  private securityCheck(ctx: Context): boolean {
    const userId = ctx.from?.id;
    if (!userId) return false;

    // Verifica autorizzazione
    if (!this.isAuthorized(userId)) {
      ctx.reply('❌ Non sei autorizzato a usare questo bot.');
      console.log(`Unauthorized access attempt from user ${userId} (@${ctx.from?.username})`);
      return false;
    }

    // Verifica rate limiting
    if (!this.checkRateLimit(userId)) {
      ctx.reply('⏳ Troppe richieste. Riprova tra un minuto.');
      console.log(`Rate limit exceeded for user ${userId} (@${ctx.from?.username})`);
      return false;
    }

    return true;
  }

  constructor() {
    this.bot = new Telegraf(config.botToken);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Comando /start
    this.bot.command('start', (ctx) => {
      if (!this.securityCheck(ctx)) return;

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
      if (!this.securityCheck(ctx)) return;

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
      if (!this.securityCheck(ctx)) return;

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
      ctx.reply(`✅ Soglia ROI impostata a ${roi}%`);
    });

    // Comando /parse
    this.bot.command('parse', (ctx) => {
      if (!this.securityCheck(ctx)) return;

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

        // Gestisci i bottoni
        if (ctx.message.text === '📝 Analizza NFT') {
          ctx.reply(
            '📝 Incolla il testo dal marketplace di GoMining.\n\nIl bot analizzerà gli NFT e mostrerà le migliori opportunità.'
          );
          return;
        }

        if (ctx.message.text === '⚙️ Imposta ROI') {
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
          this.userMinRoi.set(ctx.from!.id, -1); // Flag per aspettare il valore
          return;
        }

        if (ctx.message.text === '📚 Aiuto') {
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

        // Parsa il testo
        const miners = parseMinersFromText(ctx.message.text);

        if (miners.length === 0) {
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

        // Filtra e ordina le opportunità
        const opportunities = filterAndSortOpportunities(metrics);

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
        ctx.reply('❌ Errore durante l\'analisi. Riprova con un testo valido.');
      }
    });

    // Error handler
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
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
