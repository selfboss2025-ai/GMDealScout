export interface Miner {
  id: string;
  hashrateTh: number;
  efficiencyWPerTh: number;
  priceUsd: number;
  pricePerThUsd: number;
  roi?: number;
}

export interface MinerMetrics {
  miner: Miner;
  upgradeCost: number;
  equivalentPrice: number;
  equivalentPricePerTh: number;
  primaryPricePerTh: number;
  spreadPct: number;
  isOpportunity: boolean;
}
