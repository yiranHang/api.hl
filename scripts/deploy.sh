#!/bin/sh
set -e

# ── 配置项（按需修改）────────────────────────────────────────
REGISTRY="hanglin.site:6100"
IMAGE_TAG="${1:-$(date +%Y%m%d%H%M%S)}"          # 支持传参指定版本，默认当天日期
IMAGE_FULL="${REGISTRY}/admin/admin-api:${IMAGE_TAG}"
CONTAINER_NAME="admin-api"
REGISTRY_USER="admin"
REGISTRY_PASS="Hanglin@123"
# ──────────────────────────────────────────────────────────────

echo ">>> [1/4] 登录镜像仓库 ${REGISTRY}"
echo "${REGISTRY_PASS}" | docker login "${REGISTRY}" -u "${REGISTRY_USER}" --password-stdin

echo ">>> [2/4] 拉取镜像 ${IMAGE_FULL}"
docker pull "${IMAGE_FULL}"

echo ">>> [3/4] 停止并删除旧容器（如存在）"
docker stop "${CONTAINER_NAME}" 2>/dev/null || true
docker rm   "${CONTAINER_NAME}" 2>/dev/null || true

echo ">>> [4/4] 启动新容器"
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p 3000:4000 \
  "${IMAGE_FULL}"

echo ">>> 部署完成: ${IMAGE_FULL}"
docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
