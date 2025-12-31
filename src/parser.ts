import { Miner } from './types';

/**
 * Parser per il testo incollato dal marketplace secondario di GoMining
 * Estrae hashrate, efficienza, prezzo, ROI e ID NFT
 */
export function parseMinersFromText(text: string): Miner[] {
  const miners: Miner[] = [];

  // Dividi il testo in blocchi separati (ogni miner è un blocco)
  // Cerchiamo pattern come "177 TH" o "163.22 TH" per identificare i blocchi
  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    if (!block.trim()) continue;

    try {
      const miner = parseMinerBlock(block);
      if (miner) {
        miners.push(miner);
      }
    } catch (error) {
      // Ignora blocchi che non possono essere parsati
      console.error('Error parsing block:', error);
    }
  }

  return miners;
}

/**
 * Parsa un singolo blocco di testo per estrarre i dati di un miner
 */
function parseMinerBlock(block: string): Miner | null {
  // Estrai hashrate (es. "177 TH" o "163.22 TH")
  const hashrateMatch = block.match(/(\d+(?:[.,]\d+)?)\s*TH/i);
  if (!hashrateMatch) return null;
  const hashrateTh = parseFloat(hashrateMatch[1].replace(',', '.'));

  // Estrai efficienza (es. "28 W/TH" o "16 W/TH")
  const efficiencyMatch = block.match(/(\d+(?:[.,]\d+)?)\s*W\/TH/i);
  if (!efficiencyMatch) return null;
  const efficiencyWPerTh = parseFloat(efficiencyMatch[1].replace(',', '.'));

  // Estrai prezzo in USD (es. "$1,366.59" o "$1366.59")
  const priceMatch = block.match(/\$\s*(\d+(?:[.,]\d+)?)/);
  if (!priceMatch) return null;
  const priceUsd = parseFloat(priceMatch[1].replace(',', '.'));

  // Estrai prezzo per TH (es. "$7.72 / TH" o "$7.72/TH")
  const pricePerThMatch = block.match(/\$\s*(\d+(?:[.,]\d+)?)\s*\/\s*TH/i);
  let pricePerThUsd = 0;
  if (pricePerThMatch) {
    pricePerThUsd = parseFloat(pricePerThMatch[1].replace(',', '.'));
  } else {
    // Se non trovato, calcola dal prezzo totale e hashrate
    pricePerThUsd = priceUsd / hashrateTh;
  }

  // Estrai ROI (opzionale, es. "ROI\n27.43%" o "ROI 27.43%")
  let roi: number | undefined;
  const roiMatch = block.match(/ROI[:\s]*(\d+(?:[.,]\d+)?)\s*%/i);
  if (roiMatch) {
    roi = parseFloat(roiMatch[1].replace(',', '.'));
  }

  // Estrai ID NFT (es. "#7128")
  const idMatch = block.match(/#(\d+)/);
  const id = idMatch ? idMatch[1] : `UNKNOWN_${Date.now()}`;

  return {
    id,
    hashrateTh,
    efficiencyWPerTh,
    priceUsd,
    pricePerThUsd,
    roi,
  };
}
