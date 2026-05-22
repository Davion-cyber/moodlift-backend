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

  const MOOD_SEARCH = {
    happy:   { query: 'feel good happy upbeat', valence: [0.7, 1.0], energy: [0.6, 1.0] },
    sad:     { query: 'sad emotional heartbreak', valence: [0.0, 0.4], energy: [0.1, 0.5] },
    anxious: { query: 'calm anxiety relief soothing', valence: [0.3, 0.6], energy: [0.2, 0.5] },
    angry:   { query: 'anger intense powerful', valence: [0.1, 0.4], energy: [0.7, 1.0] },
    calm:    { query: 'peaceful calm relaxing', valence: [0.5, 0.8], energy: [0.1, 0.4] },
    tired:   { query: 'sleep relax soft gentle', valence: [0.3, 0.6], energy: [0.0, 0.3] },
    excited: { query: 'excited energetic hype party', valence: [0.8, 1.0], energy: [0.8, 1.0] },
    numb:    { query: 'melancholy introspective indie', valence: [0.2, 0.5], energy: [0.2, 0.5] },
  };

  const getMoodKey = (moodText) => {
    const lower = moodText.toLowerCase();
    for (const key of Object.keys(MOOD_SEARCH)) {
      if (lower.includes(key)) return key;
    }
    return 'calm';
  };

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
    const params = MOOD_SEARCH[moodKey];

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(params.query)}&type=track&limit=50`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    );

    const searchData = await searchRes.json();
    if (!searchData.tracks?.items?.length) return res.status(404).json({ error: 'No tracks found' });

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
    return res.status(500).json({ error: 'Server error' });
  }
}
