#!/bin/bash
# 服务器部署脚本

echo "开始部署HTML编辑器服务..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
  echo "错误: Node.js未安装，请先安装Node.js"
  exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
  echo "错误: npm未安装，请先安装npm"
  exit 1
fi

# 显示Node.js和npm版本
echo "Node.js版本: $(node -v)"
echo "npm版本: $(npm -v)"

# 安装依赖
echo "安装依赖..."
npm install

# 创建.env文件（如果不存在）
if [ ! -f .env ]; then
  echo "创建.env配置文件..."
  cat > .env << EOF
# 服务器配置
PORT=3030
# 基础URL，用于生成访问链接，例如: https://example.com
BASE_URL=
# 文件保留天数
FILE_LIFETIME=1
# 上传文件保存目录
UPLOAD_DIRECTORY=./uploads
EOF
  echo ".env文件已创建，请根据需要修改配置"
fi

# 创建uploads目录（如果不存在）
if [ ! -d "uploads" ]; then
  echo "创建uploads目录..."
  mkdir -p uploads
  chmod 755 uploads
fi

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
  echo "PM2未安装，正在全局安装PM2..."
  npm install -g pm2
fi

# 使用PM2启动服务
echo "使用PM2启动服务..."
pm2 start server.js --name "html-editor" --time

echo "部署完成！服务已在后台运行"
echo "可以使用以下命令查看日志："
echo "  pm2 logs html-editor"
echo "可以使用以下命令停止服务："
echo "  pm2 stop html-editor"
echo "可以使用以下命令重启服务："
echo "  pm2 restart html-editor" 