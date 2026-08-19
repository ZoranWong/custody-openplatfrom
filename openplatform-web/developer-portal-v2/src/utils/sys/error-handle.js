const IGNORABLE_SCRIPT_ERRORS = [
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded'
];
function normalizeErrorMessage(message) {
    if (typeof message === 'string') {
        return message;
    }
    if ('message' in message && typeof message.message === 'string') {
        return message.message;
    }
    return '';
}
function isIgnorableScriptError(message, source) {
    const normalizedMessage = normalizeErrorMessage(message);
    if (!normalizedMessage) {
        return false;
    }
    if (IGNORABLE_SCRIPT_ERRORS.some((item) => normalizedMessage.includes(item))) {
        // 浏览器/扩展在布局抖动时常见的 ResizeObserver 噪声，不作为真实异常处理
        return true;
    }
    // 浏览器扩展注入脚本偶发的跨域 Script error 也没有排查价值
    if (normalizedMessage === 'Script error.' && source === '') {
        return true;
    }
    return false;
}
/**
 * Vue 运行时错误处理
 */
export function vueErrorHandler(err, instance, info) {
    console.error('[VueError]', err, info, instance);
    // 这里可以上报到服务端，比如：
    // reportError({ type: 'vue', err, info })
}
/**
 * 全局脚本错误处理
 */
export function scriptErrorHandler(message, source, lineno, colno, error) {
    if (isIgnorableScriptError(message, source)) {
        return true;
    }
    console.error('[ScriptError]', { message, source, lineno, colno, error });
    // reportError({ type: 'script', message, source, lineno, colno, error })
    return true; // 阻止默认控制台报错，可根据需求改
}
/**
 * Promise 未捕获错误处理
 */
export function registerPromiseErrorHandler() {
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[PromiseError]', event.reason);
        // reportError({ type: 'promise', reason: event.reason })
    });
}
/**
 * 资源加载错误处理 (img, script, css...)
 */
export function registerResourceErrorHandler() {
    window.addEventListener('error', (event) => {
        const target = event.target;
        if (target &&
            (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
            console.error('[ResourceError]', {
                tagName: target.tagName,
                src: target.src ||
                    target.src ||
                    target.href
            });
            // reportError({ type: 'resource', target })
        }
    }, true // 捕获阶段才能监听到资源错误
    );
}
/**
 * 安装统一错误处理
 */
export function setupErrorHandle(app) {
    app.config.errorHandler = vueErrorHandler;
    window.onerror = scriptErrorHandler;
    registerPromiseErrorHandler();
    registerResourceErrorHandler();
}
//# sourceMappingURL=error-handle.js.map