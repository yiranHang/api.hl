#!/bin/sh
set -e

# 切换到项目根目录（脚本所在目录的上一级）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${SCRIPT_DIR}/.."

CURRENT_DATE=$(date +%Y%m%d%H%M%S)
REGISTRY="hanglin.site:6100"
IMAGE_FULL="${REGISTRY}/admin/admin-api:${CURRENT_DATE}"

echo ">>> Building image: ${IMAGE_FULL}"
docker build -f scripts/Dockerfile -t "${IMAGE_FULL}" .

echo ">>> Logging in to ${REGISTRY}"
echo "Hanglin@123" | docker login "${REGISTRY}" -u admin --password-stdin

echo ">>> Pushing image: ${IMAGE_FULL}"
docker push "${IMAGE_FULL}"

echo ">>> Done: ${IMAGE_FULL}"
