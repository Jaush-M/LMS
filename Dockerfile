# Build stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build Next.js application
RUN bun run build

# Runtime stage
FROM oven/bun:latest

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 nextjs
RUN mkdir -p /app/storage/uploads && chown -R nextjs:nodejs /app/storage

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun -e "const res = await fetch('http://localhost:3000'); if (res.status !== 200) throw new Error(res.status)"

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start Next.js server
CMD ["bun", "start"]
