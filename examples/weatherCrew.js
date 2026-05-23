require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Tool, Agent, Task } = require('../core');
const { weatherTool, lmStudioTool } = require('../tools');

const CITY = 'Paris';
const VERBOSE = 'false';

// Agents
const weatherFetcher = new Agent('WeatherFetcher', [weatherTool]);
const weatherAnalyst = new Agent(
  'WeatherAnalyst',
  [lmStudioTool],
  'Tu es un expert météorologique. Analyse les données météo fournies et donne des conseils pratiques pour la journée (vêtements, activités, précautions).'
);

// Tasks
const tasks = [
  new Task(CITY, 'weather'), // récupérer les données météos
  new Task(
    'Analyse ces données météo et donne des conseils pratiques pour la journée : quels vêtements porter, activités recommandées ou déconseillées, précaution à prendre. Sois concis et utile.',
    'lmStudio'
  ),
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

      console.log(`Etape ${i + 1}/${tasks.length} (${percent}%) | Agent: ${agent.name} | Tool: ${toolName}`);
      if (toolName === 'lmStudio' && i > 0 && lastResult) {
        tasks[i].input = `${tasks[i].input}\n\nDonnées Météo : ${lastResult}`;
      }

      lastResult = await agent.perform(tasks[i]);
      if (VERBOSE) {
        console.log(`Résultat étape ${i + 1}:`, lastResult);
      }
      results.push(lastResult);
    }

    console.log(`Analyse météo terminée pour ${CITY} !`);
    return results;
  }
}

// Utilisation

const crew = new Crew([weatherFetcher, weatherAnalyst]);
crew.run(tasks).then(console.log);
