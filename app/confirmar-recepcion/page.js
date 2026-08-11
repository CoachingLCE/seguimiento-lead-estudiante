'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Contenido() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const tipo = searchParams.get('tipo');
  const [estado, setEstado] = useState('cargando'); // cargando | ok | error
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (!id) { setEstado('error'); return; }
    fetch('/api/confirmar-recepcion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, tipo })
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.error) { setEstado('error'); return; }
        setNombre(r.nombre || '');
        setEstado('ok');
      })
      .catch(() => setEstado('error'));
  }, [id, tipo]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '16px', fontFamily: '-apple-system, Segoe UI, Arial, sans-serif',
      textAlign: 'center', padding: '24px', background: '#0b0e1a', color: '#eef0f8'
    }}>
      <p style={{ fontSize: 40 }}>{estado === 'ok' ? '✅' : estado === 'error' ? '⚠️' : '⏳'}</p>
      {estado === 'cargando' && <p style={{ fontSize: 15, opacity: 0.8 }}>Confirmando…</p>}
      {estado === 'ok' && (
        <>
          <p style={{ fontSize: 18, fontWeight: 700 }}>¡Gracias{nombre ? `, ${nombre}` : ''}!</p>
          <p style={{ fontSize: 14, opacity: 0.75, maxWidth: 380 }}>
            Ya avisamos a nuestro equipo del Departamento de Estudiantes que recibiste el correo.
          </p>
        </>
      )}
      {estado === 'error' && (
        <>
          <p style={{ fontSize: 18, fontWeight: 700 }}>No pudimos confirmar</p>
          <p style={{ fontSize: 14, opacity: 0.75, maxWidth: 380 }}>
            El link puede estar vencido o incompleto. Escribinos a estudiantes@institutoilce.com y te ayudamos.
          </p>
        </>
      )}
    </div>
  );
}

export default function ConfirmarRecepcionPage() {
  return (
    <Suspense fallback={null}>
      <Contenido />
    </Suspense>
  );
}
