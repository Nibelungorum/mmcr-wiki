---
title: 纯Tick测试机器
order: 14
---

# 纯Tick测试机器

一台完全不用配方、按 tick 自驱动的机器。

## 概览

这是一台不依赖配方的 tick 驱动机器：每 40 tick 尝试一次，先扣 10 FE 能量，扣成功后再寻找范围内的玩家并召唤闪电，最后如果输入总线里有铁锭，就把它转成金粒放到输出总线上。

它演示 [`TickBehavior`](../API/JavaAPI#tickbehavior) / [`MachineIoPlan`](../API/JavaAPI#machineioplan) / [`MachineIoView`](../API/JavaAPI#machineioview) ，没有配方、没有 `MachineRecipeBuilder`，所有"配方逻辑"都被压缩到一段 `serverTick` 里。

## API

| API | 参考 |
| --- | --- |
| `MachineBehavior` / `MachineBehavior.Kind` | [链接](../API/JavaAPI#machinebehavior) |
| `TickBehavior` | [链接](../API/JavaAPI#tickbehavior) |
| `TickBehaviorContext` | [链接](../API/JavaAPI#tickbehaviorcontext) |
| `MachineBehaviorContext` | [链接](../API/JavaAPI#machinebehaviorcontext) |
| `MachineIoPlan` | [链接](../API/JavaAPI#machineioplan) |
| `MachineIoView` | [链接](../API/JavaAPI#machineioview) |
| `OutputPolicy` | [链接](../API/JavaAPI#outputpolicy) |
| `MachineBuilder` | [链接](../API/JavaAPI#machinebuilder) |
| `MMCRMachineDefinationsEvent` / `MMCRMachineStructuresEvent` | [链接](../API/JavaAPI#mmcrmachinedefinationsevent) / [链接](../API/JavaAPI#mmcrmachinestructuresevent) |
| `MachineStructureBuilder` / `PatternBuilder` | [链接](../API/JavaAPI#machinestructurebuilder) / [链接](../API/JavaAPI#patternbuilder) |
| `BlockPredicate` / `InterfacePredicates` | [链接](../API/JavaAPI#blockpredicate) / [链接](../API/JavaAPI#interfacepredicates) |
| `ControllerScreenText` / `ControllerScreenTextScope` / `ControllerScreenTextRegistry` | [链接](../API/JavaAPI#controllerscreentext) / [链接](../API/JavaAPI#controllerscreentextscope) / [链接](../API/JavaAPI#controllerscreentextregistry) |
| `EnergyRequirement` / `ItemRequirement` | [链接](../API/JavaAPI#energyrequirement) / [链接](../API/JavaAPI#itemrequirement) |
| `RecipeIo` | [链接](../API/JavaAPI#recipeio)（源码用的是同义的 `RecipeModifier.IOType`） |

## 机器定义

[PURE_TICK_MACHINE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/builtin/PURE_TICK_MACHINE.java)：

```java
private static final Identifier PURE_TICK_MACHINE = id("pure_tick_machine");
private static final Identifier FE_STATUS = id("fe_status");
private static final Identifier PURE_TICK_STATUS = id("pure_tick_status");

public static void registerDefinitions(MMCRMachineDefinationsEvent event) {
    ControllerScreenTextRegistry.register(PURE_TICK_MACHINE, context -> {
        context.screenText().append(
                ControllerScreenTextScope.CONTROLLER, FE_STATUS,
                Component.literal("FE is needed!"));
        context.screenText().append(
                ControllerScreenTextScope.CONTROLLER, PURE_TICK_STATUS,
                Component.literal("No Ingot input"));
    });
    ...
}
```

[`ControllerScreenTextRegistry.register(...)`](../API/JavaAPI#controllerscreentextregistry) 把一段屏幕文本初始化逻辑挂到机器 ID 上。

机器定义本身：

```java
var machine = MachineBuilder
        .machine(PURE_TICK_MACHINE)
        .displayNameKey("machine.mmcr.pure_tick_machine")
        .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:green_terracotta")))
        .allowMultithreading()
        .maxParallelism(Integer.MAX_VALUE)
        .tickBehavior(behavior -> behavior.serverTick(context -> {
            if (!context.isDue(40)) return;

            var planFe = context.ioPlan();
            planFe.addInput(new EnergyRequirement(RecipeModifier.IOType.INPUT, 10));
            var feSimulation = planFe.simulate();

            if (!feSimulation.energySatisfied()) {
                context.screenText().replace(FE_STATUS, Component.literal("FE is needed!"));
                return;
            }
            ...
        }))
        .build();
event.registerMachine(machine);
```

`.tickBehavior(behavior -> behavior.serverTick(context -> { ... }))`：

- `.tickBehavior(...)` 在 [`MachineBuilder`](../API/JavaAPI#machinebuilder) 中把行为从默认的 `RecipeBehavior.defaults()` 切换成 `TickBehavior`，该机器**没有配方、不能用 `preServerTick` / `postServerTick`**，强行调用会抛 `IllegalStateException`。
- `behavior -> behavior.serverTick(...)` 是 [`TickBehavior.Builder`](../API/JavaAPI#tickbehavior) 的链式调用入口。`serverTick` 接收 [`MachineBehavior.TickCallback`](../API/JavaAPI#machinebehavior)（`void accept(TickBehaviorContext context)`）。

## `serverTick` 回调

### 1. 节流

```java
if (!context.isDue(40)) return;
```

[`MachineBehaviorContext.isDue(long)`](../API/JavaAPI#machinebehaviorcontext) 返回当前 tick 是否对齐到 `period` 的整数倍，等价于 `(gameTime() % period) == 0`。

用它把"实际逻辑"降频到 1 次 / 2 秒。

### 2. 能量消耗：`MachineIoPlan.addInput(...)` + `simulate()` + `commit()`

```java
var planFe = context.ioPlan();
planFe.addInput(new EnergyRequirement(RecipeModifier.IOType.INPUT, 10));
var feSimulation = planFe.simulate();

if (!feSimulation.energySatisfied()) {
    context.screenText().replace(FE_STATUS, Component.literal("FE is needed!"));
    return;
}

if (!planFe.commit().successful()) {
    context.screenText().replace(FE_STATUS, Component.literal("FE consume error!"));
    return;
}
```

[`TickBehaviorContext.ioPlan()`](../API/JavaAPI#tickbehaviorcontext) 返回一个全新的 [`MachineIoPlan`](../API/JavaAPI#machineioplan)：

- `simulate()` 返回 `Simulation`，其中 `energySatisfied()` 告诉调用者能量总线是否有 10 FE的能量；
- `commit()` 消耗，`simulate()` 不会改动物品 / 能量，是一个只读行为。

[`EnergyRequirement`](../API/JavaAPI#energyrequirement) 是不可变记录（`RecipeIo io, long fePerTick`）。这里的 `RecipeModifier.IOType.INPUT` 是 MMCR 内部修饰符系统沿用下来的方向枚举，其语义和 [`RecipeIo.INPUT`](../API/JavaAPI#recipeio) 是完全相同的。

:::warning 注意
`ioPlan()` 每次返回**新**的 `MachineIoPlan`，两次调用之间的状态不共享。下面步骤还要新建 `context.ioPlan()` 才能实现消耗。
:::

### 3. 范围搜玩家并召唤闪电

```java
context.screenText().replace(FE_STATUS, Component.literal("Machine do a run!"));

var level = context.level();
var pos = context.controllerPos();
var area = new AABB(pos.getX() - 1, level.getMinY(), pos.getZ() - 1,
                    pos.getX() + 2, level.getMaxY() + 1, pos.getZ() + 2);
var players = level.getEntitiesOfClass(Player.class, area);
for (var player : players) {
    LightningBolt bolt = EntityType.LIGHTNING_BOLT.create(level, EntitySpawnReason.EVENT);
    if (bolt != null) {
        bolt.setPos(player.getX(), player.getY(), player.getZ());
        bolt.setVisualOnly(false);
        level.addFreshEntity(bolt);
    }
}
```

**tick 回调里能做任何想做的事**，不限于读写物品 / 能量，也能操作实体、写 Data、发包等。

### 4. 物品输入输出

```java
var plan = context.ioPlan();
plan.addInput(new ItemRequirement(
        RecipeModifier.IOType.INPUT, Ingredient.of(Items.IRON_INGOT), 1,
        net.minecraft.world.item.ItemStack.EMPTY));
plan.add(new ItemRequirement(
        RecipeModifier.IOType.OUTPUT, null, 0,
        new net.minecraft.world.item.ItemStack(Items.GOLD_NUGGET, 1),
        1.0F, java.util.List.of()));

var simulation = plan.simulate();

if (!simulation.inputsSatisfied()) return;
boolean outputAvailable = true;
for (var output : simulation.outputs()) {
    if (output.accepted() < output.requested()) outputAvailable = false;
}
if (!outputAvailable) return;

context.screenText().replace(PURE_TICK_STATUS, Component.literal("Iron Ingot inputed"));
plan.commit();
```

[`MachineIoPlan.add(...)`](../API/JavaAPI#machineioplan) 根据 `requirement.io()` 自动路由到 `addInput(...)` 或 `addOutput(..., REQUIRE_FULL)`：

- 输入端 `Ingredient.of(Items.IRON_INGOT), 1` 显式声明消耗 1 个铁锭
- 输出端用 `add(...)` 走"省略 policy，等价于 `REQUIRE_FULL`"分支

`Simulation.outputs()` 返回每条输出项的模拟结果，每项有 `accepted()`（实际）与 `requested()`（期望）。

这里强制要求**全部输出能放下**，否则 `return`。

[`ItemRequirement`](../API/JavaAPI#itemrequirement) 在输入 / 输出方向上语义对称：

| 字段 | `INPUT` | `OUTPUT` |
| --- | --- | --- |
| `io` | `RecipeModifier.IOType.INPUT` | `RecipeModifier.IOType.OUTPUT` |
| `ingredient` | `Ingredient.of(...)` | `null` |
| `count` | ≥ 1 | 任意（通常 0） |
| `stack` | `ItemStack.EMPTY` | 实际输出栈 |
| `chance` / `tags` / `components` / `consumeChance` | 可选 | 可选 |

### 完整回调

```java
// 签名
void accept(TickBehaviorContext context);

// TickBehaviorContext 提供访问器
boolean           isDue(long period);     // 节流
MachineIoPlan     ioPlan();               // 新建 IO 计划
MachineIoView     ioView();               // 当前能力只读视图
ServerLevel       level();                // 服务端世界
BlockPos          controllerPos();        // 控制器位置
ControllerScreenText screenText();        // 屏幕文本句柄
Identifier        machineId();            // 当前机器 ID
long              gameTime();             // 服务端游戏时间
```

## 多方块结构

```java
public static void registerStructures(MMCRMachineStructuresEvent event) {
    if (!event.structures().containsKey(PURE_TICK_MACHINE)) {
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
                                        InterfacePredicates.factoryController(),
                                        block(Blocks.GREEN_WOOL)
                                ))
                                .controller('C')
                        )
                )
                .build(PURE_TICK_MACHINE);
        event.registerStructure(structure);
    }
}
```

## 配方

纯Tick测试机器 **没有配方**：`MachineRecipeBuilder` 与 `MachineRecipe` 在本类里完全不会出现。所有"配方逻辑"都被压缩到 `serverTick` 内的 [`MachineIoPlan`](../API/JavaAPI#machineioplan) 调用里。

## 特殊机制

### `TickBehavior.Builder` 与 `TickBehaviorContext`

`TickBehavior.Builder` 只有两个方法：`serverTick(...)` 设置回调，`build()` 终结构建。

`TickBehaviorContext` **继承** `MachineBehaviorContext`，新增 6 个字段（`factoryThreadCount()`、`parallelism()`、`smartInterfaceValue(...)`、`smartInterfaceValues()`、`ioPlan()`、`capabilityTickContext(...)`）。其中 `ioPlan()` 是 tick 驱动机器最常用的方法，它是所有"模拟输入 / 输出 / 能量 / commit"的入口。

`MachineBehaviorContext` 使 `level()` / `controllerPos()` / `screenText()` 等可读取，这一部分在 `TickBehaviorContext` 里继承可见。

`MachineIoView` 是只读视图（见 [`MachineIoView`](../API/JavaAPI#machineioview)），`ioView().itemAmount(Ingredient)` / `itemOutputCapacity(ItemStack)` 是常用查询。

### 屏幕文本

[`ControllerScreenText`](../API/JavaAPI#controllerscreentext) 暴露 `append` / `appendAfter` / `remove` / `clear` / `replace`，这些都是带有注释的函数，所以这里不赘述了。

需要注意以下两个方法的差别:

| 方法 | 是否要 scope | 行为 |
| --- | --- | --- |
| `append(scope, lineId, text)` | 是 | 同 scope 内相同 `lineId` 会被替换，但其他 scope 不受影响 |
| `replace(lineId, text)` | 否 | 跨 scope 替换同 ID 的行 |

`replace(...)` 一般会更实用

### 回调里的异常处理

`serverTick` 抛出的异常会被 MMCR 捕获并记录，机器进入失败状态。

## PURE_TICK 和 RECIPE_TICK

| 场景 | 推荐 | 原因 |
| --- | --- | --- |
| 发电机，反应堆，流水线，持续被动效果 | `TickBehavior` | 没有明确的"输入 → 输出"映射，只需按 tick 推进 |
| 范围搜索实体，施加效果，调用其他游戏机制 | `TickBehavior` | 这类副作用无法用配方表达，必须在 tick 里直接调用 |
| 修改需求，输出，增删条件，按玩家距离调整 | `RecipeBehavior.beforeStart` / `beforeFinish` | 这两个Hook提供 `setRequirements(...)` / `setOutputs(...)` |
| 配方存在但每 tick 的具体动作完全自定 | `RecipeBehavior.recipeTick` | 配方生命周期已经接管，能拿到当前 tick / 总 tick |
| 自定义复杂合成的节奏，多阶段，跨配方共享需求修改 | `RecipeBehavior` | 仍需要配方数据来定义行为，但每个阶段需要插入自定义回调 |

纯Tick测试机器 的 serverTick 同时涵盖了**节流、能量校验、副作用、物品 IO**，这是 tick 驱动的典型组合。

## 小结

- 行为策略层：用 [`TickBehavior`](../API/JavaAPI#tickbehavior) + `MachineBehavior.Kind.TICK` 把机器从配方数据驱动切换到 tick 驱动
- 运行时上下文：[`TickBehaviorContext`](../API/JavaAPI#tickbehaviorcontext) 在 [`MachineBehaviorContext`](../API/JavaAPI#machinebehaviorcontext) 基础上多了 `ioPlan()` 与并行 / 智能接口访问器
- IO 编程模型：[`MachineIoPlan`](../API/JavaAPI#machineioplan) 的 `addInput(...)` / `addOutput(...)` / `simulate()` / `commit()`
- 节流：`MachineBehaviorContext.isDue(period)` 降频
- 屏幕文本：[`ControllerScreenText`](../API/JavaAPI#controllerscreentext) 的 `append` / `replace` 配合 [`ControllerScreenTextScope.CONTROLLER`](../API/JavaAPI#controllerscreentextscope) 写出状态