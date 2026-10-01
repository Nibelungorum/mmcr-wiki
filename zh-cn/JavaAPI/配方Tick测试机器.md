---
title: 配方Tick测试
order: 15
---

# 配方Tick测试机器

这台机器注册三条配方，并在五个生命周期 Hook 中插入自定义逻辑：空闲时展示提示，启动前施加力量效果并修改金锭需求，运行时追加文本，完成前施加夜视效果。

## 涉及文件与 API

- [RECIPE_TICKER.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/builtin/RECIPE_TICKER.java)
- [KubeJS 结构对照](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js) / [配方对照](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/advance/A_Recipe_Tick_Machine.js)：脚本机器使用独立的 `mmcr_kubejs:kubejs_recipe_ticker` ID。

| API | 用途与签名参考 |
| --- | --- |
| `Machines` / `Structures` / `Recipes` | [机器](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Machines.java)、[结构](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Structures.java)、[配方](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Recipes.java) 入口 |
| `RegisterMachineDefinitionsEvent` / `RegisterMachineStructuresEvent` / `RegisterMachineRecipesEvent` | 注册 `MachineSpec`、`StructureSpec`、`RecipeSpec` |
| `RecipeHooks` | [七个配方模式回调的配置签名](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/RecipeHooks.java) |
| `MachineContext` | 空闲、pre/post Tick 与配方上下文共享的服务端能力 |
| `RecipeStartContext` | [启动前编辑](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/RecipeStartContext.java)，优先使用 `replaceExactItemInputCount` |
| `RecipeTickContext` | [执行中只读配方信息](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/RecipeTickContext.java) |
| `RecipeFinishContext` | [完成前编辑输出](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/RecipeFinishContext.java) |
| `RequirementSpec` / `OutputView` / `RecipeView` | 公共需求、输出与配方视图，替代直接使用底层 record |
| `IoSnapshot` | `RecipeTickContext.ioSnapshot()` 与 `MachineContext.ioView()` 的返回类型 |
| `ControllerTexts` / `ControllerText` / `TextScope` | 初始化文本、实时文本句柄与行作用域 |
| `BlockConditions` | 方块及接口条件 |

## 定义与文本模板

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

`recipeBehavior` 配置公共 `RecipeHooks`，无需使用底层 `RecipeBehavior.Builder`。七个 Hook 都接受 `Consumer<相应上下文>`，本例使用其中五个：

| Hook | 参数类型 | 用途 |
| --- | --- | --- |
| `idleStart` / `idleEnd` | `MachineContext` | 进入 / 离开空闲状态 |
| `beforeStart` | `RecipeStartContext` | 消耗启动输入前编辑运行参数 |
| `recipeTick` | `RecipeTickContext` | 运行中读取进度、追加自定义逻辑 |
| `beforeFinish` | `RecipeFinishContext` | 完成提交前编辑输出 |
| `preServerTick` / `postServerTick` | `MachineContext` | 配方模式下的全局 Tick 前后逻辑，不限于运行配方时 |

初始化文本中 `IN_LINE` 插在 `sp_line_1` 后面。不过 `appendAfter` 要求参考行存在于**同一 scope**；缺失或跨 scope 参考行时不操作，不能无条件保证最终出现 `BEFORE_LINE → IN_LINE → AFTER_LINE`。

## Hook 详解

### idleStart：进入空闲

```java
.idleStart((MachineContext ctx) -> {
    var screen = ctx.screenText();
    screen.append(TextScope.OPERATION, DISPLAY_WHEN_IDLE_EMPTY_LINE, Component.literal(" "));
    screen.append(TextScope.OPERATION, DISPLAY_WHEN_IDLE,
            Component.translatable("gui.mmcr.display_when_idle"));
})
.idleEnd(ctx -> { })
```

`MachineContext` 提供世界、位置、存储与文本，不提供 `currentTick()` 或当前配方编辑器。`CONTROLLER` 行由附属管理；`OPERATION` 行随操作生命周期重置。此处空闲提示放在 `OPERATION`，启动 Hook 也显式删除它们。

### beforeStart：效果与安全需求替换

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

启动前对周围 5×5、贯穿世界高度区域内的生物施加力量 II，再替换金锭数量。**优先调用公共辅助方法，不再手动遍历并重建底层需求 record**：

```java
boolean replaceExactItemInputCount(Item item, int expectedCount, int replacementCount);
```

`Item` 来自 `net.minecraft.world.item`。当前实现只替换**首个**满足以下条件的需求：输入方向、数量等于 `expectedCount`、ingredient 恰好解析到一个物品且就是给定 `item`。不是把所有能匹配金锭的标签或多个候选物品需求都替换。

返回值表示是否发生匹配替换；两个数量都必须大于零。方法沿用原需求的其他属性，由核心更新需求及相关输出数据。它编辑本次启动上下文，不改全局注册的配方。

对于其他复杂编辑，公共层仍提供 `List<RequirementSpec> requirements()` 与 `void setRequirements(List<RequirementSpec>)`，以及 `List<OutputView> outputs()` / `setOutputs(...)`。这些是公共 spec/view，不能直接把底层 requirement record 当成公共类型使用；读取副本也不会自动写回。

:::info
这里的生物效果是世界副作用，发生在启动输入实际提交之前。后续配方启动失败或取消，不会自动撤销已经施加的效果。不要把 beforeStart 内全部操作当成同一可回滚事务。
:::

### recipeTick：运行中的文本

```java
.recipeTick((RecipeTickContext ctx) -> {
    var screen = ctx.machineContext().screenText();
    screen.appendAfter(TextScope.OPERATION, DISPLAY_WHEN_START_RECIPE,
            id("in_line"), Component.literal("正在使用雷霆大猪咪暴力执行配方"));
})
```

`RecipeTickContext` 可以读取 `currentTick()` / `totalTick()` / `parallelism()`、需求与输出，以及 `IoSnapshot ioSnapshot()`。没有编辑需求、编辑输出或取消配方的方法；修改需求应放到 `beforeStart`，修改最终输出放到 `beforeFinish`。

这段保留 builtin 的文本写法，但初始化的 `IN_LINE` 位于 `CONTROLLER`，这里却在 `OPERATION` 中引用同 ID。按当前 `ControllerText.appendAfter` 的同 scope 约束，**单靠前面的初始化不能保证插入这条运行文本**。实际需要 `OPERATION` 内已有同 ID 参考行；否则这次调用不操作。

### beforeFinish：完成前的世界效果

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

完成前可 `setOutputs(...)`、`discardOutputs()`、`cancel()`。其中 `cancel()` 保留待完成工作，**不是丢弃配方进度**；`discardOutputs()` 则让本次完成不产生输出。生物效果同样不自动回滚，且不能把“完成前 Hook 已执行”理解为“输出一定已提交”。

## 结构

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

与纯 Tick 示例相比，此结构没有 `factoryController()` 条件。结构注册方法接收 `RegisterMachineStructuresEvent`，不是旧拼写的事件类。

## 三条配方

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

第三条配方声明 32 个金锭，Hook 将匹配到的本次启动需求替换成 1 个；8 根木棍、能量、结构和其他条件仍需满足。这个修改发生在候选进入启动 Hook 后，不能仅凭修改代码就保证“输入只放一个金锭必定能被配方搜索选中”。

## 三种上下文的准确能力

| 上下文 | 公共能力 |
| --- | --- |
| `RecipeStartContext` | `RecipeView recipe()`、ID、请求 / 有效并行、duration、`List<RequirementSpec>`、`List<OutputView>`；支持时长、需求、输出编辑、精确物品数量替换、`RecipeExecutionView snapshot()`、取消 |
| `RecipeTickContext` | 配方、当前 / 总 tick、并行、需求与输出读取、`IoSnapshot ioSnapshot()`；无配方编辑或取消 setter |
| `RecipeFinishContext` | 配方与 ID、请求 / 有效并行、输出读取 / 编辑、丢弃输出、取消及状态查询 |

三者都通过 `MachineContext machineContext()` 访问服务端环境。输出视图里的栈是副本，修改读取的栈不会直接改配方，需显式 `setOutputs` 写回。`RecipeTickContext` 不再使用 `capabilitySnapshot()`；公共返回类型是 `IoSnapshot`。

配方机器的 IO 按配方需求由核心管理，不能照搬纯 Tick 的 `ioPlan()` 调用：`MachineContext` 本身没有该方法，只有 `TickContext` 新增了它。公共 `RecipeHooks` 提供 pre/post Tick，公共 `TickHooks` 仅提供 `serverTick`。

Hook 中异常处理与失败状态由核心控制；不能据此承诺普通存储写入、实体效果或屏幕操作自动回滚。需要 IO 与数据一致提交时，参考直 Tick 的 `IoTransaction` 事务模式及明确的生命周期边界。

## 延伸阅读

- [纯Tick测试机器的模式对比](./纯Tick测试机器#pure_tick-和-recipe_tick)。
- [数据存储测试机器](./数据存储测试机器)：事务与非事务副作用。
- [Java 公共 API 参考](../API/JavaAPI)。
