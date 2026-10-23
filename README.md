# Fitorbe

Plataforma para entrenadores: cada entrenador lleva a sus clientes (rutinas, comidas, ánimo, fotos y medidas, mensajes y pagos) en su propio espacio.

Empresa aparte, sin nada compartido con otros productos. Parte del código de la app de NAHOFIT.LIFE (de Nahomy), que será la primera entrenadora de la plataforma.

## Fases
0. Base del código y revisión de seguridad ✅
1. Varios coaches con datos separados, superadmin, registro con 14 días de prueba, marca de cada coach (nombre y logo) ✅
2. Cobros a los coaches con Stripe (al terminar la prueba)
3. Página pública de cada coach (fitorbe.com/c/su-negocio) y colores propios
4. Pasar a NAHOFIT (Nahomy) como primera coach de Fitorbe
5. Publicar en fitorbe.com y lanzamiento

## Roles
- **Superadmin** (`rol = admin`): administra coaches (crear, activar, suspender, extender la prueba). No ve datos privados de los clientes.
- **Coach**: crea y acompaña a sus clientes (rutinas, comidas, ánimo, mensajes, pagos, planes, solicitudes). Solo ve a los suyos.
- **Cliente**: entra a su app y ve solo lo suyo.

## Pruebas
`tests/coaches.test.mjs` revisa en cada cambio (GitHub Actions) que un coach no pueda ver ni tocar nada de otro coach, que el superadmin no vea datos privados y que un coach suspendido o con la prueba vencida quede en pausa con sus clientes.
