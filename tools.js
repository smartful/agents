require('dotenv').config();
const fs = require('fs').promises;
const { Tool } = require('./core');

const LM_API_URL = process.env.LM_API_URL;
const LM_MODEL = process.env.LM_MODEL;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

if (!LM_API_URL || !LM_MODEL) {
  throw new Error('Variables LM_API_URL et LM_MODEL requises dans le .env');
}

const lmStudioTool = new Tool('lmStudio', async (input, systemPrompt = null) => {
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

const fetchTool = new Tool('fetch', async (url) => {
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

const fileWriteTool = new Tool('writeFile', async ({ filename, content }) => {
  console.log(`[WRITE FILE] Writing to: ${filename}`);
  console.log(`[WRITE FILE] Content: ${content.substring(0, 100)}...`);

  await fs.writeFile(filename, content, 'utf8');
  const result = `File written: ${filename}`;
  console.log(`[WRITE FILE] Result: ${result}`);
  return result;
});

module.exports = { lmStudioTool, fetchTool, fileWriteTool };
