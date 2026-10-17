# Excellence

Excellence 0.1.0-rc.1 is a self-hosted spreadsheet application with user accounts, file revisions, XLSX/CSV import and export, charts, and optional external assistant providers. It is a release candidate, not a complete Microsoft Excel replacement. [Documentação em português](README.md).

Visit [exc.securityops.co](https://exc.securityops.co). The [Brazilian domain](https://exc.securityops.com.br) redirects to the primary origin.

## Run it yourself

On Linux with Docker Engine and Compose v2, copy `.env.example` to `.env`, set `EXCELLENCE_PUBLIC_URL` to the exact HTTPS origin and `EXCELLENCE_SECURE_COOKIE=true`, then run `docker compose up -d --build`. Port 3210 binds to loopback by default; publish it through an HTTPS reverse proxy that preserves the public Host header. The initial one-time setup token appears in the private service log. There is no default password or public registration.

The `excellence-data` volume holds accounts, files, and revision history. Keep it across container rebuilds. Use `node scripts/backup.mjs` with a protected destination and rehearse restoring a backup. See [operations in English](docs/OPERATIONS.en.md) or [Portuguese](docs/OPERATIONS.md) for the full procedure, and [compatibility](docs/COMPATIBILITY.md) for format limits.

## Security and privacy

Accounts have separate files and sessions use secure cookies and CSRF protection when configured for HTTPS. This version has no multi-factor authentication, email password recovery, or SSO. The server can read stored files. External provider requests are optional and require server-side configuration; do not add provider keys to Git.

Excellence is MIT licensed. Third-party notices are in `THIRD_PARTY_NOTICES.txt`.
