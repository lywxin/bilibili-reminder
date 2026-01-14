// 背景脚本（Service Worker）
// 负责：
// 1）周期获取动态更新数 update_num 并在扩展图标上显示徽标
// 2）处理图标点击：直接打开 https://t.bilibili.com/ 并尝试重置基线

const UPDATE_API = "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all/update";
const FEED_API = "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all";
const DYNAMIC_HOME = "https://t.bilibili.com/";
// 徽标配色（亮色主题）
const BADGE_COLORS = {
  default: "#93C5FD",      // 浅蓝（Tailwind blue-300 近似）
  hasUpdates: "#ffbcbc",   // 浅红
  notAvailable: "#DADADA", // 浅灰（未登/不可用）
  error: "#FBD38D"         // 浅黄（异常）
};
// 徽标配色（暗色主题，提供更佳对比度）
const BADGE_COLORS_DARK = {
  default: "#2563EB",      // 深蓝（blue-600）
  hasUpdates: "#EF4444",   // 红（red-500）
  notAvailable: "#6B7280", // 灰（gray-500）
  error: "#F59E0B"         // 橙（amber-500）
};
const STORAGE_KEYS = {
  FEED_TYPE: "feed_type",
  BASELINE_PREFIX: "update_baseline_",
  DARK_MODE: "dark_mode"
};

/**
 * 获取当前配置的动态类型(type)，默认 'all'
 * @returns {Promise<string>} 返回 'all' | 'video' | 'pgc' | 'article'
 */
async function getFeedType() {
  const obj = await chrome.storage.local.get(STORAGE_KEYS.FEED_TYPE);
  return obj[STORAGE_KEYS.FEED_TYPE] || "all";
}

/**
 * 生成当前类型对应的基线存储key
 * @param {string} type 动态类型
 * @returns {string} 存储key
 */
function getBaselineKey(type) {
  return STORAGE_KEYS.BASELINE_PREFIX + type;
}

/**
 * 设置扩展图标徽标文本和颜色
 * @param {string} text 徽标文本，例如 '0'、'99+'、'!' 等
 * @param {string} color 背景色，如 '#FF4D4F'
 */
async function setBadge(text, color = BADGE_COLORS.default) {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
}

// Chrome 会自动使用高对比的徽标文字颜色；我们仅切换徽标背景色

/**
 * 清除扩展图标徽标
 * 说明：当 update_num 为 0 时不显示徽标。
 */
async function clearBadge() {
  await chrome.action.setBadgeText({ text: "" });
}

/**
 * 读取暗色模式标记
 * @returns {Promise<boolean>} 是否暗色模式
 */
async function getDarkModeFlag() {
  const obj = await chrome.storage.local.get(STORAGE_KEYS.DARK_MODE);
  return Boolean(obj[STORAGE_KEYS.DARK_MODE]);
}

/**
 * 获取当前应使用的徽章配色
 * @returns {Promise<Record<string,string>>} 配色对象
 */
async function getBadgePalette() {
  const isDark = await getDarkModeFlag();
  return isDark ? BADGE_COLORS_DARK : BADGE_COLORS;
}

/**
 * 获取当前动态列表以提取 update_baseline（作为后续 update_num 比较基线）
 * @returns {Promise<string|null>} 返回基线字符串，失败则为 null
 */
async function fetchUpdateBaseline(type) {
  try {
    const url = new URL(FEED_API);
    url.searchParams.set("type", type);
    const res = await fetch(url.toString(), { credentials: "include" });
    const json = await res.json();
    if (json && json.code === 0 && json.data && json.data.update_baseline) {
      return String(json.data.update_baseline);
    }
    return null;
  } catch (e) {
    console.error("fetchUpdateBaseline error", e);
    return null;
  }
}

/**
 * 从 storage 获取或初始化 update_baseline
 * @returns {Promise<string|null>} baseline 字符串或 null
 */
async function ensureBaseline(type) {
  const key = getBaselineKey(type);
  const stored = (await chrome.storage.local.get(key))[key];
  if (stored) return stored;
  const baseline = await fetchUpdateBaseline(type);
  if (baseline) {
    await chrome.storage.local.set({ [key]: baseline });
    return baseline;
  }
  return null;
}

/**
 * 根据 baseline 获取 update_num（新增动态数量）
 * @param {string} baseline 之前的基线值
 * @returns {Promise<number|null>} 更新数量，失败为 null
 */
async function fetchUpdateNum(baseline, type) {
  try {
    const url = new URL(UPDATE_API);
    url.searchParams.set("type", type);
    url.searchParams.set("update_baseline", baseline);
    const res = await fetch(url.toString(), { credentials: "include" });
    const json = await res.json();
    if (json && json.code === 0 && json.data && typeof json.data.update_num === "number") {
      return json.data.update_num;
    }
    if (json && json.code === -101) {
      // 未登录
      return null;
    }
    return null;
  } catch (e) {
    console.error("fetchUpdateNum error", e);
    return null;
  }
}

/**
 * 主流程：根据接口数据更新扩展图标徽标
 * 说明：根据暗色模式切换徽章背景配色（由内容脚本写入存储）。
 * @returns {Promise<void>} 无返回值
 */
async function checkAndUpdateBadge() {
  const palette = await getBadgePalette();
  const type = await getFeedType();
  const baseline = await ensureBaseline(type);
  if (!baseline) {
    await setBadge("!", palette.notAvailable); // 可能未登录或接口不可用
    return;
  }
  const num = await fetchUpdateNum(baseline, type);
  if (num == null) {
    await setBadge("!", palette.error);
    return;
  }
  if (num === 0) {
    await clearBadge(); // 为 0 时不显示徽标
    return;
  }
  const text = num > 99 ? "99+" : String(num);
  await setBadge(text, palette.hasUpdates);
}

/**
 * 打开（或切换至）B 站动态首页，并更新基线为当前
 * 行为：
 * - 优先查找已打开的目标页（https://t.bilibili.com/?tab=<type>），存在则切换焦点；
 * - 仅当扩展徽章显示更新数 > 0（基于当前基线计算）时刷新该标签页；
 * - 若不存在目标页，则新建标签页并打开目标地址；
 * - 无论是否新建，都在后台拉取最新 baseline 并写入存储，然后刷新徽章。
 * 说明：根据当前配置的动态类型，在 URL 上携带 `tab` 参数（包括 `all`）。
 * @returns {Promise<void>} 无返回值
 */
async function openDynamicPageAndResetBaseline() {
  const type = await getFeedType();
  const targetUrl = new URL(DYNAMIC_HOME);
  targetUrl.searchParams.set("tab", type);

  // 在切换前判断是否需要刷新：仅当更新数 > 0 时刷新
  let shouldReload = false;
  try {
    const currentBaseline = await ensureBaseline(type);
    if (currentBaseline) {
      const num = await fetchUpdateNum(currentBaseline, type);
      if (typeof num === "number" && num > 0) {
        shouldReload = true;
      }
    }
  } catch (e) {
    console.error("pre-check update_num error", e);
  }

  // 查找是否已有同类型的动态页标签在打开
  let targetTab = null;
  try {
    const tabs = await chrome.tabs.query({ url: DYNAMIC_HOME + "*" });
    for (const t of tabs) {
      if (!t.url) continue;
      try {
        const u = new URL(t.url);
        if (u.origin === targetUrl.origin && u.pathname === targetUrl.pathname) {
          const tabParam = u.searchParams.get("tab") || "all";
          if (tabParam === type) {
            targetTab = t;
            break;
          }
        }
      } catch (_) {
        // 忽略无法解析的 URL
      }
    }
  } catch (e) {
    console.error("chrome.tabs.query error", e);
  }

  if (targetTab) {
    // 已存在目标页：切换焦点到该窗口和标签
    try {
      await chrome.windows.update(targetTab.windowId, { focused: true });
      await chrome.tabs.update(targetTab.id, { active: true });
      // 仅当存在未读更新时刷新页面，避免无意义刷新
      if (shouldReload) {
        try {
          await chrome.tabs.reload(targetTab.id, { bypassCache: true });
        } catch (e) {
          console.error("reload existing dynamic tab error", e);
        }
      }
    } catch (e) {
      console.error("focus existing dynamic tab error", e);
    }
  } else {
    // 不存在则新建目标页标签
    await chrome.tabs.create({ url: targetUrl.toString() });
  }

  // 重置基线为当前，并刷新徽章
  const key = getBaselineKey(type);
  const newBaseline = await fetchUpdateBaseline(type);
  if (newBaseline) {
    await chrome.storage.local.set({ [key]: newBaseline });
  }
  await checkAndUpdateBadge();
}

/**
 * 初始化 alarms 定时任务，每 60 秒刷新一次徽标数据
 */
function initAlarms() {
  chrome.alarms.create("refresh_update_num", { periodInMinutes: 1 });
}

// 安装与启动时刷新一次徽标
chrome.runtime.onInstalled.addListener(async () => {
  initAlarms();
  await checkAndUpdateBadge();
});
chrome.runtime.onStartup.addListener(async () => {
  initAlarms();
  await checkAndUpdateBadge();
});

// 定时刷新
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "refresh_update_num") {
    await checkAndUpdateBadge();
  }
});

/**
 * 图标点击逻辑：
 * - 直接打开 t.bilibili.com 并尝试重置基线（登录与否由站点自行处理）
 */
chrome.action.onClicked.addListener(async () => {
  await openDynamicPageAndResetBaseline();
});

/**
 * 监听设置变更：当 feed_type 改变时，刷新徽标并按新类型维护基线
 */
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local" && changes[STORAGE_KEYS.FEED_TYPE]) {
    await checkAndUpdateBadge();
  }
  // 当暗色模式标记变化时，刷新徽章以切换配色
  if (area === "local" && changes[STORAGE_KEYS.DARK_MODE]) {
    await checkAndUpdateBadge();
  }
});

// 暗色模式由内容脚本基于 matchMedia 检测并写入 storage