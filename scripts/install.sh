#!/bin/bash

# Movie List DB Checker 安装脚本
# 用于快速部署项目

set -e

echo "🚀 开始安装 Movie List DB Checker..."
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 打印彩色消息
print_message() {
    echo -e "${2:-$BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查系统环境
print_message "📋 检查系统环境..."

# 检查Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    print_success "Node.js已安装: $NODE_VERSION"
    
    # 检查版本是否大于等于14
    NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR_VERSION" -lt 14 ]; then
        print_error "Node.js版本过低，需要 >= 14.0.0，当前版本: $NODE_VERSION"
        exit 1
    fi
else
    print_error "Node.js未安装，请先安装Node.js >= 14.0.0"
    print_message "安装命令: https://nodejs.org/"
    exit 1
fi

# 检查npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    print_success "npm已安装: $NPM_VERSION"
else
    print_error "npm未安装"
    exit 1
fi

# 检查MySQL
if command_exists mysql; then
    MYSQL_VERSION=$(mysql --version | awk '{print $5}' | cut -d',' -f1)
    print_success "MySQL已安装: $MYSQL_VERSION"
else
    print_warning "MySQL未找到，请确保MySQL服务器可用"
    print_message "安装MySQL: https://dev.mysql.com/downloads/mysql/"
fi

# 检查Git
if command_exists git; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    print_success "Git已安装: $GIT_VERSION"
else
    print_warning "Git未安装，建议安装Git进行版本控制"
fi

echo ""

# 安装项目依赖
print_message "📦 安装项目依赖..."
if npm install; then
    print_success "依赖安装完成"
else
    print_error "依赖安装失败"
    exit 1
fi

echo ""

# 创建配置文件
print_message "⚙️  配置项目..."

if [ ! -f "config.js" ]; then
    if [ -f "config.example.js" ]; then
        cp config.example.js config.js
        print_success "配置文件已创建: config.js"
        print_warning "请编辑 config.js 文件，填入正确的配置信息"
    else
        print_error "找不到配置模板文件 config.example.js"
        exit 1
    fi
else
    print_warning "配置文件已存在: config.js"
fi

# 创建环境变量文件（如果使用Docker）
if [ ! -f ".env" ]; then
    cat > .env << 'EOL'
# 数据库配置
DB_ROOT_PASSWORD=rootpassword
DB_NAME=movie_list_checker
DB_USER=movielist
DB_PASSWORD=password
DB_PORT=3306

# 应用配置
APP_PORT=3000
NODE_ENV=production

# Google Drive API配置 - 请填入真实值
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Google Drive设置 - 请填入真实值
SHARED_DRIVE_ID=your_shared_drive_id
TARGET_FOLDER_PATH=/path/to/your/folder

# Nginx配置 (可选)
NGINX_PORT=80
NGINX_SSL_PORT=443

# Redis配置 (可选)
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
EOL
    print_success "环境变量文件已创建: .env"
    print_warning "如使用Docker部署，请编辑 .env 文件"
fi

echo ""

# 数据库设置提示
print_message "🗄️  数据库设置..."
print_message "请确保MySQL服务器正在运行，并创建数据库："
print_message "CREATE DATABASE movie_list_checker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" "$YELLOW"
print_message ""
print_message "然后运行以下命令初始化数据库表："
print_message "npm run setup-db" "$YELLOW"

echo ""

# Google Drive API设置提示
print_message "🔗 Google Drive API设置..."
print_message "1. 访问 Google Cloud Console: https://console.cloud.google.com/"
print_message "2. 创建项目并启用 Google Drive API"
print_message "3. 创建 OAuth 2.0 凭据"
print_message "4. 添加重定向URI: http://localhost:8080/callback"
print_message "5. 运行以下命令获取刷新令牌："
print_message "npm run auth" "$YELLOW"
print_message "6. 在浏览器中访问 http://your-ip:8080 完成认证"

echo ""

# 完成提示
print_success "🎉 基础安装完成！"
print_message ""
print_message "📋 接下来的步骤："
print_message "1. 配置Google Drive API凭据 (运行 npm run auth)"
print_message "2. 复制认证信息到 config.js 文件"
print_message "3. 初始化数据库: npm run setup-db"
print_message "4. 启动开发服务器: npm run dev"
print_message "5. 或启动生产服务器: npm start"
print_message ""
print_message "🐳 Docker部署："
print_message "1. 先完成上述认证步骤"
print_message "2. 编辑 .env 文件"
print_message "3. 运行: docker-compose up -d"
print_message ""
print_message "📚 更多信息请查看 README.md"
print_message ""
print_success "安装脚本执行完成！"
