/**
 * Performance Analysis - ZingSignals
 * Analisa o histórico de decisões (somente leitura)
 */

// ================================
// HELPERS
// ================================

function getEvaluatedDecisions(limit = 1000) {
    if (typeof window === 'undefined' || !window.DecisionEvaluator) {
        return [];
    }

    const history = window.DecisionEvaluator.getDecisionHistory(limit) || [];
    return history.filter(d => d.status === 'evaluated' && d.evaluation);
}

function initBucket(label) {
    return {
        label,
        total: 0,
        correct: 0,
        incorrect: 0,
        neutral: 0,
        accuracy: 0,
        winRate: 0
    };
}

function finalizeBucket(bucket) {
    const decisive = bucket.correct + bucket.incorrect;
    bucket.accuracy = decisive > 0 ? (bucket.correct / decisive) * 100 : 0;
    bucket.winRate = bucket.total > 0 ? (bucket.correct / bucket.total) * 100 : 0;
    return bucket;
}

function updateBucket(bucket, decision) {
    bucket.total += 1;
    const result = decision.evaluation?.result;
    if (result === 'correct') bucket.correct += 1;
    else if (result === 'incorrect') bucket.incorrect += 1;
    else bucket.neutral += 1;
}

// ================================
// RELATÓRIOS
// ================================

function getPerformanceByMarketRegime(limit = 1000) {
    const evaluated = getEvaluatedDecisions(limit);

    const buckets = {
        uptrend: initBucket('uptrend'),
        downtrend: initBucket('downtrend'),
        sideways: initBucket('sideways'),
        unknown: initBucket('unknown')
    };

    evaluated.forEach(decision => {
        const regime = decision.marketContext?.marketRegime || 'unknown';
        const key = buckets[regime] ? regime : 'unknown';
        updateBucket(buckets[key], decision);
    });

    return Object.values(buckets).map(finalizeBucket);
}

function getPerformanceByVolatilityRange(limit = 1000) {
    const evaluated = getEvaluatedDecisions(limit);

    const ranges = [
        { label: '0% - 0.5%', min: 0, max: 0.5 },
        { label: '0.5% - 1%', min: 0.5, max: 1 },
        { label: '1% - 2%', min: 1, max: 2 },
        { label: '2% - 3%', min: 2, max: 3 },
        { label: '> 3%', min: 3, max: Infinity },
        { label: 'unknown', min: null, max: null }
    ];

    const buckets = ranges.map(r => initBucket(r.label));

    evaluated.forEach(decision => {
        const vol = decision.marketContext?.relativeVolatility;
        let bucketIndex = ranges.length - 1; // unknown
        if (Number.isFinite(vol)) {
            bucketIndex = ranges.findIndex(r => r.min !== null && vol >= r.min && vol < r.max);
            if (bucketIndex === -1) bucketIndex = ranges.length - 1;
        }
        updateBucket(buckets[bucketIndex], decision);
    });

    return buckets.map(finalizeBucket);
}

function getPerformanceByConfidenceRange(limit = 1000) {
    const evaluated = getEvaluatedDecisions(limit);

    const ranges = [
        { label: '0 - 40', min: 0, max: 40 },
        { label: '40 - 60', min: 40, max: 60 },
        { label: '60 - 80', min: 60, max: 80 },
        { label: '80 - 100', min: 80, max: 100 },
        { label: 'unknown', min: null, max: null }
    ];

    const buckets = ranges.map(r => initBucket(r.label));

    evaluated.forEach(decision => {
        const conf = decision.confidence;
        let bucketIndex = ranges.length - 1; // unknown
        if (Number.isFinite(conf)) {
            bucketIndex = ranges.findIndex(r => r.min !== null && conf >= r.min && conf < r.max);
            if (bucketIndex === -1) bucketIndex = ranges.length - 1;
        }
        updateBucket(buckets[bucketIndex], decision);
    });

    return buckets.map(finalizeBucket);
}

function getAllPerformanceReports(limit = 1000) {
    return {
        byMarketRegime: getPerformanceByMarketRegime(limit),
        byVolatilityRange: getPerformanceByVolatilityRange(limit),
        byConfidenceRange: getPerformanceByConfidenceRange(limit)
    };
}

// ================================
// EXPORTAÇÃO
// ================================

if (typeof window !== 'undefined') {
    window.PerformanceAnalysis = {
        getPerformanceByMarketRegime,
        getPerformanceByVolatilityRange,
        getPerformanceByConfidenceRange,
        getAllPerformanceReports
    };
}
