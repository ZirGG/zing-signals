═══════════════════════════════════════════════════════════════════════
SYSTEMSTATE - Monitor de Estado (Somente Leitura)
═══════════════════════════════════════════════════════════════════════

ARQUITETURA SIMPLIFICADA
────────────────────────────────────────────────────────────────────────

   engine.js  ──→  evaluation.js  ──→  systemState.js
   (decisões)      (valida após N min)  (monitora métricas)
                          │
                          └──→ Chamada direta: SystemState.recordDecision()


FLUXO DE DADOS
────────────────────────────────────────────────────────────────────────

1. engine.js gera decisão (BUY/SELL/NEUTRAL)
2. evaluation.js registra decisão e aguarda horizonte mínimo
3. evaluation.js valida resultado após N minutos
4. evaluation.js chama SystemState.recordDecision() ← INTEGRAÇÃO
5. SystemState mantém janela móvel (últimas 50 decisões)
6. SystemState calcula métricas em tempo real


ARQUIVOS
────────────────────────────────────────────────────────────────────────

✓ systemState.js     - Núcleo do monitor (195 linhas, IIFE encapsulado)
✓ evaluation.js      - Integração em ~8 linhas (após validação)
✓ index.html         - Carrega systemState.js


API PÚBLICA (window.SystemState)
────────────────────────────────────────────────────────────────────────

SystemState.recordDecision(data)
  └─ Registra decisão avaliada
     Parâmetros: { timeframe, direction, success, return, confidence, timestamp }

SystemState.getSnapshot()
  └─ Retorna estado completo atual
     Retorna: { timestamp, windowSize, metrics, recentDecisions }

SystemState.getRecentMetrics(windowSize = 10)
  └─ Retorna métricas das últimas N decisões
     Retorna: { windowSize, accuracy, winRate, avgConfidence }

SystemState.getWindow()
  └─ Retorna array com todas as decisões da janela

SystemState.reset()
  └─ Limpa estado (útil ao trocar símbolo)


MÉTRICAS CALCULADAS
────────────────────────────────────────────────────────────────────────

• totalDecisions        - Número de decisões na janela
• recentAccuracy        - % de acerto (últimas 50)
• recentWinRate         - % de trades lucrativos
• avgConfidence         - Confiança média das decisões
• consecutiveErrors     - Erros consecutivos atuais
• maxConsecutiveErrors  - Pior sequência de erros
• buyRatio              - % de sinais BUY
• sellRatio             - % de sinais SELL
• neutralRatio          - % de sinais NEUTRAL


COMO USAR (Console DevTools)
────────────────────────────────────────────────────────────────────────

// Ver estado atual
SystemState.getSnapshot()

// Métricas das últimas 10 decisões
SystemState.getRecentMetrics(10)

// Ver todas as decisões
SystemState.getWindow()

// Limpar ao trocar símbolo
SystemState.reset()


PRINCÍPIOS DA SIMPLIFICAÇÃO
────────────────────────────────────────────────────────────────────────

✓ Apenas 1 arquivo novo (systemState.js)
✓ Integração direta (sem bridges ou adapters)
✓ Somente leitura (não altera engine/pesos/decisões)
✓ API minimalista (5 funções públicas)
✓ Janela fixa de 50 decisões
✓ Cálculos sob demanda (não armazenados)
✓ Zero dependências externas
✓ Sem auto-ajuste ou ML


POR QUE VERSÃO SIMPLIFICADA?
────────────────────────────────────────────────────────────────────────

1. ESTÁGIO DO PROJETO
   → Sistema ainda em validação inicial
   → Primeiro: confirmar se as decisões fazem sentido
   → Depois: adicionar complexidade conforme necessário

2. MANUTENIBILIDADE
   → Menos arquivos = mais fácil de entender
   → Integração direta = menos pontos de falha
   → Código linear = debugging mais rápido

3. PERFORMANCE
   → Cálculos sob demanda (não recalcula a cada inserção)
   → Janela fixa pequena (50 itens)
   → Sem persistência = sem overhead de I/O

4. EVOLUÇÃO GRADUAL
   → Base sólida para features futuras
   → Fácil adicionar alertas depois
   → Fácil adicionar regimes depois
   → Fácil adicionar ML depois

5. ALINHAMENTO ARQUITETURAL
   → Segue padrão dos outros módulos (engine, evaluation)
   → Mesma estrutura IIFE
   → Mesma filosofia: observar sem interferir


PRÓXIMOS PASSOS (FUTURO)
────────────────────────────────────────────────────────────────────────

Quando o sistema estiver validado:

□ Adicionar detecção de regime (BULLISH/BEARISH/SIDEWAYS)
□ Adicionar sistema de alertas (drawdown, low confidence)
□ Adicionar comparação com histórico completo
□ Adicionar persistência em localStorage
□ Adicionar visualização no dashboard
□ Integrar com performanceAnalysis.js
□ Adicionar export de métricas (JSON/CSV)


VERIFICAÇÃO RÁPIDA
────────────────────────────────────────────────────────────────────────

Abra DevTools e execute:

  console.log(typeof window.SystemState)  // → "object"
  console.log(SystemState.getSnapshot())  // → { ... }

Se ambos funcionarem: ✓ Sistema operacional


═══════════════════════════════════════════════════════════════════════
Versão: 1.0 Simplificada | Data: 04/02/2026
═══════════════════════════════════════════════════════════════════════
