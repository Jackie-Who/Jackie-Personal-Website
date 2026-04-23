# Vercel + Turso + R2 — Full Setup Walkthrough

This gets your CMS (Phase 5) fully working on your deployed Vercel site.
You need **9 env vars** total. Work through the sections in order — each
one produces values you'll paste into Vercel at the end.

---

## At the end you'll have these 9 values

| Variable | What it is | Where you get it |
|----------|------------|------------------|
| `ADMIN_USERNAME` | Your admin sign-in username | You pick it |
| `ADMIN_PASSWORD` | Your admin sign-in password | You pick it |
| `AUTH_SECRET` | Random string used to sign session cookies | Generate with `openssl` |
| `TURSO_DATABASE_URL` | Your Turso SQLite database URL | Turso CLI |
| `TURSO_AUTH_TOKEN` | Auth token for the Turso DB | Turso CLI |
| `R2_ACCOUNT_ID` | Your Cloudflare account ID | Cloudflare dashboard |
| `R2_ACCESS_KEY_ID` | R2 API token access key | Cloudflare R2 → API tokens |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret | Cloudflare R2 → API tokens |
| `R2_BUCKET_NAME` | Your R2 bucket name | You pick it |
| `R2_PUBLIC_URL` | Public URL prefix for uploaded assets | Cloudflare R2 → Public access |

Open a text file (or a 1Password note) right now and keep the values as
you collect them. Don't paste them into Vercel until the end — it's
easier to review them all in one place first.

---

## 1 — Pick your admin credentials

You just decide:

- **`ADMIN_USERNAME`** — anything. e.g. `jackie`
- **`ADMIN_PASSWORD`** — long and unique. Use a password manager to
  generate one, 16+ chars. e.g. `gQk8!h2B#rTn3Mv9`

Save both.

---

## 2 — Generate `AUTH_SECRET`

This signs your session cookies. A random 64-char hex string is plenty.

Run **one of** the following in a terminal:

```bash
# macOS / Linux / Git Bash / WSL
openssl rand -hex 32
```

```powershell
# Windows PowerShell (native)
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

```node
# Node (any OS)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

You'll get something like `a3f9c28b...bd1e7af2`. Save that as
`AUTH_SECRET`.

---

## 3 — Turso database

Turso is a managed libSQL (SQLite) — free tier is 500 DBs / 9 GB / 1B
row reads, way beyond what a personal portfolio needs.

### 3a. Install the CLI

```bash
# macOS / Linux
curl -sSfL https://get.tur.so/install.sh | bash
```

```powershell
# Windows (via scoop)
scoop install turso
# or via WSL, then use the macOS/Linux command above
```

### 3b. Sign up and authenticate

```bash
turso auth signup      # opens your browser, sign up with GitHub
# then
turso auth login       # if you ever need to re-log in
```

### 3c. Create the database

```bash
turso db create jackie-site
```

(Name it whatever — `jackie-site` is fine. Don't include `.` or `/`.)

### 3d. Get the URL + token

```bash
turso db show jackie-site --url
# →  libsql://jackie-site-<your-org>.turso.io
```

Save that as **`TURSO_DATABASE_URL`**.

```bash
turso db tokens create jackie-site
# →  eyJhbGciOi...  (a long JWT)
```

Save that as **`TURSO_AUTH_TOKEN`**.

### 3e. Apply the schema

From the `site/` directory of this repo:

```bash
turso db shell jackie-site < migrations/0001_init.sql
turso db shell jackie-site < migrations/0002_photo_date_taken.sql
```

Both should print nothing on success. Verify:

```bash
turso db shell jackie-site ".tables"
# → photos  tracks
```

---

## 4 — Cloudflare R2 bucket

R2 is Cloudflare's S3-compatible object storage. Free tier is 10 GB /
1M Class-A ops / 10M Class-B ops per month. Plenty.

### 4a. Sign up for Cloudflare

Go to <https://dash.cloudflare.com/sign-up> if you don't have an
account. Free tier is fine.

### 4b. Find your Account ID

1. Cloudflare dashboard → any page
2. Right sidebar shows **Account ID** — copy the 32-character hex
   string

Save as **`R2_ACCOUNT_ID`**.

### 4c. Enable R2

First time only: dashboard → **R2 Object Storage** → click "Enable".
Cloudflare will ask for a credit card — the free tier still works, the
card just covers usage beyond the limits.

### 4d. Create the bucket

1. R2 → **Create bucket**
2. Name: `jackie-site-assets` (or whatever — keep it DNS-safe)
3. Location hint: leave as "Automatic"
4. Default storage class: "Standard"
5. Create

Save the name as **`R2_BUCKET_NAME`**.

### 4e. Make the bucket publicly readable

Assets need to be readable by anyone who loads your site.

1. Click into your bucket → **Settings**
2. Scroll to **Public access** → **R2.dev subdomain** → click
   "Allow Access"
3. Type "allow" when prompted and confirm
4. Copy the URL it shows, e.g. `https://pub-<hash>.r2.dev`

Save that as **`R2_PUBLIC_URL`**.

(Later, if you want photos served from your own domain, you can add a
custom domain in that same Settings page and swap `R2_PUBLIC_URL` for
the custom one. Works identically.)

### 4f. Create an API token

1. R2 page (dashboard) → right side panel → **Manage API tokens**
2. Click **Create API token**
3. Token name: `jackie-site-upload`
4. Permissions: **Object Read & Write**
5. Specify bucket: **Apply to specific buckets only** → pick your
   bucket
6. TTL: leave as "Forever" (or pick an expiry if you prefer to rotate)
7. Click **Create API Token**

Cloudflare shows the values ONCE. Copy both immediately:

- **Access Key ID** → save as `R2_ACCESS_KEY_ID`
- **Secret Access Key** → save as `R2_SECRET_ACCESS_KEY`

If you lose them you'll have to delete the token and make a new one.

---

## 5 — Paste everything into Vercel

You should now have 9 values written down.

1. <https://vercel.com/> → your project (`jackie-personal-website`)
2. **Settings** (top tabs) → **Environment Variables** (left sidebar)
3. For each of the 9 vars below, click **Add New**:

| Key | Value | Environments |
|-----|-------|--------------|
| `ADMIN_USERNAME` | *(from §1)* | Production + Preview + Development |
| `ADMIN_PASSWORD` | *(from §1)* | Production + Preview + Development |
| `AUTH_SECRET` | *(from §2)* | Production + Preview + Development |
| `TURSO_DATABASE_URL` | *(from §3d)* | Production + Preview + Development |
| `TURSO_AUTH_TOKEN` | *(from §3d)* | Production + Preview + Development |
| `R2_ACCOUNT_ID` | *(from §4b)* | Production + Preview + Development |
| `R2_ACCESS_KEY_ID` | *(from §4f)* | Production + Preview + Development |
| `R2_SECRET_ACCESS_KEY` | *(from §4f)* | Production + Preview + Development |
| `R2_BUCKET_NAME` | *(from §4d)* | Production + Preview + Development |
| `R2_PUBLIC_URL` | *(from §4e)* | Production + Preview + Development |

For each one, when the "Sensitive" toggle appears, **leave it ON** for
`ADMIN_PASSWORD`, `AUTH_SECRET`, `TURSO_AUTH_TOKEN`,
`R2_SECRET_ACCESS_KEY` (the true secrets). The others are fine either way.

### 5a. Redeploy

Env var changes don't apply to existing deployments — you need to rebuild.

1. Vercel → your project → **Deployments** (top tabs)
2. Click the most recent deployment → `⋯` (three-dot menu) → **Redeploy**
3. Uncheck "Use existing Build Cache" (optional but safer first time)
4. Click **Redeploy**

Wait ~60 seconds.

---

## 6 — Test it

1. Go to `https://<your-domain>/admin/login` (or
   `https://<project>.vercel.app/admin/login`)
2. Enter your `ADMIN_USERNAME` + `ADMIN_PASSWORD`
3. You should land on `/admin/photos`
4. Click **+ Add photo** and upload a real JPG — confirm:
   - The file lands in your R2 bucket (check Cloudflare R2 → bucket →
     Objects)
   - The row appears in Turso (`turso db shell jackie-site "SELECT id, title FROM photos"`)
   - The tile shows on `/creative` (after you flip status to `live`)

If the upload fails, the admin surface shows the exact error. Most
first-time failures are one of:

- R2 token doesn't have write perms → recreate the token with
  **Object Read & Write**
- `R2_PUBLIC_URL` has a trailing slash or `http://` → must be
  `https://…` with no trailing slash
- `TURSO_DATABASE_URL` is missing `libsql://` prefix

---

## 7 — Local dev

Same vars in a local `.env` file (copy from `.env.example`). For local
Turso use a file URL:

```bash
# In site/.env
ADMIN_USERNAME=jackie
ADMIN_PASSWORD=localdev
AUTH_SECRET=doesnt-matter-locally
TURSO_DATABASE_URL=file:./local.db
# No TURSO_AUTH_TOKEN needed for file: URLs
```

Then apply the schema to the local file:

```bash
npm install -g @libsql/libsql-cli   # or use `turso` which also works on file:
turso db shell file:./local.db < migrations/0001_init.sql
turso db shell file:./local.db < migrations/0002_photo_date_taken.sql
```

R2 for local dev: easiest is to use the same bucket as production.
Nothing stops you from having real uploads happen from localhost —
they just land in your R2 bucket and you can delete them via the
admin panel.

---

## Rotating credentials later

- **Rotate password** — change `ADMIN_PASSWORD` in Vercel, redeploy.
  All existing session cookies stay valid until they expire (8 h).
- **Force logout everyone + rotate** — change `AUTH_SECRET` instead.
  Sessions signed with the old secret stop verifying immediately.
- **Rotate R2 token** — delete the old one in Cloudflare, create a new
  one, paste the new `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` into
  Vercel, redeploy.
- **Rotate Turso token** — `turso db tokens invalidate jackie-site`
  then `turso db tokens create jackie-site`, update Vercel, redeploy.

---

That's it. Ping me if any step errors out — paste the error message
and I'll triage.
