export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = 'https://moodlift-backend.vercel.app/api/spotify-callback';
  const scopes = 'user-top-read user-read-recently-played';

  const authUrl = 'https://accounts.spotify.com/authorize?' +
    'client_id=' + clientId +
    '&response_type=code' +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&scope=' + encodeURIComponent(scopes);

  return res.redirect(authUrl);
}
