/**
 * El texto de una respuesta de Claude. Los modelos nuevos pueden mandar primero un
 * bloque de "razonamiento" (thinking) y después el texto, así que no se puede tomar
 * solo el primer bloque: se juntan todos los bloques de texto.
 */
export function textoDeRespuesta(message: { content: Array<{ type: string; text?: string }> }): string | null {
  const partes = message.content.filter((b) => b.type === "text" && typeof b.text === "string").map((b) => b.text as string);
  return partes.length ? partes.join("") : null;
}
