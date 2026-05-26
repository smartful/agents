require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Tool, Agent, Task } = require('../core');
const { lmStudioTool } = require('../tools');
const {
  companyOverviewTool,
  appendAnalysisTool,
  incomeStatementTool,
  balanceSheetTool,
  earningTool,
  getAnalysisFileTool,
  newsSentimentTool,
} = require('../financeTools');

// --- GLOBAL CONFIG ---
const TICKER = 'AMD'; // AAPL, IBM, MSFT, META, AMZN, TSLA, AMD
const VERBOSE = false;

// --- AGENTS ---
const fetcher = new Agent('FinanceFetcher', [
  companyOverviewTool,
  incomeStatementTool,
  balanceSheetTool,
  earningTool,
  getAnalysisFileTool,
  newsSentimentTool,
]);
const analyst = new Agent(
  'FinanceAnalyst',
  [lmStudioTool],
  "Tu es un expert en analyse financière. Sur la base des données d'une société cotée, donne un conseil d'investissement (BUY, HOLD ou SELL) et explique ta décision de façon courte avec bulletpoints."
);
const writer = new Agent('AnalysisWriter', [appendAnalysisTool]);

// --- TASKS ---
const tasks = [
  new Task(TICKER, 'companyOverview'), // 1. Récupérer données financières
  new Task(
    "Analyse ces données financières et propose un conseil d'investissement (BUY, HOLD ou SELL) pour un investisseur long terme. Justifie ta réponse.",
    'lmStudio'
  ), // 2. Analyse IA
  new Task({ ticker: TICKER, analysisType: 'Overview Analysis', content: '' }, 'appendAnalysis'), // 3. Écriture dans le fichier markdown

  // 4. Récupérer compte de résultat (income statement)
  new Task(TICKER, 'incomeStatement'),
  // 5. Analyse IA sur le compte de résultat
  new Task(
    "Analyse ces données du compte de résultat (3 derniers trimestres) et propose un conseil d'investissement (BUY, HOLD ou SELL) pour un investisseur long terme. Justifie ta réponse de façon courte avec bulletpoints.",
    'lmStudio'
  ),
  // 6. Écriture de l'analyse du compte de résultat dans le fichier markdown
  new Task({ ticker: TICKER, analysisType: 'Income Statement Analysis', content: '' }, 'appendAnalysis'),

  // 7. Récupérer bilan (balance sheet)
  new Task(TICKER, 'balanceSheet'),
  // 8. Analyse IA sur le bilan
  new Task(
    "Analyse ces données du bilan (3 derniers trimestres) et propose un conseil d'investissement (BUY, HOLD ou SELL) pour un investisseur long terme. Justifie ta réponse de façon courte avec bulletpoints.",
    'lmStudio'
  ),
  // 9. Écriture de l'analyse du bilan dans le fichier markdown
  new Task({ ticker: TICKER, analysisType: 'Balance Sheet Analysis', content: '' }, 'appendAnalysis'),

  // 10. Récupérer résultats (earnings)
  new Task(TICKER, 'earning'),
  // 11. Analyse IA sur les résultats
  new Task(
    "Analyse ces données de résultats (earnings, 3 derniers trimestres) et propose un conseil d'investissement (BUY, HOLD ou SELL) pour un investisseur long terme. Justifie ta réponse de façon courte avec bulletpoints.",
    'lmStudio'
  ),
  // 12. Écriture de l'analyse des résultats dans le fichier markdown
  new Task({ ticker: TICKER, analysisType: 'Earnings Analysis', content: '' }, 'appendAnalysis'),

  // 13. Récupérer actualités et sentiment
  new Task(TICKER, 'newsSentiment'),
  // 14. Analyse IA sur les actualités
  new Task(
    "Analyse ces actualités récentes et leur sentiment. Détermine l'impact potentiel sur l'investissement et propose un conseil (BUY, HOLD ou SELL) basé sur le sentiment des actualités. Justifie ta réponse de façon courte avec bulletpoints.",
    'lmStudio'
  ),
  // 15. Écriture de l'analyse des actualités dans le fichier markdown
  new Task({ ticker: TICKER, analysisType: 'News Sentiment Analysis', content: '' }, 'appendAnalysis'),

  // 16. Récupérer le contenu final du fichier d'analyse
  new Task(TICKER, 'getAnalysisFile'),
  // 17. Demander à l'IA un conseil d'investissement final basé sur toutes les analyses précédentes
  new Task(
    "Voici l'ensemble des analyses précédentes (overview, income statement, balance sheet, earnings, news sentiment). Sur cette base, donne un conseil d'investissement final (BUY, HOLD ou SELL) pour un investisseur long terme et explique ta décision de façon concise.",
    'lmStudio'
  ),
  // 18. Écriture de l'analyse finale dans le fichier markdown
  new Task({ ticker: TICKER, analysisType: 'Final Investment Advice', content: '' }, 'appendAnalysis'),
];

// --- CREW ---
class Crew {
  constructor(agents = []) {
    this.agents = agents;
  }
  async run(tasks = []) {
    const results = [];
    let lastResult = null;
    for (let i = 0; i < tasks.length; i++) {
      const agent = this.agents[i % this.agents.length];
      const toolName = tasks[i].toolName;
      const percent = Math.round(((i + 1) / tasks.length) * 100);
      console.log(`🔄 Étape ${i + 1}/${tasks.length} (${percent}%) | 👤 Agent: ${agent.name} | 🛠️ Tool: ${toolName}`);

      // Injecte résultat précédent pour l'analyse IA
      if (toolName === 'lmStudio' && i > 0 && lastResult) {
        tasks[i].input =
          `${tasks[i].input}\n\n${typeof lastResult === 'string' ? lastResult : JSON.stringify(lastResult, null, 2)}`;
      }
      // Injecte le résultat de l'analyse dans la tâche d'écriture
      if (toolName === 'appendAnalysis' && lastResult) {
        tasks[i].input.content = lastResult;
      }
      lastResult = await agent.perform(tasks[i]);
      if (VERBOSE) {
        console.log(`✅ Résultat étape ${i + 1}:`, lastResult);
      }
      results.push(lastResult);
    }
    console.log(`🎉 Analyse terminée ! Résultat IA :\n`, results[results.length - 2]);
    return results;
  }
}

// --- Example usage ---
const crew = new Crew([fetcher, analyst, writer]);
crew.run(tasks).then(console.log);
