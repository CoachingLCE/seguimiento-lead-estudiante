import crypto from 'crypto';

// Encriptación reversible (AES-256-GCM) — a diferencia de un hash, esto permite
// desencriptar y mostrarle la contraseña actual al Admin en "Accesos".
// La clave sale de la env var PASSWORD_ENCRYPTION_KEY (cualquier string largo y secreto).
function getKey() {
  const secreto = process.env.PASSWORD_ENCRYPTION_KEY || 'clave-de-desarrollo-cambiar-en-produccion';
  // Derivamos una clave de 32 bytes a partir del secreto (salt fijo: no es sensible, solo deriva la key)
  return crypto.scryptSync(secreto, 'ilce-leads-salt', 32);
}

// Formato de almacenamiento: "iv:authTag:cifrado" (todo en hex)
export function encryptPassword(password) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const cifrado = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${cifrado.toString('hex')}`;
}

export function decryptPassword(stored) {
  if (!stored || stored.split(':').length !== 3) return null;
  try {
    const [ivHex, authTagHex, cifradoHex] = stored.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const descifrado = Buffer.concat([decipher.update(Buffer.from(cifradoHex, 'hex')), decipher.final()]);
    return descifrado.toString('utf8');
  } catch (err) {
    return null; // clave incorrecta o dato corrupto
  }
}

export function verifyPassword(password, stored) {
  const actual = decryptPassword(stored);
  if (actual === null) return false;
  // Comparación en tiempo constante
  const bufA = Buffer.from(actual);
  const bufB = Buffer.from(password);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
