import './globals.css';
import ComoFuncionaGate from '../components/ComoFuncionaGate';
import VersionBadge from '../components/VersionBadge';
import TutorialHandbook from '../components/TutorialHandbook';
import { ThemeProvider } from '../lib/ThemeContext';

export const metadata = {
  title: 'Seguimiento de LEAD-Estudiante — ILCE',
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
        <ThemeProvider>
          {children}
          <ComoFuncionaGate />
          <VersionBadge />
          <TutorialHandbook />
        </ThemeProvider>
      </body>
    </html>
  );
}
