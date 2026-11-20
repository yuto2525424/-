# 判定サーバー（AI判定）の配置用。アプリ本体の配信とは別に動かす。
# ANTHROPIC_API_KEY は配置先のシークレット（環境変数）として設定し、イメージやリポジトリには含めない。
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY tsconfig.json ./
COPY src ./src
COPY server ./server
ENV PORT=8787
EXPOSE 8787
CMD ["npx", "tsx", "server/main.ts"]
