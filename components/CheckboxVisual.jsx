// Reemplaza los emojis ✅/⬜ (que en algunos sistemas/navegadores no renderizan bien —
// "⬜" en particular puede aparecer como un cuadrado sólido de color en vez del cuadrado vacío)
// por un elemento dibujado 100% con CSS, así se ve siempre igual sin importar el sistema.
export default function CheckboxVisual({ marcado, tamano = 16 }) {
  if (marcado) {
    return (
      <span
        style={{ width: tamano, height: tamano }}
        className="inline-flex items-center justify-center rounded bg-successText text-bg font-bold shrink-0"
      >
        <svg width={tamano * 0.65} height={tamano * 0.65} viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5L6 11.5L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span
      style={{ width: tamano, height: tamano }}
      className="inline-block rounded border-2 border-textMuted shrink-0"
    />
  );
}
