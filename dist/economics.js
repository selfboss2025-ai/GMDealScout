"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrimaryPricePerTh = getPrimaryPricePerTh;
exports.calculateMinerMetrics = calculateMinerMetrics;
exports.filterAndSortOpportunities = filterAndSortOpportunities;
const config_1 = require("./config");
const STANDARD_EFFICIENCY_W_PER_TH = 15;
/**
 * Calcola il costo per portare un miner a 15 W/TH
 * Usa i prezzi per step dalla tabella GoMining:
 * - 29+ W/TH: $0.72 per TH
 * - 21-28 W/TH: $1.53 per TH
 * - 16-20 W/TH: $1.14 per TH
 * - ≤15 W/TH: $0 (già al target)
 */
function calculateUpgradeCost(currentWth, hashrateTh) {
    if (currentWth <= STANDARD_EFFICIENCY_W_PER_TH)
        return 0;
    let totalCostPerTh = 0;
    const steps = Math.ceil(currentWth) - STANDARD_EFFICIENCY_W_PER_TH;
    for (let i = 1; i <= steps; i++) {
        const w = Math.ceil(currentWth) - i + 1;
        if (w >= 29) {
            totalCostPerTh += 0.72;
        }
        else if (w >= 21) {
            totalCostPerTh += 1.53;
        }
        else if (w >= 16) {
            totalCostPerTh += 1.14;
        }
    }
    return totalCostPerTh * hashrateTh;
}
/**
 * Calcola il prezzo equivalente a 15 W/TH
 */
function calculateEquivalentPrice(priceUsd, upgradeCost) {
    return priceUsd + upgradeCost;
}
/**
 * Calcola il prezzo per TH equivalente
 */
function calculateEquivalentPricePerTh(equivalentPrice, hashrateTh) {
    return equivalentPrice / hashrateTh;
}
/**
 * Ottiene il prezzo di riferimento del primary market usando la tabella ufficiale GoMining
 */
function getPrimaryPricePerTh(hashrateTh) {
    // Tabella prezzi ufficiale GoMining (TH/s -> Prezzo per TH)
    const priceTable = [
        { th: 1, pricePerTh: 22.99 },
        { th: 2, pricePerTh: 22.495 },
        { th: 4, pricePerTh: 22.00 },
        { th: 8, pricePerTh: 21.75 },
        { th: 16, pricePerTh: 21.50 },
        { th: 32, pricePerTh: 21.28 },
        { th: 48, pricePerTh: 21.06 },
        { th: 64, pricePerTh: 20.86 },
        { th: 96, pricePerTh: 20.65 },
        { th: 128, pricePerTh: 20.44 },
        { th: 192, pricePerTh: 20.23 },
        { th: 256, pricePerTh: 20.03 },
        { th: 384, pricePerTh: 19.83 },
        { th: 512, pricePerTh: 19.63 },
        { th: 768, pricePerTh: 19.44 },
        { th: 1024, pricePerTh: 19.25 },
        { th: 1536, pricePerTh: 19.05 },
        { th: 2560, pricePerTh: 18.86 },
        { th: 3584, pricePerTh: 18.68 },
        { th: 5000, pricePerTh: 18.49 },
    ];
    // Trova il prezzo esatto o interpola tra due valori
    for (let i = 0; i < priceTable.length; i++) {
        const current = priceTable[i];
        // Se troviamo il valore esatto
        if (current.th === hashrateTh) {
            return current.pricePerTh;
        }
        // Se il valore è minore del primo, usa il primo
        if (i === 0 && hashrateTh < current.th) {
            return current.pricePerTh;
        }
        // Se il valore è tra due punti, interpola
        if (i > 0 && hashrateTh < current.th) {
            const prev = priceTable[i - 1];
            const ratio = (hashrateTh - prev.th) / (current.th - prev.th);
            return prev.pricePerTh + ratio * (current.pricePerTh - prev.pricePerTh);
        }
    }
    // Se il valore è maggiore dell'ultimo, usa l'ultimo
    return priceTable[priceTable.length - 1].pricePerTh;
}
/**
 * Calcola lo spread corretto in percentuale
 * Formula: ((equivalentPricePerTh - primaryPricePerTh) / primaryPricePerTh) * 100
 */
function calculateSpreadPct(equivalentPricePerTh, primaryPricePerTh) {
    return ((equivalentPricePerTh - primaryPricePerTh) / primaryPricePerTh) * 100;
}
/**
 * Calcola tutte le metriche economiche per un miner
 */
function calculateMinerMetrics(miner) {
    const upgradeCost = calculateUpgradeCost(miner.efficiencyWPerTh, miner.hashrateTh);
    const equivalentPrice = calculateEquivalentPrice(miner.priceUsd, upgradeCost);
    const equivalentPricePerTh = calculateEquivalentPricePerTh(equivalentPrice, miner.hashrateTh);
    const primaryPricePerTh = getPrimaryPricePerTh(miner.hashrateTh);
    const spreadPct = calculateSpreadPct(equivalentPricePerTh, primaryPricePerTh);
    // Un'opportunità è quando:
    // 1. Spread < 0 (sconto rispetto al primary)
    // 2. Hashrate >= MIN_HASHRATE_TH
    // 3. ROI >= MIN_ROI (se presente)
    const isOpportunity = spreadPct < 0 &&
        miner.hashrateTh >= config_1.config.minHashrateTh &&
        (!miner.roi || miner.roi >= config_1.config.minRoi);
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
function filterAndSortOpportunities(metrics) {
    return metrics
        .filter((m) => m.isOpportunity)
        .sort((a, b) => a.spreadPct - b.spreadPct) // Ordina per spread più negativo (massimo sconto)
        .slice(0, config_1.config.maxResults);
}
//# sourceMappingURL=economics.js.map