exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let images, lat, lng;
  try {
    ({ images, lat, lng } = JSON.parse(event.body));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ongeldige request body' }) };
  }

  if (!images || !Array.isArray(images) || images.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geen afbeeldingen ontvangen' }) };
  }

  const imageContents = images.map(({ data, mediaType }) => ({
    type: 'image',
    source: { type: 'base64', media_type: mediaType, data }
  }));

  const locationContext = lat
    ? `De foto is genomen op coördinaten ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}.`
    : '';

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: [
          ...imageContents,
          {
            type: 'text',
            text: `${locationContext} Analyseer deze reisfoto('s) en geef:
1. Wat is te zien (omgeving, sfeer, type plek)?
2. Als er een herkenbaar gebouw, monument of landmark is: naam, locatie en interessante weetjes (2-3 zinnen).
3. Algemene context over de omgeving of regio.

Schrijf in het Nederlands, vriendelijk en informatief. Maximaal 150 woorden. Geen bullet points, gewoon vloeiende tekst.`
          }
        ]
      }]
    })
    });
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Kon Anthropic API niet bereiken' }) };
  }

  const data = await response.json();

  if (!response.ok) {
    console.error('Anthropic API error:', JSON.stringify(data));
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: data.error?.message || 'AI-analyse mislukt' })
    };
  }

  const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('\n') || 'Analyse niet beschikbaar.';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis: text })
  };
};
