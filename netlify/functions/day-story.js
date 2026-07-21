const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ongeldige request body' }) };
  }
  const { action, date, items, tripTitle } = body;

  try {
    if (action === 'load') {
      const { data, error } = await db.from('day_stories').select('*');
      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stories: data }) };
    }

    if (action === 'generate') {
      if (!items || items.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Geen stops voor deze dag' }) };
      }

      const stopsText = items.map((s, i) =>
        `Stop ${i+1}: ${s.name}${s.note ? `\nEigen notitie: ${s.note}` : ''}${s.ai_analysis ? `\nAI-beschrijving: ${s.ai_analysis}` : ''}`
      ).join('\n\n');

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
            max_tokens: 700,
            messages: [{
              role: 'user',
              content: `Dit zijn de stops van één reisdag (${date}) tijdens de reis "${tripTitle || 'Pathale'}":\n\n${stopsText}\n\nSchrijf hiervan één samenhangend, sfeervol reisdagboek-fragment voor deze hele dag — geen opsomming, maar een lopend verhaal dat de stops chronologisch met elkaar verbindt, alsof de reiziger 's avonds terugblikt. Gebruik de eigen notities als persoonlijke kern van het verhaal. Schrijf in het Nederlands, warm en levendig, maximaal 220 woorden.`
            }]
          })
        });
      } catch (e) {
        return { statusCode: 502, body: JSON.stringify({ error: 'Kon Anthropic API niet bereiken' }) };
      }

      const data = await response.json();
      if (!response.ok) {
        return { statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: data.error?.message || 'AI-analyse mislukt' }) };
      }
      const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('\n') || '';

      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ story: text }) };
    }

    if (action === 'save') {
      const { story } = body;
      const { data, error } = await db
        .from('day_stories')
        .upsert({ date, story }, { onConflict: 'date' })
        .select();
      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dayStory: data[0] }) };
    }

    return { statusCode: 400, body: 'Unknown action' };

  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) };
  }
};
