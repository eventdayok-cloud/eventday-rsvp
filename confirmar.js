export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  let nombre, asiste, menu, acompaniantes, cancion, evento, email_cliente;
  const body = req.body;

  if (body.fields && Array.isArray(body.fields)) {
    const get = (ids) => {
      for (const id of ids) {
        const f = body.fields.find(f => f.id === id || (f.title && f.title.toLowerCase().includes(id)));
        if (f && f.value) return f.value;
      }
      return '';
    };
    nombre = get(['nombre', 'name', 'nombre-completo', 'tu-nombre']);
    asiste = get(['asiste', 'asistiras', 'asistir', 'radio']);
    menu = get(['menu', 'alimentacion', 'dato', 'relevante', 'dieta']);
    acompaniantes = get(['acompaniante', 'acompaniantes', 'acompa']);
    cancion = get(['cancion', 'musica', 'tema']);
    evento = get(['evento']) || body.evento || 'sin-evento';
    email_cliente = get(['email_cliente', 'email-cliente']) || body.email_cliente || '';
  } else {
    nombre = body.nombre;
    asiste = body.asiste;
    menu = body.menu;
    acompaniantes = body.acompaniantes;
    cancion = body.cancion;
    evento = body.evento || 'sin-evento';
    email_cliente = body.email_cliente || '';
  }

  if (!asiste) asiste = 'si';
  const al = asiste.toLowerCase();
  if (al.includes('si') || al.includes('sí') || al.includes('alli') || al.includes('allí') || al.includes('estar')) asiste = 'si';
  else if (al.includes('no') || al.includes('lamento') || al.includes('podr')) asiste = 'no';

  if (!menu) menu = 'normal';
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

    if (email_cliente) {
      const menuTexto = { normal: 'Alimentación normal', vegetariano: 'Vegetariano', vegano: 'Vegano', celiaco: 'Celíaco', otro: 'Otro' }[menu] || menu;
      const asisteTexto = asiste === 'si' ? '✅ Confirma asistencia' : '❌ No puede asistir';

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_KEY}` },
        body: JSON.stringify({
          from: 'EventDay <onboarding@resend.dev>',
          to: email_cliente,
          subject: `Nueva confirmación — ${nombre}`,
          html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:40px 24px;color:#3d2b2b;">
            <div style="text-align:center;margin-bottom:32px;">
              <p style="font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#9c7e7e;margin:0;">EventDay · Confirmación de asistencia</p>
              <h1 style="font-size:28px;font-weight:400;margin:12px 0 0;color:#3d2b2b;">${evento}</h1>
            </div>
            <div style="background:#f8f2f1;border-radius:12px;padding:24px;margin-bottom:24px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:10px 0;border-bottom:1px solid #e8ddd9;font-size:12px;color:#9c7e7e;text-transform:uppercase;width:40%;">Nombre</td><td style="padding:10px 0;border-bottom:1px solid #e8ddd9;font-size:15px;">${nombre}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #e8ddd9;font-size:12px;color:#9c7e7e;text-transform:uppercase;">Estado</td><td style="padding:10px 0;border-bottom:1px solid #e8ddd9;font-size:15px;">${asisteTexto}</td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #e8ddd9;font-size:12px;color:#9c7e7e;text-transform:uppercase;">Menú</td><td style="padding:10px 0;border-bottom:1px solid #e8ddd9;font-size:15px;">${menuTexto}</td></tr>
                ${acompaniantes ? `<tr><td style="padding:10px 0;border-bottom:1px solid #e8ddd9;font-size:12px;color:#9c7e7e;text-transform:uppercase;">Acompañantes</td><td style="padding:10px 0;border-bottom:1px solid #e8ddd9;font-size:15px;">${acompaniantes}</td></tr>` : ''}
                ${cancion ? `<tr><td style="padding:10px 0;font-size:12px;color:#9c7e7e;text-transform:uppercase;">Canción</td><td style="padding:10px 0;font-size:15px;">🎵 ${cancion}</td></tr>` : ''}
              </table>
            </div>
            <div style="border-top:1px solid #e8ddd9;padding-top:20px;text-align:center;">
              <p style="font-size:11px;color:#c9a09a;letter-spacing:.1em;text-transform:uppercase;margin:0;">EventDay · Invitaciones digitales</p>
            </div>
          </div>`,
        }),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
