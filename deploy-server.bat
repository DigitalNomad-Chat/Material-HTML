@echo off
echo 开始部署HTML编辑器服务...

:: 检查Node.js是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo 错误: Node.js未安装，请先安装Node.js
  exit /b 1
)

:: 检查npm是否安装
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo 错误: npm未安装，请先安装npm
  exit /b 1
)

:: 显示Node.js和npm版本
echo Node.js版本:
node -v
echo npm版本:
npm -v

:: 安装依赖
echo 安装依赖...
call npm install

:: 创建.env文件（如果不存在）
if not exist .env (
  echo 创建.env配置文件...
  (
    echo # 服务器配置
    echo PORT=3030
    echo # 基础URL，用于生成访问链接，例如: https://example.com
    echo BASE_URL=
    echo # 文件保留天数
    echo FILE_LIFETIME=1
    echo # 上传文件保存目录
    echo UPLOAD_DIRECTORY=./uploads
  ) > .env
  echo .env文件已创建，请根据需要修改配置
)

:: 创建uploads目录（如果不存在）
if not exist uploads (
  echo 创建uploads目录...
  mkdir uploads
)

:: 检查PM2是否安装
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo PM2未安装，正在全局安装PM2...
  call npm install -g pm2
)

:: 使用PM2启动服务
echo 使用PM2启动服务...
call pm2 start server.js --name "html-editor" --time

echo 部署完成！服务已在后台运行
echo 可以使用以下命令查看日志：
echo   pm2 logs html-editor
echo 可以使用以下命令停止服务：
echo   pm2 stop html-editor
echo 可以使用以下命令重启服务：
echo   pm2 restart html-editor

pause 