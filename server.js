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

// CSP配置文件路径
const CSP_CONFIG_PATH = path.join(__dirname, 'csp-config.json');

// 加载CSP配置
let cspConfig = {};
try {
  if (fs.existsSync(CSP_CONFIG_PATH)) {
    cspConfig = JSON.parse(fs.readFileSync(CSP_CONFIG_PATH, 'utf8'));
    console.log('[安全] 已加载CSP配置文件');
  } else {
    console.warn('[安全] CSP配置文件不存在，将使用默认配置');
    // 创建默认配置文件
    const defaultConfig = {
      additionalDomains: {
        script: ["https://cdn.tailwindcss.com"],
        style: ["https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
        font: ["https://fonts.gstatic.com", "https://at.alicdn.com", "http://at.alicdn.com"],
        image: [],
        connect: []
      },
      dataTypes: {
        font: ["data:application/x-font-woff2"]
      },
      development: {
        enabled: true,
        strict: false
      }
    };
    fs.writeFileSync(CSP_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf8');
    cspConfig = defaultConfig;
  }
} catch (error) {
  console.error('[安全] 加载CSP配置文件失败:', error);
  cspConfig = {
    additionalDomains: { script: [], style: [], font: [], image: [], connect: [] },
    dataTypes: { font: [] },
    development: { enabled: true, strict: false }
  };
}

// 监听配置文件变化，实现热重载
fs.watchFile(CSP_CONFIG_PATH, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    try {
      console.log('[安全] 检测到CSP配置文件变化，重新加载...');
      cspConfig = JSON.parse(fs.readFileSync(CSP_CONFIG_PATH, 'utf8'));
      console.log('[安全] CSP配置文件重新加载成功');
    } catch (error) {
      console.error('[安全] 重新加载CSP配置文件失败:', error);
    }
  }
});

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
  // 检查是否是开发环境
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // 提取CDN域名，不使用通配符，而是精确指定域名
  const cdnDomains = Object.values(chinaCDNs).map(url => {
    try {
      const domain = new URL(url).hostname;
      return `https://${domain}`;
    } catch (e) {
      console.error('无效的CDN URL:', url);
      return '';
    }
  }).filter(Boolean);
  
  // 从配置文件获取额外的域名
  const additionalScriptDomains = cspConfig.additionalDomains?.script || [];
  const additionalStyleDomains = cspConfig.additionalDomains?.style || [];
  const additionalFontDomains = cspConfig.additionalDomains?.font || [];
  const additionalImageDomains = cspConfig.additionalDomains?.image || [];
  const additionalConnectDomains = cspConfig.additionalDomains?.connect || [];
  
  // 从配置文件获取额外的数据类型
  const additionalFontDataTypes = cspConfig.dataTypes?.font || [];
  
  // 开发环境可以使用宽松策略，生产环境使用严格策略
  if (isDevelopment && cspConfig.development?.enabled !== false) {
    console.log('[安全] 使用开发环境宽松CSP策略');
    
    // 如果配置了严格开发环境，则使用与生产环境相同的策略
    if (cspConfig.development?.strict === true) {
      console.log('[安全] 开发环境使用严格CSP策略');
    } else {
      // 开发环境使用更宽松的CSP策略，允许更多来源
      return `default-src 'self' * data: blob: filesystem: about: ws: wss:; ` +
             `script-src 'self' 'unsafe-inline' 'unsafe-eval' * blob:; ` +
             `style-src 'self' 'unsafe-inline' *; ` +
             `font-src 'self' data: *; ` +
             `img-src 'self' data: *; ` +
             `connect-src 'self' * ws: wss:;`;
    }
  }
  
  // 生产环境或严格开发环境使用严格的CSP策略
  console.log('[安全] 使用生产环境严格CSP策略');
  
  // 为每种资源类型设置明确的来源规则
  const defaultSrc = ["'self'", ...cdnDomains];
  const scriptSrc = ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...cdnDomains, ...additionalScriptDomains];
  const styleSrc = ["'self'", "'unsafe-inline'", ...cdnDomains, ...additionalStyleDomains, "http://at.alicdn.com", "https://at.alicdn.com"];
  const fontSrc = ["'self'", "data:", ...cdnDomains, ...additionalFontDomains, ...additionalFontDataTypes];
  const imgSrc = ["'self'", "data:", ...cdnDomains, ...additionalImageDomains, "http://*.alicdn.com"];
  const connectSrc = ["'self'", ...cdnDomains, ...additionalConnectDomains, "wss:", "ws:"];
  
  // 构建CSP策略字符串
  return `default-src ${defaultSrc.join(' ')}; ` +
         `script-src ${scriptSrc.join(' ')}; ` +
         `style-src ${styleSrc.join(' ')}; ` +
         `font-src ${fontSrc.join(' ')}; ` +
         `img-src ${imgSrc.join(' ')}; ` +
         `connect-src ${connectSrc.join(' ')};`;
}

// 图表修复脚本，当检测到HTML文件时自动注入
const chartFixerInjectionScript = `
<script>
  // 图表修复模块配置
  window.__CHART_FIXER_CONFIG__ = {
    // 是否启用图表修复
    enabled: true,
    // 是否在编辑器环境中
    isEditor: ${process.env.NODE_ENV !== 'production' ? 'true' : 'false'},
    // 调试模式
    debug: ${process.env.NODE_ENV !== 'production' ? 'true' : 'false'},
    // 支持的图表库
    supportedLibraries: ['echarts', 'highcharts', 'chart.js', 'plotly'],
    // 版本信息
    version: '1.0.0'
  };
  
  // 日志函数
  function chartFixerLog(message, type = 'info') {
    if (!window.__CHART_FIXER_CONFIG__.debug) return;
    
    const prefix = '[图表修复]';
    switch(type) {
      case 'error':
        console.error(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }
  
  // 检测页面是否包含图表代码
  function detectChartCodeInHTML() {
    const scripts = document.querySelectorAll('script:not([src])');
    let hasChartCode = false;
    let isComplexChart = false;
    let detectedLibraries = [];
    
    // 检测是否在编辑器环境中
    const isEditorEnvironment = 
      window.location.href.includes('Material-HTML') || 
      document.title.includes('编辑器') ||
      document.querySelector('.CodeMirror') ||
      document.getElementById('preview-frame');
    
    // 更新配置
    window.__CHART_FIXER_CONFIG__.isEditor = isEditorEnvironment;
    
    // 检查内联脚本
    for (const script of scripts) {
      const content = script.textContent || '';
      
      // 检测图表库
      window.__CHART_FIXER_CONFIG__.supportedLibraries.forEach(lib => {
        if (content.includes(lib)) {
          hasChartCode = true;
          if (!detectedLibraries.includes(lib)) {
            detectedLibraries.push(lib);
          }
        }
      });
      
      // 检测图表配置代码
      if (
        content.includes('setOption') || 
        content.includes('series:') ||
        content.includes('tooltip:') ||
        content.includes('xAxis:') ||
        content.includes('yAxis:')
      ) {
        hasChartCode = true;
      }
      
      // 检查是否是复杂图表
      if (hasChartCode && (
          content.includes('querySelectorAll') || 
          content.includes('getColorForCategory') ||
          (content.match(/echarts\.init/g) || []).length > 2 ||
          content.includes('addEventListener') ||
          (content.includes('function(') && content.length > 1000)
      )) {
        isComplexChart = true;
      }
    }
    
    // 检查外部脚本
    const scriptTags = document.querySelectorAll('script[src]');
    scriptTags.forEach(script => {
      const src = script.getAttribute('src') || '';
      window.__CHART_FIXER_CONFIG__.supportedLibraries.forEach(lib => {
        if (src.includes(lib)) {
          hasChartCode = true;
          if (!detectedLibraries.includes(lib)) {
            detectedLibraries.push(lib);
          }
        }
      });
    });
    
    // 检查图表容器数量
    const chartContainers = document.querySelectorAll('[id*="chart"], [class*="chart"], [id*="Chart"], [class*="Chart"]');
    if (chartContainers.length > 3) {
      isComplexChart = true;
    }
    
    return { 
      hasChartCode, 
      isComplexChart, 
      isEditorEnvironment,
      detectedLibraries
    };
  }
  
  // 自动加载图表修复脚本
  function loadChartFixer() {
    // 如果已经禁用，则不加载
    if (window.__CHART_FIXER_CONFIG__.enabled === false) {
      chartFixerLog('图表修复已禁用，跳过加载');
      return;
    }
    
    const { hasChartCode, isComplexChart, isEditorEnvironment, detectedLibraries } = detectChartCodeInHTML();
    
    if (hasChartCode) {
      chartFixerLog('检测到图表代码，自动加载图表修复模块');
      chartFixerLog('检测到的图表库: ' + detectedLibraries.join(', '));
      
      // 基础修复脚本
      const script = document.createElement('script');
      script.src = '/chart-fixer.js';
      script.async = true;
      document.head.appendChild(script);
      
      // 编辑器环境专用修复
      if (isEditorEnvironment) {
        chartFixerLog('检测到编辑器环境，加载专用修复模块');
        const editorScript = document.createElement('script');
        editorScript.src = '/editor-chart-fix.js';
        editorScript.async = true;
        document.head.appendChild(editorScript);
      }
      // 复杂图表修复
      else if (isComplexChart) {
        chartFixerLog('检测到复杂图表，加载增强修复模块');
        const complexScript = document.createElement('script');
        complexScript.src = '/complex-chart-fixer.js';
        complexScript.async = true;
        document.head.appendChild(complexScript);
      }
      
      // 添加加载完成提示
      if (window.__CHART_FIXER_CONFIG__.debug) {
        window.addEventListener('load', function() {
          setTimeout(function() {
            showChartLoadingNotification(hasChartCode, detectedLibraries);
          }, 1500);
        });
      }
    }
  }
  
  // 显示图表加载提示
  function showChartLoadingNotification(hasChartCode, detectedLibraries) {
    // 检查是否已经存在通知
    if (document.querySelector('.preview-chart-notification')) {
      return;
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'preview-chart-notification';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.width = '320px';
    notification.style.maxWidth = '90vw';
    notification.style.backgroundColor = '#fff';
    notification.style.borderRadius = '8px';
    notification.style.boxShadow = '0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12), 0 5px 5px -3px rgba(0,0,0,0.20)';
    notification.style.zIndex = '9999';
    notification.style.overflow = 'hidden';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    // 设置通知内容
    let librariesText = '';
    if (detectedLibraries && detectedLibraries.length > 0) {
      librariesText = '检测到: ' + detectedLibraries.join(', ');
    }
    
    // 设置通知内容
    let notificationContent = 
      '<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background-color: #1A73E8; color: #fff;">' +
        '<span style="font-weight: 500; font-size: 16px;">图表增强已启用</span>' +
        '<span style="cursor: pointer; font-size: 20px; line-height: 1; opacity: 0.8;" class="notification-close">&times;</span>' +
      '</div>' +
      '<div style="padding: 12px 16px; color: #202124;">' +
        '<p style="margin: 8px 0;">' + librariesText + '</p>';
    
    // 如果包含图表代码，添加额外提示
    if (hasChartCode) {
      notificationContent += 
        '<p style="margin: 8px 0;">如果图表未正常显示，请尝试：</p>' +
        '<ol style="margin: 8px 0; padding-left: 24px;">' +
          '<li style="margin-bottom: 4px;">更换浏览器打开（部分浏览器广告插件可能拦截图表组件）</li>' +
          '<li style="margin-bottom: 4px;">如果仍然不显示，可以尝试更换国内组件源</li>' +
        '</ol>';
    }
    
    notificationContent += '</div>';
    notification.innerHTML = notificationContent;
    
    // 添加通知到页面
    document.body.appendChild(notification);
    
    // 添加关闭按钮事件
    const closeButton = notification.querySelector('.notification-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        setTimeout(() => {
          notification.remove();
        }, 300);
      });
    }
    
    // 显示通知
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);
    
    // 设置自动关闭
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(20px)';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 6000); // 6秒后自动关闭
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
        // 检查请求路径和环境
        const isDeployedPreview = req.path.includes('site_') && req.path.endsWith('.html');
        const isEditorPreview = req.path.includes('preview') && !isDeployedPreview;
        const isDevelopment = process.env.NODE_ENV !== 'production';
        
        // 部署预览 - 永远不注入脚本，但确保CSP头部正确设置
        if (isDeployedPreview) {
          console.log('[HTML处理] 检测到部署预览页面，保持原始内容:', req.path);
          // 不做任何修改，保持原始HTML不变
          // 注意：CSP头已在setHeaders函数中设置，这里不需要额外处理
        } 
        // 编辑器预览 - 根据需要注入脚本
        else if (isEditorPreview) {
          console.log('[HTML处理] 检测到编辑器预览页面，添加图表修复脚本');
          
          // 检查HTML是否包含图表相关代码
          const hasChartCode = 
            body.includes('echarts') || 
            body.includes('chart') || 
            body.includes('Chart') ||
            body.includes('highcharts') ||
            body.includes('plotly');
            
          // 检查是否已经包含图表脚本引用
          const hasChartLibs = 
            body.includes('echarts.min.js') || 
            body.includes('chart.min.js') || 
            body.includes('highcharts.js');
            
          // 检查是否包含完整的图表初始化代码
          const hasCompleteChartCode = 
            body.includes('echarts.init') && 
            body.includes('setOption') && 
            body.includes('window.addEventListener(\'resize\'');
          
          // 只有在检测到图表代码、是编辑器预览且不是完整图表代码时才注入修复脚本
          // 如果HTML中已包含完整的图表初始化和响应式代码，则不注入修复脚本
          if ((hasChartCode || hasChartLibs) && !hasCompleteChartCode) {
            console.log('[HTML处理] 检测到图表代码，注入修复脚本');
            
            // 在</head>标签前插入图表修复脚本
            if (body.includes('</head>')) {
              body = body.replace('</head>', `${chartFixerInjectionScript}</head>`);
            } else if (body.includes('<body>')) {
              body = body.replace('<body>', `<body>${chartFixerInjectionScript}`);
            } else {
              body = chartFixerInjectionScript + body;
            }
          }
        }
        // 其他HTML请求 - 根据环境决定
        else if (isDevelopment) {
          console.log('[HTML处理] 开发环境其他HTML请求，不注入脚本');
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
      
      // 检查是否是部署的站点文件
      const isDeployedSite = path.basename(filePath).startsWith('site_');
      
      if (isDeployedSite) {
        console.log('[安全] 应用部署站点CSP策略:', path.basename(filePath));
      }
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