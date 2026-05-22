export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const mood = req.body?.mood || 'calm';

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

  const getMoodKey = (moodText) => {
    const lower = moodText.toLowerCase();
    for (const key of Object.keys(MOOD_SEARCH)) {
      if (lower.includes(key)) return key;
    }
    return 'calm';
  };

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Spotify credentials missing' });
    }

    const credentials = Buffer.from(clientId + ':' + clientSecret).toString('base64');

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
      return res.status(500).json({ error: 'No Spotify token', details: JSON.stringify(tokenData) });
    }

    const moodKey = getMoodKey(mood);
    const query = MOOD_SEARCH[moodKey];

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=50&market=US`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    );

    const searchData = await searchRes.json();

    if (!searchData.tracks?.items?.length) {
      return res.status(404).json({ error: 'No tracks found', raw: JSON.stringify(searchData).substring(0, 200) });
    }

    const tracks = searchData.tracks.items;
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
