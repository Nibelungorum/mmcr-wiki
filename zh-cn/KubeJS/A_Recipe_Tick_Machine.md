---
title: A_Recipe_Tick_Machine
order: 13
---

# A_Recipe_Tick_Machine — KubeJS 配方 tick 机器

本文是 KubeJS 进阶示例的第四篇。我们逐段拆解 [`A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Recipe_Tick_Machine.js) 与 [对应的结构脚本](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js)。本机器**有配方**，但在配方生命周期的 5 个阶段（`idleStart` / `idleEnd` / `beforeStart` / `recipeTick` / `beforeFinish`）都插入自定义回调——是 [RECIPE_TICKER](../JavaAPI/RECIPE_TICKER) 的脚本版实现。

它跟 [A_Pure_Tick_Machine](./A_Pure_Tick_Machine) 是同组对比：两者都"按 tick 自定义"，但 A_Pure_Tick_Machine 完全没有配方，本机器走 [`recipeBehavior`](../API/KubeJS#recipebehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs)，在 5 个钩子上插入回调。本教程会重点展开 [`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) 的链式调用，区分 PURE_TICK vs RECIPE_TICK，并讲清"配方需求改写"的特殊机制。

## 机器简介

A_Recipe_Tick_Machine 是一台 3×3×3 的绿色陶瓦壳，中心是控制器，演示 [`RecipeBehavior`](../API/KubeJS#recipebehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) 的 5 个钩子：

1. **`idleStart` / `idleEnd`**：进入 / 离开 idle 状态时显示提示。
2. **`beforeStart`**：配方启动前给范围内生物加力量效果，并把"32 金锭"的需求改写成"1 金锭"。
3. **`recipeTick`**：配方每 tick 在屏幕上追加"正在使用雷霆大猪咪暴力执行配方"。
4. **`beforeFinish`**：配方提交输出前给范围内生物加夜视效果。

它与 [A_Pure_Tick_Machine](./A_Pure_Tick_Machine) / [A_Simple_Machine](./A_Simple_Machine) / [BLAST_FURNACE](../JavaAPI/BLAST_FURNACE) 是同一组对比，四台机器分别走四种路线：

| 机器 | 行为实现 | `MachineBehavior.Kind` | 配方 |
| --- | --- | --- | --- |
| [A_Simple_Machine](./A_Simple_Machine) / [BLAST_FURNACE](../JavaAPI/BLAST_FURNACE) | `RecipeBehavior.defaults()`（空钩子） | `RECIPE` | 1 条 |
| [A_Pure_Tick_Machine](./A_Pure_Tick_Machine) | `tickBehavior` | `TICK` | 无（用 `MachineIoPlan` 自驱） |
| **A_Recipe_Tick_Machine** | `recipeBehavior` | `RECIPE` | 3 条 + 5 个钩子 |

本机器**注册了 3 条配方**——但与 KubeJS 端的事件式配方注册不同，本机器**没有 `server_scripts/recipe/...` 文件**。KubeJS 端 `event.custom({ type: 'mmcr:machine_recipe', ... })` 也可以写，但本机器的 3 条配方是通过**程序化配方构建器** + `MMCREvents.server` 事务注册的。具体写法见下文"配方详解"一节。

## 本教程涉及的文件

源码位置：

- [`startup_scripts/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Recipe_Tick_Machine.js) — 机器定义、5 个钩子、静态屏幕文本、3 条配方。
- [`server_scripts/structure/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js) — 多方块结构。

Java 对照：[RECIPE_TICKER](../JavaAPI/RECIPE_TICKER)。

## 本教程涉及的 API 跳转表

| 用到的 KubeJS API | API 参考 |
| --- | --- |
| `MMCR.getAPI()` | [链接](../API/KubeJS#getapi--kubejsapi) |
| `event.createMachine(...)` | [链接](../API/KubeJS#createmachinestring-id--machinebuilderjs) |
| `MachineBuilderJS.displayNameKey(...)` | [链接](../API/KubeJS#displaynamekeystring-key--machinebuilderjs) |
| `MachineBuilderJS.recipeFamily(...)` | [链接](../API/KubeJS#recipefamilystring-recipefamilyid--machinebuilderjs) |
| `MachineBuilderJS.appearance(...)` | [链接](../API/KubeJS#appearancestring-machinebasicblock--machinebuilderjs) |
| `MachineBuilderJS.recipeBehavior(...)` | [链接](../API/KubeJS#recipebehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) |
| `MachineBehaviorBuilderJS.idleStart(...)` | [链接](../API/KubeJS#idlestartconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.idleEnd(...)` | [链接](../API/KubeJS#idleendconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.beforeStart(...)` | [链接](../API/KubeJS#beforestartconsumer-recipestartcontext-callback--machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.recipeTick(...)` | [链接](../API/KubeJS#recipetickconsumer-recipetickcontext-callback--machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.beforeFinish(...)` | [链接](../API/KubeJS#beforefinishconsumer-recipefinishcontext-callback--machinebehaviorbuilderjs) |
| `KubeJSApi.id(...)` | [链接](../API/KubeJS#idstring-id--identifier) |
| `KubeJSApi.screenScope()` | [链接](../API/KubeJS#screenscope--screenscopevalues) |
| `event.registerControllerScreenText(...)` | [链接](../API/KubeJS#registercontrollerscreentextstring-machineid-consumercontrollerscreenteventeventjs-handler--void) |
| `ControllerScreenTextEventJS.append(...)` | [链接](../API/KubeJS#appendstring-scope-string-lineid-component-text--void) |
| `ControllerScreenTextEventJS.appendAfter(...)` | [链接](../API/KubeJS#appendafterstring-scope-string-lineid-string-afterlineid-component-text--void) |
| `ControllerScreenTextEventJS.appendTranslatable(...)` | [链接](../API/KubeJS#appendtranslatablestring-scope-string-lineid-string-key-object-args--void) |
| `ControllerScreenTextEventJS.appendAfterTranslatable(...)` | [链接](../API/KubeJS#appendaftertranslatablestring-scope-string-lineid-string-afterlineid-string-key-object-args--void) |
| `ControllerScreenTextEventJS.remove(...)` | [链接](../API/KubeJS#removestring-scope-string-lineid--void) |
| `KubeJSApi.block(...)` / `anyOf(...)` | [链接](../API/KubeJS#blockstring-blockid--blockpredicate) / [链接](../API/KubeJS#anyofblockpredicate-children--blockpredicate) |
| `KubeJSApi.anyOfItemInput()` / `anyOfItemOutput()` / `anyOfEnergyInput()` | [链接](../API/KubeJS#anyofiteminput--blockpredicate) / [链接](../API/KubeJS#anyofitemoutput--blockpredicate) / [链接](../API/KubeJS#anyofenergyinput--blockpredicate) |
| `KubeJSApi.parallelControllers()` | [链接](../API/KubeJS#parallelcontrollers--blockpredicate) |
| `MachineStructureBuilderJS.pattern(...)` / `set(...)` / `controller(...)` / `build()` | [链接](../API/KubeJS#patternstring-rows--machinestructurebuilderjs) / [链接](../API/KubeJS#setstring-symbol-object-value--machinestructurebuilderjs) / [链接](../API/KubeJS#controllerstring-symbol--machinestructurebuilderjs) / [链接](../API/KubeJS#build--void) |

源码里直接通过 `Java.loadClass` 拿的 Java 类：

| Java 类 | 用途 |
| --- | --- |
| `net.minecraft.world.entity.LivingEntity` | 在范围内搜生物用于加效果 |
| `net.minecraft.world.effect.MobEffects` | `STRENGTH` / `NIGHT_VISION` 效果常量 |
| `cn.howxu.mmcr.api.recipe.requirement.ItemRequirement` | `beforeStart` 里构造新需求 |
| `java.util.ArrayList` | 累积新需求列表 |
| `net.minecraft.core.registries.BuiltInRegistries` | 通过 item 拿到注册名 |

## 机器定义详解

打开启动期脚本 [`A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Recipe_Tick_Machine.js)：

```javascript
MMCREvents.startup(event => {

    const api = MMCR.getAPI() // I suggest use MMCR.getAPI() in start_up script
    // Some advanced KubeJS usage
    const LivingEntity = Java.loadClass("net.minecraft.world.entity.LivingEntity")
    const MobEffects = Java.loadClass("net.minecraft.world.effect.MobEffects")

    // Some Class
    const ItemRequirement = Java.loadClass("cn.howxu.mmcr.api.recipe.requirement.ItemRequirement")
    const ArrayList = Java.loadClass("java.util.ArrayList")
    const BuiltInRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries")

    const machine = event
        .createMachine("mmcr_kubejs:kubejs_recipe_ticker")
        .displayNameKey("machine.mmcr_kubejs.kubejs_recipe_ticker")
        .recipeFamily("mmcr_kubejs:kubejs_recipe_ticker")
        .appearance("minecraft:green_terracotta")
        // Here you can set some recipe tick hook
        .recipeBehavior(behavior => behavior
            .idleStart(ctx => { /* ... */ })
            .idleEnd(ctx => { /* ... */ })
            .beforeStart(ctx => { /* ... */ })
            .recipeTick(ctx => { /* ... */ })
            .beforeFinish(ctx => { /* ... */ })
        )
    // ...
    machine.register()
})
```

源码注释 `I suggest use MMCR.getAPI() in start_up script` 是关键提示：把 `api` 在脚本顶层取一次就够，反复调用 `MMCR.getAPI()` 每次都返回同一实例，没有性能差异，但提取常量更便于阅读。

链式调用：

- `.displayNameKey(...)` / `.recipeFamily(...)` / `.appearance("minecraft:green_terracotta")`：和 [A_Simple_Machine](./A_Simple_Machine) 同一种约定。
- [`.recipeBehavior(behavior => behavior.xxx(...))`](../API/KubeJS#recipebehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) 把行为切到 `recipeBehavior`。**与 [`.tickBehavior(...)`](../API/KubeJS#tickbehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) 互斥**——一旦调用了其中一个，另一个会抛 `IllegalStateException`。

[`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) 提供 5 个钩子，本机器全用上：

| 钩子 | 接收的上下文 | 触发时机 |
| --- | --- | --- |
| [`idleStart`](../API/KubeJS#idlestartconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorContext` | 进入 idle 状态 |
| [`idleEnd`](../API/KubeJS#idleendconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorContext` | 离开 idle 状态 |
| [`beforeStart`](../API/KubeJS#beforestartconsumer-recipestartcontext-callback--machinebehaviorbuilderjs) | `RecipeStartContext` | 配方启动前，可改需求 / 输出 |
| [`recipeTick`](../API/KubeJS#recipetickconsumer-recipetickcontext-callback--machinebehaviorbuilderjs) | `RecipeTickContext` | 配方执行中每 tick |
| [`beforeFinish`](../API/KubeJS#beforefinishconsumer-recipefinishcontext-callback--machinebehaviorbuilderjs) | `RecipeFinishContext` | 配方提交输出前 |

源码末尾在 `MMCREvents.startup` 之外另有配方注册段，详见后文"配方详解"。

## 结构详解

打开 [`structure/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js)：

```javascript
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_recipe_ticker")

    structure
        .pattern("XXX", "AAA", "XXX")
        .pattern("XXX", "A A", "X X")
        .pattern("XXX", "ACA", "XXX")
        .set('X', api.block('minecraft:green_terracotta'))
        .set('A', api.anyOf(
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfEnergyInput(),
            api.parallelControllers(), // this is all parallel controller
            api.block('minecraft:green_wool')
        ))
        .controller('C')
        .build()
})
```

3×3×3 壳 + 同样的 A 位置接口集合。和 [A_Pure_Tick_Machine](./A_Pure_Tick_Machine) 的唯一区别是 A 位置**不**接受 [`api.factoryController()`](../API/KubeJS#factorycontroller--blockpredicate)——本机器没有声明 `.factory(...)`。注释 `this is all parallel controller` 说明 `parallelControllers()` 是"所有并行控制器"的并集。

## 钩子详解

### `idleStart`：进入空闲

```javascript
.idleStart(ctx => {
    // This add two lines to the controller UI
    const screen = ctx.screenText()
    screen.append(
        api.screenScope().OPERATION,
        api.id("mmcr_kubejs:display_when_idle_empty_line"),
        Text.literal(" ")
    )
    screen.append(
        api.screenScope().OPERATION,
        api.id("mmcr_kubejs:display_when_idle"),
        Text.translatable(
            "gui.mmcr_kubejs.display_when_idle",
        )
    )
})
```

这里的 `ctx` 是 [`MachineBehaviorContext`](../API/KubeJS)，没有 `currentTick()` / `recipe()` 这类"配方上下文"方法。写入 [`api.screenScope().OPERATION`](../API/KubeJS#screenscope--screenscopevalues) 作用域——`OPERATION` 与 `controller` 的关键区别：

| scope | 内容来源 | 重置时机 |
| --- | --- | --- |
| `controller` | Mod 完全控制 | 由 Mod 自己管理 |
| `OPERATION` | MMCR 自动 + Mod 追加 | 每个配方生命周期自动重置 |

`idleStart` 写入 `OPERATION` scope 的内容，会在配方开始时被 MMCR 清掉——配合 `beforeStart` 里"清掉 idle 行"的写法，屏幕上不会同时出现"idle 提示"与"运行中提示"。

[`idleEnd`](../API/KubeJS#idleendconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) 是空实现：MMCR 已经在配方开始时清掉 idle 行，无需在 `idleEnd` 再手动 `remove(...)`。

源码里两行 idle 文本：

- `display_when_idle_empty_line` → `Text.literal(" ")`（一个空格占位行）；
- `display_when_idle` → [`Text.translatable("gui.mmcr_kubejs.display_when_idle")`](https://kubejs.com/wiki/tutorials/text-component) 让客户端按玩家语言显示翻译。

### `beforeStart`：配方启动前的钩子（核心）

`beforeStart` 是本机器里最有意思的一段——做了三件事：清屏幕、加效果、改需求。

```javascript
.beforeStart(ctx => {
    // This will clear the lines when it's not idle
    // NOTICE: here ctx is different from idleStart ctx, you should use ctx.machineContext().screenText() to get the text lines
    const screen = ctx.machineContext().screenText()
    screen.remove(
        api.screenScope().OPERATION,
        api.id("mmcr_kubejs:display_when_idle_empty_line")
    )
    screen.remove(
        api.screenScope().OPERATION,
        api.id("mmcr_kubejs:display_when_idle")
    )
    const machineContext = ctx.machineContext()
    const level = machineContext.level()
    const controllerPos = machineContext.controllerPos()
    const minX = controllerPos.getX() - 2
    const minZ = controllerPos.getZ() - 2
    const maxX = controllerPos.getX() + 3
    const maxZ = controllerPos.getZ() + 3
    const area = AABB.of(
        minX,
        level.getMinY(),
        minZ,
        maxX,
        level.getMaxY() + 1,
        maxZ
    )

    level.getEntitiesOfClass(LivingEntity, area).forEach(entity => {
        entity.potionEffects.add(MobEffects.STRENGTH, 10000, 1)
    })

    // declare if there are 32 gold ingots, if true set the actual input to 1
    // Here is one example you can reproduce with just kubejs
    // I suggest to use Java API if you want more complex tick
    const nextRequirements = new ArrayList()
    let changed = false

    ctx.requirements().forEach(requirement => {
        // loop the requirements and find ItemInputRequirement
        if (!(requirement instanceof ItemRequirement)
            || String(requirement.io().getKey()) !== "input") {
            nextRequirements.add(requirement)
            return
        }

        // Maybe complex, tag or item or s stack of item
        const possibleItems = requirement.item().getStackArray()
        const isExactlyGold =
            requirement.count() === 32 // count
            && possibleItems.length === 1 // one time input
            && BuiltInRegistries.ITEM
                .getKey(possibleItems[0].getItem())
                .toString() === "minecraft:gold_ingot" // register key compare

        if (isExactlyGold) {
            // change the requirement
            nextRequirements.add(new ItemRequirement(
                requirement.io(),
                requirement.item(),
                1,
                requirement.stack(),
                requirement.chance(),
                requirement.tags(),
                requirement.components(),
                requirement.consumeChance()
            ))
            changed = true
        } else {
            // or be default cosume
            nextRequirements.add(requirement)
        }
    })

    if (changed) {
        // then change the input requirement
        // actual cosumation will be changed in the actual process
        ctx.setRequirements(nextRequirements)
    }
})
```

`RecipeStartContext` 提供两个关键能力：

- `ctx.machineContext()`：拿到 [`MachineBehaviorContext`](../API/KubeJS)，可读 `level()` / `controllerPos()` / `screenText()`。这是 `beforeStart` / `recipeTick` / `beforeFinish` 共用的"返回机器上下文"路径。
- `ctx.requirements()` 与 `ctx.setRequirements(...)`：读取 / 替换配方输入需求列表。

源码注释提醒：

> here ctx is different from idleStart ctx, you should use ctx.machineContext().screenText() to get the text lines

也就是说，`idleStart` 的 `ctx` 直接是 `MachineBehaviorContext`，调 `ctx.screenText()`；`beforeStart` 的 `ctx` 是 `RecipeStartContext`，要 `ctx.machineContext().screenText()`——多一层间接。这一区别对 [`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) 的所有钩子都成立：**只有 `idleStart` / `idleEnd` / `preServerTick` / `postServerTick` 直接拿 `MachineBehaviorContext`**。

上面这段做了三件事：

1. **清 idle 行**：把 `idleStart` 写入的两行 `remove(...)`——避免同时显示"idle 提示"与"运行中提示"。
2. **加效果**：给范围内所有 `LivingEntity` 加 10000 tick 的力量 II 效果。源码用 KubeJS 提供的 `entity.potionEffects.add(...)` 封装，比 Java 的 `entity.addEffect(new MobEffectInstance(...))` 简洁。
3. **修改配方需求**：遍历 `ctx.requirements()`，如果某条 [`ItemRequirement`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/cn/howxu/mmcr/api/recipe/requirement/ItemRequirement.java) 是"32 个金锭且唯一匹配 `minecraft:gold_ingot`"的需求，就替换成"1 个金锭"；其他需求保持原样。这就是 "RECIPE_TICKER" 名字的由来——根据当前状态调整配方内容，让原本要求 32 金锭的配方变成 1 金锭就能跑。

源码注释 *I suggest to use Java API if you want more complex tick* 是提示：复杂的需求改写逻辑写脚本会比较啰嗦，Java 端 [`MachineRecipeDefinition.modifiers`](../API/JavaAPI#machinerecipedefinition) 提供更紧凑的写法。

> 关键观察：配方数据里写的是 32 金锭，但实际只消耗 1 金锭——这就是 `RecipeStartContext.setRequirements(...)` 的力量：**配方数据 + 运行时调整，二者分离**。

`ctx.requirements()` 返回的是 `List<MachineRequirement>` 不可变副本，修改它不会影响底层 `MachineRecipe`；必须通过 `setRequirements(...)` 替换，MMCR 才会在 `beforeStart` 结束时统一应用。

### `recipeTick`：配方每 tick 触发

```javascript
.recipeTick(ctx => {
    // When recipe is running, append some infomation to the machine controller
    // it's too difficult to implement grid layout, which would be complex to accelete the actual pixels with characters
    const screen = ctx.machineContext().screenText()

    screen.appendAfter(
        api.screenScope().OPERATION,
        api.id("mmcr_kubejs:display_when_start_recipe"),
        api.id("mmcr_kubejs:in_line"),
        // Just Text.literal is allowed
        // For this fully custom usage, I even provide sprintf
        Text.literal("正在使用雷霆大猪咪暴力执行配方")
    )
})
```

[`RecipeTickContext`](../API/KubeJS#recipetickcontext) 与 `RecipeStartContext` 的关键区别（[`KubeJS.md`](../API/KubeJS#machinebehaviorbuilderjs) 末尾的"注意事项"明确列出）：

| 能力 | `RecipeStartContext` | `RecipeTickContext` |
| --- | --- | --- |
| `ctx.machineContext()` | ✓ | ✓ |
| `ctx.currentTick()` / `ctx.totalTick()` | ✗ | ✓ |
| `ctx.parallelism()` | ✗ | ✓ |
| `ctx.setRequirements(...)` / `setOutputs(...)` | ✓ | ✗（只读副本） |
| `ctx.cancel()` | ✓ | ✗ |

也就是说，`recipeTick` **不能修改配方需求 / 输出**——它只能读取 `currentTick()` 并基于此写屏幕文本 / 施加效果 / 调用其他游戏机制。如果想修改需求，应该在 `beforeStart` 里做；如果想在完成前改输出，应该在 `beforeFinish` 里做。这样区分是因为"配方执行中"如果改需求 / 输出，会破坏 MMCR 的并行执行——所以 `recipeTick` 的需求 / 输出字段是只读副本。

[`ControllerScreenText.appendAfter(...)`](../API/KubeJS#appendafterstring-scope-string-lineid-string-afterlineid-component-text--void) 把这条"雷霆大猪咪"插到 `in_line` 之后——与下文"静态屏幕文本"里的 `IN_LINE` 形成呼应：注册时在 `sp_line_1` 后插入 `IN_LINE`，运行时在 `IN_LINE` 后再追加运行信息。

### `beforeFinish`：配方提交输出前的钩子

```javascript
.beforeFinish(ctx => {
    // before finish and output the recipe
    // you can also change the result if you want
    // here we just add one potion effect
    const machineContext = ctx.machineContext()
    const level = machineContext.level()
    const controllerPos = machineContext.controllerPos()
    const minX = controllerPos.getX() - 2
    const minZ = controllerPos.getZ() - 2
    const maxX = controllerPos.getX() + 3
    const maxZ = controllerPos.getZ() + 3
    const area = AABB.of(
        minX,
        level.getMinY(),
        minZ,
        maxX,
        level.getMaxY() + 1,
        maxZ
    )

    level.getEntitiesOfClass(LivingEntity, area).forEach(entity => {
        entity.potionEffects.add(MobEffects.NIGHT_VISION, 10000, 1)
    })
})
```

[`RecipeFinishContext`](../API/KubeJS#recipefinishcontext) 提供 `ctx.machineContext()` / `ctx.setOutputs(...)` / `ctx.discardOutputs(...)` / `ctx.cancel()`。本机器在 `beforeFinish` 里只施加夜视效果，没修改输出——但已经足够演示 `RecipeFinishContext` 的"读取机器上下文"路径。

把 `beforeStart`（力量 II）与 `beforeFinish`（夜视）拼起来看：机器在配方开始前给玩家加力量，配方完成时给玩家加夜视——这是个完整的"启动 → 完成"循环。

## 静态屏幕文本

```javascript
// Register Controller UI lines
// You are allowed to use an event registry to add your custom lines to controller UI
// MMCR will automatically organize them and display
event.registerControllerScreenText("mmcr_kubejs:kubejs_recipe_ticker", text => {
    text.appendTranslatable(
        "controller", // means it's a static text line
        "mmcr_kubejs:before_line",
        "gui.mmcr_kubejs.before_line"
    )

    text.appendAfterTranslatable(
        "controller",
        "mmcr_kubejs:in_line",       // the new line id
        "mmcr_kubejs:sp_line_1",     // then you can set it must be after which line
        "gui.mmcr_kubejs.in_line"
    )

    text.appendTranslatable(
        "controller",
        "mmcr_kubejs:after_line",
        "gui.mmcr_kubejs.after_line"
    )
})
```

[`event.registerControllerScreenText(...)`](../API/KubeJS#registercontrollerscreentextstring-machineid-consumercontrollerscreenteventeventjs-handler--void) 注册 3 行静态文本：

- [`appendTranslatable("controller", "mmcr_kubejs:before_line", "gui.mmcr_kubejs.before_line")`](../API/KubeJS#appendtranslatablestring-scope-string-lineid-string-key-object-args--void) — `before_line` 行。
- [`appendAfterTranslatable("controller", "mmcr_kubejs:in_line", "mmcr_kubejs:sp_line_1", "gui.mmcr_kubejs.in_line")`](../API/KubeJS#appendaftertranslatablestring-scope-string-lineid-string-afterlineid-string-key-object-args--void) — 把 `in_line` 插到 `sp_line_1`（MMCR 自动生成的内部分隔行）之后。
- [`appendTranslatable("controller", "mmcr_kubejs:after_line", "gui.mmcr_kubejs.after_line")`](../API/KubeJS#appendtranslatablestring-scope-string-lineid-string-key-object-args--void) — `after_line` 行。

最终屏幕上按 `before_line → sp_line_1 → in_line → after_line` 排列，是"模板行 → 内容行"分段展示的典型用法。`recipeTick` 里再在 `in_line` 后追加"雷霆大猪咪"信息，运行时屏幕就是 `before_line → sp_line_1 → in_line → 雷霆大猪咪 → after_line`。

注释 *means it's a static text line* 解释 `"controller"` scope 的语义——静态行每次客户端 tick 都会重新执行，**独立于配方生命周期**。

## 配方详解

**本机器在 KubeJS 端不写 `server_scripts/recipe/A_Recipe_Tick_Machine.js`**。那 3 条配方在哪？

实际上，源仓库的 `startup_scripts/advance/A_Recipe_Tick_Machine.js` **也没有写配方注册**——本机器的所有"配方逻辑"都在 `recipeBehavior` 的 5 个钩子里。如果你需要给本机器添加配方，应该：

- 方式 A：**数据驱动**——在 `server_scripts/recipe/A_Recipe_Tick_Machine.js` 里用 `ServerEvents.recipes(...)` + `event.custom({ type: 'mmcr:machine_recipe', ... })` 写 JSON。详见 [A_Simple_Machine](./A_Simple_Machine) 的"配方"章节。
- 方式 B：**编程式构建器**——`new (Java.loadClass("cn.howxu.mmcr.compat.kubejs.MachineRecipeBuilderJS"))(recipeId).machine(machineId).itemInput(...).itemOutput(...).energyPerTick(...).tickTime(...).build()`。详见 [`MachineRecipeBuilderJS`](../API/KubeJS#machinerecipebuilderjs)。

Java 端对应 [RECIPE_TICKER](../JavaAPI/RECIPE_TICKER) 的 3 条配方：

```java
var recipe = MachineRecipeBuilder
        .recipe(RECIPE_TICKER.withSuffix("_recipe_1"), RECIPE_TICKER)
        .inputItem(Items.COAL, 10000)
        .inputItem(Items.DIAMOND, 8)
        .outputItem(Items.GOLD_INGOT, 9)
        .inputEnergy(20)
        .duration(500)
        .build();
```

这 3 条配方的输入 / 输出 / 时长：

| 配方 ID | 输入 | 输出 | 时长 |
| --- | --- | --- | --- |
| `recipe_1` | 煤 10000 + 钻石 8 + 20 FE/t | 金锭 9 | 25 秒 |
| `recipe_2` | 钻石 114514 + 铁锭 8 + 20 FE/t | 煤 18 | 15 秒 |
| `recipe_3` | 金锭 32 + 木棍 8 + 20 FE/t | 钻石 3 | 15 秒 |

注意 `recipe_3` 与 `beforeStart` 钩子的联动：

- 配方数据说 32 金锭；
- `beforeStart` 把"32 金锭且只匹配金锭"的需求替换成 1 金锭；
- 玩家实际只需在输入总线放 1 个金锭就能触发配方。

要在 KubeJS 端等价注册这 3 条，可以写一个 `server_scripts/recipe/A_Recipe_Tick_Machine.js`：

```javascript
ServerEvents.recipes(event => {
    event.custom({
        type: 'mmcr:machine_recipe',
        machine: 'mmcr_kubejs:kubejs_recipe_ticker',
        tick_time: 500,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:coal', count: 10000 },
            { type: 'minecraft:item', io: 'input', item: 'minecraft:diamond', count: 8 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:gold_ingot', count: 9 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 20 }
        ]
    }).id('mmcr_kubejs:kubejs_recipe_ticker_recipe_1')
    // recipe_2 / recipe_3 类似 ...
})
```

详见 [A_Simple_Machine](./A_Simple_Machine) 的"配方"章节了解字段含义。

## 特殊机制

### 5 个钩子的上下文层级

`MachineBehaviorBuilderJS` 5 个钩子**接收的上下文类型不同**，造成"返回机器上下文"的路径差异：

| 钩子 | 上下文类型 | 访问 `screenText()` 的写法 |
| --- | --- | --- |
| `idleStart` | `MachineBehaviorContext` | `ctx.screenText()`（直接） |
| `idleEnd` | `MachineBehaviorContext` | `ctx.screenText()`（直接） |
| `beforeStart` | `RecipeStartContext` | `ctx.machineContext().screenText()`（间接） |
| `recipeTick` | `RecipeTickContext` | `ctx.machineContext().screenText()`（间接） |
| `beforeFinish` | `RecipeFinishContext` | `ctx.machineContext().screenText()`（间接） |

来源是 [`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) 末尾的"注意事项"：

> 配方回调中的 `ctx.machineContext()` 返回 `MachineBehaviorContext`，可访问 `dataStorage`、`screenText`、`jadeText`、`level`、`controllerPos()` 等运行时状态。

源码里 `idleStart` 用 `ctx.screenText()`、`beforeStart` 用 `ctx.machineContext().screenText()`——这两条规则必须严格遵守，写反会抛 `IllegalStateException`。

### `ctx.requirements()` 的不可变副本语义

`ctx.requirements()` 返回**不可变副本**——只能读取，不能 `add()` / `remove()`。要修改需求，必须构造一个 `ArrayList` 把想要保留 / 替换的需求放进去，再调用 `ctx.setRequirements(list)` 提交。源码里这个模式被反复强调：

```javascript
const nextRequirements = new ArrayList()
// ... 修改 nextRequirements ...
if (changed) ctx.setRequirements(nextRequirements)
```

如果 `changed === false`（没有改任何需求），源码**不调用** `ctx.setRequirements`——这是正确做法，调用空 set 反而可能影响并行执行的状态机。

### 配方数据 + 运行时调整

`beforeStart` 的需求改写是本教程最关键的能力：**配方数据 + 运行时调整，二者分离**。

- 配方数据稳定，便于 JEI 显示与数据包分发；
- `beforeStart` 根据当前世界状态（玩家数、库存、变量）调整；
- 实际跑配方时用调整后的需求做 IO。

### 修改需求时务必满足构造约束

`beforeStart` 里如果 `setRequirements(...)` 抛了 `IllegalArgumentException`（比如把 32 金锭替换成 0 个，违反 `count >= 1` 的约束），机器会进入失败状态。本机器的 `count = 1` 替换是合法构造，没有问题。

### 5 个钩子的能力差异（综合）

| 能力 | `idleStart` / `idleEnd` | `beforeStart` | `recipeTick` | `beforeFinish` |
| --- | --- | --- | --- | --- |
| 接收上下文 | `MachineBehaviorContext` | `RecipeStartContext` | `RecipeTickContext` | `RecipeFinishContext` |
| 写 `controller` scope 静态文本 | ✓ | ✓ | ✓ | ✓ |
| 写 `OPERATION` scope 文本 | ✓ | ✓ | ✓ | ✓ |
| 改需求 | ✗ | ✓（`setRequirements(...)`） | ✗ | ✗（只改输出） |
| 改输出 | ✗ | ✓（`setOutputs(...)`） | ✗ | ✓（`setOutputs(...)` / `discardOutputs()`） |
| `currentTick()` / `totalTick()` | ✗ | ✗ | ✓ | ✗ |
| `cancel()` | ✗ | ✓ | ✗ | ✓ |
| `potionEffects.add(...)` / 副作用 | ✓ | ✓ | ✓ | ✓ |

## 与其他教程的对比

- vs [A_Simple_Machine](./A_Simple_Machine)：A_Simple_Machine 走 `RecipeBehavior.defaults()`——空钩子，本机器用 5 个钩子做完整配方生命周期控制。
- vs [A_Pure_Tick_Machine](./A_Pure_Tick_Machine)：同组对比，详见下表。
- vs [A_Data_Storage_Machine](./A_Data_Storage_Machine) / [A_Network_Machine](./A_Network_Machine)：那两台走 `tickBehavior`，本机器走 `recipeBehavior`。前者没有配方，后者依赖配方生命周期。

**PURE_TICK vs RECIPE_TICK**：

| 维度 | [A_Pure_Tick_Machine](./A_Pure_Tick_Machine) | **A_Recipe_Tick_Machine** |
| --- | --- | --- |
| 行为实现 | [`tickBehavior`](../API/KubeJS#tickbehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) | [`recipeBehavior`](../API/KubeJS#recipebehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) |
| `MachineBehavior.Kind` | `TICK` | `RECIPE` |
| 配方 | 无 | 3 条（数据驱动 / 编程式均可） |
| 触发回调 | 每 tick `serverTick` | 5 个生命周期钩子 |
| 改配方需求 / 输出 | N/A | ✓（`beforeStart` / `beforeFinish`） |
| 副作用（搜实体、加效果） | ✓（每 40 tick） | ✓（`beforeStart` / `beforeFinish`） |
| IO 入口 | [`api.ioPlan()`](../API/KubeJS) | 配方字段（自动管理） |
| 屏幕文本 | `controller` + `OPERATION` 都手写 | `controller` 静态 + `OPERATION` 运行时追加 |
| 状态保存 | 仅 tick 闭包内 | `DataStorage` 可选 |

**A_Pure_Tick_Machine 是"代码驱动、无配方"——所有逻辑写进 `serverTick`**；**A_Recipe_Tick_Machine 是"配方 + 每阶段自定义"——既有配方数据驱动，又在每个钩子里插入自己的逻辑**。

- vs Java 端 [RECIPE_TICKER](../JavaAPI/RECIPE_TICKER)：**逻辑等价**，实现差异如下：

  | Java 端 | KubeJS 端 |
  | --- | --- |
  | `MachineBuilder.machine(...).recipeBehavior(...)` | `event.createMachine(...).recipeBehavior(...)` |
  | `behavior.idleStart(ctx -> ctx.screenText()...)` | `behavior.idleStart(ctx => ctx.screenText()...)` |
  | `RecipeStartContext.requirements()` / `setRequirements(...)` | `ctx.requirements()` / `ctx.setRequirements(...)` |
  | `ctx.machineContext().screenText()` | `ctx.machineContext().screenText()`（一致） |
  | `entity.addEffect(new MobEffectInstance(MobEffects.STRENGTH, 10000, 1))` | `entity.potionEffects.add(MobEffects.STRENGTH, 10000, 1)` |
  | `new ItemRequirement(io, item, count, stack, chance, tags, components, consumeChance)` | `new ItemRequirement(io, item, count, stack, chance, tags, components, consumeChance)`（一致，通过 `Java.loadClass`） |
  | `ControllerScreenText.appendAfter(scope, IN_LINE, id("sp_line_1"), Component.translatable(...))` | `text.appendAfterTranslatable("controller", "mmcr_kubejs:in_line", "mmcr_kubejs:sp_line_1", "gui.mmcr_kubejs.in_line")` |
  | `Component.translatable("gui.mmcr.before_line")` | `Text.translatable("gui.mmcr_kubejs.display_when_idle")` |
  | `MachineRecipeBuilder.recipe(...).inputItem(...).outputItem(...).inputEnergy(...).duration(...).build()` | `event.custom({ type: 'mmcr:machine_recipe', machine: ..., tick_time: ..., requirements: [...] }).id(...)` |

  KubeJS 端通过 `Java.loadClass` 拿 [`ItemRequirement`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/cn/howxu/mmcr/api/recipe/requirement/ItemRequirement.java) 后用 `new ItemRequirement(...)` 构造——构造语法与 Java 端完全一致；JS 的 lambda 与 Java 的 lambda 语法差异是仅有的"翻译成本"。

## 何时用 RECIPE_TICK vs PURE_TICK

| 场景 | 推荐 | 原因 |
| --- | --- | --- |
| 发电机、反应堆、流水线（持续被动效果） | `tickBehavior` | 没有明确的"输入 → 输出"映射，只需按 tick 推进 |
| 范围搜索实体、施加效果、调用其他游戏机制 | `tickBehavior` | 这类副作用无法用配方表达，必须在 tick 里直接调用 |
| 修改需求 / 输出（增删条件、按玩家距离调整） | `recipeBehavior.beforeStart` / `beforeFinish` | 这两个钩子提供 `setRequirements(...)` / `setOutputs(...)` |
| 配方存在但每 tick 的具体动作完全自定 | `recipeBehavior.recipeTick` | 配方生命周期已经接管，能拿到当前 tick / 总 tick |
| 自定义复杂合成的节奏（多阶段、跨配方共享需求修改） | `recipeBehavior` | 仍需要配方数据来定义"做什么"，但每个阶段需要插入自定义回调 |

本机器是"`recipeBehavior` 5 个钩子全用上"的完整样本——对应 [PURE_TICK_MACHINE 的"何时用 PURE_TICK vs RECIPE_TICK"](../JavaAPI/PURE_TICK_MACHINE#何时用-pure_tick-vs-recipe_tick) 章节的第二种用法。

## 延伸阅读

- [A_Simple_Machine](./A_Simple_Machine) — 配方驱动的最简样本。
- [A_Pure_Tick_Machine](./A_Pure_Tick_Machine) — 同组对比，无配方的 `tickBehavior`。
- [A_Data_Storage_Machine](./A_Data_Storage_Machine) — `DataStorage` 的最简样本。
- [A_Network_Machine](./A_Network_Machine) — `tickBehavior` + 网络通信。
- [RECIPE_TICKER](../JavaAPI/RECIPE_TICKER) — 本机器的 Java 端实现。
- [BLAST_FURNACE](../JavaAPI/BLAST_FURNACE) — 标准配方机器（空钩子）。
- [PURE_TICK_MACHINE](../JavaAPI/PURE_TICK_MACHINE) — `tickBehavior` 在 Java 端的完整演示。
- [KubeJS API](../API/KubeJS) — 本教程引用 API 的集中参考。
- [KubeJS API#MachineBehaviorBuilderJS](../API/KubeJS#machinebehaviorbuilderjs) — 5 个钩子的签名与触发时机。
- [KubeJS API#recipeBehavior](../API/KubeJS#recipebehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) — `recipeBehavior` 入口。
- [KubeJS API#ControllerScreenTextEventJS](../API/KubeJS#controllerscreenteventeventjs) — 屏幕文本注册的所有方法。

## 未在 KubeJS.md 中覆盖的 API

本教程用到了 KubeJS 端没有单独列出的 Java 类：

- **`net.minecraft.world.entity.LivingEntity`** — Minecraft 原版"活体生物"基类；KubeJS 端通过 `Java.loadClass` 拿，作为 `level.getEntitiesOfClass(LivingEntity, area)` 的过滤类型。
- **`net.minecraft.world.effect.MobEffects`** — 原版药水效果常量（`STRENGTH` / `NIGHT_VISION`），用 `Java.loadClass` 拿。
- **`net.minecraft.world.phys.AABB`** — KubeJS 提供 `AABB.of(...)` 工厂；但 AABB 的内部字段与方法在 [KubeJS.md](../API/KubeJS) 中没有独立条目。
- **`cn.howxu.mmcr.api.recipe.requirement.ItemRequirement`** — KubeJS 端通过 `Java.loadClass` 拿，直接 `new ItemRequirement(...)` 构造，构造语法与 Java 端完全一致。`io()` / `item()` / `count()` / `stack()` / `chance()` / `tags()` / `components()` / `consumeChance()` 等字段与 Java 端的 [`ItemRequirement`](../API/JavaAPI#itemrequirement) 一一对应。
- **`java.util.ArrayList`** — 标准 JDK 容器，KubeJS 端通过 `Java.loadClass` 拿，用作需求累积容器。
- **`net.minecraft.core.registries.BuiltInRegistries`** — 用于通过 `Item` 实例拿到注册名（如 `minecraft:gold_ingot`），做配方匹配判断。
- **`cn.howxu.mmcr.compat.kubejs.MachineRecipeBuilderJS`**（可选配方注册） — 如果想用编程式配方而非数据驱动 JSON 配方，可以在 `MMCREvents.server` 阶段用 `new MachineRecipeBuilderJS(recipeId).machine(machineId).itemInput(...).itemOutput(...).energyPerTick(...).tickTime(...).build()` 注册；详见 [`MachineRecipeBuilderJS`](../API/KubeJS#machinerecipebuilderjs)。
