# ── 构建阶段 ──────────────────────────────────────────────
FROM 111.231.44.42:30002/library/node:v20 AS builder

WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=8196"

# 设置 pnpm 国内镜像
RUN pnpm config set registry https://registry.npmmirror.com

# 先复制依赖文件，充分利用 Docker 层缓存
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --shamefully-hoist

# 复制源码并构建
COPY . .
RUN pnpm build


# ── 运行阶段 ──────────────────────────────────────────────
FROM 111.231.44.42:30002/library/node:v20

WORKDIR /app

# 复制构建产物、依赖和 env 配置
COPY --from=builder /app/dist/apps/api ./dist
COPY --from=builder /app/env ./env
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "dist/main.js"]
