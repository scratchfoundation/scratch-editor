#!/usr/bin/env bash
# Story 7.6 — resolve the highest published firmware semver from the GitLab Generic
# Package Registry, download .bin/.sha256/.meta.json, verify integrity (sha256, fail-closed),
# and emit firmware/manifest.json with an absolute URL. The meta.json already carries
# `signature` (base64 raw Ed25519, from the firmware CI) → it passes through into the manifest,
# which the middleware firmwareVerifier requires (Story 9.2). No firmware published yet ⇒
# hard-fail (the image must never ship a /firmware/ that 404s).
set -euo pipefail

: "${GITLAB_API_BASE:?}"; : "${GITLAB_FW_PROJECT_ID:?}"; : "${GITLAB_FW_READ_TOKEN:?}"
PUBLIC_BASE="${PUBLIC_FW_BASE:-https://sparky-uat.warut.me/firmware}"
OUT=firmware
H=(-H "PRIVATE-TOKEN: ${GITLAB_FW_READ_TOKEN}")
API="${GITLAB_API_BASE}/projects/${GITLAB_FW_PROJECT_ID}"

mkdir -p "$OUT"
# Highest semver among generic 'firmware' package versions.
VER=$(curl --fail -s "${H[@]}" \
        "${API}/packages?package_type=generic&package_name=firmware&per_page=100" \
      | jq -r '.[].version' | sort -V | tail -n1)
test -n "$VER" || { echo "FATAL: no firmware package published"; exit 1; }
echo "resolved firmware $VER"

PKG="${API}/packages/generic/firmware/${VER}"
curl --fail -s "${H[@]}" "${PKG}/spark_fw_${VER}.bin"       -o "$OUT/spark_fw_${VER}.bin"
curl --fail -s "${H[@]}" "${PKG}/spark_fw_${VER}.sha256"    -o "$OUT/spark_fw_${VER}.sha256"
curl --fail -s "${H[@]}" "${PKG}/spark_fw_${VER}.meta.json" -o "$OUT/spark_fw_${VER}.meta.json"

# Integrity gate (fail-closed): published sha256 must match the bytes.
ACT=$(sha256sum "$OUT/spark_fw_${VER}.bin" | awk '{print $1}')
EXP=$(tr -d ' \n' < "$OUT/spark_fw_${VER}.sha256")
test "$ACT" = "$EXP" || { echo "FATAL: sha256 mismatch ($ACT != $EXP)"; exit 1; }

# Generate the served manifest: meta (incl. sha256 + signature) + absolute url.
jq --arg url "${PUBLIC_BASE}/spark_fw_${VER}.bin" '. + {url:$url}' \
   "$OUT/spark_fw_${VER}.meta.json" > "$OUT/manifest.json"
rm -f "$OUT/spark_fw_${VER}.sha256" "$OUT/spark_fw_${VER}.meta.json"
echo "manifest.json (signature elided):"; jq 'del(.signature)' "$OUT/manifest.json"
