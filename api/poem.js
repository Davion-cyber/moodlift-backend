import { validateRequest, sanitizeInput } from './middleware.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!validateRequest(req, res)) return;

  const rawMood = req.body?.mood;
  const mood = sanitizeInput(rawMood);
  if (!mood) return res.status(400).json({ error: 'Invalid or missing mood input' });

  const tone = req.body?.tone || 'hopeful';
  const songName = req.body?.songName || null;
  const songArtist = req.body?.songArtist || null;

  const songContext = songName
    ? `The user has been given the song "${songName}" by ${songArtist} to match their mood. Let the spirit of that song subtly influence the poem's imagery or feel — don't mention the song directly.`
    : '';

  const toneInstructions = {
    hopeful:      'The tone should be warm and gently uplifting — honest about the pain but pointing toward light.',
    melancholic:  'The tone should be deeply emotional and introspective — sit with the feeling, don\'t rush to fix it.',
    humorous:     'The tone should be light and gently witty — find the absurdity or irony in the feeling without dismissing it.',
    empowering:   'The tone should be bold and motivating — like a rallying cry that turns the feeling into fuel.',
    peaceful:     'The tone should be calm and meditative — slow, grounding, like a deep breath on the page.',
  };

  const toneGuide = toneInstructions[tone] || toneInstructions.hopeful;

  const prompt = `You are a compassionate poet. The user feels: ${mood}.

${songContext}

Tone direction: ${toneGuide}

Write 8-10 lines that honestly acknowledge the feeling and end with one line that fits the tone. Feel warm, personal, and real. Respond with the poem only — no title, no explanation.`;

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
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    const poem = data.content?.[0]?.text || '';
    if (poem) return res.status(200).json({ poem });
    return res.status(500).json({ error: 'Could not generate poem' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
}
