import { Miner, MinerMetrics } from './types';
/**
 * Ottiene il prezzo di riferimento del primary market usando la tabella ufficiale GoMining
 */
export declare function getPrimaryPricePerTh(hashrateTh: number): number;
/**
 * Calcola tutte le metriche economiche per un miner
 */
export declare function calculateMinerMetrics(miner: Miner): MinerMetrics;
/**
 * Filtra e ordina le metriche per trovare le migliori opportunità
 */
export declare function filterAndSortOpportunities(metrics: MinerMetrics[]): MinerMetrics[];
//# sourceMappingURL=economics.d.ts.map