import { Miner, MinerMetrics } from './types';
import { config } from './config';

const STANDARD_EFFICIENCY_W_PER_TH = 15;
const UPGRADE_COST_PER_W_PER_TH = 1; // USD per TH per W

/**
 * Calcola il costo per portare un miner a 15 W/TH
 * Formula: hashrate * max(0, efficienza - 15) * 1 USD/TH/W
 */
function calculateUpgradeCost(hashrateTh: number, efficiencyWPerTh: number): number {
  const wDifference = Math.max(0, efficiencyWPerTh - STANDARD_EFFICIENCY_W_PER_TH);
  return hashrateTh * wDifference * UPGRADE_COST_PER_W_PER_TH;
}

/**
 * Calcola il prezzo equivalente a 15 W/TH
 */
function calculateEquivalentPrice(priceUsd: number, upgradeCost: number): number {
  return priceUsd + upgradeCost;
}

/**
 * Calcola il prezzo per TH equivalente
 */
function calculateEquivalentPricePerTh(equivalentPrice: number, hashrateTh: number): number {
  return equivalentPrice / hashrateTh;
}

/**
 * Ottiene il prezzo di riferimento del primary market usando interpolazione logaritmica
 * Formula: 21.61 - 0.558 * ln(TH)
 * Basato su dati reali del primary market GoMining
 */
export function getPrimaryPricePerTh(hashrateTh: number): number {
  const th = Math.max(1, hashrateTh); // Evita log(0)
  return 21.61 - 0.558 * Math.log(th);
}

/**
 * Calcola lo spread corretto in percentuale
 * Formula: ((equivalentPricePerTh - primaryPricePerTh) / primaryPricePerTh) * 100
 */
function calculateSpreadPct(equivalentPricePerTh: number, primaryPricePerTh: number): number {
  return ((equivalentPricePerTh - primaryPricePerTh) / primaryPricePerTh) * 100;
}

/**
 * Calcola tutte le metriche economiche per un miner
 */
export function calculateMinerMetrics(miner: Miner): MinerMetrics {
  const upgradeCost = calculateUpgradeCost(miner.hashrateTh, miner.efficiencyWPerTh);
  const equivalentPrice = calculateEquivalentPrice(miner.priceUsd, upgradeCost);
  const equivalentPricePerTh = calculateEquivalentPricePerTh(equivalentPrice, miner.hashrateTh);
  const primaryPricePerTh = getPrimaryPricePerTh(miner.hashrateTh);
  const spreadPct = calculateSpreadPct(equivalentPricePerTh, primaryPricePerTh);

  // Un'opportunità è quando:
  // 1. Spread < 0 (sconto rispetto al primary)
  // 2. Hashrate >= MIN_HASHRATE_TH
  // 3. ROI >= MIN_ROI (se presente)
  const isOpportunity =
    spreadPct < 0 &&
    miner.hashrateTh >= config.minHashrateTh &&
    (!miner.roi || miner.roi >= config.minRoi);

  return {
    miner,
    upgradeCost,
    equivalentPrice,
    equivalentPricePerTh,
    primaryPricePerTh,
    spreadPct,
    isOpportunity,
  };
}

/**
 * Filtra e ordina le metriche per trovare le migliori opportunità
 */
export function filterAndSortOpportunities(metrics: MinerMetrics[]): MinerMetrics[] {
  return metrics
    .filter((m) => m.isOpportunity)
    .sort((a, b) => a.spreadPct - b.spreadPct) // Ordina per spread più negativo (massimo sconto)
    .slice(0, config.maxResults);
}
