/**
 * Lista de compras de un plan de comida semanal: suma los ingredientes de los 7 días
 * (mismo ingrediente = una sola línea) y los agrupa por sección del súper.
 */
export interface ItemCompra { nombre: string; gramos: number }
export interface SeccionCompra { nombre: string; items: ItemCompra[] }
export interface ListaCompras { secciones: SeccionCompra[]; sinDetalle: string[]; totalItems: number }

const quitarAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const clave = (t: string) => quitarAcentos(t).toLowerCase().replace(/\s+/g, " ").trim();
const palabras = (lista: string[]) => new RegExp(`\\b(${lista.join("|")})`);

// En orden: la primera que coincide gana (por eso "mantequilla de maní" va antes que lácteos).
const SECCIONES: [string, RegExp][] = [
  ["Legumbres, semillas y frutos secos", /mantequilla de (mani|cacahuate)|crema de cacahuate/],
  ["Lácteos", palabras(["leche", "yogur", "queso", "kefir", "requeson", "crema", "mantequilla"])],
  ["Carnes, pescado y huevos", palabras(["pollo", "pechuga", "muslo", "carne", "res", "cerdo", "pavo", "jamon", "lomo", "bistec", "molida", "pescado", "atun", "salmon", "tilapia", "camaron", "sardina", "huevo", "clara", "chorizo", "salchicha"])],
  ["Legumbres, semillas y frutos secos", palabras(["frijol", "lenteja", "garbanzo", "haba", "soya", "almendra", "nuez", "nueces", "mani", "cacahuate", "semilla", "chia", "linaza", "pistache", "maranon"])],
  ["Frutas", palabras(["banano", "banana", "platano", "manzana", "pera", "naranja", "mandarina", "fresa", "frutos rojos", "mora", "arandano", "papaya", "mango", "pina", "uva", "kiwi", "melon", "sandia", "limon", "lima", "aguacate", "palta", "durazno", "guayaba", "fruta"])],
  ["Verduras", palabras(["brocoli", "espinaca", "lechuga", "tomate", "jitomate", "cebolla", "zanahoria", "pepino", "pimiento", "chile", "calabacin", "calabaza", "ejote", "judia", "coliflor", "apio", "champinon", "hongo", "ajo", "cilantro", "perejil", "repollo", "col", "berenjena", "nopal", "ensalada", "vegetal", "verdura", "esparrago", "betabel", "remolacha", "rabano", "acelga", "kale"])],
  ["Granos, pan y tubérculos", palabras(["arroz", "avena", "pan", "tortilla", "pasta", "espagueti", "fideo", "quinoa", "quinua", "papa", "patata", "camote", "batata", "yuca", "maiz", "elote", "cereal", "granola", "galleta", "arepa", "harina"])],
];
const OTROS = "Otros (aceites, condimentos, etc.)";
const ORDEN = ["Carnes, pescado y huevos", "Lácteos", "Frutas", "Verduras", "Granos, pan y tubérculos", "Legumbres, semillas y frutos secos", OTROS];

function seccionDe(nombre: string): string {
  const k = clave(nombre);
  for (const [seccion, re] of SECCIONES) if (re.test(k)) return seccion;
  return OTROS;
}

/** Junta singular y plural ("huevo"/"huevos", "frijol"/"frijoles"): usa la clave que ya exista. */
function claveGuardada(suma: Map<string, unknown>, k: string): string {
  if (suma.has(k)) return k;
  const partes = k.split(" ");
  const ultima = partes.pop() ?? "";
  const base = partes.length ? partes.join(" ") + " " : "";
  for (const v of [ultima.replace(/es$/, ""), ultima.replace(/s$/, ""), ultima + "s", ultima + "es"]) {
    if (v && v !== ultima && suma.has(base + v)) return base + v;
  }
  return k;
}

const capital = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

export function armarListaCompras(dias: Array<{ comidas?: unknown }>): ListaCompras {
  const suma = new Map<string, ItemCompra>();
  const sinDetalle = new Set<string>();
  for (const dia of dias ?? []) {
    const comidas = Array.isArray(dia?.comidas) ? (dia.comidas as any[]) : [];
    for (const comida of comidas) {
      const ingredientes = Array.isArray(comida?.ingredientes) ? comida.ingredientes : [];
      if (!ingredientes.length) {
        const d = String(comida?.descripcion ?? comida?.nombre ?? "").trim();
        if (d) sinDetalle.add(d);
        continue;
      }
      for (const ing of ingredientes) {
        const nombre = String(ing?.nombre ?? "").trim();
        if (!nombre) continue;
        const gramos = Number(ing?.gramos) || 0;
        const k = claveGuardada(suma, clave(nombre));
        const actual = suma.get(k);
        if (actual) actual.gramos += gramos;
        else suma.set(k, { nombre: capital(nombre), gramos });
      }
    }
  }
  const porSeccion = new Map<string, ItemCompra[]>();
  for (const item of suma.values()) {
    const s = seccionDe(item.nombre);
    porSeccion.set(s, [...(porSeccion.get(s) ?? []), item]);
  }
  const secciones = ORDEN.filter((s) => porSeccion.has(s)).map((s) => ({
    nombre: s,
    items: porSeccion.get(s)!.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  }));
  return { secciones, sinDetalle: [...sinDetalle], totalItems: suma.size };
}

/** "350 g", "1.4 kg"; los huevos también en piezas (≈ 50 g cada uno). */
export function cantidadTexto(item: ItemCompra): string {
  const g = Math.round(item.gramos);
  if (!g) return "";
  const peso = g >= 1000 ? `${(g / 1000).toFixed(1).replace(/\.0$/, "")} kg` : `${g} g`;
  if (/\bhuevo/.test(clave(item.nombre)) && !/\bclara/.test(clave(item.nombre))) {
    const piezas = Math.max(1, Math.round(g / 50));
    return `≈ ${piezas} ${piezas === 1 ? "pieza" : "piezas"} (${peso})`;
  }
  return peso;
}
