# Excellence operations

[Português brasileiro](OPERATIONS.pt-BR.md)

The hosted service is [exc.securityops.co](https://exc.securityops.co). [exc.securityops.com.br](https://exc.securityops.com.br) redirects to the primary origin. For another deployment, copy `.env.example` to `.env` and set the exact HTTPS `EXCELLENCE_PUBLIC_URL` and `EXCELLENCE_SECURE_COOKIE=true`. The proxy must preserve the public Host header. The application does not use `X-Forwarded-*` to decide who may sign in.

Run `docker compose up -d --build`. The host port defaults to loopback on 3210. Put an HTTPS proxy in front before entering passwords from another machine. The first one-time setup token is in the private service log (`docker compose logs excellence`); use it to create the administrator, then restrict access to that log. There is no default password or public registration.

## Storage and backup

The `excellence-data` volume stores the SQLite WAL database, accounts, spreadsheets, revisions, and activity. Keep it when recreating containers; `docker compose down -v` deletes it. The service runs as a non-root user with a read-only image filesystem.

The online backup helper creates a consistent database copy and runs SQLite integrity checks. From the container, set `EXCELLENCE_BACKUP_DIR` to a protected writable directory and run `node scripts/backup.mjs`. Copy the resulting file off the volume to independent protected storage. Backups contain files and password hashes and are not encrypted by the application. No automatic backup schedule or retention is provided.

To restore, stop the service, preserve the current data directory, verify the backup with SQLite, replace `excellence.sqlite` while the service is stopped, and remove only the stale `excellence.sqlite-wal` and `excellence.sqlite-shm` files from that restored destination. Start the service and check login, a spreadsheet, its formulas, and revision history. Keep the old data copy until the drill succeeds. The [Portuguese operations guide](OPERATIONS.pt-BR.md) has the detailed Docker commands and ownership notes.

The container runs as UID 1000. Make the backup destination writable by that
user, then create the online snapshot:

```sh
docker compose exec -e EXCELLENCE_BACKUP_DIR=/backups excellence node scripts/backup.mjs
```

Alternatively write to `/data/backups` and use `docker compose cp` to copy the
reported file to protected host storage. Do not copy only a live `.sqlite` file
while WAL writes are in progress. A direct server uses `EXCELLENCE_DATA_DIR` or
the project's `data` directory. The Linux launcher uses
`$XDG_DATA_HOME/excellence/data` (default `~/.local/share/excellence/data`);
Windows uses `%LOCALAPPDATA%\Excellence\data`.

Private workspaces keep a recovery draft per account in browser storage. This
can fail because of space or browser policy; server saving remains authoritative.
Pending edits still trigger an exit warning when recovery storage is unavailable.
The anonymous demo uses memory instead of this account recovery mechanism.

## Local model and demonstration

The hosted Excellence service runs in its own Proxmox CT155. Its optional Ollama
service is on the private Compose network; port 11434 is not published. Use:

```sh
docker compose -f compose.yaml -f deploy/compose.ollama.yaml up -d ollama
docker compose -f compose.yaml -f deploy/compose.ollama.yaml exec ollama ollama pull qwen3.5:2b-q4_K_M
docker compose -f compose.yaml -f deploy/compose.ollama.yaml up -d --build excellence
```

Set `EXCELLENCE_DEMO_AI=true` in private runtime configuration only after the
model is installed. The `/demo` spreadsheet is anonymous and in-memory, with no
uploads, account data or server workbook writes. Model requests use a separate
restricted endpoint. Budgets and the single-inference lease persist in SQLite.
The source-address budget uses the socket address, not untrusted forwarded
headers; behind a proxy, visitors share that proxy's quota. See [limits](LLM.md).
Keep one application instance; a public inference endpoint is not a general chat
service and rate limits do not replace network-level denial-of-service controls.
The hosted HTTPS edge additionally allows a burst of two above one request per
minute per client address for the demo model route, rejects bodies above 2 KiB,
and restricts that route to POST. These proxy settings are separate from the
persistent application quota.

The selected model's observed Ollama digest is recorded in
[`deploy/model.json`](../deploy/model.json). Before enabling inference or after
pulling a model again, compare that digest with `/api/tags` on the private
Ollama service. A matching tag name alone is not an immutable pin. Do not replace
the expected digest silently; qualify an intended update and record it.

## Service checks

Monitor `GET /health`, disk space, restarts, backup age, and proxy errors. This version has no MFA, email password recovery, or SSO. Administrators can manage accounts but do not have a user interface for reading another user's files. External assistant providers are optional; keep provider keys in private runtime configuration. A green build or health check does not prove full spreadsheet compatibility; check [known limits](COMPATIBILITY.md) with representative files.

Accounts use individually salted scrypt hashes, sessions up to 12 hours,
HttpOnly/SameSite=Strict cookies and CSRF tokens. After an update, reuse the data
volume and run one instance against it. Schema version 1 does not provide a
migration from hypothetical future schemas; preserve the previous image and
backup. Do not operate two versions against the same live database.

English is the default interface and documentation language. The language
selector changes to Brazilian Portuguese without reloading or discarding edits.
The API uses the explicit `Accept-Language` choice for errors and assistant
explanations; workbook titles, cells and formula names are not translated.
