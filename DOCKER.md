# Running Tradezilla on your UGREEN NAS (Docker)

The app is packaged as a single container: the Express server serves both the API and
the built React frontend on port 3001. Your trades and screenshots are stored in two
folders that you mount from the NAS, so data survives restarts and updates.

There are two ways to get it onto the NAS. Route A needs no other computer. Route B gives
you the importable image file you asked about.

---

## Route A — Build on the NAS with Compose (recommended, nothing else needed)

1. Copy the whole `tradezilla` folder to a share on your NAS, for example to
   `docker/tradezilla` (so it lives at `/volume1/docker/tradezilla` or, in UGOS paths,
   under `/media/...`).
2. Open **Docker** (Container Manager) in UGOS Pro → **Compose** (or **Project**) →
   **Create**.
3. Point it at the copied folder, or paste the contents of `docker-compose.yml`.
4. Deploy. The NAS builds the image the first time (a few minutes) and starts it.
5. Open `http://<your-nas-ip>:8088` in a browser.

The compose file mounts `./data/trades` and `./data/uploads` (next to the compose file)
for persistent storage. You can change those to any NAS share you like.

---

## Route B — Import a pre-built image (.tar)

The image tar has to be built on a machine that has Docker (your PC or Mac), because a
Docker engine is required to produce it. Then you import the file on the NAS.

1. On your computer with Docker installed, from the `tradezilla` folder run:
   - Windows: double-click `build-image.bat`
   - Mac/Linux: `./build-image.sh`

   This creates `tradezilla-image.tar`.
2. Copy `tradezilla-image.tar` to your NAS.
3. In UGOS **Docker** → **Images** → **Import**, select the tar. The image
   `tradezilla:latest` appears in your image list.
4. Create the container from that image with:
   - Port: container `3001` → host `8088` (or any free port)
   - Volumes: map a NAS folder to `/app/server/data` and another to
     `/app/server/uploads`

   Or reuse `docker-compose.yml`: comment out `build: .`, uncomment
   `image: tradezilla:latest`, and deploy it as a Compose project.
5. Open `http://<your-nas-ip>:8088`.

---

## Persistent data

Two container paths hold everything:

- `/app/server/data` — the trades database (`trades.json`) and automatic backups
- `/app/server/uploads` — trade screenshots

Map both to NAS folders (as the compose file does) so nothing is lost when the container
is recreated or updated. To back up, just copy those two NAS folders, or use the app's
Data tab to download a JSON backup.

## Updating the app later

Route A: replace the folder contents on the NAS and redeploy the Compose project (it
rebuilds). Route B: rebuild the tar, import again, recreate the container. Your mounted
data folders are untouched by updates.

## Notes

- Change the host port `8088` in `docker-compose.yml` if it clashes with another app.
- For access from outside your home network, use the NAS's own remote-access / reverse
  proxy features rather than exposing the port directly to the internet.
- The container listens on port 3001 internally; keep the right side of the port mapping
  as `3001`.

---

## Redeploying after an update

When the app source changes, get the updated files onto the NAS and rebuild:

```
cd ~/tradezilla
sudo docker compose up -d --build
```

Your trades and screenshots live in the mounted `data` folders and are untouched by a
rebuild. The Tradovate credentials file (`server/data/tradovate.json`) also persists there.

---

## Automated image builds (GitHub Actions + GHCR)

`.github/workflows/docker-publish.yml` builds the image and pushes it to the GitHub
Container Registry (ghcr.io) on every push to `main` (and on `v*` tags). The image is
published as `ghcr.io/<your-username>/tradezilla:latest`.

First time only, make the image pullable by your NAS:

1. Push the repo to GitHub. The Actions run builds and publishes the image.
2. In GitHub, open your profile → Packages → `tradezilla` → Package settings. Set the
   package visibility to Public (simplest), or keep it Private and log the NAS in with a
   Personal Access Token that has `read:packages`.

Then on the NAS, pull and run the prebuilt image instead of building locally:

```
cd ~/tradezilla
# edit docker-compose.ghcr.yml and replace OWNER with your github username (lowercase)
sudo docker compose -f docker-compose.ghcr.yml pull
sudo docker compose -f docker-compose.ghcr.yml up -d
```

If the package is Private, first run (once):

```
echo <YOUR_PAT> | sudo docker login ghcr.io -u <your-username> --password-stdin
```

To update later, just `git push`; the workflow rebuilds the image, then on the NAS run the
two `docker compose -f docker-compose.ghcr.yml pull` and `... up -d` commands again. Your
mounted `data` folders (trades, screenshots, Tradovate credentials) are untouched.

The workflow builds for `linux/amd64`, which matches Intel-based UGREEN NAS models. Add
`linux/arm64` to the `platforms:` line if you run it on an ARM device.
