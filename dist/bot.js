"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoMiningBot = void 0;
const telegraf_1 = require("telegraf");
const config_1 = require("./config");
const parser_1 = require("./parser");
const economics_1 = require("./economics");
const publisher_1 = require("./publisher");
class GoMiningBot {
    constructor() {
        this.userMinRoi = new Map();
        this.bot = new telegraf_1.Telegraf(config_1.config.botToken);
        this.setupHandlers();
    }
    setupHandlers() {
        // Comando /start
        this.bot.command('start', (ctx) => {
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
• Min Hashrate: ${config_1.config.minHashrateTh} TH
• Min ROI: ${config_1.config.minRoi}%
• Max Risultati: ${config_1.config.maxResults}
      `;
            ctx.reply(message);
        });
        // Comando /set_roi
        this.bot.command('set_roi', (ctx) => {
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
            this.userMinRoi.set(ctx.from.id, roi);
            ctx.reply(`✅ Soglia ROI impostata a ${roi}%`);
        });
        // Comando /parse
        this.bot.command('parse', (ctx) => {
            ctx.reply('📝 Incolla il testo dal marketplace di GoMining.\n\nIl bot analizzerà gli NFT e mostrerà le migliori opportunità.');
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
                    ctx.reply('📝 Incolla il testo dal marketplace di GoMining.\n\nIl bot analizzerà gli NFT e mostrerà le migliori opportunità.');
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
                    this.userMinRoi.set(ctx.from.id, -1); // Flag per aspettare il valore
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
• Min Hashrate: ${config_1.config.minHashrateTh} TH
• Min ROI: ${config_1.config.minRoi}%
• Max Risultati: ${config_1.config.maxResults}
          `;
                    ctx.reply(message);
                    return;
                }
                // Se l'utente sta impostando il ROI
                if (this.userMinRoi.get(ctx.from.id) === -1) {
                    const roi = parseInt(ctx.message.text, 10);
                    if (isNaN(roi) || roi < 0) {
                        ctx.reply('❌ Valore ROI non valido. Deve essere un numero positivo.');
                        return;
                    }
                    this.userMinRoi.set(ctx.from.id, roi);
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
                const miners = (0, parser_1.parseMinersFromText)(ctx.message.text);
                if (miners.length === 0) {
                    ctx.reply('❌ Nessun NFT trovato nel testo. Assicurati di incollare il testo corretto dal marketplace.', {
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
                // Calcola le metriche
                const metrics = miners.map((miner) => (0, economics_1.calculateMinerMetrics)(miner));
                // Filtra e ordina le opportunità
                const opportunities = (0, economics_1.filterAndSortOpportunities)(metrics);
                // Pubblica sul canale se ci sono opportunità
                if (opportunities.length > 0) {
                    const username = ctx.from?.username || `User${ctx.from?.id}`;
                    console.log('Publishing analysis by user:', username, 'ID:', ctx.from?.id);
                    await (0, publisher_1.publishAnalysis)(this.bot, opportunities, username);
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
                }
                else {
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
            }
            catch (error) {
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
    async start() {
        console.log('🤖 GoMining NFT Analyzer Bot avviato...');
        await this.bot.launch();
        // Graceful shutdown
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}
exports.GoMiningBot = GoMiningBot;
//# sourceMappingURL=bot.js.map