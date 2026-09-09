---
title: 纯Tick测试机器
order: 14
---

# 纯Tick测试机器 — 直接 tick 驱动的机器

本文是 MMCR 第二篇 Java API 示例。我们逐行拆解 [PURE_TICK_MACHINE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/builtin/PURE_TICK_MACHINE.java) 的源代码，看一台完全不用配方、按 tick 自驱动的"惩罚闪电机"是如何搭起来的。

## 概览

纯Tick测试机器 是一台不依赖配方的 tick 驱动机器：每 40 tick 尝试一次，先扣 10 FE 能量，扣成功后再寻找范围内的玩家并召唤闪电，最后如果输入总线里有铁锭，就把它转成金粒放到输出总线上。它在 MMCR 内置机器中的角色，是演示 [`TickBehavior`](../API/JavaAPI#tickbehavior) / [`MachineIoPlan`](../API/JavaAPI#machineioplan) / [`MachineIoView`](../API/JavaAPI#machineioview) 三件套最完整的范例，没有配方、没有 `MachineRecipeBuilder`，所有"配方逻辑"都被压缩到一段 `serverTick` lambda 里。

它与 [高炉](../JavaAPI/高炉) 的关键区别在于 **驱动方式**。[`MachineBehavior.Kind`](../API/JavaAPI#machinebehavior) 是 sealed 接口 `MachineBehavior` 的枚举，仅两个值：

| 常量 | 实现 | 触发方式 |
| --- | --- | --- |
| `RECIPE` | [`RecipeBehavior`](../API/JavaAPI#recipebehavior) | 由配方生命周期触发（`idleStart` / `beforeStart` / `recipeTick` / `beforeFinish` / `preServerTick` / `postServerTick`） |
| `TICK` | [`TickBehavior`](../API/JavaAPI#tickbehavior) | 每服务端 tick 一次（`serverTick`） |

`BLAST_FURNACE` 是前者，`PURE_TICK_MACHINE` 是后者：`MachineBuilder.tickBehavior(...)` 决定了它根本没有配方，也不会有配方生命周期的钩子，所有"做什么"全靠自己写。

涉及的全部 API 在 API 参考中都有独立页面：

| 用到的 API | API 参考 |
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

打开 [PURE_TICK_MACHINE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/builtin/PURE_TICK_MACHINE.java)，先把注册 ID 与控制器屏幕文本挂上：

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

[`ControllerScreenTextRegistry.register(...)`](../API/JavaAPI#controllerscreentextregistry) 把一段屏幕文本初始化逻辑挂到机器 ID 上。与 [高炉](../JavaAPI/高炉) 不同的是，**注册窗口文本是 纯Tick测试机器 必不可少的一步**，它没有配方，`OPERATION` scope 不会有 MMCR 自动写入的进度信息，所有玩家能看到的状态都必须由我们手动 `append(...)`。

接下来是机器定义本身：

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

对比 高炉：`PURE_TICK_MACHINE` 不需要并行也不需要工厂，`serverTick` 回调里没有 `parallelism()` 维度的循环。它把 `.parallelizable(true)` / `.factory(...)` 全部省掉了，只保留 `.allowMultithreading()` 与 `.maxParallelism(...)`。

关键一行 `.tickBehavior(behavior -> behavior.serverTick(context -> { ... }))` 的语义：

- `.tickBehavior(...)` 在 [`MachineBuilder`](../API/JavaAPI#machinebuilder) 中把行为从默认的 `RecipeBehavior.defaults()` 切换成 `TickBehavior`，从此该机器 `MachineBehavior.kind() == TICK`，**没有配方、不能用 `preServerTick` / `postServerTick`**，强行调用会抛 `IllegalStateException`。
- `behavior -> behavior.serverTick(...)` 是 [`TickBehavior.Builder`](../API/JavaAPI#tickbehavior) 的链式调用入口。`serverTick` 接收 [`MachineBehavior.TickCallback`](../API/JavaAPI#machinebehavior)（`void accept(TickBehaviorContext context)`）。

## `serverTick` 回调详解

整台机器的全部行为都封装在 `serverTick` 这个回调里。我们一段一段拆开看。

### 1) 节流：`isDue(40)`

```java
if (!context.isDue(40)) return;
```

[`MachineBehaviorContext.isDue(long)`](../API/JavaAPI#machinebehaviorcontext) 返回当前 tick 是否对齐到 `period` 的整数倍，等价于 `(gameTime() % period) == 0`。纯Tick测试机器 用它把"实际逻辑"降频到 1 次 / 2 秒，剩下的 tick 直接 `return`。

### 2) 扣能量：`MachineIoPlan.addInput(...)` + `simulate()` + `commit()`

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

[`TickBehaviorContext.ioPlan()`](../API/JavaAPI#tickbehaviorcontext) 返回一个全新的 [`MachineIoPlan`](../API/JavaAPI#machineioplan)。这台机器之所以把 FE 单独走一遍 `MachineIoPlan`：

- `simulate()` 返回 `Simulation`，其中 `energySatisfied()` 告诉调用者能量总线是否真的够 10 FE；
- `commit()` 才把消耗真正落地，`simulate()` 不会改动物品 / 能量，只读。

[`EnergyRequirement`](../API/JavaAPI#energyrequirement) 是不可变记录（`RecipeIo io, long fePerTick`）。这里的 `RecipeModifier.IOType.INPUT` 是 MMCR 内部修饰符系统沿用下来的方向枚举，其语义和 [`RecipeIo.INPUT`](../API/JavaAPI#recipeio) 完全相同。

:::warning 注意
`ioPlan()` 每次返回**新**的 `MachineIoPlan`，两次调用之间的状态不共享。下面步骤还要重新 `context.ioPlan()` 才能加物品。
:::

### 3) 范围搜玩家 → 召唤闪电

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

这一步演示了 `TickBehavior` 的关键灵活性：**tick 回调里能做任何想做的事**，不限于读写物品 / 能量，也能操作实体、写 NBT、发包。配方机器的 `recipeTick` 也能做类似的事，但因为同时受配方生命周期约束，写法会更受限。

### 4) 物品输入输出：`MachineIoPlan` 二次使用

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

[`MachineIoPlan.add(...)`](../API/JavaAPI#machineioplan) 根据 `requirement.io()` 自动路由到 `addInput(...)` 或 `addOutput(..., REQUIRE_FULL)`。这里没直接用 `add(...)`，而是分别调用 `addInput(...)` 与 `add(...)`，原因有二：

- 输入端 `Ingredient.of(Items.IRON_INGOT), 1` 显式声明消耗 1 个铁锭；
- 输出端用 `add(...)` 走"省略 policy，等价于 `REQUIRE_FULL`"分支，把"必须能完整放入"的语义写明。

`Simulation.outputs()` 返回每条输出项的模拟结果，每项有 `accepted()`（实际能放入多少）与 `requested()`（期望放入多少）。这里强制要求**全部输出能放下**，否则 `return`，这是 纯Tick测试机器 的设计选择：要么完整产出 1 颗金粒，要么这次 tick 什么都不做。如果换成 `addOutput(..., OutputPolicy.ALLOW_PARTIAL)`，即便金粒只能放下半颗也会 `commit` 成功。

[`ItemRequirement`](../API/JavaAPI#itemrequirement) 在输入 / 输出方向上语义对称：

| 字段 | `INPUT` | `OUTPUT` |
| --- | --- | --- |
| `io` | `RecipeModifier.IOType.INPUT` | `RecipeModifier.IOType.OUTPUT` |
| `ingredient` | `Ingredient.of(...)` | `null` |
| `count` | ≥ 1 | 任意（通常 0） |
| `stack` | `ItemStack.EMPTY` | 实际输出栈 |
| `chance` / `tags` / `components` / `consumeChance` | 可选 | 可选 |

### 完整回调签名

把上述代码的"类型边界"提取出来：

```java
// 签名（来自 MachineBehavior.TickCallback）
void accept(TickBehaviorContext context);

// TickBehaviorContext 提供的关键访问器（继承自 MachineBehaviorContext）
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

纯Tick测试机器 的结构和 [高炉](../JavaAPI/高炉) 的 3×3×3 外壳几乎一致，区别仅在于没有熔炉炉心：

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

`where('X', block(Blocks.GREEN_TERRACOTTA))` 外壳统一是绿色陶瓦；`where('A', any(...))` A 位置允许多种接口（包括 `factoryController()`，虽然机器本身没有 `.factory(...)`，但仍能在结构上预留位置）；`.controller('C')` 顶层中心是控制器。

## 配方

纯Tick测试机器 **没有配方**：`MachineRecipeBuilder` 与 `MachineRecipe` 在本类里完全不会出现。所有"配方逻辑"都被压缩到 `serverTick` 内的 [`MachineIoPlan`](../API/JavaAPI#machineioplan) 调用里。

如果想给一台 `TickBehavior` 机器加"配方"，唯一的办法是：

1. 在 `serverTick` 里手动 `simulate()` 校验输入是否齐；
2. 用 `commit()` 真正消耗并产出。

这与 `RecipeBehavior` 的"配方数据驱动"完全相反：后者只需在 `MachineRecipeBuilder` 声明输入 / 输出 / duration，MMCR 会自动调度所有生命周期。

## 特殊机制：TickBehavior 详解

### `TickBehavior.Builder` 与 `TickBehaviorContext`

`TickBehavior.Builder` 只有两个方法：`serverTick(...)` 设置回调，`build()` 终结构建。比起 [`RecipeBehavior.Builder`](../API/JavaAPI#recipebehavior) 的 7 个钩子，`TickBehavior.Builder` 简单得多，这也是为什么 tick 驱动的机器写起来最自由、也最考验写代码的人对输入 / 输出时机的把握。

`TickBehaviorContext` **继承** `MachineBehaviorContext`，新增 6 个字段（`factoryThreadCount()`、`parallelism()`、`smartInterfaceValue(...)`、`smartInterfaceValues()`、`ioPlan()`、`capabilityTickContext(...)`）。其中 `ioPlan()` 是 tick 驱动机器最常用的方法——它是所有"模拟输入 / 输出 / 能量 / commit"的入口。`MachineBehaviorContext` 已经能让你读 `level()` / `controllerPos()` / `screenText()` 等，这一部分在 `TickBehaviorContext` 里继承可见。`MachineIoView` 是只读视图（见 [`MachineIoView`](../API/JavaAPI#machineioview)），`ioView().itemAmount(Ingredient)` / `itemOutputCapacity(ItemStack)` 是常用查询。

### 屏幕文本：`replace(...)` vs `append(...)`

[`ControllerScreenText`](../API/JavaAPI#controllerscreentext) 暴露 `append` / `appendAfter` / `remove` / `clear` / `replace`。纯Tick测试机器 在 `ControllerScreenTextRegistry.register(...)` 时用 `append(...)` 写初始两行；之后在 `serverTick` 里改写时用 `replace(lineId, text)`。两者关键区别：

| 方法 | 是否要 scope | 行为 |
| --- | --- | --- |
| `append(scope, lineId, text)` | 是 | 同 scope 内相同 `lineId` 会被替换，但其他 scope 不受影响 |
| `replace(lineId, text)` | 否 | 跨 scope 替换同 ID 的行（默认实现为空） |

之所以 `replace(...)` 更顺手，是因为 `FE_STATUS` 与 `PURE_TICK_STATUS` 这两个 lineId 在改写时不需要再考虑它们属于 `CONTROLLER` 还是 `OPERATION`。

### 回调里的异常处理

`serverTick` 抛出的异常会被 MMCR 捕获并记录，机器进入失败状态。这是与 `RecipeBehavior` 的 `recipeTick` 共用的策略：不要在回调里抛异常来控制流程，改用 `simulate()` / `commit()` 的返回值判断 IO 是否成功。

## 与 高炉 的对比

| 维度 | [高炉](../JavaAPI/高炉) | 纯Tick测试机器 |
| --- | --- | --- |
| 行为实现 | `RecipeBehavior`（默认） | `TickBehavior` |
| `MachineBehavior.Kind` | `RECIPE` | `TICK` |
| 配方 | `MachineRecipeBuilder` 声明 1 条 | 无 |
| 触发回调 | 配方生命周期钩子 | 每 tick `serverTick` |
| 多线程 | `allowMultithreading()` + `.factory(...)` | 只用 `allowMultithreading()` |
| IO 入口 | 配方字段 | `MachineIoPlan.addInput(...)` / `addOutput(...)` |
| 节流 | `RecipeBehavior.preServerTick` | `MachineBehaviorContext.isDue(...)` |
| 屏幕文本来源 | `OPERATION` scope（MMCR 自动写）+ `CONTROLLER` scope（手写） | 全靠 `CONTROLLER` scope + 手写 |

**高炉 是"数据驱动"路线**，把配方写完，剩下的让 MMCR 自己跑；**纯Tick测试机器 是"代码驱动"路线**，把每 tick 的逻辑写进 lambda 里。后者灵活度更高，能做配方机器做不了的事（范围搜实体、自定义定时逻辑），但代价是必须自己处理所有边界（节流、能量校验、输出容量校验）。

## 何时用 PURE_TICK vs RECIPE_TICK

| 场景 | 推荐 | 原因 |
| --- | --- | --- |
| 发电机、反应堆、流水线（持续被动效果） | `TickBehavior` | 没有明确的"输入 → 输出"映射，只需按 tick 推进 |
| 范围搜索实体、施加效果、调用其他游戏机制 | `TickBehavior` | 这类副作用无法用配方表达，必须在 tick 里直接调用 |
| 修改需求 / 输出（增删条件、按玩家距离调整） | `RecipeBehavior.beforeStart` / `beforeFinish` | 这两个钩子提供 `setRequirements(...)` / `setOutputs(...)` |
| 配方存在但每 tick 的具体动作完全自定 | `RecipeBehavior.recipeTick` | 配方生命周期已经接管，能拿到当前 tick / 总 tick |
| 自定义复杂合成的节奏（多阶段、跨配方共享需求修改） | `RecipeBehavior` | 仍需要配方数据来定义"做什么"，但每个阶段需要插入自定义回调 |

纯Tick测试机器 的 serverTick 同时涵盖了**节流、能量校验、副作用（闪电）、物品 IO**，这是 tick 驱动的典型组合。[配方Tick测试机器](../JavaAPI/配方Tick测试机器) 则是另一条路线：有配方，但每个生命周期阶段都要插入自定义逻辑。

## 小结

纯Tick测试机器 把"一台不用配方的机器"完整演示了一遍：

- 行为策略层：用 [`TickBehavior`](../API/JavaAPI#tickbehavior) + `MachineBehavior.Kind.TICK` 把机器从配方数据驱动切换到 tick 驱动；
- 运行时上下文：[`TickBehaviorContext`](../API/JavaAPI#tickbehaviorcontext) 在 [`MachineBehaviorContext`](../API/JavaAPI#machinebehaviorcontext) 基础上多了 `ioPlan()` 与并行 / 智能接口访问器；
- IO 编程模型：[`MachineIoPlan`](../API/JavaAPI#machineioplan) 的 `addInput(...)` / `addOutput(...)` / `simulate()` / `commit()` 三件套；
- 节流：`MachineBehaviorContext.isDue(period)` 把"每 tick 跑一次"降频到任意周期；
- 屏幕文本：[`ControllerScreenText`](../API/JavaAPI#controllerscreentext) 的 `append` / `replace` 配合 [`ControllerScreenTextScope.CONTROLLER`](../API/JavaAPI#controllerscreentextscope) 写出"状态卡片"。

接下来可以阅读 [配方Tick测试机器](../JavaAPI/配方Tick测试机器) 看"配方 + 自定义 tick 钩子"的写法。或者去 [API 参考](../API/开始) 浏览 [`RecipeBehavior`](../API/JavaAPI#recipebehavior) / [`RecipeStartContext`](../API/JavaAPI#recipestartcontext) 等其他行为 API。

KubeJS 端的对应教程：[纯Tick机器示例](../KubeJS/纯Tick机器示例)。