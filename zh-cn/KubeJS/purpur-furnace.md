---
title: 紫珀炉
order: 9
---

# 紫珀炉 — 智能接口系统

本文演示 MMCR 的 **Smart Interface 系统**：把机器的某些参数（耗时、能耗、并行上限等）与一个"可被外部调节的接口值"绑定，接口值由玩家通过结构上的特定方块位动态设置。

## 机器简介

`紫珀炉` 由三个文件组成：

- `example/startup_scripts/A_Smart_Machine.js`  
- `example/server_scripts/structure/A_Smart_Machine.js`  
- `example/server_scripts/recipe/A_Smart_Machine.js`  

Smart Interface 与 Modifier、Level 的区别：

| 系统 | 调节方式 | 调节方 | 调节粒度 |
| --- | --- | --- | --- |
| Modifier | 方块 | 玩家（手动） | 配方运行时叠加 |
| Level | 线圈方块 | 玩家（受等级槽位约束） | 配方运行时叠加 |
| Smart Interface | 设置接口值 | 玩家 / 自动化 / 网络消息 | 配方选择期 + 运行时 |

Smart Interface 既影响"配方是否被选中"（按 `min_value`/`max_value` 过滤），又影响"配方运行时如何修饰"（按 `durationByInterface(...)` 等映射函数）。

## 涉及的文件

| 文件 | 阶段 | 角色 |
| --- | --- | --- |
| `example/startup_scripts/A_Smart_Machine.js` | `MMCREvents.startup` | 注册机器 + 定义智能接口 + 绑定接口值到机器参数 |
| `example/server_scripts/structure/A_Smart_Machine.js` | `MMCREvents.server` | 在结构字符上识别智能接口块 |
| `example/server_scripts/recipe/A_Smart_Machine.js` | `ServerEvents.recipes` | 三条数据驱动配方，按接口值范围选择 |

## API 跳转表

| KubeJS API | 文档位置 |
| --- | --- |
| `smartInterface(String, float)` / `(String, float, float)`、`shareSmartInterface()` / `(boolean)`、`energyByInterface` / `durationByInterface` 的函数式 2 / 3 参数版本 | [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) |
| `SmartInterfaceTypeBuilderJS` | [API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs) |
| `smartInterface()`、`smartInterfaceInput(String, float, float)`、`smartInterfaceOutput(String, float)` | [API/KubeJS#kubejsapi](../API/KubeJS#kubejsapi) |
| `MachineRecipeBuilderJS.smartInterfaceInput(String, float)` / `(String, float, float)`、`smartInterfaceOutput(String, float)` | [API/KubeJS#machinerecipebuilderjs](../API/KubeJS#machinerecipebuilderjs) |
| `MachineRecipeSchema` 字段 `type: 'mmcr:smart_interface'` | [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) |

## 机器定义

`startup_scripts/` 目录下的 [A_Smart_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/0b4e5f32265a19314bfca1134b74450f7d2e9018/example/startup_scripts/A_Smart_Machine.js)：

```js
// Use the smart interface system to control machine parameters.

MMCREvents.startup(event => {

    const builder = event
        .createMachine("mmcr_kubejs:kubejs_purpur_furnace")
        .displayNameKey("machine.mmcr_kubejs.kubejs_purpur_furnace")
        .recipePool("mmcr_kubejs:kubejs_purpur_furnace")
        .allowParallelism()
        .maxParallelAmount(32)
        .appearance('minecraft:end_stone_bricks')
        .runningSound('minecraft:block.furnace.fire_crackle')
        .finishSound('minecraft:entity.ender_dragon.growl')
        // Register a smart interface.
        .smartInterface('kubejs_mode', 1, 3).priority(1).valueType('integer').end()
        .smartInterface('kubejs_conversation', 0, 1).priority(0).valueType('float').end()
        // 函数接收接口实际值，返回倍率；默认操作为 MULTIPLY。
        .energyByInterface('kubejs_mode', value => Math.pow(2, value - 1))
        .durationByInterface('kubejs_conversation', value => {
            if (value <= 0.5) return 1 + value
            return 0.5 + 2 * value
        })

    builder.register()
})
```

### `.smartInterface(type, min, max)` 注册一个智能接口

```js
.smartInterface('kubejs_mode', 1, 3)
```

链式调用的入口，返回 [`SmartInterfaceTypeBuilderJS`](../API/KubeJS#smartinterfacetypebuilderjs)，一个临时内部构建器，必须用 `.end()` 回到父 `MachineBuilderJS`。

参数：

| 参数 | 含义 |
| --- | --- |
| `type` | 接口类型名。机器定义内全局唯一。同名重复会在 `register()` 阶段抛异常。 |
| `min` / `max` | 接口值的合法范围。整数类型还要求最值和默认值是整数。 |

`smartInterface(type, default)` 重载：只指定一个值（作为默认值与最小值），最大值为 `Float.MAX_VALUE`。

### `SmartInterfaceTypeBuilderJS` 的链式调用

```js
.smartInterface('kubejs_mode', 1, 3).priority(1).valueType('integer').end()
```

三个临时方法（[API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs)）：

| 方法 | 默认值 | 作用 |
| --- | --- | --- |
| `.priority(int)` | `0` | 保存到接口类型声明；当前不参与排序或接口选择，没有数字大 / 小优先的生效规则。 |
| `.valueType(String)` | `'float'` | 接口值类型。可选 `'float'` / `'int'` / `'integer'`（不区分大小写）。`null` 或空白回退到 `FLOAT`。 |
| `.end()` | — | 关闭当前接口定义，回到父 `MachineBuilderJS`。**必须调用**。 |

顺序任意，多余调用以最后一次为准。

本教程 `kubejs_mode` priority = 1、integer，`kubejs_conversation` priority = 0、float。两个类型都可同时存储在同一个接口方块上，映射分别生效。

### 链式调用两个智能接口

```js
.smartInterface('kubejs_mode', 1, 3).priority(1).valueType('integer').end()
.smartInterface('kubejs_conversation', 0, 1).priority(0).valueType('float').end()
```

每个 `.smartInterface(...)` 必须以 `.end()` 收尾。下一个 `.smartInterface(...)` 重新开启一段。

两段接口可以并存。

### `.energyByInterface(type, mapping)` 把接口值映射到能耗

```js
.energyByInterface('kubejs_mode', value => Math.pow(2, value - 1))
```

两个参数：`type` 是已声明的智能接口类型名；`mapping` 是 JavaScript 函数，由 Rhino 转为 `DoubleUnaryOperator`。函数接收接口当前实际值，返回修饰操作数。这里默认操作为 `MULTIPLY`，因此 mode = 1 / 2 / 3 分别返回能耗倍率 **1 / 2 / 4**，不是直接把 FE/t 设为 1 / 2 / 4。

第三参数可显式传 `RecipeModifier.Operation`，例如 `api.modifierOperation().ADD` / `.MULTIPLY` / `.SUBTRACT` / `.DIVIDE`，不是任意字符串。这里的 `api` 可取 `MMCR.getAPI()` 或事件的 `getAPI()`。

:::warning 0b4e5f32 参数迁移
旧的五 / 六参数端点重载已删除，不再接收 `min/max/atMin/atMax`。需要分段或限幅时必须在函数中计算。接口自身的 `smartInterface(type, min, max)` 范围声明不变。
:::

详见 [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs)。

### `.durationByInterface(type, mapping)` 把接口值映射到耗时

```js
.durationByInterface('kubejs_conversation', value => {
    if (value <= 0.5) return 1 + value
    return 0.5 + 2 * value
})
```

与 `energyByInterface` 同形，作用于耗时。单个函数内的两个分支互斥：conversation = 0 / 0.5 / 1 时，耗时倍率为 **1 / 1.5 / 2.5**。基础耗时 200 tick 分别变为 200 / 300 / 500 tick；能否选择某条配方仍由其接口需求决定。

函数必须只依赖输入值、返回有限数值，不要读取世界、随机数、时间或修改外部状态。注册时只校验声明，不执行函数；控制器刷新修饰符时求值，不保证每 tick 调用。返回 `NaN` / 正负无穷或抛 `RuntimeException` 时，控制器会记录错误并跳过本次该条修饰符，继续处理其他规则。

不要只看 `XxxByInterface` 的方法名就认定它可用。物品 / 流体输入数量与概率辅助方法虽改成函数签名，`item/input`、`fluid/input` 仍不是有效目标，调用时就会被校验拒绝，函数不会执行。这里仅使用受支持的 `duration/input` 与 `energy/input`。

详见 [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs)。

### `.shareSmartInterface()`

```js
.shareSmartInterface()
```

允许同一个智能接口方块绑定多个相同机器的控制器，让这些控制器读取同一份接口值。

默认情况下，一个智能接口方块只能绑定一个控制器。启用后，另一个使用相同机器 ID 的控制器也可以绑定到这个方块。接口方块内部保存的是一份值，修改后会同步通知所有已绑定的控制器。

这里共享的是**智能接口方块与控制器之间的绑定关系及接口值**，不是多线程实例，也不是结构模板。换句话说，多个相同机器的多方块结构可以共同使用一个位于重叠区域的智能接口方块，但每个控制器仍然独立进行结构匹配和配方处理。

示例未启用。

### 音效与多线程

四行音频与并行配置各自定义了一类机器行为：

- `.runningSound('minecraft:block.furnace.fire_crackle')`
    注册机器运行期间循环播放的音效 ID。格式是普通 Minecraft 声效 ID（`命名空间:路径`），不限制为 MC 原生声效。
- `.finishSound('minecraft:entity.ender_dragon.growl')`
    注册每条配方完成时单次播放的音效 ID。ID 格式同 `runningSound`，运行期才会发出，不影响结构成型或配方校验。
- `.allowParallelism()` 启用并行控制器，允许玩家在同一多方块上安装并行控制器方块以提升单位时间产出。
    默认关闭，未启用时结构层即便摆上并行控制器也不会生效。
- `.maxParallelAmount(32)` 把并行上限设到 `32`。上限只决定并行控制器能堆到多高，不增加 CPU 调度成本。

并行控制器与工厂调度器是两件不同的事。多线程（`.allowMultithreading()`）允许工厂调度多个配方实例，不表示分配 Java Worker 线程；并行允许一个配方实例使用倍率。本例只开启并行，没有开启工厂多配方调度。

机器定义不可热加载，因此要改 `runningSound` / `maxParallelAmount` 等参数必须重启游戏。

详见 [API/KubeJS#mmcrstartupeventjs](../API/KubeJS#mmcrstartupeventjs)。

## 结构

`server_scripts/structure/` 目录下的 [A_Smart_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_Smart_Machine.js)。以下补全全部字符，并加入 `stateSensitive()`，使楼梯状态真正参与匹配；官方脚本未调用，默认仅按方块匹配状态谓词：

```js
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_purpur_furnace")

    structure
        .stateSensitive()
        .pattern(" ABBBD ", "       ", "       ", "       ", "  EEE  ", "       ", "       ", "       ")
        .pattern("AFXXXGD", "  HHH  ", "  III  ", "  JJJ  ", " EHHHE ", " KLLLM ", "       ", "       ")
        .pattern("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PXXXQ ", "  EHE  ", "   R   ")
        .pattern("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PX XQ ", "  H H  ", "  R R  ")
        .pattern("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PXXXQ ", "  EHE  ", "   R   ")
        .pattern("STXXXUV", "  HCH  ", "  III  ", "  JJJ  ", " EHHHE ", " WYYYZ ", "       ", "       ")
        .pattern(" abbbV ", "       ", "       ", "       ", "  EEE  ", "       ", "       ", "       ")
        .set('X', api.block('minecraft:end_stone_bricks'))
        .set('A', api.state('minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('B', api.state('minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]'))
        .set('D', api.state('minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('E', api.block('minecraft:end_stone_brick_slab'))
        .set('F', api.state('minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=inner_right,waterlogged=false]'))
        .set('G', api.state('minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=inner_right,waterlogged=false]'))
        .set('H', api.anyOf(
            api.block('minecraft:purpur_pillar'),
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfEnergyInput(),
            api.parallelControllers(),
            api.smartInterface()                              // ← 智能接口方块位
        ))
        .set('I', api.block('minecraft:purple_terracotta'))
        .set('J', api.block('minecraft:purpur_block'))
        .set('K', api.state('minecraft:purpur_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('L', api.state('minecraft:purpur_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]'))
        .set('M', api.state('minecraft:purpur_stairs[facing=west,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('N', api.state('minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]'))
        .set('O', api.state('minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]'))
        .set('P', api.state('minecraft:purpur_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]'))
        .set('Q', api.state('minecraft:purpur_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]'))
        .set('R', api.block('minecraft:purpur_slab'))
        .set('S', api.state('minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=outer_right,waterlogged=false]'))
        .set('T', api.state('minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=inner_right,waterlogged=false]'))
        .set('U', api.state('minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=inner_left,waterlogged=false]'))
        .set('V', api.state('minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=outer_right,waterlogged=false]'))
        .set('W', api.state('minecraft:purpur_stairs[facing=east,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('Y', api.state('minecraft:purpur_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]'))
        .set('Z', api.state('minecraft:purpur_stairs[facing=north,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('a', api.state('minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('b', api.state('minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]'))
        .controller('C')
        .build()
})
```

### `api.smartInterface()`

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

智能接口方块是 MMCR 的内置方块，玩家在世界里放置后右键 / 编程方式设置接口值。

每个智能接口方块可保存该机器声明的所有接口类型及各自的值，本例可同时保存 `kubejs_mode` 和 `kubejs_conversation`，不必为每种类型各放一个方块。

### 端口与装饰

`H` 槽位允许物品输入 / 输出、能量输入、并行控制器、智能接口或紫珀柱，不包含流体端口。

`X` 是外观（end_stone_bricks），其他字符都是装饰方块，具体到每个朝向的楼梯方块（用 [`api.state(...)`](../API/KubeJS#kubejsapi) 精确匹配方块状态）。

`C` 是控制器。

## 配方

`server_scripts/recipe/` 目录下的 [A_Smart_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_Smart_Machine.js)：

```js
ServerEvents.recipes(event => {
    // 配方 1：kubejs_mode ∈ [1, 1]
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_purpur_furnace',
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

    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_purpur_furnace',
        tick_time: 100,
        parallelized: true,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:stick', count: 4 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:diamond', count: 10 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 1 },
            { type: 'mmcr:smart_interface', io: 'input', interface_type: 'kubejs_mode', min_value: 2, max_value: 3 }
        ]
    })
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_purpur_furnace',
        tick_time: 100,
        parallelized: true,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:stick', count: 4 },
            { type: 'minecraft:item', io: 'output', stack: {
                id: 'minecraft:gold_ingot', count: 10,
                components: {
                    'minecraft:custom_name': { text: 'Too low Conversation!' },
                    'minecraft:enchantments': { 'minecraft:sharpness': 2 }
                }
            } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 10 },
            { type: 'mmcr:smart_interface', io: 'input', interface_type: 'kubejs_conversation', min_value: 0, max_value: 0.5 }
        ]
    })
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
| `io` | `'input'` 读取当前接口值是否在 `[min_value, max_value]` 内。`'output'` 在配方结束时把接口值改成固定值（详见下文）。 |
| `interface_type` | 智能接口类型名，必须与机器定义中的 `smartInterface(...)` 一致。 |
| `min_value` / `max_value` | 范围端点。`min_value == max_value` 表示要求接口值精确等于这个值。 |

`io: 'input'` 是配方**被选中**的条件之一。只有当前接口值落在 `[min_value, max_value]` 区间内，配方才能被选中运行。

`io: 'output'` 在配方结束时写回固定值，JSON 仍需 `min_value` 与 `max_value`，固定值应令二者相等；对应 `MachineRecipeBuilderJS.smartInterfaceOutput(type, value)`。

三条配方各自锁定的接口区间：

| 配方 | 输出 | `kubejs_mode` | `kubejs_conversation` |
| --- | --- | --- | --- |
| 配方 1 | 10 铁锭 | 必须 == 1 | （未限定） |
| 配方 2 | 10 钻石 | 必须 ∈ [2, 3] | （未限定） |
| 配方 3 | 10 金锭 | （未限定） | 必须 ∈ [0, 0.5] |

每条配方只显式限定一个接口的取值范围；另一个接口仍可能通过能耗 / 耗时修饰影响实际配方规划，不能说它对运行没有影响。

数据驱动配方的编程式对应是 [`MachineRecipeBuilderJS`](../API/KubeJS#machinerecipebuilderjs) 的 `smartInterfaceInput(type, value)` / `smartInterfaceInput(type, min, max)` / `smartInterfaceOutput(type, value)` 三个方法。

[`KubeJSApi`](../API/KubeJS#kubejsapi) 提供 `smartInterfaceInput(type, min, max)` 与 `smartInterfaceOutput(type, value)` 返回需求对象，可传给 `MachineRecipeBuilderJS.requirements(List<MachineRequirement>)`。**API 辅助对象没有两参数 input 重载**，精确值需写 `(type, value, value)`。RecipeSchema 则使用 `smartInterfaceInput(type, value)`、`smartInterfaceInputRange(type, min, max)` 与 `smartInterfaceOutput(type, value)`，其区间函数名不同。

三条配方都属于机器声明的 `kubejs_purpur_furnace` 配方池，基础时间均为 100 tick，基础能耗分别为 10 / 1 / 10 FE/tick。未限定另一个接口不代表配方互斥：mode = 1 且 conversation = 0 时，第一与第三条可能同时满足门槛，最终由配方搜索及其他输入输出条件决定。

配方支持热加载。

## 特殊机制：Smart Interface 系统

### `SmartInterfaceTypeBuilderJS` 完整链式调用

把 [API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs) 的方法全部梳理一次：

```js
machine
    .smartInterface(type, min, max)        // 入口（也可以 (type, default)）
        .priority(1)                       // 可选：声明字段，默认 0；当前不参与排序
        .valueType('integer')              // 可选：float / int / integer，默认 float
        .end()                              // 必填：回到 MachineBuilderJS
```

注意事项：

- `end()` 必须调用才能把接口定义加入父构建器。不调用会遗漏该定义，但构建器没有“未关闭接口”检查，不应承诺它必然在机器注册时抛异常。
- `priority` / `valueType` 顺序任意。
- 同一 `MachineBuilderJS` 上多次 `.smartInterface(type, ...)` 类型名重复时由机器注册阶段拒绝。
- 范围必须是有限数，`INTEGER` 类型还要求最值和默认值是整数。

### `shareSmartInterface` 与结构绑定

```js
.shareSmartInterface()
```

`MachineBuilderJS.shareSmartInterface()` 启用"同一智能接口方块绑定多个相同机器控制器"。

它只影响智能接口方块的绑定范围：默认情况下，一个智能接口方块只能服务一个控制器。启用后，同一个方块可以同时记录多个相同机器 ID 的控制器位置，所有控制器读取同一份接口值。

它不会合并结构、共享结构匹配结果，也不会改变机器是否允许多线程。

详见 [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs)。

### 与 Modifier、Level 的对比

| 维度 | Modifier（合金炉） | Level（热能冶炼炉） | Smart Interface（紫珀炉） |
| --- | --- | --- | --- |
| 调节来源 | 摆方块 | 摆等级槽位方块 | 设置接口值 |
| 调节方 | 玩家 | 玩家 | 玩家 / 自动化 / 网络消息 |
| 影响阶段 | 配方运行时叠加 | 配方运行时叠加 | 配方选择期（按值过滤）+ 运行时 |
| 调节粒度 | 同名结构修饰器去重后应用 | 同类型槽位解析出一致等级 | 每个接口方块保存多个类型值，映射逐条应用 |
| 配方限定 | 不限定（所有配方共享） | `requirements` 中的 `mmcr:level` 项 | `mmcr:smart_interface` 类型条目 |

三套系统都从结构 / 槽位 / 接口值读信号，但 Smart Interface 既影响"配方是否被选中"又影响"配方运行时参数"，是最程序化的一档。


## 延伸阅读

- [MachineBuilderJS：函数式映射签名和 end 提交](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/0b4e5f32265a19314bfca1134b74450f7d2e9018/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBuilderJS.java)
- [SmartInterfaceModifier：纯函数求值与有限数值校验](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/0b4e5f32265a19314bfca1134b74450f7d2e9018/src/main/java/cn/howxu/mmcr/api/machine/SmartInterfaceModifier.java)
- [控制器：逐方块、逐函数收集修饰符与异常隔离](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/0b4e5f32265a19314bfca1134b74450f7d2e9018/src/main/java/cn/howxu/mmcr/internal/tile/MachineControllerBlockEntity.java#L3401-L3431)
- [SmartInterfaceBlockEntity：多类型值与共享绑定](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/tile/SmartInterfaceBlockEntity.java)
- [SmartInterfaceRequirement codec](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/requirement/SmartInterfaceRequirement.java) / [RecipeSchema 的函数名称](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeSchema.java)

- [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) — `smartInterface(...)` / `shareSmartInterface()` / `XxxByInterface(...)` 全部方法。
- [API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs) — 临时构建器的 `priority` / `valueType` / `end`。
- [API/KubeJS#smartinterface--blockpredicate](../API/KubeJS#kubejsapi) — 结构层智能接口方块谓词。
- [API/KubeJS#smartinterfaceinputstring-type-float-min-float-max--smartinterfacerequirement](../API/KubeJS#kubejsapi) — 编程式智能接口需求对象。
- [API/KubeJS#machinerecipebuilderjs](../API/KubeJS#machinerecipebuilderjs) — 编程式 `smartInterfaceInput(...)` / `smartInterfaceOutput(...)`。
- [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) — 数据驱动 `mmcr:smart_interface` 条目字段。
- [JavaAPI/紫珀炉](../JavaAPI/purpur-furnace) — 同一台紫珀炉的 Java 实现。
