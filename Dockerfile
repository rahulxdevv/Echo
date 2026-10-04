FROM node:20-alpine

WORKDIR /app

# Install native build tools and libraries for canvas & image processing
RUN apk add --no-cache python3 make gcc g++ pkgconfig pixman-dev cairo-dev pango-dev fontconfig-dev librsvg-dev giflib-dev

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Start the bot
CMD ["node", "src/index.js"]
