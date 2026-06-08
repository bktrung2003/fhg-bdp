# Deploying Fusion BD CORE OS on Portainer (Ubuntu)

End-to-end deploy guide. Should take ~15 minutes for first-time setup,
~2 minutes for subsequent updates.

---

## Prerequisites

On your Ubuntu host (e.g. `192.168.1.116`):

- Docker Engine + Compose plugin (`apt install docker.io docker-compose-v2`)
- Portainer CE running on `:9000` ([install guide](https://docs.portainer.io/start/install-ce/server/docker/linux))
- The host can reach `ghcr.io` (no firewall block on outbound 443)

You do **not** need to clone this repo onto the server — Portainer pulls
images from GHCR and reads the compose file via git URL or paste.

---

## Step 1 — Make GHCR images public (one-time)

By default GitHub publishes images as private. Make them public so the
server can pull without auth:

1. Visit [github.com/users/bktrung2003/packages](https://github.com/users/bktrung2003?tab=packages)
2. Find `fhg-bdp/backend` → **Package settings** → **Change visibility** → Public
3. Repeat for `fhg-bdp/frontend`

(Or: keep them private and add a `imagePullSecrets`-style login to the
Portainer host with `docker login ghcr.io -u bktrung2003 -p <PAT>`.)

---

## Step 2 — Trigger the first build

Push a commit to `main` (or click *Run workflow* on the **Build & Push**
action in the GitHub UI). Wait ~2 minutes. Confirm two images appear:

- `ghcr.io/bktrung2003/fhg-bdp/backend:latest`
- `ghcr.io/bktrung2003/fhg-bdp/frontend:latest`

---

## Step 3 — Create the stack in Portainer

1. Portainer → **Stacks** → **Add stack**
2. Name: `fhg-bdp`
3. **Build method**: choose **Repository**
   - Repository URL: `https://github.com/bktrung2003/fhg-bdp`
   - Reference: `refs/heads/main`
   - Compose path: `compose.portainer.yml`
4. **Environment variables** — switch to *Advanced mode* and paste the
   contents of [`.env.portainer.example`](./.env.portainer.example),
   replacing every `<CHANGEME>` with a real value. At minimum:
   - `SECRET_KEY` — run `python -c "import secrets; print(secrets.token_hex(32))"`
   - `POSTGRES_PASSWORD` — strong DB password
   - `MINIO_ROOT_PASSWORD` — strong MinIO password
   - `FIRST_SUPERUSER_PASSWORD` — first login password
   - `DOMAIN` + `FRONTEND_HOST` + `BACKEND_CORS_ORIGINS` — your server IP or domain
5. **Deploy the stack**

First boot takes ~30s while:
- Postgres initialises the database
- MinIO starts up
- `minio-init` creates the `fusion-documents` bucket
- `prestart` runs Alembic migrations + creates first superuser

---

## Step 4 — Verify

Open `http://<server-ip>:3008/`:

- ✅ Login page renders
- ✅ Sign in with `FIRST_SUPERUSER` + `FIRST_SUPERUSER_PASSWORD`
- ✅ Dashboard loads (will be empty)

Optional: load demo data from inside the app:
- **Settings → Demo Data → Load Demo Data**
- 6 owners, 8 projects, 12 deals, etc. appear instantly

MinIO admin console: `http://<server-ip>:9001`
- Login: `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
- Browse the `fusion-documents` bucket — every uploaded Document /
  logo lives here.

---

## Step 5 — Subsequent deploys (one click)

Watchtower (in the stack) turns the 3 manual Portainer steps into one
trigger. You still decide *when* — it does not auto-poll.

After you push code to `main`:

1. Wait for the GitHub Actions **Build & Push** to go green (~3 min).
2. Double-click **`deploy.bat`** (edit `SERVER` / `PORT` / `TOKEN` once to
   match your `.env`). It calls Watchtower's update endpoint.
3. Watchtower pulls the new `:latest`, recreates backend + frontend
   (+ notify-cron), and **deletes the old images**. ~30–60s.

No more Stack edit / re-pull / manual image cleanup.

Equivalent manual trigger (any machine):
```bash
curl -H "Authorization: Bearer <WATCHTOWER_TOKEN>" \
  http://<server-ip>:<WATCHTOWER_PORT>/v1/update
```

Database, MinIO objects, and uploaded files **survive** redeploys
(named volumes `app-db-data`, `minio-data`).

> Watchtower only touches containers labelled
> `com.centurylinklabs.watchtower.enable=true` — i.e. only this stack,
> never your other ~20 apps.

---

## Rollback

To roll back to a specific version (must be a `v*.*.*` tag that was
built):

1. Portainer → **Stacks** → **fhg-bdp** → **Editor**
2. Update the environment variable `TAG=v1.2.3`
3. **Pull and redeploy**

---

## Ports cheat sheet

| Port | What | Who needs it |
|------|------|--------------|
| 3008 | Frontend UI + API (proxied) | All users |
| 9001 | MinIO admin console | IT admin only |
| 9000 | MinIO S3 API | Backend only (optional external) |

If your firewall is restrictive, only expose `3008` publicly. `9000` and
`9001` can stay internal to the docker network — backend talks to MinIO
over the `minio` service name, not a host port.

To change the host port (e.g. you already run something on 3008), edit
`compose.portainer.yml`:
```
ports:
  - "3008:80"   # change 3008 → desired port, keep :80 (container port)
```
and re-deploy the stack.

---

## Troubleshooting

**`502 Bad Gateway` after first deploy** — backend hasn't finished
migrating yet. Wait 30s and refresh. If it persists, check
**Portainer → Containers → fhg-bdp_backend → Logs**.

**`MINIO_ROOT_PASSWORD must be 8 chars`** — MinIO refuses short
passwords. Use at least 8 characters.

**Forgot the admin password** — `docker exec -it fhg-bdp_db_1 psql -U
fusion fusion_bdp` and update the row in `user` table, OR redeploy
with a new `FIRST_SUPERUSER_PASSWORD` (only takes effect if the
matching email row doesn't exist yet — for an existing user, use the
DB).

**Cleared the wrong things during demo** — Use **Settings → Demo Data
→ Load Demo Data** to repopulate. Real user data and demo data are
tracked separately by name match.

---

## What's NOT in this stack (and why)

- **No Traefik / Nginx in front** — Portainer's host already terminates
  the public connection. Add a reverse proxy if you need HTTPS + a
  domain name (see `compose.traefik.yml` for the Traefik flavour).
- **No automated DB backup** — recommended to set up a host-level cron
  running `pg_dump` against the `fhg-bdp_db_1` container weekly.
- **No cron jobs (stale deal alerts, weekly digest)** — Phase 2 feature;
  skeleton exists in `app/cron.py` but disabled.
