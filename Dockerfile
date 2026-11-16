# Runs the MCP server over stdio. Search works with no model and no API key.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev
COPY src ./src
ENV NODE_ENV=production \
    SEARCH_MODE=lexical \
    AI_PROVIDER=none
CMD ["node", "src/index.js"]
