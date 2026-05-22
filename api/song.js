export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const mood = req.body ? req.body.mood : 'calm';

  const MOOD_SEARCH = {
    happy: 'feel good happy upbeat',
    sad: 'sad emotional heartbreak',
    anxious: 'calm anxiety relief soothing',
    angry: 'anger intense powerful',
    calm: 'peaceful calm relaxing',
    tired: 'sleep relax soft gentle',
    excited: 'excited energetic hype party',
    numb: 'melancholy introspective indie'
  };

  function getMoodKey(moodText) {
    var lower = moodText.toLowerCase();
    var keys = Object.keys(MOOD_SEARCH);
    for (var i = 0; i < keys.length; i++) {
      if (lower.includes(keys[i])) return keys[i];
    }
    return 'calm';
  }

  try {
    var clientId = process.env.SPOTIFY_CLIENT_ID;
    var clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Spotify credentials missing' });
    }

    var credentials = Buffer.from(clientId + ':' + clientSecret).toString('base64');

    var tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + credentials,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    var tokenData = await tokenRes.json();
    var token = tokenData.access_token;

    if (!token) {
      return res.status(500).json({ error: 'No Spotify token' });
    }

    var moodKey = getMoodKey(mood);
    var query = MOOD_SEARCH[moodKey];

    var searchRes = await fetch(
     'https://api.spotify.com/v1/search?q=' + encodeURIComponent(query) + '&type=track&limit=10',
      { headers: { 'Authorization': 'Bearer ' + token } }
    );

    var searchData = await searchRes.json();
    
if (!searchData.tracks || !searchData.tracks.items || searchData.tracks.items.length === 0) {
  return res.status(404).json({ 
    error: 'No tracks found', 
    tokenOk: !!token,
    query: query,
    spotifyResponse: JSON.stringify(searchData).substring(0, 300)
  });
}
    var tracks = searchData.tracks.items;
    var randomIndex = Math.floor(Math.random() * Math.min(tracks.length, 20));
    var track = tracks[randomIndex];

    return res.status(200).json({
      name: track.name,
      artist: track.artists[0].name,
      url: track.external_urls.spotify,
      image: track.album.images[0] ? track.album.images[0].url : null
    });

  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}
