FROM node:20-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json ./
COPY server.js ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","server.js"]
