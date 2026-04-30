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
  const cancion = findField(['cancion', 'canci', 'musica', 'tema', 'song']) || body.cancion || '';
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

    if (email_cliente) {
      const menuTexto = { normal: 'Alimentación normal', vegetariano: 'Vegetariano', vegano: 'Vegano', celiaco: 'Celíaco', otro: 'Otro' }[menu] || menu;
      const asisteTexto = asiste === 'si' ? '✅ Confirma asistencia' : '❌ No puede asistir';

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_KEY}` },
        body: JSON.stringify({
          from: 'EventDay <bodas@eventday.ar>',
          to: email_cliente,
          subject: `Nueva confirmación — ${nombre}`,
          html: `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4ede8;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">

    <!-- HEADER -->
    <div style="text-align:center;margin-bottom:28px;">
      <p style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#9c7e7e;margin:0 0 10px;">EventDay · Confirmación de asistencia</p>
      <h1 style="font-size:30px;font-weight:400;margin:0;color:#3d2b2b;font-family:Georgia,serif;">${evento.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</h1>
    </div>

    <!-- CARD -->
    <div style="background:#fdfaf9;border-radius:14px;padding:28px 24px;margin-bottom:24px;border:1px solid #e8ddd9;">

      <p style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#9c7e7e;margin:0 0 18px;">Nueva respuesta recibida</p>

      <!-- TABLA -->
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 16px 12px 0;border-bottom:1px solid #ede5e1;font-size:11px;color:#9c7e7e;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;vertical-align:top;width:38%;">Nombre</td>
          <td style="padding:12px 0 12px 16px;border-bottom:1px solid #ede5e1;font-size:15px;color:#3d2b2b;vertical-align:top;">${nombre}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px 12px 0;border-bottom:1px solid #ede5e1;font-size:11px;color:#9c7e7e;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;vertical-align:top;width:38%;">Estado</td>
          <td style="padding:12px 0 12px 16px;border-bottom:1px solid #ede5e1;font-size:15px;color:#3d2b2b;vertical-align:top;">${asisteTexto}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px 12px 0;border-bottom:1px solid #ede5e1;font-size:11px;color:#9c7e7e;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;vertical-align:top;width:38%;">Menú</td>
          <td style="padding:12px 0 12px 16px;border-bottom:1px solid #ede5e1;font-size:15px;color:#3d2b2b;vertical-align:top;">${menuTexto}</td>
        </tr>
        ${acompaniantes ? `
        <tr>
          <td style="padding:12px 16px 12px 0;border-bottom:1px solid #ede5e1;font-size:11px;color:#9c7e7e;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;vertical-align:top;width:38%;">Acompañantes</td>
          <td style="padding:12px 0 12px 16px;border-bottom:1px solid #ede5e1;font-size:15px;color:#3d2b2b;vertical-align:top;">${acompaniantes}</td>
        </tr>` : ''}
        ${cancion ? `
        <tr>
          <td style="padding:12px 16px 12px 0;font-size:11px;color:#9c7e7e;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;vertical-align:top;width:38%;">Canción</td>
          <td style="padding:12px 0 12px 16px;font-size:15px;color:#3d2b2b;vertical-align:top;">🎵 ${cancion}</td>
        </tr>` : ''}
      </table>
    </div>

    <!-- PIE CON LOGO -->
    <div style="text-align:center;padding-top:20px;border-top:1px solid #e0d4cc;">
      <img src="https://eventday.ar/wp-content/uploads/2026/01/Logo.webp" alt="EventDay" style="width:110px;max-width:100%;height:auto;margin-bottom:10px;opacity:0.85;" />
      <p style="font-size:11px;color:#555555;letter-spacing:0.1em;text-transform:uppercase;margin:0;">Invitaciones digitales</p>
    </div>

  </div>
</body>
</html>`,
        }),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
