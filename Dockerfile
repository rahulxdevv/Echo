FROM node:20-alpine

WORKDIR /app

# Install build tools for native modules (canvas, etc.)
RUN apk add --no-cache python3 make gcc g++ pkgconfig pixman-dev cairo-dev pango-dev fontconfig-dev

# Copy dependency manifest
COPY package.json ./

# Install dependencies
RUN npm install --only=production

# Copy the rest of the application code
COPY . .

# Expose the port where the bot runs (typically 3000 for Discord bots)
EXPOSE 3000

# Start the bot
CMD ["node", "src/index.js"]
