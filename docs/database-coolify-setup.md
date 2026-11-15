# Global HRM Network — PostgreSQL & Coolify Deployment Guide

This guide documents how to provision, connect, migrate, and back up the dedicated PostgreSQL database for **Global HRM Network** (including the **Pakistan Banking Expertise Map** survey) on your existing Coolify VPS (`DBInfra` + `Global HRM Network` projects).

---

## 1. PostgreSQL Provisioning (Inside `DBInfra`)

Run the following SQL **as the PostgreSQL superuser** (e.g., `postgres`) inside your existing `DBInfra` PostgreSQL server.
Replace `<MIGRATOR_PASSWORD>` and `<APP_PASSWORD>` with strong, randomly generated passwords. Never commit real passwords to Git.

```sql
-- 1. Create dedicated roles (without superuser privileges)
CREATE ROLE global_hrm_migrator WITH LOGIN PASSWORD '<MIGRATOR_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE global_hrm_app      WITH LOGIN PASSWORD '<APP_PASSWORD>'      NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- 2. Create the dedicated database owned by the migration role
CREATE DATABASE global_hrm OWNER global_hrm_migrator;

-- 3. Restrict public access to the database
REVOKE ALL ON DATABASE global_hrm FROM PUBLIC;
GRANT CONNECT ON DATABASE global_hrm TO global_hrm_app;
GRANT ALL PRIVILEGES ON DATABASE global_hrm TO global_hrm_migrator;
```

Now connect specifically to the **`global_hrm`** database (`\c global_hrm`) as superuser or `global_hrm_migrator` and configure least-privilege schema permissions:

```sql
-- Lock down the public schema and grant explicit permissions
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO global_hrm_migrator;
GRANT USAGE ON SCHEMA public TO global_hrm_app;

-- Ensure tables/sequences created by global_hrm_migrator are accessible to global_hrm_app
ALTER DEFAULT PRIVILEGES FOR ROLE global_hrm_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO global_hrm_app;

ALTER DEFAULT PRIVILEGES FOR ROLE global_hrm_migrator IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO global_hrm_app;
```

> **Note:** Existing databases, roles, and permissions in `DBInfra` are left completely untouched.

---

## 2. Private Networking Between Coolify Projects

Because `DBInfra` and `Global HRM Network` are separate Coolify projects on the same VPS:

1. **Verify both resources are on the same VPS/Server** in Coolify.
2. **Enable shared Docker networking in Coolify** (persistent across redeployments):
   - In Coolify, open the **Global HRM Network** application → **Configuration** → **General** (or **Network** / **Destination** depending on your Coolify v4 UI).
   - Enable **"Connect to Predefined Network"** (or ensure both the `DBInfra` PostgreSQL resource and `Global HRM Network` share the `coolify` predefined Docker network).
   - Do **not** attach containers manually with `docker network connect`, as manual attachments are lost on redeployment.
   - Do **not** make the PostgreSQL port (`5432`) public.
3. **Find the internal PostgreSQL hostname**:
   - In Coolify, open the **DBInfra** PostgreSQL resource and copy its **Internal URL / Internal Hostname** (typically the Coolify resource UUID/container name, e.g., `postgres-<uuid>`, port `5432`).
   - Do **not** use `localhost` (which points to the app container itself) or a public IP.

---

## 3. Coolify Environment Variables

In Coolify, open **Global HRM Network** → **Environment Variables** and configure these as **Runtime** variables (not build-time secrets):

```env
# Runtime database connection (uses the least-privilege app role)
DATABASE_URL="postgresql://global_hrm_app:URL_ENCODED_APP_PASSWORD@INTERNAL_POSTGRES_HOST:5432/global_hrm?sslmode=prefer&connection_limit=10"

# NextAuth / Auth.js (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="YOUR_RANDOM_32_BYTE_SECRET"
NEXTAUTH_URL="https://your-domain.example"
```

- **URL-encode special characters** in passwords (e.g., `+` → `%2B`, `!` → `%21`, `@` → `%40`).
- **TLS (`sslmode`)**:
  - If your `DBInfra` PostgreSQL server has TLS enabled with a trusted certificate, use `sslmode=verify-full` (or `sslmode=require` if using Coolify's internal network).
  - If `DBInfra` PostgreSQL runs on the private Docker network without TLS configured, use `sslmode=prefer` or `sslmode=disable` (only on the isolated private Docker network). Do not disable certificate verification on public connections.
- **Image builds**: `npm run build` / `docker build` does **not** require a live database connection.

---

## 4. Migrations & Reference Data Seeding

Migrations are version-controlled under `prisma/migrations/`.

- **Never** run `prisma migrate reset` or `prisma db push --force-reset` in production.
- **Never** run migrations inside `Dockerfile` during `docker build`.
- **Run migrations once per release** from a single controlled execution context that can reach `INTERNAL_POSTGRES_HOST:5432`:

### First Deployment Procedure
1. Provision the database and roles in `DBInfra` (Section 1).
2. Configure private networking and environment variables in Coolify (Sections 2 & 3).
3. Deploy the **Global HRM Network** application in Coolify.
4. Once the container is up (or via a single-instance Coolify Terminal / one-off command on the `Global HRM Network` container using the **migrator** credentials):
   ```bash
   DATABASE_URL="postgresql://global_hrm_migrator:URL_ENCODED_MIGRATOR_PASSWORD@INTERNAL_POSTGRES_HOST:5432/global_hrm?sslmode=prefer" \
     npx --yes prisma@6.19.3 migrate deploy
   ```
5. Seed the idempotent reference data (campaigns, expertise categories, engagement interests, global config):
   ```bash
   npx --yes tsx prisma/seed.ts
   ```
6. Verify readiness via the health endpoint:
   ```bash
   curl -i https://your-domain.example/api/health
   # Expected: HTTP/1.1 200 OK {"status":"ok","database":"connected","timestamp":"..."}
   ```

### Subsequent Deployments
1. Push tested changes (including any new `prisma/migrations/*` folders) to your GitHub branch.
2. Coolify builds and deploys the updated container.
3. Run `prisma migrate deploy` once against `global_hrm` using `global_hrm_migrator` before/as the release goes live. `prisma migrate deploy` automatically skips already-applied migrations.
4. If reference data changed, re-run `npx --yes tsx prisma/seed.ts` (all operations use `upsert` and are safe to rerun).

---

## 5. Development vs. Production Separation

- **Never** connect local development or tests to the production `DBInfra` PostgreSQL server.
- Locally, copy `.env.example` to `.env.local` and point `DATABASE_URL` to a local PostgreSQL instance (e.g., `localhost:5432/global_hrm_dev`).
- Synthetic test participants must only be inserted into local/test databases, never into production.

---

## 6. Persistence, Backups & Restore Verification

- **Volume persistence**: Verify in Coolify that the `DBInfra` PostgreSQL service mounts a persistent Docker volume at `/var/lib/postgresql/data`. Redeploying either the website container or the database container will preserve all stored data.
- **Explicit backup inclusion**: Ensure your backup job explicitly dumps `global_hrm` (do not assume an existing single-DB backup covers a newly created database):
  ```bash
  pg_dump -h INTERNAL_POSTGRES_HOST -U global_hrm_migrator -d global_hrm -Fc -f global_hrm_$(date +%F_%H%M).dump
  ```
- **Off-VPS storage & retention**: Copy encrypted/compressed dumps off the VPS (e.g., S3-compatible object storage / Backblaze B2 / Cloudflare R2). Recommended retention: 7 daily, 4 weekly, 3 monthly backups.
- **Isolated restore test** (never restore over production):
  ```bash
  createdb -h INTERNAL_POSTGRES_HOST -U postgres global_hrm_restore_test
  pg_restore -h INTERNAL_POSTGRES_HOST -U postgres -d global_hrm_restore_test --no-owner global_hrm_YYYY-MM-DD.dump
  # Verify row counts, then drop global_hrm_restore_test
  ```
