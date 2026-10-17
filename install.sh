#!/bin/sh
set -eu
SOURCE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR="${EXCELLENCE_INSTALL_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/excellence/app}"
NODE_BIN=$(command -v node || true)
if [ -z "$NODE_BIN" ] || [ "$(node -p 'process.versions.node.split(".")[0]')" != 24 ]; then
  echo 'Install Node.js 24 LTS and try again. GNU Guix: use a profile/channel that provides Node 24.' >&2
  exit 1
fi
if [ ! -f "$SOURCE/dist/index.html" ]; then echo 'Build not found. Run npm ci and npm run build.' >&2; exit 1; fi
mkdir -p "$APP_DIR/server" "$APP_DIR/src" "$APP_DIR/scripts" "$APP_DIR/docs"
if [ "$(CDPATH= cd -- "$APP_DIR" && pwd)" != "$SOURCE" ]; then
  cp -R "$SOURCE/dist" "$APP_DIR/"
  cp "$SOURCE/server/"*.mjs "$APP_DIR/server/"
  cp "$SOURCE/src/shared.mjs" "$SOURCE/src/error-messages.mjs" "$APP_DIR/src/"
  cp "$SOURCE/scripts/launch.mjs" "$SOURCE/scripts/backup.mjs" "$APP_DIR/scripts/"
  cp -R "$SOURCE/docs/." "$APP_DIR/docs/"
  cp "$SOURCE/LICENSE" "$SOURCE/THIRD_PARTY_NOTICES.txt" "$APP_DIR/"
fi
APPLICATIONS="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
mkdir -p "$APPLICATIONS"
# Desktop Exec uses quoted arguments. Reject paths that cannot be encoded safely here.
case "$APP_DIR$NODE_BIN" in *'"'*|*'`'*|*'$'*|*'%'*|*'\'*) echo 'Path incompatible with a desktop shortcut. Use node scripts/launch.mjs.' >&2; exit 1;; esac
cat > "$APPLICATIONS/excellence.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Excellence
Comment=Open spreadsheets with an AI assistant
Comment[pt_BR]=Planilhas livres com assistência de IA
Exec="$NODE_BIN" "$APP_DIR/scripts/launch.mjs"
Icon=$APP_DIR/dist/trophy.svg
Terminal=true
Categories=Office;Spreadsheet;
DESKTOP
chmod 644 "$APPLICATIONS/excellence.desktop"
printf 'Excellence installed. Open it from the application menu or run:\n"%s" "%s/scripts/launch.mjs"\n' "$NODE_BIN" "$APP_DIR"
