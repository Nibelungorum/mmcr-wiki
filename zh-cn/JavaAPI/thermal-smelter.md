---
title: 热能冶炼炉
order: 4
---

# 热能冶炼炉

热能冶炼炉将结构里的“线圈方块”建模成**等级类型与等级实例**，让等级调整耗时、能耗、产出、并行和线程上限。第三条配方还展示带自定义名称与附魔数据组件的输出。

## 入口与类型签名

| 类型 / 方法 | 签名与用途 | API 参考 |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)`；`build()` → `MachineSpec` | [参考](../API/JavaAPI#machinedraft) |
| `Structures` / `StructureDraft` | `fullStructure(Consumer<StructureStageDraft>)`；`build(Identifier)` → `StructureSpec` | [参考](../API/JavaAPI#structuredraft) |
| `PatternDraft` / `BlockConditions` | `where(char, BlockCondition)`；`blockState(BlockState)` | [模式](../API/JavaAPI#patterndraft)、[条件](../API/JavaAPI#blockconditions) |
| `Levels` | `type(Identifier, Component)` → `LevelTypeSpec` | [参考](../API/JavaAPI#levels) |
| `Levels` | `level(Identifier, Identifier, int, BlockCondition, ItemStack, ModifierBundle)` → `MachineLevelSpec` | [参考](../API/JavaAPI#machinelevelspec) |
| `Modifiers` | `numeric(String, ModifierScope, double, ModifierOperation, boolean)`；`bundle(ModifierSpec...)` | [参考](../API/JavaAPI#modifiers) |
| `StructureConstraints.Builder` | `levelSlot(char, Identifier)` | [参考](../API/JavaAPI#structureconstraints) |
| `Recipes` / `RecipeDraft` | `levelRequirement(Identifier, Identifier)`；`build()` → `RecipeSpec` | [参考](../API/JavaAPI#recipedraft) |
| `ComponentConstraints` | `ofIds(Map<Identifier, ComponentCondition>)` | [参考](../API/JavaAPI#componentconstraints) |
| `ComponentConditions` | `exact(JsonElement)` → `ExactCondition` | [参考](../API/JavaAPI#componentconditions) |
| 注册事件 | `RegisterMachineDefinitionsEvent`、`RegisterMachineStructuresEvent`、`RegisterMachineRecipesEvent` | [定义](../API/JavaAPI#registermachinedefinitionsevent)、[结构](../API/JavaAPI#registermachinestructuresevent)、[配方](../API/JavaAPI#registermachinerecipesevent) |

这里的等级实例由工厂方法创建，代表物品直接传 `ItemStack`；规则作用域与操作使用枚举，不再把它们写成字符串。

## ID 与机器定义

```java
private static final Identifier THERMAL_SMELTING_FURNACE = id("thermal_smelting_furnace");
public static final Identifier THERMAL_SMELTING_COIL_TYPE = id("thermal_smelting_coil");
public static final Identifier IRON_COIL = id("thermal_smelting_coil_iron");
public static final Identifier GOLD_COIL = id("thermal_smelting_coil_gold");
public static final Identifier DIAMOND_COIL = id("thermal_smelting_coil_diamond");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(THERMAL_SMELTING_FURNACE)) {
        MachineSpec machine = Machines
                .machine(THERMAL_SMELTING_FURNACE)
                .recipePool(THERMAL_SMELTING_FURNACE)
                .displayNameKey("machine.mmcr.thermal_smelting_furnace")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:smooth_basalt")))
                .allowModifiers()
                .parallelizable(true)
                .maxParallelism(4)
                .allowMultithreading()
                .build();
        event.registerMachine(machine);
    }
}
```

- `allowModifiers()` 允许应用等级携带的修饰符。
- `parallelizable(true).maxParallelism(4)` 声明基础并行能力和基础上限；等级规则中还有 `parallelism` 加成，因此不能把 4 解读为所有等级下永不变化的最终上限。
- `allowMultithreading()` 允许多线程，但实际调度仍需工厂控制器。源码结构的 `BlockConditions.ports()` 是资源 IO 接口集合，**不包含工厂控制器或并行控制器**；本例也没有单独增加这两类条件，因此不能把开关与等级调度加成理解为结构已具备相应控制器安装位。
- `appearance(...)` 是 `Consumer<AppearanceOptions>` 配置回调，主题方块为平滑玄武岩。

## 注册等级并绑定结构

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    event.registerLevelType(Levels.type(
            THERMAL_SMELTING_COIL_TYPE,
            Component.translatable("level.mmcr.thermal_smelting_coil")));

    event.registerLevel(Levels.level(
            IRON_COIL,
            THERMAL_SMELTING_COIL_TYPE,
            1,
            BlockConditions.blockState(Blocks.IRON_BLOCK.defaultBlockState()),
            new ItemStack(Holder.direct(Blocks.IRON_BLOCK.asItem(), DataComponentMap.EMPTY)),
            Modifiers.bundle(Modifiers.numeric(
                    "duration", ModifierScope.INPUT, 0.9D, ModifierOperation.MULTIPLY, false)))
    );

    event.registerLevel(Levels.level(
            DIAMOND_COIL,
            THERMAL_SMELTING_COIL_TYPE,
            3,
            BlockConditions.blockState(Blocks.DIAMOND_BLOCK.defaultBlockState()),
            new ItemStack(Holder.direct(Blocks.DIAMOND_BLOCK.asItem(), DataComponentMap.EMPTY)),
            Modifiers.bundle(
                    Modifiers.numeric("duration", ModifierScope.INPUT, 0.7D, ModifierOperation.MULTIPLY, false),
                    Modifiers.numeric("energy", ModifierScope.INPUT, 0.8D, ModifierOperation.MULTIPLY, false),
                    Modifiers.numeric("parallelism", ModifierScope.MACHINE, 4D, ModifierOperation.ADD, false),
                    Modifiers.numeric("factory_threads", ModifierScope.MACHINE, 1D, ModifierOperation.ADD, false)))
    );

    event.registerLevel(Levels.level(
            GOLD_COIL,
            THERMAL_SMELTING_COIL_TYPE,
            2,
            BlockConditions.blockState(Blocks.GOLD_BLOCK.defaultBlockState()),
            new ItemStack(Holder.direct(Blocks.GOLD_BLOCK.asItem(), DataComponentMap.EMPTY)),
            Modifiers.bundle(
                    Modifiers.numeric("duration", ModifierScope.INPUT, 0.6D, ModifierOperation.MULTIPLY, false),
                    Modifiers.numeric("energy", ModifierScope.INPUT, 0.7D, ModifierOperation.MULTIPLY, false),
                    Modifiers.numeric("output", ModifierScope.OUTPUT, 2D, ModifierOperation.MULTIPLY, false),
                    Modifiers.numeric("parallelism", ModifierScope.MACHINE, 6D, ModifierOperation.ADD, false),
                    Modifiers.numeric("factory_threads", ModifierScope.MACHINE, 2D, ModifierOperation.ADD, false)))
    );

    if (!event.structures().containsKey(THERMAL_SMELTING_FURNACE)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("AAA", "XXX", "XXX", "AAA")
                                .layer("AAA", "X X", "X X", "ADA")
                                .layer("ABA", "XXX", "XXX", "AAA")
                                .where('X', any(
                                        block(Blocks.IRON_BLOCK),
                                        block(Blocks.GOLD_BLOCK),
                                        block(Blocks.DIAMOND_BLOCK)
                                ))
                                .where('A', any(
                                        block(Blocks.SMOOTH_BASALT),
                                        BlockConditions.ports()
                                ))
                                .where('D', block(Blocks.REINFORCED_DEEPSLATE))
                                .controller('B')
                        )
                        .requirements(r -> r.levelSlot('X', THERMAL_SMELTING_COIL_TYPE))
                        .portTiers(t -> t
                                .anyItemInput()
                                .anyItemOutput()
                                .anyEnergyInput()
                        ))
                .build(THERMAL_SMELTING_FURNACE);
        event.registerStructure(structure);
    }
}
```

### 等级系统的三个概念

1. **等级类型**：`Levels.type(typeId, displayName)` 创建 `LevelTypeSpec`，定义“线圈等级”这个维度。先注册类型，再注册实例。
2. **等级实例**：`Levels.level(...)` 创建 `MachineLevelSpec`，六个参数依次为实例 ID、类型 ID、优先级、方块条件、代表物品栈、修饰符集合。
3. **等级槽位**：`StructureConstraints.Builder.levelSlot('X', typeId)` 把结构字符关联到等级维度，使实际放置的线圈参与等级识别。

| 等级 | 优先级 | 方块 | 时间乘数 | 能耗乘数 | 输出乘数 | 并行加成 | 线程加成 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `IRON_COIL` | 1 | 铁块 | 0.9 | 1.0 | 1.0 | 0 | 0 |
| `GOLD_COIL` | 2 | 金块 | 0.6 | 0.7 | 2.0 | +6 | +2 |
| `DIAMOND_COIL` | 3 | 钻石块 | 0.7 | 0.8 | 1.0 | +4 | +1 |

优先级用于等级识别与等级要求比较，不代表数值加成逐级增强；例如金线圈比钻石线圈更快、输出更多，但优先级更低。`ModifierScope.MACHINE` 配合 `ADD` 调整调度属性；`INPUT` / `OUTPUT` 配合 `MULTIPLY` 调整加工属性。

同一等级类型的所有槽位必须识别为**同一个等级实例**。本例所有 `X` 都绑定线圈类型，因此不能混放铁、金、钻石后挑优先级最高者；混用会报告等级不一致，结构无法正常成型。使用统一线圈后，该等级的修饰符集合生效，而不是把每种材料的规则都叠加。

等级及类型注册在结构存在检查之前；该检查并不保护前面的等级注册免于重复。

### 结构要求与端口

结构是三个切片，每个切片 4 行 × 3 列。`X` 允许三种线圈块并绑定线圈等级类型；`A` 是平滑玄武岩或 MMCR 资源 IO 接口集合；`D` 固定为强化深板岩；`B` 是控制器。空格未绑定，忽略该位置。

`requirements(...)` 接受 `Consumer<StructureConstraints.Builder>`，`portTiers(...)` 接受 `Consumer<PortTierLimits.Builder>`。两者分别配置等级槽位与端口要求，不能互相替代。

## 三条配方

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(THERMAL_SMELTING_FURNACE.withSuffix("_recipe_1"))
            .recipePool(THERMAL_SMELTING_FURNACE)
            .inputItem(Items.RAW_IRON, 8)
            .inputItem(Items.COAL, 1)
            .outputItem(Items.IRON_INGOT, 9)
            .inputEnergy(40)
            .parallelized(true)
            .duration(200)
            .levelRequirement(THERMAL_SMELTING_COIL_TYPE, IRON_COIL)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(THERMAL_SMELTING_FURNACE.withSuffix("_recipe_2"))
            .recipePool(THERMAL_SMELTING_FURNACE)
            .inputItem(Items.RAW_GOLD, 8)
            .inputItem(Items.COAL, 1)
            .outputItem(Items.GOLD_INGOT, 9)
            .inputEnergy(40)
            .parallelized(true)
            .duration(200)
            .levelRequirement(THERMAL_SMELTING_COIL_TYPE, GOLD_COIL)
            .build();
    event.registerRecipe(recipe);

    ItemStack output = new ItemStack(Items.DIAMOND, 9);
    output.set(DataComponents.CUSTOM_NAME, Component.literal("What a magic recipe"));

    JsonObject enchantments_data = new JsonObject();
    enchantments_data.addProperty("minecraft:sharpness", 4);
    ComponentConstraints data_extra = ComponentConstraints.ofIds(Map.of(
            Identifier.parse("minecraft:enchantments"),
            ComponentConditions.exact(enchantments_data)));

    recipe = Recipes
            .recipe(THERMAL_SMELTING_FURNACE.withSuffix("_recipe_3"))
            .recipePool(THERMAL_SMELTING_FURNACE)
            .inputItem(Items.GOLD_INGOT, 8)
            .inputItem(Items.COAL, 1)
            .outputItem(output, data_extra)
            .inputEnergy(40)
            .parallelized(true)
            .duration(200)
            .levelRequirement(THERMAL_SMELTING_COIL_TYPE, DIAMOND_COIL)
            .build();
    event.registerRecipe(recipe);
}
```

### 普通配方与最低等级

| 配方后缀 | 基础输入 | 基础输出 | 最低线圈 |
| --- | --- | --- | --- |
| `_recipe_1` | 8 粗铁 + 1 煤炭 | 9 铁锭 | 铁 |
| `_recipe_2` | 8 粗金 + 1 煤炭 | 9 金锭 | 金 |
| `_recipe_3` | 8 金锭 + 1 煤炭 | 9 个有名称和锋利 IV 数据的钻石 | 钻石 |

三条配方基础耗时均为 200 tick，基础耗能均为 40 FE/t；等级修饰之后再得到实际加工参数。

`levelRequirement(typeId, levelId)` 声明该维度的最低等级要求，返回的要求类型为 [LevelRequirementSpec](../API/JavaAPI#levelrequirementspec)。`parallelized(true)` 是配方级开关，与机器级 `parallelizable(true)` 配合；实际并行仍需要控制器、足够资源和修饰后的上限支持。

### 数据组件输出

`ItemStack.set(DataComponents.CUSTOM_NAME, ...)` 可直接写入已有类型的组件值。本例附魔值通过 JSON 表达，再用 `ComponentConditions.exact(...)` 创建精确条件，`ComponentConstraints.ofIds(...)` 将组件 ID 与条件组合起来。最后调用 `outputItem(ItemStack, ComponentConstraints)`，同时保留栈上的名称和声明中的附魔。

这是带注册表数据的组件声明方式，不意味着所有附魔操作都必须使用 JSON；当持有合适的注册表上下文时，原版也能构造相应组件值。示例中的文本、JSON 结构和数量均保留源码值。

:::info
`ComponentConditions` 提供 `exact`、`map`、`list`、`range`、`text` 工厂，结果分别是对应的 `*Condition`。模糊条件用于输入匹配；输出必须给出精确值，不能把范围或模糊文字条件当成可生成的输出数据。
:::

## 小结

等级声明使用 [Levels](../API/JavaAPI#levels)，数值规则使用 [Modifiers](../API/JavaAPI#modifiers)，结构绑定使用 [StructureConstraints](../API/JavaAPI#structureconstraints)，数据组件使用 [ComponentConstraints](../API/JavaAPI#componentconstraints) / [ComponentConditions](../API/JavaAPI#componentconditions)。保留“注册等级 → 结构识别等级 → 配方检查等级 → 应用修饰”的完整流程，才能解释这台机器的加工与调度行为。
