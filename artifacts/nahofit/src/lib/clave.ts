/** Contraseña al azar de 10 caracteres, sin letras que se confunden (l, I, O, 0, 1). */
export function claveAleatoria() {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => letras[n % letras.length]).join("");
}
