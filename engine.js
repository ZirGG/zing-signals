/**
 * Engine de Análise de Mercado - ZingSignals
 * Core independente de análise técnica, sem dependências do DOM
 */

// ============================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================

const ANALYSIS_CONFIG = {
    INDICATOR_WEIGHTS: {
        rsi: 1.0,
        macd: 1.0,
        stochRsi: 0.8,
        mfi: 0.8,
        trend: 1.2,
        occ: 1.0,
        stcCci: 1.0
    },
    THRESHOLDS: {
        aggressive: 10,
        balanced: 25,
        conservative: 40
    }
};

// ============================================
// FUNÇÕES DE ANÁLISE CORE
// ============================================

/**
 * Função principal de análise de mercado
 * @param {Object} marketData - Dados brutos do mercado
 * @param {Array} marketData.klines - Array de velas [timestamp, open, high, low, close, volume]
 * @param {string} marketData.timeframe - Timeframe da análise ('1m', '5m', '15m', '1h')
 * @param {Object} marketData.config - Configurações de análise
 * @returns {Object} Resultado da análise
 */
function analyzeMarket(marketData) {
    const { klines, timeframe, config } = marketData;

    // Preparar dados das velas
    const marketInfo = prepareMarketData(klines);

    // Calcular indicadores técnicos
    const indicators = calculateTechnicalIndicators(marketInfo);

    // Calcular scores dos indicadores
    const indicatorScores = calculateIndicatorScores(indicators, config);

    // Calcular score total
    const totalScore = calculateTotalScore(indicatorScores, config);

    // Determinar direção e confiança
    const { direction, confidence } = determineDirection(totalScore, config, indicators);

    // Gerar explicação textual
    const explanation = generateExplanation(indicators, indicatorScores, direction, config);

    return {
        direction,
        confidence,
        indicators: indicators,
        weights: ANALYSIS_CONFIG.INDICATOR_WEIGHTS,
        scores: indicatorScores,
        totalScore,
        explanation,
        timeframe,
        timestamp: Date.now()
    };
}

/**
 * Prepara os dados das velas para análise
 * @param {Array} klines - Dados brutos das velas
 * @returns {Object} Dados preparados
 */
function prepareMarketData(klines) {
    // Usar apenas velas fechadas (remover última vela aberta)
    const closedCandles = klines.slice(0, -1);

    return {
        closes: closedCandles.map(k => parseFloat(k[4])),
        opens: closedCandles.map(k => parseFloat(k[1])),
        highs: closedCandles.map(k => parseFloat(k[2])),
        lows: closedCandles.map(k => parseFloat(k[3])),
        volumes: closedCandles.map(k => parseFloat(k[5])),
        timestamps: closedCandles.map(k => parseInt(k[0])),
        currentPrice: parseFloat(klines[klines.length - 1][4]), // Preço atual (vela aberta)
        lastClosedCandle: closedCandles[closedCandles.length - 1]
    };
}

/**
 * Calcula todos os indicadores técnicos
 * @param {Object} marketInfo - Dados preparados do mercado
 * @returns {Object} Valores calculados dos indicadores
 */
function calculateTechnicalIndicators(marketInfo) {
    const { closes, highs, lows, volumes } = marketInfo;

    // Implementações simplificadas dos indicadores

    // RSI simplificado
    const rsi = calculateRSI(closes, 14);

    // MACD simplificado
    const macdHistogram = calculateMACD(closes);

    // Stochastic RSI simplificado
    const stochRsi = calculateStochasticRSI(closes, 14);

    // MFI simplificado
    const mfi = calculateMFI(highs, lows, closes, volumes, 14);

    // EMAs simplificadas
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);

    // ATR simplificado
    const atr = calculateATR(highs, lows, closes, 14);

    // Detectar tendência (verificar primeiro se temos dados suficientes)
    let trend = 'sideways';
    const analysisPrice = closes[closes.length - 1];
    
    // Tendência com EMAs longas (mais confiável)
    if (closes.length >= 200) {
        if (analysisPrice > ema20 && ema20 > ema50 && ema50 > ema200) {
            trend = 'uptrend';
        } else if (analysisPrice < ema20 && ema20 < ema50 && ema50 < ema200) {
            trend = 'downtrend';
        }
    } 
    // Tendência de curto prazo se não temos 200 velas
    else if (closes.length >= 20) {
        if (analysisPrice > ema20) {
            trend = 'uptrend';
        } else if (analysisPrice < ema20) {
            trend = 'downtrend';
        }
    }

    // Detectar divergências
    const divergence = detectDivergence(closes, rsi);

    // OCC - Open Close Cross
    const occ = calculateOCC(marketInfo.opens, closes, 8);

    // STC-CCI - Schaff Trend Cycle com CCI
    const stcCci = calculateSTCCCI(highs, lows, closes, 20);

    return {
        rsi: { value: rsi },
        macd: { value: macdHistogram, atr: atr },
        stochRsi: { value: stochRsi },
        mfi: { value: mfi },
        trend: { value: trend },
        divergence: { value: divergence },
        occ: occ,
        stcCci: stcCci,
        ema: { ema20, ema50, ema200 },
        atr: atr,
        currentPrice: marketInfo.currentPrice,
        volume: volumes[volumes.length - 1],
        avgVolume: volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1)
    };
}

/**
 * Calcula os scores de cada indicador
 * @param {Object} indicators - Valores dos indicadores
 * @param {Object} config - Configurações
 * @returns {Object} Scores calculados
 */
function calculateIndicatorScores(indicators, config) {
    const atrValue = Number.isFinite(indicators.atr) && indicators.atr > 0 ? indicators.atr : 0.0001;
    
    const rsiValue = Number.isFinite(indicators.rsi.value) ? indicators.rsi.value : 50;
    const macdValue = Number.isFinite(indicators.macd.value) ? indicators.macd.value : 0;
    const stochValue = Number.isFinite(indicators.stochRsi.value) ? indicators.stochRsi.value : 50;
    const mfiValue = Number.isFinite(indicators.mfi.value) ? indicators.mfi.value : 50;
    const occValue = Number.isFinite(indicators.occ?.value) ? indicators.occ.value : 0;
    const stcCciValue = Number.isFinite(indicators.stcCci?.value) ? indicators.stcCci.value : 0;
    
    return {
        rsi: {
            score: calculateRSIScore(rsiValue),
            weight: ANALYSIS_CONFIG.INDICATOR_WEIGHTS.rsi
        },
        macd: {
            score: (macdValue / atrValue) * 50,
            weight: ANALYSIS_CONFIG.INDICATOR_WEIGHTS.macd
        },
        stochRsi: {
            score: (stochValue - 50) * 2,
            weight: ANALYSIS_CONFIG.INDICATOR_WEIGHTS.stochRsi
        },
        mfi: {
            score: (mfiValue - 50) * 2,
            weight: ANALYSIS_CONFIG.INDICATOR_WEIGHTS.mfi
        },
        trend: {
            score: indicators.trend.value === 'uptrend' ? 30 : indicators.trend.value === 'downtrend' ? -30 : 0,
            weight: ANALYSIS_CONFIG.INDICATOR_WEIGHTS.trend
        },
        occ: {
            score: occValue,
            weight: ANALYSIS_CONFIG.INDICATOR_WEIGHTS.occ
        },
        stcCci: {
            score: stcCciValue,
            weight: ANALYSIS_CONFIG.INDICATOR_WEIGHTS.stcCci
        },
        divergence: {
            value: indicators.divergence.value,
            weight: 0
        }
    };
}

/**
 * Calcula o score total ponderado
 * @param {Object} indicatorScores - Scores dos indicadores
 * @param {Object} config - Configurações
 * @returns {number} Score total
 */
function calculateTotalScore(indicatorScores, config) {
    let totalScore = 0;

    // Somar scores diretamente (SEM pesos, apenas soma pura)
    Object.values(indicatorScores).forEach(indicator => {
        if (Number.isFinite(indicator.score)) {
            totalScore += indicator.score;
        }
    });

    // Garantir que totalScore é válido
    if (!Number.isFinite(totalScore)) {
        totalScore = 0;
    }

    // Ajustar baseado no modo de trading
    totalScore = adjustScoreByMode(totalScore, config.tradingMode);

    // Ajustar por divergência
    if (config.divergenceDetection && indicatorScores.divergence?.value === 'bullish') {
        totalScore += 20;
    }
    if (config.divergenceDetection && indicatorScores.divergence?.value === 'bearish') {
        totalScore -= 20;
    }

    return totalScore;
}

/**
 * Determina a direção e confiança da análise
 * @param {number} totalScore - Score total calculado
 * @param {Object} config - Configurações
 * @returns {Object} Direção e confiança
 */
function determineDirection(totalScore, config, indicators) {
    const defaultThreshold = ANALYSIS_CONFIG.THRESHOLDS[config.tradingMode] || ANALYSIS_CONFIG.THRESHOLDS.balanced;
    const threshold = Number.isFinite(config.backtestThreshold) ? config.backtestThreshold : defaultThreshold;

    let direction = 'NEUTRAL';
    if (totalScore > threshold) direction = 'BUY';
    else if (totalScore < -threshold) direction = 'SELL';

    // Filtrar por tendência se ativado
    if (config.trendFilter) {
        const trend = indicators.trend.value;
        if (direction === 'BUY' && trend === 'downtrend') direction = 'NEUTRAL';
        if (direction === 'SELL' && trend === 'uptrend') direction = 'NEUTRAL';
    }

    // Calcular confiança baseada na magnitude do score
    const maxScore = threshold * 2;
    const confidence = Math.min(100, Math.max(0, (Math.abs(totalScore) / maxScore) * 100));

    return { direction, confidence };
}

/**
 * Gera explicação textual da decisão
 * @param {Object} indicators - Valores dos indicadores
 * @param {Object} scores - Scores calculados
 * @param {string} direction - Direção determinada
 * @param {Object} config - Configurações
 * @returns {string} Explicação textual
 */
function generateExplanation(indicators, scores, direction, config) {
    const explanations = [];

    // RSI
    if (indicators.rsi.value < 30) explanations.push(`RSI em ${indicators.rsi.value.toFixed(1)} (oversold)`);
    else if (indicators.rsi.value > 70) explanations.push(`RSI em ${indicators.rsi.value.toFixed(1)} (overbought)`);

    // MACD
    if (indicators.macd.value > 0) explanations.push(`MACD positivo (${indicators.macd.value.toFixed(6)})`);
    else explanations.push(`MACD negativo (${indicators.macd.value.toFixed(6)})`);

    // Tendência
    explanations.push(`Tendência: ${indicators.trend.value}`);

    // Divergência
    if (indicators.divergence.value) {
        explanations.push(`Divergência ${indicators.divergence.value}`);
    }

    const directionText = direction === 'BUY' ? 'COMPRA' : direction === 'SELL' ? 'VENDA' : 'NEUTRO';
    const mainReason = explanations.length > 0 ? explanations[0] : 'Análise técnica equilibrada';

    return `${directionText} baseado em ${mainReason}. Modo: ${config.tradingMode}`;
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Calcula o score do RSI
 * @param {number} rsi - Valor do RSI
 * @returns {number} Score calculado
 */
function calculateRSIScore(rsi) {
    if (rsi < 20) return 40; // Muito oversold - forte compra
    if (rsi < 30) return 30;
    if (rsi < 40) return 15;
    if (rsi > 80) return -40; // Muito overbought - forte venda
    if (rsi > 70) return -30;
    if (rsi > 60) return -15;
    return 0;
}

/**
 * Detecta divergências entre preço e RSI
 * @param {Array} prices - Preços de fechamento
 * @param {number} rsi - Valor atual do RSI
 * @returns {string|null} Tipo de divergência ou null
 */
function detectDivergence(prices, rsi) {
    const recentPrices = prices.slice(-20);
    const priceMax = Math.max(...recentPrices);
    const priceMin = Math.min(...recentPrices);

    // Bullish divergence: preço fazendo mínimas mais baixas, RSI fazendo mínimas mais altas
    if (recentPrices[recentPrices.length - 1] <= priceMin && rsi > 35) {
        return 'bullish';
    }

    // Bearish divergence: preço fazendo máximas mais altas, RSI fazendo máximas mais baixas
    if (recentPrices[recentPrices.length - 1] >= priceMax && rsi < 65) {
        return 'bearish';
    }

    return null;
}

/**
 * Ajusta o score baseado no modo de trading
 * @param {number} score - Score original
 * @param {string} mode - Modo de trading
 * @returns {number} Score ajustado
 */
function adjustScoreByMode(score, mode) {
    if (mode === 'aggressive') return score * 0.8; // Menos filtros
    if (mode === 'conservative') return score * 1.5; // Mais seletivo
    return score; // balanced
}

// ============================================
// IMPLEMENTAÇÕES SIMPLIFICADAS DOS INDICADORES
// ============================================

function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) - change) / period;
        }
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(prices) {
    if (prices.length < 26) return 0;

    const ema12Series = calculateEMAArray(prices, 12);
    const ema26Series = calculateEMAArray(prices, 26);

    const macdSeries = prices.map((_, i) => {
        if (ema12Series[i] === null || ema26Series[i] === null) return null;
        return ema12Series[i] - ema26Series[i];
    });

    const macdValues = macdSeries.filter(v => v !== null);
    if (macdValues.length < 9) return 0;

    const signal = calculateEMA(macdValues, 9);
    const lastMacd = macdValues[macdValues.length - 1];
    return lastMacd - signal;
}

function calculateStochasticRSI(prices, period = 14) {
    const rsiValues = [];
    for (let i = period; i < prices.length; i++) {
        rsiValues.push(calculateRSI(prices.slice(0, i + 1), period));
    }
    if (rsiValues.length < 14) return 50;

    const stochPeriod = 14;
    const kPeriod = 3;

    const stochValues = [];
    for (let i = stochPeriod - 1; i < rsiValues.length; i++) {
        const slice = rsiValues.slice(i - stochPeriod + 1, i + 1);
        const highest = Math.max(...slice);
        const lowest = Math.min(...slice);
        const range = highest - lowest;
        if (range === 0) {
            stochValues.push(50);
            continue;
        }
        const stoch = ((rsiValues[i] - lowest) / range) * 100;
        stochValues.push(stoch);
    }

    // Simple moving average for %K
    const kSum = stochValues.slice(-kPeriod).reduce((a, b) => a + b, 0);
    return kSum / kPeriod;
}

function calculateMFI(highs, lows, closes, volumes, period = 14) {
    if (closes.length < period) return 50;

    const typicalPrices = closes.map((close, i) => (highs[i] + lows[i] + close) / 3);
    const rawMoneyFlow = typicalPrices.map((tp, i) => tp * volumes[i]);

    let positiveFlow = 0;
    let negativeFlow = 0;

    for (let i = 1; i < Math.min(period + 1, typicalPrices.length); i++) {
        if (typicalPrices[i] > typicalPrices[i - 1]) {
            positiveFlow += rawMoneyFlow[i];
        } else if (typicalPrices[i] < typicalPrices[i - 1]) {
            negativeFlow += rawMoneyFlow[i];
        }
    }

    if (negativeFlow === 0) return 100;
    const moneyFlowRatio = positiveFlow / negativeFlow;
    return 100 - (100 / (1 + moneyFlowRatio));
}

function calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
}

function calculateEMAArray(prices, period) {
    if (prices.length < period) {
        return prices.map(() => null);
    }

    const multiplier = 2 / (period + 1);
    const emaArray = Array(prices.length).fill(null);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    emaArray[period - 1] = ema;

    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
        emaArray[i] = ema;
    }

    return emaArray;
}

function calculateATR(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return 0.0001;

    const trueRanges = [];
    for (let i = 1; i < closes.length; i++) {
        const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
        trueRanges.push(tr);
    }

    let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trueRanges.length; i++) {
        atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    return atr;
}

function calculateSMMA(prices, period) {
    // Smoothed Moving Average (SMMA or RMA)
    if (prices.length < period) return null;

    let smma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
        smma = (smma * (period - 1) + prices[i]) / period;
    }

    return smma;
}

function calculateSMMAArray(prices, period) {
    // Smoothed Moving Average array completo
    if (prices.length < period) return [];

    const smmaArray = [];
    let smma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    smmaArray.push(smma);
    
    for (let i = period; i < prices.length; i++) {
        smma = (smma * (period - 1) + prices[i]) / period;
        smmaArray.push(smma);
    }

    return smmaArray;
}

function calculateOCC(opens, closes, period = 8) {
    // Open Close Cross - Detecta CRUZAMENTOS entre médias de open e close
    // Funciona como "pings" de sinais LONG ou SHORT
    if (opens.length < period + 2 || closes.length < period + 2) {
        return { value: 0, signal: 'NEUTRAL', strength: 0, crossover: false };
    }

    // Calcular arrays completos de SMMA
    const openSMMAArray = calculateSMMAArray(opens, period);
    const closeSMMAArray = calculateSMMAArray(closes, period);

    if (openSMMAArray.length < 2 || closeSMMAArray.length < 2) {
        return { value: 0, signal: 'NEUTRAL', strength: 0, crossover: false };
    }

    // Valores atuais e anteriores
    const currentOpenMA = openSMMAArray[openSMMAArray.length - 1];
    const currentCloseMA = closeSMMAArray[closeSMMAArray.length - 1];
    const prevOpenMA = openSMMAArray[openSMMAArray.length - 2];
    const prevCloseMA = closeSMMAArray[closeSMMAArray.length - 2];

    // Detectar CRUZAMENTO (crossover)
    let signal = 'NEUTRAL';
    let crossover = false;
    let score = 0;

    // Close cruzou ACIMA de Open (bullish crossover) = LONG
    if (prevCloseMA <= prevOpenMA && currentCloseMA > currentOpenMA) {
        signal = 'BUY';
        crossover = true;
        score = 50; // Sinal forte de LONG
    }
    // Close cruzou ABAIXO de Open (bearish crossover) = SHORT
    else if (prevCloseMA >= prevOpenMA && currentCloseMA < currentOpenMA) {
        signal = 'SELL';
        crossover = true;
        score = -50; // Sinal forte de SHORT
    }
    // Sem cruzamento - manter neutro (não fica sempre colorido)
    else {
        signal = 'NEUTRAL';
        crossover = false;
        score = 0;
    }

    return {
        value: score,
        signal: signal,
        strength: Math.abs(score),
        crossover: crossover, // Indica se acabou de cruzar
        openMA: currentOpenMA,
        closeMA: currentCloseMA
    };
}

function calculateCCI(highs, lows, closes, period = 20) {
    // Commodity Channel Index
    if (closes.length < period) return 0;

    const typicalPrices = closes.map((close, i) => (highs[i] + lows[i] + close) / 3);
    const sma = typicalPrices.slice(-period).reduce((a, b) => a + b, 0) / period;
    
    // Mean Deviation
    const meanDev = typicalPrices.slice(-period).reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
    
    if (meanDev === 0) return 0;
    
    const currentTP = typicalPrices[typicalPrices.length - 1];
    const cci = (currentTP - sma) / (0.015 * meanDev);
    
    return cci;
}

function calculateSchaffTrendCycle(closes, fastPeriod = 23, slowPeriod = 50, cyclePeriod = 10) {
    // Schaff Trend Cycle - Baseado em MACD e Stochastic
    if (closes.length < slowPeriod + cyclePeriod) return 50;

    // Calcular MACD
    const fastEMA = calculateEMA(closes, fastPeriod);
    const slowEMA = calculateEMA(closes, slowPeriod);
    const macd = fastEMA - slowEMA;

    // Calcular array de MACD para últimas 'cyclePeriod' velas
    const macdArray = [];
    for (let i = Math.max(0, closes.length - cyclePeriod * 2); i < closes.length; i++) {
        const sliceData = closes.slice(0, i + 1);
        const fEMA = calculateEMA(sliceData, fastPeriod);
        const sEMA = calculateEMA(sliceData, slowPeriod);
        macdArray.push(fEMA - sEMA);
    }

    // Aplicar Stochastic ao MACD
    const recentMACD = macdArray.slice(-cyclePeriod);
    const maxMACD = Math.max(...recentMACD);
    const minMACD = Math.min(...recentMACD);
    const range = maxMACD - minMACD;
    
    if (range === 0) return 50;
    
    const stoch1 = ((macd - minMACD) / range) * 100;
    
    return stoch1;
}

function calculateSTCCCI(highs, lows, closes, period = 20) {
    // STC-CCI: Indicador de tendência que SEGUE o movimento do preço
    // Funciona como um indicador binário (verde = compra, vermelho = venda)
    if (closes.length < 50) {
        return { value: 0, signal: 'NEUTRAL', strength: 0 };
    }

    // Calcular STC (0-100)
    const stc = calculateSchaffTrendCycle(closes, 23, 50, 10);
    
    // Calcular CCI
    const cci = calculateCCI(highs, lows, closes, period);
    
    // Detectar movimento do preço (últimas 5 velas)
    const recentCloses = closes.slice(-5);
    const priceChange = ((recentCloses[recentCloses.length - 1] - recentCloses[0]) / recentCloses[0]) * 100;
    
    // STC > 50 = tendência de alta, STC < 50 = tendência de baixa
    const stcBullish = stc > 50;
    
    // CCI > 0 = momentum positivo, CCI < 0 = momentum negativo
    const cciBullish = cci > 0;
    
    // Preço subindo ou descendo
    const priceMovingUp = priceChange > 0;
    
    // Combinar sinais: se 2 ou 3 indicam alta = COMPRA, se 2 ou 3 indicam baixa = VENDA
    const bullishSignals = (stcBullish ? 1 : 0) + (cciBullish ? 1 : 0) + (priceMovingUp ? 1 : 0);
    
    let signal = 'NEUTRAL';
    let score = 0;
    
    if (bullishSignals >= 2) {
        // COMPRA (verde) - seguindo o movimento de alta
        signal = 'BUY';
        score = 30; // Score fixo positivo
    } else if (bullishSignals <= 1) {
        // VENDA (vermelho) - seguindo o movimento de baixa
        signal = 'SELL';
        score = -30; // Score fixo negativo
    }
    
    return {
        value: score,
        signal: signal,
        strength: Math.abs(score),
        stc: stc,
        cci: cci,
        priceChange: priceChange
    };
}

// ============================================
// EXPORTAÇÃO
// ============================================

// Exportar função principal para uso externo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyzeMarket, getConfig: () => ANALYSIS_CONFIG };
} else if (typeof window !== 'undefined') {
    window.MarketAnalysisEngine = { 
        analyzeMarket,
        getConfig: () => ANALYSIS_CONFIG
    };
}