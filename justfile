# GLU — task runner. Run `just` (or `just --list`) to see every recipe.
#
# Two independent npm packages, each with its own lockfile and node_modules:
#   just web     <recipe>   → web/justfile      (Next.js app, Storybook, e2e)
#   just backend <recipe>   → backend/justfile  (Express Todoist proxy, ADR 11)
# `just web` / `just backend` with no recipe list that package's recipes.
# There is deliberately no root package.json — the recipes below fan out.

mod web 'web/justfile'
mod backend 'backend/justfile'

# List available recipes.
default:
    @just --list

# Install both packages exactly as CI does — lockfile-faithful, no drift.
install:
    just web install
    just backend install

# The app answers under basePath '/glu' — open http://localhost:3000/glu ;
# `/` 404s by design. Ctrl-C stops both halves.

# Run both halves: Next on :3000, the API on :4000.
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    # Kill the whole process group on exit so Ctrl-C never orphans a server.
    trap 'kill 0' EXIT
    just backend dev &
    just web dev &
    wait

# Build both packages — the Next standalone bundle and backend/dist.
build:
    just web build
    just backend build

# Every test in the repo: web's unit + story layers, then the backend suite.
test:
    just web test
    just backend test

# ESLint across both packages (each has its own config).
lint:
    just web lint
    just backend lint

# Run the e2e suite (builds first). Extra flags are passed through.
e2e *ARGS:
    just web e2e {{ARGS}}

# The pre-push check, not the inner loop — this takes minutes.

# Everything CI gates on, in tests.yml's order.
ci: lint test build
    just web build-storybook
    just web e2e

# Regenerate the app + PWA icons from web/img/favicon.svg.
icons:
    just web icons

# Needs both packages installed — run `just install` first. Each manifest also
# embeds GLU's own NOTICE + LICENSE, so rerun this if either changes (ADR 23).

# Regenerate the third-party LICENSES manifests (root union, web, backend).
license:
    node scripts/generate-licenses.mjs --scope all     --out LICENSES
    node scripts/generate-licenses.mjs --scope web     --out web/LICENSES
    node scripts/generate-licenses.mjs --scope backend --out backend/LICENSES

# Each package owns its own Dockerfile and is its own build context (ADR 22):
# glu-web from web/, glu-api from backend/. Run one with `just web docker-run`
# or `just backend docker-run`.

# Build both images the way ci.yml does.
docker-build:
    just web docker-build
    just backend docker-build

# Drop build outputs from both packages. node_modules is left alone.
clean:
    just web clean
    just backend clean
