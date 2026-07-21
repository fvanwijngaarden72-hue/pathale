exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let code, type;
  try {
    ({ code, type } = JSON.parse(event.body));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ valid: false }) };
  }

  // 'access' = mag de reis bekijken (bestaande gedrag)
  // 'editor' = mag de reis ook bewerken
  const envVar = type === 'editor' ? 'EDITOR_CODE' : 'ACCESS_CODE';
  const correct = process.env[envVar];

  // Geen code ingesteld in Netlify voor dit type = geen beperking
  if (!correct) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valid: true, noCodeSet: true }) };
  }

  const valid = typeof code === 'string' && code.trim().length > 0 && code.trim().toLowerCase() === correct.trim().toLowerCase();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valid })
  };
};
