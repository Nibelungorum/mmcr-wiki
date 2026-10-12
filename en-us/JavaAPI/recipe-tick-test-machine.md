---
title: Recipe Tick Test
order: 15
---

# Recipe Tick Test Machine

This machine registers three recipes and inserts custom logic in five lifecycle hooks: it displays a prompt while idle, applies Strength and changes the gold-ingot requirement before starting, appends text while running, and applies Night Vision before completion.

## Files and APIs Involved

- [RECIPE_TICKER.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/builtin/RECIPE_TICKER.java)
- [KubeJS structure comparison](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js) / [recipe comparison](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/advance/A_Recipe_Tick_Machine.js): the script machine uses the separate `mmcr_kubejs:kubejs_recipe_ticker` ID.

| API | Purpose and signature reference |
| --- | --- |
| `Machines` / `Structures` / `Recipes` | [Machine](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Machines.java), [structure](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Structures.java), and [recipe](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Recipes.java) entry points |
| `RegisterMachineDefinitionsEvent` / `RegisterMachineStructuresEvent` / `RegisterMachineRecipesEvent` | Register `MachineSpec`, `StructureSpec`, and `RecipeSpec` |
| `RecipeHooks` | [Configuration signatures for seven recipe-mode callbacks](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/RecipeHooks.java) |
| `MachineContext` | Server-side capabilities shared by idle, pre/post tick, and recipe contexts |
| `RecipeStartContext` | [Edits before startup](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/RecipeStartContext.java); prefer `replaceExactItemInputCount` |
| `RecipeTickContext` | [Read-only recipe information while running](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/RecipeTickContext.java) |
| `RecipeFinishContext` | [Edit outputs before completion](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/RecipeFinishContext.java) |
| `RequirementSpec` / `OutputView` / `RecipeView` | Public requirement, output, and recipe views that replace direct use of underlying records |
| `IoSnapshot` | Return type of `RecipeTickContext.ioSnapshot()` and `MachineContext.ioView()` |
| `ControllerTexts` / `ControllerText` / `TextScope` | Initialize text, live text handles, and line scopes |
| `BlockConditions` | Block and port conditions |

## Definitions and Text Template

```java
private static final Identifier RECIPE_TICKER = id("recipe_ticker");
private static final Identifier BEFORE_LINE = id("before_line");
private static final Identifier IN_LINE = id("in_line");
private static final Identifier AFTER_LINE = id("after_line");
private static final Identifier DISPLAY_WHEN_IDLE = id("display_when_idle");
private static final Identifier DISPLAY_WHEN_IDLE_EMPTY_LINE = id("display_when_idle_empty_line");
private static final Identifier DISPLAY_WHEN_START_RECIPE = id("display_when_start_recipe");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    ControllerTexts.register(RECIPE_TICKER, (ControllerTextContext context) -> {
        context.screenText().append(TextScope.CONTROLLER, BEFORE_LINE,
                Component.translatable("gui.mmcr.before_line"));
        context.screenText().appendAfter(TextScope.CONTROLLER, IN_LINE,
                id("sp_line_1"), Component.translatable("gui.mmcr.in_line"));
        context.screenText().append(TextScope.CONTROLLER, AFTER_LINE,
                Component.translatable("gui.mmcr.after_line"));
    });
    if (!event.definitions().containsKey(RECIPE_TICKER)) {
        MachineSpec machine = Machines.machine(RECIPE_TICKER)
                .recipePool(RECIPE_TICKER)
                .displayNameKey("machine.mmcr.recipe_ticker")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:green_terracotta")))
                .recipeBehavior(behavior -> behavior
                        // 接上下文各 Hook 的配置。
                        .idleStart((MachineContext ctx) -> { /* 见下文 */ })
                        .idleEnd(ctx -> { })
                        .beforeStart((RecipeStartContext ctx) -> { /* 见下文 */ })
                        .recipeTick((RecipeTickContext ctx) -> { /* 见下文 */ })
                        .beforeFinish((RecipeFinishContext ctx) -> { /* 见下文 */ }))
                .build();
        event.registerMachine(machine);
    }
}
```

`recipeBehavior` configures public `RecipeHooks`, without requiring the low-level `RecipeBehavior.Builder`. All seven hooks accept a `Consumer<corresponding context>`; this example uses five of them:

| Hook | Parameter type | Purpose |
| --- | --- | --- |
| `idleStart` / `idleEnd` | `MachineContext` | Enter / leave the idle state |
| `beforeStart` | `RecipeStartContext` | Edit runtime parameters before startup inputs are consumed |
| `recipeTick` | `RecipeTickContext` | Read progress and add custom logic while running |
| `beforeFinish` | `RecipeFinishContext` | Edit outputs before the completion is committed |
| `preServerTick` / `postServerTick` | `MachineContext` | Global logic before and after ticks in recipe mode, not limited to when a recipe is running |

During text initialization, `IN_LINE` is inserted after `sp_line_1`. However, `appendAfter` requires the reference line to exist in the **same scope**; it does nothing for a missing or cross-scope reference line, so `BEFORE_LINE → IN_LINE → AFTER_LINE` cannot be guaranteed to appear unconditionally.

## Hook Details

### idleStart: Entering Idle

```java
.idleStart((MachineContext ctx) -> {
    var screen = ctx.screenText();
    screen.append(TextScope.OPERATION, DISPLAY_WHEN_IDLE_EMPTY_LINE, Component.literal(" "));
    screen.append(TextScope.OPERATION, DISPLAY_WHEN_IDLE,
            Component.translatable("gui.mmcr.display_when_idle"));
})
.idleEnd(ctx -> { })
```

`MachineContext` provides the world, position, storage, and text, but not `currentTick()` or a current recipe editor. `CONTROLLER` lines are managed by the attachment; `OPERATION` lines reset with the operation lifecycle. The idle prompt is placed in `OPERATION` here, and the startup hook explicitly removes it as well.

### beforeStart: Effects and Safe Requirement Replacement

```java
.beforeStart((RecipeStartContext ctx) -> {
    var screen = ctx.machineContext().screenText();
    screen.remove(TextScope.OPERATION, DISPLAY_WHEN_IDLE_EMPTY_LINE);
    screen.remove(TextScope.OPERATION, DISPLAY_WHEN_IDLE);

    MachineContext machineContext = ctx.machineContext();
    var level = machineContext.level();
    var controllerPos = machineContext.controllerPos();
    var area = new AABB(controllerPos.getX() - 2, level.getMinY(), controllerPos.getZ() - 2,
            controllerPos.getX() + 3, level.getMaxY() + 1, controllerPos.getZ() + 3);
    for (var entity : level.getEntitiesOfClass(LivingEntity.class, area)) {
        entity.addEffect(new MobEffectInstance(MobEffects.STRENGTH, 10000, 1));
    }
    ctx.replaceExactItemInputCount(Items.GOLD_INGOT, 32, 1);
})
```

Before startup, this applies Strength II to creatures in the surrounding 5x5 area spanning the world's height, then replaces the gold-ingot count. **Prefer the public helper method instead of manually traversing and rebuilding underlying requirement records**:

```java
boolean replaceExactItemInputCount(Item item, int expectedCount, int replacementCount);
```

`Item` comes from `net.minecraft.world.item`. The current implementation replaces only the **first** requirement that meets all of the following conditions: input direction, a count equal to `expectedCount`, and an ingredient that resolves to exactly one item that is the given `item`. It does not replace every tag or multiple-candidate item requirement that can match gold ingots.

The return value indicates whether a matching replacement occurred; both counts must be greater than zero. The method retains the other properties of the original requirement, while the core updates the requirement and related output data. It edits this startup context and does not change the globally registered recipe.

For other complex edits, the public layer still provides `List<RequirementSpec> requirements()` and `void setRequirements(List<RequirementSpec>)`, as well as `List<OutputView> outputs()` / `setOutputs(...)`. These are public specs/views; underlying requirement records cannot be used directly as public types, and reading a copy does not write it back automatically.

:::info
The creature effects here are world side effects and occur before the startup inputs are actually committed. If the subsequent recipe startup fails or is cancelled, already-applied effects are not automatically reverted. Do not treat all operations in `beforeStart` as one rollback-capable transaction.
:::

### recipeTick: Text While Running

```java
.recipeTick((RecipeTickContext ctx) -> {
    var screen = ctx.machineContext().screenText();
    screen.appendAfter(TextScope.OPERATION, DISPLAY_WHEN_START_RECIPE,
            id("in_line"), Component.literal("正在使用雷霆大猪咪暴力执行配方"));
})
```

`RecipeTickContext` can read `currentTick()` / `totalTick()` / `parallelism()`, requirements and outputs, and `IoSnapshot ioSnapshot()`. It has no methods to edit requirements, edit outputs, or cancel recipes; requirement changes belong in `beforeStart`, and final-output changes belong in `beforeFinish`.

This preserves the builtin's text code, but the initialized `IN_LINE` is in `CONTROLLER`, while the same ID is referenced in `OPERATION` here. Under the current same-scope constraint of `ControllerText.appendAfter`, **the preceding initialization alone cannot guarantee that this running text is inserted**. A reference line with the same ID must already exist in `OPERATION`; otherwise, this call does nothing.

### beforeFinish: World Effects Before Completion

```java
.beforeFinish((RecipeFinishContext ctx) -> {
    MachineContext machineContext = ctx.machineContext();
    var level = machineContext.level();
    var controllerPos = machineContext.controllerPos();
    var area = new AABB(controllerPos.getX() - 2, level.getMinY(), controllerPos.getZ() - 2,
            controllerPos.getX() + 3, level.getMaxY() + 1, controllerPos.getZ() + 3);
    for (var entity : level.getEntitiesOfClass(LivingEntity.class, area)) {
        entity.addEffect(new MobEffectInstance(MobEffects.NIGHT_VISION, 10000, 1));
    }
})
```

Before completion, you can use `setOutputs(...)`, `discardOutputs()`, and `cancel()`. `cancel()` retains the pending work to be completed; it **does not discard recipe progress**. `discardOutputs()` causes this completion to produce no output. Creature effects likewise are not automatically reverted, and an already-executed "before completion" hook does not guarantee that outputs have been committed.

## Structure

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(RECIPE_TICKER)) {
        StructureSpec structure = Structures.structure()
                .fullStructure(s -> s.pattern(p -> p
                        .layer("XXX", "AAA", "XXX")
                        .layer("XXX", "A A", "X X")
                        .layer("XXX", "ACA", "XXX")
                        .where('X', block(Blocks.GREEN_TERRACOTTA))
                        .where('A', any(BlockConditions.itemInput(), BlockConditions.itemOutput(),
                                BlockConditions.energyInput(), BlockConditions.parallelControllers(),
                                block(Blocks.GREEN_WOOL)))
                        .controller('C')))
                .build(RECIPE_TICKER);
        event.registerStructure(structure);
    }
}
```

Compared with the pure tick example, this structure does not include the `factoryController()` condition. The structure registration method receives `RegisterMachineStructuresEvent`, not the event class with the old spelling.

## Three Recipes

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes.recipe(RECIPE_TICKER.withSuffix("_recipe_1"))
            .recipePool(RECIPE_TICKER)
            .inputItem(Items.COAL, 10000)
            .inputItem(Items.DIAMOND, 8)
            .outputItem(Items.GOLD_INGOT, 9)
            .inputEnergy(20)
            .duration(500)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes.recipe(RECIPE_TICKER.withSuffix("_recipe_2"))
            .recipePool(RECIPE_TICKER)
            .inputItem(Items.DIAMOND, 114514)
            .inputItem(Items.IRON_INGOT, 8)
            .outputItem(Items.COAL, 18)
            .inputEnergy(20)
            .duration(300)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes.recipe(RECIPE_TICKER.withSuffix("_recipe_3"))
            .recipePool(RECIPE_TICKER)
            .inputItem(Items.GOLD_INGOT, 32)
            .inputItem(Items.STICK, 8)
            .outputItem(Items.DIAMOND, 3)
            .inputEnergy(20)
            .duration(300)
            .build();
    event.registerRecipe(recipe);
}
```

The third recipe declares 32 gold ingots, and the hook replaces the matched startup requirement with 1; 8 sticks, energy, structure, and other conditions must still be met. This change occurs after the candidate enters the startup hook, so changing this code alone cannot guarantee that recipe search selects the recipe when only one gold ingot is supplied.

## Exact Capabilities of the Three Contexts

| Context | Public capabilities |
| --- | --- |
| `RecipeStartContext` | `RecipeView recipe()`, ID, requested / effective parallelism, duration, `List<RequirementSpec>`, `List<OutputView>`; supports editing duration, requirements, and outputs, exact item-count replacement, `RecipeExecutionView snapshot()`, and cancellation |
| `RecipeTickContext` | Recipe, current / total ticks, parallelism, read access to requirements and outputs, `IoSnapshot ioSnapshot()`; no recipe edit or cancellation setters |
| `RecipeFinishContext` | Recipe and ID, requested / effective parallelism, output reading / editing, discarding outputs, cancellation, and status queries |

All three access the server environment through `MachineContext machineContext()`. Stacks in output views are copies; modifying a read stack does not directly change the recipe, so use `setOutputs` to write it back explicitly. `RecipeTickContext` no longer uses `capabilitySnapshot()`; the public return type is `IoSnapshot`.

Recipe-machine IO is managed by the core according to recipe requirements, so the pure tick `ioPlan()` call cannot be copied directly: `MachineContext` itself does not have that method; only `TickContext` adds it. Public `RecipeHooks` provides pre/post tick hooks, while public `TickHooks` provides only `serverTick`.

The core controls exception handling and failure states in hooks; this cannot guarantee that normal storage writes, entity effects, or screen operations are automatically rolled back. When IO and data must be committed consistently, refer to the direct-tick `IoTransaction` transaction pattern and explicit lifecycle boundaries.

## Further Reading

- [Pure Tick Test Machine comparison](./pure-tick-test-machine#pure-tick-and-recipe-tick).
- [Data Storage Test Machine](./data-store-test-machine): transactional and non-transactional side effects.
- [Java Public API Reference](../API/JavaAPI).
