# 阶段 2 障碍系统验证记录

2026-11-01；0.4.0；构建 obstacles-20261101-01。

## 实际结果

- TypeScript strict/noEmit：通过。
- 模型测试：24/24；见 stage-2-model-tests.txt。
- 障碍浏览器测试：7/7；见 stage-2-browser-results.json。
- 点击输入回归：11/11；见 stage-2-input-browser-results.json。
- Web Mobile 和微信小游戏构建：通过，见 stage-2-web-mobile-build.log / stage-2-wechatgame-build.log；Creator 构建退出码 36。
- 来源和产物摘要：stage-2-manifest.json。

## 覆盖范围

8 类型、12 场景内配对全部覆盖，两场景真实键盘各通过两组并计分；20,000 次通道约束检查、40 局各 180 秒点击模型模拟；100 分浏览器模型快进检查后仍为相同四个显示节点。模拟时间及模型快进不代表真机长时间测试。验证了场景变化时名称与底色更新、单次计分、完整越过、碰撞优先、暂停冻结、重开归零以及 390×844 触摸布局。

截图：stage-2-sky-ready.png、stage-2-sky-playing.png、stage-2-dragon-ready.png、stage-2-dragon-playing.png、stage-2-result.png、stage-2-mobile.png。输入回归截图使用 stage-2-input- 前缀。

## 测试修复记录

- 重开时清除图形缓存，避免池槽位 generation 重置后沿用旧主题绘制。
- 浏览器首次按键后等待一个固定步再读模型，避免读取尚未消费的命令；首次同步失败截图 stage-2-browser-failure.png 为历史诊断，不是最终结果。
- 回归警告仅为 favicon.ico 404 和 CDP 合成 touchcancel 的 preventDefault 提示；无未处理脚本错误。

## 验收边界

这是阶段 2 灰盒玩法交付；正式背景、障碍动画、角色美术、音频和最高分分别在后续阶段。人工手感、微信开发者工具实际加载、微信真机运行和性能未验证；构建暂用 touristappid，不把构建成功当作实机通过。详细参数及复现步骤见工作区 docs/障碍系统.md。
