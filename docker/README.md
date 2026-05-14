# scratch-editor Docker image / อิมเมจ Docker สำหรับ scratch-editor

> **Story 10.1** — Multi-stage build, non-root nginx static-serve, build-once-deploy-many via runtime `MIDDLEWARE_WS_URL` env-var. Foundation for Stories 10.2 (Helm), 10.3 (CI build+push), 10.4 (ArgoCD).

## §1 ภาพรวม / Overview

อิมเมจนี้สร้าง bundle ของ `packages/scratch-gui` (Webpack production build) แล้วเสิร์ฟไฟล์ static ผ่าน nginx แบบ non-root (UID 101) บน port 8080 เท่านั้น ไม่มี proxy ไม่มีการ serve API — เบราว์เซอร์ของผู้ใช้เชื่อมต่อ WebSocket ตรงไปยัง middleware-gateway ตาม `MIDDLEWARE_WS_URL` ที่ inject ตอน container start

This image builds the `packages/scratch-gui` bundle (Webpack production build) and serves the static files via non-root nginx (UID 101) on port 8080 only. No proxying, no API serving — the user's browser opens WebSocket directly to the middleware-gateway at `MIDDLEWARE_WS_URL`, which is injected at container start.

**AGPL §13:** ผู้ใช้ที่เปิดหน้านี้จะเห็น footer มุมล่างขวาที่ลิงก์ไปยัง public source (`https://github.com/WarutC/scratch-editor`) ตามข้อผูกพันของ AGPL-3.0 สำหรับการ deploy เป็น public network service / Users see a footer linking to the public source repo per AGPL §13.

**Build-once-deploy-many:** อิมเมจ binary ตัวเดียวกัน deploy ได้ทั้ง staging และ prod ต่างกันแค่ค่า env / The same image binary deploys to staging and prod with only env-var differences (`MIDDLEWARE_WS_URL`).

## §2 Build the image

```sh
cd scratch-editor/
docker build -t scratch-editor:local .
```

- เวลาที่ใช้ครั้งแรก: ~5–10 นาที (npm ci ของ monorepo เป็นขั้นที่นานที่สุด) / First run: ~5–10 min (npm ci is the slow step).
- ขนาดอิมเมจ: ดูที่ `docker images scratch-editor:local --format "{{.Size}}"` — เป้าหมาย < 100 MB compressed.

## §3 Run locally

```sh
docker run --rm -p 8080:8080 \
  -e MIDDLEWARE_WS_URL=ws://host.docker.internal:8080 \
  scratch-editor:local
```

เปิด `http://localhost:8080` → ควรเห็น Scratch GUI พร้อมหมวด `สปาร์ก` (Spark) ในรายการ extension ป้ายภาษาไทยต้องแสดงผลถูกต้อง (ทดสอบ `applySparkTranslations()`) Console error สำหรับ WebSocket ที่เชื่อมต่อ middleware ไม่ได้นั้น **คาดหวังได้** (ไม่มี middleware รันบนเครื่อง smoke-test) ไม่ใช่ regression

Open `http://localhost:8080` → expect Scratch GUI with Spark category visible. WebSocket connect errors are expected when no middleware is running.

## §4 Verify env-config injection

```sh
curl http://localhost:8080/env-config.js
```

ผลลัพธ์ที่คาดหวัง / Expected:

```js
window.SPARK_ENV = {
  MIDDLEWARE_WS_URL: 'ws://host.docker.internal:8080',
  VERSION: '13.7.1'
};
```

รันใหม่ด้วย `-e MIDDLEWARE_WS_URL=wss://prod.example/ws` → ค่าของ `/env-config.js` ต้องเปลี่ยนตาม (พิสูจน์ build-once-deploy-many) / Re-run with a different value to verify the same image binary serves different config.

## §5 Healthz

```sh
curl -i http://localhost:8080/healthz
# HTTP/1.1 200 OK
# Content-Type: text/plain
# ...
# ok
```

ใช้สำหรับ Kubernetes `livenessProbe`/`readinessProbe` ใน Helm chart (Story 10.2).

## §6 Verify AGPL footer

โหลด `/` → ดูที่มุมล่างขวา → ควรเห็น `"ซอร์สโค้ด / Source"` ลิงก์ไปยัง `https://github.com/WarutC/scratch-editor` พร้อมเลข version จาก `env-config.js`

Load `/` → bottom-right footer → click `"ซอร์สโค้ด / Source"` → opens public source repo in a new tab.

## §7 K8s deployment notes (สำหรับ Story 10.2)

**Required Pod `securityContext`:**

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 101
  readOnlyRootFilesystem: true   # OK — see writable mounts below
  allowPrivilegeEscalation: false
  capabilities:
    drop: [ALL]
```

**Required writable `emptyDir` mounts** (เนื่องจาก `readOnlyRootFilesystem: true`):

| Mount path | เหตุผล / Reason |
|------------|------|
| `/tmp` | nginx temp files AND the rendered `env-config.js` (the `/env-config.js` route is served via nginx `alias /tmp/env-config.js;`) |
| `/var/cache/nginx` | nginx proxy/fastcgi cache dirs (แม้เราไม่ proxy ก็ตาม nginx ยัง mkdir) |
| `/var/run` | nginx PID file |

> `/usr/share/nginx/html` stays **read-only**. The entrypoint never writes into it — env-config rendering lives in `/tmp` and nginx aliases the request to that path. Story 10.2's Helm chart owns the actual pod spec; this README provides the contract.

**Listener port:** 8080 (non-root, no `CAP_NET_BIND_SERVICE` needed). Service should expose `targetPort: 8080`.

## §8 Pinned digests

| Stage | Tag | Digest |
|-------|-----|--------|
| builder | `node:24.15.0-alpine` | `sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f` |
| runtime | `nginxinc/nginx-unprivileged:1.27-alpine` | `sha256:65e3e85dbaed8ba248841d9d58a899b6197106c23cb0ff1a132b7bfe0547e4c0` |

Verify (reviewer step):

```sh
docker pull node:24.15.0-alpine && \
  docker inspect node:24.15.0-alpine --format='{{index .RepoDigests 0}}'
docker pull nginxinc/nginx-unprivileged:1.27-alpine && \
  docker inspect nginxinc/nginx-unprivileged:1.27-alpine --format='{{index .RepoDigests 0}}'
```

## §9 What's NOT in the image

- `node_modules`, source `.js`/`.jsx`/`.css`, the webpack build toolchain (stripped at runtime stage)
- `dist/` UMD library bundles (not used for the public web service)
- `standalone.html` / `player.html` / `blocks-only.html` / `compatibility-testing.html` and their ~16 MB sibling JS bundles
- Source maps
- Any `.env*`, `.git`, `docs/`, `documents/`, `test/`

**Why:** image-size leanness + reduced attack surface. Only the playground main entry (`index.html` + `gui.js` + `chunks/` + `static/` + `extension-worker.js` + the micro:bit firmware blob) ships.

## §10 Security posture

- `server_tokens off` → no `Server: nginx/X.Y.Z` header leak
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: frame-ancestors 'none'` (anti-clickjacking; the GUI is not designed to be embedded)
- gzip enabled for text/JS/CSS/SVG/JSON (gui.js is ~16 MB → ~3–4 MB on the wire)
- No proxy/upstream blocks — pure static serve
- No build args or runtime env accept secrets — only `MIDDLEWARE_WS_URL` (public URL) and `SPARK_VERSION` (baked from `package.json`)

## §11 Input validation

`MIDDLEWARE_WS_URL` is validated by the entrypoint script before render:

- Must start with `ws://` or `wss://`, OR be empty (empty triggers the Spark extension's localhost fallback).
- Must NOT contain `'`, `` ` ``, `$`, or newlines (these would break out of the JS string literal in `env-config.js`).

Invalid values cause the container to exit with a non-zero code and a clear error in `docker logs`. This is intentional — fail-fast under a misconfigured Helm value beats silently serving the wrong WS URL.

## §12 Smoke checklist

- [ ] `docker build -t scratch-editor:local .` succeeds
- [ ] `docker run --rm -p 8080:8080 scratch-editor:local` starts; logs show `[spark] env-config.js rendered: ...`
- [ ] `http://localhost:8080/` → Scratch GUI renders, Spark category visible with Thai labels
- [ ] `curl http://localhost:8080/healthz` → `200 ok`
- [ ] `curl -I http://localhost:8080/` → security headers present, no `Server` version
- [ ] `curl http://localhost:8080/env-config.js` → rendered JS literal with expected values
- [ ] `docker inspect scratch-editor:local --format='{{.Config.User}}'` → `101`
- [ ] `docker stop <container>` returns within 10 s (clean SIGTERM)
