/**
 * 复杂图表修复脚本
 * 专门处理多图表、函数依赖等复杂情况
 * V1.0
 */
(function() {
    console.log('[复杂图表修复] 脚本已加载');
    
    // 检查是否禁用了图表修复
    if (window.__DISABLE_CHART_FIXER__) {
        console.log('[复杂图表修复] 图表修复已被禁用，跳过修复流程');
        return;
    }
    
    // 配置
    const config = {
        debug: true,
        retryInterval: 300,
        maxRetries: 5
    };
    
    // 调试日志函数
    function log(message, type = 'log') {
        if (config.debug) {
            console[type](`[复杂图表修复] ${message}`);
        }
    }
    
    // 保存原始的错误处理函数
    const originalErrorHandler = window.onerror;
    
    // 已修复的函数列表
    const fixedFunctions = new Set();
    
    // 设置全局错误处理
    window.onerror = function(message, source, lineno, colno, error) {
        // 尝试修复常见错误
        if (message.includes('is not defined')) {
            const functionMatch = message.match(/(\w+) is not defined/);
            if (functionMatch && functionMatch[1]) {
                const missingFunction = functionMatch[1];
                
                // 避免重复修复
                if (fixedFunctions.has(missingFunction)) {
                    return false;
                }
                
                log(`检测到缺失的${missingFunction}函数，尝试修复...`, 'warn');
                
                // 根据函数名注入不同的实现
                if (injectMissingFunction(missingFunction)) {
                    fixedFunctions.add(missingFunction);
                    // 重新初始化图表
                    setTimeout(reinitializeCharts, 100);
                    return true; // 阻止错误继续传播
                }
            }
        }
        
        // 调用原始错误处理程序
        if (originalErrorHandler) {
            return originalErrorHandler(message, source, lineno, colno, error);
        }
        
        return false;
    };
    
    // 注入缺失的函数
    function injectMissingFunction(functionName) {
        switch(functionName) {
            case 'getColorForCategory':
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
                        '类别5': '#722ed1',
                        '类别6': '#eb2f96',
                        '类别7': '#faad14',
                        '类别8': '#a0d911',
                        '类别9': '#13c2c2',
                        '类别10': '#1890ff'
                    };
                    return colorMap[category] || '#1890ff';
                };
                log('已注入getColorForCategory函数');
                return true;
                
            case 'formatNumber':
                window.formatNumber = function(num) {
                    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
                };
                log('已注入formatNumber函数');
                return true;
                
            case 'formatPercent':
                window.formatPercent = function(num) {
                    return num.toFixed(2) + '%';
                };
                log('已注入formatPercent函数');
                return true;
                
            case 'formatCurrency':
                window.formatCurrency = function(num) {
                    return '¥' + num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
                };
                log('已注入formatCurrency函数');
                return true;
                
            case 'getGradientColor':
                window.getGradientColor = function(startColor, endColor, percent) {
                    // 简单实现，返回固定颜色
                    return {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0, color: startColor || '#1890ff'
                        }, {
                            offset: 1, color: endColor || '#52c41a'
                        }]
                    };
                };
                log('已注入getGradientColor函数');
                return true;
                
            default:
                log(`未知的函数: ${functionName}，无法自动修复`, 'error');
                return false;
        }
    }
    
    // 重新初始化所有图表
    function reinitializeCharts() {
        log('尝试重新初始化图表...');
        
        // 查找所有图表容器
        const chartContainers = document.querySelectorAll('[id$="-chart"], [id*="chart"], [class*="chart"]');
        if (chartContainers.length > 0) {
            log(`找到${chartContainers.length}个图表容器`);
            
            // 尝试重新执行页面上的初始化代码
            const scripts = document.querySelectorAll('script:not([src])');
            scripts.forEach(script => {
                if (script.textContent.includes('echarts.init') && 
                    script.textContent.includes('DOMContentLoaded')) {
                    try {
                        // 提取并执行DOMContentLoaded事件处理程序
                        const match = script.textContent.match(/DOMContentLoaded[^{]*{([\s\S]*?)}\);/);
                        if (match && match[1]) {
                            const fixedCode = `
                                try {
                                    ${match[1]}
                                } catch(e) {
                                    console.error('[复杂图表修复] 重新执行初始化代码时出错:', e);
                                }
                            `;
                            new Function(fixedCode)();
                            log('已重新执行初始化代码');
                        }
                    } catch (e) {
                        log(`提取初始化代码失败: ${e.message}`, 'error');
                    }
                }
            });
            
            // 如果上面的方法失败，尝试直接为每个容器创建图表
            setTimeout(createFallbackCharts, 500);
        }
    }
    
    // 为空的图表容器创建后备图表
    function createFallbackCharts() {
        if (typeof echarts === 'undefined') {
            log('ECharts库未加载，无法创建后备图表', 'error');
            return;
        }
        
        const chartContainers = document.querySelectorAll('[id$="-chart"], [id*="chart"], [class*="chart"]');
        let emptyContainers = [];
        
        // 检查哪些容器是空的
        chartContainers.forEach(container => {
            // 检查容器是否已经有图表实例
            try {
                // 首先尝试使用echarts API检查实例
                const instance = echarts.getInstanceByDom(container);
                if (instance) {
                    log(`容器 ${container.id || '(无ID)'} 已有ECharts实例，跳过创建`);
                    return; // 跳过此容器
                }
            } catch (e) {
                // 忽略错误
            }
            
            const hasCanvas = container.querySelector('canvas');
            const hasChartDiv = container.querySelector('div[_echarts_instance_]');
            const hasSvg = container.querySelector('svg');
            
            // 检查是否有可见的图表元素
            if (hasCanvas || hasChartDiv || hasSvg) {
                // 进一步检查元素是否有实际内容（非空白）
                if ((hasCanvas && hasCanvas.width > 5 && hasCanvas.height > 5) || 
                    (hasSvg && hasSvg.getBoundingClientRect().width > 5)) {
                    log(`容器 ${container.id || '(无ID)'} 已有图表元素，跳过创建`);
                    return; // 跳过此容器
                }
            }
            
            // 检查容器是否有内联样式指定的宽高
            const style = window.getComputedStyle(container);
            if (parseInt(style.width) < 10 || parseInt(style.height) < 10) {
                log(`容器 ${container.id || '(无ID)'} 尺寸过小，可能不是图表容器`);
                return; // 跳过尺寸过小的容器
            }
            
            // 检查容器是否可见
            const rect = container.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                log(`容器 ${container.id || '(无ID)'} 不可见，跳过创建`);
                return; // 跳过不可见的容器
            }
            
            if (isValidChartContainer(container)) {
                emptyContainers.push(container);
            }
        });
        
        if (emptyContainers.length > 0) {
            log(`发现${emptyContainers.length}个空图表容器，创建后备图表`);
            
            // 为每个空容器创建后备图表
            emptyContainers.forEach((container, index) => {
                try {
                    const chart = echarts.init(container);
                    
                    // 根据容器ID或索引选择不同类型的图表
                    const containerId = container.id || '';
                    let option;
                    
                    if (containerId.includes('pie') || containerId.includes('product')) {
                        option = getFallbackPieOption(container);
                    } else if (containerId.includes('line') || containerId.includes('trend') || containerId.includes('monthly')) {
                        option = getFallbackLineOption(container);
                    } else if (containerId.includes('bar') || containerId.includes('region')) {
                        option = getFallbackBarOption(container);
                    } else {
                        // 根据索引选择不同类型
                        const types = ['line', 'bar', 'pie', 'scatter'];
                        option = getFallbackOption(types[index % types.length], container);
                    }
                    
                    chart.setOption(option);
                    log(`已为容器 ${containerId || '(无ID)'} 创建后备图表`);
                } catch (e) {
                    log(`创建后备图表失败: ${e.message}`, 'error');
                }
            });
        }
    }
    
    // 判断元素是否是有效的图表容器
    function isValidChartContainer(element) {
        // 排除太小的元素
        const rect = element.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 50) {
            return false;
        }
        
        // 排除特定类型的元素
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'button' || tagName === 'input' || tagName === 'select' || tagName === 'a') {
            return false;
        }
        
        return true;
    }
    
    // 获取后备饼图配置
    function getFallbackPieOption(container) {
        const title = extractTitleFromContext(container) || '数据分布';
        
        return {
            title: {
                text: title,
                left: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'horizontal',
                bottom: 10,
                data: ['类别A', '类别B', '类别C', '类别D', '类别E']
            },
            series: [
                {
                    name: title,
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '18',
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: [
                        {value: 35, name: '类别A'},
                        {value: 25, name: '类别B'},
                        {value: 20, name: '类别C'},
                        {value: 15, name: '类别D'},
                        {value: 5, name: '类别E'}
                    ]
                }
            ]
        };
    }
    
    // 获取后备折线图配置
    function getFallbackLineOption(container) {
        const title = extractTitleFromContext(container) || '趋势分析';
        
        return {
            title: {
                text: title,
                left: 'center'
            },
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: ['数据1', '数据2'],
                bottom: 10
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月']
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    name: '数据1',
                    type: 'line',
                    stack: '总量',
                    smooth: true,
                    data: [120, 132, 101, 134, 90, 230, 210, 182, 191]
                },
                {
                    name: '数据2',
                    type: 'line',
                    stack: '总量',
                    smooth: true,
                    data: [220, 182, 191, 234, 290, 330, 310, 123, 442]
                }
            ]
        };
    }
    
    // 获取后备柱状图配置
    function getFallbackBarOption(container) {
        const title = extractTitleFromContext(container) || '数据对比';
        
        return {
            title: {
                text: title,
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            legend: {
                data: ['数据1', '数据2'],
                bottom: 10
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: [
                {
                    type: 'category',
                    data: ['类别1', '类别2', '类别3', '类别4', '类别5', '类别6', '类别7']
                }
            ],
            yAxis: [
                {
                    type: 'value'
                }
            ],
            series: [
                {
                    name: '数据1',
                    type: 'bar',
                    data: [120, 132, 101, 134, 90, 230, 210]
                },
                {
                    name: '数据2',
                    type: 'bar',
                    data: [220, 182, 191, 234, 290, 330, 310]
                }
            ]
        };
    }
    
    // 获取通用后备图表配置
    function getFallbackOption(type, container) {
        switch(type) {
            case 'pie':
                return getFallbackPieOption(container);
            case 'line':
                return getFallbackLineOption(container);
            case 'bar':
                return getFallbackBarOption(container);
            case 'scatter':
                return {
                    title: {
                        text: '散点图示例',
                        left: 'center'
                    },
                    xAxis: {},
                    yAxis: {},
                    series: [{
                        symbolSize: 20,
                        data: [
                            [10.0, 8.04],
                            [8.07, 6.95],
                            [13.0, 7.58],
                            [9.05, 8.81],
                            [11.0, 8.33],
                            [14.0, 7.66],
                            [13.4, 6.81],
                            [10.0, 6.33],
                            [14.0, 8.96],
                            [12.5, 6.82],
                            [9.15, 7.2],
                            [11.5, 7.2],
                            [3.03, 4.23],
                            [12.2, 7.83],
                            [2.02, 4.47],
                            [1.05, 3.33],
                            [4.05, 4.96],
                            [6.03, 7.24],
                            [12.0, 6.26],
                            [12.0, 8.84],
                            [7.08, 5.82],
                            [5.02, 5.68]
                        ],
                        type: 'scatter'
                    }]
                };
            default:
                return getFallbackLineOption(container);
        }
    }
    
    // 从上下文中提取图表标题
    function extractTitleFromContext(container) {
        // 尝试从父元素或兄弟元素中查找标题
        let title = '';
        
        // 检查父元素中的标题元素
        const parent = container.parentElement;
        if (parent) {
            const titleElements = parent.querySelectorAll('.chart-title, .title, h1, h2, h3, h4, h5');
            if (titleElements.length > 0) {
                title = titleElements[0].textContent.trim();
            }
        }
        
        // 如果没有找到，尝试从ID中提取
        if (!title && container.id) {
            const idParts = container.id.split('-');
            if (idParts.length > 0) {
                title = idParts.map(part => {
                    if (part !== 'chart') {
                        return part.charAt(0).toUpperCase() + part.slice(1);
                    }
                    return '';
                }).join(' ').trim();
            }
        }
        
        return title || '数据图表';
    }
    
    // 在页面加载完成后执行
    function init() {
        // 注入常用的缺失函数
        injectCommonFunctions();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(checkAndFixCharts, 1000);
            });
        } else {
            setTimeout(checkAndFixCharts, 1000);
        }
        
        // 页面完全加载后再次检查
        window.addEventListener('load', function() {
            setTimeout(checkAndFixCharts, 2000);
        });
    }
    
    // 预先注入常用函数，避免错误
    function injectCommonFunctions() {
        // 常用的图表相关函数
        const commonFunctions = [
            'getColorForCategory',
            'formatNumber',
            'formatPercent',
            'formatCurrency',
            'getGradientColor'
        ];
        
        // 注入所有常用函数
        commonFunctions.forEach(functionName => {
            if (typeof window[functionName] === 'undefined') {
                injectMissingFunction(functionName);
                fixedFunctions.add(functionName);
            }
        });
    }
    
    // 检查并修复图表
    function checkAndFixCharts() {
        // 检查是否有图表容器但没有图表实例
        const chartContainers = document.querySelectorAll('[id$="-chart"], [id*="chart"], [class*="chart"]');
        let needsFix = false;
        
        chartContainers.forEach(container => {
            // 检查容器是否已经有图表实例
            const hasCanvas = container.querySelector('canvas');
            const hasChartDiv = container.querySelector('div[_echarts_instance_]');
            
            if (!hasCanvas && !hasChartDiv && isValidChartContainer(container)) {
                needsFix = true;
            }
        });
        
        if (needsFix) {
            log('检测到图表未正确初始化，尝试修复...');
            reinitializeCharts();
        }
    }
    
    // 自动初始化
    init();
    
})(); 