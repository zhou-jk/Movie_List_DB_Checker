# 🚀 快速开始指南

## 📋 环境要求

- Node.js >= 14.0.0
- MySQL >= 5.7
- Google Drive API访问权限

## ⚡ 5分钟快速部署

### 1. 下载项目

```bash
git clone https://github.com/your-username/Movie_List_DB_Checker.git
cd Movie_List_DB_Checker
npm install
```

### 2. 设置Google Drive API

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目并启用 Google Drive API
3. 创建 OAuth 2.0 客户端ID
4. 添加重定向URI: `http://localhost:8080/callback`

### 3. 获取认证令牌

```bash
# 启动Web认证服务器
npm run auth

# 在浏览器访问显示的URL (通常是 http://localhost:8080)
# 完成Google授权，复制生成的配置信息
```

### 4. 配置项目

```bash
# 复制配置模板
cp config.example.js config.js

# 编辑config.js，粘贴步骤3获取的配置信息
nano config.js
```

### 5. 设置数据库

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE movie_list_checker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 初始化数据库表
npm run setup-db
```

### 6. 启动项目

```bash
# 开发模式
npm run dev

# 或生产模式
npm start
```

### 7. 访问应用

打开浏览器访问: http://localhost:3000

## 🌐 VPS部署

在远程服务器上部署更简单：

```bash
# 1. 上传项目到VPS
scp -r Movie_List_DB_Checker/ root@your-vps-ip:/home/

# 2. SSH登录并安装
ssh root@your-vps-ip
cd /home/Movie_List_DB_Checker
npm install

# 3. Web认证 (关键步骤!)
npm run auth 8080
# 在本地浏览器访问: http://your-vps-ip:8080

# 4. 配置并启动
cp config.example.js config.js
nano config.js  # 粘贴认证信息
npm run setup-db
npm start
```

## 🎯 使用说明

### 主要功能

1. **文件同步**: 自动从Google Drive同步文件列表
2. **CID检查**: 批量检查DMM CID是否存在
3. **Web界面**: 现代化的用户界面

### 基本操作

1. **同步文件**: 点击同步按钮更新文件列表
2. **检查CID**: 在文本框中输入CID列表（每行一个），点击检查
3. **查看结果**: 系统会显示找到和未找到的CID

### API接口

- `GET /api/health` - 健康检查
- `GET /api/stats` - 获取统计信息
- `GET /api/files` - 获取文件列表
- `POST /api/check-cids` - 检查CID
- `POST /api/sync` - 触发同步

## ❓ 常见问题

### Q: Google Drive认证失败？
A: 检查重定向URI是否正确设置为 `http://localhost:8080/callback`

### Q: 数据库连接失败？
A: 确认MySQL服务运行，检查config.js中的数据库配置

### Q: VPS认证无法访问？
A: 检查防火墙是否开放8080端口：`sudo ufw allow 8080`

### Q: 文件同步失败？
A: 确认Google Drive权限设置，检查共享盘ID是否正确

## 📞 获取帮助

- 查看详细文档: [README.md](README.md)
- 提交问题: [GitHub Issues](https://github.com/your-username/Movie_List_DB_Checker/issues)
- 邮箱支持: your-email@example.com

---

🎉 **恭喜！** 你的Movie List DB Checker已经设置完成！

