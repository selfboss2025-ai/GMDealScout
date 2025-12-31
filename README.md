# GoMining NFT Analyzer Bot

Un bot Telegram che analizza le opportunità di acquisto di NFT miner su GoMining basandosi su dati incollati manualmente dall'utente.

## ⚠️ Avvertenza Importante

**Questo bot richiede input manuale. Non effettua scraping automatico.**

L'utente deve copiare manualmente il testo dal marketplace secondario di GoMining (app.gomining.com/marketplace) e incollarlo nel bot usando il comando `/parse`.

## 🎯 Funzionalità

- **Parsing del testo**: Estrae automaticamente hashrate, efficienza, prezzo, ROI e ID NFT dal testo incollato
- **Calcoli economici avanzati**:
  - Costo per portare ogni NFT a 15 W/TH (standard GoMining)
  - Prezzo equivalente e prezzo per TH
  - Prezzo di riferimento del primary market (interpolazione logaritmica)
  - Spread corretto rispetto al primary market
- **Filtro intelligente**: Mostra solo le migliori opportunità (spread < 0, ROI > soglia)
- **Pubblicazione su canale**: Pubblica automaticamente i risultati su un canale Telegram

## 🔧 Stack Tecnico

- **Linguaggio**: TypeScript (Node.js ≥18)
- **Librerie**:
  - `telegraf` - Framework Telegram
  - `dotenv` - Gestione variabili d'ambiente
- **Hosting**: Compatibile con Railway, Render, Node hosting gratuito

## 📋 Prerequisiti

- Node.js ≥ 18
- Un bot Telegram (ottieni il token da [@BotFather](https://t.me/botfather))
- Un canale Telegram dove pubblicare i risultati

## 🚀 Installazione

1. **Clona il repository** (o copia i file)

2. **Installa le dipendenze**:
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente**:
   ```bash
   cp .env.example .env
   ```

4. **Modifica il file `.env`** con i tuoi dati:
   ```env
   TELEGRAM_BOT_TOKEN=8588630239:AAGkuLS2R_GaNpG_yzam01TEzqREhpSuj7Q
   CHANNEL_CHAT_ID=-1003591307665
   MIN_HASHRATE_TH=10
   MIN_ROI=20
   MAX_RESULTS=5
   ```

## 📝 Configurazione

### Variabili d'ambiente

| Variabile | Descrizione | Default |
|-----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Token del bot Telegram (obbligatorio) | - |
| `CHANNEL_CHAT_ID` | ID del canale dove pubblicare (obbligatorio) | - |
| `MIN_HASHRATE_TH` | Hashrate minimo in TH | 10 |
| `MIN_ROI` | ROI minimo in % | 20 |
| `MAX_RESULTS` | Numero massimo di risultati da mostrare | 5 |

### Come ottenere CHANNEL_CHAT_ID

1. Crea un canale Telegram privato
2. Aggiungi il bot al canale come amministratore
3. Invia un messaggio nel canale
4. Usa questo comando per ottenere l'ID:
   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
5. Cerca il `chat` object nel JSON e copia l'`id` (sarà negativo, es: `-1003591307665`)

## 🏃 Avvio

### Modalità sviluppo
```bash
npm run dev
```

### Build per produzione
```bash
npm run build
npm start
```

## 📖 Comandi del Bot

| Comando | Descrizione |
|---------|-------------|
| `/start` | Mostra il messaggio di benvenuto e le istruzioni |
| `/parse` | Attiva la modalità di parsing (incolla il testo dopo) |
| `/set_roi <valore>` | Imposta la soglia ROI minima (es: `/set_roi 25`) |
| `/help` | Mostra la guida completa |

## 📊 Esempio di Input

Copia il testo dal marketplace di GoMining e incollalo nel bot:

```
177 TH
28 W/TH
ROI
27.43%
$1,366.59
$7.72 / TH
#7128

163.22 TH
16 W/TH
ROI
35.21%
$1,234.56
$7.56 / TH
#7129
```

## 📤 Esempio di Output

```
🔍 ANALISI GOMINING — 31/12/2025, 14:30:45

========================================

1. 🔹 #7129
   • 163.22 TH | 16 W/TH → (upgrade: +$163.22)
   • Prezzo equivalente: $8.50/TH
   • Primary reference (163.22 TH): $9.50/TH
   🟢 Spread: -10.5% → OTTIMA OCCASIONE!
   • ROI dichiarato: 35.21%

2. 🔹 #7128
   • 177 TH | 28 W/TH → (upgrade: +$2,301)
   • Prezzo equivalente: $20.72/TH
   • Primary reference (177 TH): $18.72/TH
   🔴 Spread: +10.7% → NON conveniente
   • ROI dichiarato: 27.43%

========================================
📊 Totale opportunità: 1
```

## 🧮 Formule Economiche

### Costo di upgrade a 15 W/TH
```
upgradeCost = hashrate * max(0, efficienza - 15) * 1 USD/TH/W
```

### Prezzo equivalente
```
equivalentPrice = priceUsd + upgradeCost
equivalentPricePerTh = equivalentPrice / hashrate
```

### Prezzo primario di riferimento (interpolazione logaritmica)
```
primaryPricePerTh = 21.61 - 0.558 * ln(hashrate)
```

### Spread corretto
```
spreadPct = ((equivalentPricePerTh - primaryPricePerTh) / primaryPricePerTh) * 100
```

## 🌐 Deploy su Railway/Render

### Railway

1. Crea un account su [Railway](https://railway.app)
2. Connetti il tuo repository GitHub
3. Aggiungi le variabili d'ambiente nel dashboard
4. Deploy automatico

### Render

1. Crea un account su [Render](https://render.com)
2. Crea un nuovo "Web Service"
3. Connetti il tuo repository
4. Imposta il comando di build: `npm install && npm run build`
5. Imposta il comando di start: `npm start`
6. Aggiungi le variabili d'ambiente
7. Deploy

## 📁 Struttura del Progetto

```
src/
├── index.ts          # Entry point
├── bot.ts            # Logica principale del bot
├── parser.ts         # Parser del testo
├── economics.ts      # Calcoli economici
├── publisher.ts      # Pubblicazione su Telegram
├── config.ts         # Configurazione
└── types.ts          # Interfacce TypeScript

package.json          # Dipendenze
tsconfig.json         # Configurazione TypeScript
.env.example          # Esempio di configurazione
README.md             # Questo file
```

## 🔍 Dettagli Tecnici

### Parser

Il parser utilizza espressioni regolari flessibili per estrarre:
- **Hashrate**: Pattern `(\d+(?:[.,]\d+)?)\s*TH`
- **Efficienza**: Pattern `(\d+(?:[.,]\d+)?)\s*W\/TH`
- **Prezzo**: Pattern `\$\s*(\d+(?:[.,]\d+)?)`
- **Prezzo per TH**: Pattern `\$\s*(\d+(?:[.,]\d+)?)\s*\/\s*TH`
- **ROI**: Pattern `ROI[:\s]*(\d+(?:[.,]\d+)?)\s*%`
- **ID NFT**: Pattern `#(\d+)`

Supporta sia virgola che punto come separatore decimale.

### Calcoli Economici

- **Upgrade cost**: Basato sulla differenza tra efficienza attuale e 15 W/TH
- **Primary price**: Interpolazione logaritmica basata su dati reali del primary market
- **Spread**: Percentuale di differenza tra prezzo equivalente e primary price

### Filtri

Un'opportunità è considerata valida se:
1. Spread < 0 (sconto rispetto al primary)
2. Hashrate >= MIN_HASHRATE_TH
3. ROI >= MIN_ROI (se presente)

## 🐛 Troubleshooting

### Il bot non risponde
- Verifica che il token sia corretto
- Assicurati che il bot sia stato aggiunto al canale
- Controlla i log per errori

### Nessun NFT trovato
- Verifica che il testo sia copiato correttamente dal marketplace
- Assicurati che il formato sia valido (hashrate in TH, efficienza in W/TH, prezzo in USD)

### Errore di pubblicazione sul canale
- Verifica che l'ID del canale sia corretto
- Assicurati che il bot sia amministratore del canale
- Controlla i permessi del bot

## 📄 Licenza

MIT

## 🤝 Contributi

I contributi sono benvenuti! Senti libero di aprire issue o pull request.

## 📞 Supporto

Per domande o problemi, apri un issue nel repository.
