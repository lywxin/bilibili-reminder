// 内容脚本：检测系统/页面暗色模式，并写入扩展存储
// 作用范围：注入到 bilibili 站点页面，监听暗色模式变化

const STORAGE_KEYS = {
  DARK_MODE: "dark_mode"
};

/**
 * 检测当前是否为暗色模式并写入存储
 * @returns {Promise<void>} 无返回值
 */
async function detectAndSetDarkMode() {
  try {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    await chrome.storage.local.set({ [STORAGE_KEYS.DARK_MODE]: isDark });
  } catch (e) {
    // 在极少数环境下可能没有 storage 权限或 API 异常
    console.error('detectAndSetDarkMode error', e);
  }
}

/**
 * 初始化暗色模式监听，当系统主题变化时更新存储
 * @returns {void} 无返回值
 */
function initDarkModeListener() {
  if (!window.matchMedia) return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = async (ev) => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.DARK_MODE]: ev.matches });
    } catch (e) {
      console.error('initDarkModeListener set error', e);
    }
  };
  // 兼容旧浏览器与新规范
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', handler);
  } else if (typeof mq.addListener === 'function') {
    mq.addListener(handler);
  }
}

/**
 * 主入口：初始化并进行一次检测
 * @returns {void} 无返回值
 */
function main() {
  initDarkModeListener();
  // 首次注入时写入一次当前值
  detectAndSetDarkMode();
}

main();