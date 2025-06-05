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
    const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
    try {
        previewDoc.open();
        previewDoc.write(finalHtml);
        previewDoc.close();
    } catch (e) {
        console.error("Error writing to iframe:", e);
        // Fallback for some environments or if write is blocked
        previewFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(finalHtml);
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