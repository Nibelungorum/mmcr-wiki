---
title: PURPUR_FURNACE
order: 5
---

# PURPUR_FURNACE — 紫珀炉

本文是 MMCR 第二个 Java API 示例。我们拆解 [PURPUR_FURNACE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/builtin/PURPUR_FURNACE.java)，看看一台使用 **智能接口**（Smart Interface）作为运行时调节器的紫珀炉是如何把"工作模式"与"对话进度"映射到配方能量消耗与耗时上的。

## 概览

紫珀炉（PURPUR_FURNACE）是一台**靠智能接口动态调参**的炼炉。机器本体的样子（多阶段楼梯/砖块的拼搭）是次要的——它的核心特征是把两个 `SmartInterfaceType` 注册到机器上，再为这两个类型各挂两个 `SmartInterfaceModifier`，让玩家在控制器界面里调节 `mode`（模式 1–3）与 `conversation`（对话进度 0–1），运行时分别映射到 `energy` 与 `duration` 上。

为什么选它做示例：

- 演示 [`SmartInterfaceType`](../API/JavaAPI#smartinterfacetype) 与 [`SmartInterfaceModifier`](../API/JavaAPI#smartinterfacemodifier) 在机器上的注册；
- 演示配方侧的 [`SmartInterfaceRequirement`](../API/JavaAPI#smartinterfacerequirement)：同一台机器跑三条不同 `mode` 的配方家族；
- 演示**大型状态敏感结构**：32 个字符绑定 28 种不同方块状态（楼梯朝向、半砖形态）；
- 演示 [`appearance`](../API/JavaAPI#appearancespec)、[`runningSound` / `finishSound`](../API/JavaAPI#machinebuilder) 等"机器外观与音效"配置。

涉及的全部 API：

| 用到的 API | API 参考 |
| --- | --- |
| `MachineBuilder` | [链接](../API/JavaAPI#machinebuilder) |
| `MMCRMachineDefinationsEvent` | [链接](../API/JavaAPI#mmcrmachinedefinationsevent) |
| `MMCRMachineStructuresEvent` | [链接](../API/JavaAPI#mmcrmachinestructuresevent) |
| `MMCRMachineRecipesEvent` | [链接](../API/JavaAPI#mmcrmachinerecipesevent) |
| `MachineStructureBuilder` | [链接](../API/JavaAPI#machinestructurebuilder) |
| `PatternBuilder` | [链接](../API/JavaAPI#patternbuilder) |
| `BlockPredicate` | [链接](../API/JavaAPI#blockpredicate) |
| `InterfacePredicates` | [链接](../API/JavaAPI#interfacepredicates) |
| `SmartInterfaceType` | [链接](../API/JavaAPI#smartinterfacetype) |
| `SmartInterfaceModifier` | [链接](../API/JavaAPI#smartinterfacemodifier) |
| `MachineRecipeBuilder` | [链接](../API/JavaAPI#machinerecipebuilder) |
| `SmartInterfaceRequirement` | [链接](../API/JavaAPI#smartinterfacerequirement) |
| `RecipeModifier` | [链接](../API/JavaAPI#recipemodifier) |

## 机器定义

打开源文件，第一段是 `registerDefinitions(...)`：

```java
private static final Identifier PURPUR_FURNACE = id("purpur_furnace");

public static void registerDefinitions(MMCRMachineDefinationsEvent event) {
    if (!event.definitions().containsKey(PURPUR_FURNACE)) {
        var machine = MachineBuilder
                .machine(PURPUR_FURNACE)
                .displayNameKey("machine.mmcr.purpur_furnace")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("end_stone_bricks")))
                .maxParallelism(32).parallelizable(true)
                .smartInterface(new SmartInterfaceType("mode", 1F, 3F, 1, SmartInterfaceType.ValueType.INTEGER))
                .smartInterface(new SmartInterfaceType("conversation", 0F, 1F, 0))
                .smartInterfaceModifier(SmartInterfaceModifier.energy("mode", 1F, 2F, 1F, 2F, RecipeModifier.Operation.MULTIPLY))
                .smartInterfaceModifier(SmartInterfaceModifier.energy("mode", 2F, 3F, 2F, 4F, RecipeModifier.Operation.MULTIPLY))
                .smartInterfaceModifier(SmartInterfaceModifier.duration("conversation", 0F, .5F, 1F, 1.5F, RecipeModifier.Operation.MULTIPLY))
                .smartInterfaceModifier(SmartInterfaceModifier.duration("conversation", .5F, 1F, 1.5F, 2.5F, RecipeModifier.Operation.MULTIPLY))
                .runningSound(Identifier.parse("minecraft:block.furnace.fire_crackle"))
                .finishSound(Identifier.parse("minecraft:entity.ender_dragon.growl"))
                .build();
        event.registerMachine(machine);
    }
}
```

逐项拆解：

- `appearance(a -> a.machineBasicBlock(...))`：指定紫珀炉的"机器基础方块"。成型后玩家看到的就是 `end_stone_bricks` 主题色，详见 [`AppearanceSpec`](../API/JavaAPI#appearancespec)。
- `maxParallelism(32).parallelizable(true)`：紫珀炉允许并行，并行上限 32。这意味着同一份配方可以同时跑多份，前提是结构里有并行控制器。
- `.smartInterface(new SmartInterfaceType("mode", 1F, 3F, 1, SmartInterfaceType.ValueType.INTEGER))`：注册一个名为 `mode` 的智能接口值，范围 1–3、优先级 1、值类型 `INTEGER`。`INTEGER` 要求默认/最小/最大值都是整数（这里都是 1/3）。
- `.smartInterface(new SmartInterfaceType("conversation", 0F, 1F, 0))`：注册一个名为 `conversation` 的智能接口值，范围 0–1、优先级 0、值类型默认 `FLOAT`。这是"对话进度"——0 表示还没开始聊，1 表示完全说服 NPC。
- 四条 `.smartInterfaceModifier(...)`：把上述两个值映射到配方修饰符上：

  ```text
  mode ∈ [1, 2] → energy 乘数从 1x 渐变到 2x
  mode ∈ [2, 3] → energy 乘数从 2x 渐变到 4x
  conversation ∈ [0, 0.5] → duration 乘数从 1x 渐变到 1.5x（减速）
  conversation ∈ [0.5, 1] → duration 乘数从 1.5x 渐变到 2.5x（更慢）
  ```

  [`SmartInterfaceModifier.energy(...)`](../API/JavaAPI#smartinterfacemodifier) 与 `duration(...)` 是静态工厂方法，分别等价为 `target = "energy"` 与 `target = "duration"` 的修饰符。多条修饰符作用于同一个接口类型时，运行时按"输入值落在哪一段区间"取该段映射。

- `runningSound(...)` / `finishSound(...)`：运行中播放熔炉劈啪声、完成时播放末影龙咆哮。两者都是普通 `Identifier`；运行时音效与配方结束音效独立播放。

> **关于智能接口的"这是什么、为什么用"**：智能接口（Smart Interface）是 MMCR 在控制器方块上提供的"运行时调节器"。机器本身只声明`值类型`与`映射规则`，玩家在控制器屏幕里设置的值通过 `MachineIoView.smartInterfaceValue(name)` 在配方执行时实时生效。`mode=1` 与 `mode=3` 对应完全不同的配方家族（见下文），但能量消耗是连续渐变的；`conversation` 则把同一份配方在不同时长上做线性插值。

`build()` 把上述属性打包为 [`MachineDefinition`](../API/JavaAPI#machinedefinition)，`event.registerMachine(machine)` 提交到注册窗口。

## 多方块结构

紫珀炉的结构是一个 **7×8×8 的多方块**，外壳由 `end_stone_bricks` 楼梯/半砖/完整方块拼搭而成，内部有紫珀柱、紫珀块、紫色陶瓦作为炉壁。结构中没有"普通接口端口位"——端口位置 (`H`) 直接被允许放物品/能量端口。

```java
@SubscribeEvent
public static void registerStructures(MMCRMachineStructuresEvent event) {
    if (!event.structures().containsKey(PURPUR_FURNACE)) {
        var structure = MachineStructureBuilder
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer(" ABBBD ", "       ", "       ", "       ", "  EEE  ", "       ", "       ", "       ")
                                .layer("AFXXXGD", "  HHH  ", "  III  ", "  JJJ  ", " EHHHE ", " KLLLM ", "       ", "       ")
                                ...
                                .where('X', block("minecraft:end_stone_bricks"))
                                .where('A', state("minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]"))
                                ...
                                .where('H', any(
                                        block("minecraft:purpur_pillar"),
                                        InterfacePredicates.anyOfItemInput(),
                                        InterfacePredicates.anyOfItemOutput(),
                                        InterfacePredicates.anyOfEnergyInput(),
                                        InterfacePredicates.parallelControllers(),
                                        InterfacePredicates.smartInterface()
                                ))
                                ...
                                .controller('C')
                        )
                )
                .build(PURPUR_FURNACE);
        event.registerStructure(structure);
    }
}
```

几个值得专门说明的点：

- **`state(...)` 谓词**：楼梯方块朝向（`facing`）、半砖形态（`shape=straight / outer_left / outer_right / inner_left / inner_right`）都有精确要求。这意味着玩家搭结构时必须把楼梯摆对朝向，否则结构校验失败。MMCR 提供 [`BlockPredicate.state(...)`](../API/JavaAPI#blockpredicate) 进行精确匹配。
- **端口位置 `H` 是多选并集**：`H` 既是装饰用的紫珀柱，又允许放 `anyOfItemInput` / `anyOfItemOutput` / `anyOfEnergyInput` / `parallelControllers` / `smartInterface`。也就是说，搭建者可以在任意 `H` 位置选择放紫珀柱作为装饰，或放一个物品端口作为输入，或者放并行控制器提高并行度。
- **`InterfacePredicates.smartInterface()`**：[`InterfacePredicates`](../API/JavaAPI#interfacepredicates) 提供了与 `smartInterface(...)` 配对的方块谓词。这个谓词匹配"作为智能接口容器"的方块，玩家在结构里的某个 `H` 位置放上智能接口方块后，运行时就能在控制器屏幕调节该接口值。
- **`controller('C')`**：控制器字符 `C` 在 layer 的中部，匹配 `end_stone_brick_stairs[facing=south,...]` 中那一格。控制器必须是楼梯而不是完整方块——这是结构定义阶段就锁死的。

> **关于"为什么整面墙都要列出朝向"**：MMCR 的结构匹配是**精确状态匹配**。一旦 `.where('A', state("...outer_left"))`，玩家搭的是 `outer_right` 就**不匹配**——MMCR 不会容忍朝向差异。这给了机器设计师完全的视觉控制权，但代价是结构定义文件很长。PURPUR_FURNACE 共有 28 个 `state(...)` 谓词，覆盖楼梯的 8 个朝向 × 5 种半砖形态。

## 配方

紫珀炉注册了三条配方，覆盖 `mode=1/2/3`：

```java
@SubscribeEvent
public static void register(MMCRMachineRecipesEvent event) {
    var recipe = MachineRecipeBuilder
            .recipe(PURPUR_FURNACE.withSuffix("_recipe_1"),PURPUR_FURNACE)
            .inputItem(Ingredient.of(Items.IRON_INGOT),1)
            .outputItem(Items.IRON_NUGGET,10)
            .inputEnergy(20)
            .smartInterface(input("mode",1))
            .duration(200)
            .build();
    event.registerRecipe(recipe);

    recipe = MachineRecipeBuilder
            .recipe(PURPUR_FURNACE.withSuffix("_recipe_2"),PURPUR_FURNACE)
            .inputItem(Ingredient.of(Items.IRON_INGOT),1)
            .outputItem(Items.GOLD_NUGGET,10)
            .inputEnergy(20)
            .smartInterface(input("mode",2))
            .duration(200)
            .build();
    event.registerRecipe(recipe);

    recipe = MachineRecipeBuilder
            .recipe(PURPUR_FURNACE.withSuffix("_recipe_3"),PURPUR_FURNACE)
            .inputItem(Ingredient.of(Items.APPLE),1)
            .outputItem(Items.DIAMOND,2)
            .inputEnergy(40)
            .smartInterface(input("mode",3))
            .smartInterface(input("conversation",0f,0.31f))
            .duration(200)
            .build();
    event.registerRecipe(recipe);
}
```

每条配方的关键方法：

- `.smartInterface(input("mode", 1))`：声明此配方仅当 `mode = 1` 时匹配。`SmartInterfaceRequirement.input(type, value)` 是 [`SmartInterfaceRequirement`](../API/JavaAPI#smartinterfacerequirement) 的单点静态工厂，等价于 `min == max == value`。
- `.smartInterface(input("conversation", 0f, 0.31f))`：第三号配方还要求 `conversation ∈ [0, 0.31]`。即"对话进度低于 31%"才会做苹果→钻石这种离谱配方；对话进度一旦超过 31%，该配方就不再匹配。

> **关于"配方家族"**：三条配方都注册到 `PURPUR_FURNACE` 这台机器上，但用 `mode` 把它们**分开**：运行时紫珀炉查询机器的 `mode`，然后只匹配 `mode = 当前值` 的那条配方。这就是 MMCR 中"一台机器 = 一个配方家族"的典型写法——通过智能接口把同机器下的配方分成若干互相独立的家族。

注意源码注释：

```java
// recipe has multiple id use, do not use event.recipes().containsKey(BLAST_FURNACE)
```

这是给后续维护者的提醒：配方事件里没有"同一机器已注册"的判断（一个机器可以有多个配方），只看配方 ID 是否重复——所以 `event.recipes().containsKey(BLAST_FURNACE)` 这种判断是错的。判断重复只能看 `PURPUR_FURNACE.withSuffix("_recipe_1")` 这种带后缀的 ID 是否已存在。

## 智能接口的整体行为

把机器定义和配方放在一起看，运行时流程是：

1. 玩家在控制器屏幕里调节 `mode`（1–3）与 `conversation`（0–1）。
2. MMCR 查询机器上注册的所有配方，按 `SmartInterfaceRequirement` 过滤；只剩当前 `mode` 对应的那一条家族。
3. 同一条家族里如果有多条配方（比如 recipe_3 还要求 `conversation ∈ [0, 0.31]`），继续按其它接口值过滤。
4. 选中配方后，按机器上注册的 [`SmartInterfaceModifier`](../API/JavaAPI#smartinterfacemodifier) 应用能量 / 时长修正：
   - `mode = 1` → `energy *= 1x`；`mode = 3` → `energy *= 4x`（阶梯式）；
   - `conversation = 0` → `duration *= 1x`；`conversation = 1` → `duration *= 2.5x`（线性）。

机器端只声明"接口类型 + 映射规则"，**每条配方都重新声明自己的接口值需求**。同一接口类型上的多条 `SmartInterfaceModifier` 是分段映射，落在哪个区间就用哪条；这与 `RecipeModifier` 的全局乘数叠加不一样。

## 与 BLAST_FURNACE 的对比

| 维度 | BLAST_FURNACE | PURPUR_FURNACE |
| --- | --- | --- |
| 智能接口 | 无 | 2 个类型 + 4 条修饰符 |
| 配方数 | 1 条 | 3 条，按 `mode` 分家族 |
| 并行 | `Integer.MAX_VALUE` + 多线程工厂 | `32`（仅并行，不开多线程） |
| 音效 | 无 | `runningSound` + `finishSound` |
| 结构字符数 | 7 个字符 | 28 个字符（几乎全是 `state(...)`） |
| 机器外观 | 默认 | `machineBasicBlock("end_stone_bricks")` |

BLAST_FURNACE 是"并行 + 多线程工厂"的演示；PURPUR_FURNACE 是"运行时调参 + 多配方家族"的演示。两者正好互补：前者关注"如何让机器更快地跑同一份配方"，后者关注"如何让玩家动态切换配方类型与参数"。

## 延伸阅读

- [BLAST_FURNACE](BLAST_FURNACE) — 并行 + 多线程的对照案例。
- [`MachineBuilder`](../API/JavaAPI#machinebuilder) — `smartInterface` / `smartInterfaceModifier` 的完整签名与约束。
- [`SmartInterfaceType`](../API/JavaAPI#smartinterfacetype) — 值类型与构造约束。
- [`SmartInterfaceModifier`](../API/JavaAPI#smartinterfacemodifier) — `energy` / `duration` 便捷静态方法。
- [`SmartInterfaceRequirement`](../API/JavaAPI#smartinterfacerequirement) — 配方侧的接口需求。
- [MachineBuilder](../KubeJS/A_Simple_Machine) — KubeJS 端如何注册同一台紫珀炉（`smartInterface(...)` 与 `smartInterfaceModifier(...)` 的脚本对应）。
