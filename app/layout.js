import './globals.css';
import VersionBadge from '../components/VersionBadge';
import TourGuiado from '../components/TourGuiado';
import ErrorBoundary from '../components/ErrorBoundary';
import RecuperadorDeChunks from '../components/RecuperadorDeChunks';
import { ThemeProvider } from '../lib/ThemeContext';

export const metadata = {
  title: 'ILCE Gestión',
  description: 'App interna de Ventas & Marketing para el Instituto ILCE'
};

export default function RootLayout({ children }) {
  // Este script corre de forma sincrónica ANTES de que se pinte el <body>, así el tema correcto
  // (claro/oscuro/automático según la hora) queda listo desde el primer instante — sin esto,
  // se ve un "flash" del color equivocado durante una fracción de segundo al recargar la página.
  const scriptTema = `
    (function() {
      try {
        var pref = localStorage.getItem('ilce-tema') || 'auto';
        var hora = new Date().getHours();
        var resuelto = pref === 'auto' ? (hora >= 7 && hora < 19 ? 'light' : 'dark') : (pref === 'claro' ? 'light' : 'dark');
        document.documentElement.setAttribute('data-theme', resuelto);
      } catch (e) {}
    })();
  `;

  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>
        <RecuperadorDeChunks />
        <ErrorBoundary>
          <ThemeProvider>
            {children}
            {/* Pedido de Diego (02/10/2026): "sacarlo ya que tenemos el necesito ayuda" — los
                paneles "❓ Ayuda: [pantalla]" quedaban duplicados con el botón flotante de abajo
                a la derecha (TourGuiado), que ya cubre lo mismo. Se saca este gate; el componente
                ComoFunciona queda sin usar pero no se borra, por si hace falta volver atrás. */}
            <VersionBadge />
            <TourGuiado />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
