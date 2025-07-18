// script.js - Final Version with All Enhancements

let htmlEditor, cssEditor, jsEditor;

// Store layout preferences
let layoutPreferences = {
    editorWidth: 50, // percentage
    previewWidth: 50, // percentage
    editorCollapsed: false
};

// 添加拖动状态变量
let isDragging = false;
let lastRenderTime = 0;
const RENDER_THROTTLE = 16; // 约60fps

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Material HTML 编辑器</title>
    <!-- 引入Google字体 -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
    <!-- 引入图标 -->
    <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #1A73E8;
            --primary-dark: #0d47a1;
            --primary-light: #e3f2fd;
            --accent: #ff4081;
            --text: #202124;
            --text-secondary: #5f6368;
            --background: #f8f9fa;
            --card-bg: #ffffff;
            --border: #dadce0;
            --shadow-sm: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
            --shadow-md: 0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08);
            --shadow-lg: 0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.1);
            --anim: cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body { 
            font-family: 'Noto Sans SC', sans-serif;
            background-color: var(--background);
            color: var(--text);
            line-height: 1.6;
            padding: 0;
            margin: 0;
            overflow-x: hidden;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        header {
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: white;
            padding: 3rem 2rem;
            text-align: center;
            box-shadow: var(--shadow-md);
            position: relative;
            overflow: hidden;
        }
        
        header::before {
            content: "";
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
            transform: rotate(30deg);
        }
        
        .logo {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .tagline {
            font-size: 1.2rem;
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto;
            position: relative;
        }
        
        .card {
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: var(--shadow-sm);
            padding: 2rem;
            margin: 2rem 0;
            transition: transform 0.3s var(--anim), box-shadow 0.3s var(--anim);
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-md);
        }
        
        h1 {
            color: var(--primary);
            margin-bottom: 1rem;
            font-weight: 700;
        }
        
        h2 {
            color: var(--primary);
            margin: 1.5rem 0 1rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        h2 i {
            font-size: 1.2rem;
        }
        
        p {
            margin-bottom: 1rem;
            color: var(--text-secondary);
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        
        .feature-card {
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: var(--shadow-sm);
            padding: 1.5rem;
            transition: transform 0.3s var(--anim), box-shadow 0.3s var(--anim);
            border-top: 3px solid var(--primary);
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-md);
        }
        
        .feature-icon {
            background-color: var(--primary-light);
            color: var(--primary);
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            margin-bottom: 1rem;
        }
        
        .feature-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--text);
        }
        
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
            font-size: 1rem;
            box-shadow: var(--shadow-sm);
            transition: all 0.3s var(--anim);
            text-decoration: none;
        }
        
        .btn:hover {
            background-color: var(--primary-dark);
            box-shadow: var(--shadow-md);
            transform: translateY(-2px);
        }
        
        .btn-accent {
            background-color: var(--accent);
        }
        
        .btn-accent:hover {
            background-color: #e91e63;
        }
        
        .btn-group {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            margin: 1.5rem 0;
        }
        
        a {
            color: var(--primary);
            text-decoration: none;
            transition: color 0.2s var(--anim);
        }
        
        a:hover {
            color: var(--primary-dark);
            text-decoration: underline;
        }
        
        .demo-section {
            background-color: var(--primary-light);
            padding: 2rem;
            border-radius: 8px;
            margin: 2rem 0;
        }
        
        .code-preview {
            background-color: #282c34;
            color: #abb2bf;
            padding: 1.5rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1.5rem 0;
            font-family: monospace;
        }
        
        footer {
            background-color: var(--primary-dark);
            color: white;
            padding: 2rem;
            text-align: center;
            margin-top: 3rem;
        }
        
        .social-links {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin: 1rem 0;
        }
        
        .social-link {
            color: white;
            font-size: 1.5rem;
            transition: transform 0.2s var(--anim);
        }
        
        .social-link:hover {
            transform: translateY(-3px);
        }
        
        .tooltip {
            position: relative;
            display: inline-block;
        }
        
        .tooltip .tooltip-text {
            visibility: hidden;
            background-color: rgba(0,0,0,0.8);
            color: white;
            text-align: center;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            position: absolute;
            z-index: 1;
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            opacity: 0;
            transition: opacity 0.3s;
            white-space: nowrap;
        }
        
        .tooltip:hover .tooltip-text {
            visibility: visible;
            opacity: 1;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            header {
                padding: 2rem 1rem;
            }
            
            .features {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="logo"><i class="fas fa-code"></i> Material HTML 编辑器</div>
        <div class="tagline">AI构建的现代化HTML编辑与预览工具</div>
    </header>
    
    <div class="container">
        <div class="card">
            <h1><i class="fas fa-star"></i> 欢迎使用 Material 编辑器!</h1>
            <p>这是一个由AI构建的现代化编程工具，帮助您轻松预览精美的网页设计。无论您是专业开发者还是办公达人，都能轻松调试你的精美设计。</p>
            
            <div class="btn-group">
                <button class="btn" onclick="showMessage()"><i class="fas fa-play"></i> 支持网页交互</button>
                <button class="btn btn-accent"><i class="fas fa-download"></i> 支持一键部署</button>
            </div>
        </div>
        
        <h2><i class="fas fa-lightbulb"></i> 核心功能</h2>
        <div class="features">
            <div class="feature-card">
                <div class="feature-icon"><i class="fas fa-paint-brush"></i></div>
                <div class="feature-title">实时预览</div>
                <p>编写代码的同时，实时查看效果，提高开发效率。</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon"><i class="fas fa-robot"></i></div>
                <div class="feature-title">下载预览图</div>
                <p>支持自定义比例导出预览图，轻松导出精美大图。</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon"><i class="fas fa-mobile-alt"></i></div>
                <div class="feature-title">部署网站</div>
                <p>一键部署网站，轻松将网页设计分享给他人。</p>
            </div>
        </div>
        
        <div class="demo-section">
            <h2><i class="fas fa-code"></i> 快速上手</h2>
            <p>在编辑器中编写您的HTML, CSS和JavaScript代码，预览窗口会自动更新显示效果。</p>
            <div class="code-preview">
                &lt;!-- HTML 示例 --&gt;<br>
                &lt;div class="card"&gt;<br>
                &nbsp;&nbsp;&lt;h2&gt;Hello World!&lt;/h2&gt;<br>
                &nbsp;&nbsp;&lt;p&gt;这是我的第一个项目&lt;/p&gt;<br>
                &lt;/div&gt;
            </div>
        </div>
        
        <div class="card">
            <h2><i class="fas fa-question-circle"></i> 常见问题</h2>
            <p>这是一个AI编程实践项目，网站设计与功能代码实现全部由AI生成。</p>
            <p>更多 AI 实践项目请关注 <a href="https://www.prowork.top" target="_blank">职场人的高效办公神器 <i class="fas fa-external-link-alt"></i></a></p>
        </div>
    </div>
    
    <footer>
        <p>Material HTML 编辑器 &copy; 2025 | PROWORK团队打造</p>
        <div class="social-links">
            <a href="#" class="social-link tooltip">
                <i class="fab fa-github"></i>
                <span class="tooltip-text">GitHub</span>
            </a>
            <a href="#" class="social-link tooltip">
                <i class="fab fa-twitter"></i>
                <span class="tooltip-text">Twitter</span>
            </a>
            <a href="#" class="social-link tooltip">
                <i class="fab fa-weixin"></i>
                <span class="tooltip-text">微信</span>
            </a>
        </div>
    </footer>

    <script>
        // 页面加载完成后的动画效果
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.card, .feature-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 100 * index);
            });
        });
        
        // 测试按钮点击事件
        function showMessage() {
            // 创建一个现代化的提示框
            const toast = document.createElement('div');
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.backgroundColor = '#323232';
            toast.style.color = 'white';
            toast.style.padding = '12px 24px';
            toast.style.borderRadius = '4px';
            toast.style.boxShadow = '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)';
            toast.style.zIndex = '1000';
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            toast.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 8px;"></i> JavaScript 运行成功!';
            
            document.body.appendChild(toast);
            
            // 显示提示框
            setTimeout(() => {
                toast.style.transform = 'translateY(0)';
                toast.style.opacity = '1';
            }, 100);
            
            // 3秒后隐藏
            setTimeout(() => {
                toast.style.transform = 'translateY(100px)';
                toast.style.opacity = '0';
                
                // 移除元素
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
            
            console.log("测试按钮被点击");
        }
        
        console.log("Material HTML 编辑器已加载");
    </script>
</body>
</html>`;
const DEFAULT_CSS = `/* CSS (默认折叠) */
body {
    /* 预览区内的背景已在HTML的style中设置，这里可以添加更多 */
    padding: 15px;
    box-sizing: border-box; /* Better box model for padding */
}
h1 {
    border-bottom: 2px solid #1A73E8; /* Google Blue */
    padding-bottom: 5px;
    font-weight: 500; /* Material-like heading */
}
p {
    font-size: 16px; /* Material body text size */
}
`;
const DEFAULT_JS = `// JavaScript (默认折叠)
console.log("JavaScript 编辑器已准备就绪!");

document.addEventListener('DOMContentLoaded', () => {
    const pageTitle = document.querySelector('h1');
    if (pageTitle) {
        // Example of dynamic interaction
        // pageTitle.textContent += " (JS 已激活!)";
    }
});
`;

let conditionalClearDialogShown = false;

const scalePreviewModal = document.getElementById('scalePreviewModal');
const modalPreviewScaleRange = document.getElementById('modalPreviewScaleRange');
const modalScaleOutput = document.getElementById('modalScaleOutput');
const modalCanvasPreview = document.getElementById('modalCanvasPreview');
const loadingIndicator = document.querySelector('.modal-preview-area .loading-indicator');
const currentPreviewSizeSpan = document.getElementById('currentPreviewSize');
const downloadImageSizeSpan = document.getElementById('downloadImageSize');
const transparentBgCheckbox = document.getElementById('transparentBgCheckbox'); // Get checkbox

let currentModalScale = 2;
let fullResolutionCapturedCanvas = null;

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

function initializeEditors() {
    // Load layout preferences
    loadLayoutPreferences();

    const commonOptions = {
        lineNumbers: true,
        theme: "eclipse",
        autoCloseTags: true,
        autoCloseBrackets: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
        foldGutter: true,
        lint: true,
        lineWrapping: true
    };

    const userHasActiveEdits = localStorage.getItem('userHasActiveEdits') === 'true';

    let initialHTML = localStorage.getItem('editorContentHTML');
    if (userHasActiveEdits) { initialHTML = initialHTML || ""; } 
    else { initialHTML = initialHTML === null ? DEFAULT_HTML : initialHTML; } 
    
    htmlEditor = CodeMirror(document.getElementById('html-editor-container'), {
        ...commonOptions, mode: "htmlmixed", value: initialHTML, lint: { getAnnotations: CodeMirror.lint.html }
    });

    let initialCSS = localStorage.getItem('editorContentCSS');
    if (userHasActiveEdits) { initialCSS = initialCSS || ""; } 
    else { initialCSS = initialCSS === null ? DEFAULT_CSS : initialCSS; }
    
    cssEditor = CodeMirror(document.getElementById('css-editor-container'), {
        ...commonOptions, mode: "css", value: initialCSS, lint: { getAnnotations: CodeMirror.lint.css }
    });

    let initialJS = localStorage.getItem('editorContentJS');
    if (userHasActiveEdits) { initialJS = initialJS || ""; } 
    else { initialJS = initialJS === null ? DEFAULT_JS : initialJS; }
    
    jsEditor = CodeMirror(document.getElementById('js-editor-container'), {
        ...commonOptions, mode: "javascript", value: initialJS, lint: { getAnnotations: CodeMirror.lint.javascript }
    });

    const debouncedUpdatePreviewAndSave = debounce(() => {
        checkAndPromptToClearDefaults();
        updatePreview();
        saveContentToLocalStorage();
    }, 400);

    htmlEditor.on('change', debouncedUpdatePreviewAndSave);
    cssEditor.on('change', debouncedUpdatePreviewAndSave);
    jsEditor.on('change', debouncedUpdatePreviewAndSave);

    setupCollapsibleSections();
    setupResizablePanes(); // Call after collapsible sections are set up
    setupVerticalSplitter();
    setupPaneToggleButtons();
    applyLayoutPreferences(); // Apply saved layout
}

const previewFrame = document.getElementById('preview-frame');

function updatePreview() {
    if (!htmlEditor || !cssEditor || !jsEditor || !previewFrame) return;
    const htmlContent = htmlEditor.getValue();
    const cssContent = cssEditor.getValue();
    const jsContent = jsEditor.getValue();
    let finalHtml;

    // 显示加载指示器状态
    const previewPane = document.getElementById('previewPane');
    
    // 添加加载指示器（如果不存在）
    let loadingIndicator = previewPane.querySelector('.preview-loading-indicator');
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'preview-loading-indicator';
        loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">预览内容构建中...</div>
        `;
        previewPane.appendChild(loadingIndicator);
    }
    
    // 显示加载指示器
    loadingIndicator.classList.add('active');

    // 检查HTML内容是否包含图表代码
    const hasChartCode = htmlContent.includes('echarts') || 
                         htmlContent.includes('Chart.js') || 
                         htmlContent.includes('chart') || 
                         jsContent.includes('echarts') ||
                         jsContent.includes('chart');

    // 图表修复脚本
    const chartFixerScript = hasChartCode ? `
    <script>
        // 编辑器环境图表修复
        window.addEventListener('load', function() {
            // 检查是否有图表代码
            if (document.querySelectorAll('[id*="chart"]').length > 0 || 
                document.querySelectorAll('.chart-content, .chart-container').length > 0) {
                
                console.log('[编辑器图表修复] 检测到图表容器，开始修复');
                
                // 注入getColorForCategory函数 - 必须在所有脚本前执行
                if (typeof window.getColorForCategory === 'undefined') {
                    window.getColorForCategory = function(category) {
                        const colorMap = {
                            '上衣': '#1890ff',
                            '裤装': '#52c41a',
                            '裙装': '#f5222d',
                            '外套': '#fa8c16',
                            '配饰': '#722ed1',
                            // 通用颜色备用
                            '类别1': '#1890ff',
                            '类别2': '#52c41a',
                            '类别3': '#f5222d',
                            '类别4': '#fa8c16',
                            '类别5': '#722ed1'
                        };
                        return colorMap[category] || '#1890ff';
                    };
                    console.log('[编辑器图表修复] 已注入getColorForCategory函数');
                }
                
                // 注入其他常用函数
                if (typeof window.formatNumber === 'undefined') {
                    window.formatNumber = function(num) {
                        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
                    };
                }
                
                if (typeof window.formatPercent === 'undefined') {
                    window.formatPercent = function(num) {
                        return num.toFixed(2) + '%';
                    };
                }
                
                // 修复echarts.init方法
                if (window.echarts && window.echarts.init) {
                    const originalInit = window.echarts.init;
                    
                    window.echarts.init = function(dom, theme, opts) {
                        try {
                            // 检查dom是否有效
                            if (!dom || typeof dom.getAttribute !== 'function') {
                                console.log('[编辑器图表修复] 无效的DOM元素，尝试查找替代容器');
                                
                                // 尝试查找有效的图表容器
                                const containers = document.querySelectorAll('.chart-content, [id$="-chart"]');
                                if (containers && containers.length > 0) {
                                    for (let i = 0; i < containers.length; i++) {
                                        if (containers[i] && typeof containers[i].getAttribute === 'function') {
                                            console.log('[编辑器图表修复] 找到替代容器:', containers[i].id || '(无ID)');
                                            dom = containers[i];
                                            break;
                                        }
                                    }
                                }
                                
                                // 如果仍然没有找到有效容器，创建一个新的
                                if (!dom || typeof dom.getAttribute !== 'function') {
                                    console.log('[编辑器图表修复] 创建新的图表容器');
                                    dom = document.createElement('div');
                                    dom.style.width = '100%';
                                    dom.style.height = '300px';
                                    document.body.appendChild(dom);
            }
                            }
                            
                            // 调用原始init方法
                            return originalInit.call(this, dom, theme, opts);
        } catch (e) {
                            console.error('[编辑器图表修复] 初始化图表失败:', e);
                            
                            // 返回一个模拟的图表对象，避免后续错误
                            return {
                                setOption: function() { console.log('[编辑器图表修复] 模拟setOption调用'); },
                                resize: function() { console.log('[编辑器图表修复] 模拟resize调用'); },
                                dispose: function() { console.log('[编辑器图表修复] 模拟dispose调用'); },
                                getWidth: function() { return 0; },
                                getHeight: function() { return 0; },
                                getDom: function() { return null; },
                                getOption: function() { return {}; },
                                on: function() { return this; },
                                off: function() { return this; }
                            };
                        }
                    };
                    
                    console.log('[编辑器图表修复] 已修复echarts.init方法');
                }
                
                // 执行DOMContentLoaded中的代码
                setTimeout(function() {
                    const scripts = document.querySelectorAll('script:not([src])');
                    scripts.forEach(script => {
                        const content = script.textContent || '';
                        if (content.includes('DOMContentLoaded') && content.includes('echarts.init')) {
                            try {
                                console.log('[编辑器图表修复] 找到DOMContentLoaded中的图表初始化代码');
                                const match = content.match(/DOMContentLoaded[^{]*{([\\s\\S]*?)}\);/);
                                if (match && match[1]) {
                                    new Function(match[1])();
                                    console.log('[编辑器图表修复] 已执行DOMContentLoaded中的代码');
                                }
    } catch (e) {
                                console.error('[编辑器图表修复] 执行图表代码出错:', e);
                            }
                        }
                    });
                }, 500);
            }
        });
    </script>
    ` : '';

    // 构建最终HTML
    if (htmlContent.includes('<html')) {
        // 如果是完整的HTML文档
        finalHtml = htmlContent.replace('</head>', `<style>${cssContent}</style>${chartFixerScript}</head>`);
        finalHtml = finalHtml.replace('</body>', `<script>${jsContent}</script></body>`);
    } else {
        // 如果只是HTML片段
        finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${cssContent}</style>
            ${chartFixerScript}
        </head>
        <body>
            ${htmlContent}
            <script>${jsContent}</script>
        </body>
        </html>`;
    }

    // 更新预览
    const previewDocument = previewFrame.contentDocument || previewFrame.contentWindow.document;
    previewDocument.open();
    previewDocument.write(finalHtml);
    previewDocument.close();

    // 隐藏加载指示器
    previewFrame.onload = function() {
        loadingIndicator.classList.remove('active');
    };
}

function saveContentToLocalStorage() {
    if (!htmlEditor || !cssEditor || !jsEditor) return;
    const currentHTML = htmlEditor.getValue();
    const currentCSS = cssEditor.getValue();
    const currentJS = jsEditor.getValue();

    localStorage.setItem('editorContentHTML', currentHTML);
    localStorage.setItem('editorContentCSS', currentCSS);
    localStorage.setItem('editorContentJS', currentJS);

    if (currentHTML !== DEFAULT_HTML || currentCSS !== DEFAULT_CSS || currentJS !== DEFAULT_JS) {
        localStorage.setItem('userHasActiveEdits', 'true');
    } else {
        // Only set to false if explicitly reset by "Load Example Code"
    }
}

function checkAndPromptToClearDefaults() {
    if (conditionalClearDialogShown || !htmlEditor || !cssEditor || !jsEditor) return;

    const contents = {
        html: htmlEditor.getValue(), css: cssEditor.getValue(), js: jsEditor.getValue()
    };
    const defaults = {
        html: DEFAULT_HTML, css: DEFAULT_CSS, js: DEFAULT_JS
    };
    const editorTypes = [
        { name: 'HTML', current: contents.html, defaultVal: defaults.html, instance: htmlEditor, storageKey: 'editorContentHTML' },
        { name: 'CSS', current: contents.css, defaultVal: defaults.css, instance: cssEditor, storageKey: 'editorContentCSS' },
        { name: 'JavaScript', current: contents.js, defaultVal: defaults.js, instance: jsEditor, storageKey: 'editorContentJS' }
    ];
    
    let modifiedByUserCount = 0;
    let stillDefaultList = [];

    editorTypes.forEach(editor => {
        if (editor.current !== editor.defaultVal) {
            modifiedByUserCount++;
        } else {
            stillDefaultList.push(editor);
        }
    });

    // If at least one editor is modified, and at least one other editor is still default
    if (modifiedByUserCount > 0 && stillDefaultList.length > 0 && stillDefaultList.length < editorTypes.length) {
        conditionalClearDialogShown = true;
        const defaultNames = stillDefaultList.map(e => e.name).join(' 和 ');
        if (confirm(`您的代码已修改。其他编辑器 (${defaultNames}) 仍为示例代码，是否清空它们的内容？`)) {
            stillDefaultList.forEach(editorToClear => {
                editorToClear.instance.setValue("");
                localStorage.setItem(editorToClear.storageKey, "");
            });
            // No direct call to updatePreview/saveContent here, it's handled by the onChange chain
        }
    }
}

function loadExampleCode() {
    if (htmlEditor) htmlEditor.setValue(DEFAULT_HTML);
    if (cssEditor) cssEditor.setValue(DEFAULT_CSS);
    if (jsEditor) jsEditor.setValue(DEFAULT_JS);

    localStorage.setItem('editorContentHTML', DEFAULT_HTML);
    localStorage.setItem('editorContentCSS', DEFAULT_CSS);
    localStorage.setItem('editorContentJS', DEFAULT_JS);
    localStorage.setItem('userHasActiveEdits', 'false');
    conditionalClearDialogShown = false;

    ['html', 'css', 'js'].forEach(type => {
        const section = document.getElementById(`${type}Section`);
        const container = document.getElementById(`${type}-editor-container`);
        const button = section.querySelector('.toggle-btn');
        const icon = button.querySelector('.material-icons');
        const isHtmlEditor = (type === 'html');

        section.classList.toggle('section-collapsed', !isHtmlEditor); // HTML expanded, others collapsed
        container.classList.toggle('collapsed', !isHtmlEditor);
        button.setAttribute('aria-expanded', String(isHtmlEditor));
        if (icon) {
            icon.textContent = isHtmlEditor ? 'expand_less' : 'expand_more';
            if(isHtmlEditor) icon.classList.add('rotate-icon'); else icon.classList.remove('rotate-icon');
        }
        if(window[`${type}Editor`]) window[`${type}Editor`].refresh();
    });
    
    setTimeout(() => {
        setupResizablePanes(true); // Force re-distribution of heights
        updatePreview();
    }, 50);
}

function setupCollapsibleSections() {
    document.querySelectorAll('.toggle-btn').forEach(button => {
        const targetId = button.dataset.target;
        const targetContainer = document.getElementById(targetId);
        const editorSection = document.getElementById(button.dataset.section);
        const iconElement = button.querySelector('.material-icons');

        const updateButtonState = (isColl) => {
            button.setAttribute('aria-expanded', String(!isColl));
            if (iconElement) {
                iconElement.textContent = isColl ? 'expand_more' : 'expand_less';
                if (isColl) iconElement.classList.remove('rotate-icon');
                else iconElement.classList.add('rotate-icon');
            }
        };
        
        let isInitiallyCollapsed = editorSection.classList.contains('collapsed-section');
        // HTML editor is not 'collapsed-section' by default in HTML
        if (button.dataset.editor === "htmlEditor" && !editorSection.classList.contains('section-collapsed')) {
            isInitiallyCollapsed = false;
        }
        
        targetContainer.classList.toggle('collapsed', isInitiallyCollapsed);
        updateButtonState(isInitiallyCollapsed);

        button.addEventListener('click', () => {
            const currentlyCollapsed = targetContainer.classList.toggle('collapsed');
            editorSection.classList.toggle('section-collapsed', currentlyCollapsed);
            updateButtonState(currentlyCollapsed);
            
            if (!currentlyCollapsed) {
                const editorInstanceName = button.dataset.editor;
                if (window[editorInstanceName]) {
                    setTimeout(() => { window[editorInstanceName].refresh(); }, 260);
                }
            }
            setupResizablePanes(true);
        });
    });
    
    // 设置全部折叠/展开按钮
    const toggleAllBtn = document.getElementById('toggleAllSectionsBtn');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', toggleAllSections);
    }
}

// 添加全部折叠/展开功能
function toggleAllSections() {
    const sections = document.querySelectorAll('.editor-section');
    const toggleAllBtn = document.getElementById('toggleAllSectionsBtn');
    const iconElement = toggleAllBtn.querySelector('.material-icons');
    
    // 检查当前状态：如果大多数区域已折叠，则全部展开；否则全部折叠
    const collapsedCount = Array.from(sections).filter(s => s.classList.contains('section-collapsed')).length;
    const shouldExpand = collapsedCount >= sections.length / 2;
    
    // 更新按钮图标
    if (shouldExpand) {
        iconElement.textContent = 'unfold_more';
        toggleAllBtn.setAttribute('title', '展开所有代码区');
    } else {
        iconElement.textContent = 'unfold_less';
        toggleAllBtn.setAttribute('title', '折叠所有代码区');
    }
    
    // 应用到所有区域
    sections.forEach(section => {
        const sectionId = section.id;
        const toggleBtn = section.querySelector('.toggle-btn');
        const targetId = toggleBtn.dataset.target;
        const targetContainer = document.getElementById(targetId);
        const editorName = toggleBtn.dataset.editor;
        
        // 仅当当前状态与目标状态不同时才进行切换
        const isCurrentlyCollapsed = section.classList.contains('section-collapsed');
        if (isCurrentlyCollapsed === shouldExpand) {
            // 更新容器和区域状态
            targetContainer.classList.toggle('collapsed', !shouldExpand);
            section.classList.toggle('section-collapsed', !shouldExpand);
            
            // 更新按钮状态
            const btnIcon = toggleBtn.querySelector('.material-icons');
            btnIcon.textContent = !shouldExpand ? 'expand_more' : 'expand_less';
            if (!shouldExpand) btnIcon.classList.remove('rotate-icon');
            else btnIcon.classList.add('rotate-icon');
            
            // 如果是展开，刷新编辑器
            if (shouldExpand && window[editorName]) {
                setTimeout(() => { window[editorName].refresh(); }, 260);
            }
        }
    });
    
    // 重新调整面板大小
    setupResizablePanes(true);
}

function setupResizablePanes(forceRedistribute = false) {
    const editorPane = document.getElementById('editorPane');
    if (!editorPane) return; // Guard if called before pane is ready

    const sections = Array.from(editorPane.querySelectorAll('.editor-section:not(.splitter-horizontal)'));
    const splitters = Array.from(editorPane.querySelectorAll('.splitter-horizontal'));
    const editorLabelHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--editor-label-height').replace('px', '')) || 48;

    if (forceRedistribute || !editorPane.dataset.heightsInitialized) {
        const editorPaneHeight = editorPane.clientHeight;
        const splitterHeightTotal = splitters.length * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--splitter-height').replace('px', '')) || 6);
        let availableHeightForSections = editorPaneHeight - splitterHeightTotal;
        
        let openSections = [];
        let totalCollapsedHeight = 0;
        sections.forEach(s => {
            if (s.classList.contains('section-collapsed')) {
                totalCollapsedHeight += editorLabelHeight;
                s.style.flexBasis = `${editorLabelHeight}px`;
                s.style.flexGrow = '0';
            } else {
                openSections.push(s);
            }
        });

        const heightForOpenSections = Math.max(0, availableHeightForSections - totalCollapsedHeight);
        
        if (openSections.length > 0) {
            // Assign initial flex-basis more proportionally for open sections
            const htmlSection = openSections.find(s => s.id === 'htmlSection');
            const otherOpenSections = openSections.filter(s => s.id !== 'htmlSection');

            if (htmlSection && openSections.length === 1) { // Only HTML open
                htmlSection.style.flexBasis = `${Math.max(editorLabelHeight + 50, heightForOpenSections)}px`;
                htmlSection.style.flexGrow = '1';
            } else if (htmlSection) { // HTML and others open
                // Give HTML ~60% of available space, others share the rest
                const htmlBasis = Math.max(editorLabelHeight + 50, heightForOpenSections * 0.6);
                htmlSection.style.flexBasis = `${htmlBasis}px`;
                htmlSection.style.flexGrow = '2'; // Give it more grow potential too

                const remainingHeightForOthers = heightForOpenSections - htmlBasis;
                if (otherOpenSections.length > 0) {
                    const heightPerOther = Math.max(editorLabelHeight + 50, remainingHeightForOthers / otherOpenSections.length);
                    otherOpenSections.forEach(s => {
                        s.style.flexBasis = `${heightPerOther}px`;
                        s.style.flexGrow = '1';
                    });
                }
            } else { // HTML is collapsed, other sections share equally
                const heightPerOther = Math.max(editorLabelHeight + 50, heightForOpenSections / openSections.length);
                otherOpenSections.forEach(s => {
                    s.style.flexBasis = `${heightPerOther}px`;
                    s.style.flexGrow = '1';
                });
            }
        }
        editorPane.dataset.heightsInitialized = 'true';

        setTimeout(() => {
            sections.forEach(s => {
                if (!s.classList.contains('section-collapsed')) {
                    const editorInstance = window[s.querySelector('.toggle-btn').dataset.editor];
                    if (editorInstance) editorInstance.refresh();
                }
            });
        }, 150);
    }

    splitters.forEach((splitter) => {
        // Enhanced listener management: store and remove specific function
        const splitterDragHandlerKey = `_splitterDragHandler_${splitter.id}`;
        if (splitter[splitterDragHandlerKey]) { // Remove old listener if any
            splitter.removeEventListener('mousedown', splitter[splitterDragHandlerKey]);
        }

        const mousedownHandler = (e) => {
            e.preventDefault();
            const prevSection = splitter.previousElementSibling;
            const nextSection = splitter.nextElementSibling;
            if (!prevSection || !nextSection || !prevSection.classList.contains('editor-section') || !nextSection.classList.contains('editor-section')) return;

            const prevSectionInitialHeight = prevSection.offsetHeight;
            const nextSectionInitialHeight = nextSection.offsetHeight;
            const startY = e.clientY;

            const onMouseMove = (moveEvent) => {
                moveEvent.preventDefault();
                const deltaY = moveEvent.clientY - startY;
                let newPrevHeight = prevSectionInitialHeight + deltaY;
                let newNextHeight = nextSectionInitialHeight - deltaY;

                const minPrev = prevSection.classList.contains('section-collapsed') ? editorLabelHeight : editorLabelHeight + 30;
                const minNext = nextSection.classList.contains('section-collapsed') ? editorLabelHeight : editorLabelHeight + 30;

                if (newPrevHeight < minPrev) {
                    newPrevHeight = minPrev;
                    newNextHeight = (prevSectionInitialHeight + nextSectionInitialHeight) - newPrevHeight;
                }
                if (newNextHeight < minNext) {
                    newNextHeight = minNext;
                    newPrevHeight = (prevSectionInitialHeight + nextSectionInitialHeight) - newNextHeight;
                }
                if (newPrevHeight < minPrev) newPrevHeight = minPrev;
                if (newNextHeight < minNext) newNextHeight = minNext;

                prevSection.style.flexBasis = `${newPrevHeight}px`; prevSection.style.flexGrow = '0';
                nextSection.style.flexBasis = `${newNextHeight}px`; nextSection.style.flexGrow = '0';

                const prevEditorName = prevSection.querySelector('.toggle-btn').dataset.editor;
                const nextEditorName = nextSection.querySelector('.toggle-btn').dataset.editor;
                if (window[prevEditorName] && !prevSection.classList.contains('section-collapsed')) window[prevEditorName].refresh();
                if (window[nextEditorName] && !nextSection.classList.contains('section-collapsed')) window[nextEditorName].refresh();
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                sections.forEach(s => { // Restore grow factor
                    if (!s.classList.contains('section-collapsed')) {
                        s.style.flexGrow = (s.id === 'htmlSection' && sections.filter(sec => !sec.classList.contains('section-collapsed')).length <=2) ? '2': '1';
                    } else { s.style.flexGrow = '0'; }
                });
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        splitter.addEventListener('mousedown', mousedownHandler);
        splitter[splitterDragHandlerKey] = mousedownHandler; // Store for potential removal
    });
}

// --- Download Functions ---
function downloadCode(type) {
    let content, filename, mimeType;
    const editors = { html: htmlEditor, css: cssEditor, js: jsEditor };
    const editorInstance = editors[type];
    content = editorInstance ? editorInstance.getValue() : (type === 'html' ? DEFAULT_HTML : (type === 'css' ? DEFAULT_CSS : DEFAULT_JS));
    switch (type) {
        case 'html': filename = 'index.html'; mimeType = 'text/html'; break;
        case 'css': filename = 'style.css'; mimeType = 'text/css'; break;
        case 'js': filename = 'script.js'; mimeType = 'application/javascript'; break;
        default: return;
    }
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
function downloadAllCode() {
    if (typeof JSZip === 'undefined') { alert('JSZip library not loaded.'); return; }
    const zip = new JSZip();
    zip.file("index.html", htmlEditor ? htmlEditor.getValue() : DEFAULT_HTML);
    zip.file("style.css", cssEditor ? cssEditor.getValue() : DEFAULT_CSS);
    zip.file("script.js", jsEditor ? jsEditor.getValue() : DEFAULT_JS);
    zip.generateAsync({ type: "blob" }).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'code_project.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });
}

// --- Scaled Image Download Modal Functions ---
function openScalePreviewModal() {
    currentModalScale = parseFloat(modalPreviewScaleRange.value) || 2;
    updateScaleOutput(currentModalScale);
    modalPreviewScaleRange.value = currentModalScale;
    scalePreviewModal.style.display = 'flex';
    setTimeout(() => { scalePreviewModal.classList.add('active'); }, 10);
    renderModalPreview(currentModalScale);
}
function closeScalePreviewModal() {
    scalePreviewModal.classList.remove('active');
    setTimeout(() => {
        scalePreviewModal.style.display = 'none';
        const ctx = modalCanvasPreview.getContext('2d');
        ctx.clearRect(0, 0, modalCanvasPreview.width, modalCanvasPreview.height);
        modalCanvasPreview.width = 10; modalCanvasPreview.height = 10;
        if(loadingIndicator) loadingIndicator.style.display = 'none';
        if(currentPreviewSizeSpan) currentPreviewSizeSpan.textContent = "---";
        if(downloadImageSizeSpan) downloadImageSizeSpan.textContent = "---";
        fullResolutionCapturedCanvas = null;
    }, 250);
}
function updateScaleOutput(value) {
    currentModalScale = parseFloat(value);
    if (modalScaleOutput) modalScaleOutput.textContent = parseFloat(value).toFixed(1);
    const previewDocElement = previewFrame.contentWindow.document.documentElement;
    if (previewDocElement) {
        const baseWidth = previewDocElement.scrollWidth;
        const baseHeight = previewDocElement.scrollHeight;
        if(downloadImageSizeSpan) downloadImageSizeSpan.textContent = `${Math.round(baseWidth * currentModalScale)}px × ${Math.round(baseHeight * currentModalScale)}px`;
    } else if(downloadImageSizeSpan) {
        downloadImageSizeSpan.textContent = `(按 ${currentModalScale.toFixed(1)}x 比例计算)`;
    }
}
const debouncedRenderModalPreview = debounce(renderModalPreview, 400);
if(modalPreviewScaleRange) { // Add event listeners only if element exists
    modalPreviewScaleRange.addEventListener('input', (event) => {
        updateScaleOutput(event.target.value);
    });
    modalPreviewScaleRange.addEventListener('change', (event) => {
        debouncedRenderModalPreview(event.target.value);
    });
}
if(transparentBgCheckbox) { // Add event listener for checkbox
    transparentBgCheckbox.addEventListener('change', () => {
        if(modalPreviewScaleRange) renderModalPreview(modalPreviewScaleRange.value);
    });
}


async function renderModalPreview(scaleValue) {
    const scale = parseFloat(scaleValue) || 1;
    const previewContentDoc = previewFrame.contentWindow.document;
    const useTransparentBackground = transparentBgCheckbox && transparentBgCheckbox.checked;

    if (!previewContentDoc || !previewContentDoc.documentElement || typeof html2canvas === 'undefined') {
        alert('预览内容无法访问或html2canvas库未加载。');
        if(loadingIndicator) loadingIndicator.style.display = 'none'; return;
    }
    if(loadingIndicator) loadingIndicator.style.display = 'block';
    if(modalCanvasPreview) modalCanvasPreview.style.display = 'none';
    try {
        const scrollX = previewContentDoc.defaultView.pageXOffset;
        const scrollY = previewContentDoc.defaultView.pageYOffset;
        const html2canvasOptions = {
            allowTaint: true, useCORS: true, logging: false,
            scale: scale,
            width: previewContentDoc.documentElement.scrollWidth,
            height: previewContentDoc.documentElement.scrollHeight,
            windowWidth: previewContentDoc.documentElement.scrollWidth,
            windowHeight: previewContentDoc.documentElement.scrollHeight,
            x: scrollX, y: scrollY,
            backgroundColor: useTransparentBackground ? null : "#ffffff"
        };
        const capturedCanvas = await html2canvas(previewContentDoc.documentElement, html2canvasOptions);
        fullResolutionCapturedCanvas = capturedCanvas;
        const modalCtx = modalCanvasPreview.getContext('2d');
        const previewArea = document.querySelector('.modal-preview-area');
        if (!previewArea) { if(loadingIndicator) loadingIndicator.style.display = 'none'; return; }
        const previewAreaWidth = previewArea.clientWidth - 2;
        const previewAreaHeight = previewArea.clientHeight - 2;
        const aspectRatio = capturedCanvas.width / capturedCanvas.height;
        let displayWidth = previewAreaWidth;
        let displayHeight = displayWidth / aspectRatio;
        if (displayHeight > previewAreaHeight && previewAreaHeight > 0) {
            displayHeight = previewAreaHeight; displayWidth = displayHeight * aspectRatio;
        }
        if (displayWidth > previewAreaWidth && previewAreaWidth > 0) {
            displayWidth = previewAreaWidth; displayHeight = displayWidth / aspectRatio;
        }
        modalCanvasPreview.width = Math.max(1, displayWidth);
        modalCanvasPreview.height = Math.max(1, displayHeight);
        modalCtx.clearRect(0, 0, modalCanvasPreview.width, modalCanvasPreview.height);
        modalCtx.drawImage(capturedCanvas, 0, 0, modalCanvasPreview.width, modalCanvasPreview.height);
        if(modalCanvasPreview) modalCanvasPreview.style.display = 'block';
        if(currentPreviewSizeSpan) currentPreviewSizeSpan.textContent = `${Math.round(displayWidth)}px × ${Math.round(displayHeight)}px`;
        if(downloadImageSizeSpan) downloadImageSizeSpan.textContent = `${capturedCanvas.width}px × ${capturedCanvas.height}px (按 ${scale.toFixed(1)}x)`;
    } catch (error) {
        console.error('Error rendering modal preview:', error);
        alert('生成预览图失败，请查看控制台。');
        if(currentPreviewSizeSpan) currentPreviewSizeSpan.textContent = "错误";
        if(downloadImageSizeSpan) downloadImageSizeSpan.textContent = "错误";
    } finally {
        if(loadingIndicator) loadingIndicator.style.display = 'none';
    }
}
function downloadScaledImageFromModal() {
    if (fullResolutionCapturedCanvas) {
        const link = document.createElement('a');
        link.download = `preview_scaled_${currentModalScale.toFixed(1)}x${transparentBgCheckbox.checked ? '_transparent' : ''}.png`;
        link.href = fullResolutionCapturedCanvas.toDataURL('image/png');
        link.click();
        closeScalePreviewModal();
    } else {
        alert('没有可供下载的预览图。请先在对话框中调整比例并等待预览生成。');
    }
}

// --- Beautify Functions ---
function beautifyHTML() { if (typeof html_beautify !== 'undefined' && htmlEditor) { htmlEditor.setValue(html_beautify(htmlEditor.getValue(), { indent_size: 2, space_in_empty_paren: true, wrap_line_length: 0 })); } else { alert('HTML美化库或编辑器未加载！'); }}
function beautifyCSS() { if (typeof css_beautify !== 'undefined' && cssEditor) { cssEditor.setValue(css_beautify(cssEditor.getValue(), { indent_size: 2 })); } else { alert('CSS美化库或编辑器未加载！'); }}
function beautifyJS() { if (typeof js_beautify !== 'undefined' && jsEditor) { jsEditor.setValue(js_beautify(jsEditor.getValue(), { indent_size: 2, space_in_empty_paren: true })); } else { alert('JavaScript美化库或编辑器未加载！'); }}

function loadLayoutPreferences() {
    const savedLayout = localStorage.getItem('layoutPreferences');
    if (savedLayout) {
        try {
            const parsed = JSON.parse(savedLayout);
            layoutPreferences = {
                ...layoutPreferences, // Default values
                ...parsed // Override with saved values
            };
        } catch (e) {
            console.error('Error parsing saved layout preferences:', e);
        }
    }
}

function saveLayoutPreferences() {
    localStorage.setItem('layoutPreferences', JSON.stringify(layoutPreferences));
}

function applyLayoutPreferences() {
    const container = document.querySelector('.container');
    const editorPane = document.getElementById('editorPane');
    const previewPane = document.getElementById('previewPane');
    
    // 不在移动视图下应用
    if (window.innerWidth <= 900) return;
    
    // 应用折叠状态 - 只应用到编辑区
    if (layoutPreferences.editorCollapsed) {
        editorPane.classList.add('collapsed');
        
        // 更新按钮图标
        const toggleBtn = editorPane.querySelector('.toggle-pane-btn');
        if (toggleBtn) {
            const iconElement = toggleBtn.querySelector('.material-icons');
            if (iconElement) {
                iconElement.textContent = 'chevron_right';
            }
        }
        
        // 预览区占据剩余空间
        previewPane.style.width = `calc(100% - var(--pane-collapsed-width))`;
    } else {
        editorPane.classList.remove('collapsed');
        
        // 更新按钮图标
        const toggleBtn = editorPane.querySelector('.toggle-pane-btn');
        if (toggleBtn) {
            const iconElement = toggleBtn.querySelector('.material-icons');
            if (iconElement) {
                iconElement.textContent = 'chevron_left';
            }
        }
        
        // 应用宽度
        editorPane.style.width = `${layoutPreferences.editorWidth}%`;
        previewPane.style.width = `${layoutPreferences.previewWidth}%`;
    }
    
    // 刷新编辑器
    setTimeout(() => {
        if (htmlEditor) htmlEditor.refresh();
        if (cssEditor) cssEditor.refresh();
        if (jsEditor) jsEditor.refresh();
    }, 300);
}

function setupPaneToggleButtons() {
    document.querySelectorAll('.toggle-pane-btn').forEach(button => {
        const targetId = button.dataset.target;
        const targetPane = document.getElementById(targetId);
        
        if (!targetPane) return;
        
        button.addEventListener('click', () => {
            const isEditor = targetId === 'editorPane';
            // 只有编辑区可以折叠
            if (isEditor) {
                // 检查当前状态
                const isCurrentlyCollapsed = targetPane.classList.contains('collapsed');
                
                // 如果已经折叠，则展开
                if (isCurrentlyCollapsed) {
                    targetPane.classList.remove('collapsed');
                    layoutPreferences.editorCollapsed = false;
                    
                    // 恢复之前的宽度
                    targetPane.style.width = `${layoutPreferences.editorWidth}%`;
                    document.getElementById('previewPane').style.width = `${layoutPreferences.previewWidth}%`;
                    
                    // 更新按钮图标
                    const iconElement = button.querySelector('.material-icons');
                    iconElement.textContent = 'chevron_left';
                } 
                // 如果展开，则折叠
                else {
                    targetPane.classList.add('collapsed');
                    layoutPreferences.editorCollapsed = true;
                    
                    // 预览区占据剩余空间
                    document.getElementById('previewPane').style.width = `calc(100% - var(--pane-collapsed-width))`;
                    
                    // 更新按钮图标
                    const iconElement = button.querySelector('.material-icons');
                    iconElement.textContent = 'chevron_right';
                }
                
                // 保存布局偏好
                saveLayoutPreferences();
                
                // 刷新编辑器
                setTimeout(() => {
                    if (htmlEditor) htmlEditor.refresh();
                    if (cssEditor) cssEditor.refresh();
                    if (jsEditor) jsEditor.refresh();
                }, 300);
            }
        });
    });
}

function setupVerticalSplitter() {
    const splitter = document.getElementById('verticalSplitter');
    if (!splitter) return;
    
    const container = document.querySelector('.container');
    const editorPane = document.getElementById('editorPane');
    const previewPane = document.getElementById('previewPane');
    
    // 添加拖动指示样式
    splitter.addEventListener('mousedown', (e) => {
        e.preventDefault();
        
        // Skip if either pane is collapsed
        if (editorPane.classList.contains('collapsed') || previewPane.classList.contains('collapsed')) {
            return;
        }
        
        // 设置拖动状态
        isDragging = true;
        document.body.classList.add('resizing');
        splitter.classList.add('active');
        
        const startX = e.clientX;
        const containerWidth = container.offsetWidth;
        const initialEditorWidth = editorPane.offsetWidth;
        const initialPreviewWidth = previewPane.offsetWidth;
        
        // 创建性能优化的移动处理函数
        const onMouseMove = (moveEvent) => {
            if (!isDragging) return;
            moveEvent.preventDefault();
            
            // 使用requestAnimationFrame和时间节流来优化渲染
            const now = Date.now();
            if (now - lastRenderTime < RENDER_THROTTLE) return;
            lastRenderTime = now;
            
            requestAnimationFrame(() => {
                if (!isDragging) return;
                
                const deltaX = moveEvent.clientX - startX;
                const newEditorWidth = Math.max(200, initialEditorWidth + deltaX);
                const newPreviewWidth = Math.max(200, containerWidth - newEditorWidth - splitter.offsetWidth);
                
                // Calculate percentages
                const editorPercent = (newEditorWidth / containerWidth) * 100;
                const previewPercent = (newPreviewWidth / containerWidth) * 100;
                
                // Don't allow either pane to get too small (less than 15%)
                if (editorPercent < 15 || previewPercent < 15) return;
                
                // 使用transform而不是直接修改width以提高性能
                editorPane.style.width = `${editorPercent}%`;
                previewPane.style.width = `${previewPercent}%`;
                
                // 存储当前宽度比例
                layoutPreferences.editorWidth = editorPercent;
                layoutPreferences.previewWidth = previewPercent;
            });
        };
        
        const onMouseUp = () => {
            // 清除拖动状态
            isDragging = false;
            document.body.classList.remove('resizing');
            splitter.classList.remove('active');
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // 拖动结束后刷新编辑器
            if (htmlEditor) htmlEditor.refresh();
            if (cssEditor && !document.getElementById('css-editor-container').classList.contains('collapsed')) {
                cssEditor.refresh();
            }
            if (jsEditor && !document.getElementById('js-editor-container').classList.contains('collapsed')) {
                jsEditor.refresh();
            }
            
            // Save preferences
            saveLayoutPreferences();
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    
    // 添加触摸支持
    splitter.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        
        // Skip if either pane is collapsed
        if (editorPane.classList.contains('collapsed') || previewPane.classList.contains('collapsed')) {
            return;
        }
        
        // 设置拖动状态
        isDragging = true;
        document.body.classList.add('resizing');
        splitter.classList.add('active');
        
        const touch = e.touches[0];
        const startX = touch.clientX;
        const containerWidth = container.offsetWidth;
        const initialEditorWidth = editorPane.offsetWidth;
        const initialPreviewWidth = previewPane.offsetWidth;
        
        const onTouchMove = (moveEvent) => {
            if (!isDragging || moveEvent.touches.length !== 1) return;
            
            // 使用requestAnimationFrame和时间节流来优化渲染
            const now = Date.now();
            if (now - lastRenderTime < RENDER_THROTTLE) return;
            lastRenderTime = now;
            
            requestAnimationFrame(() => {
                if (!isDragging) return;
                
                const touch = moveEvent.touches[0];
                const deltaX = touch.clientX - startX;
                const newEditorWidth = Math.max(200, initialEditorWidth + deltaX);
                const newPreviewWidth = Math.max(200, containerWidth - newEditorWidth - splitter.offsetWidth);
                
                // Calculate percentages
                const editorPercent = (newEditorWidth / containerWidth) * 100;
                const previewPercent = (newPreviewWidth / containerWidth) * 100;
                
                // Don't allow either pane to get too small (less than 15%)
                if (editorPercent < 15 || previewPercent < 15) return;
                
                // 使用transform而不是直接修改width以提高性能
                editorPane.style.width = `${editorPercent}%`;
                previewPane.style.width = `${previewPercent}%`;
                
                // 存储当前宽度比例
                layoutPreferences.editorWidth = editorPercent;
                layoutPreferences.previewWidth = previewPercent;
            });
        };
        
        const onTouchEnd = () => {
            // 清除拖动状态
            isDragging = false;
            document.body.classList.remove('resizing');
            splitter.classList.remove('active');
            
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            
            // 拖动结束后刷新编辑器
            if (htmlEditor) htmlEditor.refresh();
            if (cssEditor && !document.getElementById('css-editor-container').classList.contains('collapsed')) {
                cssEditor.refresh();
            }
            if (jsEditor && !document.getElementById('js-editor-container').classList.contains('collapsed')) {
                jsEditor.refresh();
            }
            
            // Save preferences
            saveLayoutPreferences();
        };
        
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    });
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    conditionalClearDialogShown = false;
    initializeEditors();
    updatePreview();
    if (modalScaleOutput && modalPreviewScaleRange) {
        updateScaleOutput(modalPreviewScaleRange.value);
    }
    
    // Handle window resize events
    window.addEventListener('resize', debounce(() => {
        // Refresh editors after resize
        if (htmlEditor) htmlEditor.refresh();
        if (cssEditor) cssEditor.refresh();
        if (jsEditor) jsEditor.refresh();
        
        // Reapply layout preferences if needed
        if (window.innerWidth > 900) {
            applyLayoutPreferences();
        }
    }, 250));
});