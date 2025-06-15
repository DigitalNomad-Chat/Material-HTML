// 简单的Express服务器，用于提供静态文件服务和HTML文件预览功能
// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.warn('dotenv模块未安装，将使用默认环境变量');
  // 创建一个空的process.env对象，如果它不存在
  process.env = process.env || {};
}

const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
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

// 中国主流CDN配置
const chinaCDNs = {
  // 通用CDN提供商
  jsdelivr: "https://cdn.jsdelivr.net",
  staticfile: "https://cdn.staticfile.org",
  bootcdn: "https://cdn.bootcdn.net/ajax/libs",
  bytedance: "https://lf9-cdn-tos.bytecdntp.com/cdn/expire-1-M",
  baomitu: "https://cdn.baomitu.com",
  zhimg: "https://unpkg.zhimg.com",
  
  // 公司CDN
  aliyun: "https://cdn.alicdn.com",
  aliyunG: "https://g.alicdn.com",
  baidu: "https://cdn.bdstatic.com",
  qiniu: "https://jscdn.upai.com",
  qq: "https://cdnjs.cloudflare.com",
  qcloud: "https://cdn-go.cn",
  jd: "https://storage.jd.com",
  
  // 其它CDN源
  sinastorage: "https://sinacloud.net/reactlib",
  cdnjs: "https://cdnjs.cloudflare.com/ajax/libs",
  unpkg: "https://unpkg.com"
};

// 构建CSP策略
function buildCSP() {
  // 基础CSP策略
  let cdnSources = Object.values(chinaCDNs).join(" ");
  
  // 构建CSP策略字符串
  return `default-src 'self' ${cdnSources} http://at.alicdn.com data:; ` +
         `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${cdnSources}; ` +
         `style-src 'self' 'unsafe-inline' ${cdnSources} http://at.alicdn.com; ` +
         `font-src 'self' data: ${cdnSources} http://at.alicdn.com; ` +
         `img-src 'self' data: ${cdnSources} http://*.alicdn.com; ` +
         `connect-src 'self' ${cdnSources} wss: ws:;`;
}

// 图表修复脚本，当检测到HTML文件时自动注入
const chartFixerInjectionScript = `
<script>
  // 检测页面是否包含图表代码
  function detectChartCodeInHTML() {
    const scripts = document.querySelectorAll('script:not([src])');
    let hasChartCode = false;
    let isComplexChart = false;
    let isEditorEnvironment = false;
    
    // 检测是否在编辑器环境中
    if (window.location.href.includes('Material-HTML') || 
        document.title.includes('编辑器') ||
        document.querySelector('.CodeMirror') ||
        document.getElementById('preview-frame')) {
      isEditorEnvironment = true;
    }
    
    for (const script of scripts) {
      const content = script.textContent || '';
      if (
        content.includes('echarts') || 
        content.includes('Chart') || 
        content.includes('chart') || 
        content.includes('setOption') || 
        content.includes('series:') ||
        content.includes('tooltip:')
      ) {
        hasChartCode = true;
        
        // 检查是否是复杂图表
        if (content.includes('querySelectorAll') || 
            content.includes('getColorForCategory') ||
            (content.match(/echarts\.init/g) || []).length > 2 ||
            content.includes('addEventListener') ||
            content.includes('function(') && content.length > 1000) {
          isComplexChart = true;
        }
      }
    }
    
    // 检查图表容器数量
    const chartContainers = document.querySelectorAll('[id*="chart"]');
    if (chartContainers.length > 3) {
      isComplexChart = true;
    }
    
    return { hasChartCode, isComplexChart, isEditorEnvironment };
  }
  
  // 自动加载图表修复脚本
  function loadChartFixer() {
    const { hasChartCode, isComplexChart, isEditorEnvironment } = detectChartCodeInHTML();
    
    if (hasChartCode) {
      console.log('[预览系统] 检测到图表代码，自动加载图表修复模块');
      
      // 基础修复脚本
      const script = document.createElement('script');
      script.src = '/chart-fixer.js';
      script.async = true;
      document.head.appendChild(script);
      
      // 编辑器环境专用修复
      if (isEditorEnvironment) {
        console.log('[预览系统] 检测到编辑器环境，加载专用修复模块');
        const editorScript = document.createElement('script');
        editorScript.src = '/editor-chart-fix.js';
        editorScript.async = true;
        document.head.appendChild(editorScript);
      }
      // 复杂图表修复
      else if (isComplexChart) {
        console.log('[预览系统] 检测到复杂图表，加载增强修复模块');
        const complexScript = document.createElement('script');
        complexScript.src = '/complex-chart-fixer.js';
        complexScript.async = true;
        document.head.appendChild(complexScript);
      }
    }
  }
  
  // 页面加载完成后执行检测
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadChartFixer);
  } else {
    loadChartFixer();
  }
</script>
`;

// HTML文件处理中间件
function processHTMLFile(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(body) {
    if (res.get('Content-Type')?.includes('text/html') && typeof body === 'string') {
      // 检查是否是HTML文件
      if (body.includes('<!DOCTYPE html>') || body.includes('<html')) {
        // 在</head>标签前插入图表修复脚本
        if (body.includes('</head>')) {
          body = body.replace('</head>', `${chartFixerInjectionScript}</head>`);
        } else {
          // 如果没有</head>标签，检查<body>标签
          if (body.includes('<body>')) {
            body = body.replace('<body>', `<body>${chartFixerInjectionScript}`);
          } else {
            // 如果没有<body>标签，在文档开始处插入
            body = chartFixerInjectionScript + body;
          }
        }
      }
    }
    
    originalSend.call(this, body);
  };
  
  next();
}

// 提供预览功能 - 设置适当的安全头并处理HTML
app.use('/preview', processHTMLFile, express.static(localStorageHandler.config.uploadDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    
    // 安全相关响应头
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // 设置允许更广泛的中国CDN资源的CSP策略
    res.setHeader('Content-Security-Policy', buildCSP());
  }
}));

// 生成简单的数字验证码
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
      captchaEnabled: true, // 启用验证码
      cdnSources: Object.keys(chinaCDNs) // 提供CDN源列表
    });
  } catch (error) {
    res.status(500).json({ error: '获取配置失败', message: error.message });
  }
});

// 获取中国CDN引用文档
app.get('/api/cdn-reference', (req, res) => {
  res.sendFile(path.join(__dirname, 'china_cdn_reference.html'));
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
  console.log('- 支持的CDN源数量:', Object.keys(chinaCDNs).length);
  
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