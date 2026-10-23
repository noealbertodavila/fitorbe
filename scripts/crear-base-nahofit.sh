#!/usr/bin/env bash
# Crea la base "nahofit" con su propio usuario dentro de un servidor de Postgres
# que ya existe (hoy: el de Obrix en Render). En Obrix no se cambia nada: el
# usuario nahofit no tiene permiso sobre sus tablas, y la base nahofit es aparte.
#
# Uso:  OBRIX_DB_URL="postgresql://..." bash scripts/crear-base-nahofit.sh
# Deja la dirección de la base nueva en el archivo .nahofit-db-url (no se sube a GitHub)
# sin mostrar la contraseña en pantalla.
set -euo pipefail
: "${OBRIX_DB_URL:?Falta OBRIX_DB_URL}"

PASS=$(node -e 'console.log(require("crypto").randomBytes(24).toString("base64url"))')
q() { psql "$OBRIX_DB_URL" -v ON_ERROR_STOP=1 -qtAc "$1"; }

if [ "$(q "select 1 from pg_roles where rolname='nahofit'")" != "1" ]; then
  q "create role nahofit login password '$PASS'"
else
  q "alter role nahofit login password '$PASS'"
fi
if [ "$(q "select 1 from pg_database where datname='nahofit'")" != "1" ]; then
  # En Postgres 16, para crear la base a nombre de nahofit hay que ser miembro
  # de ese usuario un momento; después se quita.
  q "grant nahofit to current_user"
  q "create database nahofit owner nahofit"
  q "revoke nahofit from current_user"
fi
# Que nadie más se conecte a la base nahofit.
q "revoke all on database nahofit from public"

node -e '
const u = new URL(process.env.OBRIX_DB_URL);
u.username = "nahofit"; u.password = process.argv[1]; u.pathname = "/nahofit";
const interna = new URL(u); interna.hostname = u.hostname.split(".")[0];
require("fs").writeFileSync(".nahofit-db-url",
  "Para Render (DATABASE_URL del servicio nahofit):\n" + interna + "\n\nDesde fuera de Render:\n" + u + "\n", { mode: 0o600 });
' "$PASS"
psql "$(sed -n 5p .nahofit-db-url)" -qtAc "select 'Conexión a la base nahofit: OK, usuario ' || current_user"
grep -qx '.nahofit-db-url' .gitignore 2>/dev/null || echo ".nahofit-db-url" >> .gitignore
echo "Listo. La dirección está en el archivo .nahofit-db-url"
