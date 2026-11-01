# 第一版运行美术原图

本目录用于阶段 4 及当前 0.6.1 接入，使用内置 imagegen 制作并保留原图。背景沿用工作区此前由 imagegen 生成的两张场景画，新增角色、纵向障碍和两种透明景物层。完整提示词见 generation_prompts.json；选用文件、尺寸、哈希及运行帧矩形见 asset_manifest.json。

| 文件 | 用途 |
| --- | --- |
| nezha_motion_atlas_v2.png | 0.6.0 的历史候选；当前不使用 |
| nezha_motion_atlas.png | **当前实际选用**，用户指定的原圆脸形象；四动作各4帧 |
| obstacle_column_atlas.png | 山峰/石柱/火球/水球，以及乌云/雷电/风火轮/海底妖怪，4×2 纵向图集 |
| sky_background.png / dragon_background.png | 两场景全幅远景 |
| sky_foreground.png / dragon_foreground.png | 透明中近景景物层，运行时分层复用 |

运行拷贝在项目 assets/resources/art；其中 nezha_motion_atlas.png 当前直接复制本目录的同名原图。不要根据同名猜测源版本，应以清单中的 selectedProductionSource 和 SHA-256 为准。

图集不通过重画或人工涂抹切分，Cocos SpriteFrame 以矩形引用独立帧。角色名义身体锚点 (0.56, 0.44)、名义132尺寸，按每帧源矩形使用统一像素倍率计算实际尺寸和锚点，实际身体仍采用半径 28 的宽容圆形碰撞，飘带、火焰和武器装饰不扩大主体。

阶段 4 接入和运行检查完成不代表正式发布、真机性能或商业授权审查已通过。保存提示词、原图和版本记录用于后续美术迭代；替换障碍图时必须重新生成 alpha 碰撞表并回归。

## 当前选用变更（0.6.1）

以上“v2实际选用”是0.6.0历史记录。用户现已指定原圆脸形象，**当前实际选用 nezha_motion_atlas.png 原图**；v2仅保留为历史候选。hero_selection.json 是准备脚本的选择入口，asset_manifest.json 反映当前哈希和帧矩形。原图不变；脚本依据实际透明间隙引用，逐帧尺寸/锚点使用同一源像素倍率，不再机械等分裁切。
