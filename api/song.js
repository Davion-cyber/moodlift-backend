import { cacheGet, cacheSet } from './cache.js';
import { validateRequest, sanitizeInput } from './middleware.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!validateRequest(req, res)) return;

  const mood = sanitizeInput(req.body?.mood);
  const valence = req.body?.valence ?? 0.5;
  const energy = req.body?.energy ?? 0.5;
  const genre = sanitizeInput(req.body?.genre || 'pop');

  if (!mood) return res.status(400).json({ error: 'Missing mood' });

  // Cache key based on mood + genre (generic songs don't need per-user cache)
  const cacheKey = `song:${mood.toLowerCase().slice(0, 20)}:${genre}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.status(200).json({ ...cached, cached: true });

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const credentials = Buffer.from(clientId + ':' + clientSecret).toString('base64');

    // Get app token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + credentials, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) return res.status(500).json({ error: 'Spotify auth failed' });

    // Get recommendations using audio features
    const params = new URLSearchParams({
      seed_genres: genre,
      target_valence: valence.toString(),
      target_energy: energy.toString(),
      limit: '5',
    });

    const recRes = await fetch('https://api.spotify.com/v1/recommendations?' + params.toString(), {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    const recData = await recRes.json();
    const track = recData.tracks?.[0];

    if (!track) return res.status(200).json({ error: 'No tracks found' });

    const result = {
      name: track.name,
      artist: track.artists?.[0]?.name || 'Unknown',
      url: track.external_urls?.spotify || '',
      image: track.album?.images?.[0]?.url || null,
      preview_url: track.preview_url || null,
      personalized: false,
    };

    // Cache for 1 hour
    cacheSet(cacheKey, result, 3600);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
