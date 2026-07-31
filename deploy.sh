#!/usr/bin/env bash
# Deploy coolturkey.org. Run from this directory: ./deploy.sh
set -euo pipefail

# Bump the asset version so Cloudflare can't serve a stale stylesheet.
V="$(date +%Y%m%d%H%M)"
/usr/bin/find . -name '*.html' -not -path './node_modules/*' -print0 \
  | xargs -0 /usr/bin/sed -i '' -E "s/\?v=[0-9a-zA-Z.\-]+\"/?v=$V\"/g"
echo "assets versioned $V"

git add -A
git diff --cached --quiet || git commit -m "${1:-Update coolturkey}"
git push origin main 2>/dev/null || echo "(no GitHub remote yet, skipping push)"

npm_config_cache=/tmp/npm-ct CI=1 \
  npx --yes wrangler@latest pages deploy . \
    --project-name=coolturkey --branch=main --commit-dirty=true

echo
echo "verifying..."
sleep 6
for p in / /rap-ledger /tools/split-sheet /cold-takes/lyrics-or-feeling; do
  printf "  %-34s %s\n" "$p" "$(curl -sS -o /dev/null -w '%{http_code}' "https://coolturkey.org$p")"
done
printf "  %-34s %s\n" "www redirect" "$(curl -sS -o /dev/null -w '%{http_code}' https://www.coolturkey.org/)"
