const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export function backupEmail({ createdAt, filename, bytes }) {
  const date = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
  const size =
    new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(
      bytes / 1024,
    ) + " KB";
  const text = `ZENTRO · TU COPIA MENSUAL\n\nTu copia de seguridad está aquí.\nCreada el ${date} (hora de Madrid).\n\nAdjunto: ${filename} (${size}).\nContiene la base completa de Zentro, comprimida en GZIP. No necesitas abrir ningún enlace.\n\nGuarda el adjunto. Para recuperar los datos, extrae el archivo .sqlite.gz con una herramienta compatible con GZIP. Con Zentro cerrado, conserva primero una copia de la base actual y sustituye Zentro.Api/Data/zentro.db por la base extraída, renombrándola zentro.db. Si usas una ruta personalizada, restaura en esa ubicación.\n\nEl archivo contiene tus datos financieros y no lleva contraseña. Guárdalo en un lugar privado.\n\nZentro · Tus finanzas, en un solo lugar.\n`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tu copia mensual de Zentro</title></head>
<body style="margin:0;padding:0;background:#f4f2f7;color:#302a3b;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">Tu base de datos de Zentro, adjunta y lista para guardar.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f7"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="padding:30px 32px;background:#32244b;color:#ffffff;font-size:25px;font-weight:bold;letter-spacing:-1px">zentro<span style="color:#c4a8ec">.</span><div style="margin-top:8px;font-size:11px;font-weight:normal;letter-spacing:2px;color:#ddd1ee">TUS FINANZAS, EN UN SOLO LUGAR</div></td></tr>
<tr><td style="padding:36px 32px 24px"><div style="font-size:11px;letter-spacing:2px;font-weight:bold;color:#76539c">TU COPIA MENSUAL</div><h1 style="font-size:30px;line-height:1.2;letter-spacing:-1px;margin:16px 0;color:#302a3b">Tus datos, a buen recaudo.</h1><p style="font-size:16px;line-height:1.7;color:#6c6477;margin:0">Aquí tienes la copia completa de Zentro. La encontrarás adjunta a este correo, lista para descargar y guardar.</p></td></tr>
<tr><td style="padding:0 32px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0fb;border:1px solid #e6dbee;border-radius:12px"><tr><td style="padding:22px"><div style="font-size:11px;letter-spacing:1px;font-weight:bold;color:#76539c">ARCHIVO ADJUNTO · SQLITE + GZIP</div><p style="font-size:16px;font-weight:bold;overflow-wrap:anywhere;word-break:break-all;line-height:1.5;margin:12px 0;color:#302a3b">${escape(filename)}</p><div style="font-size:13px;line-height:1.8;color:#6c6477">${escape(size)} · Base de datos completa<br>Creada el ${escape(date)} · Madrid</div></td></tr></table></td></tr>
<tr><td style="padding:0 32px 30px"><h2 style="font-size:18px;margin:0 0 12px;color:#302a3b">Guárdala hoy. Recupérala cuando lo necesites.</h2><p style="font-size:14px;line-height:1.8;color:#6c6477;margin:0 0 12px">Descarga el adjunto y consérvalo en un lugar privado. No hay enlaces ni archivos que caduquen.</p><p style="font-size:14px;line-height:1.8;color:#6c6477;margin:0">Para restaurar: extrae el GZIP, cierra Zentro y conserva primero una copia de tu base actual. Sustituye <strong>Zentro.Api/Data/zentro.db</strong> por el archivo extraído, renombrándolo <strong>zentro.db</strong>. Si configuraste otra ubicación, utiliza esa ruta.</p></td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #eee8f3;font-size:12px;line-height:1.8;color:#80758b">Este adjunto contiene tus datos financieros y no lleva contraseña.<br>Copia de seguridad de Zentro · Enviada desde tu PC.</td></tr>
</table><p style="font-size:12px;color:#91869b;margin:20px 0 0">Un pequeño hábito para cuidar lo importante.</p></td></tr></table></body></html>`;
  return { text, html };
}
