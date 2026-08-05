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
  return (
    <html lang="es">
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
