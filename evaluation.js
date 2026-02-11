/**
 * Sistema de Avaliação de Decisões - ZingSignals
 * Módulo para observar e avaliar o desempenho das decisões do engine de análise
 */

// ============================================
// ARMAZENAMENTO EM MEMÓRIA
// ============================================

/**
 * Array que armazena todas as decisões registradas
 * @type {Array<Object>}
 */
let decisionHistory = [];

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Registra uma decisão tomada pelo engine de análise
 * @param {Object} decisionData - Dados da decisão
 * @param {string} decisionData.direction - Direção da decisão (BUY, SELL, NEUTRAL)
 * @param {number} decisionData.confidence - Confiança da decisão (0-100)
 * @param {number} decisionData.currentPrice - Preço atual no momento da decisão
 * @param {Object} decisionData.indicators - Snapshot dos indicadores técnicos
 * @param {string} decisionData.timeframe - Timeframe da análise
 * @param {string} decisionData.explanation - Explicação da decisão
 * @param {Object} decisionData.marketContext - Contexto de mercado no momento da decisão
 * @param {number} decisionData.marketContext.totalScore - Score total da análise
 * @param {string} decisionData.marketContext.marketRegime - Regime de mercado (uptrend/downtrend/sideways)
 * @param {number} decisionData.marketContext.relativeVolatility - Volatilidade relativa (ATR %)
 * @param {number} [decisionData.evaluationHorizon] - Horizonte mínimo em ms (padrão: 5 minutos)
 */
function recordDecision(decisionData) {
    // Definir horizonte de avaliação baseado no timeframe
    const horizonMinutes = getEvaluationHorizon(decisionData.timeframe);
    const evaluationHorizon = decisionData.evaluationHorizon || (horizonMinutes * 60 * 1000);

    const decision = {
        id: Date.now() + Math.random(), // ID único
        timestamp: Date.now(),
        direction: decisionData.direction,
        confidence: decisionData.confidence,
        currentPrice: decisionData.currentPrice,
        indicators: { ...decisionData.indicators }, // Cópia dos indicadores
        timeframe: decisionData.timeframe,
        explanation: decisionData.explanation,
        marketContext: { ...decisionData.marketContext }, // Contexto de mercado
        evaluationHorizon: evaluationHorizon, // Horizonte mínimo para avaliação
        status: 'pending', // pending, ready, evaluated
        evaluation: null // Resultado da avaliação (será preenchido depois)
    };

    decisionHistory.push(decision);

    // Manter apenas as últimas 1000 decisões para não consumir muita memória
    if (decisionHistory.length > 1000) {
        decisionHistory = decisionHistory.slice(-1000);
    }

    console.log(`📝 Decisão registrada: ${decision.direction} (${decision.confidence.toFixed(0)}% confiança) em ${decision.timeframe} - Horizonte: ${horizonMinutes}min`);
}

/**
 * Define o horizonte mínimo de avaliação baseado no timeframe
 * @param {string} timeframe - Timeframe da decisão
 * @returns {number} Horizonte em minutos
 */
function getEvaluationHorizon(timeframe) {
    // Horizonte baseado no timeframe: pelo menos 3x o período
    const horizonMap = {
        '1m': 3,    // 3 minutos para 1m
        '5m': 15,   // 15 minutos para 5m
        '15m': 45,  // 45 minutos para 15m
        '1h': 180   // 3 horas para 1h
    };

    return horizonMap[timeframe] || 5; // Padrão: 5 minutos
}

/**
 * Verifica se uma decisão atingiu o horizonte mínimo para avaliação
 * @param {Object} decision - Decisão a verificar
 * @param {number} currentTime - Tempo atual (opcional, padrão: Date.now())
 * @returns {boolean} True se pode ser avaliada
 */
function isDecisionReady(decision, currentTime = Date.now()) {
    const timeElapsed = currentTime - decision.timestamp;
    return timeElapsed >= decision.evaluationHorizon;
}

/**
 * Atualiza o status das decisões baseado no tempo decorrido
 */
function updateDecisionStatuses() {
    const now = Date.now();

    decisionHistory.forEach(decision => {
        if (decision.status === 'pending' && isDecisionReady(decision, now)) {
            decision.status = 'ready';
        }
    });
}

/**
 * Avalia se uma decisão foi correta baseada no movimento futuro do preço
 * @param {Object} decision - Decisão a ser avaliada
 * @param {number} futurePrice - Preço futuro após um intervalo de tempo
 * @returns {string|null} Resultado da avaliação: 'correct', 'incorrect', 'neutral', ou null se não estiver pronta
 */
function evaluateDecision(decision, futurePrice) {
    // Só avaliar se a decisão estiver pronta
    if (decision.status !== 'ready') {
        return null; // Ainda não atingiu o horizonte mínimo
    }

    const priceChange = ((futurePrice - decision.currentPrice) / decision.currentPrice) * 100;
    const threshold = 0.1; // 0.1% de mudança mínima para considerar movimento significativo

    let result;

    if (decision.direction === 'BUY') {
        // Decisão BUY é correta se o preço subiu
        if (priceChange > threshold) {
            result = 'correct';
        } else if (priceChange < -threshold) {
            result = 'incorrect';
        } else {
            result = 'neutral';
        }
    } else if (decision.direction === 'SELL') {
        // Decisão SELL é correta se o preço caiu
        if (priceChange < -threshold) {
            result = 'correct';
        } else if (priceChange > threshold) {
            result = 'incorrect';
        } else {
            result = 'neutral';
        }
    } else {
        // Decisão NEUTRAL sempre é considerada neutra
        result = 'neutral';
    }

    // Atualizar a decisão com o resultado da avaliação
    decision.status = 'evaluated';
    decision.evaluation = {
        result: result,
        futurePrice: futurePrice,
        priceChange: priceChange,
        evaluatedAt: Date.now()
    };

    console.log(`🎯 Avaliação: ${decision.direction} → ${result} (${priceChange.toFixed(2)}% mudança após ${(decision.evaluationHorizon / 60000).toFixed(0)}min)`);

    // Registrar no SystemState (monitor somente-leitura)
    if (typeof window !== 'undefined' && window.SystemState) {
        window.SystemState.recordDecision({
            timeframe: decision.timeframe,
            direction: decision.direction,
            success: result === 'correct',
            return: priceChange,
            confidence: decision.confidence,
            timestamp: Date.now()
        });
        console.log(`📊 SystemState atualizado com decisão ${decision.direction}`);
    } else {
        console.warn('⚠️ SystemState não disponível');
    }

    return result;
}

/**
 * Avalia todas as decisões prontas usando o preço atual
 * @param {number} currentPrice - Preço atual do mercado
 */
function evaluatePendingDecisions(currentPrice) {
    // Primeiro, atualizar status das decisões
    updateDecisionStatuses();

    // Depois, avaliar apenas as decisões prontas
    const readyDecisions = decisionHistory.filter(d => d.status === 'ready');

    let evaluatedCount = 0;
    readyDecisions.forEach(decision => {
        const result = evaluateDecision(decision, currentPrice);
        if (result !== null) {
            evaluatedCount++;
        }
    });

    if (evaluatedCount > 0) {
        console.log(`📊 Avaliadas ${evaluatedCount} decisões prontas`);
    }
}

// ============================================
// FUNÇÕES DE CONSULTA E ESTATÍSTICAS
// ============================================

/**
 * Retorna estatísticas de desempenho das decisões
 * @returns {Object} Estatísticas de desempenho
 */
function getPerformanceStats() {
    const evaluated = decisionHistory.filter(d => d.status === 'evaluated');

    if (evaluated.length === 0) {
        return {
            total: 0,
            pending: decisionHistory.filter(d => d.status === 'pending').length,
            ready: decisionHistory.filter(d => d.status === 'ready').length,
            evaluated: 0,
            correct: 0,
            incorrect: 0,
            neutral: 0,
            accuracy: 0,
            winRate: 0
        };
    }

    const correct = evaluated.filter(d => d.evaluation.result === 'correct').length;
    const incorrect = evaluated.filter(d => d.evaluation.result === 'incorrect').length;
    const neutral = evaluated.filter(d => d.evaluation.result === 'neutral').length;

    // Acurácia considerando apenas decisões com resultado definido (correct/incorrect)
    const decisiveDecisions = correct + incorrect;
    const accuracy = decisiveDecisions > 0 ? (correct / decisiveDecisions) * 100 : 0;

    // Win rate incluindo neutras
    const winRate = (correct / evaluated.length) * 100;

    return {
        total: decisionHistory.length,
        pending: decisionHistory.filter(d => d.status === 'pending').length,
        ready: decisionHistory.filter(d => d.status === 'ready').length,
        evaluated: evaluated.length,
        correct: correct,
        incorrect: incorrect,
        neutral: neutral,
        accuracy: accuracy,
        winRate: winRate
    };
}

/**
 * Retorna o histórico de decisões
 * @param {number} limit - Número máximo de decisões a retornar (padrão: 50)
 * @returns {Array<Object>} Histórico de decisões
 */
function getDecisionHistory(limit = 50) {
    return decisionHistory.slice(-limit).reverse(); // Mais recentes primeiro
}

/**
 * Retorna estatísticas detalhadas por timeframe
 * @returns {Object} Estatísticas por timeframe
 */
function getTimeframeStats() {
    const stats = {};

    decisionHistory.forEach(decision => {
        const tf = decision.timeframe;
        if (!stats[tf]) {
            stats[tf] = {
                total: 0,
                pending: 0,
                ready: 0,
                evaluated: 0,
                correct: 0,
                incorrect: 0,
                neutral: 0,
                accuracy: 0
            };
        }

        stats[tf].total++;

        if (decision.status === 'pending') stats[tf].pending++;
        else if (decision.status === 'ready') stats[tf].ready++;
        else if (decision.status === 'evaluated') {
            stats[tf].evaluated++;
            const result = decision.evaluation.result;
            if (result === 'correct') stats[tf].correct++;
            else if (result === 'incorrect') stats[tf].incorrect++;
            else if (result === 'neutral') stats[tf].neutral++;
        }
    });

    // Calcular acurácia para cada timeframe
    Object.keys(stats).forEach(tf => {
        const decisive = stats[tf].correct + stats[tf].incorrect;
        stats[tf].accuracy = decisive > 0 ? (stats[tf].correct / decisive) * 100 : 0;
    });

    return stats;
}

/**
 * Limpa o histórico de decisões
 */
function clearHistory() {
    decisionHistory = [];
    console.log('🗑️ Histórico de decisões limpo');
}

// ============================================
// EXPORTAÇÃO PARA USO GLOBAL
// ============================================

// Exportar funções para uso no navegador
if (typeof window !== 'undefined') {
    window.DecisionEvaluator = {
        recordDecision,
        evaluateDecision,
        evaluatePendingDecisions,
        getPerformanceStats,
        getDecisionHistory,
        getTimeframeStats,
        clearHistory
    };
}