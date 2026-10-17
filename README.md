# Excellence

Excellence is a self-hosted spreadsheet application with a familiar command bar, formulas, private workbooks, revision history, XLSX/CSV import and export, charts, and an optional local spreadsheet assistant. English is the default interface and documentation language; Brazilian Portuguese is available in the language selector. [Documentação em português](README.pt-BR.md).

Visit [exc.securityops.co](https://exc.securityops.co) or [try the demo](https://exc.securityops.co/demo). The [Brazilian domain](https://exc.securityops.com.br) redirects to the primary origin.

![Excellence spreadsheet workspace](docs/screenshots/excellence-desktop.png)

The public demo starts with a sample budget. Edit cells, try formulas and explore the controls without creating an account. Uploads are disabled; changes stay in memory and are discarded on reload. The demo cannot access private workbooks. Its optional local assistant has server-enforced shared usage limits, small inputs and a short timeout.

<details><summary>Small-screen layout</summary>

![Excellence on a small screen](docs/screenshots/excellence-mobile.png)

</details>

## Working with spreadsheets

- Use the formula bar or edit a cell directly. Formula names are in English, for example `=SUM(B2:B7)`.
- Save a workbook to your account, reopen it from Files and review previous revisions. Conflicting edits are reported instead of silently overwriting another revision.
- Import and export XLSX/CSV in the authenticated workspace. Keep your original file: macros, advanced formatting and other Excel features do not all round-trip.
- Use the responsive menus on narrow screens; the grid scrolls independently so large sheets remain usable.

This is a release candidate, not a complete Microsoft Excel replacement. See [format and feature compatibility](docs/COMPATIBILITY.md).

## Run it yourself

On Linux with Docker Engine and Compose v2:

```sh
cp .env.example .env
docker compose up -d --build
```

Open `http://localhost:3210`. For a public deployment, set `EXCELLENCE_PUBLIC_URL` to the exact HTTPS origin and `EXCELLENCE_SECURE_COOKIE=true` before starting. Port 3210 binds to loopback by default; publish it through an HTTPS reverse proxy that preserves the public Host header. The initial one-time setup token appears in the private service log (`docker compose logs excellence`). There is no default password or public registration.

The `excellence-data` volume holds accounts, files, and revision history. Keep it across container rebuilds. Use `node scripts/backup.mjs` with a protected destination and rehearse restoring a backup. See [operations in English](docs/OPERATIONS.md) or [Portuguese](docs/OPERATIONS.pt-BR.md) for the full procedure, and [compatibility](docs/COMPATIBILITY.md) for format limits.

## Security and privacy

Accounts have separate files and sessions use secure cookies and CSRF protection when configured for HTTPS. This version has no multi-factor authentication, email password recovery, or SSO. The server can read stored files. External provider requests are optional and require server-side configuration; do not add provider keys to Git.

Excellence is MIT licensed. Third-party notices are in `THIRD_PARTY_NOTICES.txt`.

## Local spreadsheet assistant

The local deployment uses Qwen3.5 2B, quantized to Q4_K_M, through Ollama. The model is Apache-2.0 licensed and runs on the operator's server. Only the selected cells and your request are sent to the configured model. Responses are proposed changes: review them before applying. Model output can be wrong and never runs code or macros.

See [local model setup and limits](docs/LLM.md) ([português](docs/LLM.pt-BR.md)). No paid provider is required.

## Development

Source integrity is recorded with SecOps CodeMark. See [verification instructions](docs/INTEGRITY.md); private signing keys are never distributed.

Node.js 24 is required. Install the locked dependencies with `npm ci --ignore-scripts`, then run `npm test` and `npm run build`. Browser checks use `npm run test:e2e`. See [operations](docs/OPERATIONS.md) for backups, restores and deployment updates.
