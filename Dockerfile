# 使用官方Node.js运行时作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    mysql-client \
    tzdata

# 设置时区
ENV TZ=Asia/Shanghai

# 复制package.json和package-lock.json（如果存在）
COPY package*.json ./

# 安装项目依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 复制项目文件
COPY . .

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 更改文件所有权
RUN chown -R nextjs:nodejs /app

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动命令
CMD ["npm", "start"]
