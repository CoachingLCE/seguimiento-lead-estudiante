// components/Logo.jsx
// Logo oficial Instituto ILCE.
// - variant="auto"  (por defecto): usa el logo de color en modo claro y el blanco en modo oscuro (Tailwind dark:)
// - variant="color": fuerza el logo de texto azul (para fondos claros)
// - variant="blanco": fuerza el logo de texto blanco (para fondos oscuros, ej. login con fondo de color)
// height: alto en px (el ancho se ajusta solo manteniendo la proporción 919x360)

export default function Logo({ className = "", variant = "auto", height = 40 }) {
  const style = { height, width: "auto" };

  if (variant === "color") {
    return (
      <img
        src="/logo-ilce-color.png"
        alt="Instituto ILCE"
        style={style}
        className={className}
      />
    );
  }

  if (variant === "blanco") {
    return (
      <img
        src="/logo-ilce-blanco.png"
        alt="Instituto ILCE"
        style={style}
        className={className}
      />
    );
  }

  // auto: se adapta al modo claro/oscuro de Tailwind
  return (
    <>
      <img
        src="/logo-ilce-color.png"
        alt="Instituto ILCE"
        style={style}
        className={`block dark:hidden ${className}`}
      />
      <img
        src="/logo-ilce-blanco.png"
        alt="Instituto ILCE"
        style={style}
        className={`hidden dark:block ${className}`}
      />
    </>
  );
}
