---
title: A_Simple_Machine
---

# A_Simple_Machine — 简单机器（高炉）

本文是 MMCR 第一个 KubeJS 示例，演示如何用 KubeJS 注册一台带并行控制器与多端口的高炉。代码直接对应 [Java 版的高炉](../JavaAPI/BLAST_FURNACE)，两个示例读起来可以一一对照。

## 概览

A_Simple_Machine 是一个 KubeJS 示例目录，由三个文件组成：

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

打开 [A_Simple_Machine.js（启动期）](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/A_Simple_Machine.js)：

```js
// Register a machine definition during the startup event.
// A controller block is generated automatically after registration.

// Listen for the MMCREvents.startup event.
MMCREvents.startup(event => {


    // Create the machine definition.
    const builder = event
        .createMachine("mmcr_kubejs:kubejs_blast_furnace") // Global machine identifier.
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

`MMCREvents.startup(event => {...})` 是 MMCR 在启动期发布的 KubeJS 事件。回调内的 `event` 是 [`MMCRStartupEventJS`](../API/KubeJS#mmcrstartupeventjs) 实例。

`event.createMachine("mmcr_kubejs:kubejs_blast_furnace")` 返回一个 [`MachineBuilderJS`](../API/KubeJS#machinebuilderjs)，机器 ID 与 Java 版 [`BLAST_FURNACE.java`](../JavaAPI/BLAST_FURNACE) 的 `id("blast_furnace")` 在命名空间上略有不同（`mmcr_kubejs` 与 `mmcr`），这是因为 KubeJS 示例放在独立的命名空间以避免与内置机器冲突。

链式调用三件事：

- `.displayNameKey(...)`：声明本地化键。命名建议遵循 `machine.<命名空间>.<注册名>`。
- `.allowMultithreading()`：启用多线程。
- `.allowParallelism()`：启用并行控制器（与 Java 版的 `.parallelizable(true)` 等价）。
- `.maxParallelAmount(2147483647)`：把并行上限设到 `int` 最大值（与 Java 版的 `.maxParallelism(Integer.MAX_VALUE)` 等价）。

`.register()` 终结构建，把机器定义提交到当前注册窗口。在 KubeJS 端 `register(...)` 是显式调用，因为脚本语言没有 `build()` 的尾置调用约定。

> 备注：原版 Java 示例使用了 `.factory(...hasFactory(true).threadLimit(4))` 配置工厂并行，KubeJS 端的 API 等价物会在 [API 参考](../API/KubeJS#machinebuilderjs) 列出。

启动期窗口不可热加载。修改 `.js` 后必须重启游戏。

## 多方块结构

打开 [A_Simple_Machine.js（结构阶段）](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/A_Simple_Machine.js)：

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
        .set('B',api.tag('c:natural_logs')) // Block tags can also be used; this tag cannot be shared.
        .controller('C') // Assign C as the controller position.

        // 3. Build the structure.
        .build()
})
```

`MMCREvents.server(event => {...})` 是 MMCR 在结构 / 配方加载阶段发布的 KubeJS 事件。回调内的 `event` 是 [`MMCRServerEventJS`](../API/KubeJS#mmcrservereventjs) 实例。

`event.getAPI()` 返回一个 [`KubeJSApi`](../API/KubeJS#kubejsapi) 实例，封装了 [`BlockPredicate`](../API/JavaAPI#blockpredicate) 与 [`InterfacePredicates`](../API/JavaAPI#interfacepredicates) 在 KubeJS 端的快捷方法。下文统一用 `api` 指代该对象。

`event.createStructure("mmcr_kubejs:kubejs_blast_furnace")` 返回一个 [`MachineStructureBuilderJS`](../API/KubeJS#machinestructurebuilderjs)。

接下来的 `.pattern([...])` 链式声明结构的 3 个 z 层。每个 `pattern` 调用的参数是一个字符串数组，对应同一 z 层从下到上的 y 行；同一字符串内的字符对应同一行从左到右的 x 位置。空格 `' '` 表示该位置不校验方块。

`.set(...)` 把字符绑定到方块谓词。`.controller('C')` 把 C 字符标记为控制器位置。`.build()` 终结构建。

字符与方块的对应：

- `'X'` → `api.block('mmcr:basic_casing')`：基础外壳（与 Java 版的 `ModBlocks.CASING` 等价）。
- `'A'` → 四个候选的并集：铁块、石头、`mmcr:parallel_controller_normal`、`mmcr:factory_controller`。这意味着结构上四个角既能摆装饰方块，又能摆并行控制器（`parallel_controller_normal`）与多线程控制器（`factory_controller`）。
- `'B'` → `api.tag('c:natural_logs')`：用方块标签匹配。MMCR 在每个结构内独立匹配标签，不可跨结构共享同一个标签实例。
- `'I'` → 物品输入 / 输出 / 能量输入端口的并集。
- `'C'` → 控制器。

`.pattern(...)` / `.set(...)` / `.controller(...)` / `.build()` 在底层都会调用 [`MachineStructureBuilder`](../API/MachineStructureBuilder) 的对应方法。KubeJS 集成层把这些方法扁平化，让你可以像写 `.set(...)` 一样链式调用，免去 Java API 必需的 `.fullStructure(s -> s...)` 包装。

结构在生产构建中不可热加载。修改后必须重启游戏。

## 配方

打开 [A_Simple_Machine.js（配方阶段）](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/recipe/A_Simple_Machine.js)：

```js
// Define a recipe for the blast furnace machine.
// ServerEvents.recipes is data-driven and supports hot reload.

ServerEvents.recipes( event => {
    // Register a standard recipe object with event.custom().
    event.custom({
        type: 'mmcr:machine_recipe', // Required recipe type.
        machine: 'mmcr_kubejs:kubejs_blast_furnace', // Required machine identifier.
        tick_time: 100, // Processing time in ticks; must be greater than 0.
        parallelized: true, // Allow this recipe to use parallel controllers.
        // Optional: allows recipes with empty inputs or outputs.
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

    // The first machine recipe is complete.
})
```

`ServerEvents.recipes(...)` 是 KubeJS 自带的原版配方事件。MMCR 通过自定义的 `type: 'mmcr:machine_recipe'` 注册配方类型；KubeJS 把 JSON 数据交给 [`MachineRecipeSchema`] 解析。

字段含义：

- `type`：配方类型，必须为 `'mmcr:machine_recipe'`。
- `machine`：所属机器的注册 ID，必须与启动期 `.createMachine(...)` 的字符串一致。
- `tick_time`：配方总耗时（tick）。
- `parallelized`：是否可使用并行控制器。
- `requirements`：输入输出条目数组。每条有三个字段：
  - `type`：`'minecraft:item'` / `'minecraft:fluid'` / `'neoforge:energy'` 等。
  - `io`：方向，`'input'` 或 `'output'`。
  - 物品输入：`item`（物品 ID 或 ingredient 表达式）+ `count`。
  - 物品输出：`stack.id` + `stack.count`。
  - 流体输入：`fluid` + `amount`。
  - 能量输入：`fe_per_tick`。

`event.custom(...).id(...)` 给配方设置 ID。`.id(...)` 是 KubeJS 的链式调用，返回的事件对象仍是普通事件，所以可以继续链式操作或忽略返回值。

数据驱动的配方支持热加载，修改后 `/reload` 即可。

## 与 Java 版的对照

A_Simple_Machine 与 [BLAST_FURNACE](../JavaAPI/BLAST_FURNACE) 是同一台高炉在 KubeJS 与 Java 端的两个实现。两者在结构上是同构的：

| Java 端 | KubeJS 端 |
| --- | --- |
| `MachineBuilder.machine(...).displayNameKey(...).allowMultithreading().maxParallelism(...).parallelizable(true).factory(...)` | `event.createMachine(...).displayNameKey(...).allowMultithreading().allowParallelism().maxParallelAmount(...)` |
| `MachineStructureBuilder.structure().fullStructure(s -> s.pattern(p -> p.layer(...).where(...).controller(...))).portTiers(...).build(...)` | `event.createStructure(...).pattern(...).pattern(...).pattern(...).set(...).controller(...).build()` |
| `MachineRecipeBuilder.recipe(id, machineId).inputItem(...).outputItem(...).inputEnergy(...).duration(...).build()` | `event.custom({type:'mmcr:machine_recipe',machine:...,tick_time:...,requirements:[...]}).id(...)` |
| `BlockPredicate.block(...)` / `any(...)` / `InterfacePredicates.anyOfItemInput()` | `api.block(...)` / `api.anyOf(...)` / `api.anyOfItemInput()` |
| `PortTiers.minEnergyInput(NORMAL).minItemInput(NORMAL).anyItemOutput()` | `event.getAPI().portTier(...)`（详见 [API 参考](../API/KubeJS#kubejsapi)） |

Java API 多一层 `.fullStructure(s -> s...)` 包装是因为 Java API 同时支持完整结构、可扩展形态与附属结构三种阶段类型；KubeJS 集成层在 `.build()` 时内部自动调用 `fullStructure`，所以 KubeJS 端可以写成扁平的 `.pattern(...).set(...).controller(...).build()`。

API 在不同命名上的差异（如 `.allowParallelism()` vs `.parallelizable(true)`）只是命名风格不同，行为完全一致。

## 小结

A_Simple_Machine 是 KubeJS 端"最小可运行的高炉"。三个文件分别对应三个注册阶段，所有 API 都能在 [API 参考](../API/KubeJS) 找到对应小节。

接下来可以阅读 [BLAST_FURNACE](../JavaAPI/BLAST_FURNACE) 看同一台高炉在 Java API 端的实现，并对照两种 API 的命名差异。或者浏览 [API 参考](../API/开始) 查看全部 API 文档。