/**
 * 编辑器环境专用图表修复脚本
 * 解决在Material HTML编辑器预览中的图表问题
 * V1.1 - 生产环境优化版
 */
(function() {
    // 检查全局配置
    if (!window.__CHART_FIXER_CONFIG__) {
        window.__CHART_FIXER_CONFIG__ = {
            enabled: true,
            isEditor: true,
            debug: false,
            supportedLibraries: ['echarts', 'highcharts', 'chart.js', 'plotly'],
            version: '1.0.0'
        };
    }
    
    // 使用全局配置中的调试设置
    const useDebug = window.__CHART_FIXER_CONFIG__.debug;
    
    // 日志函数
    function log(message, type = 'log') {
        if (useDebug) {
            console[type](`[编辑器图表修复] ${message}`);
        }
    }
    
    log('脚本已加载');
    
    // 检查是否禁用了图表修复
    if (window.__CHART_FIXER_CONFIG__.enabled === false) {
        log('图表修复已被全局禁用，跳过修复流程', 'warn');
        return;
    }
    
    // 兼容旧版禁用标记
    if (window.__DISABLE_CHART_FIXER__) {
        log('图表修复已被禁用(旧版标记)，跳过修复流程', 'warn');
        return;
    }
    
    // 保存原始的echarts对象
    let originalECharts = window.echarts;
    
    // 修复echarts.init方法
    if (window.echarts && window.echarts.init) {
        const originalInit = window.echarts.init;
        
        window.echarts.init = function(dom, theme, opts) {
            try {
                // 首先检查是否已经有图表实例，如果有则直接返回该实例
                if (dom && typeof dom.getAttribute === 'function') {
                    try {
                        const existingInstance = originalECharts.getInstanceByDom(dom);
                        if (existingInstance) {
                            console.log('[编辑器图表修复] 容器已有图表实例，直接返回');
                            return existingInstance;
                        }
                    } catch (e) {
                        // 忽略错误
                    }
                    
                    // 检查容器内部是否已有图表元素
                    const hasCanvas = dom.querySelector('canvas');
                    const hasSvg = dom.querySelector('svg');
                    if (hasCanvas || hasSvg) {
                        console.log('[编辑器图表修复] 容器已有图表元素，跳过重新初始化');
                        // 返回一个模拟的图表对象，避免重复初始化
                        return {
                            setOption: function(option) { 
                                console.log('[编辑器图表修复] 跳过已存在图表的setOption调用'); 
                                return this;
                            },
                            resize: function() { return this; },
                            dispose: function() { return this; },
                            getWidth: function() { return dom.clientWidth; },
                            getHeight: function() { return dom.clientHeight; },
                            getDom: function() { return dom; },
                            getOption: function() { return {}; },
                            on: function() { return this; },
                            off: function() { return this; }
                        };
                    }
                }
                
                // 检查dom是否有效
                if (!dom || typeof dom.getAttribute !== 'function') {
                    console.warn('[编辑器图表修复] 无效的DOM元素，尝试查找替代容器');
                    
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
                    setOption: function() { console.log('[编辑器图表修复] 模拟setOption调用'); return this; },
                    resize: function() { console.log('[编辑器图表修复] 模拟resize调用'); return this; },
                    dispose: function() { console.log('[编辑器图表修复] 模拟dispose调用'); return this; },
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
    
    // 注入常用的缺失函数
    function injectCommonFunctions() {
        // 为产品类别提供颜色映射
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
        
        // 格式化数字
        if (typeof window.formatNumber === 'undefined') {
            window.formatNumber = function(num) {
                return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
            };
            console.log('[编辑器图表修复] 已注入formatNumber函数');
        }
    }
    
    // 修复DOMContentLoaded事件处理
    function fixDOMContentLoaded() {
        // 如果页面已经加载完成，但图表脚本在DOMContentLoaded中
        if (document.readyState !== 'loading') {
            // 查找所有脚本
            const scripts = document.querySelectorAll('script:not([src])');
            scripts.forEach(script => {
                const content = script.textContent || '';
                if (content.includes('DOMContentLoaded') && content.includes('echarts.init')) {
                    console.log('[编辑器图表修复] 找到DOMContentLoaded中的图表初始化代码，尝试执行');
                    try {
                        // 提取并执行DOMContentLoaded事件处理程序 - 修复正则表达式
                        const match = content.match(/DOMContentLoaded[^{]*{([\s\S]*?)}\)/);
                        if (match && match[1]) {
                            const fixedCode = `
                                try {
                                    ${match[1]}
                                } catch(e) {
                                    console.error('[编辑器图表修复] 执行初始化代码时出错:', e);
                                }
                            `;
                            setTimeout(() => {
                                new Function(fixedCode)();
                                console.log('[编辑器图表修复] 已执行DOMContentLoaded中的代码');
                            }, 500);
                        }
                    } catch (e) {
                        console.error('[编辑器图表修复] 提取初始化代码失败:', e);
                    }
                }
            });
        }
    }
    
    // 修复window.onload事件处理
    function fixWindowOnload() {
        // 查找所有脚本
        const scripts = document.querySelectorAll('script:not([src])');
        scripts.forEach(script => {
            const content = script.textContent || '';
            if ((content.includes('window.onload') || content.includes('window.addEventListener(\'load\'')) && 
                content.includes('echarts.init')) {
                console.log('[编辑器图表修复] 找到window.onload中的图表初始化代码，尝试执行');
                try {
                    // 提取并执行onload事件处理程序
                    const match = content.match(/window\.onload\s*=\s*function[^{]*{([\s\S]*?)}/);
                    const match2 = content.match(/window\.addEventListener\(['"']load['"'][^{]*{([\s\S]*?)}\);/);
                    
                    let codeToExecute = '';
                    if (match && match[1]) {
                        codeToExecute = match[1];
                    } else if (match2 && match2[1]) {
                        codeToExecute = match2[1];
                    }
                    
                    if (codeToExecute) {
                        const fixedCode = `
                            try {
                                ${codeToExecute}
                            } catch(e) {
                                console.error('[编辑器图表修复] 执行onload代码时出错:', e);
                            }
                        `;
                        setTimeout(() => {
                            new Function(fixedCode)();
                            console.log('[编辑器图表修复] 已执行window.onload中的代码');
                        }, 800);
                    }
                } catch (e) {
                    console.error('[编辑器图表修复] 提取onload代码失败:', e);
                }
            }
        });
    }
    
    // 主函数
    function init() {
        // 注入常用函数
        injectCommonFunctions();
        
        // 修复事件处理
        setTimeout(() => {
            fixDOMContentLoaded();
            fixWindowOnload();
        }, 300);
        
        // 监听DOM变化
        setupMutationObserver();
    }
    
    // 设置DOM变动观察器
    function setupMutationObserver() {
        if (!window.MutationObserver) {
            console.warn('[编辑器图表修复] 浏览器不支持MutationObserver');
            return;
        }
        
        const observer = new MutationObserver((mutations) => {
            let needsCheck = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 如果添加了图表容器元素
                            if (node.id && (node.id.includes('chart') || node.id.includes('Chart'))) {
                                needsCheck = true;
                                break;
                            }
                            
                            // 检查添加的元素中是否有图表容器
                            const chartContainers = node.querySelectorAll('[id*="chart"], [class*="chart"]');
                            if (chartContainers.length > 0) {
                                needsCheck = true;
                                break;
                            }
                        }
                    }
                    if (needsCheck) break;
                }
            }
            
            if (needsCheck) {
                console.log('[编辑器图表修复] 检测到DOM变化，重新检查图表');
                setTimeout(() => {
                    fixDOMContentLoaded();
                    fixWindowOnload();
                }, 500);
            }
        });
        
        // 监听整个文档
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
        
        console.log('[编辑器图表修复] DOM变动监听已启动');
    }
    
    // 自动初始化
    init();
    
    // 暴露接口
    window._editorChartFix = {
        init: init,
        injectCommonFunctions: injectCommonFunctions,
        fixDOMContentLoaded: fixDOMContentLoaded,
        fixWindowOnload: fixWindowOnload
    };
})(); 