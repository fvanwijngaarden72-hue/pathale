const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  const { action, payload } = JSON.parse(event.body);

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

    return { statusCode: 400, body: 'Unknown action' };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
