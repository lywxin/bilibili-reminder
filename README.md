# Bilibili 动态提醒（Chrome MV3 扩展）

一个轻量的浏览器扩展，在工具栏徽章显示你关注的 UP 动态新增数量，一键直达 B 站动态页（`t.bilibili.com`）。

> 声明：本项目为第三方开源扩展，与哔哩哔哩官方无关；请遵守 B 站服务条款与相关法律法规。

---

## 目录
- 项目简介
- 功能特性
- 原理说明
- 权限说明
- 安装与使用（Windows/Chromium）
- 隐私与安全
- 目录结构
- 开发指南
- 常见问题（FAQ）
- 隐私权政策
- 贡献与致谢

---

## 项目简介
- 目标：在不打扰的前提下，让你在浏览器内快速看到 UP 动态是否有更新，并一键进入查看。
- 特点：无需账号密码输入，依赖你在浏览器中的登录态；最小化数据、仅本地存储必要状态；暗色模式自适应徽章配色。

## 功能特性
- 图标徽章显示新增数量；`>99` 时显示 `99+`，为 `0` 时隐藏徽章。
- 状态颜色自适应：根据系统/页面暗色模式切换徽章背景色；不可用或异常时显示 `!`。
- 一键直达动态页：点击扩展图标打开 `t.bilibili.com/?tab=<type>`，并在查看后重置基线以确保后续提醒准确。
- 动态类型设置：在扩展“选项”页选择 `all`/`video`/`pgc`/`article`。
- 定时刷新：每 60 秒拉取一次更新数（最小周期，避免过度轮询）。

## 原理说明
- 后台 Service Worker 周期调用 B 站 Polymer 动态接口：
  - `GET https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all`（获取 `update_baseline`）
  - `GET https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all/update`（获取 `update_num`）
- 内容脚本监听 `prefers-color-scheme`，将暗色模式标志写入本地存储以供徽章配色切换。
- 通过 `chrome.storage.local` 保存必要状态（类型偏好、基线、暗色标志），不上传服务器、不跨设备同步。

## 权限说明
| 权限 | 用途 | 说明 |
|---|---|---|
| `storage` | 保存类型偏好与基线、暗色标志 | 仅本地存储，不上传 |
| `alarms` | 每 60s 定时刷新更新数 | 限速，避免过度轮询 |
| `tabs`/`activeTab` | 查找/激活/创建动态页标签 | 不读取页面内容 |
| `host_permissions` (`https://*.bilibili.com/*`) | 访问 B 站接口与页面 | 仅限定官方域名 |

## 安装与使用（Windows/Chromium）
1. 克隆或下载本仓库到本地。
2. 打开 Chrome（或基于 Chromium 的浏览器，如 Edge）：
   - 访问 `chrome://extensions`（Edge 为 `edge://extensions`）。
   - 开启“开发者模式”。
   - 点击“加载已解压的扩展程序”，选择本仓库中的 `code` 目录（包含 `manifest.json`）。
3. 固定扩展图标到工具栏（可选）。
4. 登录 B 站（确保浏览器已具备登录态）。
5. 在扩展“详情”页或右键菜单打开“选项”，选择动态类型（`all`/`video`/`pgc`/`article`）。
6. 观察图标徽章：有更新显示数字，异常或不可用显示 `!`，为 `0` 时不显示。
7. 点击扩展图标进入 `t.bilibili.com` 对应动态页。

## 隐私与安全
- 本扩展不收集、不上传个人身份信息；所有数据仅保存在本地 `chrome.storage.local`。
- 网络请求仅面向 B 站官方域名；请求通过浏览器 `credentials: include` 自动携带登录态 Cookie，扩展不读取、不存储 Cookie 内容。
- 详细请参见隐私权政策：`docs/Privacy_Policy.md`。

## 目录结构
```
// Directory tree (3 levels)

├── icons
├── manifest.json
└── src
    ├── background.js
    ├── content.js
    ├── options.html
    └── options.js
```

## 开发指南
- 技术栈：Chrome MV3、原生 JavaScript、`fetch` with credentials。
- 快速开始：
  - 直接修改 `src/*`，在 `chrome://extensions` 中点击“重新加载”应用变更。
  - 调试后台脚本：在扩展详情页打开 Service Worker 的“检查视图”。
  - 调试内容脚本：打开任一页面并打开 DevTools Console 查看日志。
- 代码风格：推荐使用 JSDoc 风格函数注释与清晰的命名。

## 常见问题（FAQ）
- 徽章不显示？为 `0` 时不显示；或接口不可用/未登录时显示 `!`。
- 一直显示 `!`？可能未登录、Cookie 失效或接口异常；点击图标进入动态页后重置基线通常可恢复。
- 数字不更新？等待下一次 60s 刷新或手动点击图标（查看后会重置基线）。
- 暗色模式未生效？确保系统或页面支持 `prefers-color-scheme`；内容脚本会在页面注入后写入 `dark_mode` 标识。

## 隐私权政策
- 隐私权政策：`docs/Privacy_Policy.md`

## 贡献与致谢
- 欢迎通过 Issue/PR 参与改进；建议从修复问题、优化性能与体验入手。
- 如涉及接口或合规建议，可在 Issue 中讨论并共同维护。
- 感谢开源社区与 B 站官方接口的稳定支持。

---

> 提醒：本扩展为学习与非商业用途示例。使用时请遵守 B 站及浏览器扩展平台政策。
