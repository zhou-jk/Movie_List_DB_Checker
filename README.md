# Movie List DB Checker

一个用于从Google Drive获取文件列表并检查DMM CIDs的开源项目。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D%2014.0.0-green.svg)
![MySQL](https://img.shields.io/badge/mysql-%3E%3D%205.7-orange.svg)

## 🌟 功能特性

- **Google Drive集成**: 自动同步共享盘中的文件列表
- **DMM CID检查**: 批量检查CID是否存在于文件库中
- **Web界面**: 现代化的响应式Web界面
- **实时统计**: 显示文件数量、CID匹配统计等信息
- **搜索功能**: 支持文件名和路径搜索
- **分页显示**: 高效处理大量文件数据
- **历史记录**: 保存查询历史和统计信息

## 🖼️ 界面预览

### CID检查器
- 批量输入DMM CIDs进行检查
- 实时显示匹配结果和统计信息
- 支持导出检查结果

### 文件列表
- 展示所有Google Drive文件
- 支持搜索和分页
- 显示文件详细信息

### 统计面板
- 系统运行统计
- 同步状态监控
- 实时数据更新

## 🚀 快速开始

> **⚡ 想要快速部署？** 查看 **[5分钟快速开始指南](QUICK-START.md)**

### 环境要求

- Node.js >= 14.0.0
- MySQL >= 5.7
- Google Drive API访问权限

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/Movie_List_DB_Checker.git
   cd Movie_List_DB_Checker
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置数据库**
   ```bash
   # 创建MySQL数据库
   mysql -u root -p -e "CREATE DATABASE movie_list_checker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

4. **配置项目**
   ```bash
   # 复制配置文件模板
   cp config.example.js config.js
   
   # 编辑配置文件，填入真实配置信息
   nano config.js
   ```

5. **初始化数据库**
   ```bash
   npm run setup-db
   ```

6. **启动服务**
   ```bash
   # 开发模式
   npm run dev
   
   # 生产模式
   npm start
   ```

7. **访问应用**
   ```
   打开浏览器访问: http://localhost:3000
   ```

## 🌐 VPS远程部署

VPS部署非常简单，只需要运行Web认证服务器即可：

```bash
# 1. 上传项目到VPS
scp -r Movie_List_DB_Checker/ root@your-vps-ip:/home/

# 2. SSH登录VPS并安装依赖
ssh root@your-vps-ip
cd /home/Movie_List_DB_Checker
npm install

# 3. 运行认证服务器 (端口8080)
npm run auth 8080

# 4. 在浏览器中访问 http://your-vps-ip:8080 完成认证

# 5. 复制生成的配置信息到 config.js

# 6. 设置数据库并启动项目
npm run setup-db
npm start
```

## ⚙️ 配置指南

### 数据库配置

在 `config.js` 中配置MySQL连接信息：

```javascript
database: {
  host: 'localhost',
  port: 3306,
  user: 'your_mysql_username',
  password: 'your_mysql_password',
  database: 'movie_list_checker'
}
```

### Google Drive API配置

1. **创建Google Cloud项目**
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建新项目或选择现有项目

2. **启用Drive API**
   - 在API库中搜索"Google Drive API"
   - 启用API

3. **创建OAuth 2.0凭据**
   - 转到"凭据"页面
   - 创建OAuth 2.0客户端ID
   - 添加重定向URI: `http://localhost:8080/callback` (用于认证服务器)

4. **获取刷新令牌**

   **VPS Web认证:**
   ```bash
   npm run auth
   # 然后在浏览器访问 http://your-vps-ip:8080
   ```

5. **配置Google Drive设置**
   
   将获取的认证信息配置到 `config.js`:
   ```javascript
   googleDrive: {
     clientId: 'your_google_client_id',
     clientSecret: 'your_google_client_secret',
     redirectUri: 'http://localhost:3000/auth/google/callback',
     refreshToken: 'your_refresh_token'
   },
   
   driveSettings: {
     sharedDriveId: 'your_shared_drive_id',
     targetFolderPath: '/path/to/your/folder'
   }
   ```

## 📊 数据库结构

### files 表
存储Google Drive文件信息
- `id`: 主键
- `file_id`: Google Drive文件ID
- `file_name`: 文件名
- `file_path`: 文件路径
- `file_size`: 文件大小
- `mime_type`: MIME类型
- `modified_time`: 修改时间

### dmm_cids 表
存储DMM CID检查记录
- `id`: 主键
- `cid`: DMM CID
- `file_id`: 关联的文件ID
- `status`: 状态（found/not_found/pending）
- `first_found_time`: 首次发现时间
- `last_checked_time`: 最后检查时间

### query_history 表
存储查询历史
- `id`: 主键
- `query_text`: 查询的CID列表
- `total_cids`: 总CID数量
- `found_cids`: 已找到的CID数量
- `not_found_cids`: 未找到的CID数量
- `query_time`: 查询时间

### system_config 表
存储系统配置
- `id`: 主键
- `config_key`: 配置键
- `config_value`: 配置值
- `description`: 配置描述

## 🔧 API接口

### 健康检查
```
GET /api/health
```

### 获取统计信息
```
GET /api/stats
```

### 检查CID
```
POST /api/check-cids
Content-Type: application/json

{
  "cids": ["CID1", "CID2", "CID3"]
}
```

### 获取文件列表
```
GET /api/files?page=1&limit=50&search=keyword
```

### 触发同步
```
POST /api/sync
```

## 🐳 Docker部署

1. **构建镜像**
   ```bash
   docker build -t movie-list-checker .
   ```

2. **使用Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **环境变量配置**
   ```bash
   # .env文件
   DB_HOST=mysql
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=movie_list_checker
   
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REFRESH_TOKEN=your_refresh_token
   
   SHARED_DRIVE_ID=your_drive_id
   TARGET_FOLDER_PATH=/your/folder/path
   ```

## 🛠️ 开发指南

### 项目结构

```
Movie_List_DB_Checker/
├── public/              # 前端静态文件
│   ├── index.html      # 主页面
│   ├── styles.css      # 样式文件
│   └── app.js          # 前端逻辑
├── services/           # 服务层
│   └── googleDriveService.js
├── scripts/            # 工具脚本
│   └── setup-database.js
├── server.js           # 主服务器文件
├── config.example.js   # 配置文件模板
├── package.json        # 项目依赖
└── README.md          # 项目文档
```

### 开发命令

```bash
# 安装依赖
npm install

# Google Drive认证
npm run auth

# 数据库初始化
npm run setup-db

# 开发模式（自动重启）
npm run dev

# 生产模式
npm start

# 运行测试
npm test
```

### 添加新功能

1. **后端API**: 在 `server.js` 中添加新的路由
2. **前端功能**: 在 `public/app.js` 中添加新的模块
3. **数据库更改**: 更新 `scripts/setup-database.js`
4. **样式调整**: 修改 `public/styles.css`

## 🔍 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务是否启动
   - 验证数据库连接配置
   - 确认数据库用户权限

2. **Google Drive API错误**
   - 验证API凭据是否正确
   - 检查刷新令牌是否有效
   - 确认Drive API已启用

3. **文件同步失败**
   - 检查网络连接
   - 验证Drive权限
   - 查看服务器日志

### 日志查看

```bash
# 查看应用日志
pm2 logs movie-list-checker

# 查看数据库日志
sudo tail -f /var/log/mysql/error.log

# 查看系统资源
htop
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范

- 使用ESLint进行代码检查
- 遵循JavaScript Standard Style
- 提交前运行测试

### 报告问题

使用GitHub Issues报告bug或提出功能请求：
- 提供详细的错误描述
- 包含复现步骤
- 附上相关日志信息

## 📝 更新日志

### v1.0.0 (2024-12-19)
- 初始版本发布
- 基础CID检查功能
- Google Drive集成
- Web界面实现
- 数据库设计完成

### v1.1.0 (计划中)
- 批量导入/导出功能
- 高级搜索过滤器
- 文件预览功能
- 用户权限管理

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Node.js](https://nodejs.org/) - 后端运行环境
- [Express.js](https://expressjs.com/) - Web框架
- [MySQL](https://www.mysql.com/) - 数据库
- [Bootstrap](https://getbootstrap.com/) - 前端UI框架
- [Google Drive API](https://developers.google.com/drive) - 文件存储服务

## 📞 联系方式

- 项目主页: https://github.com/your-username/Movie_List_DB_Checker
- 问题反馈: https://github.com/your-username/Movie_List_DB_Checker/issues
- 邮箱: your-email@example.com

---

⭐ 如果这个项目对你有帮助，请给一个星标支持！
