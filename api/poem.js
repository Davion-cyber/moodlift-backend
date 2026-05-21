export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mood } = req.body;

  if (!mood) {
    return res.status(400).json({ error: 'Mood is required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: 'You are a compassionate poet. The user feels: ' + mood + '. Write 8-10 lines that honestly acknowledge the feeling, gently shift perspective toward inner strength, and end with one uplifting line that motivates them. Feel warm, personal, and real. Respond with the poem only, no title, no explanation.',
        }],
      }),
    });

    const data = await response.json();
    const poem = data.content && data.content[0] ? data.content[0].text : '';

    if (poem) {
      return res.status(200).json({ poem });
    } else {
      return res.status(500).json({ error: 'Could not generate poem' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
}
