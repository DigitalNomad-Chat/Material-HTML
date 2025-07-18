# HTML编辑器部署指南

本文档提供了HTML编辑器的服务器部署步骤和常见问题解决方案。

## 部署步骤

### 方法一：使用部署脚本（推荐）

1. 将项目文件上传到服务器
2. 根据服务器类型选择合适的部署脚本：
   - Linux/Mac: `deploy-server.sh`
   - Windows: `deploy-server.bat`
3. 给脚本添加执行权限（Linux/Mac）：
   ```
   chmod +x deploy-server.sh
   ```
4. 运行部署脚本：
   - Linux/Mac: `./deploy-server.sh`
   - Windows: 双击 `deploy-server.bat` 或在命令提示符中运行

### 方法二：手动部署

1. 确保安装了Node.js（推荐v14或更高版本）
2. 安装依赖：
   ```
   npm install
   ```
3. 创建`.env`配置文件（参考下面的配置说明）
4. 创建`uploads`目录：
   ```
   mkdir uploads
   ```
5. 使用PM2启动服务（推荐）：
   ```
   npm install -g pm2
   pm2 start server.js --name "html-editor"
   ```
   或直接启动：
   ```
   node server.js
   ```

## 配置说明

创建`.env`文件，包含以下配置项：

```
# 服务器配置
PORT=3030
# 基础URL，用于生成访问链接，例如: https://example.com
BASE_URL=https://你的域名
# 文件保留天数
FILE_LIFETIME=1
# 上传文件保存目录
UPLOAD_DIRECTORY=./uploads
```

## 常见问题解决

### 1. MODULE_NOT_FOUND错误

如果遇到类似以下错误：

```
Error: Cannot find module 'dotenv'
```

解决方案：
- 确保已正确运行 `npm install` 安装所有依赖
- 手动安装缺失的模块：`npm install dotenv`

### 2. 端口被占用错误

如果遇到类似以下错误：

```
Error: listen EADDRINUSE: address already in use :::3030
```

解决方案：
- 在`.env`文件中修改`PORT`值为其他未被占用的端口
- 或停止占用该端口的其他程序

### 3. 权限问题

如果遇到文件权限相关错误：

解决方案：
- 确保应用有权限访问和写入`uploads`目录：
  ```
  chmod -R 755 uploads
  ```
- 确保运行Node.js的用户有权限访问项目目录

### 4. PM2相关问题

如果PM2无法正常工作：

解决方案：
- 检查PM2是否正确安装：`pm2 --version`
- 尝试使用管理员/root权限安装PM2：`sudo npm install -g pm2`
- 查看PM2日志：`pm2 logs html-editor`

## 使用Nginx反向代理

如果需要使用Nginx作为反向代理，可以参考以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 联系支持

如果遇到其他问题，请提交Issue或联系技术支持。 