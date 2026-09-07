---
title: A_Large_Machine
order: 4
---

# A_Large_Machine — 超大多方块机器（gzr）

本文演示一台**超大规模**的多方块机器。gzr 没有专属配方文件——它演示的是 KubeJS 端**如何用扁平式 API 写出几百行 patterns 的巨型多方块结构**。代码直接对应 `example/startup_scripts/A_Large_Machine.js` 与 `example/server_scripts/structure/A_Large_Machine.js` 两个文件。

## 概览

A_Large_Machine 与前面所有示例的关键差异在于**结构尺寸**：

- [A_Simple_Machine](A_Simple_Machine)：3 × 3 × 3 = 27 个字符。
- [A_BlockState_Machine](A_BlockState_Machine)：9 z 层 × 8 y 行 × 130 列 ≈ 9000 个字符，但很多位置用空格"不校验"。
- A_Large_Machine：约 200 z 层 × 19 y 行 × 130+ 列 ≈ **200000+** 个字符，结构文件本身就有 **427 行**。

它演示的不是新 API，而是 MMCR 处理**大规模扁平结构**时的实战模式：

- 大量使用空格（`' '`）让"空白"位不校验方块，便于玩家在巨型结构里钻洞、放临时装饰。
- 每个字符对应**精确**的方块或方块状态——任何摆错的小细节都会导致整体结构失配。
- `.controller('C')` 仍在 200+ 层结构的某处，但通过**固定位置的 `C` 字符**让玩家精确定位。
- 整个结构只声明一次 `.pattern(...)`，没有 `.mainStructure(...)` + `.expandStructure(...)` 阶段——这是扁平式 API 在巨型结构上的可行性验证。

## 本教程涉及的文件

| 文件 | 阶段 | 注册对象 |
| --- | --- | --- |
| `example/startup_scripts/A_Large_Machine.js` | `MMCREvents.startup` | 机器定义 |
| `example/server_scripts/structure/A_Large_Machine.js` | `MMCREvents.server` | 多方块结构（巨型扁平） |

gzr 没有专属的 `example/server_scripts/recipe/A_Large_Machine.js`——这是有意为之；教程重点是结构尺寸与状态匹配，不是配方。

## 本教程涉及的 API 跳转表

- 启动期：[MMCRStartupEventJS](../API/KubeJS#mmcrstartupeventjs) · [MachineBuilderJS](../API/KubeJS#machinebuilderjs)
- 结构期：[MMCRServerEventJS](../API/KubeJS#mmcrservereventjs) · [MachineStructureBuilderJS](../API/KubeJS#machinestructurebuilderjs)
- 结构谓词：[KubeJSApi.block](../API/KubeJS#kubejsapi) · [KubeJSApi.state](../API/KubeJS#kubejsapi) · [KubeJSApi.anyOfItemInput](../API/KubeJS#kubejsapi) · [KubeJSApi.anyOfEnergyInput](../API/KubeJS#kubejsapi)
- 配方（不涉及）：[MachineRecipeSchema](../API/KubeJS#machinerecipeschema)

## 机器定义

打开 [A_Large_Machine.js（启动期）](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/A_Large_Machine.js)：

```js
MMCREvents.startup(event => {
    const builder = event
        .createMachine("mmcr_kubejs:gzr")
        .displayNameKey("machine.mmcr_kubejs.gzr")
        .recipeFamily("mmcr_kubejs:gzr");

    builder.register()
})
```

机器定义非常简短——三件事：

- `.createMachine("mmcr_kubejs:gzr")`：注册 ID。
- `.displayNameKey("machine.mmcr_gzr.gzr")`：本地化键。
- `.recipeFamily("mmcr_kubejs:gzr")`：配方族 ID，与机器自身 ID 相同。详见 [MachineBuilderJS.recipeFamily](../API/KubeJS#machinebuilderjs)。

没有 `.appearance(...)`、没有 `.allowMultithreading()`、没有 `.expandableStructure(true)`。这是一台**简单机器加上巨型结构**的组合——机器定义阶段没有任何特殊属性，重头戏全在结构阶段。

启动期窗口不可热加载，修改 `.js` 后必须重启游戏。

## 多方块结构

打开 [A_Large_Machine.js（结构阶段）](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/A_Large_Machine.js)：

```js
MMCREvents.server(event => {

    const api = event.getAPI()
    event.createStructure("mmcr_kubejs:gzr")

    .pattern("AAAA…(130 个 A)AAAA", "         BDE         ", "          D          ", …)
    .pattern("AXXXX…(130 个 X)XXXA", "          L          ", …)
    // …… 共 ~200 个 pattern 调用，每个都是 19 行字符串 ……
    .pattern("AXXX…XXXA", "         …         ", "         …         ", "         …         ", …)

    .set('从', api.block('minecraft:glowstone'))
    .set('仏', api.state('minecraft:andesite_stairs[facing=east,half=top,shape=inner_right,waterlogged=false]'))
    // …… 共 ~300 个 .set(...) 调用，覆盖 A、B、C、D、E、…、Z、a、b、…、z，以及汉字字符 ……
    .set('A', api.anyOf(
        api.block('minecraft:deepslate_bricks'),
        api.anyOfItemInput(),
        api.anyOfItemOutput(),
        api.anyOfEnergyInput()
    ))
    .controller('C')

    .build()
})
```

`MMCREvents.server(event => {...})` 回调里的 `event` 是 [MMCRServerEventJS](../API/KubeJS#mmcrservereventjs)；`event.getAPI()` 返回 [KubeJSApi](../API/KubeJS#kubejsapi)。`event.createStructure(...)` 返回 [MachineStructureBuilderJS](../API/KubeJS#machinestructurebuilderjs)。

### 几个关键观察

1. **扁平式 API**：`event.createStructure(...)` 后面直接 `.pattern(...)` × N，没有 `.mainStructure(...)` / `.expandStructure(...)` 包装。详见 [MachineStructureBuilderJS.pattern](../API/KubeJS#machinestructurebuilderjs)。KubeJS 集成层在 `.build()` 时内部自动调用 `fullStructure`，所以扁平写法在大型结构上依然合法。
2. **字符集超宽**：从 ASCII `A~Z`、`a~z`、`0~9` 一直延伸到汉字字符——每个字符对应**精确**的方块或方块状态。这意味着结构文件本身就是一个"调色板"——看到某个字符就知道对应哪个方块。
3. **空格 `' '` 大规模使用**：每行 130+ 列里经常出现连续几十个空格，让该位置不校验任何方块。MMCR 把空格视为 `api.air()`，玩家可以在那里放临时方块、穿过结构内部、做装饰。
4. **字符 `A` 是外壳与端口的并集**：与 [A_Simple_Machine](A_Simple_Machine) 的 `X` 字符类似，但本机器的外壳完全用 `A` 而不是 `X`。原文 `.set('A', api.anyOf(api.block('minecraft:deepslate_bricks'), api.anyOfItemInput(), api.anyOfItemOutput(), api.anyOfEnergyInput()))`。
5. **字符 `C` 是控制器**：在 ~200 层结构的某一固定位置出现。玩家必须把这个位置上的方块替换为控制器方块，结构才会成型。

`.build()` 终结构建并提交。

## 配方

gzr 没有 `example/server_scripts/recipe/A_Large_Machine.js`。这是有意为之——它的教学目的是**展示巨型扁平结构的可读性与精度**，不是配方系统。

如果需要为 gzr 添加配方，写法与 [A_Simple_Machine](A_Simple_Machine) 完全相同：

```js
ServerEvents.recipes(event => {
    event.custom({
        type: 'mmcr:machine_recipe',
        machine: 'mmcr_kubejs:gzr',
        tick_time: 600,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:iron_block', count: 64 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:diamond_block', count: 1 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 1024 }
        ]
    }).id('mmcr_kubejs:gzr_demo')
})
```

字段含义详见 [MachineRecipeSchema](../API/KubeJS#machinerecipeschema)。

## 特殊机制：超大扁平结构

gzr 与前面所有示例的差异不在 API 上——**没有引入任何新的方法**。它的特殊之处在于**结构尺寸与精度的极端组合**：

### `api.block(...)` 与 `api.state(...)` 的精确调度

gzr 的模式字符大多用 `api.state(...)` 精确匹配——这是**唯一可行**的做法，因为 200000+ 个位置里只要有一处状态写错，结构就根本无法成型。具体地：

- 楼梯：`api.state('minecraft:andesite_stairs[facing=east,half=top,shape=inner_right,waterlogged=false]')`。
- 栅栏：`api.state('minecraft:white_stained_glass_pane[east=true,north=false,south=true,waterlogged=false,west=false]')`。
- 围栏门：`api.state('minecraft:pale_oak_fence_gate[facing=west,in_wall=true,open=true,powered=true]')`。
- 墙：`api.state('minecraft:polished_tuff_wall[east=low,north=none,south=low,up=true,waterlogged=false,west=none]')`。

参考 [KubeJSApi.state](../API/KubeJS#kubejsapi)：任何属性名未知、属性值无效都会抛 `IllegalArgumentException`。

### 巨型结构的可读性技巧

由于 `.pattern(...)` × 200 看起来像"天书"，gzr 的编写采用了几个技巧来提高可读性：

- **同一 z 层跨多 y 行**：每个 `.pattern(...)` 接收 `String...`，所以单次调用可以传入 19 个 y 行；每行宽度一致、用空格"跳过"空白位。这样开发者能用编辑器在 ~200 层 × 19 行 的二维网格里搜索方块位置。
- **统一调色板**：每个字符对应一个固定的方块或方块状态；查找方块时只在 `.set(...)` 段搜。
- **空格的语义化**：空格不是"忘了写"——它就是"该位置不校验"。本机器大量使用空格给玩家预留自由发挥的空间，比如结构内部的临时平台、装饰块、穿过的玻璃窗。

### 为什么不用分组结构

[A_Group_Machine](A_Group_Machine) 的 `mainStructure` + `expandStructure` 也支持大尺寸结构，但分组结构要求玩家"必须从 mainStructure 开始叠加"。对于像 gzr 这样**没有"基本段"概念**的巨型机器（它本身就是一个整体，不能拆成可叠加的段），扁平式 API 是更直接的选择。

详见 [MachineStructureBuilderJS](../API/KubeJS#machinestructurebuilderjs) 的阶段式与扁平式对比。

### 为什么没有 `.mainStructure(...)` 包装

扁平式 API 与阶段式 API 不能混用。gzr 选择扁平式的原因有二：

- 它**没有可扩展形态**——`expandableStructure(true)` 在启动期没有调用。
- 它的结构是**单一方块集合**——所有方块共同决定形态；没有"基础段 vs 扩展段"的语义区分。

如果你确实需要"基础段 + 扩展段"，请用阶段式 API；如果你需要"一个完整的扁平结构"，扁平式 API 就可以。

## 与其他教程的对比

### 对比 A_Simple_Machine / A_BlockState_Machine / A_Group_Machine

| 维度 | A_Simple_Machine | A_BlockState_Machine | A_Group_Machine | A_Large_Machine |
| --- | --- | --- | --- | --- |
| 结构尺寸 | 3 × 3 × 3 = 27 字符 | ~9000 字符（含空格） | ~200 字符 × 3 段 | ~200000+ 字符 |
| 结构文件行数 | 22 行 | 61 行 | 76 行 | 427 行 |
| API 风格 | 扁平式 | 扁平式 + `api.state(...)` | 阶段式 `mainStructure + expandStructure` | 扁平式 + `api.state(...)` |
| 状态精度 | `api.block(...)` 全部 | 全部 `api.state(...)` | `api.block(...)` 全部 | 全部 `api.state(...)` |
| 配方文件 | 有 | 有 | 有 | 无 |

gzr 与 [A_BlockState_Machine](A_BlockState_Machine) 都用 `api.state(...)`——它们演示的是同一种谓词在**不同尺寸**下的可行性。区别在于 A_BlockState_Machine 关心"楼梯朝向对不对"，gzr 关心"200000+ 个位置里有没有一个摆错"。

gzr 与 [A_Group_Machine](A_Group_Machine) 都涉及"结构尺寸大"——但 A_Group_Machine 用**分组**把大结构拆成 main + N×expand；gzr 把大结构**整个放在一个扁平 pattern 链**里。两者没有优劣，只有适合场景不同。

### 对比 Java 端 BLAST_FURNACE

Java 版的 [BLAST_FURNACE](../JavaAPI/BLAST_FURNACE) 结构只有 27 个字符，根本谈不上"巨型"。但 MMCR 的 Java API 在结构尺寸上是**无差别对待**的——`pattern(layer -> p.layer(...).where(...).controller(...))` 写法和 KubeJS 一样可以任意拉长。

gzr 的存在**反向证明了 KubeJS 集成层的可行性**——KubeJS 脚本能写出几百行 patterns 不爆栈、不超时、可被 MMCR 解析，恰好说明扁平式 API 在大尺寸下的稳定性。

## 小结

A_Large_Machine 演示了两件事：

1. **扁平式 API 在大尺寸结构上依然可用**——几百行 `.pattern(...)` 不会让集成层出错。
2. **巨型结构的关键是精度**——`api.state(...)` 是唯一可行的写法；空格是"该位置不校验"的明确信号。

接下来可以阅读 [A_Vertical_Machine](A_Vertical_Machine) 看控制器朝向与旋转对称的开关；或回到 [A_Simple_Machine](A_Simple_Machine) 复习最基础的扁平式 API。
