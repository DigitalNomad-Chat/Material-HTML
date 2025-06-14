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
    <title>示例页面</title>
    <style>
        body { 
            font-family: 'Roboto', sans-serif; 
            margin: 20px; 
            background-color: #f4f7f9; 
            color: #333;
            line-height: 1.6;
        }
        h1 { color: #1A73E8; /* Google Blue */ }
        p { margin-bottom: 10px; }
        button {
            padding: 8px 15px;
            background-color: #1A73E8; /* Google Blue */
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            box-shadow: 0 2px 2px 0 rgba(0,0,0,0.14), 0 3px 1px -2px rgba(0,0,0,0.12), 0 1px 5px 0 rgba(0,0,0,0.20);
            transition: box-shadow 0.2s ease, background-color 0.2s ease;
        }
        button:hover {
            background-color: #1256a8; /* Darker Google Blue */
            box-shadow: 0 4px 5px 0 rgba(0,0,0,0.14), 0 1px 10px 0 rgba(0,0,0,0.12), 0 2px 4px -1px rgba(0,0,0,0.20);
        }
    </style>
</head>
<body>
    <h1>欢迎来到 Material 编辑器!</h1>
    <p>这是一个 AI+编程 实践项目，网站代码完全由AI生成</p>
    <p>市面上同类产品没一个符合自己需求的，于是干脆用AI手搓一个！</p>
    <p>在这里编写您的HTML, CSS, 和 JavaScript 代码。</p>
    <p>预览会自动更新。 CSS 和 JS 编辑器默认折叠，点击可展开。</p>
    <p>您可以下载按不同比例下载预览图，确保导出的图片高清质量。</p>
    <p>更多 AI 实践项目请关注 <a href="https://www.prowork.top" target="_blank">职场人的高效办公神器 www.prowork.top</a></p>
    <button onclick="showMessage()">点击测试JS</button>

    <script>
        function showMessage() {
            alert('JavaScript 运行成功!');
        }
        console.log("示例 JS 已加载");
    <\/script>
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

    if (htmlContent.trim().toLowerCase().includes("<html")) {
        try {
            let tempDoc = new DOMParser().parseFromString(htmlContent, "text/html");
            let head = tempDoc.querySelector('head');
            let body = tempDoc.querySelector('body');

            // 检测是否包含图表相关代码
            const hasChartCode = 
                htmlContent.includes('echarts') || 
                htmlContent.includes('chart') || 
                htmlContent.includes('Chart') ||
                htmlContent.includes('highcharts') ||
                htmlContent.includes('plotly') ||
                htmlContent.includes('d3') ||
                htmlContent.includes('canvas');
            
            // 检查脚本链接
            const scriptLinks = tempDoc.querySelectorAll('script[src]');
            const hasChartLibLink = Array.from(scriptLinks).some(script => {
                const src = script.getAttribute('src') || '';
                return src.includes('echarts') || 
                      src.includes('chart') || 
                      src.includes('highcharts') || 
                      src.includes('plotly') ||
                      src.includes('d3');
            });
            
            // 注入图表修复脚本，确保图表能正确加载
            // 读取和注入chart-fixer.js文件内容
            const scriptFixerTag = tempDoc.createElement('script');
            scriptFixerTag.setAttribute('data-editor-injected', 'true');
            scriptFixerTag.appendChild(tempDoc.createTextNode(`
                    // 智能图表修复脚本
                    (function() {
                        // 全局图表修复配置
                        window.__ECHARTS_FIX__ = {
                            instances: {},
                            pendingCharts: [],
                            cdnSources: [
                                'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js',
                                'https://cdn.staticfile.org/echarts/5.4.3/echarts.min.js',
                                'https://cdn.bootcdn.net/ajax/libs/echarts/5.4.3/echarts.min.js',
                                'https://lf9-cdn-tos.bytecdntp.com/cdn/expire-1-M/echarts/5.4.3/echarts.min.js',
                                'https://unpkg.zhimg.com/echarts@5.4.3/dist/echarts.min.js'
                            ],
                            debug: true
                        };
                        
                        // 日志函数
                        function log(message, type = 'log') {
                            if (window.__ECHARTS_FIX__.debug) {
                                console[type]('[ECharts修复] ' + message);
                            }
                        }
                        
                        // 监听DOM变动以检测图表容器
                        function setupObserver() {
                            const observer = new MutationObserver(function(mutations) {
                                for (let mutation of mutations) {
                                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                                        // 检查新添加的节点是否包含图表容器
                                        for (let node of mutation.addedNodes) {
                                            if (node.nodeType === 1) { // 元素节点
                                                checkForChartElements(node);
                                            }
                                        }
                                    }
                                }
                            });
                            
                            // 开始观察整个文档
                            observer.observe(document.documentElement, {
                                childList: true,
                                subtree: true
                            });
                            
                            log('DOM观察器已启动');
                        }
                        
                        // 检测页面中的潜在图表元素
                        function checkForChartElements(rootElement = document) {
                            // 查找可能的图表容器
                            const chartElements = rootElement.querySelectorAll('[id*="chart"], [id*="Chart"], [class*="chart"], [class*="Chart"]');
                            
                            if (chartElements.length > 0) {
                                log('发现' + chartElements.length + '个潜在图表容器');
                                
                                // 为每个容器添加加载状态
                                chartElements.forEach(function(element) {
                                    prepareChartContainer(element);
                                });
                            }
                        }
                        
                        // 为图表容器准备加载状态
                        function prepareChartContainer(container) {
                            // 如果已经处理过，跳过
                            if (container.__chart_prepared) return;
                            
                            // 标记为已处理
                            container.__chart_prepared = true;
                            
                            // 设置相对定位，以便放置加载指示器
                            const style = window.getComputedStyle(container);
                            if (style.position === 'static') {
                                container.style.position = 'relative';
                            }
                            
                            // 创建加载指示器
                            const loader = document.createElement('div');
                            loader.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;';
                            
                            // 创建旋转动画元素
                            const spinner = document.createElement('div');
                            spinner.style.cssText = 'width:40px;height:40px;border:3px solid rgba(9,109,217,0.2);border-top-color:#096dd9;border-radius:50%;margin-bottom:10px;animation:chart-spinner 1s linear infinite;';
                            
                            // 添加动画样式
                            if (!document.getElementById('chart-spinner-style')) {
                                const styleEl = document.createElement('style');
                                styleEl.id = 'chart-spinner-style';
                                styleEl.textContent = '@keyframes chart-spinner { to { transform: rotate(360deg); } }';
                                document.head.appendChild(styleEl);
                            }
                            
                            // 创建加载文本
                            const text = document.createElement('div');
                            text.textContent = '图表加载中...';
                            text.style.cssText = 'color:#096dd9;font-size:14px;font-weight:bold;';
                            
                            // 组装加载指示器
                            loader.appendChild(spinner);
                            loader.appendChild(text);
                            container.appendChild(loader);
                            
                            // 保存加载指示器引用
                            container.loadingIndicator = loader;
                            
                            log('已为容器 ' + (container.id || '(无ID)') + ' 添加加载状态');
                            
                            // 将此容器添加到待处理列表
                            window.__ECHARTS_FIX__.pendingCharts.push({
                                container: container,
                                processed: false
                            });
                            
                            // 尝试初始化图表
                            tryInitializeChart();
                        }
                        
                        // 检查ECharts是否已加载
                        function isEChartsLoaded() {
                            return typeof window.echarts !== 'undefined';
                        }
                        
                        // 尝试从可选CDN加载ECharts
                        function loadEChartsFromCDN() {
                            if (isEChartsLoaded()) {
                                log('ECharts已加载，无需再次加载');
                                return Promise.resolve();
                            }
                            
                            log('开始从CDN加载ECharts');
                            
                            return new Promise((resolve, reject) => {
                                let currentSourceIndex = 0;
                                const cdnSources = window.__ECHARTS_FIX__.cdnSources;
                                
                                function tryNextSource() {
                                    if (currentSourceIndex >= cdnSources.length) {
                                        log('所有CDN源均加载失败', 'error');
                                        reject(new Error('所有CDN源均加载失败'));
                                        return;
                                    }
                                    
                                    const script = document.createElement('script');
                                    script.src = cdnSources[currentSourceIndex];
                                    log('尝试从 ' + cdnSources[currentSourceIndex] + ' 加载');
                                    
                                    script.onload = function() {
                                        log('成功从 ' + cdnSources[currentSourceIndex] + ' 加载ECharts');
                                        resolve();
                                    };
                                    
                                    script.onerror = function() {
                                        log('从 ' + cdnSources[currentSourceIndex] + ' 加载失败，尝试下一个源', 'warn');
                                        currentSourceIndex++;
                                        setTimeout(tryNextSource, 100);
                                    };
                                    
                                    document.head.appendChild(script);
                                }
                                
                                tryNextSource();
                            });
                        }
                        
                        // 尝试初始化图表
                        function tryInitializeChart() {
                            // 检查是否有待处理的图表
                            const pendingCharts = window.__ECHARTS_FIX__.pendingCharts.filter(item => !item.processed);
                            
                            if (pendingCharts.length === 0) {
                                log('没有待处理的图表');
                                return;
                            }
                            
                            log('有 ' + pendingCharts.length + ' 个图表等待处理');
                            
                            // 检查ECharts是否已加载
                            if (!isEChartsLoaded()) {
                                log('ECharts尚未加载，开始加载...');
                                loadEChartsFromCDN().then(() => {
                                    // ECharts加载成功，延迟处理图表
                                    setTimeout(processChartsAfterLoad, 500);
                                }).catch(err => {
                                    // 显示错误信息
                                    pendingCharts.forEach(item => {
                                        showChartError(item.container, '无法加载ECharts库，请检查网络连接');
                                    });
                                });
                            } else {
                                // ECharts已加载，直接处理图表
                                log('ECharts已加载，开始处理图表');
                                processChartsAfterLoad();
                            }
                        }
                        
                        // ECharts加载完成后处理图表
                        function processChartsAfterLoad() {
                            if (!isEChartsLoaded()) {
                                log('ECharts仍未加载，无法处理图表', 'error');
                                return;
                            }
                            
                            log('开始处理待渲染图表');
                            
                            // 处理所有待处理图表
                            window.__ECHARTS_FIX__.pendingCharts.forEach(item => {
                                if (item.processed) return;
                                
                                const container = item.container;
                                
                                try {
                                    log('处理图表容器: ' + (container.id || '(无ID)'));
                                    
                                    // 检查是否已有ECharts实例
                                    if(container._echarts_instance_ || 
                                        (window.echarts && window.echarts.getInstanceByDom && window.echarts.getInstanceByDom(container))) {
                                        log('容器已有ECharts实例，跳过初始化');
                                        
                                        // 隐藏加载指示器
                                        if (container.loadingIndicator) {
                                            container.loadingIndicator.style.display = 'none';
                                        }
                                        
                                        item.processed = true;
                                        return;
                                    }
                                    
                                    // 查找页面中可能存在的配置代码
                                    extractAndApplyChartConfig(container);
                                    
                                    // 标记为已处理
                                    item.processed = true;
                                } catch (error) {
                                    log('处理图表失败: ' + error.message, 'error');
                                    showChartError(container, error.message);
                                }
                            });
                        }
                        
                        // 从页面脚本中提取并应用图表配置
                        function extractAndApplyChartConfig(container) {
                            // 初始化图表
                            log('为容器 ' + (container.id || '(无ID)') + ' 初始化ECharts实例');
                            
                            try {
                                const chart = echarts.init(container);
                                
                                // 保存实例引用
                                window.__ECHARTS_FIX__.instances[container.id || ('chart_' + Math.random().toString(36).substr(2, 9))] = chart;
                                
                                // 查找相关的配置代码
                                const scripts = document.querySelectorAll('script:not([src])');
                                let configFound = false;
                                
                                for (let script of scripts) {
                                    // 尝试找到与该容器相关的脚本
                                    if (container.id && script.textContent.includes(container.id)) {
                                        log('找到可能包含容器 ' + container.id + ' 配置的脚本');
                                        
                                        // 尝试提取option配置
                                        try {
                                            // 使用多种正则表达式模式匹配不同的声明方式
                                            let optionMatch = script.textContent.match(/(?:const|let|var)?\s*option\s*=\s*({[\s\S]*?});(?:[\s\S]*?myChart\.setOption)/);
                                            
                                            if (!optionMatch) {
                                                optionMatch = script.textContent.match(/({[\s\S]*?tooltip[\s\S]*?series[\s\S]*?})(?:[\s\S]*?\.setOption)/);
                                            }
                                            
                                            if (optionMatch && optionMatch[1]) {
                                                log('提取到配置对象');
                                                
                                                // 安全地求值提取的配置
                                                try {
                                                    const optionCode = optionMatch[1];
                                                    const configFn = new Function('try { const option = ' + optionCode + '; return option; } catch(e) { console.error("配置解析错误:", e); return null; }');
                                                    
                                                    const config = configFn();
                                                    
                                                    if (config && typeof config === 'object') {
                                                        log('成功解析配置，应用到图表');
                                                        chart.setOption(config);
                                                        configFound = true;
                                                        
                                                        // 隐藏加载指示器
                                                        if (container.loadingIndicator) {
                                                            container.loadingIndicator.style.display = 'none';
                                                        }
                                                    }
                                                } catch (evalError) {
                                                    log('配置求值错误: ' + evalError.message, 'error');
                                                }
                                            }
                                        } catch (extractError) {
                                            log('提取配置失败: ' + extractError.message, 'error');
                                        }
                                    }
                                }
                                
                                // 如果没有找到配置，应用一个默认图表
                                if (!configFound) {
                                    log('未找到配置，应用默认饼图配置');
                                    
                                    // 基本的饼图配置
                                    chart.setOption({
                                        tooltip: {
                                            trigger: 'item',
                                            formatter: '{a} <br/>{b}: {c} ({d}%)'
                                        },
                                        legend: {
                                            orient: 'horizontal',
                                            bottom: 10,
                                            data: ['数据项1', '数据项2', '数据项3']
                                        },
                                        series: [
                                            {
                                                name: '示例数据',
                                                type: 'pie',
                                                radius: ['40%', '70%'],
                                                center: ['50%', '50%'],
                                                avoidLabelOverlap: false,
                                                itemStyle: {
                                                    borderRadius: 10,
                                                    borderColor: '#fff',
                                                    borderWidth: 2
                                                },
                                                data: [
                                                    {value: 40, name: '数据项1', itemStyle: {color: '#5470c6'}},
                                                    {value: 30, name: '数据项2', itemStyle: {color: '#91cc75'}},
                                                    {value: 30, name: '数据项3', itemStyle: {color: '#fac858'}}
                                                ]
                                            }
                                        ]
                                    });
                                    
                                    // 隐藏加载指示器
                                    if (container.loadingIndicator) {
                                        container.loadingIndicator.style.display = 'none';
                                    }
                                }
                                
                                // 适应容器大小变化
                                window.addEventListener('resize', function() {
                                    chart.resize();
                                });
                                
                            } catch (initError) {
                                log('初始化图表失败: ' + initError.message, 'error');
                                showChartError(container, '图表初始化失败: ' + initError.message);
                            }
                        }
                        
                        // 显示图表错误信息
                        function showChartError(container, message) {
                            if (!container) return;
                            
                            // 清除现有的加载指示器
                            if (container.loadingIndicator) {
                                container.removeChild(container.loadingIndicator);
                                delete container.loadingIndicator;
                            }
                            
                            // 创建错误信息元素
                            const errorEl = document.createElement('div');
                            errorEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000;text-align:center;padding:20px;';
                            
                            const icon = document.createElement('div');
                            icon.innerHTML = '⚠️';
                            icon.style.cssText = 'font-size:40px;margin-bottom:20px;';
                            
                            const title = document.createElement('div');
                            title.textContent = '图表加载失败';
                            title.style.cssText = 'font-size:18px;font-weight:bold;color:#ff4d4f;margin-bottom:10px;';
                            
                            const details = document.createElement('div');
                            details.textContent = message;
                            details.style.cssText = 'font-size:14px;color:#555;';
                            
                            errorEl.appendChild(icon);
                            errorEl.appendChild(title);
                            errorEl.appendChild(details);
                            
                            // 确保容器有相对定位
                            const style = window.getComputedStyle(container);
                            if (style.position === 'static') {
                                container.style.position = 'relative';
                            }
                            
                            container.appendChild(errorEl);
                        }
                        
                        // 自动修复主函数
                        function initAutoFix() {
                            log('图表自动修复系统已初始化');
                            
                            // 检查页面是否已包含图表元素
                            checkForChartElements();
                            
                            // 设置DOM观察器，监听新添加的图表元素
                            setupObserver();
                            
                            // 在window加载完成后再次检查
                            window.addEventListener('load', function() {
                                log('页面加载完成，再次检查图表元素');
                                setTimeout(function() {
                                    checkForChartElements();
                                    tryInitializeChart();
                                }, 800);
                            });
                            
                            // 如果DOM已经加载完成，立即尝试初始化图表
                            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                                setTimeout(tryInitializeChart, 500);
                            }
                            
                            // 拦截原生echarts.init方法，确保初始化成功
                            if (window.echarts) {
                                const originalInit = window.echarts.init;
                                window.echarts.init = function(dom, theme, opts) {
                                    try {
                                        return originalInit.call(this, dom, theme, opts);
                                    } catch (error) {
                                        log('原生echarts.init调用失败: ' + error.message + '，应用修复', 'warn');
                                        
                                        // 如果是dom未准备好，延迟调用
                                        if (dom) {
                                            prepareChartContainer(dom);
                                        }
                                        
                                        // 抛出错误，让原始代码可以捕获
                                        throw error;
                                    }
                                };
                            }
                        }
                        
                        // 启动自动修复系统
                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', initAutoFix);
                        } else {
                            initAutoFix();
                        }
                    })();
                `));
                
                // 将脚本添加到文档头部，确保在其他脚本之前执行
                if (head) {
                    head.insertBefore(scriptFixerTag, head.firstChild);
                }

            if (head && cssContent.trim() !== "") {
                Array.from(head.querySelectorAll('style[data-editor-injected="true"]')).forEach(s => s.remove());
                const styleTag = tempDoc.createElement('style');
                styleTag.type = 'text/css';
                styleTag.setAttribute('data-editor-injected', 'true');
                styleTag.appendChild(tempDoc.createTextNode(cssContent));
                head.appendChild(styleTag);
            }
            
            // 注入加载状态提示样式
            const loadingStyleTag = tempDoc.createElement('style');
            loadingStyleTag.type = 'text/css';
            loadingStyleTag.setAttribute('data-editor-injected', 'true');
            loadingStyleTag.appendChild(tempDoc.createTextNode(`
                .chart-loading {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255,255,255,0.8);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    font-family: Arial, sans-serif;
                }
                .chart-loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(24,144,255,0.2);
                    border-radius: 50%;
                    border-top-color: #1890ff;
                    animation: chart-spin 1s linear infinite;
                    margin-bottom: 15px;
                }
                .chart-loading-text {
                    color: #1890ff;
                    font-size: 14px;
                    font-weight: bold;
                }
                @keyframes chart-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `));
            head.appendChild(loadingStyleTag);
            
            // 修改脚本注入方式，确保脚本在资源加载后执行
            if (body && jsContent.trim() !== "") {
                Array.from(body.querySelectorAll('script[data-editor-injected="true"]')).forEach(s => s.remove());
                
                // 在</body>前添加一个特殊脚本，确保DOM加载完成后执行用户脚本
                const scriptWrapperTag = tempDoc.createElement('script');
                scriptWrapperTag.setAttribute('data-editor-injected', 'true');
                scriptWrapperTag.appendChild(tempDoc.createTextNode(`
                    // 为带有特定类名的容器添加加载指示器
                    document.addEventListener('DOMContentLoaded', function() {
                        const chartContainers = document.querySelectorAll('[id*="chart"], [id*="Chart"], [class*="chart"], [class*="Chart"]');
                        chartContainers.forEach(container => {
                            // 确保容器有相对定位
                            const computedStyle = window.getComputedStyle(container);
                            if (computedStyle.position === 'static') {
                                container.style.position = 'relative';
                            }
                            
                            // 添加加载指示器
                            const loadingDiv = document.createElement('div');
                            loadingDiv.className = 'chart-loading';
                            loadingDiv.innerHTML = '<div class="chart-loading-spinner"></div><div class="chart-loading-text">图表加载中...</div>';
                            container.appendChild(loadingDiv);
                            
                            // 存储引用以便后续移除
                            container.loadingIndicator = loadingDiv;
                        });
                    });
                    
                    // 确保资源加载完毕后执行初始化脚本
                    window.addEventListener('load', function() {
                        setTimeout(function() {
                            try {
                                // 用户脚本
                                ${jsContent}
                                
                                // 尝试检测echarts或其他图表库的存在并在图表初始化后移除加载指示器
                                setTimeout(function() {
                                    const chartContainers = document.querySelectorAll('[id*="chart"], [id*="Chart"], [class*="chart"], [class*="Chart"]');
                                    chartContainers.forEach(container => {
                                        if (container.loadingIndicator) {
                                            container.loadingIndicator.style.display = 'none';
                                        }
                                    });
                                }, 1000); // 延迟1秒后隐藏加载指示器
                            } catch (e) {
                                console.error("Error executing user script:", e);
                            }
                        }, 300);
                    });
                `));
                body.appendChild(scriptWrapperTag);
            }

            // 注入异步资源加载器脚本，确保即使外部库加载失败也有备选方案
            const scriptResourceTag = tempDoc.createElement('script');
            scriptResourceTag.setAttribute('data-editor-injected', 'true');
            scriptResourceTag.appendChild(tempDoc.createTextNode(`
                // 资源加载辅助工具
                window._resourceLoader = {
                    // 检查是否有外部库未加载成功
                    checkLibraries: function() {
                        const scripts = document.querySelectorAll('script[src]');
                        
                        // 为常见库创建备选CDN源映射
                        const cdnMapping = {
                            'echarts': [
                                'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js',
                                'https://cdn.staticfile.org/echarts/5.4.3/echarts.min.js',
                                'https://cdn.bootcdn.net/ajax/libs/echarts/5.4.3/echarts.min.js',
                                'https://lf9-cdn-tos.bytecdntp.com/cdn/expire-1-M/echarts/5.4.3/echarts.min.js'
                            ],
                            'chart.js': [
                                'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
                                'https://cdn.staticfile.org/Chart.js/4.4.0/chart.umd.min.js',
                                'https://cdn.bootcdn.net/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
                            ],
                            'highcharts': [
                                'https://cdn.jsdelivr.net/npm/highcharts@11.1.0/highcharts.js',
                                'https://cdn.staticfile.org/highcharts/11.1.0/highcharts.js',
                                'https://cdn.bootcdn.net/ajax/libs/highcharts/11.1.0/highcharts.js'
                            ]
                        };
                        
                        // 检查脚本并加载备选源
                        scripts.forEach(script => {
                            const src = script.getAttribute('src') || '';
                            
                            // 确定当前脚本尝试加载的是哪个库
                            let libraryType = null;
                            if(src.includes('echarts')) libraryType = 'echarts';
                            else if(src.includes('chart.js') || src.includes('Chart.js')) libraryType = 'chart.js';
                            else if(src.includes('highcharts')) libraryType = 'highcharts';
                            
                            if(libraryType) {
                                // 检查库是否已成功加载
                                let isLoaded = false;
                                switch(libraryType) {
                                    case 'echarts': isLoaded = typeof window.echarts !== 'undefined'; break;
                                    case 'chart.js': isLoaded = typeof window.Chart !== 'undefined'; break;
                                    case 'highcharts': isLoaded = typeof window.Highcharts !== 'undefined'; break;
                                }
                                
                                // 如果未加载成功，则使用备选CDN源
                                if(!isLoaded && cdnMapping[libraryType]) {
                                    console.log('[资源加载器] 检测到 ' + libraryType + ' 加载失败，尝试使用备选CDN源');
                                    this.loadFromFallbacks(libraryType, cdnMapping[libraryType]);
                                }
                            }
                        });
                    },
                    
                    // 从备选CDN源逐一尝试加载
                    loadFromFallbacks: function(libraryType, sources) {
                        if(!sources || sources.length === 0) return;
                        
                        // 记录当前使用的CDN索引
                        let currentSourceIndex = 0;
                        
                        const tryLoad = () => {
                            if(currentSourceIndex >= sources.length) {
                                console.error('[资源加载器] 所有备选CDN源都加载失败:', libraryType);
                                this.showErrorMessage(libraryType);
                                return;
                            }
                            
                            const script = document.createElement('script');
                            script.src = sources[currentSourceIndex];
                            
                            // 加载成功时的处理
                            script.onload = () => {
                                console.log('[资源加载器] 成功从备选源加载 ' + libraryType + ':', sources[currentSourceIndex]);
                                setTimeout(() => {
                                    // 通知页面图表库已加载完成
                                    const event = new CustomEvent('chartlibraryloaded', { 
                                        detail: { libraryType: libraryType } 
                                    });
                                    window.dispatchEvent(event);
                                }, 200);
                            };
                            
                            // 加载失败时尝试下一个源
                            script.onerror = () => {
                                console.warn('[资源加载器] 备选源加载失败:', sources[currentSourceIndex]);
                                currentSourceIndex++;
                                setTimeout(tryLoad, 100);
                            };
                            
                            document.head.appendChild(script);
                        };
                        
                        tryLoad();
                    },
                    
                    // 显示错误信息
                    showErrorMessage: function(libraryType) {
                        // 查找图表容器并显示错误信息
                        const containers = document.querySelectorAll('[id*="chart"], [id*="Chart"]');
                        containers.forEach(container => {
                            const errorMsg = document.createElement('div');
                            errorMsg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#fff;display:flex;align-items:center;justify-content:center;color:#ff4d4f;font-weight:bold;text-align:center;';
                            errorMsg.innerHTML = '图表库 (' + libraryType + ') 加载失败<br>请检查网络连接或更换CDN源';
                            container.style.position = 'relative';
                            container.appendChild(errorMsg);
                        });
                    }
                };
                
                // 检查并处理外部库加载
                window.addEventListener('load', function() {
                    setTimeout(function() {
                        window._resourceLoader.checkLibraries();
                    }, 1000);
                });
                
                // 监听图表库加载事件，尝试重新初始化图表
                window.addEventListener('chartlibraryloaded', function(event) {
                    setTimeout(function() {
                        console.log('[资源加载器] 图表库已加载，尝试初始化:', event.detail.libraryType);
                        const scripts = document.querySelectorAll('script:not([src])');
                        
                        // 根据库类型查找并执行初始化代码
                        if(event.detail.libraryType === 'echarts' && window.echarts) {
                            const containers = document.querySelectorAll('[id*="chart"], [id*="Chart"]');
                            containers.forEach(container => {
                                try {
                                    const chart = echarts.init(container);
                                    
                                    // 查找原始脚本中的配置
                                    let foundOption = null;
                                    scripts.forEach(script => {
                                        if(!foundOption && script.textContent.includes(container.id) && 
                                           script.textContent.includes('echarts.init')) {
                                            const optionMatch = script.textContent.match(/option\\s*=\\s*({[\\s\\S]*?});\\s*(?:myChart|chart)\\.setOption/);
                                            if(optionMatch) {
                                                try {
                                                    const optionText = optionMatch[1];
                                                    foundOption = Function('return ' + optionText)();
                                                } catch(e) {
                                                    console.error('配置解析失败:', e);
                                                }
                                            }
                                        }
                                    });
                                    
                                    // 应用找到的配置
                                    if(foundOption) {
                                        chart.setOption(foundOption);
                                        console.log('[资源加载器] 图表 ' + container.id + ' 已成功重新初始化');
                                    }
                                } catch(e) {
                                    console.error('[资源加载器] 重新初始化失败:', e);
                                }
                            });
                        }
                    }, 300);
                });
            `));
            
            // 添加资源加载器到head
            if (head) {
                head.appendChild(scriptResourceTag);
            }

            finalHtml = tempDoc.documentElement.outerHTML;
        } catch (e) {
            console.error("Error parsing user HTML:", e);
            finalHtml = htmlContent;
        }
    } else {
        finalHtml = `
            <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Preview</title>
            <style>
                .chart-loading {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255,255,255,0.8);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    font-family: Arial, sans-serif;
                }
                .chart-loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(24,144,255,0.2);
                    border-radius: 50%;
                    border-top-color: #1890ff;
                    animation: chart-spin 1s linear infinite;
                    margin-bottom: 15px;
                }
                .chart-loading-text {
                    color: #1890ff;
                    font-size: 14px;
                    font-weight: bold;
                }
                @keyframes chart-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                ${cssContent}
            </style></head><body>
            ${htmlContent}
            <script>
                // 为带有特定类名的容器添加加载指示器
                document.addEventListener('DOMContentLoaded', function() {
                    const chartContainers = document.querySelectorAll('[id*="chart"], [id*="Chart"], [class*="chart"], [class*="Chart"]');
                    chartContainers.forEach(container => {
                        // 确保容器有相对定位
                        const computedStyle = window.getComputedStyle(container);
                        if (computedStyle.position === 'static') {
                            container.style.position = 'relative';
                        }
                        
                        // 添加加载指示器
                        const loadingDiv = document.createElement('div');
                        loadingDiv.className = 'chart-loading';
                        loadingDiv.innerHTML = '<div class="chart-loading-spinner"></div><div class="chart-loading-text">图表加载中...</div>';
                        container.appendChild(loadingDiv);
                        
                        // 存储引用以便后续移除
                        container.loadingIndicator = loadingDiv;
                    });
                });
                
                window.addEventListener('load', function() {
                    setTimeout(function() {
                        try {
                            ${jsContent}
                            
                            // 尝试检测echarts或其他图表库的存在并在图表初始化后移除加载指示器
                            setTimeout(function() {
                                const chartContainers = document.querySelectorAll('[id*="chart"], [id*="Chart"], [class*="chart"], [class*="Chart"]');
                                chartContainers.forEach(container => {
                                    if (container.loadingIndicator) {
                                        container.loadingIndicator.style.display = 'none';
                                    }
                                });
                            }, 1000); // 延迟1秒后隐藏加载指示器
                        } catch (e) {
                            console.error("Error executing user script:", e);
                        }
                    }, 300);
                });
            <\/script></body></html>`;
    }
    const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    try {
        previewDoc.open();
        previewDoc.write(finalHtml);
        previewDoc.close();
        
        // 监听iframe的加载事件以隐藏主加载指示器
        previewFrame.onload = function() {
            // 隐藏加载指示器
            setTimeout(function() {
                if (loadingIndicator) {
                    loadingIndicator.classList.remove('active');
                }
            }, 500); // 给一些额外时间确保内容渲染完成
        };
    } catch (e) {
        console.error("Error writing to iframe:", e);
        // Fallback for some environments or if write is blocked
        previewFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(finalHtml);
        
        // 隐藏加载指示器
        setTimeout(function() {
            if (loadingIndicator) {
                loadingIndicator.classList.remove('active');
            }
        }, 1000);
    }
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