#!/usr/bin/env bash
# Build the latest main into a new release folder, switch the live symlink to
# it, and reload PM2. The running site is untouched until the new build passes
# a health check, so a failed build never takes the site down.
#
# Layout on the server:
#   /var/www/sfx2              git checkout + build workspace (.env.production lives here)
#   /var/www/releases/<sha>    built standalone apps
#   /var/www/current           symlink → live release (PM2 + nginx point here)

# Wrapped in main() so bash parses the whole file before `git pull` can rewrite it
main() {
    set -euo pipefail
    local REPO_DIR=/var/www/sfx2
    local RELEASES=/var/www/releases
    local CURRENT=/var/www/current
    local KEEP=3

    cd "$REPO_DIR"
    git fetch --quiet origin main
    git reset --hard --quiet origin/main
    local SHA; SHA=$(git rev-parse --short HEAD)
    echo "==> Building $SHA"

    npm ci --no-audit --no-fund
    # Low priority so the live site stays responsive on a 1 vCPU box
    NODE_OPTIONS=--max-old-space-size=3072 nice -n 10 npm run build

    local DEST="$RELEASES/$SHA"
    rm -rf "$DEST" && mkdir -p "$RELEASES"
    cp -a .next/standalone "$DEST"

    local PREVIOUS=""
    [ -L "$CURRENT" ] && PREVIOUS=$(readlink "$CURRENT")
    ln -sfn "$DEST" "$CURRENT"
    pm2 startOrReload "$REPO_DIR/deploy/ecosystem.config.js" --update-env

    if ! health_check; then
        echo "!! New release failed health check"
        if [ -n "$PREVIOUS" ]; then
            echo "==> Rolling back to $PREVIOUS"
            ln -sfn "$PREVIOUS" "$CURRENT"
            pm2 startOrReload "$REPO_DIR/deploy/ecosystem.config.js" --update-env
        fi
        exit 1
    fi
    pm2 save --force >/dev/null

    # Prune old releases, never the live one
    ls -1dt "$RELEASES"/*/ | tail -n +$((KEEP + 1)) | while read -r dir; do
        [ "$(realpath "$dir")" = "$(realpath "$CURRENT")" ] || rm -rf "$dir"
    done
    echo "==> Deployed $SHA"
}

health_check() {
    for _ in $(seq 1 30); do
        curl -fs -o /dev/null http://127.0.0.1:3000/ && return 0
        sleep 2
    done
    return 1
}

main "$@"
exit
