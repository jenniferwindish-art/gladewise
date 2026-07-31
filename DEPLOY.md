# Putting Bladewise online (a shareable link)

This gets Bladewise onto a free web address you can send to anyone — no install
on their end. The recommended host is **Render** (real free tier, supports the
Node version this app needs). Budget ~10–15 minutes the first time.

You'll create two free accounts: **GitHub** (to hold the code) and **Render**
(to run it). Neither requires a credit card for the free tier.

## Step 1 — Put the code on GitHub

1. Create a free account at <https://github.com>.
2. Click the **+** (top right) → **New repository**. Name it `bladewise`,
   leave it **Public** (or Private), and click **Create repository**.
3. On the new repo page, click **uploading an existing file**.
4. Drag in the **contents** of the `bladewise` folder (the `server.mjs` file,
   the `src` and `public` folders, `package.json`, `render.yaml`, etc.) and
   click **Commit changes**.

## Step 2 — Deploy on Render

1. Create a free account at <https://render.com> and click **Sign up with GitHub**
   (this lets Render see your repo).
2. Click **New +** → **Web Service**.
3. Pick your `bladewise` repository.
4. Render reads `render.yaml` automatically. Confirm:
   - **Start command:** `node server.mjs`
   - **Instance type:** **Free**
5. Click **Create Web Service**. First build takes a minute or two.

When it finishes, Render shows a URL like `https://bladewise.onrender.com` —
**that's your shareable link.** Open it, and share it with anyone.

## Good to know (free tier)

- **It sleeps when idle.** After ~15 minutes with no visitors the app spins
  down; the next visit takes ~30–60 seconds to wake up, then it's fast again.
  The URL never changes. (Paid plans stay always-on.)
- **Data resets on redeploy.** The demo re-seeds its sample data whenever the
  service restarts or you push new code. That's fine for demos; a real launch
  uses a managed PostgreSQL database instead (see the product spec).
- **Custom domain.** You can point `app.bladewise.com` (or similar) at the
  Render service later in its settings.

## Updating it later

Push a change to the GitHub repo (or re-upload files) and Render redeploys
automatically within a minute or two.

## Alternatives

Railway (<https://railway.app>) and Fly.io (<https://fly.io>) work too and use
the same `package.json` start script. Render is recommended for the simplest
path and the most generous no-card free tier.
