---
title: 配方Tick示例
order: 13
---

# 配方Tick示例 — KubeJS 配方 tick 机器

本文是 KubeJS 进阶示例的第四篇。

KubeJS 的行为桥直接传入 `cn.howxu.mmcr.api.machine.definition` 下的上下文；本文的同名类型均指底层类型，不能套用 Java `publicapi` 的签名或只读约束。

本机器**有配方**，但在配方生命周期的 5 个阶段（`idleStart` / `idleEnd` / `beforeStart` / `recipeTick` / `beforeFinish`）都插入自定义回调。

## 涉及的文件

源码位置：

- [`startup_scripts/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/advance/A_Recipe_Tick_Machine.js) — 机器定义、5 个Hook、静态屏幕文本。
- [`server_scripts/structure/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js) — 多方块结构。
- [`server_scripts/recipe/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/advance/A_Recipe_Tick_Machine.js) — `ServerEvents.recipes` 中注册 3 条配方。

## API 跳转表

| 用到的 KubeJS API | API 参考 |
| --- | --- |
| `MMCR.getAPI()` | [链接](../API/KubeJS#getapi--kubejsapi) |
| `event.createMachine(...)` | [链接](../API/KubeJS#createmachinestring-id--machinebuilderjs) |
| `MachineBuilderJS.displayNameKey(...)` | [链接](../API/KubeJS#displaynamekeystring-key--machinebuilderjs) |
| `MachineBuilderJS.recipePool(...)` | [链接](../API/KubeJS#recipepoolstring-recipepoolids--machinebuilderjs) |
| `MachineBuilderJS.appearance(...)` | [链接](../API/KubeJS#appearancestring-machinebasicblock--machinebuilderjs) |
| `MachineBuilderJS.recipeBehavior(...)` | [链接](../API/KubeJS#recipebehaviorconsumermachinebehaviorbuilderjs-builder--machinebuilderjs) |
| `MachineBehaviorBuilderJS.idleStart(...)` | [链接](../API/KubeJS#idlestartconsumermachinebehaviorcontext-callback--machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.idleEnd(...)` | [链接](../API/KubeJS#idleendconsumermachinebehaviorcontext-callback--machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.beforeStart(...)` | [链接](../API/KubeJS#beforestartconsumerrecipestartcontext-callback--machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.recipeTick(...)` | [链接](../API/KubeJS#recipetickconsumerrecipetickcontext-callback--machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.beforeFinish(...)` | [链接](../API/KubeJS#beforefinishconsumerrecipefinishcontext-callback--machinebehaviorbuilderjs) |
| `RecipeStartContext.requirements()` / `setRequirements(...)` / `replaceExactItemInputCount(...)` | [底层上下文源码](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeStartContext.java) |
| `RecipeTickContext` / `RecipeFinishContext` | [tick 源码](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeTickContext.java) / [finish 源码](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeFinishContext.java) |
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
| `cn.howxu.mmcr.api.recipe.requirement.ItemRequirement` | 重建物品输入需求 |
| `java.util.ArrayList` | 收集整份替换需求列表 |
| `net.minecraft.core.registries.BuiltInRegistries` | 比较物品注册 ID |

## 机器定义

打开启动期脚本 [`A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/advance/A_Recipe_Tick_Machine.js)：

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
        .recipePool("mmcr_kubejs:kubejs_recipe_ticker")
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

- `.displayNameKey(...)`：本地化键；`.recipePool(...)`：配方池 ID；`.appearance("minecraft:green_terracotta")`：外观方块。
- [`.recipeBehavior(behavior => behavior.xxx(...))`](../API/KubeJS#recipebehaviorconsumermachinebehaviorbuilderjs-builder--machinebuilderjs) 注入点

[`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) 提供 5 个Hook：

| Hook | 接收的上下文 | 触发时机 |
| --- | --- | --- |
| [`idleStart`](../API/KubeJS#idlestartconsumermachinebehaviorcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorContext` | 进入 idle 状态 |
| [`idleEnd`](../API/KubeJS#idleendconsumermachinebehaviorcontext-callback--machinebehaviorbuilderjs) | `MachineBehaviorContext` | 离开 idle 状态 |
| [`beforeStart`](../API/KubeJS#beforestartconsumerrecipestartcontext-callback--machinebehaviorbuilderjs) | `RecipeStartContext` | 配方启动前，可改需求 / 输出 |
| [`recipeTick`](../API/KubeJS#recipetickconsumerrecipetickcontext-callback--machinebehaviorbuilderjs) | `RecipeTickContext` | 配方执行中每 tick |
| [`beforeFinish`](../API/KubeJS#beforefinishconsumerrecipefinishcontext-callback--machinebehaviorbuilderjs) | `RecipeFinishContext` | 配方提交输出前 |

启动期脚本不含配方注册。配方已移到 `server_scripts/recipe/advance`，见下文“配方数据”。

## 结构

[`structure/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js)：

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
| `CONTROLLER` | 控制器注册文本或行为写入 | 由文本状态 / 结构 / lane 清理逻辑管理 |
| `OPERATION` | 行为回调写入的操作文本 | 运行时操作结束、无活动操作等清理路径会清空 |

`idleStart` 演示空闲提示，`beforeStart` 演示按 scope / ID 移除行。运行时还会清理操作文本，且配方 lane 可以使用独立文本状态；不能仅凭这两段代码保证屏幕必然出现或切换这些行。

[`idleEnd`](../API/KubeJS#idleendconsumermachinebehaviorcontext-callback--machinebehaviorbuilderjs) 是空实现：示例在 `beforeStart` 移除 idle 行，运行时也会按操作状态清理 `OPERATION` 文本；不要把空闲与配方 lane 的文本句柄假定为同一个对象。

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

    const nextRequirements = new ArrayList()
    let changed = false
    ctx.requirements().forEach(requirement => {
        if (!(requirement instanceof ItemRequirement)
                || String(requirement.io().getKey()) !== "input") {
            nextRequirements.add(requirement)
            return
        }
        const possibleItems = requirement.item().getStackArray()
        const isExactlyGold = requirement.count() === 32
            && possibleItems.length === 1
            && BuiltInRegistries.ITEM.getKey(possibleItems[0].getItem())
                .toString() === "minecraft:gold_ingot"
        if (isExactlyGold) {
            nextRequirements.add(new ItemRequirement(
                requirement.io(), requirement.item(), 1, requirement.stack(),
                requirement.chance(), requirement.tags(), requirement.components(),
                requirement.consumeChance()
            ))
            changed = true
        } else {
            nextRequirements.add(requirement)
        }
    })
    if (changed) ctx.setRequirements(nextRequirements)
})
```

`RecipeStartContext` 提供两个关键能力：

- `ctx.machineContext()`：拿到 [`MachineBehaviorContext`](../API/KubeJS)，可读 `level()` / `controllerPos()` / `screenText()`。这是 `beforeStart` / `recipeTick` / `beforeFinish` 共用的"返回机器上下文"路径。
- `ctx.requirements()` / `ctx.setRequirements(list)`：读出复制的需求列表，再提交整份替换列表。官方脚本保留非匹配项，只重建精确匹配的金锭输入，并保留其标签、组件条件和消耗概率。

上述代码的核心：

1. **请求清理 idle 行**：在当前机器上下文文本句柄上移除两个 scope / ID；若行不在该句柄中，移除没有效果。
2. **加效果**：给范围内所有 `LivingEntity` 加 10000 tick 的力量 II 效果。
3. **修改配方需求**：把所有“候选物品恰好只有金锭、且数量为 32”的物品输入需求改为 1 个金锭。这是改写配方声明，不是检测库存是否已有 32 个金锭；真正输入检查在后续 IO 规划中进行。

底层 [`RecipeStartContext.replaceExactItemInputCount(...)`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeStartContext.java) 仍存在，可作为简化写法：

```javascript
const Items = Java.loadClass("net.minecraft.world.item.Items")
const changed = ctx.replaceExactItemInputCount(Items.GOLD_INGOT, 32, 1)
```

它只替换**第一条**匹配的内置物品输入，未命中返回 `false`；与官方手动遍历可能替换多条的行为并不完全等价。两个数量参数必须为正。它也通过 `setRequirements(...)` 应用修改，不能绕过该方法对自定义输出的限制。

`requirements()` 使用 `MachineRequirement.copyList(...)`，返回按注册需求类型复制的不可修改列表；修改容器后必须调用 `setRequirements(...)`。该方法会由需求重新推导内置物品 / 流体输出；若当前输出包含注册的自定义输出类型，它会抛 `IllegalStateException`，不能泛化为任意输出的重建工具。

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
| `ctx.replaceExactItemInputCount(...)` | ✓ | ✗ |
| `ctx.setRequirements(...)` / `setOutputs(...)` | ✓ | ✗（只读副本） |
| `ctx.cancel()` | ✓ | ✗ |

底层 `RecipeTickContext` 是 record，需求 / 输出容器由复制列表构成，没有 `setRequirements` / `setOutputs` / `cancel`。应在 `beforeStart` 改需求，在 `beforeFinish` 改完成输出；它还提供 `recipe()`、`capabilitySnapshot()` 等读取入口。其触发点在配方每 tick 输入计划之前，因此回调执行不代表这一 tick 的 FE 等输入一定提交成功。

底层 `ControllerScreenText.appendAfter(...)` 需要同 scope 的锚点。脚本意图是在 `in_line` 后显示信息，但这里使用 `OPERATION`，静态行使用 `CONTROLLER`，查找不会跨 scope；详见下文“静态屏幕文本”。

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

[`RecipeFinishContext`](../API/KubeJS#recipefinishcontext) 提供 `ctx.machineContext()` / `ctx.setOutputs(...)` / `ctx.discardOutputs()` / `ctx.cancel()`；`discardOutputs` 不接收参数。

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
- [`appendAfterTranslatable("controller", "mmcr_kubejs:in_line", "mmcr_kubejs:sp_line_1", "gui.mmcr_kubejs.in_line")`](../API/KubeJS#appendaftertranslatablestring-scope-string-lineid-string-afterlineid-string-key-object-args--void) — 仅在 `CONTROLLER` 已有 `sp_line_1` 时把 `in_line` 插到其后；本脚本没有创建锚点。
- [`appendTranslatable("controller", "mmcr_kubejs:after_line", "gui.mmcr_kubejs.after_line")`](../API/KubeJS#appendtranslatablestring-scope-string-lineid-string-key-object-args--void) — `after_line` 行。

`appendAfter` 表达相对行的排序意图，锚点不存在时不追加。`sp_line_1` 是示例指定的 ID，不能据此承诺它始终存在或完整屏幕始终按固定序列排列。

注册回调由服务端控制器应用，随后刷新 `replace` 请求，再同步文本状态；不是客户端每 tick 直接执行 KubeJS 回调。

底层 `appendAfter` 仅在同 scope 已有 `afterLineId` 时追加。这里静态的 `in_line` 属于 `CONTROLLER`，而 `recipeTick` 向 `OPERATION` 写入并以 `in_line` 为锚点；单有静态行并不能满足该查找，因此不能保证这段示例文字出现。需要可靠显示时，可改用 `screen.append(OPERATION, id, text)`，或先在 `OPERATION` 创建锚点。静态 `sp_line_1` 也不是本脚本注册的行。

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

源码里 `idleStart` 用 `ctx.screenText()`、`beforeStart` 用 `ctx.machineContext().screenText()`，因为二者的上下文方法不同。写反属于调用不存在的方法，不应描述为行为构建器固定抛出 `IllegalStateException`。运行期返回的是底层 `ControllerScreenText`，启动期注册回调才使用 `ControllerScreenTextEventJS`。

### `ctx.requirements()` 的不可变副本语义

官方脚本走 `ctx.requirements()` + `ctx.setRequirements(...)` 的手动路线；便捷方法只改第一条匹配项，是补充选择。两者使用的都是底层上下文：

`ctx.requirements()` 返回**不可变副本**，只能读取，不能 `add()` / `remove()`。要修改需求，必须构造一个 `ArrayList` 把想要保留 / 替换的需求放进去，再调用 `ctx.setRequirements(list)` 提交：

```javascript
const nextRequirements = new ArrayList()
// ... 修改 nextRequirements ...
if (changed) ctx.setRequirements(nextRequirements)
```

没有改动时不必调用 `setRequirements`。传入空列表代表删除全部需求，不是“保持不变”；它还会重新推导输出。

### 配方数据 + 运行时调整

`beforeStart` 的需求改写是本教程最关键的能力：**配方数据 + 运行时调整，二者分离**。

- 配方数据稳定，便于 JEI 显示与数据包分发。
- `beforeStart` 根据当前世界状态（玩家数、库存、变量）调整。
- 实际跑配方时用调整后的需求做 IO。

### 修改需求时务必满足构造约束

重建需求时应遵守底层 `ItemRequirement` 的构造约束，保留原条目的组件条件、标签、输出概率与消耗概率。便捷方法显式要求 `expectedCount >= 1`、`replacementCount >= 1`，把 32 金锭替换成 0 会抛 `IllegalArgumentException`，不能用它表达免材料配方。

### 可变输出与副作用边界

底层 `RecipeStartContext.outputs()` 返回其当前输出列表，`RecipeFinishContext.outputs()` 返回内部可变 `ArrayList`；不能套用 `publicapi` 的只读视图说明。教学中建议通过 `setOutputs(List<MachineOutput>)` 显式替换：start 阶段会同步需求中的输出条目，finish 阶段会复制并校验内置输出非空。start 另有 `duration()` / `setDuration(int)`，start / finish 都有 `requestedParallelism()` / `effectiveParallelism()`。

`beforeStart` 的力量效果和 `beforeFinish` 的夜视效果属于世界副作用。后续规划 / 提交失败或调用 `cancel()` 不会自动撤销这些效果；生命周期钩子不是包住所有脚本操作的原子事务。

## 配方数据

三条配方在 [`server_scripts/recipe/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/advance/A_Recipe_Tick_Machine.js) 的 `ServerEvents.recipes` 中注册：

| tick 时间 | 物品输入 | 物品输出 | 每 tick FE |
| --- | --- | --- | --- |
| 500 | 10000 煤炭 + 8 钻石 | 9 金锭 | 20 |
| 300 | 114514 钻石 + 8 铁锭 | 18 煤炭 | 20 |
| 300 | 32 金锭 + 8 木棍 | 3 钻石 | 20 |

第三条用于观察 `beforeStart` 把 32 金锭改为 1 的效果。原始配方数据仍保留 32，JEI 与数据包声明不会被这次运行上下文修改。

```javascript
ServerEvents.recipes(event => {
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_recipe_ticker',
        tick_time: 300,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:gold_ingot', count: 32 },
            { type: 'minecraft:item', io: 'input', item: 'minecraft:stick', count: 8 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:diamond', count: 3 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 20 }
        ]
    })
})
```

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

本机器是"`recipeBehavior` 5 个Hook全用上"的完整样本，可与 [纯Tick测试机器](../JavaAPI/纯Tick测试机器) 的无配方方案对照阅读。

## 延伸阅读

- [纯Tick机器示例](./纯Tick机器示例) — 同组对比，无配方的 `tickBehavior`。
- [数据存储测试机器](./数据存储测试机器) — `DataStorage` 的最简样本。
- [算力-网络交互示例](./算力-网络交互示例) — `tickBehavior` + 网络通信。
- [配方Tick测试机器](../JavaAPI/配方Tick测试机器) — 本机器的 Java 端实现。
- [高炉](../JavaAPI/高炉) — 标准配方机器（空Hook）。
- [纯Tick测试机器](../JavaAPI/纯Tick测试机器) — `tickBehavior` 在 Java 端的完整演示。
- [KubeJS API](../API/KubeJS) — 本教程引用 API 的集中参考。
- [KubeJS API#MachineBehaviorBuilderJS](../API/KubeJS#machinebehaviorbuilderjs) — 5 个Hook的签名与触发时机。
- [KubeJS API#recipeBehavior](../API/KubeJS#recipebehaviorconsumermachinebehaviorbuilderjs-builder--machinebuilderjs) — `recipeBehavior` 入口。
- [KubeJS API#ControllerScreenTextEventJS](../API/KubeJS#controllerscreentexteventjs) — 屏幕文本注册的所有方法。
- [KubeJS API#preServerTick](../API/KubeJS#preservertickconsumermachinebehaviorcontext-callback--machinebuilderjs) / [postServerTick](../API/KubeJS#postservertickconsumermachinebehaviorcontext-callback--machinebuilderjs) — 配方机器的"每 tick 全局注入"。
- [底层 RecipeStartContext](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeStartContext.java) — `beforeStart` 上下文及 `replaceExactItemInputCount(...)` 的实现。

## 未在 KubeJS.md 中覆盖的 API

本教程用到了 KubeJS 端没有单独列出的 Java 类：

- **`net.minecraft.world.entity.LivingEntity`** — Minecraft 原版"活体生物"基类；KubeJS 端通过 `Java.loadClass` 拿，作为 `level.getEntitiesOfClass(LivingEntity, area)` 的过滤类型。
- **`net.minecraft.world.effect.MobEffects`** — 原版药水效果常量（`STRENGTH` / `NIGHT_VISION`），用 `Java.loadClass` 拿。
- **`net.minecraft.world.phys.AABB`** — KubeJS 提供 `AABB.of(...)` 工厂；但 AABB 的内部字段与方法在 [KubeJS.md](../API/KubeJS) 中没有独立条目。
- **`net.minecraft.world.item.Items`** — 补充便捷写法使用的原版物品常量（`GOLD_INGOT`），官方脚本的手动写法用 `BuiltInRegistries` 比较注册 ID。
