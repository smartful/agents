import { Tool, Agent, Task } from './core.js';
import { fetchRssTool, lmStudioTool, fileWriteTool } from './tools.js';
import dotenv from 'dotenv';
dotenv.config();

const SEARCH_TERM = '';
const VERBOSE = 'false';

// Agents
const fetcher = new Agent('RSS Fetcher', [fetchRssTool]);
const analyst = new Agent('Analyst', [lmStudioTool], "Tu es un expert en analyse d'actualité économiques.");
const extractor = new Agent(
  'Extractor',
  [lmStudioTool],
  'Tu es un assistant qui extrait des faits et actualités clés.'
);
const writerAgent = new Agent(
  'Writer',
  [lmStudioTool],
  'Tu es un rédacteur SEO qui écrit des articles de blog optimisés en markdown.'
);
const injector = new Agent('Injector', [fileWriteTool]);

// Tasks
// const url = `https://www.lesechos.fr/recherche?search=${encodeURIComponent(SEARCH_TERM)}&searchType=posts`;
const url = `https://news.google.com/rss/search?q=site:usine-digitale.fr+intelligence+artificielle&hl=fr&gl=FR&ceid=FR:fr`;

const tasks = [
  new Task(url, 'fetchRss'),
  new Task('Analyse ce contenu et extrait les principales actualités et informations', 'lmStudio'),
  new Task('Extrais les infos pertinentes du contenu afin de lister les actualités.', 'lmStudio'),
  new Task(
    'Rédige un article de blog sur ce contenu. Tu dois parler des actualités. Formate en markdown et optimisé SEO.',
    'lmStudio'
  ),
  new Task({ filename: 'result.md', content: '' }, 'writeFile'),
];

// Crew
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
      console.log(`🔄 Étape ${i + 1}/${tasks.length} (${percent}%) | Agent: ${agent.name} | Tool: ${toolName}`);

      // On injecte l'instruction + le résultat précédent pour LM Studio
      if (toolName === 'lmStudio' && i > 0 && lastResult) {
        tasks[i].input = `${tasks[i].input}\n\n${lastResult}`;
      } else if (i > 0 && typeof tasks[i].input === 'string' && lastResult) {
        tasks[i].input = lastResult;
      }

      if (toolName === 'writeFile') {
        tasks[i].input.content = lastResult;
      }

      lastResult = await agent.perform(tasks[i]);
      if (VERBOSE && toolName === 'lmStudio') {
        console.log(`✅ Résultat étape ${i + 1}:`, lastResult);
      } else if (toolName !== 'lmStudio') {
        console.log(
          `✅ Résultat étape ${i + 1}:`,
          typeof lastResult === 'string'
            ? lastResult.slice(0, 120) + (lastResult.length > 120 ? '...' : '')
            : lastResult
        );
      }
      results.push(lastResult);
    }

    console.log(`🎉 Terminé ! Tous les agents ont fini. Résultat injecté dans result.md`);
    return results;
  }
}

const crew = new Crew([fetcher, analyst, extractor, writerAgent, injector]);
crew.run(tasks).then(console.log);
