---
title: 高炉
order: 1
---

# 高炉

本文是第一个 KubeJS 示例，演示如何用 KubeJS 注册一台带并行控制器与多端口的高炉。

## 概览

高炉由三个文件组成：

- `example/startup_scripts/A_Simple_Machine.js` — 机器定义阶段。
- `example/server_scripts/structure/A_Simple_Machine.js` — 多方块结构阶段。
- `example/server_scripts/recipe/A_Simple_Machine.js` — 配方阶段。

每一个文件都和 KubeJS 的事件阶段一一对应：

| 文件 | 事件阶段 | 注册对象 |
| --- | --- | --- |
| `startup_scripts/A_Simple_Machine.js` | `MMCREvents.startup` | 机器定义 |
| `server_scripts/structure/A_Simple_Machine.js` | `MMCREvents.server` | 多方块结构 |
| `server_scripts/recipe/A_Simple_Machine.js` | `ServerEvents.recipes` | 数据驱动配方 |

涉及的全部 KubeJS API 都在 [API 参考](../API/KubeJS) 中有独立小节。

## 机器定义

`startup_scripts` 下的 [A_Simple_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/A_Simple_Machine.js)：

```js
// Register a machine definition during the startup event.
// A controller block is generated automatically after registration.

// Listen for the MMCREvents.startup event.
MMCREvents.startup(event => {


    // Create the machine definition.
    const builder = event
        .createMachine("mmcr_kubejs:kubejs_blast_furnace") // Global machine identifier.
        .recipePool("mmcr_kubejs:kubejs_blast_furnace") // Bind the recipe pool.
        .displayNameKey("machine.mmcr_kubejs.kubejs_blast_furnace") // Translation key for the display name.


    // Configure the machine properties.
    builder
        .allowMultithreading() // Allow the machine to process recipes across multiple threads.
        .allowParallelism() // Allow the machine to process recipes in parallel.
        .maxParallelAmount(2147483647) // Set the maximum parallel amount; defaults to 1 when omitted.


    // Register the machine after configuration.
    builder.register()


    // See server_scripts/structure/A_Simple_Machine.js for the structure definition.
})
```

`MMCREvents.startup(event => {...})` 是 MMCR 在启动期发布的 KubeJS 事件。回调内的 `event` 则是 [`MMCRStartupEventJS`](../API/KubeJS#mmcrstartupeventjs) 实例。

`event.createMachine()` 返回一个 [`MachineBuilderJS`](../API/KubeJS#machinebuilderjs)对象。

链式调用：

- `.displayNameKey(...)`：声明本地化键。命名建议遵循 `machine.<命名空间>.<注册名>`。
- `.allowMultithreading()`：启用多线程。
- `.allowParallelism()`：启用并行控制器。
- `.maxParallelAmount(2147483647)`：把并行上限设到 `int` 最大值。

`.register()` 终结构建，把机器定义提交到当前注册窗口。

机器构建器的 `register()` 返回构建器自身；结构构建器的 `build()` 则返回 `void`，并向服务脚本重载事务提交结构。这是两个不同的注册入口，不是脚本语言的尾置调用约定。

:::info 备注
`.allowMultithreading()` 允许工厂调度器处理多个配方实例，不等于开启 Java / CPU 工作线程。需要配置定义侧线程上限时可用 `.factoryThreads(4)`；本例未调用，定义侧默认值为 1。`.allowParallelism()` 则允许同一配方实例使用并行倍率，配方还需 `parallelized: true`。两个开关彼此独立。
:::

启动期窗口不可热加载。修改后必须重启游戏。

## 多方块结构

`server_scripts/structure` 目录下的 [A_Simple_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_Simple_Machine.js)：

```js
// Machine structures support hot reload while the game is running.

// Listen for the MMCREvents.server event.
MMCREvents.server(event => {

    // Get the structure API to simplify the definitions below.
    const api = event.getAPI()

    // Create a structure using the same machine identifier as the startup script.
    event
        .createStructure("mmcr_kubejs:kubejs_blast_furnace") // Machine registered in startup_scripts/A_Simple_Machine.js.

        // 1. Define the structure slices. Each slice is a two-dimensional string array.
        // The output from the export tool can be pasted here directly.
        .pattern(['AXA', 'XIX', 'XXX'])
        .pattern(['XXX', 'I I', 'XBX'])
        .pattern(['AXA', 'XCX', 'XXX'])

        // 2. Assign a meaning to each character in the structure.
        .set('X',api.block('mmcr:basic_casing')) // Match the specified block with api.block().
        .set('A',api.anyOf(api.block('minecraft:iron_block'),api.block('minecraft:stone'),api.block('mmcr:parallel_controller_normal'),api.block('mmcr:factory_controller'))) // Combine predicates for a port position.
        // A accepts regular blocks, parallel controllers, and the multithreading controller.
        .set('I',api.anyOf(api.block('mmcr:item_input_bus'),api.block('mmcr:item_output_bus'),api.block('mmcr:energy_input_hatch'))) // Define the blocks allowed at fixed port positions.
        .set('B',api.tag('c:natural_logs')) // Match a block tag.
        .controller('C') // Assign C as the controller position.

        // 3. Build the structure.
        .build()
})
```

`MMCREvents.server(event => {...})` 在服务脚本加载后发布，回调内的 `event` 是 [`MMCRServerEventJS`](../API/KubeJS#mmcrservereventjs) 实例，提供 `getAPI()` 与 `createStructure(String)`。配方 JSON 放在独立的 `ServerEvents.recipes` 回调中；不要在 server 事件里重新注册机器、等级或修饰器。

`event.getAPI()` 返回一个 [`KubeJSApi`](../API/KubeJS#kubejsapi) 实例，封装了 [`BlockPredicate`](../API/JavaAPI#blockpredicate) 与 [`InterfacePredicates`](../API/JavaAPI#interfacepredicates) 在 KubeJS 端的快捷方法。下文统一用 `api` 指代该对象。

`event.createStructure()` 返回一个 [`MachineStructureBuilderJS`](../API/KubeJS#machinestructurebuilderjs)。

接下来的 `.pattern([...])` 链式声明结构的 3 个 z 层。每个 `pattern` 调用的参数是一个字符串数组，对应同一 z 层从下到上的 y 行。同一字符串内的字符对应同一行从左到右的 x 位置。空格表示该位置不校验方块。

`.set(...)` 把字符绑定到方块谓词。`.controller('C')` 把 C 字符标记为控制器位置。`.build()` 终结构建。

字符与方块的对应：

- `'X'` → `api.block('mmcr:basic_casing')`：基础外壳。
- `'A'` → 四个候选的并集：铁块、石头、普通并行器、工厂控制器。
- `'B'` → `api.tag('c:natural_logs')`：用方块标签匹配。这里的方块标签可被多个结构复用，不是结构占用或端口共享规则；标签中需实际存在可用方块。
- `'I'` → 物品输入 / 输出 / 能量输入端口的并集。
- `'C'` → 控制器。

`.pattern(String... rows)` 是对 JS 可见的重载，示例数组由 Rhino 适配到变长参数；`pattern(List<String>)` 标了 `@HideFromJS`。也可逐行传字符串，或用 `patternAll(List<List<String>>)` 一次提交全部切片。`set(String, Object)` 的字符必须已出现在模式中，`controller(String)` 自动绑定该机器控制器。底层由 `BlockArray.Builder` 生成模式，再由 `MachineStructureBuilderJS` 提交声明。

结构可以通过游戏内 `/reload` 命令热加载。

## 配方

`server_scripts/recipe` 目录下的 [A_Simple_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_Simple_Machine.js)：

```js
// Define a recipe for the blast furnace machine.
// ServerEvents.recipes is data-driven and supports hot reload.

ServerEvents.recipes( event => {
    // Register a standard recipe object with event.custom().
    event.custom({
        type: 'mmcr:machine_recipe', // Required recipe type.
        recipe_pool: 'mmcr_kubejs:kubejs_blast_furnace', // Required recipe pool identifier.
        tick_time: 100, // Processing time in ticks; must be greater than 0.
        parallelized: true, // Allow this recipe to use parallel controllers.
        requirements: [
            {
                type: 'minecraft:item', // Requirement type; fluid is also supported.
                io: 'input', // Input or output direction.
                item: 'minecraft:iron_ingot', // An item identifier or ingredient can be used.
                count: 1
            },
            {
                type: 'minecraft:item',
                io: 'output',
                    stack: { // Outputs must use a stack object for items and fluids.
                    id: 'minecraft:iron_nugget',
                    count: 10
                }
            },
            {
                type: 'neoforge:energy',
                io: 'input', // This can also be set to output.
                fe_per_tick: 1 // Consume 1 FE per tick.
            }
        ]
    }).id('mmcr_kubejs:blast_furnace_1') // Optional recipe ID provided by KubeJS.

    // 第二条配方未声明 parallelized，默认不允许配方并行。
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_blast_furnace',
        tick_time: 100,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:gold_ingot', count: 1 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:gold_nugget', count: 10 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 1 }
        ]
    })
})
```

`ServerEvents.recipes(...)` 是 KubeJS 自带的原版配方事件。MMCR 通过自定义的 `type: 'mmcr:machine_recipe'` 注册配方类型。

KubeJS 的 `MachineRecipeSchema` 提供键与链式函数，最终由 `MachineRecipeJson` 和需求 / 输出 codec 解析 JSON。以实际解析器为准，不能仅凭 schema 的键表推断所有字段。

字段含义：

- `type`：配方类型，必须为 `'mmcr:machine_recipe'`。
- `recipe_pool`：配方所属的单个池 ID，必须是至少一台机器定义声明过的池。机器的 `.recipePool(String... ids)` 可以声明多个池，配方池直接参与运行时检索，并非只用于 JEI 展示。未显式指定时机器默认使用自身 ID 作为池；本例显式绑定。
- `tick_time`：配方总耗时，以tick为单位。
- `parallelized`：是否允许该配方被并行。
- `requirements`：必填的需求数组，允许将物品、流体及能量输入 / 输出都写在这里。具体字段由条目类型决定：
  - `type`：`'minecraft:item'` / `'minecraft:fluid'` / `'neoforge:energy'` 等。
  - `io`：方向，`'input'` 或 `'output'`。
  - 物品输入：`item`（物品 ID 或 ingredient 表达式）+ `count`。
  - 物品输出：`stack.id` + `stack.count`。
  - 流体输入：`fluid` + `amount`。
  - 流体输出：`stack.id` + `stack.amount`。
  - 能量输入：`fe_per_tick`。

`event.custom(...).id(...)` 给配方设置 ID，返回的是 KubeJS 配方对象，不是事件对象。未指定 ID 的第二条配方由 KubeJS 自动分配 ID。

其他顶层字段包括 `outputs` / `modifiers`（默认空数组）、`priority`（默认 0）、`max_threads`（默认 1，允许 0）、`cancelIfPerTickFails`（默认 false）、`allow_partial_outputs`（默认 false）与 `required_host_ids`（默认空集合）。`tick_time` 必须是至少 1 的整数。旧顶层字段 `machine`、`inputs`、`fluid_outputs`、`energy_per_tick`、`machine_outputs`、`level_requirements` 会被解析器拒绝。物品数量和流体量最终受栈数量的 `int` 上限约束，`fe_per_tick` 则是 `long`。

## API 调用与源码

| 调用 | 实际签名 / 职责 |
| --- | --- |
| `MMCR.getAPI()` / `getValues()` | 全局声明辅助 API / 数值常量 |
| `event.createMachine(String)` | startup：返回 `MachineBuilderJS`，用 `register()` 提交 |
| `recipePool(String...)` | 声明非空的有序配方池列表 |
| `allowMultithreading()` / `(boolean)` | 允许工厂调度多个配方实例 |
| `allowParallelism()` / `(boolean)` | 允许配方并行倍率 |
| `maxParallelAmount(long)` / `maxParallelism(long)` | 并行上限及其别名；不是线程数 |
| `event.createStructure(String)` | server：返回 `MachineStructureBuilderJS`，用 `build()` 提交 |
| `block(String)` / `tag(String)` / `anyOf(BlockPredicate...)` | 方块、方块标签、谓词并集 |
| `ServerEvents.recipes(event => …)` | KubeJS 配方回调，`event.custom(Object)` 提交 JSON |

实现依据：[事件与全局绑定](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/Plugin.java)、[机器构建器](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBuilderJS.java)、[结构构建器](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineStructureBuilderJS.java)、[辅助 API](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java)、[RecipeSchema](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeSchema.java)、[JSON 解析器](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/MachineRecipeJson.java)。

数据驱动的配方支持热加载，修改后 `/reload` 即可。

## 小结

所有 API 都能在 [API 参考](../API/KubeJS) 找到对应小节。
