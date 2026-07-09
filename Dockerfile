# ---- Stage 1: build the React frontend ----
FROM node:20-alpine AS client
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
WORKDIR /build/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---- Stage 2: runtime (Express server + built frontend) ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

# install only backend production deps
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev

# backend source
COPY server/ ./server/
# built frontend from stage 1
COPY --from=client /build/client/dist ./client/dist

# data + uploads live here; mount a volume on these to persist
RUN mkdir -p /app/server/data /app/server/uploads

EXPOSE 3001
CMD ["node", "server/index.js"]
