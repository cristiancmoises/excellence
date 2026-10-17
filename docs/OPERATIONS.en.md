# Excellence operations

The hosted service is [exc.securityops.co](https://exc.securityops.co). [exc.securityops.com.br](https://exc.securityops.com.br) redirects to the primary origin. For another deployment, copy `.env.example` to `.env` and set the exact HTTPS `EXCELLENCE_PUBLIC_URL` and `EXCELLENCE_SECURE_COOKIE=true`. The proxy must preserve the public Host header. The application does not use `X-Forwarded-*` to decide who may sign in.

Run `docker compose up -d --build`. The host port defaults to loopback on 3210. Put an HTTPS proxy in front before entering passwords from another machine. The first one-time setup token is in the private service log (`docker compose logs excellence`); use it to create the administrator, then restrict access to that log. There is no default password or public registration.

## Storage and backup

The `excellence-data` volume stores the SQLite WAL database, accounts, spreadsheets, revisions, and activity. Keep it when recreating containers; `docker compose down -v` deletes it. The service runs as a non-root user with a read-only image filesystem.

The online backup helper creates a consistent database copy and runs SQLite integrity checks. From the container, set `EXCELLENCE_BACKUP_DIR` to a protected writable directory and run `node scripts/backup.mjs`. Copy the resulting file off the volume to independent protected storage. Backups contain files and password hashes and are not encrypted by the application. No automatic backup schedule or retention is provided.

To restore, stop the service, preserve the current data directory, verify the backup with SQLite, replace `excellence.sqlite` while the service is stopped, and remove only the stale `excellence.sqlite-wal` and `excellence.sqlite-shm` files from that restored destination. Start the service and check login, a spreadsheet, its formulas, and revision history. Keep the old data copy until the drill succeeds. The [Portuguese operations guide](OPERATIONS.md) has the detailed Docker commands and ownership notes.

## Monitoring and limits

Monitor `GET /health`, disk space, restarts, backup age, and proxy errors. This version has no MFA, email password recovery, or SSO. Administrators can manage accounts but do not have a user interface for reading another user's files. External assistant providers are optional; keep provider keys in private runtime configuration. A green build or health check does not prove full spreadsheet compatibility; check [known limits](COMPATIBILITY.md) with representative files.
