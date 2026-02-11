/**
 * SystemState - Monitor de Estado do Sistema (Somente Leitura)
 * 
 * Mantém janela móvel das últimas decisões avaliadas e calcula métricas em tempo real.
 * NÃO interfere com engine, evaluation ou pesos - apenas observa.
 */

const SystemState = (() => {
    // =========================================================================
    // CONFIGURAÇÃO
    // =========================================================================
    const WINDOW_SIZE = 50;

    // =========================================================================
    // ESTADO INTERNO (PRIVADO)
    // =========================================================================
    let decisionWindow = [];

    // =========================================================================
    // FUNÇÕES PRIVADAS - CÁLCULOS
    // =========================================================================

    const calculateAccuracy = (window) => {
        if (window.length === 0) return 0;
        const successes = window.filter(d => d.success === true).length;
        return (successes / window.length) * 100;
    };

    const calculateWinRate = (window) => {
        if (window.length === 0) return 0;
        const profitable = window.filter(d => d.return > 0).length;
        return (profitable / window.length) * 100;
    };

    const calculateAvgConfidence = (window) => {
        if (window.length === 0) return 0;
        const sum = window.reduce((acc, d) => acc + (d.confidence || 0), 0);
        return sum / window.length;
    };

    const calculateConsecutiveErrors = (window) => {
        let current = 0;
        let max = 0;
        
        for (let i = window.length - 1; i >= 0; i--) {
            if (window[i].success === false) {
                current++;
                max = Math.max(max, current);
            } else {
                break; // Para no primeiro sucesso
            }
        }
        
        return { current, max };
    };

    const calculateDistribution = (window) => {
        if (window.length === 0) return { buyRatio: 0, sellRatio: 0, neutralRatio: 0 };
        
        const buys = window.filter(d => d.direction === 'BUY').length;
        const sells = window.filter(d => d.direction === 'SELL').length;
        const neutrals = window.filter(d => d.direction === 'NEUTRAL').length;
        
        return {
            buyRatio: (buys / window.length) * 100,
            sellRatio: (sells / window.length) * 100,
            neutralRatio: (neutrals / window.length) * 100
        };
    };

    const updateMetrics = () => {
        const accuracy = calculateAccuracy(decisionWindow);
        const winRate = calculateWinRate(decisionWindow);
        const avgConfidence = calculateAvgConfidence(decisionWindow);
        const errors = calculateConsecutiveErrors(decisionWindow);
        const distribution = calculateDistribution(decisionWindow);

        return {
            totalDecisions: decisionWindow.length,
            recentAccuracy: accuracy,
            recentWinRate: winRate,
            avgConfidence: avgConfidence,
            consecutiveErrors: errors.current,
            maxConsecutiveErrors: errors.max,
            buyRatio: distribution.buyRatio,
            sellRatio: distribution.sellRatio,
            neutralRatio: distribution.neutralRatio
        };
    };

    // =========================================================================
    // API PÚBLICA
    // =========================================================================

    /**
     * Registra uma decisão avaliada
     * Chamado por evaluation.js após decisão ser validada
     */
    const recordDecision = (data) => {
        if (!data || data.success === undefined) {
            console.warn('⚠️ SystemState: Decisão inválida', data);
            return;
        }

        decisionWindow.push({
            timeframe: data.timeframe || 'unknown',
            direction: data.direction || 'NEUTRAL',
            success: data.success,
            return: data.return || 0,
            confidence: data.confidence || 0,
            timestamp: data.timestamp || Date.now()
        });

        // Manter apenas últimas N decisões
        if (decisionWindow.length > WINDOW_SIZE) {
            decisionWindow.shift();
        }

        console.log(`📊 SystemState: ${decisionWindow.length}/${WINDOW_SIZE} decisões monitoradas`);
    };

    /**
     * Retorna snapshot completo do estado atual
     */
    const getSnapshot = () => {
        const metrics = updateMetrics();
        
        return {
            timestamp: Date.now(),
            windowSize: decisionWindow.length,
            maxWindowSize: WINDOW_SIZE,
            metrics: metrics,
            recentDecisions: decisionWindow.slice(-10) // Últimas 10
        };
    };

    /**
     * Retorna métricas recentes
     */
    const getRecentMetrics = (windowSize = 10) => {
        const recentWindow = decisionWindow.slice(-windowSize);
        
        if (recentWindow.length === 0) {
            return {
                windowSize: 0,
                accuracy: 0,
                winRate: 0,
                avgConfidence: 0
            };
        }

        return {
            windowSize: recentWindow.length,
            accuracy: calculateAccuracy(recentWindow),
            winRate: calculateWinRate(recentWindow),
            avgConfidence: calculateAvgConfidence(recentWindow)
        };
    };

    /**
     * Retorna todas as decisões da janela
     */
    const getWindow = () => [...decisionWindow];

    /**
     * Limpa o estado (útil ao trocar de símbolo)
     */
    const reset = () => {
        decisionWindow = [];
        console.log('🔄 SystemState resetado');
    };

    // =========================================================================
    // EXPORTAR API
    // =========================================================================
    return {
        recordDecision,
        getSnapshot,
        getRecentMetrics,
        getWindow,
        reset
    };
})();

// Expor globalmente
if (typeof window !== 'undefined') {
    window.SystemState = SystemState;
}
