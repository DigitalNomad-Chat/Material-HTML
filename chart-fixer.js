/**
 * 图表自动修复组件
 * 解决ECharts等图表库在预览中的加载与显示问题
 */
(function() {
    console.log('[图表修复] 脚本已加载');
    
    // 配置
    const config = {
        // 常见图表库的CDN源
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
        
        // 图表容器查询选择器
        containerSelectors: [
            '[id*="chart"]', 
            '[id*="Chart"]', 
            '[class*="chart"]', 
            '[class*="Chart"]'
        ],
        
        // 延迟时间
        delays: {
            initialCheck: 500,      // 初始检测延迟
            loadingTimeout: 10000,  // 加载超时时间
            retryInterval: 200      // 重试间隔
        }
    };
    
    // 图表容器实例跟踪
    const chartInstances = {};
    
    // 主函数: 检测并修复图表
    function init() {
        // 页面加载完成后执行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(detectAndFixCharts, config.delays.initialCheck);
            });
        } else {
            setTimeout(detectAndFixCharts, config.delays.initialCheck);
        }
        
        // 页面完全加载后再执行一次
        window.addEventListener('load', function() {
            setTimeout(detectAndFixCharts, config.delays.initialCheck * 2);
        });
    }
    
    // 检测并修复所有图表
    function detectAndFixCharts() {
        console.log('[图表修复] 开始检测图表...');
        
        // 查找所有可能的图表容器
        const containers = document.querySelectorAll(config.containerSelectors.join(', '));
        
        if (containers.length === 0) {
            console.log('[图表修复] 未检测到图表容器');
            return;
        }
        
        console.log(`[图表修复] 检测到 ${containers.length} 个潜在图表容器`);
        
        // 检查常用图表库是否已加载
        const libraries = {
            echarts: typeof echarts !== 'undefined',
            chartjs: typeof Chart !== 'undefined',
            highcharts: typeof Highcharts !== 'undefined'
        };
        
        // 检查页面上是否有图表库引用
        const scripts = document.querySelectorAll('script[src]');
        const libraryReferences = {
            echarts: false,
            chartjs: false,
            highcharts: false
        };
        
        Array.from(scripts).forEach(script => {
            const src = script.getAttribute('src') || '';
            if (src.includes('echarts')) libraryReferences.echarts = true;
            if (src.includes('chart.js') || src.includes('Chart.js')) libraryReferences.chartjs = true;
            if (src.includes('highcharts')) libraryReferences.highcharts = true;
        });
        
        // 为每个容器添加加载状态
        containers.forEach(container => {
            prepareContainer(container);
        });
        
        // 如果有图表库引用但未加载成功，尝试加载
        if (libraryReferences.echarts && !libraries.echarts) {
            loadLibrary('echarts', () => processContainers(containers, 'echarts'));
        } else if (libraries.echarts) {
            processContainers(containers, 'echarts');
        }
        
        if (libraryReferences.chartjs && !libraries.chartjs) {
            loadLibrary('chartjs', () => processContainers(containers, 'chartjs'));
        } else if (libraries.chartjs) {
            processContainers(containers, 'chartjs');
        }
        
        if (libraryReferences.highcharts && !libraries.highcharts) {
            loadLibrary('highcharts', () => processContainers(containers, 'highcharts'));
        } else if (libraries.highcharts) {
            processContainers(containers, 'highcharts');
        }
        
        // 如果没有检测到图表库但有容器，尝试加载ECharts作为默认库
        if (!libraryReferences.echarts && !libraryReferences.chartjs && !libraryReferences.highcharts && containers.length > 0) {
            console.log('[图表修复] 未检测到图表库，尝试加载ECharts作为默认库');
            loadLibrary('echarts', () => processContainers(containers, 'echarts'));
        }
        
        // 最后的兜底：如果所有尝试都失败，显示错误信息
        setTimeout(() => {
            containers.forEach(container => {
                // 如果容器还在加载状态，显示错误
                if (container._chartLoading && !container._chartProcessed) {
                    showError(container, '无法加载或初始化图表，请检查控制台获取详细信息');
                }
            });
        }, config.delays.loadingTimeout);
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
        container._chartLoader = loader;
        
        console.log(`[图表修复] 已准备容器: ${container.id || '(无ID)'}`);
    }
    
    // 加载图表库
    function loadLibrary(libraryType, callback) {
        const sources = config.cdnSources[libraryType];
        if (!sources || sources.length === 0) {
            console.error(`[图表修复] 未找到 ${libraryType} 的CDN源`);
            return;
        }
        
        console.log(`[图表修复] 尝试加载 ${libraryType}...`);
        
        // 依次尝试每个CDN源
        function tryNextSource(index = 0) {
            if (index >= sources.length) {
                console.error(`[图表修复] 所有 ${libraryType} CDN源加载失败`);
                return;
            }
            
            const script = document.createElement('script');
            script.src = sources[index];
            console.log(`[图表修复] 尝试从 ${sources[index]} 加载 ${libraryType}`);
            
            script.onload = function() {
                console.log(`[图表修复] ${libraryType} 加载成功`);
                if (callback) callback();
            };
            
            script.onerror = function() {
                console.warn(`[图表修复] 从 ${sources[index]} 加载 ${libraryType} 失败，尝试下一个源`);
                tryNextSource(index + 1);
            };
            
            document.head.appendChild(script);
        }
        
        tryNextSource();
    }
    
    // 处理容器，初始化图表
    function processContainers(containers, libraryType) {
        containers.forEach(container => {
            if (container._chartProcessed) return;
            
            try {
                // 根据库类型初始化图表
                switch (libraryType) {
                    case 'echarts':
                        if (typeof echarts !== 'undefined') {
                            initECharts(container);
                        }
                        break;
                    case 'chartjs':
                        if (typeof Chart !== 'undefined') {
                            // Chart.js 初始化逻辑
                            console.log(`[图表修复] Chart.js暂不支持自动初始化`);
                        }
                        break;
                    case 'highcharts':
                        if (typeof Highcharts !== 'undefined') {
                            // Highcharts 初始化逻辑
                            console.log(`[图表修复] Highcharts暂不支持自动初始化`);
                        }
                        break;
                }
            } catch (error) {
                showError(container, `图表初始化失败: ${error.message}`);
                console.error(`[图表修复] ${libraryType} 初始化失败:`, error);
            }
        });
    }
    
    // 初始化ECharts图表
    function initECharts(container) {
        // 检查容器是否已存在ECharts实例
        if (container._echarts_instance_ || 
            (echarts.getInstanceByDom && echarts.getInstanceByDom(container))) {
            console.log(`[图表修复] 容器 ${container.id || '(无ID)'} 已有ECharts实例`);
            hideLoader(container);
            container._chartProcessed = true;
            return;
        }
        
        console.log(`[图表修复] 初始化ECharts: ${container.id || '(无ID)'}`);
        
        try {
            // 创建ECharts实例
            const chart = echarts.init(container);
            
            // 查找与此容器关联的配置对象
            const scripts = document.querySelectorAll('script:not([src])');
            let configFound = false;
            
            // 保存实例引用
            chartInstances[container.id || ('chart_' + Math.random().toString(36).substr(2, 9))] = chart;
            
            // 查找关联配置
            for (let script of scripts) {
                // 尝试找到与该容器相关的脚本
                if (container.id && script.textContent.includes(container.id) && 
                    (script.textContent.includes('echarts.init') || script.textContent.includes('option'))) {
                    
                    console.log(`[图表修复] 找到容器 ${container.id} 的配置脚本`);
                    
                    // 尝试提取option配置
                    try {
                        // 使用多种正则表达式匹配不同的声明方式
                        let optionMatch = script.textContent.match(/(?:const|let|var)?\s*option\s*=\s*({[\s\S]*?});(?:[\s\S]*?\.setOption)/);
                        
                        if (!optionMatch) {
                            optionMatch = script.textContent.match(/({[\s\S]*?tooltip[\s\S]*?series[\s\S]*?})(?:[\s\S]*?\.setOption)/);
                        }
                        
                        if (optionMatch && optionMatch[1]) {
                            console.log('[图表修复] 提取到配置对象');
                            
                            // 安全地求值提取的配置
                            try {
                                const optionCode = optionMatch[1];
                                const configFn = new Function('try { const option = ' + optionCode + '; return option; } catch(e) { console.error("配置解析错误:", e); return null; }');
                                
                                const config = configFn();
                                
                                if (config && typeof config === 'object') {
                                    console.log('[图表修复] 成功解析配置，应用到图表');
                                    chart.setOption(config);
                                    configFound = true;
                                    
                                    // 隐藏加载指示器
                                    hideLoader(container);
                                }
                            } catch (evalError) {
                                console.error('[图表修复] 配置求值错误:', evalError);
                            }
                        }
                    } catch (extractError) {
                        console.error('[图表修复] 提取配置失败:', extractError);
                    }
                }
            }
            
            // 如果没有找到配置，尝试使用全局变量
            if (!configFound && window.option && typeof window.option === 'object') {
                try {
                    console.log('[图表修复] 使用全局option变量');
                    chart.setOption(window.option);
                    configFound = true;
                    hideLoader(container);
                } catch (e) {
                    console.error('[图表修复] 使用全局option失败:', e);
                }
            }
            
            // 如果仍未找到配置，使用默认配置
            if (!configFound) {
                console.log('[图表修复] 未找到配置，应用默认饼图');
                chart.setOption({
                    tooltip: {
                        trigger: 'item',
                        formatter: '{a} <br/>{b}: {c} ({d}%)'
                    },
                    legend: {
                        orient: 'horizontal',
                        bottom: 10,
                        data: ['示例数据1', '示例数据2', '示例数据3']
                    },
                    series: [
                        {
                            name: '自动生成数据',
                            type: 'pie',
                            radius: ['40%', '70%'],
                            center: ['50%', '50%'],
                            avoidLabelOverlap: false,
                            itemStyle: {
                                borderRadius: 10,
                                borderColor: '#fff',
                                borderWidth: 2
                            },
                            label: {
                                show: true,
                                position: 'inside',
                                formatter: '{d}%',
                                fontSize: 14,
                                fontWeight: 'bold',
                                color: '#fff'
                            },
                            data: [
                                {value: 40, name: '示例数据1', itemStyle: {color: '#5470c6'}},
                                {value: 30, name: '示例数据2', itemStyle: {color: '#91cc75'}},
                                {value: 30, name: '示例数据3', itemStyle: {color: '#fac858'}}
                            ],
                            
                        }
                    ]
                });
                
                hideLoader(container);
            }
            
            // 响应窗口大小变化
            window.addEventListener('resize', function() {
                if (chart) chart.resize();
            });
            
            // 标记处理完成
            container._chartProcessed = true;
            
        } catch (error) {
            console.error(`[图表修复] ECharts初始化错误:`, error);
            showError(container, `初始化失败: ${error.message}`);
            container._chartProcessed = true;
        }
    }
    
    // 隐藏加载指示器
    function hideLoader(container) {
        if (container._chartLoader) {
            container._chartLoader.style.display = 'none';
        }
        container._chartLoading = false;
    }
    
    // 显示错误信息
    function showError(container, message) {
        // 先移除加载指示器
        if (container._chartLoader) {
            container.removeChild(container._chartLoader);
            delete container._chartLoader;
        }
        
        // 创建错误显示元素
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
        container._chartLoading = false;
    }
    
    // 启动修复程序
    init();
    
    // 暴露全局接口用于手动触发
    window.ChartFixer = {
        fix: detectAndFixCharts
    };
})(); 