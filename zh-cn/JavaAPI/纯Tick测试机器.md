---
title: 纯Tick测试机器
order: 14
---

# 纯Tick测试机器

这是一台不用配方、由 `serverTick` 自驱动的机器。每 40 tick 先尝试扣除 10 FE；成功后在控制器周围寻找玩家并召唤闪电，再尝试把一个铁锭转换成一个金粒。

## 涉及文件与 API

- [PURE_TICK_MACHINE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/builtin/PURE_TICK_MACHINE.java)
- [KubeJS 结构对照](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Pure_Tick_Machine.js)：其 ID 为 `mmcr_kubejs:kubejs_pure_tick_machine`，不是本页 Java ID。

| API | 用途与签名参考 |
| --- | --- |
| `Machines` / `Structures` | 声明 `MachineSpec` / `StructureSpec` |
| `RegisterMachineDefinitionsEvent` / `RegisterMachineStructuresEvent` | 定义与结构注册事件 |
| `TickHooks` / `TickContext` | [回调配置](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/TickHooks.java) / [直 Tick 上下文](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/TickContext.java) |
| `MachineContext` | [世界、位置、文本与 IO 视图](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/MachineContext.java) |
| `IoTransaction` / `IoSnapshot` | [一次性计划](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/runtime/IoTransaction.java) / [能力集合视图](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/runtime/IoSnapshot.java) |
| `Requirements` / `IoValues` / `IoDirection` | [需求工厂](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/requirement/Requirements.java) / [物品与流体 IO 值工厂](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/IoValues.java) / 输入输出方向 |
| `OutputMode` | 完整接受或部分接受输出 |
| `BlockConditions` | 方块与接口条件 |
| `ControllerTexts` / `ControllerText` / `TextScope` | [初始化注册](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/presentation/ControllerTexts.java) / [实时屏幕句柄](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/presentation/ControllerText.java) / 行作用域 |

## 机器定义与文本初始化

```java
private static final Identifier PURE_TICK_MACHINE = id("pure_tick_machine");
private static final Identifier FE_STATUS = id("fe_status");
private static final Identifier PURE_TICK_STATUS = id("pure_tick_status");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    ControllerTexts.register(PURE_TICK_MACHINE, (ControllerTextContext context) -> {
        context.screenText().append(TextScope.CONTROLLER, FE_STATUS,
                Component.literal("FE is needed!"));
        context.screenText().append(TextScope.CONTROLLER, PURE_TICK_STATUS,
                Component.literal("No Ingot input"));
    });
    if (!event.definitions().containsKey(PURE_TICK_MACHINE)) {
        MachineSpec machine = Machines.machine(PURE_TICK_MACHINE)
                .recipePool(PURE_TICK_MACHINE)
                .displayNameKey("machine.mmcr.pure_tick_machine")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:green_terracotta")))
                .allowMultithreading()
                .maxParallelism(Integer.MAX_VALUE)
                .tickBehavior(behavior -> behavior.serverTick((TickContext context) -> {
                    // 将下文 serverTick 的三段代码按顺序放入这里。
                }))
                .build();
        event.registerMachine(machine);
    }
}
```

`ControllerTexts.register` 绑定文本回调，并返回可 `unregister()` 的注册句柄。此处注册两行 `CONTROLLER` 文本，运行回调再用 `replace` 更新。注册回调的 `ControllerTextContext` 与机器 Tick 回调的 `TickContext` 是不同接口。

公共配置入口 `tickBehavior` 接收 `TickHooks` 配置；`serverTick` 的签名为 `TickHooks serverTick(Consumer<TickContext> callback)`。**不是**要求附属实现某个底层 `MachineBehavior.TickCallback`，也不是调用一个公共 `TickBehavior.Builder.build()`。

本例调用了 `allowMultithreading()` 并设置 `maxParallelism` 上限，但没有调用 `parallelizable(true)`；设置上限不等于开启并行。回调里的一次物品转换仍显式写为 1 个铁锭、1 个金粒，不会因为 `maxParallelism` 就自动变成任意数量。

## serverTick 回调

### 1. 节流与能量提交

```java
if (!context.isDue(40)) return;
IoTransaction planFe = context.ioPlan();
planFe.addInput(Requirements.energy(IoDirection.INPUT, 10));
var feSimulation = planFe.simulate();
if (!feSimulation.energySatisfied()) {
    context.screenText().replace(FE_STATUS, Component.literal("FE is needed!"));
    return;
}
if (!planFe.commit().successful()) {
    context.screenText().replace(FE_STATUS, Component.literal("FE consume error!"));
    return;
}
context.screenText().replace(FE_STATUS, Component.literal("Machine do a run!"));
```

`isDue(40)` 按游戏时间的周期对齐触发，而不是记录“距本机上次执行满 40 tick”。`simulate()` 返回 `IoSimulation`，能量满足不代表已经扣款；`commit()` 返回 `IoCommitResult`，必须检查 `successful()`。

每次 `ioPlan()` 都产生独立的一次性 `IoTransaction`。已提交计划不能继续复用；后面的物品转换要另建计划。需求由 `Requirements.energy` 构造，无需引用底层方向枚举或直接构造能量 record。

### 2. 世界副作用：玩家范围与闪电

```java
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

水平范围覆盖控制器周围 3×3 的区域，竖直范围贯穿世界高度。`setVisualOnly(false)` 表示不只是视觉闪电。

这一步发生在能量提交之后、物品提交之前：**没有铁锭或输出放不下，也不会撤销已扣的 FE 和已生成的闪电**。实体生成不参加 IO 事务，不能把整段回调看成自动回滚的“一条配方”。

### 3. 铁锭输入与金粒输出

```java
IoTransaction plan = context.ioPlan();
plan.addInput(Requirements.itemInput(IoValues.itemInput(Ingredient.of(Items.IRON_INGOT), 1)));
plan.add(Requirements.itemOutput(IoValues.itemOutput(new ItemStack(Items.GOLD_NUGGET, 1))));
var simulation = plan.simulate();
if (!simulation.inputsSatisfied()) return;
boolean outputAvailable = true;
for (var output : simulation.outputs()) {
    if (output.accepted() < output.requested()) {
        outputAvailable = false;
        break;
    }
}
if (!outputAvailable) return;
context.screenText().replace(PURE_TICK_STATUS, Component.literal("Iron Ingot inputed"));
plan.commit();
```

`IoValues.itemInput` / `itemOutput` 先构造公共 IO 值，再由 `Requirements` 转为需求。`add` 按方向路由，输出默认采用 `OutputMode.REQUIRE_FULL`；需要部分接受时显式调用 `addOutput(requirement, OutputMode.ALLOW_PARTIAL)`。

`simulation.outputs()` 的元素为 `OutputAcceptance`：`requested()` 为请求量，`accepted()` 为模拟可接受量，并非已实际输出的数量。此处只有完整放下输出才继续。

:::info
当前 builtin 的最后一行直接调用 `plan.commit()`，没有检查其结果，而且提交前已经更新屏幕。这里保留原示例顺序，不能据屏幕“已输入”文字保证实际提交成功。编写自己的机器时，应按业务需要检查结果并在成功后更新展示。
:::

## 上下文与 IO 视图签名

以下是本页用到的公共接口方法节选；类型分别来自 `publicapi.behavior`、`publicapi.runtime` 和 `publicapi.presentation`，世界类型来自 Minecraft。

```java
// TickContext extends MachineContext
int factoryThreadCount();
long parallelism();
Optional<Float> smartInterfaceValue(String name);
Map<String, Float> smartInterfaceValues();
IoTransaction ioPlan();

// MachineContext
ServerLevel level();
BlockPos controllerPos();
@Nullable Identifier machineId();
long gameTime();
boolean isDue(long period);
ControllerText screenText();
@Nullable DataStore dataStorage();
IoSnapshot ioView();
JadeText jadeText();
```

`Optional`、`Map` 来自 `java.util`，`Nullable` 来自 `org.jetbrains.annotations`；`DataStore` 来自 `publicapi.data`。这是接口签名节选，不是可直接放进 builtin 方法体的代码。`TickContext` 新增上面的五个访问器，不再暴露底层 `capabilityTickContext`。

`IoSnapshot` 是能力集合视图，其数量查询读取实时存储，名称中的 Snapshot **不代表所有数值都冻结不变**。常用查询包括 `itemAmount(Ingredient)`、`itemOutputCapacity(ItemStack)`、`energyInput()`；这些查询不替代提交校验。

## 多方块结构

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(PURE_TICK_MACHINE)) {
        StructureSpec structure = Structures.structure()
                .fullStructure(s -> s.pattern(p -> p
                        .layer("XXX", "AAA", "XXX")
                        .layer("XXX", "A A", "X X")
                        .layer("XXX", "ACA", "XXX")
                        .where('X', block(Blocks.GREEN_TERRACOTTA))
                        .where('A', any(BlockConditions.itemInput(), BlockConditions.itemOutput(),
                                BlockConditions.energyInput(), BlockConditions.parallelControllers(),
                                BlockConditions.factoryController(), block(Blocks.GREEN_WOOL)))
                        .controller('C')))
                .build(PURE_TICK_MACHINE);
        event.registerStructure(structure);
    }
}
```

## 屏幕文本作用域与刷新

| 方法 | 当前公共语义 |
| --- | --- |
| `append(scope, lineId, text)` | 同一 scope 内同 ID 更新 |
| `appendAfter(scope, lineId, afterLineId, text)` | 在同 scope 参考行之后插入；缺失或跨 scope 参考行不操作 |
| `replace(lineId, text)` | 排队替换，控制器在处理器之后刷新，当前文本快照不立即变化 |
| `remove(scope, lineId)` / `clear(scope)` | 按作用域删除 |

本例初始化行位于 `CONTROLLER`，运行时使用 `replace` 更新；并未写 JADE。`CONTROLLER` 行由调用方管理，`OPERATION` 行则随操作生命周期重置，不应把两个 scope 的同名行视为同一行。

## PURE_TICK 和 RECIPE_TICK

| 场景 | 推荐公共入口 | 原因 |
| --- | --- | --- |
| 持续被动效果、范围搜索实体、完全自定义 IO | `tickBehavior` / `TickHooks.serverTick` | 手动控制节流和一次性 IO 计划 |
| 启动前修改配方数量、时间或输出 | `recipeBehavior` / `RecipeHooks.beforeStart` | 修改当前运行的候选配方 |
| 配方运行过程中显示进度或施加效果 | `RecipeHooks.recipeTick` | 可读取 tick、并行与 IO 视图，没有编辑或取消 setter |
| 完成前调整输出 | `RecipeHooks.beforeFinish` | 输出尚未最终提交 |
| 配方模式下全局每 tick 逻辑 | `RecipeHooks.preServerTick` / `postServerTick` | 不限于正在运行配方时 |

`TickHooks` 只有 `serverTick`，公共接口本身不提供配方模式的 pre/post Hook。纯 Tick 机器没有配方注册，所有转换需求都来自回调内的 `IoTransaction`。

## 延伸阅读

- [配方Tick测试机器](./配方Tick测试机器)：配方生命周期及安全需求替换。
- [数据存储测试机器](./数据存储测试机器)：事务写入与借用句柄。
- [Java 公共 API 参考](../API/JavaAPI)。
