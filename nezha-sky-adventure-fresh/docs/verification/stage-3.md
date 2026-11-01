# 阶段 3 动态障碍验证记录

2026-11-01；代码 0.5.0；构建 dynamic-obstacles-20261101-01。

## 实际结果

- TypeScript strict/noEmit 通过。
- 模型 30/30：原 24 项回归与新增 6 项动画验证；证据 stage-3-model-tests.txt。
- 7,744 次动画图形范围检查，包含折线厚度，全部位于稳定危险矩形内。
- 12 种场景内配对分别在最高难度下运行 60 秒自动点击物理模拟；原 20,000 次通道检查、40 局各 180 秒模拟同时回归通过。
- 动态浏览器测试 7/7：stage-3-motion-browser-results.json。
- 原障碍浏览器回归 7/7：stage-3-obstacles-browser-results.json。
- 原点击输入回归 11/11：stage-3-input-browser-results.json。
- Web Mobile / 微信小游戏构建成功（Creator 成功退出码 36）：stage-3-web-mobile-build.log、stage-3-wechatgame-build.log。
- 源码与产物摘要：stage-3-manifest.json。

## 动态画面证据

五类的 stage-3-<类型>-frame-a.png 与 frame-b.png 为同位置、不同相位的实际浏览器裁切截图，自动比较确认为真实像素变化；同样比较确认三类静态图案像素不变。全 12 种组合检查了几何未随动画改变。

完整截图 stage-3-sky-7.png（火球/雷电）、stage-3-sky-8.png（火球/风火轮）、stage-3-dragon-2.png（水球/海底妖怪）及 stage-3-mobile.png，已做视觉检查。指定组合和摆放位置仅用于验证展示；正常开局仍按主题随机生成。

真实引擎时钟检查确认水平移动伴随动画，不改变中心高度、宽度或净空；暂停及引擎 hide/show 事件冻结，明确继续后恢复且不跳到后台经过后的相位；结束冻结，重开归零并复用相同四个 InteriorMotion 节点。雷电暗相仍发生相同碰撞。

## 测试开发与诊断

初次测试统计总采样数写错，修正为实际 7,744；另一次在未聚焦画布的新页面直接发空格，命令未进入游戏，改用真实鼠标点击起飞后完成引擎时钟检查。stage-3-motion-failure.png 保留为测试诊断，最终 JSON 均无 failure 字段。未因此改动游戏控制方式。

输入回归中 favicon 404 与 CDP 合成 touchcancel 的 preventDefault 提示为已知非阻断警告，没有未处理脚本错误。

## 验收边界

阶段 3 使用代码矢量临时动画。主体、边框始终可见，内部图案不能当作完整碰撞轮廓。正式绘本风角色/背景/障碍素材仍待阶段 4；人工体验、微信开发者工具加载、微信真实前后台、真机性能未验收，微信构建暂用 touristappid。物理模拟时间不等于实际设备运行时长。详细说明见工作区 docs/动态障碍.md。
