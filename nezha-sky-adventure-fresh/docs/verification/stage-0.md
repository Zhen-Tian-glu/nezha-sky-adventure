# 阶段 0 工程基线验证记录

历史快照：当前工程已进入阶段 1，最新验证见 stage-1.md 与 stage-1-manifest.json。

日期：2026-10-31；构建编号：baseline-20261031-01。

## 判定

工程配置、场景导入与重新保存、严格类型检查、Web Mobile 实际画面验证及微信目标构建通过。微信开发者工具加载未通过，因此按主计划完整验收，阶段 0 尚有一项外部工具运行验证待完成；不标记为全项完成。没有开始阶段 1 飞行、障碍、计分开发。

## 固定配置

- 项目标识：nezha-sky-adventure；版本 0.1.0。
- 目录：D:/codex_workspace/哪吒今天不闹海/nezha-sky-adventure-fresh。沿用既有目录，不创建另一个副本。
- Creator：3.8.8；微信工具已安装版本：2.02.2609240。
- 主场景：assets/scenes/game.scene；保留原场景 UUID，目录迁移不重建资源身份。
- 设计分辨率：750×1334；fitWidth=true、fitHeight=false；更长竖屏扩展可见高度。
- 2D 物理：Builtin Physics2D；TypeScript strict=true，noEmit=true，skipLibCheck=true（跳过引擎声明文件检查，项目源码仍严格检查）。

## 实际验证

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| Creator 导入与重开 | 通过，编辑器显示 game.scene 和基础文字 | creator-reopen.jpg；资源 .meta |
| 编辑器保存 | 通过；保存后再次以该源码构建 | 场景文件、构建日志、baseline-manifest.json |
| TypeScript noEmit | 通过，退出码 0 | scripts/typecheck.ps1 |
| Web Mobile 构建 | 通过，Creator 退出码 36 | web-mobile-build.log |
| 750×1334 Web 运行 | 通过，场景 game、设计尺寸正确、标题可见 | baseline-750x1334.png、browser-results.json |
| 390×844 Web 运行 | 通过，设计宽度不变，扩展可见高度 | baseline-390x844.png、browser-results.json |
| 微信小游戏构建 | 通过，Creator 退出码 36，game.json 为 portrait | wechatgame-build.log、build/wechatgame |
| 微信开发者工具加载 | 待完成；CLI 提示服务端口关闭，新 CLI 返回等待用户授权 | wechat-tool-status.txt |
| 微信真机 | 未测试；不能用桌面 Chrome 截图代替真机结果 | 待账号、AppID 与设备条件 |

浏览器验证没有场景或脚本运行错误；首次访问 favicon.ico 返回 404，仅为浏览器图标请求，记录为非阻断提示。截图中的 FPS 来自桌面调试环境，不能作为手机性能验收结果。

目录体积和源码哈希见 baseline-manifest.json；这是未压缩目录体积，不等于微信上传后的主包计费或分包体积。当前未做包体优化。

## 微信后续条件

当前构建配置使用 touristappid 占位，未使用模板示例 AppID 冒充用户账号。需确认可用的微信开发者工具启动、服务端口或工具授权，并导入 build/wechatgame；真机预览及上传通常需要用户自己的小游戏 AppID 和账号权限。未提供前不把这些项目标为通过。

## 复现

1. Creator 3.8.8 打开工程，等待导入并打开 assets/scenes/game.scene。
2. 关闭编辑器，运行 scripts/build.ps1 -Platform web-mobile 和 scripts/typecheck.ps1。
3. 运行 python -m http.server 8765 --bind 127.0.0.1 --directory build/web-mobile。
4. 浏览器打开 http://127.0.0.1:8765；验证脚本 scripts/verify-web.cjs 可通过 PLAYWRIGHT_MODULE_PATH 指定 Playwright 安装位置，通过 BASELINE_URL 覆盖验证地址。
5. scripts/build.ps1 -Platform wechatgame 生成微信产物，工具加载与真机结果另行记录。

.gitignore 和 .editorconfig 已配置；没有自动执行 git init，也没有删除旧项目或用户文件。
