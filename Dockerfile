# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Install Python and pygrib dependencies
# Note: libeccodes is required for pygrib to work with GRIB2 files
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    libeccodes-dev \
    libeccodes-tools \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment and install Python packages
# This avoids the --break-system-packages issue
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python packages in the virtual environment
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Verify Python and pygrib installation
RUN python3 -c "import pygrib; import numpy; from PIL import Image; print('Python dependencies OK')"

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Python scripts
COPY --from=builder /app/scripts ./scripts

# Create radar cache directory with proper permissions
RUN mkdir -p public/radar && chown -R nextjs:nodejs public/radar

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
