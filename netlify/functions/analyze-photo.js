exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let images, lat, lng, placeName, noteText, editorCode;
  try {
    ({ images, lat, lng, placeName, noteText, editorCode } = JSON.parse(event.body));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ongeldige request body' }) };
  }

  const requiredEditorCode = process.env.EDITOR_CODE;
  if (requiredEditorCode) {
    const ok = typeof editorCode === 'string' && editorCode.trim().length > 0 && editorCode.trim().toLowerCase() === requiredEditorCode.trim().toLowerCase();
    if (!ok) {
      return { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Bewerkrechten vereist' }) };
    }
  }

  if (!images || !Array.isArray(images) || images.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Geen afbeeldingen ontvangen' }) };
  }

  const imageContents = images.map(({ data, mediaType }) => ({
    type: 'image',
    source: { type: 'base64', media_type: mediaType, data }
  }));

  const locationContext = [
    placeName ? `De gebruiker geeft aan dat deze foto is gemaakt bij/in: "${placeName}". Gebruik deze informatie als uitgangspunt voor je analyse.` : '',
    lat ? `Coördinaten: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}.` : '',
    noteText ? `De gebruiker heeft dit zelf ingesproken of genoteerd over dit moment: "${noteText}". Verwerk deze persoonlijke herinnering natuurlijk in je verhaal — dit is belangrijker dan aannames die je zelf zou maken.` : ''
  ].filter(Boolean).join(' ');

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
            text: `${locationContext} Analyseer deze reisfoto('s) en schrijf een kort reisdagboek-fragment dat:
1. Beschrijft wat er te zien is (omgeving, sfeer, type plek)
2. Als er een herkenbaar gebouw, monument of landmark is: naam, locatie en interessante weetjes (2-3 zinnen)
3. Algemene context over de omgeving of regio geeft
4. Als de gebruiker een persoonlijke notitie heeft gegeven: verwerk die natuurlijk in het verhaal, alsof het één samenhangend stukje reisdagboek is — niet als los toegevoegd citaat

Schrijf in het Nederlands, vriendelijk en informatief, in vloeiende lopende tekst zonder bullet points. Maximaal 150 woorden. BELANGRIJK: als je een gebouw of plek niet met zekerheid herkent, gok dan NIET naar een naam — beschrijf dan gewoon wat je ziet en gebruik de locatie-informatie van de gebruiker als die er is.`
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
