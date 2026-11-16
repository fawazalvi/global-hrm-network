# Email Settings, Stalwart Mail Server & Coolify Setup Guide

This document explains how to configure, secure, and operate the centralized **Email Settings** subsystem (**Admin → Settings → Email**) in production on your VPS with **Coolify** and **Stalwart**.

---

## 1. Encryption Key Setup (`EMAIL_CONFIG_ENCRYPTION_KEY`)

SMTP and IMAP passwords are encrypted at rest in PostgreSQL using **AES-256-GCM** (`src/backend/email/crypto.ts`).

### Generate a 32-byte key
Run locally or on a secure machine:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add the generated 64-character hex string to your Coolify application **Environment Variables** as a secret:
```env
EMAIL_CONFIG_ENCRYPTION_KEY=<your-64-char-hex-secret>
```
- **Never commit this key to GitHub.**
- **Back it up securely** in your password manager / vault. Losing this key prevents decrypting stored SMTP/IMAP passwords (you would need to re-enter them).
- **Key Rotation**: Set the new key in `EMAIL_CONFIG_ENCRYPTION_KEY` and temporarily set the old key in `EMAIL_CONFIG_ENCRYPTION_KEY_PREVIOUS`. Re-save both SMTP and IMAP passwords in **Admin → Settings → Email**, then remove `EMAIL_CONFIG_ENCRYPTION_KEY_PREVIOUS`.

---

## 2. Optional Server-Side Security Policy Env Vars

| Variable | Purpose |
|---|---|
| `EMAIL_CONFIG_ENCRYPTION_KEY` | **Required** 32-byte hex or base64 key for AES-256-GCM credential encryption. |
| `EMAIL_WORKER_SECRET` | Bearer token for triggering `POST /api/internal/email-worker` from a Coolify cron/scheduler. |
| `EMAIL_ALLOW_PRIVATE_MAIL_HOSTS` | Set to `true` only if your mail host resolves to a private VPS/Docker IP (`10.x`, `172.16-31.x`, `192.168.x`, or single-label hostname). |
| `EMAIL_ALLOWED_MAIL_HOSTS` | Optional comma-separated allowlist of specific private/internal hostnames or IPs. |
| `EMAIL_ALLOWED_SENDER_DOMAINS` | Optional comma-separated list of authorized sender domains (defaults to matching the SMTP username domain). |
| `EMAIL_ALLOWED_PORTS` | Optional comma-separated extra ports beyond `25, 465, 587, 2525, 143, 993`. |
| `EMAIL_ALLOW_UNENCRYPTED_SMTP` | Local development only (`NODE_ENV !== 'production'`). Ignored in production. |

---

## 3. Stalwart Mail Server & DNS Distinction

Entering SMTP/IMAP settings inside **Admin → Settings → Email** only configures the website's **mail client**. You must separately configure:

1. **Stalwart Mail Server**:
   - Create the sending/receiving mailbox (e.g. `noreply@global-hrm.net`).
   - Enable SMTP submission (`587` STARTTLS or `465` Implicit TLS) and optionally IMAPS (`993`).
   - **Hostname & TLS Certificate SAN**: Use the public FQDN whose TLS certificate matches Stalwart's certificate (e.g., `mail.global-hrm.net`). Do **not** use a private Docker container name like `stalwart` for TLS connections unless your certificate explicitly includes `stalwart` in its Subject Alternative Names (SAN).
   - Ensure the authenticated SMTP account is permitted to send as your configured **From** address (and any per-type sender overrides).
2. **DNS Records** (at your DNS provider):
   - **SPF (`TXT`)**: Authorize your VPS IP / Stalwart host to send for your domain.
   - **DKIM (`TXT`)**: Publish Stalwart's DKIM public key for your sending domain.
   - **DMARC (`TXT`)**: Publish `_dmarc.yourdomain` policy (`p=quarantine` or `p=reject` once verified).

---

## 4. Database Migration

On your VPS / Coolify deployment (after pulling the new migration `20261116120000_add_email_settings_and_outbox`):
```sh
npx --yes prisma@6.19.3 migrate deploy
```

---

## 5. Background Outbox Worker & IMAP Polling

While outgoing emails attempt immediate dispatch when enqueued, retries, rate-limited batches, sensitive payload cleanup, and optional IMAP polling require periodic execution.

### Option A: Coolify Scheduled Task (Cron)
Add a Coolify scheduled task calling the internal worker endpoint every minute:
```sh
curl -s -X POST -H "Authorization: Bearer $EMAIL_WORKER_SECRET" https://<your-domain>/api/internal/email-worker
```

### Option B: Dedicated Worker Service
Run the standalone worker script in a Coolify service pointing to the same repo & `DATABASE_URL` + `EMAIL_CONFIG_ENCRYPTION_KEY`:
```sh
npx tsx scripts/email-worker.ts --loop
```

---

## 6. Transition from Legacy Environment Variables

If your environment previously used `GMAIL_SERVICE_ACCOUNT_KEY` or `gmail.json`:
1. Database-backed **Email Settings** now have strict precedence across all website emails.
2. The application will **not** silently fall back to legacy Gmail files when SMTP is disabled or unconfigured.
3. Once your Stalwart SMTP configuration is tested and activated in **Admin → Settings → Email**, you may remove `GMAIL_SERVICE_ACCOUNT_KEY`, `GMAIL_CLIENT_EMAIL`, `GMAIL_PRIVATE_KEY`, and `gmail.json`.
