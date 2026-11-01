# 哪吒今天不闹海

项目 nezha-sky-adventure，当前版本 0.6.3；正式开发目录 nezha-sky-adventure-fresh。阶段 4 已接入运行美术，构建 theme-cycle-fix-20261101-01。

## 试玩

在本目录执行 `python -m http.server 8765 --bind 127.0.0.1 --directory build/web-mobile`，打开 http://127.0.0.1:8765/?version=0.6.3 。若服务已运行，刷新即可。

点击开始，再点击玩法区域起飞；后续每次新点击提供一次向上速度，长按不连发。鼠标单击或轻按空格也可控制。每局随机天宫/龙宫，完整通过一组 +1，碰撞结束；约 0.42 秒受击反馈后可以重开。暂停/继续不触发起飞。

已接入哪吒四动作各 4 帧、两套绘制背景、中近景视差、8 类绘制障碍、纸色金边界面及五类丰富动态。角色半径 28 的主体参与碰撞，飘带和武器是装饰；障碍使用图片 alpha 轮廓，不使用隐藏矩形。动画只改变装饰，雷光暗下仍危险。

## 工程与资源

Creator 3.8.8，TypeScript strict/noEmit，750×1334 竖屏基线，短屏整套玩法等比缩放。入口 assets/scenes/game.scene，沿用 GrayboxGame 组件的 UUID 以保持场景引用。运动与轮廓碰撞由独立模型计算，不叠加刚体重力。

原图和来源在工作区 game_assets/production/v1；运行拷贝在 assets/resources/art。角色运行文件 nezha_motion_atlas.png 当前直接来自用户指定的同名原图，由 hero_selection.json 锁定，选用清单和提示词见原图目录。`python scripts/prepare-art.py` 重新生成运行拷贝、ArtManifest 和 ObstacleMasks，需要 Pillow；换图后必须重新验证碰撞。

## 构建与验证

关闭本项目 Creator 实例后，运行 scripts/typecheck.ps1、scripts/test-graybox.ps1，以及 scripts/build.ps1 -Platform web-mobile / wechatgame。

Web 服务启动后串行执行：

```powershell
node scripts/verify-production-art.cjs
$env:VERIFICATION_PREFIX = 'stage-4-obstacles'
node scripts/verify-obstacles.cjs
$env:VERIFICATION_PREFIX = 'stage-4-input'
node scripts/verify-stage-2-input.cjs
```

可用 PLAYWRIGHT_MODULE_PATH 指定 Playwright，GRAYBOX_URL 指定地址。报告在 docs/verification/stage-4-*。阶段 3 的 verify-obstacle-motion.cjs 用于旧临时矢量表现，不代表当前正式图片验收。

微信产物 build/wechatgame 暂用 touristappid。微信工具加载、真机运行与发布包体/帧率/内存仍待验收，不能把构建成功等同于实机通过。当前未接入音频、最高分存档与完整首页流程，分别在后续阶段完成。

命名：目录小写英文，脚本 PascalCase，图片小写下划线；.meta 随源码保留，library/temp/build 为生成目录。完整说明见工作区 docs/正式素材接入.md 及本项目 docs/verification/stage-4.md。

## 0.6.1 当前修订

已按用户指定恢复原圆脸哪吒。hero_selection.json 选择 production/v1/nezha_motion_atlas.png；前文 v2 选择仅为阶段4原始交付记录。通过透明间隙划分帧矩形，并按同一源像素倍率和身体基准显示，16帧不拉伸、不裁切金圈主体。

相邻通道净空至少相差40，初始范围340～420，后期收紧到240～320，首组395～420。速度保持原上限255，屏幕中现有通道不实时收缩。最新说明见工作区 docs/角色与难度调整.md；验证使用 tuning-061-* 前缀。可用 VERIFICATION_PREFIX 指定各验证脚本输出前缀，避免覆盖历史证据。

## 0.6.2 动态与水平间距

云层/海草视差、光尘/气泡/水流更明显，火球/水球伸缩、风火轮/妖怪摆动、雷电明暗变化，渲染与alpha碰撞共享实际姿态。上下安全净空及原哪吒不变，前后水平距离新增随机并逐档收紧；实际仍受安全时间约束。最新说明见工作区 docs/动态表现与水平间距调整.md。

动态专项运行 `node scripts/verify-scene-motion.cjs`，新证据使用 motion-062-*；原美术/障碍脚本可设置 VERIFICATION_PREFIX 输出独立回归报告。

## 0.6.3 场景覆盖修复

正常游玩改为每两局一组、组内随机顺序出现天宫和龙宫，避免长期独立抽样重复。每局主题固定，背景/景物/环境动态及障碍配置同步。指定主题和种子的验证不影响正常轮换。真实按钮连续开局验证：`node scripts/verify-theme-cycle.cjs`，报告theme-063-*。
