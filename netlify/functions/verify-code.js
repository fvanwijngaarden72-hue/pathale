exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let code;
  try {
    ({ code } = JSON.parse(event.body));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ valid: false }) };
  }

  const correct = process.env.ACCESS_CODE;

  // Als er geen code is ingesteld in Netlify, staat de app open voor iedereen
  if (!correct) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valid: true, noCodeSet: true }) };
  }

  const valid = typeof code === 'string' && code.trim().toLowerCase() === correct.trim().toLowerCase();

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valid })
  };
};
