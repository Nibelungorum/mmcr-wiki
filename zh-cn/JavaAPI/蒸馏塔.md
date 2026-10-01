---
title: 蒸馏塔
order: 6
---

# 蒸馏塔

蒸馏塔展示**基础结构与两个扩展形态**，并用一条配方演示确定输出、概率输出和允许丢弃输出。

## 入口与类型签名

| 类型 / 方法 | 签名与用途 | API 参考 |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)`；`build()` → `MachineSpec` | [参考](../API/JavaAPI#machinedraft) |
| `Structures` / `StructureDraft` | `fullStructure(Consumer<StructureStageDraft>)`、`expandStructure(Consumer<StructureStageDraft>)` | [参考](../API/JavaAPI#structuredraft) |
| `StructureStageDraft` / `PatternDraft` | 每个阶段独立配置模式；`pattern(Consumer<PatternDraft>)` | [阶段](../API/JavaAPI#structurestagedraft)、[模式](../API/JavaAPI#patterndraft) |
| `BlockConditions` | `block(String)`、`any(BlockCondition...)`、接口条件 | [参考](../API/JavaAPI#blockconditions) |
| `Recipes` / `RecipeDraft` | `outputChance(ItemStack, float)`、`allowPartialOutputs(boolean)`；`build()` → `RecipeSpec` | [参考](../API/JavaAPI#recipedraft) |
| 注册事件 | `RegisterMachineDefinitionsEvent`、`RegisterMachineStructuresEvent`、`RegisterMachineRecipesEvent` | [定义](../API/JavaAPI#registermachinedefinitionsevent)、[结构](../API/JavaAPI#registermachinestructuresevent)、[配方](../API/JavaAPI#registermachinerecipesevent) |

## 机器定义

```java
private static final Identifier DISTILLATION_TOWER = id("distillation_tower");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(DISTILLATION_TOWER)) {
        MachineSpec machine = Machines
                .machine(DISTILLATION_TOWER)
                .recipePool(DISTILLATION_TOWER)
                .displayNameKey("machine.mmcr.distillation_tower")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("polished_blackstone")))
                .maxParallelism(32)
                .parallelizable(true)
                .build();
        event.registerMachine(machine);
    }
}
```

主题方块是磨制黑石；不带命名空间的 `Identifier.parse("polished_blackstone")` 使用原版命名空间。并行上限为 32，但本例模式没有提供并行控制器条件，不能据此认为搭建后自动获得 32 并行。配方池显式绑定到 `DISTILLATION_TOWER`。

## 三个完整结构阶段

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(DISTILLATION_TOWER)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("  XXX  ", "  AAA  ", "       ", "       ")
                                .layer(" XXXXX ", " B   B ", "  ACA  ", "       ")
                                .layer("XXXXXXX", "A     A", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", "  DDD  ")
                                .layer(" XXXXX ", " B   B ", "  BBB  ", "       ")
                                .layer("  XXX  ", "  BEB  ", "       ", "       ")
                                .where('C', any(
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput(),
                                        block("minecraft:deepslate_bricks")
                                ))
                                .where('X', block("minecraft:polished_blackstone"))
                                .where('A', block("minecraft:deepslate_bricks"))
                                .where('B', block("minecraft:polished_blackstone_bricks"))
                                .where('D', block("minecraft:gilded_blackstone"))
                                .controller('E')
                        )
                )
                .expandStructure(s -> s
                        .pattern(p -> p
                                .layer("  XXX  ", "  AAA  ", "       ", "       ", "       ")
                                .layer(" XXXXX ", " B   B ", "  ACA  ", "  ACA  ", "       ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", "  DDD  ")
                                .layer(" XXXXX ", " B   B ", "  BBB  ", "  BBB  ", "       ")
                                .layer("  XXX  ", "  BEB  ", "       ", "       ", "       ")
                                .where('C', any(
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput(),
                                        block("minecraft:deepslate_bricks")
                                ))
                                .where('X', block("minecraft:polished_blackstone"))
                                .where('A', block("minecraft:deepslate_bricks"))
                                .where('B', block("minecraft:polished_blackstone_bricks"))
                                .where('D', block("minecraft:gilded_blackstone"))
                                .controller('E')
                        )
                )
                .expandStructure(s -> s
                        .pattern(p -> p
                                .layer("  XXX  ", "  AAA  ", "       ", "       ", "       ", "       ")
                                .layer(" XXXXX ", " B   B ", "  ACA  ", "  ACA  ", "  ACA  ", "       ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", " B   B ", "  DDD  ")
                                .layer(" XXXXX ", " B   B ", "  BBB  ", "  BBB  ", "  BBB  ", "       ")
                                .layer("  XXX  ", "  BEB  ", "       ", "       ", "       ", "       ")
                                .where('C', any(
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput(),
                                        block("minecraft:deepslate_bricks")
                                ))
                                .where('X', block("minecraft:polished_blackstone"))
                                .where('A', block("minecraft:deepslate_bricks"))
                                .where('B', block("minecraft:polished_blackstone_bricks"))
                                .where('D', block("minecraft:gilded_blackstone"))
                                .controller('E')
                        )
                )
                .build(DISTILLATION_TOWER);
        event.registerStructure(structure);
    }
}
```

### 扩展不是追加一截字符

每次 `fullStructure(...)` / `expandStructure(...)` 配置一个独立的 `StructureStageDraft`；内部 `pattern(...)` 接受 `Consumer<PatternDraft>`。扩展模式描述扩展后的完整形态，不是只描述新加的部分。

| 形态 | 切片数 | 每片行数 | 行宽 | `C` 端口候选格 |
| --- | --- | --- | --- | --- |
| 基础 | 7 | 4 | 7 | 1 |
| 第一扩展 | 7 | 5 | 7 | 2 |
| 第二扩展 | 7 | 6 | 7 | 3 |

表中的行数是模式坐标，不应把“4 行”写成“4 个 z 切片”。`X` 是磨制黑石，`A` 是深板岩砖，`B` 是磨制黑石砖，`D` 是镶金黑石。`E` 是控制器；`C` 可以是物品输入 / 输出、能量输入或装饰性的深板岩砖。空格未绑定，忽略该位置。

扩展使可安装接口的位置更多，但并不自动修改配方的输出数量、概率或丢弃开关。若要限制某条配方最低阶段，可在 `RecipeDraft` 中使用 `stageRequirement(int)`；本例配方没有该调用。

## 多输出与概率输出

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(DISTILLATION_TOWER.withSuffix("_recipe_1"))
            .recipePool(DISTILLATION_TOWER)
            .inputItem(ItemTags.LOGS, 1)
            .outputItem(Items.COAL, 4)
            .outputItem(Items.GUNPOWDER, 3)
            .outputChance(new ItemStack(Items.STICK, 2), 0.5f)
            .inputEnergy(20)
            .allowPartialOutputs(true)
            .duration(200)
            .build();
    event.registerRecipe(recipe);
}
```

基础配方消耗 1 个 `minecraft:logs` 标签中的物品、20 FE/t，耗时 200 tick（10 秒）；确定产出 4 煤炭和 3 火药，另有 50% 概率产出一栈 2 根木棍。

| 调用 | 参数类型 | 语义 |
| --- | --- | --- |
| `inputItem(ItemTags.LOGS, 1)` | `TagKey<Item>, int` | 标签匹配输入 |
| `outputItem(Items.COAL, 4)` | `Item, int` | 确定输出，重复调用追加不同产物 |
| `outputChance(new ItemStack(...), 0.5f)` | `ItemStack, float` | 输出栈的概率，不是把数量改成一半 |
| `allowPartialOutputs(true)` | `boolean` | 容量不足时允许丢弃放不下的输出 |

### 丢弃语义与容量规划

默认配方不允许把装不下的产物直接扔掉；输出容量不足会影响加工。`allowPartialOutputs(true)` 明确接受产物损失：实际输出阶段按可用空间插入，剩余部分可以被丢弃，而不是保留在隐形队列里等待玩家取走。

概率输出仍通过相应输出端口插入；是否随机命中与是否有容纳空间是两个问题。不能用“只有 50% 概率”推导它不需要输出容量。关闭部分输出后，还需满足输出容量规划；开启后则允许容量不足带来的丢弃。

蒸馏塔尤其适合说明这个取舍：基础形态只有一个 `C` 候选格，而配方同时需要输入、输出与能量供应；扩展后有更多独立端口安装点，玩家应按实际 IO 布置接口。代码没有流体输出，本例不要仅凭机器名理解成流体蒸馏配方。

## 延伸阅读

- [StructureDraft](../API/JavaAPI#structuredraft)：基础、扩展与附加结构声明。
- [StructureStageDraft](../API/JavaAPI#structurestagedraft)：每个阶段的模式和要求。
- [RecipeDraft](../API/JavaAPI#recipedraft)：`outputItem`、`outputChance`、`allowPartialOutputs` 与 `stageRequirement`。
