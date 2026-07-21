const { createClient } = require('@supabase/supabase-js');

function isEditor(editorCode) {
  const required = process.env.EDITOR_CODE;
  // Geen EDITOR_CODE ingesteld = geen beperking (backwards compatible)
  if (!required) return true;
  return typeof editorCode === 'string' && editorCode.trim().length > 0 && editorCode.trim().toLowerCase() === required.trim().toLowerCase();
}

const FORBIDDEN = { statusCode: 403, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Bewerkrechten vereist' }) };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Ongeldige request body' }) };
  }
  const { action, payload, editorCode } = body;

  const WRITE_ACTIONS = ['save', 'update', 'delete', 'upload-photo', 'save-trackpoint', 'clear-trackpoints', 'save-trip-meta'];
  if (WRITE_ACTIONS.includes(action) && !isEditor(editorCode)) {
    return FORBIDDEN;
  }

  try {
    if (action === 'load') {
      const { data, error } = await db
        .from('stops')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stops: data })
      };
    }

    if (action === 'save') {
      const { data, error } = await db
        .from('stops')
        .insert([payload])
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stop: data[0] })
      };
    }

    if (action === 'update') {
      const { id, ...fields } = payload;
      const { data, error } = await db
        .from('stops')
        .update(fields)
        .eq('id', id)
        .select();

      if (error) throw error;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stop: data[0] })
      };
    }

    if (action === 'delete') {
      const { error } = await db
        .from('stops')
        .delete()
        .eq('id', payload.id);

      if (error) throw error;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      };
    }

    if (action === 'upload-photo') {
      const { filename, base64, mimetype } = payload;
      const buffer = Buffer.from(base64, 'base64');

      const { error } = await db.storage
        .from('photos')
        .upload(filename, buffer, { contentType: mimetype, upsert: true });

      if (error) throw error;

      const { data: urlData } = db.storage
        .from('photos')
        .getPublicUrl(filename);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlData.publicUrl })
      };
    }

    if (action === 'save-trackpoint') {
      const { error } = await db.from('trackpoints').insert([payload]);
      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
    }

    if (action === 'load-trackpoints') {
      const { data, error } = await db.from('trackpoints').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackpoints: data }) };
    }

    if (action === 'clear-trackpoints') {
      const { error } = await db.from('trackpoints').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
    }

    if (action === 'load-trip-meta') {
      let { data, error } = await db.from('trip_meta').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      if (!data) {
        const insertRes = await db.from('trip_meta').insert([{ id: 1, title: 'Mijn Reis', status: 'actief' }]).select();
        if (insertRes.error) throw insertRes.error;
        data = insertRes.data[0];
      }
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tripMeta: data }) };
    }

    if (action === 'save-trip-meta') {
      const { data, error } = await db.from('trip_meta').upsert({ id: 1, ...payload }).select();
      if (error) throw error;
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tripMeta: data[0] }) };
    }

    return { statusCode: 400, body: 'Unknown action' };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
