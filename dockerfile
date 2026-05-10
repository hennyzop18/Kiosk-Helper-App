FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Sử dụng 'serve' để chạy static file trên port 7860
RUN npm install -g serve
EXPOSE 7860
CMD ["serve", "-s", "dist", "-l", "7860"]
