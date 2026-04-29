export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const body = req.body;

  const findField = (keys) => {
    for (const key of Object.keys(body)) {
      const keyNorm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const search of keys) {
        if (keyNorm.includes(search)) return body[key];
      }
    }
    return '';
  };

  const nombre = findField(['nombre', 'name']) || body['Tu_nombre_completo'] || body.nombre || '';
  const asisteRaw = findField(['asistir', 'asistas']) || body['¿Asistirás?'] || body.asiste || '';
  const menu = findField(['dato', 'aliment', 'dieta', 'vegetar', 'menu']) || body.menu || 'normal';
  const acompaniantes = findField(['acomp']) || body.acompaniantes || '';
  const cancion = findField(['cancion', 'musica', 'tema']) || body.cancion || '';
  const evento = body.nombre_del_formulario || body.evento || 'sin-evento';
  const email_cliente = body.email_cliente || '';

  let asiste = 'si';
  const al = asisteRaw.toLowerCase();
  if (al.includes('no') || al.includes('lamento') || al.includes('podre') || al.includes('siento')) {
    asiste = 'no';
  }

  if (!nombre) return res.status(400).json({ error: 'Falta el nombre' });

  try {
    const supabaseRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/confirmaciones`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ nombre, asiste, menu, acompaniantes, cancion, evento }),
      }
    );

    if (!supabaseRes.ok) {
      const err = await supabaseRes.text();
      throw new Error('Error Supabase: ' + err);
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
