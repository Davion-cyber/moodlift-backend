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
  const accessToken = req.body?.accessToken;
  const valence = req.body?.valence ?? 0.5;
  const energy = req.body?.energy ?? 0.5;
  const genre = sanitizeInput(req.body?.genre || 'pop');

  if (!mood || !accessToken) return res.status(400).json({ error: 'Missing mood or token' });

  // Personal songs are cached per token+mood for 10 minutes (short — user taste matters)
  const cacheKey = `personal-song:${accessToken.slice(-12)}:${mood.toLowerCase().slice(0, 20)}:${genre}`;
  const cached = cacheGet(cacheKey);
  if (cached) return res.status(200).json({ ...cached, cached: true });

  try {
    // Get user's top tracks for seed
    const topRes = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term', {
      headers: { 'Authorization': 'Bearer ' + accessToken },
    });
    const topData = await topRes.json();
    const seedTracks = topData.items?.slice(0, 2).map((t) => t.id).join(',') || '';

    const params = new URLSearchParams({
      target_valence: valence.toString(),
      target_energy: energy.toString(),
      limit: '5',
    });
    if (seedTracks) {
      params.set('seed_tracks', seedTracks);
    } else {
      params.set('seed_genres', genre);
    }

    const recRes = await fetch('https://api.spotify.com/v1/recommendations?' + params.toString(), {
      headers: { 'Authorization': 'Bearer ' + accessToken },
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
      personalized: true,
    };

    // Cache for 10 minutes
    cacheSet(cacheKey, result, 600);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
