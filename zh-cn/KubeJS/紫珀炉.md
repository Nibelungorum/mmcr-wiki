---
title: A_Smart_Machine
order: 9
---

# A_Smart_Machine — 智能接口系统（紫珀炉）

本文演示 MMCR 的 **Smart Interface 系统**：把机器的某些参数（耗时、能耗、并行上限等）与一个"可被外部调节的接口值"绑定，接口值由玩家通过结构上的特定方块位动态设置。代码对应 [Java 端的 PURPUR_FURNACE](../JavaAPI/PURPUR_FURNACE)。

## 机器简介

`A_Smart_Machine` 由三个文件组成：

- `example/startup_scripts/A_Smart_Machine.js` — 注册 `kubejs_purpur_furnace` 机器，定义两个智能接口（`kubejs_mode`、`kubejs_conversation`），并把它们的值映射到机器的能耗和耗时。
- `example/server_scripts/structure/A_Smart_Machine.js` — 一个 8×8×8 的多方块结构，包含两个智能接口块（用 `api.smartInterface()` 谓词识别）。
- `example/server_scripts/recipe/A_Smart_Machine.js` — 三条配方，每条用 `mmcr:smart_interface` 类型的需求条目把接口值锁定在某个范围内。

Smart Interface 与 Modifier、Level 的区别：

| 系统 | 调节方式 | 调节方 | 调节粒度 |
| --- | --- | --- | --- |
| Modifier | 摆方块 | 玩家（手动） | 配方运行时叠加 |
| Level | 摆线圈方块 | 玩家（受等级槽位约束） | 配方运行时叠加 |
| Smart Interface | 设置接口值 | 玩家 / 自动化 / 网络消息 | 配方选择期 + 运行时 |

Smart Interface 既影响"配方是否被选中"（按 `min_value`/`max_value` 过滤），又影响"配方运行时如何修饰"（按 `durationByInterface(...)` 等映射函数）。

## 本教程涉及的文件

| 文件 | 阶段 | 角色 |
| --- | --- | --- |
| `example/startup_scripts/A_Smart_Machine.js` | `MMCREvents.startup` | 注册机器 + 定义智能接口 + 绑定接口值到机器参数 |
| `example/server_scripts/structure/A_Smart_Machine.js` | `MMCREvents.server` | 在结构字符上识别智能接口块 |
| `example/server_scripts/recipe/A_Smart_Machine.js` | `ServerEvents.recipes` | 三条数据驱动配方，按接口值范围选择 |

## 本教程涉及的 API 跳转表

| KubeJS API | 文档位置 |
| --- | --- |
| `MachineBuilderJS.smartInterface(...)` / `.shareSmartInterface()` / `.XxxByInterface(...)` | [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) |
| `SmartInterfaceTypeBuilderJS` | [API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs) |
| `KubeJSApi.smartInterface()` / `.smartInterfaceInput(...)` / `.smartInterfaceOutput(...)` | [API/KubeJS#kubejsapi](../API/KubeJS#kubejsapi) |
| `MachineRecipeBuilderJS.smartInterfaceInput(...)` / `.smartInterfaceOutput(...)` | [API/KubeJS#machinerecipebuilderjs](../API/KubeJS#machinerecipebuilderjs) |
| `MachineRecipeSchema` 字段 `type: 'mmcr:smart_interface'` | [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) |
| `SmartInterfaceEvents` | [API/KubeJS#smartinterfaceevents](../API/KubeJS#smartinterfaceevents) |
| `SmartInterfaceUpdateEventJS` | [API/KubeJS#smartinterfaceupdateeventjs](../API/KubeJS#smartinterfaceupdateeventjs) |

## 机器定义详解（`MMCREvents.startup`）

打开 [A_Smart_Machine.js（启动期）](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/A_Smart_Machine.js)：

```js
// Use the smart interface system to control machine parameters.

MMCREvents.startup(event => {

    const builder = event
        .createMachine("mmcr_kubejs:kubejs_purpur_furnace")
        .displayNameKey("machine.mmcr_kubejs.kubejs_purpur_furnace")
        .recipeFamily("mmcr_kubejs:kubejs_purpur_furnace")
        .allowParallelism()
        .maxParallelAmount(32)
        .appearance('minecraft:end_stone_bricks')
        .runningSound('minecraft:block.furnace.fire_crackle')
        .finishSound('minecraft:entity.ender_dragon.growl')
        // Register a smart interface.
        .smartInterface('kubejs_mode', 1, 3).priority(1).valueType('integer').end()
        .smartInterface('kubejs_conversation', 0, 1).priority(0).valueType('float').end()
        // After end(), machine parameters can be modified according to the interface value.
        .energyByInterface('kubejs_mode', 1, 2, 1.0, 2.0)
        .energyByInterface('kubejs_mode', 2, 3, 2.0, 4.0)
        .durationByInterface('kubejs_conversation', 0, 0.5, 1.0, 1.5)
        .durationByInterface('kubejs_conversation', 0.5, 1, 1.5, 2.5)

    builder.register()
})
```

### `.smartInterface(type, min, max)` 注册一个智能接口

```js
.smartInterface('kubejs_mode', 1, 3)
```

链式调用的入口，返回 [`SmartInterfaceTypeBuilderJS`](../API/KubeJS#smartinterfacetypebuilderjs)——一个临时内部构建器，必须用 `.end()` 回到父 `MachineBuilderJS`。

参数：

| 参数 | 含义 |
| --- | --- |
| `type` | 接口类型名。机器定义内全局唯一；同名重复会在 `register()` 阶段抛异常。 |
| `min` / `max` | 接口值的合法范围。整数类型还要求最值和默认值是整数。 |

`smartInterface(type, default)` 重载：只指定一个值（作为默认值与最小值），最大值为 `Float.MAX_VALUE`。

### `SmartInterfaceTypeBuilderJS` 的链式调用

```js
.smartInterface('kubejs_mode', 1, 3).priority(1).valueType('integer').end()
```

三个临时方法（[API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs)）：

| 方法 | 默认值 | 作用 |
| --- | --- | --- |
| `.priority(int)` | `0` | 接口优先级。同一类型多个接口方块绑定到同一台机器时，机器取优先级最高的那个。 |
| `.valueType(String)` | `'float'` | 接口值类型。可选 `'float'` / `'int'` / `'integer'`（不区分大小写）。`null` 或空白回退到 `FLOAT`。 |
| `.end()` | — | 关闭当前接口定义，回到父 `MachineBuilderJS`。**必须调用**。 |

顺序任意，多余调用以最后一次为准。本教程：`kubejs_mode` priority = 1、integer；`kubejs_conversation` priority = 0、float——前者优先级更高，是主要的调节接口。

### 链式调用两个智能接口

```js
.smartInterface('kubejs_mode', 1, 3).priority(1).valueType('integer').end()
.smartInterface('kubejs_conversation', 0, 1).priority(0).valueType('float').end()
```

每个 `.smartInterface(...)` 必须以 `.end()` 收尾；下一个 `.smartInterface(...)` 重新开启一段。两段接口可以并存。

### `.energyByInterface(type, min, max, atMin, atMax)` 把接口值映射到能耗

```js
.energyByInterface('kubejs_mode', 1, 2, 1.0, 2.0)
.energyByInterface('kubejs_mode', 2, 3, 2.0, 4.0)
```

五个参数：`type`（已注册的智能接口类型名）、`min` / `max`（区间端点）、`atMin` / `atMax`（区间端点对应的修饰值）。当 `kubejs_mode` 接口值在 `[1, 2]` 时，能耗按线性插值映射到 `[1.0, 2.0]`；在 `[2, 3]` 时映射到 `[2.0, 4.0]`。接口值在区间外时映射行为由实现决定（通常取最近端点）。默认操作是 `MULTIPLY`；带第六参数 `RecipeModifier.Operation` 的版本可以指定 `ADD` / `SUBTRACT` / `DIVIDE`，详见 [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs)。

### `.durationByInterface(type, ...)` 把接口值映射到耗时

```js
.durationByInterface('kubejs_conversation', 0, 0.5, 1.0, 1.5)
.durationByInterface('kubejs_conversation', 0.5, 1, 1.5, 2.5)
```

与 `energyByInterface` 同形，作用于耗时。当 `kubejs_conversation` 在 `[0, 0.5]` 时，耗时按线性插值映射到 `[1.0, 1.5]`；在 `[0.5, 1]` 时映射到 `[1.5, 2.5]`。

`MachineBuilderJS` 还提供物品 / 流体的输入 / 输出数量与概率共 10 个 `XxxByInterface(...)` 方法，签名一致；本教程未演示，详见 [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs)。

### `.shareSmartInterface()`

```js
.shareSmartInterface()
```

启用"多线程实例共享智能接口值"。多线程并发跑同一机器时，共享接口值可以避免每个线程独立缓存导致的不一致。本教程未启用。

### 音效与多线程

`.runningSound(...)` / `.finishSound(...)` 与 A_Simple_Machine 一致；`.allowParallelism()` + `.maxParallelAmount(32)` 与 A_Level_Machine 一致。机器定义不可热加载，详见 [API/KubeJS#mmcrstartupeventjs](../API/KubeJS#mmcrstartupeventjs)。

## 结构详解（`MMCREvents.server`）

打开 [A_Smart_Machine.js（结构阶段）](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/A_Smart_Machine.js)：

```js
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_purpur_furnace")

    structure
        .pattern(" ABBBD ", "       ", "       ", "       ", "  EEE  ", "       ", "       ", "       ")
        .pattern("AFXXXGD", "  HHH  ", "  III  ", "  JJJ  ", " EHHHE ", " KLLLM ", "       ", "       ")
        .pattern("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PXXXQ ", "  EHE  ", "   R   ")
        .pattern("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PX XQ ", "  H H  ", "  R R  ")
        .pattern("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PXXXQ ", "  EHE  ", "   R   ")
        .pattern("STXXXUV", "  HCH  ", "  III  ", "  JJJ  ", " EHHHE ", " WYYYZ ", "       ", "       ")
        .pattern(" abbbV ", "       ", "       ", "       ", "  EEE  ", "       ", "       ", "       ")
        .set('X', api.block('minecraft:end_stone_bricks'))
        .set('A', api.state('minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]'))
        // ... 省略其他装饰方块 ...
        .set('H', api.anyOf(
            api.block('minecraft:purpur_pillar'),
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfEnergyInput(),
            api.parallelControllers(),
            api.smartInterface()                              // ← 智能接口方块位
        ))
        // ... 省略其他装饰方块 ...
        .controller('C')
        .build()
})
```

### `api.smartInterface()` 把字符升级为智能接口位

```js
.set('H', api.anyOf(
    api.block('minecraft:purpur_pillar'),
    api.anyOfItemInput(),
    api.anyOfItemOutput(),
    api.anyOfEnergyInput(),
    api.parallelControllers(),
    api.smartInterface()
))
```

[`api.smartInterface()`](../API/KubeJS#kubejsapi) 返回 [`BlockPredicate`](../API/KubeJS#kubejsapi)，专门表示"智能接口方块"。

智能接口方块是 MMCR 的内置方块，玩家在世界里放置后右键 / 编程方式设置接口值。每个智能接口方块绑定一个接口类型（`kubejs_mode` 或 `kubejs_conversation`）。MMCR 会在成型判定时识别这些方块并把它们的值提交给机器。

### 端口与装饰

`H` 槽位是端口并集（物品 / 流体 / 能量 / 并行控制器）+ 智能接口方块——同一个位置既能摆端口也能摆智能接口。`X` 是外观（end_stone_bricks），其他字符（`A`/`D`/`F`/`G`/`K`/`L`/`M`/`N`/`O`/`P`/`Q`/`R`/`S`/`T`/`U`/`V`/`W`/`Y`/`Z`/`a`/`b`）都是装饰方块——具体到每个朝向的楼梯方块（用 [`api.state(...)`](../API/KubeJS#kubejsapi) 精确匹配方块状态）。

`C` 是控制器，位于结构顶层。

### 结构在生产构建中不可热加载

详见 [API/KubeJS#machinestructurebuilderjs](../API/KubeJS#machinestructurebuilderjs) 的 `build()` 注意事项。

## 配方详解（`ServerEvents.recipes`）

打开 [A_Smart_Machine.js（配方阶段）](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/recipe/A_Smart_Machine.js)：

```js
ServerEvents.recipes(event => {
    // 配方 1：kubejs_mode ∈ [1, 1]
    event.custom({
        type: 'mmcr:machine_recipe',
        machine: 'mmcr_kubejs:kubejs_purpur_furnace',
        tick_time: 100,
        parallelized: true,
        requirements: [
            { type: 'minecraft:item', io: 'input',  item: 'minecraft:stick', count: 4 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:iron_ingot', count: 10 } },
            { type: 'neoforge:energy', io: 'input',  fe_per_tick: 10 },
            {
                type: 'mmcr:smart_interface',
                io: 'input',
                interface_type: 'kubejs_mode',
                min_value: 1,
                max_value: 1
            }
        ]
    })

    // 配方 2 / 3 结构相同：仅接口区间与输出物品不同。
    // 完整代码见上面的源文件链接。
})
```

三条配方对比：

| 配方 | 输入 | 输出 | `kubejs_mode` | `kubejs_conversation` |
| --- | --- | --- | --- | --- |
| 配方 1 | 4 木棍 | 10 铁锭 | 必须 == 1 | （未限定） |
| 配方 2 | 4 木棍 | 10 钻石 | 必须 ∈ [2, 3] | （未限定） |
| 配方 3 | 4 木棍 | 10 金锭（带自定义名 + 锋利 II） | （未限定） | 必须 ∈ [0, 0.5] |

### 数据驱动配方的 `mmcr:smart_interface` 类型条目

```js
{
    type: 'mmcr:smart_interface',
    io: 'input',
    interface_type: 'kubejs_mode',
    min_value: 1,
    max_value: 1
}
```

这是数据驱动配方 [`requirements`](../API/KubeJS#machinerecipeschema) 数组里的一条"特殊类型"条目，对应 MMCR 的智能接口需求。字段：

| 字段 | 含义 |
| --- | --- |
| `type` | 必须为 `'mmcr:smart_interface'`。 |
| `io` | `'input'` 读取当前接口值是否在 `[min_value, max_value]` 内；`'output'` 在配方结束时把接口值改成固定值（详见下文）。 |
| `interface_type` | 智能接口类型名，必须与机器定义中的 `smartInterface(...)` 一致。 |
| `min_value` / `max_value` | 范围端点。`min_value == max_value` 表示要求接口值精确等于这个值。 |

`io: 'input'` 是配方**被选中**的条件之一——只有当前接口值落在 `[min_value, max_value]` 区间内，配方才能被选中运行。`io: 'output'` 则相反：在配方结束时把接口改成固定值，主要用于 `MachineRecipeBuilderJS.smartInterfaceOutput(type, value)`。

三条配方各自锁定的接口区间：

| 配方 | 输出 | `kubejs_mode` | `kubejs_conversation` |
| --- | --- | --- | --- |
| 配方 1 | 10 铁锭 | 必须 == 1 | （未限定） |
| 配方 2 | 10 钻石 | 必须 ∈ [2, 3] | （未限定） |
| 配方 3 | 10 金锭 | （未限定） | 必须 ∈ [0, 0.5] |

每条配方只限定一个接口；另一个接口的当前值不影响该配方被选中。

数据驱动配方的编程式对应是 [`MachineRecipeBuilderJS`](../API/KubeJS#machinerecipebuilderjs) 的 `smartInterfaceInput(type, value)` / `smartInterfaceInput(type, min, max)` / `smartInterfaceOutput(type, value)` 三个方法；[`KubeJSApi`](../API/KubeJS#kubejsapi) 提供同名方法返回 [`SmartInterfaceRequirement`](../API/KubeJS#kubejsapi)，可传给 `MachineRecipeBuilderJS` 的 `requirements(...)`。

数据驱动配方支持热加载，详见 [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema)。

## 特殊机制：Smart Interface 系统

### `SmartInterfaceTypeBuilderJS` 完整链式调用

把 [API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs) 的方法全部梳理一次：

```js
machine
    .smartInterface(type, min, max)        // 入口（也可以 (type, default)）
        .priority(int)                      // 可选：优先级，数值越大越优先，默认 0
        .valueType('float'|'int'|'integer') // 可选：值类型，默认 'float'
        .end()                              // 必填：回到 MachineBuilderJS
```

注意事项：

- `end()` 必须调用；不调用则临时构建器不提交，机器定义阶段会抛 `IllegalArgumentException`。
- `priority` / `valueType` 顺序任意。
- 同一 `MachineBuilderJS` 上多次 `.smartInterface(type, ...)` 类型名重复时由机器注册阶段拒绝。
- 范围必须是有限数，`INTEGER` 类型还要求最值和默认值是整数。

### `SmartInterfaceEvents` 与 `SmartInterfaceUpdateEventJS`

MMCR 提供 [SmartInterfaceEvents](../API/KubeJS#smartinterfaceevents) 事件组，监听智能接口值变化：

```js
MMCREvents.onEvent("mmcr.smart_interface.updated", event => {
    console.info(
        "interface updated at", event.interfacePos(),
        "machine", event.machineId(),
        "type", event.type(),
        "old", event.oldValue(), "new", event.newValue(),
        "controllers", event.controllerCount()
    )
})
```

也可通过事件组入口：

```js
MMCREvents["mmcr.smart_interface"].updated(event => {
    if (event.controllerCount() === 0) return
    // ... 处理控制器绑定变化
})
```

[`SmartInterfaceUpdateEventJS`](../API/KubeJS#smartinterfaceupdateeventjs) 的字段：

| 方法 | 返回 | 含义 |
| --- | --- | --- |
| `event.interfacePos()` | `BlockPos` | 智能接口方块位置。 |
| `event.machineId()` | `Identifier` | 接口所属机器 ID。 |
| `event.type()` | `String` | 接口类型名。 |
| `event.oldValue()` | `Float | null` | 旧值。`null` 表示新建绑定。 |
| `event.newValue()` | `Float | null` | 新值。`null` 表示解除绑定。 |
| `event.controllerCount()` | `int` | 关联的控制器方块数量。 |
| `event.controllerPos()` | `BlockPos | null` | 第一个控制器位置，列表为空时为 `null`。 |
| `event.controllerPositions()` | `List<BlockPos>` | 不可变、已排序的控制器列表。 |

事件仅在 `mmcr.smart_interface.updated` 上发送；目前 `MMCRStartupEventJS.registerControllerScreenText` 与 `SmartInterfaceUpdateEventJS` 是独立的两套 API。

### `shareSmartInterface` 与多线程

```js
.shareSmartInterface()
```

`MachineBuilderJS.shareSmartInterface()` 启用"多线程实例共享智能接口值"。多线程并发跑同一台机器时，每个线程的实例默认独立缓存接口值；启用共享后所有线程共享同一份接口值。详见 [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs)。

### 与 Modifier、Level 的对比

| 维度 | Modifier（A_Modifier_Machine） | Level（A_Level_Machine） | Smart Interface（A_Smart_Machine） |
| --- | --- | --- | --- |
| 调节来源 | 摆方块 | 摆等级槽位方块 | 设置接口值 |
| 调节方 | 玩家 | 玩家 | 玩家 / 自动化 / 网络消息 |
| 影响阶段 | 配方运行时叠加 | 配方运行时叠加 | 配方选择期（按值过滤）+ 运行时 |
| 调节粒度 | 整个结构上的所有修饰器位 | 一个槽位对应一个等级 | 每个接口独立绑定 |
| 配方限定 | 不限定（所有配方共享） | `level_requirements` 数组 | `mmcr:smart_interface` 类型条目 |

三套系统都从结构 / 槽位 / 接口值读信号，但 Smart Interface 既影响"配方是否被选中"又影响"配方运行时参数"，是最程序化的一档。

## 与其他教程的对比

A_Smart_Machine 在 [A_Simple_Machine](A_Simple_Machine) 的基础上加了"配方按外部信号选择"的能力。启动期新增 `.smartInterface(...)...end()` × 2、`.XxxByInterface(...)` × N；结构层新增 `api.smartInterface()` 谓词；配方层新增 `mmcr:smart_interface` 类型条目。

与 [A_Modifier_Machine](A_Modifier_Machine) / [A_Level_Machine](A_Level_Machine) 的对比参见上节表格。三套系统的区别在"调节方式"和"调节粒度"上——Modifier 最自由（任何方块都行）、Level 最受限（必须等级 state 方块）、Smart Interface 最程序化（接口值可由代码或事件触发）。

与 Java 端 [PURPUR_FURNACE](../JavaAPI/PURPUR_FURNACE) 对比：两边的链式 API 几乎一一对应；KubeJS 端多一个数据驱动 `mmcr:smart_interface` 配方条目写法。

## 延伸阅读

- [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) — `smartInterface(...)` / `shareSmartInterface()` / `XxxByInterface(...)` 全部方法。
- [API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs) — 临时构建器的 `priority` / `valueType` / `end`。
- [API/KubeJS#smartinterface--blockpredicate](../API/KubeJS#kubejsapi) — 结构层智能接口方块谓词。
- [API/KubeJS#smartinterfaceinputstring-type-float-min-float-max--smartinterfacerequirement](../API/KubeJS#kubejsapi) — 编程式智能接口需求对象。
- [API/KubeJS#machinerecipebuilderjs](../API/KubeJS#machinerecipebuilderjs) — 编程式 `smartInterfaceInput(...)` / `smartInterfaceOutput(...)`。
- [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) — 数据驱动 `mmcr:smart_interface` 条目字段。
- [API/KubeJS#smartinterfaceevents](../API/KubeJS#smartinterfaceevents) — 智能接口事件组与监听语法。
- [API/KubeJS#smartinterfaceupdateeventjs](../API/KubeJS#smartinterfaceupdateeventjs) — 事件负载的所有字段。
- [JavaAPI/PURPUR_FURNACE](../JavaAPI/PURPUR_FURNACE) — 同一台紫珀炉的 Java 实现。
- [A_Simple_Machine](A_Simple_Machine) — 不使用智能接口的基础机器。
- [A_Module_Machine](A_Module_Machine) — HOST + MODULE 教程。
- [A_Level_Machine](A_Level_Machine) — Level 系统教程。
- [A_Modifier_Machine](A_Modifier_Machine) — Modifier 系统教程。