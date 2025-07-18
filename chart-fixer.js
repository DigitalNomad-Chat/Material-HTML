/**
 * 图表自动修复组件增强版
 * 解决各种AI生成的图表代码在预览中的加载与显示问题
 * V2.1 - 生产环境优化版
 */
(function() {
    // 检查全局配置
    if (!window.__CHART_FIXER_CONFIG__) {
        window.__CHART_FIXER_CONFIG__ = {
            enabled: true,
            isEditor: false,
            debug: false,
            supportedLibraries: ['echarts', 'highcharts', 'chart.js', 'plotly'],
            version: '1.0.0'
        };
    }
    
    // 使用全局配置中的调试设置
    const useDebug = window.__CHART_FIXER_CONFIG__.debug;
    
    console.log('[图表修复] 增强版脚本已加载 ' + (window.__CHART_FIXER_CONFIG__.isEditor ? '(编辑器环境)' : '(预览环境)'));
    
    // 配置
    const config = {
        // 常见图表库的CDN源（主要+备用）
        cdnSources: {
            echarts: [
                'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js',
                'https://cdn.staticfile.org/echarts/5.4.3/echarts.min.js',
                'https://cdn.bootcdn.net/ajax/libs/echarts/5.4.3/echarts.min.js',
                'https://lf9-cdn-tos.bytecdntp.com/cdn/expire-1-M/echarts/5.4.3/echarts.min.js',
                'https://unpkg.zhimg.com/echarts@5.4.3/dist/echarts.min.js'
            ],
            chartjs: [
                'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
                'https://cdn.staticfile.org/Chart.js/4.4.0/chart.umd.min.js',
                'https://cdn.bootcdn.net/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
            ],
            highcharts: [
                'https://cdn.jsdelivr.net/npm/highcharts@11.2.0/highcharts.js',
                'https://cdn.staticfile.org/highcharts/11.2.0/highcharts.js',
                'https://cdn.bootcdn.net/ajax/libs/highcharts/11.2.0/highcharts.js'
            ]
        },
        
        // 图表容器查询选择器 - 排除图标元素和其他可能被误识别的元素
        containerSelectors: [
            // ID选择器，针对常见的图表ID命名
            '[id*="chart"]:not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not(.icon):not(i):not(span):not(button)', 
            '[id*="Chart"]:not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not(.icon):not(i):not(span):not(button)', 
            '[id*="echarts"]:not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not(.icon):not(i):not(span):not(button)', 
            '[id*="Echarts"]:not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not(.icon):not(i):not(span):not(button)',
            '[id*="highchart"]:not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not(.icon):not(i):not(span):not(button)',
            
            // 类名选择器，针对常见的图表类命名
            '[class*="chart"]:not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not(.icon):not(i):not(span):not(button)', 
            '[class*="Chart"]:not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not(.icon):not(i):not(span):not(button)',
            '[class*="echarts"]:not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not(.icon):not(i):not(span):not(button)',
            '[class*="highchart"]:not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not(.icon):not(i):not(span):not(button)',
            
            // 针对特殊的div容器
            'div[style*="width"][style*="height"]:not(.fa):not(.fas):not(.icon):not([class*="btn"]):not([class*="button"])'
        ],
        
        // 延迟时间
        delays: {
            initialCheck: 500,      // 初始检测延迟
            loadingTimeout: 15000,  // 加载超时时间
            retryInterval: 300      // 重试间隔
        },
        
        // 代码模式匹配
        codePatterns: {
            // 常见的ECharts初始化模式
            echarts: [
                {
                    pattern: /var\s+(\w+)\s*=\s*echarts\.init\s*\(\s*document\.getElementById\s*\(\s*['"]([\w\-_]+)['"]\s*\)\s*[,\)]/,
                    extractContainerId: (match) => match[2],
                    extractInstanceVar: (match) => match[1]
                },
                {
                    pattern: /var\s+(\w+)\s*=\s*echarts\.init\s*\(\s*document\.querySelector\s*\(\s*['"]#([\w\-_]+)['"]\s*\)\s*[,\)]/,
                    extractContainerId: (match) => match[2],
                    extractInstanceVar: (match) => match[1]
                },
                {
                    pattern: /echarts\.init\s*\(\s*document\.getElementById\s*\(\s*['"]([\w\-_]+)['"]\s*\)\s*[,\)]/,
                    extractContainerId: (match) => match[1],
                    extractInstanceVar: () => null
                },
                {
                    pattern: /[\w\.]+\.setOption\s*\(\s*(\{[\s\S]+?\})\s*\)/,
                    extractConfig: (match) => match[1],
                    extractContainerId: () => null
                }
            ]
        },
        
        // 调试模式 - 使用全局配置
        debug: useDebug
    };
    
    // 图表容器实例跟踪
    const chartInstances = {};
    
    // 调试日志函数
    function log(message, type = 'log') {
        if (config.debug) {
            console[type](`[图表修复] ${message}`);
        }
    }
    
    // 判断元素是否是有效的图表容器
    function isValidChartContainer(element) {
        // 排除太小的元素 (小于80x80像素的元素可能不是图表容器)
        const rect = element.getBoundingClientRect();
        if (rect.width < 80 || rect.height < 80) {
            return false;
        }
        
        // 排除图标元素
        if (element.tagName.toLowerCase() === 'i' || 
            (element.tagName.toLowerCase() === 'span' && element.children.length === 0)) {
            return false;
        }
        
        // 排除包含特定类名的元素
        const classNames = element.className.toString().toLowerCase();
        const excludeClasses = ['icon', 'btn', 'button', 'fa-', 'header', 'logo', 'nav'];
        if (excludeClasses.some(cls => classNames.includes(cls))) {
            return false;
        }
        
        // 检查是否有父元素是图标或按钮
        let parent = element.parentElement;
        while (parent) {
            if (parent.tagName.toLowerCase() === 'button' || 
                parent.className.toString().toLowerCase().includes('btn') ||
                parent.className.toString().toLowerCase().includes('button')) {
                return false;
            }
            parent = parent.parentElement;
        }
        
        return true;
    }
    
    // 主函数: 检测并修复图表
    function init() {
        // 检查是否禁用了图表修复
        if (window.__CHART_FIXER_CONFIG__ && window.__CHART_FIXER_CONFIG__.enabled === false) {
            log('图表修复已被全局禁用，跳过修复流程', 'warn');
            return;
        }
        
        // 兼容旧版禁用标记
        if (window.__DISABLE_CHART_FIXER__) {
            log('图表修复已被禁用(旧版标记)，跳过修复流程', 'warn');
            return;
        }
        
        // 检测页面中是否已有正常工作的图表
        if (typeof window.echarts !== 'undefined' && document.querySelector('#pieChart canvas')) {
            log('检测到页面中已有正常工作的图表，跳过修复', 'info');
            return;
        }
        
        // 监听DOM变动以检测动态添加的图表
        setupMutationObserver();
        
        // 页面加载完成后执行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(detectAndFixCharts, config.delays.initialCheck);
            });
        } else {
            setTimeout(detectAndFixCharts, config.delays.initialCheck);
        }
        
        // 页面完全加载后再执行一次，确保处理延迟加载的图表
        window.addEventListener('load', function() {
            setTimeout(detectAndFixCharts, config.delays.initialCheck * 2);
            
            // 再次延迟检查，捕获可能的延迟加载资源后创建的图表
            setTimeout(detectAndFixCharts, config.delays.initialCheck * 4);
        });
        
        // 备用检查 - 在页面彻底加载完成后，针对有些框架中延迟渲染的情况
        setTimeout(detectAndFixCharts, config.delays.initialCheck * 8);
    }
    
    // 设置DOM变动观察器，用于检测动态添加的图表
    function setupMutationObserver() {
        if (!window.MutationObserver) {
            log('浏览器不支持MutationObserver，无法检测动态添加的图表', 'warn');
            return;
        }
        
        const observer = new MutationObserver((mutations) => {
            let needsCheck = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 如果添加了元素节点，标记需要检查
                            needsCheck = true;
                            break;
                        }
                    }
                    if (needsCheck) break;
                }
            }
            
            if (needsCheck) {
                // 使用防抖动，避免频繁检查
                clearTimeout(window._chartFixerMutationTimer);
                window._chartFixerMutationTimer = setTimeout(detectAndFixCharts, 300);
            }
        });
        
        // 监听整个文档中的元素变动
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
        
        log('DOM变动监听已启动，将检测动态添加的图表');
    }
    
    // 检测并修复所有图表
    function detectAndFixCharts() {
        log('开始检测图表...');
        
        // 查找所有可能的图表容器
        const potentialContainers = document.querySelectorAll(config.containerSelectors.join(', '));
        
        // 过滤掉不适合作为图表容器的元素
        const containers = Array.from(potentialContainers).filter(isValidChartContainer);
        
        if (containers.length === 0) {
            log('未检测到有效图表容器');
            return;
        }
        
        log(`检测到 ${containers.length} 个有效图表容器`);
        
        // 检查常用图表库是否已加载
        const libraries = {
            echarts: typeof window.echarts !== 'undefined',
            chartjs: typeof window.Chart !== 'undefined',
            highcharts: typeof window.Highcharts !== 'undefined'
        };
        
        // 检查页面上是否有图表库引用
        const scripts = document.querySelectorAll('script[src]');
        const libraryReferences = {
            echarts: false,
            chartjs: false,
            highcharts: false
        };
        
        // 提取脚本中的图表库引用
        Array.from(scripts).forEach(script => {
            const src = script.getAttribute('src') || '';
            if (src.includes('echarts')) libraryReferences.echarts = true;
            if (src.includes('chart.js') || src.includes('Chart.js')) libraryReferences.chartjs = true;
            if (src.includes('highcharts')) libraryReferences.highcharts = true;
        });
        
        // 检查内联脚本中是否有图表代码
        const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'));
        let chartConfigs = extractChartConfigsFromScripts(inlineScripts);
        
        // 检查容器是否已经初始化了图表
        const containersNeedingFix = containers.filter(container => {
            // 检查ECharts实例
            if (libraries.echarts && window.echarts) {
                try {
                    // 尝试获取容器上的ECharts实例
                    const instance = window.echarts.getInstanceByDom(container);
                    if (instance) {
                        log(`容器 ${container.id || '(无ID)'} 已有ECharts实例，跳过修复`);
                        // 标记为已处理，避免再次修复
                        container._chartProcessed = true;
                        return false;
                    }
                } catch (e) {
                    // 忽略错误
                }
            }
            
            // 检查Chart.js实例
            if (libraries.chartjs && window.Chart) {
                // Chart.js没有直接的实例获取方法，使用数据属性检查
                if (container.__chartjs__) {
                    log(`容器 ${container.id || '(无ID)'} 已有Chart.js实例，跳过修复`);
                    container._chartProcessed = true;
                    return false;
                }
            }
            
            // 检查容器内部是否已有SVG或Canvas元素（可能表示图表已渲染）
            const hasSvg = container.querySelector('svg');
            const hasCanvas = container.querySelector('canvas');
            if ((hasSvg && hasSvg.getBoundingClientRect().width > 0) || 
                (hasCanvas && hasCanvas.getBoundingClientRect().width > 0)) {
                log(`容器 ${container.id || '(无ID)'} 已有图表元素，跳过修复`);
                container._chartProcessed = true;
                return false;
            }
            
            return true;
        });
        
        // 如果所有容器都已初始化，直接返回
        if (containersNeedingFix.length === 0) {
            log('所有图表容器已初始化，无需修复');
            return;
        }
        
        log(`${containersNeedingFix.length}/${containers.length} 个容器需要修复`);
        
        // 为每个需要修复的容器添加加载状态
        containersNeedingFix.forEach(container => {
            // 检查这个容器是否已经有图表了
            if (!container._chartPrepared) {
                prepareContainer(container);
            }
        });
        
        // 如果有图表库引用但未加载成功，尝试加载
        if (libraryReferences.echarts && !libraries.echarts) {
            loadLibrary('echarts', () => processContainers(containersNeedingFix, 'echarts', chartConfigs));
        } else if (libraries.echarts) {
            processContainers(containersNeedingFix, 'echarts', chartConfigs);
        }
        
        if (libraryReferences.chartjs && !libraries.chartjs) {
            loadLibrary('chartjs', () => processContainers(containersNeedingFix, 'chartjs', chartConfigs));
        } else if (libraries.chartjs) {
            processContainers(containersNeedingFix, 'chartjs', chartConfigs);
        }
        
        if (libraryReferences.highcharts && !libraries.highcharts) {
            loadLibrary('highcharts', () => processContainers(containersNeedingFix, 'highcharts', chartConfigs));
        } else if (libraries.highcharts) {
            processContainers(containersNeedingFix, 'highcharts', chartConfigs);
        }
        
        // 如果没有检测到图表库但有容器，尝试加载ECharts作为默认库
        if (!libraryReferences.echarts && !libraryReferences.chartjs && !libraryReferences.highcharts && containersNeedingFix.length > 0) {
            log('未检测到图表库，尝试加载ECharts作为默认库');
            loadLibrary('echarts', () => processContainers(containersNeedingFix, 'echarts', chartConfigs));
        }
        
        // 最后的兜底：如果所有尝试都失败，显示错误信息
        setTimeout(() => {
            containersNeedingFix.forEach(container => {
                // 如果容器还在加载状态，显示错误
                if (container._chartLoading && !container._chartProcessed) {
                    showError(container, '无法加载或初始化图表，请检查控制台获取详细信息');
                }
            });
        }, config.delays.loadingTimeout);
    }
    
    // 从内联脚本中提取图表配置
    function extractChartConfigsFromScripts(scripts) {
        const configs = [];
        
        scripts.forEach(script => {
            const content = script.textContent;
            
            // 尝试识别各种图表初始化模式
            for (const pattern of config.codePatterns.echarts) {
                const matches = content.matchAll(new RegExp(pattern.pattern, 'g'));
                
                for (const match of Array.from(matches)) {
                    // 提取容器ID和实例变量名
                    const containerId = pattern.extractContainerId ? pattern.extractContainerId(match) : null;
                    const instanceVar = pattern.extractInstanceVar ? pattern.extractInstanceVar(match) : null;
                    
                    // 尝试提取图表配置
                    let chartConfig = null;
                    if (pattern.extractConfig) {
                        chartConfig = pattern.extractConfig(match);
                    } else if (instanceVar) {
                        // 尝试查找与实例变量关联的setOption调用
                        const optionPattern = new RegExp(instanceVar + '\\.setOption\\s*\\(\\s*(\\{[\\s\\S]+?\\})\\s*\\)', 'g');
                        const optionMatch = optionPattern.exec(content);
                        if (optionMatch && optionMatch[1]) {
                            chartConfig = optionMatch[1];
                        }
                    }
                    
                    if (containerId || chartConfig) {
                        configs.push({
                            type: 'echarts',
                            containerId,
                            instanceVar,
                            config: chartConfig,
                            scriptContent: content
                        });
                    }
                }
            }
            
            // 检查是否有window.onload或DOMContentLoaded事件中的图表初始化
            const onloadPattern = /(window\.onload|DOMContentLoaded)[\s\S]*?function[\s\S]*?\{([\s\S]*?)\}/g;
            const onloadMatch = onloadPattern.exec(content);
            if (onloadMatch && onloadMatch[2]) {
                const eventHandlerContent = onloadMatch[2];
                
                // 在事件处理程序中再次检查图表初始化
                for (const pattern of config.codePatterns.echarts) {
                    const matches = eventHandlerContent.matchAll(new RegExp(pattern.pattern, 'g'));
                    
                    for (const match of Array.from(matches)) {
                        const containerId = pattern.extractContainerId ? pattern.extractContainerId(match) : null;
                        configs.push({
                            type: 'echarts',
                            containerId,
                            isDelayed: true, // 标记为延迟加载
                            scriptContent: eventHandlerContent
                        });
                    }
                }
            }
        });
        
        return configs;
    }
    
    // 准备容器，添加加载状态
    function prepareContainer(container) {
        // 避免重复处理
        if (container._chartPrepared) return;
        container._chartPrepared = true;
        container._chartLoading = true;
        container._chartProcessed = false;
        
        // 确保容器有相对定位
        const style = window.getComputedStyle(container);
        if (style.position === 'static') {
            container.style.position = 'relative';
        }
        
        // 创建加载指示器
        const loader = document.createElement('div');
        loader.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        // 添加动画样式
        if (!document.getElementById('chart-fixer-styles')) {
            const style = document.createElement('style');
            style.id = 'chart-fixer-styles';
            style.textContent = `
                @keyframes chartFixer-spinner {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // 创建加载动画
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid rgba(9, 109, 217, 0.2);
            border-top-color: #096dd9;
            animation: chartFixer-spinner 1s linear infinite;
            margin-bottom: 15px;
        `;
        
        // 创建加载文本
        const text = document.createElement('div');
        text.textContent = '图表加载中...';
        text.style.cssText = `
            color: #096dd9;
            font-size: 14px;
            font-weight: bold;
        `;
        
        // 组装加载指示器
        loader.appendChild(spinner);
        loader.appendChild(text);
        container.appendChild(loader);
        
        // 保存引用以便后续清理
        container.loadingIndicator = loader;
        
        log(`容器 ${container.id || '(无ID)'} 已准备就绪`);
    }
    
    // 加载图表库
    function loadLibrary(libraryType, callback) {
        if (!config.cdnSources[libraryType] || config.cdnSources[libraryType].length === 0) {
            log(`没有为 ${libraryType} 配置CDN源`, 'error');
            return;
        }
        
        log(`开始加载 ${libraryType} 库...`);
        
        function tryNextSource(index = 0) {
            if (index >= config.cdnSources[libraryType].length) {
                log(`加载 ${libraryType} 失败，所有CDN源均不可用`, 'error');
                return;
            }
            
            const script = document.createElement('script');
            script.src = config.cdnSources[libraryType][index];
            log(`尝试从 ${script.src} 加载 ${libraryType}`);
            
            script.onload = function() {
                log(`${libraryType} 加载成功`);
                callback && callback();
            };
            
            script.onerror = function() {
                log(`从 ${script.src} 加载 ${libraryType} 失败，尝试下一个源`, 'warn');
                tryNextSource(index + 1);
            };
            
            document.head.appendChild(script);
        }
        
        tryNextSource();
    }
    
    // 处理容器
    function processContainers(containers, libraryType, chartConfigs = []) {
        if (!containers || containers.length === 0) {
            return;
        }
        
        log(`处理 ${containers.length} 个容器，图表类型: ${libraryType}`);
        
        // 检查图表库是否已加载
        let libraryLoaded = false;
        switch(libraryType) {
            case 'echarts':
                libraryLoaded = typeof window.echarts !== 'undefined';
                break;
            case 'chartjs':
                libraryLoaded = typeof window.Chart !== 'undefined';
                break;
            case 'highcharts':
                libraryLoaded = typeof window.Highcharts !== 'undefined';
                break;
        }
        
        if (!libraryLoaded) {
            log(`${libraryType} 库未加载，无法处理容器`, 'warn');
            return;
        }
        
        // 处理每个容器
        containers.forEach(container => {
            // 避免重复处理
            if (container._chartProcessed) return;
            
            // 根据图表库类型初始化图表
            switch(libraryType) {
                case 'echarts':
                    initECharts(container, chartConfigs);
                    break;
                case 'chartjs':
                    // Chart.js初始化逻辑（暂未实现）
                    break;
                case 'highcharts':
                    // Highcharts初始化逻辑（暂未实现）
                    break;
            }
        });
    }
    
    // 初始化ECharts
    function initECharts(container, chartConfigs = []) {
        if (!window.echarts) {
            log('ECharts库未加载', 'error');
            return;
        }
        
        try {
            // 尝试找到和当前容器匹配的配置
            let matchingConfig = null;
            
            // 首先通过ID匹配
            if (container.id) {
                matchingConfig = chartConfigs.find(c => c.containerId === container.id);
            }
            
            // 如果没有找到匹配的配置，尝试创建一个默认的图表
            if (!matchingConfig) {
                log(`容器 ${container.id || '(无ID)'} 没有找到匹配的配置，使用默认配置`);
                
                // 初始化ECharts实例
                const chart = window.echarts.init(container);
                
                // 设置基本的默认配置
                const defaultOption = {
                    title: {
                        text: '自动初始化的图表',
                        subtext: '未找到原配置，使用默认配置'
                    },
                    tooltip: {
                        trigger: 'axis'
                    },
                    legend: {
                        data: ['示例数据']
                    },
                    xAxis: {
                        type: 'category',
                        data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月']
                    },
                    yAxis: {
                        type: 'value'
                    },
                    series: [
                        {
                            name: '示例数据',
                            type: 'line',
                            data: [120, 132, 101, 134, 90, 230, 210]
                        }
                    ]
                };
                
                chart.setOption(defaultOption);
                
                // 保存实例引用
                chartInstances[container.id || container._chartFixerId] = chart;
                
                // 标记为已处理
                container._chartProcessed = true;
                
                // 隐藏加载指示器
                hideLoader(container);
                
                // 监听窗口大小变化，调整图表大小
                window.addEventListener('resize', () => {
                    chart.resize();
                });
                
                return;
            }
            
            log(`找到容器 ${container.id || '(无ID)'} 的配置`);
            
            // 初始化ECharts实例
            const chart = window.echarts.init(container);
            
            // 尝试提取和应用配置
            const optionStr = matchingConfig.config;
            if (optionStr) {
                try {
                    // 尝试安全地提取配置对象
                    let optionObj;
                    try {
                        // 尝试直接解析JSON
                        optionObj = JSON.parse(optionStr);
                    } catch (e) {
                        // JSON解析失败，尝试使用Function构造器评估
                        optionObj = new Function(`return ${optionStr}`)();
                    }
                    
                    if (optionObj) {
                        chart.setOption(optionObj);
                        log('成功应用图表配置');
                    }
                } catch (evalError) {
                    log(`配置解析失败: ${evalError}`, 'error');
                    
                    // 尝试查找更多可能的选项定义模式
                    const scriptContent = matchingConfig.scriptContent;
                    const varName = matchingConfig.instanceVar;
                    
                    if (varName && scriptContent) {
                        // 尝试查找变量定义的选项
                        const optionVarPattern = new RegExp(`var\\s+(\\w+)\\s*=\\s*\\{[\\s\\S]+?\\};[\\s\\S]*?${varName}\\.setOption\\s*\\(\\s*(\\w+)\\s*\\)`, 'g');
                        const optionVarMatch = optionVarPattern.exec(scriptContent);
                        
                        if (optionVarMatch && optionVarMatch[1] === optionVarMatch[2]) {
                            const optionVarName = optionVarMatch[1];
                            const optionDefPattern = new RegExp(`var\\s+${optionVarName}\\s*=\\s*(\\{[\\s\\S]+?\\});`, 'g');
                            const optionDefMatch = optionDefPattern.exec(scriptContent);
                            
                            if (optionDefMatch && optionDefMatch[1]) {
                                try {
                                    const optionObj = new Function(`return ${optionDefMatch[1]}`)();
                                    chart.setOption(optionObj);
                                    log(`成功从变量 ${optionVarName} 中提取并应用配置`);
                                } catch (e) {
                                    log(`从变量解析配置失败: ${e}`, 'error');
                                    chart.setOption(getFallbackChartOption('配置解析失败'));
                                }
                            }
                        } else {
                            chart.setOption(getFallbackChartOption('未找到有效配置'));
                        }
                    } else {
                        chart.setOption(getFallbackChartOption('配置评估失败'));
                    }
                }
            } else {
                // 没有找到配置，使用默认配置
                chart.setOption(getFallbackChartOption('未找到配置'));
            }
            
            // 保存实例引用
            chartInstances[container.id || container._chartFixerId] = chart;
            
            // 标记为已处理
            container._chartProcessed = true;
            
            // 隐藏加载指示器
            hideLoader(container);
            
            // 监听窗口大小变化，调整图表大小
            window.addEventListener('resize', () => {
                chart.resize();
            });
            
        } catch (e) {
            log(`初始化ECharts失败: ${e.message}`, 'error');
            showError(container, `初始化失败: ${e.message}`);
        }
    }
    
    // 获取后备图表配置
    function getFallbackChartOption(reason) {
        return {
            title: {
                text: '图表修复后备配置',
                subtext: reason || '未找到原配置',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: ['数据1', '数据2'],
                bottom: 10
            },
            xAxis: {
                type: 'category',
                data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    name: '数据1',
                    type: 'line',
                    smooth: true,
                    data: [10, 32, 41, 34, 90, 130, 110]
                },
                {
                    name: '数据2',
                    type: 'bar',
                    data: [20, 49, 70, 81, 30, 20, 10]
                }
            ]
        };
    }
    
    // 隐藏加载指示器
    function hideLoader(container) {
        if (container.loadingIndicator) {
            container.loadingIndicator.style.display = 'none';
        }
        container._chartLoading = false;
    }
    
    // 显示错误信息
    function showError(container, message) {
        if (container.loadingIndicator) {
            const text = container.loadingIndicator.querySelector('div:last-child');
            if (text) {
                text.textContent = message || '加载失败';
                text.style.color = '#ff4d4f';
            }
            
            const spinner = container.loadingIndicator.querySelector('div:first-child');
            if (spinner) {
                spinner.style.borderColor = 'rgba(255, 77, 79, 0.2)';
                spinner.style.borderTopColor = '#ff4d4f';
            }
        }
    }
    
    // 初始化
    window._chartFixerV2 = {
        init: init,
        detectAndFixCharts: detectAndFixCharts,
        instances: chartInstances,
        getFallbackChartOption: getFallbackChartOption
    };
    
    // 自动初始化
    init();
    
})(); 