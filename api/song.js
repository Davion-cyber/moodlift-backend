export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mood } = req.body;
  if (!mood) return res.status(400).json({ error: 'Mood is required' });

  const MOOD_MAP = {
    happy:   { valence: 0.8, energy: 0.7, genre: 'pop' },
    sad:     { valence: 0.2, energy: 0.3, genre: 'sad' },
    anxious: { valence: 0.3, energy: 0.7, genre: 'ambient' },
    angry:   { valence: 0.3, energy: 0.9, genre: 'rock' },
    calm:    { valence: 0.6, energy: 0.3, genre: 'chill' },
    tired:   { valence: 0.4, energy: 0.2, genre: 'sleep' },
    excited: { valence: 0.9, energy: 0.9, genre: 'dance' },
    numb:    { valence: 0.3, energy: 0.3, genre: 'indie' },
  };

  const getMoodKey = (moodText) => {
    const lower = moodText.toLowerCase();
    for (const key of Object.keys(MOOD_MAP)) {
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

    if (!token) {
      return res.status(500).json({ error: 'Could not get Spotify token' });
    }

    const moodKey = getMoodKey(mood);
    const params = MOOD_MAP[moodKey];

    const recRes = await fetch(
      `https://api.spotify.com/v1/recommendations?limit=1&seed_genres=${params.genre}&target_valence=${params.valence}&target_energy=${params.energy}`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    );

    const recData = await recRes.json();

    if (recData.tracks && recData.tracks.length > 0) {
      const track = recData.tracks[0];
      return res.status(200).json({
        name: track.name,
        artist: track.artists[0].name,
        url: track.external_urls.spotify,
        image: track.album.images[0]?.url || null,
      });
    } else {
      return res.status(404).json({ error: 'No tracks found' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
}
