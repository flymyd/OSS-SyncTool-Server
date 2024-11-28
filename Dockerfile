# 使用 Node.js 20 作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口（与 main.ts 中的默认端口保持一致）
EXPOSE 8965

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["npm", "run", "start:prod"] 