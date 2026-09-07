---
title: ALLOY_FURNACE
order: 2
---

# ALLOY_FURNACE — 合金炉

本文拆解 [ALLOY_FURNACE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/builtin/ALLOY_FURNACE.java)。合金炉是一台 3×3×3 的小型多方块机器，它在 MMCR 内置示例中专门演示**修饰符系统（Modifier）**——玩家在结构中放置特定的方块就能让配方"加速"或"产出翻倍"。如果说 [BLAST_FURNACE](BLAST_FURNACE) 演示的是并行与多线程，那么合金炉演示的就是用方块直接驱动配方修正。

## 概览

合金炉把一组玩家放置的方块当作"机器升级"：把高炉方块替换成钻石块，配方耗时减半；替换成金块，配方产出翻倍。它由三段组成，与 [BLAST_FURNACE](BLAST_FURNACE) 相同的部分不再赘述，本文重点说明修饰符注册、修饰符替换以及机器外观设置。

涉及的全部 API：

| 用到的 API | API 参考 |
| --- | --- |
| `MachineDefinitionProvider` | [链接](../API/JavaAPI#machinedefinitionprovider) |
| `MMCRMachineDefinationsEvent` | [链接](../API/JavaAPI#mmcrmachinedefinationsevent) |
| `MMCRMachineStructuresEvent` | [链接](../API/JavaAPI#mmcrmachinestructuresevent) |
| `MMCRMachineRecipesEvent` | [链接](../API/JavaAPI#mmcrmachinerecipesevent) |
| `MachineBuilder` | [链接](../API/JavaAPI#machinebuilder) |
| `MachineStructureBuilder` | [链接](../API/JavaAPI#machinestructurebuilder) |
| `StructureStage` | [链接](../API/JavaAPI#structurestage) |
| `PatternBuilder` | [链接](../API/JavaAPI#patternbuilder) |
| `MachineRecipeBuilder` | [链接](../API/JavaAPI#machinerecipebuilder) |
| `BlockPredicate` | [链接](../API/JavaAPI#blockpredicate) |
| `InterfacePredicates` | [链接](../API/JavaAPI#interfacepredicates) |
| `AppearanceSpec` | [链接](../API/JavaAPI#appearancespec) |
| `ModifierDefinition` | [链接](../API/JavaAPI#modifierdefinition) |
| `ModifierUse` | [链接](../API/JavaAPI#modifieruse) |
| `StructureRequirements` | [链接](../API/JavaAPI#structurerequirements) |

## 机器定义

合金炉的机器定义很简短——它只启用修饰符并设置外观，不涉及并行或多线程：

```java
public static void registerDefinitions(MMCRMachineDefinationsEvent event) {
    if (!event.definitions().containsKey(ALLOY_FURNACE)) {
        var machine = MachineBuilder
                .machine(ALLOY_FURNACE)
                .allowModifiers()
                .displayNameKey("machine.mmcr.alloy_furnace")
                .appearance(appearance -> appearance.machineBasicBlock(Identifier.parse("minecraft:bricks")))
                .build();
        event.registerMachine(machine);
    }
}
```

链式调用里值得展开的三件事：

- `.allowModifiers()`：开启机器修饰符能力。MMCR 默认不允许任何修饰符——必须显式开启，结构阶段才能注册修饰符、配方阶段才能 `modifier(...)` 声明它接受的修饰符。详见 [`MachineBuilder.allowModifiers()`](../API/JavaAPI#allowmodifiers--allowmodifiersboolean-allow)。
- `.appearance(appearance -> appearance.machineBasicBlock(...))`：把"未成型时的外观方块"声明为砖块。玩家手持扳手敲击控制器时，未成型的中间态会用砖块显示；成型后回到控制器方块。详见 [`AppearanceSpec`](../API/JavaAPI#appearancespec)。
- `.displayNameKey(...)`：本地化键约定 `machine.<命名空间>.<注册名>`，合金炉就是 `machine.mmcr.alloy_furnace`。

`build()` 返回不可变的 [`MachineDefinition`](../API/JavaAPI#machinedefinition)，`event.registerMachine(...)` 把它提交到启动期注册窗口。`definitions().containsKey(...)` 做幂等检查，确保重复触发时不会抛 `IllegalStateException`。

## 多方块结构

合金炉的结构是一个 3×3×3 的多层多方块。中层（M 行）放了高炉方块作为"炉心"，但这一行的 M 既是基础方块，又同时是两个修饰符的替换槽位——这是合金炉与 [BLAST_FURNACE](BLAST_FURNACE) 最大的不同：

```java
@SubscribeEvent
public static void registerStructures(MMCRMachineStructuresEvent event) {

    // register your modifier first
    event.registerModifier(
            id("alloy_furnace_diamond_speedup"),
            ModifierDefinition.of(
                    "duration",
                    "input",
                    0.5F,
                    "multiply",
                    false
            ));
    event.registerModifierItem(new ItemStack(Items.DIAMOND_BLOCK), id("alloy_furnace_diamond_speedup"));

    event.registerModifier(
            id("alloy_furnace_gold_doubling"),
            ModifierDefinition.of(
                    "item",
                    "output",
                    2.0F,
                    "multiply",
                    false
            ));
    event.registerModifierItem(new ItemStack(Items.GOLD_BLOCK), id("alloy_furnace_gold_doubling"));


    if (!event.structures().containsKey(ALLOY_FURNACE)) {
        var structure = MachineStructureBuilder
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                            .layer("XXX", "XIX", "XXX")
                            .layer("XMX", "I I", "XMX")
                            .layer("XXX", "XCX", "XXX")
                            .where('X', block(Blocks.BRICKS))
                                .where('I', any(
                                        InterfacePredicates.anyItemInput(),
                                        InterfacePredicates.anyItemOutput(),
                                        InterfacePredicates.anyEnergyInput()
                                ))
                                .where('M', block(Blocks.BLAST_FURNACE))
                                .controller('C'))
                        .requirements(r -> r
                                .modifier('M', ModifierUse.of(
                                        id("alloy_furnace_diamond_speedup"), block(Blocks.DIAMOND_BLOCK)))
                                .modifier('M', ModifierUse.of(
                                        id("alloy_furnace_gold_doubling"), block(Blocks.GOLD_BLOCK)))
                        ))
                .build(ALLOY_FURNACE);
        event.registerStructure(structure);
    }
}
```

### 修饰符是什么、为什么要先注册

修饰符（Modifier）是 MMCR 提供的"用方块直接驱动配方修正"的机制——玩家在结构对应位置摆出特定方块时，配方行为按修饰符规则改变（例如 `0.5F multiply duration` 表示耗时减半）。

它由两个相互独立的部分组成：

- **修饰符定义（ModifierDefinition）**：声明"这条规则做什么"。通过 `event.registerModifier(id, definition)` 在结构阶段注册，告诉 MMCR 有这样一个规则存在。
- **修饰符物品（ModifierItem）**：声明"玩家放哪个方块时这条规则生效"。通过 `event.registerModifierItem(itemStack, id)` 把一个物品栈绑定到修饰符 ID。

修饰符**必须先注册定义、再注册物品**，注册顺序反了会让 MMCR 找不到 ID。代码注释 `// register your modifier first` 提醒的就是这件事。

合金炉注册了两条规则：

| 修饰符 ID | 物品 | `target` | `ioTarget` | `modifier` | `operation` | 含义 |
| --- | --- | --- | --- | --- | --- | --- |
| `alloy_furnace_diamond_speedup` | 钻石块 | `duration` | `input` | `0.5F` | `multiply` | 配方持续时间乘以 0.5（耗时减半） |
| `alloy_furnace_gold_doubling` | 金块 | `item` | `output` | `2.0F` | `multiply` | 物品输出乘以 2（产出翻倍） |

`ModifierDefinition.of(...)` 的参数语义详见 [`ModifierDefinition`](../API/JavaAPI#modifierdefinition)：`target` 是修饰目标维度（持续时间、能量、输入、输出等），`ioTarget` 是 IO 方向（`input` 或 `output`），`modifier` 是数值，`operation` 是运算（`multiply` / `add` / `set` 等），`affectsChance` 表示是否影响概率字段。

### 结构与修饰符替换

模式本身是简单的 3×3×3：

- `layer("XXX", "XIX", "XXX")` — 顶层。`X` 是外壳砖块；`I` 是接口位。
- `layer("XMX", "I I", "XMX")` — 中层。M 是高炉（炉心）；I 是接口位。
- `layer("XXX", "XCX", "XXX")` — 底层。`C` 是控制器。
- `.where('X', block(Blocks.BRICKS))` — 外壳固定为砖块，与外观配置呼应。
- `.where('I', any(...))` — 中层周围的 I 位置允许任意物品输入/输出或能量输入。
- `.where('M', block(Blocks.BLAST_FURNACE))` — 炉心默认是 vanilla 高炉。
- `.controller('C')` — 控制器位于底层中心。

关键在 `.requirements(r -> r.modifier('M', ...).modifier('M', ...))`：

```java
.requirements(r -> r
        .modifier('M', ModifierUse.of(
                id("alloy_furnace_diamond_speedup"), block(Blocks.DIAMOND_BLOCK)))
        .modifier('M', ModifierUse.of(
                id("alloy_furnace_gold_doubling"), block(Blocks.GOLD_BLOCK))))
```

这两次 `modifier('M', ModifierUse.of(modifierId, replacement))` 把字符 `M` 同时绑定到两个修饰符替换规则。也就是说，玩家在中层中央既可以摆高炉（默认），也可以摆钻石块（触发加速），还可以摆金块（触发产出翻倍）。三者只能选其一；MMCR 按注册顺序依次尝试替换。

[`StructureRequirements.Builder.modifier(char, ModifierUse)`](../API/JavaAPI#structurerequirements) 的语义详见 [`ModifierUse`](../API/JavaAPI#modifieruse)：同一个字符可以挂多个 `ModifierUse`，匹配时按列表顺序尝试第一个能放下的修饰符物品。

### 与 BLAST_FURNACE 的对比

[BLAST_FURNACE](BLAST_FURNACE) 的字符 `A` 用 `any(parallelControllers(), ...)` 允许多个并行控制器方块——这是"哪种方块可以接受"的并集语义。合金炉的字符 `M` 用 `ModifierUse.of(id, replacement)`——这是"这个位置在匹配时被替换为哪种方块"的重写语义。前者是匹配，后者是替换；两者底层都是方块谓词，但表达的意图完全不同。

## 配方

合金炉只内置一个配方——演示基础物品转物品：

```java
@SubscribeEvent
public static void register(MMCRMachineRecipesEvent event) {
    var recipe = MachineRecipeBuilder
            .recipe(ALLOY_FURNACE.withSuffix("_recipe_1"),ALLOY_FURNACE)
            .inputItem(Ingredient.of(Items.GOLD_INGOT),1)
            .outputItem(Items.GOLD_NUGGET,10)
            .inputEnergy(20)
            .duration(200)
            .build();
    event.registerRecipe(recipe);

}
```

含义：

- 1 个金锭 → 10 个金粒，每 tick 消耗 20 FE，耗时 200 tick（10 秒）。

请注意：**这台机器没有任何配方代码 `modifier(...)` 声明**——那是因为修饰符是否生效由结构中"是否摆出对应方块"决定，与配方注册无关。如果玩家摆出钻石块，配方会按 `alloy_furnace_diamond_speedup` 规则持续时间乘以 0.5；如果摆出金块，物品输出会按 `alloy_furnace_gold_doubling` 规则乘以 2。两个修饰符同时摆出时，会按注册顺序叠加应用。

> 💡 如果想让某条配方强制要求某个修饰符才能执行，可以在配方链中显式调用 `.modifier(ModifierId)` 声明配方接受的修饰符——机器定义阶段已经通过 `allowModifiers()` 启用修饰符能力，结构阶段已经注册了修饰符 ID 和物品，配方的 `modifier(...)` 仅是把"接受关系"显式化。详见 [`MachineRecipeBuilder.modifier(...)`](../API/JavaAPI#machinerecipebuilder)。

## 三个阶段的协作关系

与 [BLAST_FURNACE](BLAST_FURNACE) 一致，但修饰符注册发生在结构阶段：

1. `registerDefinitions(...)` 通过 [`BuiltInProvider`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/provider/BuiltInProvider.java) 被 MMCR 启动期调用：启用修饰符、声明外观。
2. `registerStructures(...)` 在服务期被 [`@SubscribeEvent`](https://docs.neoforged.net/docs/events/) 触发：先注册两条修饰符定义和物品，再注册结构（含修饰符替换）。
3. `register(...)` 通过 `@SubscribeEvent` 订阅 [`MMCRMachineRecipesEvent`](../API/JavaAPI#mmcrmachinerecipesevent)：注册一个配方。

修饰符的注册必须在结构构建之前完成，否则 `StructureRequirements.Builder.modifier(char, Identifier)` 在结构冻结时会因修饰符 ID 未注册而抛 [`ApiRegistrationException`](../API/JavaAPI#apiregistrationexception)。源码里把 `registerModifier` / `registerModifierItem` 放在结构构建之前是必须的。

## 小结

合金炉演示的是"用方块驱动配方"——MMCR 修饰符机制从定义到使用只需三步：

1. **机器定义**阶段 [`MachineBuilder.allowModifiers()`](../API/JavaAPI#machinebuilder) 启用修饰符能力；
2. **结构**阶段 [`MMCRMachineStructuresEvent.registerModifier(...)`](../API/JavaAPI#mmcrmachinestructuresevent) 注册修饰符定义，`registerModifierItem(...)` 绑定方块；[`StructureRequirements.Builder.modifier(char, ModifierUse)`](../API/JavaAPI#structurerequirements) 把字符位置声明为修饰符替换槽位；
3. **配方**阶段可选地 [`MachineRecipeBuilder.modifier(...)`](../API/JavaAPI#machinerecipebuilder) 声明配方接受的修饰符（不声明时结构中的方块也会生效）。

外观相关的 [`AppearanceSpec`](../API/JavaAPI#appearancespec) 在合金炉这里只是简单指定一个"未成型时的基础方块"，但同样的入口后续可以为控制器底面纹理、成型后端口底面纹理等做更细的配置。

接下来可以阅读 [CRACKER](CRACKER) 看流体输出与自定义控制器的写法，或翻 [BLAST_FURNACE](BLAST_FURNACE) 对照并行与多线程的另一种实现思路；或者去 [API 参考](../API/JavaAPI) 浏览全部 API。