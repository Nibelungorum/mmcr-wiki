---
title: 配方Tick测试
order: 15
---

# 配方Tick测试机器

一台有配方、但**每个生命周期阶段都要插入自定义逻辑**的机器。

## 概览

配方Tick测试机器 是一台使用 [`RecipeBehavior`](../API/JavaAPI#recipebehavior) 的配方机器，它注册 3 条配方，但在配方生命周期的 5 个阶段都插入了自定义Hook：

- `idleStart` / `idleEnd`：进入 / 离开 idle 时显示提示
- `beforeStart`：配方启动前给范围内生物加力量效果
- `recipeTick`：每 tick 在屏幕上追加文本
- `beforeFinish`：配方提交输出前给范围内生物加夜视效果

## API

| API | 参考 |
| --- | --- |
| `MachineBehavior` / `MachineBehavior.Kind` | [链接](../API/JavaAPI#machinebehavior) |
| `RecipeBehavior` | [链接](../API/JavaAPI#recipebehavior) |
| `RecipeStartContext` / `RecipeTickContext` / `RecipeFinishContext` | [链接](../API/JavaAPI#recipestartcontext) / [链接](../API/JavaAPI#recipetickcontext) / [链接](../API/JavaAPI#recipefinishcontext) |
| `MachineBehaviorContext` | [链接](../API/JavaAPI#machinebehaviorcontext) |
| `MachineBuilder` | [链接](../API/JavaAPI#machinebuilder) |
| `MMCRMachineDefinationsEvent` / `MMCRMachineStructuresEvent` / `MMCRMachineRecipesEvent` | [链接](../API/JavaAPI#mmcrmachinedefinationsevent) / [链接](../API/JavaAPI#mmcrmachinestructuresevent) / [链接](../API/JavaAPI#mmcrmachinerecipesevent) |
| `MachineStructureBuilder` / `PatternBuilder` | [链接](../API/JavaAPI#machinestructurebuilder) / [链接](../API/JavaAPI#patternbuilder) |
| `BlockPredicate` / `InterfacePredicates` | [链接](../API/JavaAPI#blockpredicate) / [链接](../API/JavaAPI#interfacepredicates) |
| `MachineRecipeBuilder` | [链接](../API/JavaAPI#machinerecipebuilder) |
| `ControllerScreenText` / `ControllerScreenTextScope` / `ControllerScreenTextRegistry` | [链接](../API/JavaAPI#controllerscreentext) / [链接](../API/JavaAPI#controllerscreentextscope) / [链接](../API/JavaAPI#controllerscreentextregistry) |
| `ItemRequirement` / `RecipeIo` | [链接](../API/JavaAPI#itemrequirement) / [链接](../API/JavaAPI#recipeio)（源码用同义的 `RecipeModifier.IOType`） |

## 机器定义

[RECIPE_TICKER.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/builtin/RECIPE_TICKER.java)

```java
public static void registerDefinitions(MMCRMachineDefinationsEvent event) {
    ControllerScreenTextRegistry.register(RECIPE_TICKER, context -> {
        context.screenText().append(
                ControllerScreenTextScope.CONTROLLER, BEFORE_LINE,
                Component.translatable("gui.mmcr.before_line"));
        context.screenText().appendAfter(
                ControllerScreenTextScope.CONTROLLER, IN_LINE,
                id("sp_line_1"),
                Component.translatable("gui.mmcr.in_line"));
        context.screenText().append(
                ControllerScreenTextScope.CONTROLLER, AFTER_LINE,
                Component.translatable("gui.mmcr.after_line"));
    });
    ...
}
```

[`ControllerScreenText.appendAfter(...)`](../API/JavaAPI#controllerscreentext) 把 `IN_LINE` 插到 `sp_line_1`之后，屏幕上按 `BEFORE_LINE → IN_LINE → AFTER_LINE` 排列。

机器定义与 `RecipeBehavior` 链式配置：

```java
var machine = MachineBuilder
        .machine(RECIPE_TICKER)
        .displayNameKey("machine.mmcr.recipe_ticker")
        .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:green_terracotta")))
        .recipeBehavior(behavior -> behavior
                .idleStart(ctx -> { ... })
                .idleEnd(ctx -> { })
                .beforeStart(ctx -> { ... })
                .recipeTick(ctx -> { ... })
                .beforeFinish(ctx -> { ... })
        )
        .build();
event.registerMachine(machine);
```

调用 `.recipeBehavior(behavior -> behavior.xxx(...))` 把行为从默认空 `RecipeBehavior` 切换成显式声明 5 个Hook的版本。

[`RecipeBehavior.Builder`](../API/JavaAPI#recipebehavior) 总共有 `idleStart` / `idleEnd` / `beforeStart` / `recipeTick` / `beforeFinish` / `preServerTick` / `postServerTick` 7个Hook，在这里只用到其中 5 个。

`preServerTick` / `postServerTick` 留给"无论机器在不在跑配方，每 tick 都触发"的全局逻辑。

(是的你没看错，即使是 Recipe Tick 也是可以使用 Server Tick 的)

5 个Hook的接收上下文与触发时机：

| Hook | 接收的上下文 | 触发时机 |
| --- | --- | --- |
| `idleStart` | `MachineBehaviorContext` | 进入 idle 状态的第一个 tick |
| `idleEnd` | `MachineBehaviorContext` | 离开 idle 状态 |
| `beforeStart` | `RecipeStartContext` | 配方启动前，可改 duration / requirements / outputs |
| `recipeTick` | `RecipeTickContext` | 配方每 tick 触发 |
| `beforeFinish` | `RecipeFinishContext` | 配方提交输出前，可改 outputs 或取消 |

## Hook详解

### `idleStart`：进入空闲

```java
.idleStart(ctx -> {
    var screen = ctx.screenText();
    screen.append(
            ControllerScreenTextScope.OPERATION,
            DISPLAY_WHEN_IDLE_EMPTY_LINE,
            Component.literal(" "));
    screen.append(
            ControllerScreenTextScope.OPERATION,
            DISPLAY_WHEN_IDLE,
            Component.translatable("gui.mmcr.display_when_idle"));
})
```

这里的 `ctx` 是 [`MachineBehaviorContext`](../API/JavaAPI#machinebehaviorcontext)，没有 `currentTick()` / `recipe()` 这类"配方上下文"方法。写入 [`ControllerScreenTextScope.OPERATION`](../API/JavaAPI#controllerscreentextscope)：

| scope | 内容来源 | 重置时机 |
| --- | --- | --- |
| `CONTROLLER` | Mod 完全控制 | 由 Mod 自己管理 |
| `OPERATION` | MMCR 自动 + Mod 追加 | 每个配方生命周期自动重置 |

`idleStart` 写入 `OPERATION` scope 的内容，会在配方开始时被 MMCR 清掉，配合 `beforeStart` 里"清掉 idle 行"的写法，屏幕上不会同时出现"idle 提示"与"运行中提示"。

### `beforeStart`

```java
.beforeStart(ctx -> {
    var screen = ctx.machineContext().screenText();
    screen.remove(ControllerScreenTextScope.OPERATION, DISPLAY_WHEN_IDLE_EMPTY_LINE);
    screen.remove(ControllerScreenTextScope.OPERATION, DISPLAY_WHEN_IDLE);

    var machineContext = ctx.machineContext();
    var level = machineContext.level();
    var controllerPos = machineContext.controllerPos();
    var area = new AABB(controllerPos.getX() - 2, level.getMinY(), controllerPos.getZ() - 2,
                        controllerPos.getX() + 3, level.getMaxY() + 1, controllerPos.getZ() + 3);
    for (var entity : level.getEntitiesOfClass(LivingEntity.class, area)) {
        entity.addEffect(new net.minecraft.world.effect.MobEffectInstance(
                MobEffects.STRENGTH, 10000, 1));
    }

    var nextRequirements = new ArrayList<MachineRequirement>();
    boolean changed = false;
    for (var requirement : ctx.requirements()) {
        if (!(requirement instanceof ItemRequirement itemRequirement)
                || requirement.io() != RecipeModifier.IOType.INPUT) {
            nextRequirements.add(requirement);
            continue;
        }
        var possibleItems = ingredientItems(itemRequirement);
        boolean isExactlyGold = itemRequirement.count() == 32
                && possibleItems.size() == 1
                && BuiltInRegistries.ITEM.getKey(possibleItems.get(0).value())
                        .toString().equals("minecraft:gold_ingot");
        if (isExactlyGold) {
            nextRequirements.add(new ItemRequirement(
                    itemRequirement.io(), itemRequirement.item(), 1,
                    itemRequirement.stack(), itemRequirement.chance(),
                    itemRequirement.tags(), itemRequirement.components(),
                    itemRequirement.consumeChance()));
            changed = true;
        } else {
            nextRequirements.add(requirement);
        }
    }
    if (changed) ctx.setRequirements(nextRequirements);
})
```

[`RecipeStartContext`](../API/JavaAPI#recipestartcontext) 提供两个关键能力：

- `ctx.machineContext()`：拿到 [`MachineBehaviorContext`](../API/JavaAPI#machinebehaviorcontext)，可读 `level()` / `controllerPos()` / `screenText()`。
- `ctx.requirements()` 与 `ctx.setRequirements(...)` 读取 / 替换配方输入需求列表。

上面这段：

1. 把 `idleStart` 写入的两行清掉，避免同时显示"idle 提示"与"运行中提示"
2. 给范围内所有 `LivingEntity` 加 10000 tick 的力量 II 效果
3. **修改配方需求**：遍历 `ctx.requirements()`，如果某条 `ItemRequirement` 是"32 个金锭"，就替换成 1 个金锭

`ctx.requirements()` 返回的是 `List<MachineRequirement>` 不可变副本，修改它不会影响底层 `MachineRecipe`，必须通过 `setRequirements(...)` 替换，MMCR 才会在 `beforeStart` 结束时统一应用。

### `recipeTick`

```java
.recipeTick(ctx -> {
    var screen = ctx.machineContext().screenText();
    screen.appendAfter(
            ControllerScreenTextScope.OPERATION,
            DISPLAY_WHEN_START_RECIPE,
            id("in_line"),
            Component.literal("文本"));
})
```

[`RecipeTickContext`](../API/JavaAPI#recipetickcontext) 与 `RecipeStartContext`：

| 能力 | `RecipeStartContext` | `RecipeTickContext` |
| --- | --- | --- |
| `ctx.machineContext()` | ✓ | ✓ |
| `ctx.currentTick()` / `ctx.totalTick()` | ✗ | ✓ |
| `ctx.parallelism()` | ✗（在 `requestedParallelism()` / `effectiveParallelism()` 里） | ✓ |
| `ctx.setRequirements(...)` / `setOutputs(...)` | ✓ | ✗（只读副本） |
| `ctx.cancel()` | ✓ | ✗ |

也就是说，`recipeTick` **不能修改配方需求 / 输出**，它只能读取 `currentTick()` 并基于此写屏幕文本 / 施加效果 / 调用其他游戏机制。

如果想修改需求，应该在 `beforeStart` 里做，如果想在完成前改输出，应该在 `beforeFinish` 里做。

[`ControllerScreenText.appendAfter(...)`](../API/JavaAPI#controllerscreentext) 把这条"文本"插到 `in_line` 之后，与 `registerDefinitions` 里的 `IN_LINE` 形成呼应：注册时在 `sp_line_1` 后插入 `IN_LINE`，运行时在 `IN_LINE` 后再追加运行信息。

### `beforeFinish`

```java
.beforeFinish(ctx -> {
    var machineContext = ctx.machineContext();
    var level = machineContext.level();
    var controllerPos = machineContext.controllerPos();
    var area = new AABB(controllerPos.getX() - 2, level.getMinY(), controllerPos.getZ() - 2,
                        controllerPos.getX() + 3, level.getMaxY() + 1, controllerPos.getZ() + 3);
    for (var entity : level.getEntitiesOfClass(LivingEntity.class, area)) {
        entity.addEffect(new net.minecraft.world.effect.MobEffectInstance(
                MobEffects.NIGHT_VISION, 10000, 1));
    }
})
```

[`RecipeFinishContext`](../API/JavaAPI#recipefinishcontext) 提供 `ctx.machineContext()` / `ctx.setOutputs(...)` / `ctx.discardOutputs()` / `ctx.cancel()`。

## 结构

```java
public static void registerStructures(MMCRMachineStructuresEvent event) {
    if (!event.structures().containsKey(RECIPE_TICKER)) {
        var structure = MachineStructureBuilder
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("XXX", "AAA", "XXX")
                                .layer("XXX", "A A", "X X")
                                .layer("XXX", "ACA", "XXX")
                                .where('X', block(Blocks.GREEN_TERRACOTTA))
                                .where('A', any(
                                        InterfacePredicates.anyOfItemInput(),
                                        InterfacePredicates.anyOfItemOutput(),
                                        InterfacePredicates.anyOfEnergyInput(),
                                        InterfacePredicates.parallelControllers(),
                                        block(Blocks.GREEN_WOOL)
                                ))
                                .controller('C')
                        )
                )
                .build(RECIPE_TICKER);
        event.registerStructure(structure);
    }
}
```

老演员不说了

## 配方

```java
public static void register(MMCRMachineRecipesEvent event) {
    var recipe = MachineRecipeBuilder
            .recipe(RECIPE_TICKER.withSuffix("_recipe_1"), RECIPE_TICKER)
            .inputItem(Items.COAL, 10000)
            .inputItem(Items.DIAMOND, 8)
            .outputItem(Items.GOLD_INGOT, 9)
            .inputEnergy(20)
            .duration(500)
            .build();
    event.registerRecipe(recipe);

    recipe = MachineRecipeBuilder
            .recipe(RECIPE_TICKER.withSuffix("_recipe_2"), RECIPE_TICKER)
            .inputItem(Items.DIAMOND, 114514)
            .inputItem(Items.IRON_INGOT, 8)
            .outputItem(Items.COAL, 18)
            .inputEnergy(20)
            .duration(300)
            .build();
    event.registerRecipe(recipe);

    recipe = MachineRecipeBuilder
            .recipe(RECIPE_TICKER.withSuffix("_recipe_3"), RECIPE_TICKER)
            .inputItem(Items.GOLD_INGOT, 32)
            .inputItem(Items.STICK, 8)
            .outputItem(Items.DIAMOND, 3)
            .inputEnergy(20)
            .duration(300)
            .build();
    event.registerRecipe(recipe);
}
```

`recipe_3` 与 `beforeStart` Hook的联动：

- 配方数据为 32 金锭
- `beforeStart` 把"32 金锭且只匹配金锭"的需求替换成 1 金锭
- 玩家实际只需在输入总线放 1 个金锭就能触发配方。

## 特殊机制

3 种上下文的能力差异：

| 上下文 | 提供的能力 |
| --- | --- |
| [`RecipeStartContext`](../API/JavaAPI#recipestartcontext) | `recipe()` / `duration()` / `requirements()` / `outputs()` + `setDuration(...)` / `setRequirements(...)` / `setOutputs(...)` / `snapshot()` / `cancel()` |
| [`RecipeTickContext`](../API/JavaAPI#recipetickcontext) | `recipe()` / `currentTick()` / `totalTick()` / `parallelism()` / 只读 `requirements()` / 只读 `outputs()` / `capabilitySnapshot()` |
| [`RecipeFinishContext`](../API/JavaAPI#recipefinishcontext) | `recipe()` / `recipeId()` / `requestedParallelism()` / `effectiveParallelism()` / `outputs()` + `setOutputs(...)` / `discardOutputs()` / `cancel()` |

"启动前"要改需求、"执行中"不可以修改、"完成前"可以改输出。

三者都通过 `ctx.machineContext()` 拿到 [`MachineBehaviorContext`](../API/JavaAPI#machinebehaviorcontext)，可读 `level()` / `controllerPos()` / `screenText()` / `gameTime()` / `machineId()`。

:::info
[`MachineIoPlan`](../API/JavaAPI#machineioplan) 只在 [`TickBehavior`](../API/JavaAPI#tickbehavior) 的 `serverTick` 里有意义

[`RecipeBehavior`](../API/JavaAPI#recipebehavior) 的 `recipeTick` 等Hook**不需要手动调**，配方机器的 IO 由 MMCR 自动根据配方字段管理。
:::

`idleStart` / `idleEnd` / `preServerTick` / `postServerTick` 四个Hook的签名都是 `MachineCallback`，接收 [`MachineBehaviorContext`](../API/JavaAPI#machinebehaviorcontext)。**这 4 个Hook只在 `recipeBehavior(...)` 上下文里可用**，[`MachineBuilder.tickBehavior(...)`](../API/JavaAPI#machinebuilder) 之后再调用 `preServerTick` / `postServerTick` 会抛 `IllegalStateException`。

5 个Hook抛出的异常都会被 MMCR 捕获并记录，机器进入失败状态。`beforeStart` 里如果 `setRequirements(...)` 抛了 `IllegalArgumentException`（比如把 32 金锭替换成 0 个，违反 `count >= 1` 的约束），机器同样会失败，修改需求时务必保证新参数满足 `MachineRequirement` 的构造约束。

## RECIPE_TICK 和 PURE_TICK

详见 [纯Tick测试机器 的对应章节](../JavaAPI/纯Tick测试机器#何时用-pure_tick-vs-recipe_tick)

## 小结

- 行为策略层：用 [`RecipeBehavior`](../API/JavaAPI#recipebehavior) 把 [`MachineBehavior.Kind.RECIPE`](../API/JavaAPI#machinebehavior) 切到"配方驱动 + 5 个Hook"
- 5 个Hook的语义：`idleStart` / `idleEnd`、`beforeStart`、`recipeTick`、`beforeFinish`
- 上下文层级：`RecipeStartContext` / `RecipeTickContext` / `RecipeFinishContext` 通过 `ctx.machineContext()` 获得 [`MachineBehaviorContext`](../API/JavaAPI#machinebehaviorcontext)
- 屏幕文本：[`ControllerScreenText.appendAfter(...)`](../API/JavaAPI#controllerscreentext) 和 [`ControllerScreenTextScope.OPERATION`](../API/JavaAPI#controllerscreentextscope) 让"模板行 → 内容行"的展示顺序可控