export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { code, error } = req.query;
  if (error || !code) {
    return res.send(`<html><body><script>window.location.href = 'moodlift://spotify-auth?error=access_denied';</script></body></html>`);
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
      return res.send(`<html><body><script>window.location.href = 'moodlift://spotify-auth?error=token_failed';</script></body></html>`);
    }
    const deepLink = 'moodlift://spotify-auth?access_token=' + tokenData.access_token + '&refresh_token=' + tokenData.refresh_token + '&expires_in=' + tokenData.expires_in;
    return res.send(`
      <html>
        <body>
          <script>
            window.location.href = '${deepLink}';
            setTimeout(() => {
              document.body.innerHTML = '<p>Redirecting back to MoodLift...</p>';
            }, 500);
          </script>
          <p>Connecting to MoodLift...</p>
        </body>
      </html>
    `);
  } catch (err) {
    return res.send(`<html><body><script>window.location.href = 'moodlift://spotify-auth?error=server_error';</script></body></html>`);
  }
}
