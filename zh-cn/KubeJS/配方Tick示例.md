---
title: 配方Tick示例
order: 13
---

# 配方Tick示例 — KubeJS 配方 tick 机器

本文是 KubeJS 进阶示例的第四篇。我们逐段拆解 [`A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Recipe_Tick_Machine.js) 与 [对应的结构脚本](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js)。本机器**有配方**，但在配方生命周期的 5 个阶段（`idleStart` / `idleEnd` / `beforeStart` / `recipeTick` / `beforeFinish`）都插入自定义回调。

## 涉及的文件

源码位置：

- [`startup_scripts/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Recipe_Tick_Machine.js) — 机器定义、5 个Hook、静态屏幕文本、3 条配方。
- [`server_scripts/structure/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js) — 多方块结构。

## API 跳转表

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
| `event.registerControllerScreenText(...)` | [链接](../API/KubeJS#registercontrollerscreentextstring-machineid-consumercontrollerscreentexteventjs-handler--void) |
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
| `net.minecraft.world.item.Items` | `GOLD_INGOT` 等物品常量 |

## 机器定义

打开启动期脚本 [`A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Recipe_Tick_Machine.js)：

```javascript
MMCREvents.startup(event => {

    const api = MMCR.getAPI() // I suggest use MMCR.getAPI() in start_up script
    // Some advanced KubeJS usage
    const LivingEntity = Java.loadClass("net.minecraft.world.entity.LivingEntity")
    const MobEffects = Java.loadClass("net.minecraft.world.effect.MobEffects")

    // Some Class
    const Items = Java.loadClass("net.minecraft.world.item.Items")

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

链式调用：

- `.displayNameKey(...)` / `.recipeFamily(...)` / `.appearance("minecraft:green_terracotta")`：老演员了。
- [`.recipeBehavior(behavior => behavior.xxx(...))`](../API/KubeJS#recipebehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) 注入点

[`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) 提供 5 个Hook：

| Hook | 接收的上下文 | 触发时机 |
| --- | --- | --- |
| [`idleStart`](../API/KubeJS#idlestartconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorContext` | 进入 idle 状态 |
| [`idleEnd`](../API/KubeJS#idleendconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorContext` | 离开 idle 状态 |
| [`beforeStart`](../API/KubeJS#beforestartconsumer-recipestartcontext-callback--machinebehaviorbuilderjs) | `RecipeStartContext` | 配方启动前，可改需求 / 输出 |
| [`recipeTick`](../API/KubeJS#recipetickconsumer-recipetickcontext-callback--machinebehaviorbuilderjs) | `RecipeTickContext` | 配方执行中每 tick |
| [`beforeFinish`](../API/KubeJS#beforefinishconsumer-recipefinishcontext-callback--machinebehaviorbuilderjs) | `RecipeFinishContext` | 配方提交输出前 |

末尾在 `MMCREvents.startup` 之外另有配方注册段，详见后文"配方详解"。

## 结构

[`structure/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js)：

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

## Hooks

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

这里的 `ctx` 是 [`MachineBehaviorContext`](../API/KubeJS)，没有 `currentTick()` / `recipe()` 这类"配方上下文"方法。写入 [`api.screenScope().OPERATION`](../API/KubeJS#screenscope--screenscopevalues) 作用域。`OPERATION` 与 `CONTROLLER` 的关键区别：

| scope | 内容来源 | 重置时机 |
| --- | --- | --- |
| `CONTROLLER` | Mod 完全控制 | 由 Mod 自己管理 |
| `OPERATION` | MMCR 自动 + Mod 追加 | 每个配方生命周期自动重置 |

`idleStart` 写入 `OPERATION` scope 的内容，会在配方开始时被 MMCR 清掉，配合 `beforeStart` 里"清掉 idle 行"的写法，屏幕上不会同时出现"idle 提示"与"运行中提示"。

[`idleEnd`](../API/KubeJS#idleendconsumer-machinebehaviorcontext-callback--machinebehaviorbuilderjs) 是空实现：MMCR 已经在配方开始时清掉 idle 行，无需在 `idleEnd` 再手动 `remove(...)`。

源码里两行 idle 文本：

- `display_when_idle_empty_line` → `Text.literal(" ")`（一个空格占位行）。
- `display_when_idle` → [`Text.translatable("gui.mmcr_kubejs.display_when_idle")`](https://kubejs.com/wiki/tutorials/text-component) 让客户端按玩家语言显示翻译。

### `beforeStart`：配方启动前

`beforeStart` 是核心的一段，做了三件事：清屏幕、加效果、改需求。

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
    //
    // Public RecipeStartContext exposes replaceExactItemInputCount(item, expected, replacement)
    // which replaces the manual iteration / ItemRequirement reconstruction / setRequirements pattern
    // used in older examples. It only matches the FIRST input whose Ingredient resolves to exactly
    // the given Item and whose count equals `expected`; everything else stays untouched.
    ctx.replaceExactItemInputCount(Items.GOLD_INGOT, 32, 1)
})
```

`RecipeStartContext` 提供两个关键能力：

- `ctx.machineContext()`：拿到 [`MachineBehaviorContext`](../API/KubeJS)，可读 `level()` / `controllerPos()` / `screenText()`。这是 `beforeStart` / `recipeTick` / `beforeFinish` 共用的"返回机器上下文"路径。
- `ctx.replaceExactItemInputCount(item, expected, replacement)`：把第一条"原料能解析到指定物品、且数量等于 `expected`"的输入需求替换为 `replacement`，未命中时返回 `false` 不报错。
    它是 [`RecipeStartContext`](../API/JavaAPI#recipestartcontext) 公共 API 内置的便捷方法，等价于老示例里手动遍历 `ctx.requirements()` + 重新 `new ItemRequirement(...)` + `ctx.setRequirements(...)` 的写法。

上述代码的核心：

1. **清理 idle 行**：把 `idleStart` 写入的两行 `remove(...)`，避免同时显示"idle 提示"与"运行中提示"。
2. **加效果**：给范围内所有 `LivingEntity` 加 10000 tick 的力量 II 效果。
3. **修改配方需求**：调用 `ctx.replaceExactItemInputCount(Items.GOLD_INGOT, 32, 1)`，把第一条"原料能解析到 `minecraft:gold_ingot`、且数量等于 32"的输入需求替换成"1 个金锭"。

`replaceExactItemInputCount(...)` 只改内置物品输入需求（数量精确等于 `expected` 时才命中），自定义需求 / 流体 / 能量 / 输出不会被改动；返回 `false` 时不抛异常，`beforeStart` 会照常进入下一个Hook。

需要更复杂的改写时，再回到 `ctx.requirements()` + `ctx.setRequirements(...)` 手动操作——前者是公共视图的不可变副本，必须整体替换，MMCR 才会在 `beforeStart` 结束时统一应用。

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
        Text.literal("XXXX")
    )
})
```

[`RecipeTickContext`](../API/KubeJS#recipetickcontext) 与 `RecipeStartContext` 的关键区别（[`KubeJS.md`](../API/KubeJS#machinebehaviorbuilderjs) 末尾的"注意事项"明确列出）：

| 能力 | `RecipeStartContext` | `RecipeTickContext` |
| --- | --- | --- |
| `ctx.machineContext()` | ✓ | ✓ |
| `ctx.currentTick()` / `ctx.totalTick()` | ✗ | ✓ |
| `ctx.parallelism()` | ✗ | ✓ |
| `ctx.replaceExactItemInputCount(...)` | ✓ | ✗ |
| `ctx.setRequirements(...)` / `setOutputs(...)` | ✓ | ✗（只读副本） |
| `ctx.cancel()` | ✓ | ✗ |

也就是说，`recipeTick` **不能修改配方需求 / 输出**，它只能读取 `currentTick()` 并基于此写屏幕文本 / 施加效果 / 调用其他游戏机制。如果想修改需求，应该在 `beforeStart` 里做。如果想在完成前改输出，应该在 `beforeFinish` 里做。这样区分是因为"配方执行中"如果改需求 / 输出，会破坏 MMCR 的并行执行，所以 `recipeTick` 的需求 / 输出字段是只读副本。

[`ControllerScreenText.appendAfter(...)`](../API/KubeJS#appendafterstring-scope-string-lineid-string-afterlineid-component-text--void) 把这条信息插到 `in_line` 之后，与下文"静态屏幕文本"里的 `IN_LINE` 形成呼应：注册时在 `sp_line_1` 后插入 `IN_LINE`，运行时在 `IN_LINE` 后再追加运行信息。

### `beforeFinish`：配方提交输出前的Hook

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

[`RecipeFinishContext`](../API/KubeJS#recipefinishcontext) 提供 `ctx.machineContext()` / `ctx.setOutputs(...)` / `ctx.discardOutputs(...)` / `ctx.cancel()`。

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

[`event.registerControllerScreenText(...)`](../API/KubeJS#registercontrollerscreentextstring-machineid-consumercontrollerscreentexteventjs-handler--void) 注册 3 行静态文本：

- [`appendTranslatable("controller", "mmcr_kubejs:before_line", "gui.mmcr_kubejs.before_line")`](../API/KubeJS#appendtranslatablestring-scope-string-lineid-string-key-object-args--void) — `before_line` 行。
- [`appendAfterTranslatable("controller", "mmcr_kubejs:in_line", "mmcr_kubejs:sp_line_1", "gui.mmcr_kubejs.in_line")`](../API/KubeJS#appendaftertranslatablestring-scope-string-lineid-string-afterlineid-string-key-object-args--void) — 把 `in_line` 插到 `sp_line_1`（MMCR 自动生成的内部分隔行）之后。
- [`appendTranslatable("controller", "mmcr_kubejs:after_line", "gui.mmcr_kubejs.after_line")`](../API/KubeJS#appendtranslatablestring-scope-string-lineid-string-key-object-args--void) — `after_line` 行。

最终屏幕上按 `before_line → sp_line_1 → in_line → after_line` 排列。recipeTick` 里再在 `in_line` 后追加"XXX"信息，运行时屏幕就是 `before_line → sp_line_1 → in_line → XXXX → after_line`。

静态行每次客户端 tick 都会重新执行，**独立于配方生命周期**。

## 特殊机制

### 5 个Hook的上下文层级

`MachineBehaviorBuilderJS` 5 个Hook**接收的上下文类型不同**，造成"返回机器上下文"的路径差异：

| Hook | 上下文类型 | 访问 `screenText()` 的写法 |
| --- | --- | --- |
| `idleStart` | `MachineBehaviorContext` | `ctx.screenText()`（直接） |
| `idleEnd` | `MachineBehaviorContext` | `ctx.screenText()`（直接） |
| `beforeStart` | `RecipeStartContext` | `ctx.machineContext().screenText()`（间接） |
| `recipeTick` | `RecipeTickContext` | `ctx.machineContext().screenText()`（间接） |
| `beforeFinish` | `RecipeFinishContext` | `ctx.machineContext().screenText()`（间接） |

来源 [`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) 末尾的"注意事项"：

> 配方回调中的 `ctx.machineContext()` 返回 `MachineBehaviorContext`，可访问 `dataStorage`、`screenText`、`jadeText`、`level`、`controllerPos()` 等运行时状态。

源码里 `idleStart` 用 `ctx.screenText()`、`beforeStart` 用 `ctx.machineContext().screenText()`，这两条规则必须严格遵守，写反会抛 `IllegalStateException`。

### `ctx.requirements()` 的不可变副本语义

本机器走的是 `ctx.replaceExactItemInputCount(item, expected, replacement)` 路线——它内部就处理了"只改第一条匹配项、其他保持原样"的语义，**直接返回 `boolean` 告知是否命中**。如果你的需求改写更复杂（比如替换流体 / 能量 / 多个物品 / 同时改输出），再回到 `ctx.requirements()` + `ctx.setRequirements(...)` 的手动模式：

`ctx.requirements()` 返回**不可变副本**，只能读取，不能 `add()` / `remove()`。要修改需求，必须构造一个 `ArrayList` 把想要保留 / 替换的需求放进去，再调用 `ctx.setRequirements(list)` 提交：

```javascript
const nextRequirements = new ArrayList()
// ... 修改 nextRequirements ...
if (changed) ctx.setRequirements(nextRequirements)
```

如果 `changed === false`（没有改任何需求），**不调用** `ctx.setRequirements` 是正确做法，调用空 set 反而可能影响并行执行的状态机。

### 配方数据 + 运行时调整

`beforeStart` 的需求改写是本教程最关键的能力：**配方数据 + 运行时调整，二者分离**。

- 配方数据稳定，便于 JEI 显示与数据包分发。
- `beforeStart` 根据当前世界状态（玩家数、库存、变量）调整。
- 实际跑配方时用调整后的需求做 IO。

### 修改需求时务必满足构造约束

无论是 `ctx.replaceExactItemInputCount(...)` 还是手动 `ctx.setRequirements(...)`，底层都按 [`ItemRequirement`](../API/JavaAPI#itemrequirement) 的构造约束校验：物品输入 `count >= 1`、输出栈非空、`chance` 在 `[0, 1]`。如果构造参数非法（最常见的是把 32 金锭替换成 0 个），`beforeStart` 会抛 `IllegalArgumentException`，机器进入失败状态。本机器的 `count = 1` 替换是合法构造，没有问题。

### 5 个Hook的能力差异（综合）

| 能力 | `idleStart` / `idleEnd` | `beforeStart` | `recipeTick` | `beforeFinish` |
| --- | --- | --- | --- | --- |
| 接收上下文 | `MachineBehaviorContext` | `RecipeStartContext` | `RecipeTickContext` | `RecipeFinishContext` |
| 写 `controller` scope 静态文本 | ✓ | ✓ | ✓ | ✓ |
| 写 `OPERATION` scope 文本 | ✓ | ✓ | ✓ | ✓ |
| 改需求 | ✗ | ✓（`replaceExactItemInputCount(...)` / `setRequirements(...)`） | ✗ | ✗（只改输出） |
| 改输出 | ✗ | ✓（`setOutputs(...)`） | ✗ | ✓（`setOutputs(...)` / `discardOutputs()`） |
| `currentTick()` / `totalTick()` | ✗ | ✗ | ✓ | ✗ |
| `cancel()` | ✗ | ✓ | ✗ | ✓ |
| `potionEffects.add(...)` / 副作用 | ✓ | ✓ | ✓ | ✓ |

## RECIPE_TICK vs PURE_TICK

| 场景 | 推荐 | 原因 |
| --- | --- | --- |
| 发电机、反应堆、流水线（持续被动效果） | `tickBehavior` | 没有明确的"输入 → 输出"映射，只需按 tick 推进 |
| 范围搜索实体、施加效果、调用其他游戏机制 | `tickBehavior` | 这类副作用无法用配方表达，必须在 tick 里直接调用 |
| 修改需求 / 输出（增删条件、按玩家距离调整） | `recipeBehavior.beforeStart` / `beforeFinish` | 这两个Hook提供 `setRequirements(...)` / `setOutputs(...)` |
| 配方存在但每 tick 的具体动作完全自定 | `recipeBehavior.recipeTick` | 配方生命周期已经接管，能拿到当前 tick / 总 tick |
| 配方机器的"每 tick 强制副作用"（无论配方是否在跑：屏幕、`dataStorage`、网络探测） | `MachineBuilderJS.preServerTick` / `MachineBuilderJS.postServerTick` | `recipeTick` 只在配方运行中触发；要做"配方未启动也要每 tick 跑"的全局逻辑，写在这两个 `MachineBuilderJS` Hook里 |
| 自定义复杂合成的节奏（多阶段、跨配方共享需求修改） | `recipeBehavior` | 仍需要配方数据来定义"做什么"，但每个阶段需要插入自定义回调 |

本机器是"`recipeBehavior` 5 个Hook全用上"的完整样本，对应 [纯Tick测试机器 的"何时用 PURE_TICK vs RECIPE_TICK"](../JavaAPI/纯Tick测试机器#何时用-pure_tick-vs-recipe_tick) 章节的第二种用法。

## 延伸阅读

- [纯Tick机器示例](./纯Tick机器示例) — 同组对比，无配方的 `tickBehavior`。
- [数据存储测试机器](./数据存储测试机器) — `DataStorage` 的最简样本。
- [算力-网络交互示例](./算力-网络交互示例) — `tickBehavior` + 网络通信。
- [配方Tick测试机器](../JavaAPI/配方Tick测试机器) — 本机器的 Java 端实现。
- [高炉](../JavaAPI/高炉) — 标准配方机器（空Hook）。
- [纯Tick测试机器](../JavaAPI/纯Tick测试机器) — `tickBehavior` 在 Java 端的完整演示。
- [KubeJS API](../API/KubeJS) — 本教程引用 API 的集中参考。
- [KubeJS API#MachineBehaviorBuilderJS](../API/KubeJS#machinebehaviorbuilderjs) — 5 个Hook的签名与触发时机。
- [KubeJS API#recipeBehavior](../API/KubeJS#recipebehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) — `recipeBehavior` 入口。
- [KubeJS API#ControllerScreenTextEventJS](../API/KubeJS#controllerscreentexteventjs) — 屏幕文本注册的所有方法。
- [KubeJS API#preServerTick](../API/KubeJS#preservertickconsumer-machinebehaviorcontext-callback--machinebuilderjs) / [postServerTick](../API/KubeJS#postservertickconsumer-machinebehaviorcontext-callback--machinebuilderjs) — 配方机器的"每 tick 全局注入"。
- [KubeJS API#RecipeStartContext](../API/JavaAPI#recipestartcontext) — `beforeStart` Hook上下文，`replaceExactItemInputCount(...)` 等便捷方法的归属。

## 未在 KubeJS.md 中覆盖的 API

本教程用到了 KubeJS 端没有单独列出的 Java 类：

- **`net.minecraft.world.entity.LivingEntity`** — Minecraft 原版"活体生物"基类；KubeJS 端通过 `Java.loadClass` 拿，作为 `level.getEntitiesOfClass(LivingEntity, area)` 的过滤类型。
- **`net.minecraft.world.effect.MobEffects`** — 原版药水效果常量（`STRENGTH` / `NIGHT_VISION`），用 `Java.loadClass` 拿。
- **`net.minecraft.world.phys.AABB`** — KubeJS 提供 `AABB.of(...)` 工厂；但 AABB 的内部字段与方法在 [KubeJS.md](../API/KubeJS) 中没有独立条目。
- **`net.minecraft.world.item.Items`** — 原版物品常量（`GOLD_INGOT` 等），用 `Java.loadClass` 拿，作为 [`RecipeStartContext.replaceExactItemInputCount(...)`](../API/JavaAPI#recipestartcontext) 的入参。
