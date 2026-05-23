export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mood, accessToken } = req.body;

  if (!mood || !accessToken) {
    return res.status(400).json({ error: 'Mood and access token required' });
  }

  const MOOD_ENERGY = {
    happy:   { min_energy: 0.6, min_valence: 0.6 },
    sad:     { max_energy: 0.4, max_valence: 0.4 },
    anxious: { max_energy: 0.5, min_valence: 0.3 },
    angry:   { min_energy: 0.7, max_valence: 0.4 },
    calm:    { max_energy: 0.4, min_valence: 0.4 },
    tired:   { max_energy: 0.3 },
    excited: { min_energy: 0.8, min_valence: 0.7 },
    numb:    { max_energy: 0.5, max_valence: 0.5 },
  };

  const getMoodKey = (moodText) => {
    const lower = moodText.toLowerCase();
    for (const key of Object.keys(MOOD_ENERGY)) {
      if (lower.includes(key)) return key;
    }
    return 'calm';
  };

  try {
    const topRes = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });

    const topData = await topRes.json();

    if (!topData.items || topData.items.length === 0) {
      return res.status(404).json({ error: 'No top tracks found' });
    }

    const seedTracks = topData.items.slice(0, 3).map(t => t.id).join(',');
    const moodKey = getMoodKey(mood);
    const energy = MOOD_ENERGY[moodKey];

    let url = 'https://api.spotify.com/v1/recommendations?limit=10&seed_tracks=' + seedTracks;
    if (energy.min_energy) url += '&min_energy=' + energy.min_energy;
    if (energy.max_energy) url += '&max_energy=' + energy.max_energy;
    if (energy.min_valence) url += '&min_valence=' + energy.min_valence;
    if (energy.max_valence) url += '&max_valence=' + energy.max_valence;

    const recRes = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });

    const recData = await recRes.json();

    if (!recData.tracks || recData.tracks.length === 0) {
      return res.status(404).json({ error: 'No recommendations found' });
    }

    const track = recData.tracks[Math.floor(Math.random() * recData.tracks.length)];

    return res.status(200).json({
      name: track.name,
      artist: track.artists[0].name,
      url: track.external_urls.spotify,
      image: track.album.images[0]?.url || null,
      personalized: true,
    });

  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}
