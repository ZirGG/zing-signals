/**
 * Strategy Insights - ZingSignals
 * Gera insights estratégicos a partir dos relatórios de performance (somente leitura)
 */

function buildInsightsFromReports(reports) {
    if (!reports) {
        return {
            summary: 'Sem dados para análise.',
            positives: [],
            negatives: [],
            recommendations: []
        };
    }

    const positives = [];
    const negatives = [];
    const recommendations = [];

    function classifyBucket(bucket, labelPrefix) {
        if (!bucket || bucket.total < 10) return; // Amostra pequena

        if (bucket.accuracy >= 60) {
            positives.push(`${labelPrefix} com boa performance: ${bucket.label} (acurácia ${bucket.accuracy.toFixed(1)}%)`);
        } else if (bucket.accuracy <= 40) {
            negatives.push(`${labelPrefix} com baixa performance: ${bucket.label} (acurácia ${bucket.accuracy.toFixed(1)}%)`);
            recommendations.push(`Reduzir exposição ou aumentar cautela em ${labelPrefix.toLowerCase()} ${bucket.label}.`);
        }
    }

    (reports.byMarketRegime || []).forEach(b => classifyBucket(b, 'Regime'));
    (reports.byVolatilityRange || []).forEach(b => classifyBucket(b, 'Volatilidade'));
    (reports.byConfidenceRange || []).forEach(b => classifyBucket(b, 'Confiança'));

    if (positives.length === 0 && negatives.length === 0) {
        recommendations.push('Amostra insuficiente ou desempenho neutro. Continue coletando dados.');
    }

    return {
        summary: 'Insights gerados a partir dos relatórios de performance.',
        positives,
        negatives,
        recommendations
    };
}

function generateStrategyInsights(limit = 1000) {
    if (typeof window === 'undefined' || !window.PerformanceAnalysis) {
        return {
            summary: 'PerformanceAnalysis indisponível.',
            positives: [],
            negatives: [],
            recommendations: []
        };
    }

    const reports = window.PerformanceAnalysis.getAllPerformanceReports(limit);
    return buildInsightsFromReports(reports);
}

if (typeof window !== 'undefined') {
    window.StrategyInsights = {
        generateStrategyInsights,
        buildInsightsFromReports
    };
}
