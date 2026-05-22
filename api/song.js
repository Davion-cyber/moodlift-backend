const rateLimitStore = new Map();

function rateLimit(ip) {
  const now = Date.now();
  const window = 15 * 60 * 1000;
  const max = 20;
  const record = rateLimitStore.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + window });
    return true;
  }
  if (record.count >= max) return false;
  record.count++;
  return true;
}

const MOOD_SEARCH = {
  happy:   'feel good happy upbeat',
  sad:     'sad emotional heartbreak',
  anxious: 'calm anxiety relief soothing',
  angry:   'anger intense powerful',
  calm:    'peaceful calm relaxing',
  tired:   'sleep relax soft gentle',
  excited: 'excited energetic hype party',
  numb:    'melancholy introspective indie',
};

function getMoodKey(moodText) {
  const lower = moodText.toLowerCase();
  for (const key of Object.keys(MOOD_SEARCH)) {
    if (lower.includes(key)) return key;
  }
  return 'calm';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Too many requests' });

  const mood = req.body?.mood;
  if (!mood || typeof mood !== 'string' || mood.length > 500) {
    return res.status(400).json({ error: 'Invalid mood input' });
  }

  try {
    const credentials = Buffer.from(
      process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
    ).toString('base64');

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + credentials,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    if (!token) return res.status(500).json({ error: 'Could not get Spotify token' });

    const moodKey = getMoodKey(mood);
    const query = MOOD_SEARCH[moodKey];

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=50`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    );

    const searchData = await searchRes.json();

    if (!searchData.tracks?.items?.length) {
      return res.status(404).json({ error: 'No tracks found' });
    }

    const pool = searchData.tracks.items.filter(t => t.preview_url);
    const tracks = pool.length > 0 ? pool : searchData.tracks.items;
    const track = tracks[Math.floor(Math.random() * Math.min(tracks.length, 20))];

    return res.status(200).json({
      name: track.name,
      artist: track.artists[0].name,
      url: track.external_urls.spotify,
      image: track.album.images[0]?.url || null,
    });

  } catch (error) {
  return res.status(500).json({ error: 'Server error', details: error.message });
}
}
