'use client';
import { useEffect, useState } from 'react';

const KEY_VISTO = 'ilce-leads-tutorial-visto';

const PASOS = [
  {
    titulo: '¡Bienvenido/a! 👋',
    texto:
      'Antes de arrancar, te mostramos rápido cómo funciona esta app. Son solo 5 pasos — mirá el tutorial o tocá "Omitir" para empezar directo.'
  },
  {
    titulo: 'Nuevo lead y seguimiento',
    texto:
      'En "Nuevo lead" cargás nombre, WhatsApp, curso y cómo llegó. La fecha se pone sola. Según quién lo carga, se genera el seguimiento automático (Lote 1 a las 48hs, Lote 2 a los 10 días) o va directo a Lote 0 si es una consulta de MKT/Facebook.'
  },
  {
    titulo: 'Marcar una venta',
    texto:
      'Desde el Dashboard, botón "Marcar venta". Elegís medio de pago y si paga en cuotas o de una vez. Queda reflejado al toque en Reportes.'
  },
  {
    titulo: 'Roles y accesos',
    texto:
      'Cada persona ve lo que le corresponde: Inscripciones carga y vende, Coordinador ve todo y reasigna lotes, Estudiantes marca inscritos, y Admin (Diego) maneja los accesos de todos.'
  },
  {
    titulo: '¿Te perdiste algo?',
    texto:
      'Al pie de cada pantalla hay una sección "📖 Cómo funciona esta app" con el detalle completo. Y podés volver a ver este tutorial tocando el botón 💡 en cualquier momento.'
  }
];

export default function TutorialHandbook() {
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    const visto = typeof window !== 'undefined' && window.localStorage.getItem(KEY_VISTO);
    if (!visto) {
      setAbierto(true);
    }
  }, []);

  function cerrar() {
    window.localStorage.setItem(KEY_VISTO, 'true');
    setAbierto(false);
    setPaso(0);
  }

  function abrirDeNuevo() {
    setPaso(0);
    setAbierto(true);
  }

  const esUltimo = paso === PASOS.length - 1;

  return (
    <>
      <button
        onClick={abrirDeNuevo}
        className="fixed bottom-3 left-4 flex items-center gap-1.5 text-xs text-textSec bg-surface2 border border-border rounded-full px-3 py-1.5 z-40 hover:border-accentTeal hover:text-text no-print"
      >
        💡 ¿Cómo funciona esta app?
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 no-print">
          <div className="w-full max-w-sm bg-surface2 border border-border rounded-2xl p-6">
            <p className="text-textMuted text-xs mb-2">{paso + 1} / {PASOS.length}</p>
            <h3 className="text-lg font-semibold mb-2">{PASOS[paso].titulo}</h3>
            <p className="text-textSec text-sm mb-6 leading-relaxed">{PASOS[paso].texto}</p>
            <div className="flex items-center justify-between">
              <button onClick={cerrar} className="text-textMuted text-sm underline">
                Omitir
              </button>
              <button
                onClick={() => (esUltimo ? cerrar() : setPaso(paso + 1))}
                className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-5 py-2 text-sm font-semibold"
              >
                {esUltimo ? 'Empezar' : 'Siguiente →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
