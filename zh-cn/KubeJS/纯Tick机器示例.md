---
title: 纯Tick测试机器
order: 12
---

# 纯Tick型机器示例

本文是 KubeJS 进阶示例的第三篇。我们将拆解 [`A_Pure_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Pure_Tick_Machine.js) 与 [对应的结构脚本](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Pure_Tick_Machine.js)。

本机器没有配方，完全靠 [`tickBehavior`](../API/KubeJS#tickbehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) + [`serverTick`](../API/KubeJS#servertickconsumer-tickbehaviorcontext-callback--machinebehaviorbuilderjs) 自驱。它是 [纯Tick测试机器](../JavaAPI/纯Tick测试机器) 的 KubeJS 版实现。

它跟 [配方Tick示例](./配方Tick示例) 是同组对比：两者都"按 tick 自定义"，但本机器**完全没有配方**，所有逻辑都压缩到 `serverTick` 里。配方Tick示例 走 [`recipeBehavior`](../API/KubeJS#recipebehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs)，在配方生命周期的 5 个钩子上插入回调。本教程会重点展开 [`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) 的链式调用 + `idleStart` / `idleEnd` / `preServerTick` / `postServerTick` / `serverTick` 等钩子的可用范围，并区分 PURE_TICK vs RECIPE_TICK。

## 涉及的文件

源码：

- [`startup_scripts/advance/A_Pure_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Pure_Tick_Machine.js) — 机器定义、tick 行为。
- [`server_scripts/structure/advance/A_Pure_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Pure_Tick_Machine.js) — 多方块结构。

## API 跳转表

| 用到的 KubeJS API | API 参考 |
| --- | --- |
| `MMCR.getAPI()` | [链接](../API/KubeJS#getapi--kubejsapi) |
| `event.createMachine(...)` | [链接](../API/KubeJS#createmachinestring-id--machinebuilderjs) |
| `MachineBuilderJS.displayNameKey(...)` | [链接](../API/KubeJS#displaynamekeystring-key--machinebuilderjs) |
| `MachineBuilderJS.recipeFamily(...)` | [链接](../API/KubeJS#recipefamilystring-recipefamilyid--machinebuilderjs) |
| `MachineBuilderJS.appearance(...)` | [链接](../API/KubeJS#appearancestring-machinebasicblock--machinebuilderjs) |
| `MachineBuilderJS.allowMultithreading()` | [链接](../API/KubeJS#allowmultithreading--machinebuilderjs) |
| `MachineBuilderJS.allowParallelism()` | [链接](../API/KubeJS#allowparallelism--machinebuilderjs) |
| `MachineBuilderJS.maxParallelAmount(...)` | [链接](../API/KubeJS#maxparallelamountlong-amount--machinebuilderjs) |
| `MachineBuilderJS.tickBehavior(...)` | [链接](../API/KubeJS#tickbehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) |
| `MachineBehaviorBuilderJS.serverTick(...)` | [链接](../API/KubeJS#servertickconsumer-tickbehaviorcontext-callback--machinebehaviorbuilderjs) |
| `TickBehaviorContext.ioPlan()` | [链接](../API/KubeJS#machineioplan) |
| `MachineIoPlan.addInput(...)` / `addOutput(...)` / `add(...)` / `simulate()` / `commit()` | [链接](../API/KubeJS#machineioplan) |
| `KubeJSApi.recipeIO()` | [链接](../API/KubeJS#recipeio--recipeiovalues) |
| `KubeJSApi.id(...)` | [链接](../API/KubeJS#idstring-id--identifier) |
| `KubeJSApi.screenScope()` | [链接](../API/KubeJS#screenscope--screenscopevalues) |
| `KubeJSApi.energyRequirement(...)` | [链接](../API/KubeJS#energyrequirementrecipeio-io-int-fepertick--machinerequirement) |
| `KubeJSApi.itemInputRequirement(...)` | [链接](../API/KubeJS#iteminputrequirementstring-itemid-int-count--machinerequirement) |
| `KubeJSApi.itemOutputRequirement(...)` | [链接](../API/KubeJS#itemoutputrequirementstring-itemid-int-count-float-chance--machinerequirement) |
| `event.registerControllerScreenText(...)` | [链接](../API/KubeJS#registercontrollerscreentextstring-machineid-consumercontrollerscreentexteventjs-handler--void) |
| `ControllerScreenTextEventJS.append(...)` | [链接](../API/KubeJS#appendstring-scope-string-lineid-component-text--void) |
| `KubeJSApi.block(...)` / `anyOf(...)` | [链接](../API/KubeJS#blockstring-blockid--blockpredicate) / [链接](../API/KubeJS#anyofblockpredicate-children--blockpredicate) |
| `KubeJSApi.anyOfItemInput()` / `anyOfItemOutput()` / `anyOfEnergyInput()` | [链接](../API/KubeJS#anyofiteminput--blockpredicate) / [链接](../API/KubeJS#anyofitemoutput--blockpredicate) / [链接](../API/KubeJS#anyofenergyinput--blockpredicate) |
| `KubeJSApi.parallelControllers()` / `factoryController()` | [链接](../API/KubeJS#parallelcontrollers--blockpredicate) / [链接](../API/KubeJS#factorycontroller--blockpredicate) |
| `MachineStructureBuilderJS.pattern(...)` / `set(...)` / `controller(...)` / `build()` | [链接](../API/KubeJS#patternstring-rows--machinestructurebuilderjs) / [链接](../API/KubeJS#setstring-symbol-object-value--machinestructurebuilderjs) / [链接](../API/KubeJS#controllerstring-symbol--machinestructurebuilderjs) / [链接](../API/KubeJS#build--void) |

源码里直接通过 `Java.loadClass` 拿一个 Java 类：

| Java 类 | 用途 |
| --- | --- |
| `net.minecraft.world.entity.player.Player` | 在范围内搜索玩家并以闪电攻击 |

## 机器定义

[`A_Pure_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Pure_Tick_Machine.js)：

```javascript
MMCREvents.startup(event => {
    const machine = event
        .createMachine("mmcr_kubejs:kubejs_pure_tick_machine")
        .displayNameKey("machine.mmcr_kubejs.kubejs_pure_tick_machine")
        .recipeFamily("mmcr_kubejs:kubejs_pure_tick_machine") // This will set the JEI recipe page type
        .appearance("minecraft:green_terracotta");

    const api = MMCR.getAPI()
    const Player = Java.loadClass("net.minecraft.world.entity.player.Player")
    // ...
})
```

链式调用：

- `.displayNameKey(...)`：本地化键。
- `.recipeFamily(...)`：老演员了。
- `.appearance("minecraft:green_terracotta")`：外观。

能力开关：

```javascript
machine
    // Here pure tick machine also allowed to use multi thread block and parallelism controller
    // But they do not have any actual usage, only become one type of numbers you can use in your code
    .allowMultithreading()
    .allowParallelism()
    .maxParallelAmount(2147483647)
    // Use tickBehavior will make the machine become a pure tick machine
    .tickBehavior(behavior => behavior
        .serverTick(ctx => {
            // ... 见下文
        })
    )

machine.register()
```

[`.tickBehavior(behavior => behavior.serverTick(ctx => { ... }))`](../API/KubeJS#tickbehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) 是关键。它把机器行为从默认 `RecipeBehavior.defaults()` 切换成 `TickBehavior`。**从此该机器没有配方**，`MachineBehavior.kind() == TICK`，所有运行时行为由脚本内容定义。

## 结构详解

[`structure/advance/A_Pure_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Pure_Tick_Machine.js)：

```javascript
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_pure_tick_machine")

    // superise! it's the same to recipe ticker...yeah I do not have any structure avalaible...
    structure
        .pattern("XXX", "AAA", "XXX")
        .pattern("XXX", "A A", "X X")
        .pattern("XXX", "ACA", "XXX")
        .set('X', api.block('minecraft:green_terracotta'))
        .set('A', api.anyOf(
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfEnergyInput(),
            api.parallelControllers(),
            api.factoryController(),
            api.block('minecraft:green_wool')
        ))
        .controller('C')
        .build()
})
```

字符含义：

- `'X'` → [`api.block('minecraft:green_terracotta')`](../API/KubeJS#blockstring-blockid--blockpredicate)：外壳，绿色陶瓦。
- `'A'` → [`api.anyOf(...)`](../API/KubeJS#anyofblockpredicate-children--blockpredicate) 包裹 6 类方块：物品输入/输出、能量输入、并行控制器、工厂控制器、装饰。
- `'C'` → 控制器。

## `serverTick` 回调详解

整台机器的全部行为都封装在 `serverTick` 这个回调里。

### 1. 节流：`isDue(40)`

```javascript
if (!ctx.isDue(40)) return
```

`ctx.isDue(40)` 返回当前 tick 是否对齐到 `40` 的整数倍，等价于 `(gameTime() % 40) == 0`。

### 2. FE 校验与 commit

```javascript
let plan_fe = ctx.ioPlan()

// need 10 FE to start this tick
plan_fe.addInput(api.energyRequirement(api.recipeIO().INPUT, 10))

const feSimulation = plan_fe.simulate()

if (!feSimulation.energySatisfied()) {
    // if fe not enough
    ctx.screenText().replace(
        api.id("mmcr_kubejs:fe_status"),
        Text.literal("FE is needed!")
    )
    // direct return
    return
}

// consume 10 FE
if (!plan_fe.commit().successful()) {
    ctx.screenText().replace(
        api.id("mmcr_kubejs:fe_status"),
        Text.literal("FE consume error!")
    )
    return
}
```

`ctx.ioPlan()` 返回一个全新的 [`MachineIoPlan`](../API/KubeJS#machineioplan)：

- `simulate()` 返回 `Simulation`，其中 `energySatisfied()` 告诉调用者能量总线是否有足够的 10 FE。
- `commit()` 产生消耗。`simulate()` 不会改动物品 / 能量，是一个只读模拟。

[`api.energyRequirement(api.recipeIO().INPUT, 10)`](../API/KubeJS#energyrequirementrecipeio-io-int-fepertick--machinerequirement) 构造"10 FE 输入"需求。

屏幕文本用 `ctx.screenText().replace(lineId, text)` 替换上一帧同 ID 的内容。这是 KubeJS 端 [`ControllerScreenTextEventJS.replace(...)`](../API/KubeJS#replacestring-lineid-component-text--void)。

:::warning 注意
`ioPlan()` 每次返回**新**的 `MachineIoPlan`，两次调用之间的状态不共享。下面步骤还要重新 `ctx.ioPlan()` 才能加物品。
:::

### 3. 范围搜玩家 → 召唤闪电

```javascript
// if fe is enough
ctx.screenText().replace(
    api.id("mmcr_kubejs:fe_status"),
    Text.literal("Machine do a run!")
    // actually, because this is a tick function, you can only see this line for one tick
)

// some tricks...summon lighting bolt?
const level = ctx.level()
const pos = ctx.controllerPos()
const area = AABB.of(
    pos.getX() - 1,
    level.getMinY(),
    pos.getZ() - 1,
    pos.getX() + 2,
    level.getMaxY() + 1,
    pos.getZ() + 2
)
const players = level.getEntitiesOfClass(Player, area)
players.forEach(player => {
    level.spawnLightning(
        player.getX(),
        player.getY(),
        player.getZ(),
        false
    )
})
```

这一步演示了 `TickBehavior` 的关键灵活性：**tick 回调里能做任何想做的事**，不限于读写物品 / 能量，也能操作实体。

`ctx.level()` 获取服务端世界，`ctx.controllerPos()` 获取控制器方块位置。用 KubeJS 提供的 `AABB.of(minX, minY, minZ, maxX, maxY, maxZ)` 构造一个 2×全高度×2 的 AABB 范围，`level.getEntitiesOfClass(Player, area)` 获取范围内的所有玩家实例，`level.spawnLightning(x, y, z, isCosmetic)` 召唤一道闪电。

### 4. 物品输入输出：`MachineIoPlan` 二次使用

> 这里的 `MachineIoPlan` 详见 [`MachineIoPlan`](../API/KubeJS#machineioplan) 条目；下面这一段集中演示 `addInput` / `addOutput` / `add` / `simulate()` / `outputs()` / `commit()` 的链式用法。

```javascript
// Do some io if you like
const plan = ctx.ioPlan()

plan.add(
    api.itemInputRequirement(
        "minecraft:iron_ingot",
        1
    )
)

plan.add(
    api.itemOutputRequirement(
        "minecraft:gold_nugget",
        1,
        1.0
    )
)

// if you want to process some special recipe
// make a simulate before the actual process start
const simulation = plan.simulate()

if (!simulation.inputsSatisfied()) return
let outputAvailable = true

simulation.outputs().forEach(output => {
    if (output.accepted() < output.requested()) {
        outputAvailable = false
    }
})

if (!outputAvailable) return

ctx.screenText().replace(
    api.id("mmcr_kubejs:pure_tick_status"),
    Text.literal("Iron Ingot inputed")
    // you can only see this line for one tick also
)

// if successed, commit it and we will get what we want
plan.commit()
```

**第二次**调用 `ctx.ioPlan()`，加入 1 个铁锭输入 + 1 个金粒输出：

- `api.itemInputRequirement(itemId, count)` 构造"物品输入"需求。
- `api.itemOutputRequirement(itemId, count, chance)` 构造"物品输出"需求，`chance = 1.0` 表示没有产生概率。
- 注意 `plan.add(...)` 与 `plan.addInput(...)` / `plan.addOutput(...)` 的区别：`add(...)` 根据 `requirement.io()` 自动路由到 `addInput` 或 `addOutput`，是更通用的写法。

模拟后通过 `simulation.inputsSatisfied()` 校验输入，再遍历 `simulation.outputs()` 检查每个输出项的 `accepted() >= requested()`，强制要求**全部输出能放下**，否则 `return`。

最后 `plan.commit()` 真正消耗输入并产出。不需要接 `.successful()` ，前两段已经做了充分校验。

## 控制器屏幕静态文本

```javascript
// register a static text line
// NOTICE:
// use static lines and ctx.screenText().replace() always depend on the actual situation
// the static lines will refresh every client tick and replace is always the last one which is able to cover static lines
// If you want to make some differences, please use data storage and networks
// Which will showed in 数据存储测试机器
event.registerControllerScreenText(
    "mmcr_kubejs:kubejs_pure_tick_machine",
    text => {
        text.append(
            "controller",
            "mmcr_kubejs:fe_status",
            Text.literal("FE is needed!")
        )

        text.append(
            "controller",
            "mmcr_kubejs:pure_tick_status",
            Text.literal("No Ingot input")
        )
    }
)
```

[`event.registerControllerScreenText(machineId, handler)`](../API/KubeJS#registercontrollerscreentextstring-machineid-consumercontrollerscreentexteventjs-handler--void) 注册一段屏幕文本初始化逻辑。回调里的 `text` 是 [`ControllerScreenTextEventJS`](../API/KubeJS#controllerscreentexteventjs) 实例，调用 [`text.append(scope, lineId, component)`](../API/KubeJS#appendstring-scope-string-lineid-component-text--void) 添加两行静态提示：

- `fe_status` → `"FE is needed!"`。
- `pure_tick_status` → `"No Ingot input"`。

## 特殊机制

### `TickBehavior` vs `RecipeBehavior` 的钩子差异

[`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) 在两种机器行为下可用的回调**完全不同**：

> `MachineBuilderJS` 已经把 [`preServerTick`](../API/KubeJS#preservertickconsumer-machinebehaviorcontext-callback--machinebuilderjs) 与 [`postServerTick`](../API/KubeJS#postservertickconsumer-machinebehaviorcontext-callback--machinebuilderjs) 单独放在 `MachineBuilderJS` 上而不是 `MachineBehaviorBuilderJS` 上。它们是配方机器的"机器级全局 tick 钩子"，只能与 `recipeBehavior` 一起使用。`tickBehavior` 的等价物是 `serverTick`。

具体可用钩子（详见 [`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) 与 [`MachineBuilderJS`](../API/KubeJS#machinebuilderjs)）：

| 钩子 | 位置 | 适用机器 | 触发时机 |
| --- | --- | --- | --- |
| [`idleStart`](../API/KubeJS#idlestartconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `recipeBehavior` | 进入 idle 状态 |
| [`idleEnd`](../API/KubeJS#idleendconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `recipeBehavior` | 离开 idle 状态 |
| [`beforeStart`](../API/KubeJS#beforestartconsumer-recipestartcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `recipeBehavior` | 配方启动前，可改需求 / 输出 |
| [`recipeTick`](../API/KubeJS#recipetickconsumer-recipetickcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `recipeBehavior` | 配方执行中每 tick |
| [`beforeFinish`](../API/KubeJS#beforefinishconsumer-recipefinishcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `recipeBehavior` | 配方提交输出前 |
| [`serverTick`](../API/KubeJS#servertickconsumer-tickbehaviorcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `tickBehavior` | 每服务端 tick 一次（无配方） |
| [`preServerTick`](../API/KubeJS#preservertickconsumer-machinebehaviorcontext-callback--machinebuilderjs) | `MachineBuilderJS` | `recipeBehavior` | 配方机器每次 server tick 前 |
| [`postServerTick`](../API/KubeJS#postservertickconsumer-machinebehaviorcontext-callback--machinebuilderjs) | `MachineBuilderJS` | `recipeBehavior` | 配方机器每次 server tick 后 |

> 重要规则：`tickBehavior(...)` 之后再调用 `preServerTick` / `postServerTick` 会抛 `IllegalStateException`。`recipeBehavior(...)` 之后再调用 `serverTick` 同理会抛 `IllegalStateException`。两条路径互斥。

本机器只用到 [`serverTick`](../API/KubeJS#servertickconsumer-tickbehaviorcontext-callback--machinebehaviorbuilderjs)；[`idleStart`](../API/KubeJS#idlestartconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) / [`idleEnd`](../API/KubeJS#idleendconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) / [`preServerTick`](../API/KubeJS#preservertickconsumer-machinebehaviorcontext-callback--machinebuilderjs) / [`postServerTick`](../API/KubeJS#postservertickconsumer-machinebehaviorcontext-callback--machinebuilderjs) 都不可用（强行调用会抛 `IllegalStateException`），因为 `MachineBehavior.kind() == TICK`。

### `MachineIoPlan` 的一次性原则

`MachineIoPlan` 在示例中使用了两次：一次接收 FE，一次接收物品与输出物品。**两次必须新建 plan**。`commit()` 后 plan 失效，如果第二次复用同一个 plan 引用，会抛异常。

两次写法为：

```javascript
let plan_fe = ctx.ioPlan()
// ...
plan_fe.addInput(api.energyRequirement(...))
plan_fe.simulate()
plan_fe.commit()

// 这里要重新 ctx.ioPlan()：
const plan = ctx.ioPlan()
plan.add(api.itemInputRequirement(...))
plan.add(api.itemOutputRequirement(...))
plan.simulate()
plan.commit()
```

### 屏幕文本：`replace(...)` vs `append(...)`

[`ControllerScreenTextEventJS`](../API/KubeJS#controllerscreentexteventjs) 暴露 `append` / `appendAfter` / `remove` / `clear` / `replace`。本机器在 [`registerControllerScreenText(...)`](../API/KubeJS#registercontrollerscreentextstring-machineid-consumercontrollerscreentexteventjs-handler--void) 注册时用 `append(...)` 写初始两行（`controller` scope，静态），之后在 `serverTick` 里改写时用 [`replace(lineId, text)`](../API/KubeJS#replacestring-lineid-component-text--void)。

两者关键区别（[`KubeJS.md`](../API/KubeJS#controllerscreentexteventjs) 中详细列出）：

| 方法 | 是否要 scope | 行为 |
| --- | --- | --- |
| `append(scope, lineId, text)` | 是 | 同 scope 内相同 `lineId` 会被替换，但其他 scope 不受影响 |
| `replace(lineId, text)` | 否 | 跨 scope 替换同 ID 的行 |

之所以 `replace(...)` 更适合，是因为 `fe_status` 与 `pure_tick_status` 这两个 `lineId` 在改写时不需要再考虑它们属于 `controller` 还是 `operation`。

### `allowMultithreading()` / `allowParallelism()` 对纯 tick 机器的影响

`serverTick` 内部并不会真的"按并行度循环执行"。如果想做"按并行度循环"的逻辑，要在 [`recipeBehavior`](../API/KubeJS#recipebehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) 和 [`recipeTick`](../API/KubeJS#recipetickconsumer-recipetickcontext-callback--machinebehaviorbuilderjs)注入自定义tick。

## 何时用 PURE_TICK vs RECIPE_TICK

| 场景 | 推荐 | 原因 |
| --- | --- | --- |
| 发电机、反应堆、流水线（持续被动效果） | `tickBehavior` | 没有明确的"输入 → 输出"映射，只需按 tick 推进 |
| 范围搜索实体、施加效果、调用其他游戏机制 | `tickBehavior` | 这类副作用无法用配方表达，必须在 tick 里直接调用 |
| 修改需求 / 输出（增删条件、按玩家距离调整） | `recipeBehavior.beforeStart` / `beforeFinish` | 这两个钩子提供 `setRequirements(...)` / `setOutputs(...)` |
| 配方存在但每 tick 的具体动作完全自定 | `recipeBehavior.recipeTick` | 配方生命周期已经接管，能拿到当前 tick / 总 tick |
| 自定义复杂合成的节奏（多阶段、跨配方共享需求修改） | `recipeBehavior` | 仍需要配方数据来定义"做什么"，但每个阶段需要插入自定义回调 |

本机器同时涵盖了**节流、能量校验、副作用（闪电）、物品 IO**。

## 延伸阅读

- [数据存储测试机器](./数据存储测试机器) — 同为 `tickBehavior` 但带 `DataStorage`。
- [算力-网络交互示例](./算力-网络交互示例) — 同为 `tickBehavior` 但带网络通信。
- [配方Tick示例](./配方Tick示例) — 同组对比，演示 `recipeBehavior` 的 5 个钩子。
- [纯Tick测试机器](../JavaAPI/纯Tick测试机器) — 本机器的 Java 端实现。
- [配方Tick测试机器](../JavaAPI/配方Tick测试机器) — `recipeBehavior` 在 Java 端的完整演示。
- [KubeJS API](../API/KubeJS) — 本教程引用 API 的集中参考。
- [KubeJS API#tickBehavior](../API/KubeJS#tickbehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) — 直 tick 模式入口。
- [KubeJS API#serverTick](../API/KubeJS#servertickconsumer-tickbehaviorcontext-callback--machinebehaviorbuilderjs) — 每 tick 一次的回调。
- [KubeJS API#MachineIoPlan](../API/KubeJS#machineioplan) — `ctx.ioPlan()` 返回的 IO 计划入口。
- [KubeJS API#MachineBehaviorBuilderJS](../API/KubeJS#machinebehaviorbuilderjs) — 行为构建器的钩子清单。