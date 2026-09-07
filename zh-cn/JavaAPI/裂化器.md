---
title: CRACKER
order: 3
---

# CRACKER — 裂解机

本文拆解 [CRACKER.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/builtin/CRACKER.java)。裂解机是一台 4 层高的多方块机器，它在 MMCR 内置示例中专门演示**自定义控制器（ControllerSpec）**和**流体输出（FluidOutput）**。与高炉的"配方同时跑多份"不同，裂解机的设计目标是：在结构中加入 4 层精细的方块约束、给控制器声明独立的注册 ID 与朝向、并让配方同时产出物品和流体。

## 概览

裂解机把 8 个青金石与 1 个煤炭"裂解"成 500 mB 水与 2 个钻石——这一类"高温高压"的配方语义被映射到多层多方块：外层是磨制闪长岩壳、内层是磨制安山岩芯，再叠蓝冰与青金石块作为隔热层与催化层。它的代码演示三件事：

- 自定义 [`ControllerSpec`](../API/JavaAPI#controllerspec)（注册 ID、允许竖直朝向、完全旋转对称）。
- 多层 [`StructureStage`](../API/JavaAPI#structurestage) 的结构匹配，每个 `layer(...)` 的字符严格对齐。
- [`MachineRecipeBuilder.inputFluid(...)` / `outputFluid(...)`](../API/JavaAPI#machinerecipebuilder) 同时声明流体输入 / 输出。

涉及的全部 API：

| 用到的 API | API 参考 |
| --- | --- |
| `MachineDefinitionProvider` | [链接](../API/JavaAPI#machinedefinitionprovider) |
| `MMCRMachineDefinationsEvent` | [链接](../API/JavaAPI#mmcrmachinedefinationsevent) |
| `MMCRMachineStructuresEvent` | [链接](../API/JavaAPI#mmcrmachinestructuresevent) |
| `MMCRMachineRecipesEvent` | [链接](../API/JavaAPI#mmcrmachinerecipesevent) |
| `MachineBuilder` | [链接](../API/JavaAPI#machinebuilder) |
| `ControllerSpec` | [链接](../API/JavaAPI#controllerspec) |
| `MachineStructureBuilder` | [链接](../API/JavaAPI#machinestructurebuilder) |
| `StructureStage` | [链接](../API/JavaAPI#structurestage) |
| `PatternBuilder` | [链接](../API/JavaAPI#patternbuilder) |
| `MachineRecipeBuilder` | [链接](../API/JavaAPI#machinerecipebuilder) |
| `BlockPredicate` | [链接](../API/JavaAPI#blockpredicate) |
| `InterfacePredicates` | [链接](../API/JavaAPI#interfacepredicates) |
| `PortTiers` | [链接](../API/JavaAPI#porttiers) |

## 机器定义

裂解机在机器定义阶段的核心是 `.controller(builder -> ...)`，其余属性保持默认：

```java
public static void registerDefinitions(MMCRMachineDefinationsEvent event) {
    if (!event.definitions().containsKey(CRACKER)) {
        var machine = MachineBuilder
                .machine(CRACKER)
                .displayNameKey("machine.mmcr.cracker")
                .controller(builder -> builder
                        .id(CRACKER.withSuffix("_controller"))
                        .allowVerticalFacing(true)
                        .fullyRotationallySymmetric(true)
                )
                .build();
        event.registerMachine(machine);
    }
}
```

链式调用里值得展开的三件事：

- **`.id(CRACKER.withSuffix("_controller"))`**：把控制器方块的注册 ID 显式声明为 `mmcr:cracker_controller`。`withSuffix(...)` 是 MMCR 内置的 `Identifier` 扩展，等价于 `Identifier.fromNamespaceAndPath("mmcr", "cracker_controller")`——保持命名空间一致。详见 [`ControllerSpec.Builder.id(...)`](../API/JavaAPI#controllerspec)。
- **`.allowVerticalFacing(true)`**：玩家可以把控制器方块放置为竖直朝向（顶面 / 底面朝向）。MMCR 默认控制器只接受水平朝向；多层结构（如本例 4 层高）通常需要竖直放置。详见 [`ControllerSpec.Builder.allowVerticalFacing(...)`](../API/JavaAPI#controllerspec)。
- **`.fullyRotationallySymmetric(true)`**：开启"完全旋转对称"——MMCR 在放置控制器时不区分方向，所有 6 个面共享同一纹理。配合 `allowVerticalFacing(true)` 使用时，水平放置和竖直放置都不需要区分朝向。详见 [`ControllerSpec.Builder.fullyRotationallySymmetric(...)`](../API/JavaAPI#controllerspec)。

`build()` 返回 [`MachineDefinition`](../API/JavaAPI#machinedefinition)；`event.registerMachine(...)` 把它提交到启动期注册窗口。

> 💡 为什么不用 `MachineBuilder.appearance(...)`？合金炉与高炉用 `.appearance(...)` 声明"未成型外观方块"——但裂解机没启用外观定制，所有外观纹理走 MMCR 默认回退。如果你只关心"控制器朝向"，可以省略 `.appearance(...)`，只配置 `.controller(...)`。

## 多方块结构

裂解机的结构是 4 层 × 3 × 3，比前两台示例机器更高：

```java
@SubscribeEvent
public static void registerStructures(MMCRMachineStructuresEvent event) {
    if (!event.structures().containsKey(CRACKER)) {
        var structure = MachineStructureBuilder
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("AAA", "AAA", "AAA")
                                .layer("XBX", "B B", "XBX")
                                .layer("XDX", "D D", "XDX")
                                .layer("XEX", "ECE", "XEX")
                                .where('X', block(Blocks.POLISHED_DIORITE))
                                .where('A', block(Blocks.POLISHED_ANDESITE))
                                .where('B', any(
                                        InterfacePredicates.anyItemInput(),
                                        InterfacePredicates.anyItemOutput(),
                                        InterfacePredicates.anyFluidOutput(),
                                        InterfacePredicates.anyEnergyInput(),
                                        block(Blocks.BONE_BLOCK)
                                ))
                                .where('D', block(Blocks.BLUE_ICE))
                                .where('E', block(Blocks.LAPIS_BLOCK))
                                .controller('C')
                        )
                        .portTiers(t -> t
                                .minEnergyInput(PortTiers.EnergyTier.NORMAL)
                                .minItemInput(PortTiers.ItemTier.NORMAL)
                                .anyItemOutput()
                        )
                )
                .build(CRACKER);
        event.registerStructure(structure);
    }
}
```

### 4 层结构

逐 `layer(...)` 拆解：

- `layer("AAA", "AAA", "AAA")` — `y = 0, 1, 2`。最上面三行全部是 `A`（磨制安山岩），代表机器的"顶盖"。这一层没有任何接口位 / 控制器位。
- `layer("XBX", "B B", "XBX")` — 中上层。四周是 `X`（磨制闪长岩），四角内侧有 `B`（接口位），中间行的左右有空格（"不校验"，给玩家预留内部挖空）。
- `layer("XDX", "D D", "XDX")` — 中下层。四周 `X`，四角内侧 `D`（蓝冰——隔热层）。
- `layer("XEX", "ECE", "XEX")` — 最下层。四周 `X`，四角内侧 `E`（青金石块——催化层），中心 `C`（控制器）。

每个字符绑定一个 [`BlockPredicate`](../API/JavaAPI#blockpredicate)：

- `.where('X', block(Blocks.POLISHED_DIORITE))` — 外壳是磨制闪长岩。
- `.where('A', block(Blocks.POLISHED_ANDESITE))` — 顶层是磨制安山岩。
- `.where('B', any(...))` — **这是本例最重要的写法**：B 位置同时接受任意物品输入 / 物品输出 / 流体输出 / 能量输入，**或**骨块。多个 `InterfacePredicates` 与 `block(...)` 用 [`BlockPredicate.any(...)`](../API/JavaAPI#blockpredicate) 串成并集，玩家既可以放端口也可以放装饰性的骨块。详见 [`InterfacePredicates`](../API/JavaAPI#interfacepredicates)。
- `.where('D', block(Blocks.BLUE_ICE))` — 蓝冰层（隔热）。
- `.where('E', block(Blocks.LAPIS_BLOCK))` — 青金石块层（催化）。
- `.controller('C')` — 控制器位于最下层中心。

### 端口等级

```java
.portTiers(t -> t
        .minEnergyInput(PortTiers.EnergyTier.NORMAL)
        .minItemInput(PortTiers.ItemTier.NORMAL)
        .anyItemOutput())
```

声明机器对端口的最低等级要求：

- 能量输入至少 `NORMAL`（中等能量端口）。
- 物品输入至少 `NORMAL`（中等物品输入端口）。
- 物品输出任意。

`PortTiers` 的等级枚举从低到高是 `TINY → SMALL → NORMAL → REINFORCED → BIG → HUGE → LUDICROUS`（流体额外有 `VACUUM`，能量额外有 `ULTIMATE`）。详见 [`PortTiers`](../API/JavaAPI#porttiers)。

> 💡 端口等级不参与结构匹配——玩家仍可以放低级端口，但机器无法正常运行。这是一种"提醒玩家用对的端口"的声明，而不是硬性约束。

### 多层结构的字符对齐

`PatternBuilder` 要求同一 `layer(...)` 调用内各行宽度一致，不同 `layer(...)` 调用之间宽度与行数也必须一致。裂解机的 4 层全部是 3×3，行数（每层 3 行）、宽度（每行 3 字符）都一致——这是机器能正常匹配的前提。如果某层多一行或少一个字符，`build()` 时抛 `IllegalArgumentException`。详见 [`PatternBuilder`](../API/JavaAPI#patternbuilder)。

## 配方

裂解机的内置配方是 8 个青金石 + 1 个煤炭 → 500 mB 水 + 2 个钻石：

```java
@SubscribeEvent
public static void register(MMCRMachineRecipesEvent event) {
    var recipe = MachineRecipeBuilder
            .recipe(CRACKER.withSuffix("_recipe_1"),CRACKER)
            .inputItem(Ingredient.of(Items.LAPIS_LAZULI),8)
            .inputItem(Items.COAL,1)
            .outputFluid(Fluids.WATER,500)
            .outputItem(Items.DIAMOND,2)
            .inputEnergy(20)
            .duration(240)
            .build();
    event.registerRecipe(recipe);

}
```

链式调用里值得展开的三件事：

- **`Ingredient.of(Items.LAPIS_LAZULI), 8`**：8 个青金石作为输入；`Ingredient.of(...)` 是 vanilla 的物品谓词构造方式，与 `inputItem(Items.LAPIS_LAZULI, 8)` 行为等价，但允许你将来扩展为标签 / 多物品并集。
- **`outputFluid(Fluids.WATER, 500)`**：流体输出 500 mB 水。`Fluids.WATER` 是 vanilla 流体类型，MMCR 接受任何已注册的 `Fluid`。详见 [`MachineRecipeBuilder.outputFluid(...)`](../API/JavaAPI#machinerecipebuilder)。
- **`outputItem(Items.DIAMOND, 2)`**：2 个钻石作为物品输出。注意**输入和输出不必一一对应**——8 个青金石 + 1 个煤炭输入产生 500 mB 水 + 2 个钻石输出，输入输出的"原子"是 MMCR 抽象的 IO 条目，不是化学方程式。

整个配方 20 FE/tick 持续 240 tick（12 秒）。

> 💡 如果想声明**流体输入**（让机器从流体端口抽水），使用 `.inputFluid(Fluids.WATER, amount)`——裂解机目前只用流体输出，因为 `anyFluidInput()` 没有被 B 字符接受。

## 三个阶段的协作关系

与 [BLAST_FURNACE](BLAST_FURNACE) 和 [ALLOY_FURNACE](ALLOY_FURNACE) 完全相同的三阶段路径：

1. `registerDefinitions(...)` 通过 [`BuiltInProvider`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/provider/BuiltInProvider.java) 被 MMCR 启动期调用：注册自定义控制器规格。
2. `registerStructures(...)` 通过 `@SubscribeEvent` 订阅 [`MMCRMachineStructuresEvent`](../API/JavaAPI#mmcrmachinestructuresevent)：注册 4 层结构 + 端口等级。
3. `register(...)` 通过 `@SubscribeEvent` 订阅 [`MMCRMachineRecipesEvent`](../API/JavaAPI#mmcrmachinerecipesevent)：注册一个配方（同时含流体输出与物品输出）。

## 小结

裂解机演示的是"结构精细 + 自定义控制器 + 多类 IO"组合：

- [`MachineBuilder.controller(...)`](../API/JavaAPI#machinebuilder) 让玩家自定义控制器的注册 ID 与朝向；多层结构 + `allowVerticalFacing(true)` 是常见组合。
- 多层 [`PatternBuilder.layer(...)`](../API/JavaAPI#patternbuilder) 让结构表达"几层外壳 + 几层功能层"；同一字符绑定 [`BlockPredicate.any(...)`](../API/JavaAPI#blockpredicate) 的并集，让一个位置既允许端口又允许装饰方块。
- [`MachineRecipeBuilder.outputFluid(...)`](../API/JavaAPI#machinerecipebuilder) 与 `.inputFluid(...)` 让配方跨越物品与流体两个 IO 维度。
- [`PortTiers.Builder.minXxxXxx(...)`](../API/JavaAPI#porttiers) 声明机器对端口等级的最低要求——只警告不强制。

接下来可以阅读 [THERMAL_SMELTING_FURNACE](THERMAL_SMELTING_FURNACE) 看等级系统（LevelType / MachineLevel / LevelModifier）如何用"线圈方块"动态影响配方；或者回到 [BLAST_FURNACE](BLAST_FURNACE) 对照并行与多线程的另一种实现思路；或者去 [API 参考](../API/JavaAPI) 浏览全部 API。