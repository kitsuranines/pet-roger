#!/usr/bin/env bash
# Ad-hoc sign a packaged RogerPet.app so it runs on Apple Silicon Macs.
# Usage: scripts/sign-mac.sh path/to/RogerPet.app
# On macOS uses codesign; on Linux uses rcodesign (apple-codesign from
# https://github.com/indygreg/apple-platform-rs/releases).
set -euo pipefail
APP="${1:?usage: $0 path/to/RogerPet.app}"
if [[ "$(uname)" == "Darwin" ]]; then
  codesign --force --deep --sign - "$APP"
  codesign --verify --deep --strict "$APP" && echo "Signed and verified: $APP"
else
  RCS="${RCODESIGN:-$(command -v rcodesign || true)}"
  [[ -n "$RCS" ]] || { echo "rcodesign not found; install apple-codesign or set RCODESIGN" >&2; exit 1; }
  # No certificate = ad-hoc signature; signs nested frameworks and helper apps too.
  "$RCS" sign "$APP"
  "$RCS" print-signature-info "$APP/Contents/MacOS/RogerPet" | grep -q ADHOC && echo "Signed (ad-hoc): $APP"
fi
# Zip with symlinks preserved, e.g.: (cd dist && zip -qry RogerPet-mac-arm64.zip RogerPet-darwin-arm64)
