// --- Deploy Website Functions ---
let deployedSiteUrl = '';

function openDeployModal() {
    const deployModal = document.getElementById('deployModal');
    if (!deployModal) return;
    
    // Reset the modal to initial state
    showDeployStep(1);
    document.getElementById('deployAction').textContent = '开始部署';
    document.getElementById('deployAction').disabled = false;
    document.getElementById('openSiteButton').style.display = 'none';
    
    // Show the modal
    deployModal.style.display = 'flex';
    setTimeout(() => { deployModal.classList.add('active'); }, 10);
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

        // 创建一个较短的Data URL（如果HTML内容不太大）
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(finalHtml)}`;
        
        // 创建Blob URL作为备选（本地预览用）
        const htmlBlob = new Blob([finalHtml], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(htmlBlob);
        
        // 使用Data URL作为主要分享链接
        deployedSiteUrl = dataUrl;
        
        // 显示成功状态
        const urlInput = document.getElementById('deployedSiteUrl');
        if (urlInput) {
            urlInput.value = deployedSiteUrl;
        }
        
        // 添加说明文本，解释链接的使用限制
        const deploySuccess = document.querySelector('.deploy-success');
        if (deploySuccess) {
            const noteElement = document.createElement('p');
            noteElement.className = 'small-text';
            noteElement.style.marginTop = '10px';
            noteElement.innerHTML = '注意：此链接包含完整网页内容，可在任何设备上打开。但由于长度限制，某些浏览器可能无法正常打开过大的网页。';
            
            // 检查是否已经存在说明，如果没有则添加
            if (!deploySuccess.querySelector('.small-text')) {
                deploySuccess.appendChild(noteElement);
            }
        }
        
        // 尝试生成QR码
        try {
            // 检查QRCode库是否存在
            if (typeof QRCode === 'function') {
                const qrcodeElement = document.getElementById('qrcode');
                if (qrcodeElement) {
                    qrcodeElement.innerHTML = ''; // 清除之前的QR码
                    
                    // 创建一个简单的QR码，不使用高级选项
                    new QRCode(qrcodeElement, {
                        text: dataUrl,
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
        } catch (e) {
            console.warn('无法将已部署的HTML存储到localStorage:', e);
        }
        
        showDeployStep(3);
        
        // 添加下载按钮
        const siteUrlContainer = document.querySelector('.site-url-container');
        if (siteUrlContainer) {
            const downloadButton = document.createElement('button');
            downloadButton.className = 'material-button icon-button';
            downloadButton.title = '下载HTML文件';
            downloadButton.innerHTML = '<i class="material-icons">download</i>';
            downloadButton.onclick = function() {
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = 'index.html';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };
            
            // 检查按钮是否已存在
            if (!siteUrlContainer.querySelector('button[title="下载HTML文件"]')) {
                siteUrlContainer.appendChild(downloadButton);
            }
        }
        
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