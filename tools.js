require('dotenv').config();
const { Tool } = require('./core');
const LM_API_URL = process.env.LM_API_URL;
const LM_MODEL = process.env.LM_MODEL;

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

module.exports = { lmStudioTool };
