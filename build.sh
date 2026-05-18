#!/bin/bash
set -e

# ====== Part 1: Build ======
echo "==> Step 1: pnpm build"
pnpm build

echo "==> Step 1 done: dist/apis + dist/pages ready"

# ====== Part 2: Docker build ======
IMAGE_NAME="${DOCKER_IMAGE:-by-geo}"
IMAGE_TAG="${DOCKER_TAG:-latest}"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

echo "==> Step 2: docker build -> ${FULL_IMAGE}"
docker build -t "${FULL_IMAGE}" .

echo "==> All done: ${FULL_IMAGE}"
