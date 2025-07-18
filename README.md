# Material HTML 编辑器

一个现代化的HTML编辑器，支持实时预览和在线部署功能。

## 功能特点

- 在线编辑HTML、CSS和JavaScript代码
- 实时预览
- 代码美化
- 一键部署网站并生成可访问链接
- 生成QR码以便在移动设备上访问
- 自动清理过期文件

## 安装与配置

### 前提条件

- Node.js 14.0或更高版本

### 安装步骤

1. 克隆或下载此仓库
2. 安装依赖项

```bash
npm install
```

3. 配置环境参数

将`.env-example`文件复制为`.env`，并根据需要修改以下配置：

```
# 文件上传目录（相对或绝对路径）
UPLOAD_DIRECTORY=./uploads

# 文件保存期限（天）
FILE_LIFETIME=1

# 服务器基础URL（用于生成访问链接）
BASE_URL=http://localhost:3030

# 服务器端口
PORT=3030

# 环境设置 (development/production)
NODE_ENV=development
```

4. 启动服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

访问 http://localhost:3030 开始使用

## 完整部署教程

### 一、系统要求

- Node.js 14.0 或更高版本
- 一个可访问的Web服务器（VPS、虚拟主机或本地电脑）
- （可选）域名 - 如果您想公开访问

### 二、安装步骤

#### 1. 准备环境

在您的服务器或电脑上安装Node.js:
- 访问 [Node.js官网](https://nodejs.org/) 下载安装包
- 安装时选择默认选项
- 安装完成后，打开命令行工具验证安装:
  ```
  node -v
  npm -v
  ```

#### 2. 下载代码

有两种获取代码的方式:

**方式一：下载ZIP文件**
- 下载项目ZIP文件
- 解压到您选择的目录，如 `C:\websites\html-editor` 或 `/var/www/html-editor`

**方式二：使用Git克隆**
```
git clone https://github.com/您的仓库地址/material-html-editor.git
cd material-html-editor
```

#### 3. 安装依赖

在项目目录中执行:
```
npm install
```

#### 4. 配置环境变量

1. 将`.env-example`文件复制一份并重命名为`.env`
2. 编辑`.env`文件，根据您的需求修改配置:

```
# 本地存储配置

# 文件上传目录（相对或绝对路径）
UPLOAD_DIRECTORY=./uploads

# 文件保存期限（天）
FILE_LIFETIME=1

# 服务器基础URL（关键设置！）
BASE_URL=http://你的域名或IP

# 服务器端口
PORT=3030

# 环境设置
NODE_ENV=production
```

**关于BASE_URL设置:**

- **本地测试时**: 可设置为 `http://localhost:3030`
- **服务器部署时**: 必须设置为您的域名或公网IP，例如 `http://example.com` 或 `http://123.45.67.89`
- **使用反向代理时**: 设置为最终用户访问的URL，如 `https://editor.example.com`

### 三、启动服务

#### 本地测试运行

```
npm run dev
```

#### 生产环境运行

```
npm start
```

启动后您应该看到类似这样的信息:
```
服务器运行在 http://localhost:3030
存储配置信息:
- 存储类型: 本地服务器存储
- 上传目录: C:\websites\html-editor\uploads
- 基础URL: http://your-domain.com
- 文件保留时间: 1天
已启动文件自动清理任务，将定期清理过期文件
```

### 四、长期运行（生产环境）

要让应用在后台持续运行，您可以使用进程管理工具:

#### 使用PM2（推荐）

1. 全局安装PM2:
```
npm install -g pm2
```

2. 使用PM2启动应用:
```
pm2 start server.js --name "html-editor"
```

3. 设置开机自启:
```
pm2 startup
pm2 save
```

4. 常用PM2命令:
```
pm2 list          # 查看运行中的应用
pm2 restart html-editor   # 重启应用
pm2 logs html-editor      # 查看日志
```

### 五、设置反向代理（推荐）

使用反向代理有很多好处：支持HTTPS、隐藏真实端口、增加安全性。这里介绍两种常用方式:

#### Nginx反向代理（常用于Linux）

1. 安装Nginx:
   - Ubuntu/Debian: `sudo apt install nginx`
   - CentOS: `sudo yum install nginx`

2. 创建Nginx配置文件:
```
sudo nano /etc/nginx/sites-available/html-editor.conf
```

3. 添加以下内容:
```
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名

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

4. 启用站点并重启Nginx:
```
sudo ln -s /etc/nginx/sites-available/html-editor.conf /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl restart nginx
```

5. 配置HTTPS（可选但推荐）:
```
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### IIS反向代理（Windows服务器）

1. 安装IIS和URL Rewrite模块
2. 在IIS管理器中创建一个新网站
3. 添加URL Rewrite规则，将请求转发到 `http://localhost:3030`

### 六、常见问题

1. **问题**: 访问生成的HTML链接提示"无法访问"
   **解决**: 检查BASE_URL设置是否正确，确保与用户实际访问的URL一致

2. **问题**: 服务器重启后程序不自动启动
   **解决**: 使用PM2管理并设置开机自启

3. **问题**: 上传文件后无法预览
   **解决**: 检查uploads目录权限，确保应用有读写权限

4. **问题**: 部署在服务器上，但其他电脑无法访问
   **解决**: 检查服务器防火墙设置，确保端口(3030)已开放

## 部署功能说明

点击"部署网站"按钮，应用会：

1. 将HTML、CSS和JavaScript合并为一个完整的HTML文件
2. 保存到服务器本地存储
3. 生成可访问的URL和二维码
4. 根据配置的时间自动清理过期文件（默认1天）

## 许可证

MIT 