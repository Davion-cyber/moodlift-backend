export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect('moodlift://spotify-auth?error=access_denied');
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = 'https://moodlift-backend.vercel.app/api/spotify-callback';

    const credentials = Buffer.from(clientId + ':' + clientSecret).toString('base64');

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + credentials,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=authorization_code&code=' + code + '&redirect_uri=' + encodeURIComponent(redirectUri),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.redirect('moodlift://spotify-auth?error=token_failed');
    }

    return res.redirect(
      'moodlift://spotify-auth?access_token=' + tokenData.access_token +
      '&refresh_token=' + tokenData.refresh_token +
      '&expires_in=' + tokenData.expires_in
    );

  } catch (err) {
    return res.redirect('moodlift://spotify-auth?error=server_error');
  }
}
