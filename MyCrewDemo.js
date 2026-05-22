require('dotenv').config();
const LM_API_URL = process.env.LM_API_URL;
const LM_MODEL = process.env.LM_MODEL;

async function test() {
  const messages = [];
  messages.push({ role: 'user', content: "Qu'elle est le pays qui investit le plus dans la R&D ?" });
  const res = await fetch(LM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: LM_MODEL, messages }),
  });
  const data = await res.json();
  const result = data.choices?.[0].message?.content || '';
  console.log(`[LM STUDIO] Response: ${result}`);
}

test();
