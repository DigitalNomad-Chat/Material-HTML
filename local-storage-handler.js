// 本地存储处理模块
// 将HTML文件保存在服务器本地，提供在线预览与自动清理功能

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 本地存储配置，从环境变量中读取
const config = {
  uploadDir: process.env.UPLOAD_DIRECTORY || path.join(__dirname, 'uploads'), // 上传文件保存目录
  maxAge: parseInt(process.env.FILE_LIFETIME || '1') * 86400000, // 文件保存时间(毫秒)，默认1天
  baseUrl: process.env.BASE_URL || '' // 访问基础URL，为空时使用相对路径
};

// 确保上传目录存在
function ensureUploadDirectory() {
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
    console.log(`创建上传目录: ${config.uploadDir}`);
  }
}

// 生成随机文件名
function generateFileName(originalName) {
  const timestamp = Date.now();
  const randomStr = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName || 'index.html') || '.html';
  return `site_${timestamp}_${randomStr}${ext}`;
}

// 保存HTML内容到本地文件
async function saveFile(content, filename) {
  ensureUploadDirectory();
  
  // 生成随机文件名(如果未提供)
  if (!filename) {
    filename = generateFileName('index.html');
  }
  
  const filePath = path.join(config.uploadDir, filename);
  
  // 写入文件
  await fs.promises.writeFile(filePath, content, 'utf8');
  
  // 记录创建时间(用于后续清理)
  const metadata = {
    createdAt: Date.now(),
    expiresAt: Date.now() + config.maxAge,
    originalName: filename
  };
  
  // 将元数据保存在隐藏文件中
  await fs.promises.writeFile(
    `${filePath}.meta`, 
    JSON.stringify(metadata)
  );
  
  // 构建访问URL
  let url;
  if (config.baseUrl) {
    // 使用完整URL
    url = `${config.baseUrl}/preview/${filename}`;
  } else {
    // 使用相对路径
    url = `/preview/${filename}`;
  }
  
  return {
    key: filename,
    url: url,
    expiresAt: new Date(metadata.expiresAt).toISOString()
  };
}

// 获取文件信息
async function getFileInfo(filename) {
  const filePath = path.join(config.uploadDir, filename);
  const metaPath = `${filePath}.meta`;
  
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    throw new Error('文件不存在');
  }
  
  // 读取文件元数据
  let metadata = {};
  if (fs.existsSync(metaPath)) {
    try {
      metadata = JSON.parse(await fs.promises.readFile(metaPath, 'utf-8'));
    } catch (err) {
      console.warn(`无法读取文件元数据(${filename}):`, err);
    }
  }
  
  // 获取文件状态
  const stats = await fs.promises.stat(filePath);
  
  // 构建访问URL
  let url;
  if (config.baseUrl) {
    url = `${config.baseUrl}/preview/${filename}`;
  } else {
    url = `/preview/${filename}`;
  }
  
  return {
    key: filename,
    url: url,
    size: stats.size,
    createdAt: metadata.createdAt || stats.birthtimeMs,
    expiresAt: metadata.expiresAt || (stats.birthtimeMs + config.maxAge),
    exists: true
  };
}

// 删除文件
async function deleteFile(filename) {
  const filePath = path.join(config.uploadDir, filename);
  const metaPath = `${filePath}.meta`;
  
  try {
    // 删除文件
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
    
    // 删除元数据
    if (fs.existsSync(metaPath)) {
      await fs.promises.unlink(metaPath);
    }
    
    return true;
  } catch (err) {
    console.error(`删除文件(${filename})时出错:`, err);
    throw err;
  }
}

// 定时清理过期文件
function setupCleanupTask() {
  // 确保上传目录存在
  ensureUploadDirectory();
  
  // 启动后立即执行一次清理
  cleanupExpiredFiles();
  
  // 设置定时任务，每小时检查一次过期文件
  const intervalId = setInterval(cleanupExpiredFiles, 60 * 60 * 1000);
  
  // 返回定时器ID，以便需要时可以停止
  return intervalId;
}

// 清理过期文件
async function cleanupExpiredFiles() {
  try {
    console.log('[清理任务] 开始清理过期文件...');
    const now = Date.now();
    const files = await fs.promises.readdir(config.uploadDir);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
      // 跳过元数据文件
      if (file.endsWith('.meta')) continue;
      
      const filePath = path.join(config.uploadDir, file);
      const metaPath = `${filePath}.meta`;
      
      try {
        // 读取元数据判断是否过期
        if (fs.existsSync(metaPath)) {
          const metadata = JSON.parse(await fs.promises.readFile(metaPath, 'utf-8'));
          
          if (metadata.expiresAt <= now) {
            // 删除过期文件及其元数据
            await fs.promises.unlink(filePath);
            await fs.promises.unlink(metaPath);
            deletedCount++;
            console.log(`[清理任务] 已删除过期文件: ${file}`);
          }
        } else {
          // 对于没有元数据的文件，检查修改时间
          const stats = await fs.promises.stat(filePath);
          if (now - stats.mtimeMs > config.maxAge) {
            await fs.promises.unlink(filePath);
            deletedCount++;
            console.log(`[清理任务] 已删除过期文件(无元数据): ${file}`);
          }
        }
      } catch (err) {
        errorCount++;
        console.error(`[清理任务] 处理文件${file}时出错:`, err);
      }
    }
    
    console.log(`[清理任务] 文件清理完成。已删除${deletedCount}个文件，处理错误${errorCount}个。`);
    return { deletedCount, errorCount };
  } catch (err) {
    console.error('[清理任务] 清理过期文件时出错:', err);
    throw err;
  }
}

// 处理上传请求
async function handleServerUpload(req, res) {
  try {
    // 获取请求中的内容和文件名
    const { content, filename } = req.body;
    
    if (!content) {
      return res.status(400).json({
        error: '参数错误',
        message: '缺少文件内容'
      });
    }
    
    // 生成随机文件名(如果未提供)
    const targetFilename = filename || generateFileName('index.html');
    
    // 保存文件
    const result = await saveFile(content, targetFilename);
    
    // 返回上传结果
    return res.json(result);
    
  } catch (error) {
    console.error('上传文件失败:', error);
    return res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
}

// 获取文件信息请求
async function handleGetFileInfo(req, res) {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({
        error: '参数错误',
        message: '缺少文件key参数'
      });
    }
    
    const fileInfo = await getFileInfo(key);
    return res.json(fileInfo);
    
  } catch (error) {
    console.error('获取文件信息失败:', error);
    return res.status(404).json({
      error: '文件不存在',
      message: error.message
    });
  }
}

// 删除文件请求
async function handleDeleteFile(req, res) {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({
        error: '参数错误',
        message: '缺少文件key参数'
      });
    }
    
    await deleteFile(key);
    return res.json({ success: true, message: '文件已删除' });
    
  } catch (error) {
    console.error('删除文件失败:', error);
    return res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
}

// 导出模块
module.exports = {
  config,
  saveFile,
  getFileInfo,
  deleteFile,
  cleanupExpiredFiles,
  setupCleanupTask,
  handleServerUpload,
  handleGetFileInfo,
  handleDeleteFile,
  ensureUploadDirectory
}; 