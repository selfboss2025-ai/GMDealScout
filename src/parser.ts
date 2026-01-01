import { Miner } from './types';

/**
 * Parser per il testo incollato dal marketplace secondario di GoMining
 * Estrae hashrate, efficienza, prezzo, ROI e ID NFT
 */
export function parseMinersFromText(text: string): Miner[] {
  const miners: Miner[] = [];

  // Dividi il testo usando il pattern "miner" come separatore
  const blocks = text.split(/miner/i);
  
  // Rimuovi il primo elemento se vuoto (prima del primo "miner")
  if (blocks[0].trim() === '') {
    blocks.shift();
  }

  for (const block of blocks) {
    if (!block.trim()) continue;

    try {
      const miner = parseMinerBlock('miner' + block); // Aggiungi "miner" all'inizio
      if (miner) {
        miners.push(miner);
      }
    } catch (error) {
      // Ignora blocchi che non possono essere parsati
      console.error('Error parsing block:', block.substring(0, 100), error);
    }
  }

  return miners;
}

/**
 * Parsa un singolo blocco di testo per estrarre i dati di un miner
 */
function parseMinerBlock(block: string): Miner | null {
  console.log('Parsing block:', block.substring(0, 200)); // Debug

  // Estrai ID NFT (es. "#7717")
  const idMatch = block.match(/#(\d+)/);
  if (!idMatch) return null;
  const id = idMatch[1];

  // Estrai hashrate (es. "768 TH") - cerca il primo numero seguito da TH
  const hashrateMatch = block.match(/(\d+(?:[.,]\d+)?)\s*TH/i);
  if (!hashrateMatch) return null;
  const hashrateTh = parseFloat(hashrateMatch[1].replace(',', '.'));

  // Validazione: l'hashrate deve essere ragionevole
  if (hashrateTh <= 0 || hashrateTh > 5000) return null;

  // Estrai efficienza (es. "35 W/TH") - cerca il numero seguito da W/TH
  const efficiencyMatch = block.match(/(\d+(?:[.,]\d+)?)\s*W\/TH/i);
  if (!efficiencyMatch) return null;
  const efficiencyWPerTh = parseFloat(efficiencyMatch[1].replace(',', '.'));

  // Estrai prezzo per TH (es. "$8.71 / TH") - più specifico
  const pricePerThMatch = block.match(/\$(\d+(?:[.,]\d+)?)\s*\/\s*TH/i);
  if (!pricePerThMatch) return null;
  const pricePerThUsd = parseFloat(pricePerThMatch[1].replace(',', '.'));

  // Calcola prezzo totale dal prezzo per TH e hashrate
  const priceUsd = pricePerThUsd * hashrateTh;

  // Estrai ROI (opzionale, es. "ROI29.29%")
  let roi: number | undefined;
  const roiMatch = block.match(/ROI\s*(\d+(?:[.,]\d+)?)\s*%/i);
  if (roiMatch) {
    roi = parseFloat(roiMatch[1].replace(',', '.'));
  }

  console.log('Parsed:', { id, hashrateTh, efficiencyWPerTh, priceUsd, pricePerThUsd, roi }); // Debug

  return {
    id,
    hashrateTh,
    efficiencyWPerTh,
    priceUsd,
    pricePerThUsd: pricePerThUsd,
    roi,
  };
}
