// --- Deploy Website Functions ---
let deployedSiteUrl = '';
let deployedFileKey = '';
let localConfig = {
    baseUrl: '', // 基础URL
    fileLifetime: 1, // 默认1天
    previewPath: '/preview/', // 预览路径
    captchaEnabled: true // 默认启用验证码
};

// 当前验证码会话信息
let currentCaptcha = {
    sessionId: '',
    question: ''
};

// 从服务器获取配置
async function fetchLocalConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error('获取配置失败，服务器返回: ' + response.status);
        }
        
        const config = await response.json();
        if (config.baseUrl) {
            localConfig.baseUrl = config.baseUrl;
        }
        if (config.fileLifetime) {
            localConfig.fileLifetime = config.fileLifetime;
        }
        if (config.previewPath) {
            localConfig.previewPath = config.previewPath;
        }
        if (config.hasOwnProperty('captchaEnabled')) {
            localConfig.captchaEnabled = config.captchaEnabled;
        }
        
        console.log('获取本地存储配置成功:', localConfig);
        return true;
    } catch (error) {
        console.warn('获取本地存储配置失败:', error);
        return false;
    }
}

// 获取验证码
async function fetchCaptcha() {
    try {
        const response = await fetch('/api/captcha');
        if (!response.ok) {
            throw new Error('获取验证码失败，服务器返回: ' + response.status);
        }
        
        const data = await response.json();
        currentCaptcha = {
            sessionId: data.sessionId,
            question: data.question
        };
        
        return currentCaptcha;
    } catch (error) {
        console.error('获取验证码失败:', error);
        throw error;
    }
}

// 页面加载时获取配置
document.addEventListener('DOMContentLoaded', () => {
    fetchLocalConfig().catch(err => console.warn('初始化本地存储配置失败:', err));
});

function openDeployModal() {
    const deployModal = document.getElementById('deployModal');
    if (!deployModal) return;
    
    // Reset the modal to initial state
    showDeployStep(1);
    document.getElementById('deployAction').textContent = '开始部署';
    document.getElementById('deployAction').disabled = false;
    document.getElementById('openSiteButton').style.display = 'none';
    
    // 更新部署说明中的文件保留时间
    const deployOptions = document.querySelector('.deploy-options');
    if (deployOptions) {
        const infoText = deployOptions.querySelector('.small-text:nth-child(3)');
        if (infoText) {
            infoText.textContent = `上传的文件默认保留${localConfig.fileLifetime}天，超期后自动删除。链接生成后可复制分享或通过二维码在移动设备上访问。`;
        }
    }
    
    // 如果启用了验证码，获取并显示验证码
    if (localConfig.captchaEnabled) {
        // 添加验证码输入框（如果不存在）
        let captchaContainer = document.querySelector('.captcha-container');
        if (!captchaContainer) {
            captchaContainer = document.createElement('div');
            captchaContainer.className = 'captcha-container';
            captchaContainer.style.marginTop = '15px';
            captchaContainer.style.padding = '10px';
            captchaContainer.style.backgroundColor = '#f5f5f5';
            captchaContainer.style.borderRadius = '4px';
            
            const captchaHTML = `
                <div class="captcha-question" style="margin-bottom: 8px; font-weight: bold;"></div>
                <div class="input-container" style="display: flex;">
                    <input type="text" id="captchaAnswer" class="material-input" placeholder="请输入答案" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button class="material-button refresh-captcha" style="margin-left: 8px; background-color: #f0f0f0; border: none; border-radius: 4px; padding: 0 10px;">
                        <span class="material-icons" style="font-size: 20px;">refresh</span>
                    </button>
                </div>
            `;
            
            captchaContainer.innerHTML = captchaHTML;
            
            // 添加到部署选项中
            const deployStep1 = document.getElementById('deployStep1');
            if (deployStep1) {
                deployStep1.appendChild(captchaContainer);
                
                // 添加刷新验证码的事件监听器
                const refreshButton = captchaContainer.querySelector('.refresh-captcha');
                if (refreshButton) {
                    refreshButton.addEventListener('click', function(e) {
                        e.preventDefault();
                        refreshCaptcha();
                    });
                }
            }
        }
        
        // 获取并显示验证码
        refreshCaptcha();
    }
    
    // Show the modal
    deployModal.style.display = 'flex';
    setTimeout(() => { deployModal.classList.add('active'); }, 10);
}

// 刷新验证码
async function refreshCaptcha() {
    if (!localConfig.captchaEnabled) return;
    
    try {
        const captcha = await fetchCaptcha();
        
        // 显示验证码问题
        const questionElement = document.querySelector('.captcha-question');
        if (questionElement) {
            questionElement.textContent = `验证码: ${captcha.question}`;
        }
        
        // 清空输入框
        const answerInput = document.getElementById('captchaAnswer');
        if (answerInput) {
            answerInput.value = '';
        }
    } catch (error) {
        console.error('刷新验证码失败:', error);
    }
}

function closeDeployModal() {
    const deployModal = document.getElementById('deployModal');
    if (!deployModal) return;
    
    deployModal.classList.remove('active');
    setTimeout(() => {
        deployModal.style.display = 'none';
    }, 250);
}

function showDeployStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.deploy-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show the requested step
    const stepToShow = document.getElementById(`deployStep${stepNumber}`);
    if (stepToShow) {
        stepToShow.classList.add('active');
    }
    
    // Update buttons based on step
    const deployAction = document.getElementById('deployAction');
    const deployCancel = document.getElementById('deployCancel');
    const openSiteButton = document.getElementById('openSiteButton');
    
    if (stepNumber === 1) {
        deployAction.textContent = '开始部署';
        deployAction.style.display = 'block';
        deployCancel.textContent = '取消';
        openSiteButton.style.display = 'none';
    } else if (stepNumber === 2) {
        deployAction.style.display = 'none';
        deployCancel.textContent = '取消';
        openSiteButton.style.display = 'none';
    } else if (stepNumber === 3) {
        deployAction.style.display = 'none';
        deployCancel.textContent = '关闭';
        openSiteButton.style.display = 'block';
    } else if (stepNumber === 4) {
        deployAction.textContent = '重试';
        deployAction.style.display = 'block';
        deployCancel.textContent = '关闭';
        openSiteButton.style.display = 'none';
    }
}

// 生成随机文件名
function generateRandomFileName() {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `site_${timestamp}_${randomStr}.html`;
}

// 获取文件信息
async function getFileInfo(key) {
    try {
        const response = await fetch(`/api/file/info?key=${encodeURIComponent(key)}`);
        if (!response.ok) {
            throw new Error('获取文件信息失败，服务器返回: ' + response.status);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('获取文件信息失败:', error);
        throw error;
    }
}

// 上传HTML文件到本地服务器
async function uploadToLocal(htmlContent, fileName) {
    try {
        console.log('上传HTML内容，长度:', htmlContent.length);
        
        // 获取验证码答案（如果启用了验证码）
        let captchaData = {};
        if (localConfig.captchaEnabled) {
            const captchaAnswer = document.getElementById('captchaAnswer');
            if (!captchaAnswer || !captchaAnswer.value.trim()) {
                throw new Error('请输入验证码');
            }
            
            captchaData = {
                captchaSessionId: currentCaptcha.sessionId,
                captchaAnswer: captchaAnswer.value.trim()
            };
        }
        
        // 使用服务器端上传
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: htmlContent,
                filename: fileName,
                ...captchaData
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('服务器返回错误:', response.status, errorData);
            throw new Error(errorData.message || '上传失败，服务器返回: ' + response.status);
        }
        
        const result = await response.json();
        console.log('上传成功:', result);
        
        return {
            key: result.key,
            url: result.url
        };
    } catch (error) {
        console.error('上传到本地服务器失败:', error);
        throw error;
    }
}

// 部署网站
async function deployWebsite() {
    if (!htmlEditor || !cssEditor || !jsEditor) {
        showDeployError('编辑器未初始化，请刷新页面重试。');
        return;
    }
    
    // Show loading state
    showDeployStep(2);
    document.getElementById('deployAction').disabled = true;
    
    try {
        // Get site content
        const htmlContent = htmlEditor.getValue();
        const cssContent = cssEditor.getValue();
        const jsContent = jsEditor.getValue();
        
        // Create a final HTML file that includes all CSS and JS
        let finalHtml;
        if (htmlContent.trim().toLowerCase().includes("<html")) {
            try {
                let tempDoc = new DOMParser().parseFromString(htmlContent, "text/html");
                let head = tempDoc.querySelector('head');
                let body = tempDoc.querySelector('body');

                if (head && cssContent.trim() !== "") {
                    Array.from(head.querySelectorAll('style[data-editor-injected="true"]')).forEach(s => s.remove());
                    const styleTag = tempDoc.createElement('style');
                    styleTag.type = 'text/css';
                    styleTag.setAttribute('data-editor-injected', 'true');
                    styleTag.appendChild(tempDoc.createTextNode(cssContent));
                    head.appendChild(styleTag);
                }
                if (body && jsContent.trim() !== "") {
                    Array.from(body.querySelectorAll('script[data-editor-injected="true"]')).forEach(s => s.remove());
                    const scriptTag = tempDoc.createElement('script');
                    scriptTag.setAttribute('data-editor-injected', 'true');
                    scriptTag.appendChild(tempDoc.createTextNode(jsContent));
                    body.appendChild(scriptTag);
                }
                finalHtml = tempDoc.documentElement.outerHTML;
            } catch (e) {
                console.error("Error parsing user HTML:", e);
                finalHtml = htmlContent;
            }
        } else {
            finalHtml = `
                <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Preview</title>
                <style>${cssContent}</style></head><body>${htmlContent}
                <script>${jsContent}<\/script></body></html>`;
        }

        // 生成随机文件名
        const fileName = generateRandomFileName();
        
        // 上传到本地服务器
        const uploadResult = await uploadToLocal(finalHtml, fileName);
        
        // 保存部署URL和文件key
        deployedSiteUrl = uploadResult.url;
        deployedFileKey = uploadResult.key;
        
        // 显示成功状态
        const urlInput = document.getElementById('deployedSiteUrl');
        if (urlInput) {
            urlInput.value = deployedSiteUrl;
        }
        
        // 添加说明文本
        const deploySuccess = document.querySelector('.deploy-success');
        if (deploySuccess) {
            const noteElement = document.createElement('p');
            noteElement.className = 'small-text';
            noteElement.style.marginTop = '10px';
            
            noteElement.innerHTML = `您的网站已成功部署，链接有效期为${localConfig.fileLifetime}天。您可以通过链接直接访问，也可以扫描二维码在移动设备上查看。`;
            
            // 检查是否已经存在说明，如果没有则添加
            const existingNote = deploySuccess.querySelector('.small-text');
            if (existingNote) {
                existingNote.innerHTML = noteElement.innerHTML;
            } else {
                deploySuccess.appendChild(noteElement);
            }
        }
        
        // 生成QR码
        try {
            // 检查QRCode库是否存在
            if (typeof QRCode === 'function') {
                const qrcodeElement = document.getElementById('qrcode');
                if (qrcodeElement) {
                    qrcodeElement.innerHTML = ''; // 清除之前的QR码
                    
                    // 创建QR码
                    new QRCode(qrcodeElement, {
                        text: deployedSiteUrl,
                        width: 128,
                        height: 128
                    });
                }
            } else {
                console.warn('QRCode库未加载，跳过QR码生成');
                // 隐藏QR码容器
                const qrContainer = document.querySelector('.qr-code-container');
                if (qrContainer) {
                    qrContainer.style.display = 'none';
                }
            }
        } catch (qrError) {
            console.error('生成QR码时出错:', qrError);
            // 隐藏QR码容器
            const qrContainer = document.querySelector('.qr-code-container');
            if (qrContainer) {
                qrContainer.style.display = 'none';
            }
        }
        
        // 保存HTML到localStorage以便持久化
        try {
            localStorage.setItem('deployedHtml', finalHtml);
            localStorage.setItem('deployedUrl', deployedSiteUrl);
            localStorage.setItem('deployedFileKey', deployedFileKey);
        } catch (e) {
            console.warn('无法将已部署的信息存储到localStorage:', e);
        }
        
        showDeployStep(3);
    } catch (error) {
        console.error("部署错误:", error);
        showDeployError(error.message || '部署过程中发生未知错误');
    }
}

function showDeployError(errorMessage) {
    document.getElementById('deployErrorMessage').textContent = errorMessage;
    showDeployStep(4);
    document.getElementById('deployAction').disabled = false;
}

function copyDeployedUrl() {
    const urlInput = document.getElementById('deployedSiteUrl');
    if (!urlInput) return;
    
    urlInput.select();
    document.execCommand('copy');
    
    // Show a brief "copied" message
    const copyButton = document.querySelector('.site-url-container .material-button');
    const originalIcon = copyButton.querySelector('.material-icons').textContent;
    copyButton.querySelector('.material-icons').textContent = 'check';
    setTimeout(() => {
        copyButton.querySelector('.material-icons').textContent = originalIcon;
    }, 2000);
}

function openDeployedSite() {
    if (deployedSiteUrl) {
        window.open(deployedSiteUrl, '_blank');
    }
}

// 模拟API响应 - 仅在本地开发且无法连接真实API时使用
let usingMockAPI = false;
if (typeof fetch !== 'undefined' && window.location.hostname === 'localhost') {
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
        // 先尝试真实API调用
        try {
            const response = await originalFetch(url, options);
            if (response.ok) {
                return response;
            }
        } catch (error) {
            console.warn(`真实API调用失败: ${url}`, error);
            // 如果真实API调用失败，使用模拟数据
        }
        
        // 只有在真实API调用失败时才使用模拟数据
        if (url === '/api/config') {
            console.warn('使用模拟本地配置');
            usingMockAPI = true;
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    baseUrl: 'http://localhost:3030',
                    fileLifetime: 1,
                    storageType: 'local',
                    previewPath: '/preview/',
                    captchaEnabled: true
                })
            });
        } else if (url === '/api/captcha') {
            console.warn('使用模拟验证码');
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    sessionId: 'mock-session-' + Date.now(),
                    question: '5 + 3 = ?'
                })
            });
        } else if (url === '/api/upload' && options && options.method === 'POST') {
            if (usingMockAPI) {
                console.warn('使用模拟本地上传');
                const body = JSON.parse(options.body);
                const fileName = body.filename || 'unknown.html';
                
                // 验证模拟验证码
                if (body.captchaSessionId && body.captchaSessionId.startsWith('mock-session-')) {
                    if (body.captchaAnswer !== '8') {
                        return Promise.resolve({
                            ok: false,
                            status: 403,
                            json: () => Promise.resolve({
                                error: '验证码错误',
                                message: '请输入正确的验证码'
                            })
                        });
                    }
                }
                
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        key: fileName,
                        url: `http://localhost:3030/preview/${fileName}`,
                        expiresAt: new Date(Date.now() + 86400000).toISOString()
                    })
                });
            }
        } else if (url.startsWith('/api/file/info')) {
            if (usingMockAPI) {
                console.warn('使用模拟文件信息');
                const urlParams = new URLSearchParams(url.split('?')[1]);
                const key = urlParams.get('key');
                
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        key: key,
                        url: `http://localhost:3030/preview/${key}`,
                        size: 1024,
                        createdAt: Date.now(),
                        expiresAt: Date.now() + 86400000,
                        exists: true
                    })
                });
            }
        }
        
        // 如果没有匹配的模拟API，或者不是使用模拟API的情况，则使用原始fetch
        return originalFetch(url, options);
    };
} 