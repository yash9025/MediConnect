FROM node:20-slim

# Set working directory
WORKDIR /app

# Install build tools for native addons
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Expose backend port
EXPOSE 4000

# Environment settings for high concurrency
ENV NODE_ENV=development
ENV PORT=4000

# Increase max heap memory for Node.js
ENV NODE_OPTIONS="--max-old-space-size=4096"

CMD ["node", "server.js"]
