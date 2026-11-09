FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make gcc g++ pkgconfig pixman-dev cairo-dev pango-dev fontconfig-dev libpng-dev jpeg-dev

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
