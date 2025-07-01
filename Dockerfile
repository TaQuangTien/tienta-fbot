# Sử dụng image Node.js chính thức (phiên bản 18-alpine)
FROM node:18-alpine

# Đặt thư mục làm việc trong container
WORKDIR /app

# Copy file package.json để cài đặt các dependency
COPY package.json ./

# Cài đặt các package cần thiết
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Expose cổng mà server lắng nghe
EXPOSE 3000

# Khởi chạy ứng dụng
CMD ["npm", "start"]