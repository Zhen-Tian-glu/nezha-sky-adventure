# 0.6.3 两场景覆盖修复

2026-11-01；构建 theme-cycle-fix-20261101-01。

修复前确认两套源图、ImageAsset UUID及切换逻辑有效；真实按钮12局中可见两场景，也记录到连续5局同主题。独立随机抽样允许长串重复，可能造成另一背景迟迟不出现的体验。

正常开局改为每两局一组的随机轮换袋，组内天宫/龙宫各一次。组边界仍可能连续两局相同，但不会连续三局相同。袋仅限当前运行实例，跨应用重启不保存；指定主题或种子的调试不会消耗正常轮换。

TypeScript strict/noEmit通过，模型43/43，包括新轮换与seed+theme回放几何测试；原输入、动态、通道和最高难度通行同时回归通过。

真实开始/失败/重开按钮12局通过：sky/dragon/dragon/sky/dragon/sky/dragon/sky/sky/dragon/dragon/sky，两个场景各6局。逐局检查当前背景ImageAsset、6份景物、场景标签及合法障碍配置，没有依赖指定主题调试来证明正常开局。截图theme-063-sky.png与theme-063-dragon.png已查看，两套实际背景正常。

Web Mobile和微信小游戏目标构建成功，日志theme-063-*-build.log；完整序列、逐局资源ID和错误检查见theme-063-browser-results.json，修复前对照theme-063-baseline.json，摘要theme-063-manifest.json。原哪吒、动态效果、净空和水平间距规则保留。微信工具和真机仍待原计划验收。
