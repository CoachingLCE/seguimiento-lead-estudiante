/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Todo excepto los archivos estáticos de Next (esos ya tienen hash en el nombre,
        // así que un deploy nuevo automáticamente usa otro nombre de archivo — no hace falta
        // tocarlos). Esto evita que el navegador se quede pegado con una versión vieja de la
        // página y obligue a hacer Ctrl+Shift+R para ver los cambios nuevos.
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }
        ]
      }
    ];
  }
};
module.exports = nextConfig;
