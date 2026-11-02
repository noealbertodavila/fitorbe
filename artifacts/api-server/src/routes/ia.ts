import { Router } from "express";
import { requireAuth, requireRol } from "../middlewares/auth";
import { usoDelMes, LIMITE_CHAT_DIA } from "../lib/ia-uso";
import { analizarNutricion, analizarRutina, clienteCompleto } from "../lib/evaluacion-ia";

const router = Router();

/** Cuánta IA le queda al coach este mes (para el contador en pantalla). */
router.get("/ia/uso", requireAuth, requireRol("coach"), async (req, res) => {
  const me = (req as any).usuario;
  res.json({ ...(await usoDelMes(me.id)), limiteChatDia: LIMITE_CHAT_DIA });
});

/**
 * La evaluación y las metas de un cliente, sin usar la IA (gratis).
 * ?tipo=nutricion|rutina&semana=YYYY-MM-DD
 */
router.get("/ia/analisis/:clienteId", requireAuth, requireRol("coach"), async (req, res) => {
  const c = await clienteCompleto(parseInt(String(req.params.clienteId)));
  if (!c) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return;
  }
  const semana = String(req.query.semana ?? "");
  if (req.query.tipo === "rutina") {
    const a = await analizarRutina(c, semana);
    res.json({ resumen: a.resumen });
    return;
  }
  const a = await analizarNutricion(c, semana);
  res.json({ resumen: a.resumen, metas: a.metas, objetivo: a.objetivo, simplificar: a.simplificar });
});

export default router;
