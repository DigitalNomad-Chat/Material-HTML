// 简单的Express服务器，用于提供静态文件服务和HTML文件预览功能
// 加载环境变量
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const localStorageHandler = require('./local-storage-handler');

const app = express();
const PORT = process.env.PORT || 3030;

// 存储验证码的会话数据
const captchaSessions = {};

// 清理过期验证码会话
function cleanupExpiredCaptchas() {
  const now = Date.now();
  Object.keys(captchaSessions).forEach(sessionId => {
    if (captchaSessions[sessionId].expires < now) {
      delete captchaSessions[sessionId];
    }
  });
}

// 每10分钟清理一次过期的验证码会话
setInterval(cleanupExpiredCaptchas, 10 * 60 * 1000);

// 允许跨域请求
app.use(cors());

// 解析JSON请求体
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));

// 提供静态文件服务
app.use(express.static(path.join(__dirname)));

// 提供预览功能 - 设置适当的安全头
app.use('/preview', express.static(localStorageHandler.config.uploadDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    // 安全相关响应头，但允许加载外部资源
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // 修改CSP策略，允许加载常用的外部资源
    res.setHeader('Content-Security-Policy', 
      "default-src 'self' https://cdn.jsdelivr.net http://at.alicdn.com https://*.bootcdn.net data:; " +
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.bootcdn.net; " + 
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.bootcdn.net; " +
      "font-src 'self' data: http://at.alicdn.com https://cdn.jsdelivr.net https://*.bootcdn.net; " +
      "img-src 'self' data: https://*.bootcdn.net;"
    );
  }
}));

// 生成简单的数学验证码
app.get('/api/captcha', (req, res) => {
  // 生成两个1-10之间的随机数
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operator = Math.random() > 0.5 ? '+' : '-';
  
  // 计算结果
  const result = operator === '+' ? num1 + num2 : Math.max(num1, num2) - Math.min(num1, num2);
  
  // 生成会话ID
  const sessionId = crypto.randomBytes(16).toString('hex');
  
  // 存储验证码信息，有效期10分钟
  captchaSessions[sessionId] = {
    result: result.toString(),
    expires: Date.now() + 10 * 60 * 1000 // 10分钟后过期
  };
  
  // 返回验证码问题和会话ID
  res.json({
    sessionId: sessionId,
    question: `${Math.max(num1, num2)} ${operator} ${Math.min(num1, num2)} = ?`
  });
});

// 处理上传API，添加验证码验证
app.post('/api/upload', (req, res) => {
  const { captchaSessionId, captchaAnswer } = req.body;
  
  // 验证验证码
  if (!captchaSessionId || !captchaAnswer || 
      !captchaSessions[captchaSessionId] || 
      captchaSessions[captchaSessionId].result !== captchaAnswer) {
    return res.status(403).json({
      error: '验证码错误',
      message: '请输入正确的验证码'
    });
  }
  
  // 验证通过后删除会话，防止重复使用
  delete captchaSessions[captchaSessionId];
  
  // 继续处理上传请求
  localStorageHandler.handleServerUpload(req, res);
});

// 获取文件信息API
app.get('/api/file/info', localStorageHandler.handleGetFileInfo);

// 删除文件API
app.delete('/api/file', localStorageHandler.handleDeleteFile);

// 配置信息路由，用于前端获取参数
app.get('/api/config', (req, res) => {
  try {
    // 返回安全的配置信息
    res.json({
      baseUrl: process.env.BASE_URL || '', // 基础URL，用于生成访问链接
      fileLifetime: parseInt(process.env.FILE_LIFETIME || '1'), // 文件保留天数，默认1天
      storageType: 'local', // 存储类型标记为本地存储
      previewPath: '/preview/', // 预览路径
      captchaEnabled: true // 启用验证码
    });
  } catch (error) {
    res.status(500).json({ error: '获取配置失败', message: error.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  
  // 输出配置信息
  console.log('存储配置信息:');
  console.log('- 存储类型: 本地服务器存储');
  console.log('- 上传目录:', localStorageHandler.config.uploadDir);
  console.log('- 基础URL:', process.env.BASE_URL || `http://localhost:${PORT}`);
  console.log('- 文件保留时间:', parseInt(process.env.FILE_LIFETIME || '1') + '天');
  console.log('- 验证码保护: 已启用');
  
  // 检查关键配置
  if (!process.env.BASE_URL && process.env.NODE_ENV === 'production') {
    console.warn('警告: BASE_URL未配置，在生产环境中可能会影响URL生成');
    console.warn('建议在.env文件中设置BASE_URL为您的域名，例如 https://example.com');
  }
  
  // 启动定时清理任务
  localStorageHandler.setupCleanupTask();
  console.log('已启动文件自动清理任务，将定期清理过期文件');
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message
  });
}); 