// 设置页脚本
// 职责：读取与保存动态类型（type），支持 all/video/pgc/article，并提示保存状态

const STORAGE_KEYS = {
  FEED_TYPE: "feed_type"
};

/**
 * 更新状态文本
 * @param {string} text 文本内容
 */
function setStatus(text) {
  const el = document.getElementById("status");
  el.textContent = text;
}

/**
 * 从存储读取当前动态类型，并渲染到下拉框
 */
async function restoreSavedType() {
  const select = document.getElementById("feedType");
  const obj = await chrome.storage.local.get(STORAGE_KEYS.FEED_TYPE);
  const current = obj[STORAGE_KEYS.FEED_TYPE] || "all";
  select.value = current;
  setStatus(`当前类型：${current}`);
}

/**
 * 将选择的动态类型保存到存储，并提示
 */
async function saveType() {
  const select = document.getElementById("feedType");
  const value = select.value;
  await chrome.storage.local.set({ [STORAGE_KEYS.FEED_TYPE]: value });
  setStatus("已保存，后台会按新类型刷新数据");
}

/**
 * 初始化事件绑定与默认值
 */
function initOptions() {
  const select = document.getElementById("feedType");
  select.addEventListener("change", saveType);
  restoreSavedType();
}

// 初始化
initOptions();