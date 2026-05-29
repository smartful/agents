import dotenv from 'dotenv';
dotenv.config();
import { writeFile } from 'node:fs/promises';
import { Tool } from './core.js';

const LM_API_URL = process.env.LM_API_URL;
const LM_MODEL = process.env.LM_MODEL;
const WEATHER_API_URL = process.env.WEATHER_API_URL;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

if (!LM_API_URL || !LM_MODEL) {
  throw new Error('Variables LM_API_URL et LM_MODEL requises dans le .env');
}

export const lmStudioTool = new Tool('lmStudio', async (input, systemPrompt = null) => {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: input });
  console.log(`[LM STUDIO] Prompt sent: ${input}`);

  const res = await fetch(LM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: LM_MODEL, messages }),
  });
  const data = await res.json();
  const result = data.choices?.[0].message?.content || '';
  console.log(`[LM STUDIO] Response: ${result}`);
  return result;
});

export const fetchTool = new Tool('fetch', async (url) => {
  console.log(`[FETCH] Calling API: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    },
  });
  const result = await response.text();
  console.log(`[FETCH] Response: ${result.substring(0, 200)}...`);
  return result
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+>/g, ' ')
    .trim();
});

export const fetchRssTool = new Tool('fetchRss', async (url) => {
  console.log(`[FETCH RSS] Calling feed: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      Accept: 'application/rss+xml, application/xml, text/xml, */*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.7',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const xml = await response.text();
  console.log(`[FETCH RSS] Received ${xml.length} chars`);

  // Décodage des entités HTML dans le XML brut (Google News encode tout)
  const decodeEntities = (str) => {
    return str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code));
  };

  const decodedXml = decodeEntities(xml);

  // Extraction des <item> sur le XML décodé
  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const rawItems = decodedXml.match(itemRegex) || [];

  const getTagContent = (xmlBlock, tagName) => {
    const regex = new RegExp(`<${tagName}[\\s\\S]*?>([\\s\\S]*?)</${tagName}>`, 'i');
    const match = xmlBlock.match(regex);
    return match ? match[1].trim() : '';
  };

  const stripHtml = (str) => {
    return str
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  for (const itemXml of rawItems.slice(0, 15)) {
    const title = getTagContent(itemXml, 'title');
    const link = getTagContent(itemXml, 'link');
    const pubDate = getTagContent(itemXml, 'pubDate');
    const description = getTagContent(itemXml, 'description');
    const source = getTagContent(itemXml, 'source');

    if (!title) continue;

    // Le lien Google News est une URL de redirection, on garde le lien original
    // ou on essaie d'extraire l'URL réelle si présente dans la description
    let finalLink = link;
    const realLinkMatch = description.match(/href="([^"]+)"/);
    if (realLinkMatch && realLinkMatch[1].startsWith('http')) {
      finalLink = realLinkMatch[1].split('?')[0]; // On nettoie les params de tracking
    }

    items.push({
      title: stripHtml(title).replace(/ - L'Usine Digitale$/, ''),
      link: finalLink,
      date: pubDate,
      source: stripHtml(source) || "L'Usine Digitale",
      description: stripHtml(description).substring(0, 500),
    });
  }

  if (items.length === 0) {
    return 'Aucun article trouvé dans ce flux RSS.';
  }

  // Formatage pour l'IA
  const formatted = items
    .map((item, i) => {
      return (
        `[${i + 1}] ${item.title}\n` +
        `🔗 ${item.link}\n` +
        `📅 ${item.date}\n` +
        `🏢 ${item.source}\n` +
        `📝 ${item.description || 'Pas de description.'}`
      );
    })
    .join('\n\n---\n\n');

  console.log(`[FETCH RSS] Parsed ${items.length} articles`);
  return formatted;
});

export const fileWriteTool = new Tool('writeFile', async ({ filename, content }) => {
  console.log(`[WRITE FILE] Writing to: ${filename}`);
  console.log(`[WRITE FILE] Content: ${content.substring(0, 100)}...`);

  await writeFile(filename, content, 'utf8');
  const result = `File written: ${filename}`;
  console.log(`[WRITE FILE] Result: ${result}`);
  return result;
});

export const weatherTool = new Tool('weather', async (city) => {
  const url = `${WEATHER_API_URL}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&aqi=no`;

  console.log(`[WEATHER] Calling API for city: ${city}`);
  console.log(`[WEATHER] API URL: ${url}`);
  const response = await fetch(url);
  const data = await response.json();
  console.log(`[WEATHER] API response: ${JSON.stringify(data, null, 2)}`);

  if (data.error) {
    const errorMessage = `Weather API Error: ${data.error.message}`;
    console.log(`[WEATHER] Error: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  const result = `Météo à ${data.location.name}: ${data.current.temp_c}°C, ${data.current.condition.text}. Ressenti: ${data.current.feelslike_c}°C, Humidité: ${data.current.humidity}%`;
  console.log(`[WEATHER] Formatted result: ${result}`);
  return result;
});
