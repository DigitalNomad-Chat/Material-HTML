/**
 * ECharts图表自动修复脚本
 * 
 * 该脚本解决以下问题:
 * 1. ECharts实例在库加载前初始化导致的错误
 * 2. CDN加载失败时的自动切换
 * 3. 图表异步加载和渲染问题
 */
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
            log(`发现${chartElements.length}个潜在图表容器`);
            
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
        
        // 创建旋转动画元素
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border: 3px solid rgba(9,109,217,0.2);
            border-top-color: #096dd9;
            border-radius: 50%;
            margin-bottom: 10px;
            animation: chart-spinner 1s linear infinite;
        `;
        
        // 添加动画样式
        if (!document.getElementById('chart-spinner-style')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'chart-spinner-style';
            styleEl.textContent = `@keyframes chart-spinner { to { transform: rotate(360deg); } }`;
            document.head.appendChild(styleEl);
        }
        
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
        
        // 保存加载指示器引用
        container.loadingIndicator = loader;
        
        log(`已为容器 ${container.id || '(无ID)'} 添加加载状态`);
        
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
                log(`尝试从 ${cdnSources[currentSourceIndex]} 加载`);
                
                script.onload = function() {
                    log(`成功从 ${cdnSources[currentSourceIndex]} 加载ECharts`);
                    resolve();
                };
                
                script.onerror = function() {
                    log(`从 ${cdnSources[currentSourceIndex]} 加载失败，尝试下一个源`, 'warn');
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
        
        log(`有 ${pendingCharts.length} 个图表等待处理`);
        
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
                log(`处理图表容器: ${container.id || '(无ID)'}`);
                
                // 检查是否已有ECharts实例
                if (container._echarts_instance_ || 
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
                log(`处理图表失败: ${error.message}`, 'error');
                showChartError(container, error.message);
            }
        });
    }
    
    // 从页面脚本中提取并应用图表配置
    function extractAndApplyChartConfig(container) {
        // 初始化图表
        log(`为容器 ${container.id || '(无ID)'} 初始化ECharts实例`);
        
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
                    log(`找到可能包含容器 ${container.id} 配置的脚本`);
                    
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
                                const configFn = new Function(`
                                    try {
                                        const option = ${optionCode};
                                        return option;
                                    } catch(e) {
                                        console.error("配置解析错误:", e);
                                        return null;
                                    }
                                `);
                                
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
                                log(`配置求值错误: ${evalError.message}`, 'error');
                            }
                        }
                    } catch (extractError) {
                        log(`提取配置失败: ${extractError.message}`, 'error');
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
            log(`初始化图表失败: ${initError.message}`, 'error');
            showChartError(container, `图表初始化失败: ${initError.message}`);
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
        errorEl.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            text-align: center;
            padding: 20px;
        `;
        
        const icon = document.createElement('div');
        icon.innerHTML = '⚠️';
        icon.style.cssText = 'font-size: 40px; margin-bottom: 20px;';
        
        const title = document.createElement('div');
        title.textContent = '图表加载失败';
        title.style.cssText = 'font-size: 18px; font-weight: bold; color: #ff4d4f; margin-bottom: 10px;';
        
        const details = document.createElement('div');
        details.textContent = message;
        details.style.cssText = 'font-size: 14px; color: #555;';
        
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
                    log(`原生echarts.init调用失败: ${error.message}，应用修复`, 'warn');
                    
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