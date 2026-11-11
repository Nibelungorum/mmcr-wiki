---
title: 紫珀炉
order: 5
---

# 紫珀炉

紫珀炉使用**智能接口**作为运行时调节器：整数 `mode` 选择配方，浮点 `conversation` 增加配方筛选条件，两者还通过数值映射修正能耗与耗时。接口名 `conversation` 沿用源码拼写，不应自行改成另一个名字。

本文以 [PURPUR_FURNACE.java（0b4e5f32）](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/0b4e5f32265a19314bfca1134b74450f7d2e9018/src/main/java/org/nibelungorum/builtin/PURPUR_FURNACE.java) 为准。

## 入口与类型签名

| 类型 / 方法 | 本例使用的签名与结果 | API 参考 |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)`；`build()` → `MachineSpec` | [参考](../API/JavaAPI#machinedraft) |
| `SmartInterfaces` | `type(String, float min, float max, int priority, ValueType)` → `SmartInterfaceSpec`；省略值类型时使用浮点类型 | [参考](../API/JavaAPI#smartinterfaces) |
| `Modifiers` | `smartEnergy(String, DoubleUnaryOperator, ModifierOperation)` / `smartDuration(String, DoubleUnaryOperator, ModifierOperation)` → `SmartModifierSpec` | [参考](../API/JavaAPI#modifiers) |
| `MachineDraft` | `smartInterface(SmartInterfaceSpec)`；`smartInterfaceModifier(SmartModifierSpec)` | [参考](../API/JavaAPI#smartinterfacespec) |
| `Structures` / `StructureDraft` | `fullStructure(Consumer<StructureStageDraft>)`；`build(Identifier)` → `StructureSpec` | [参考](../API/JavaAPI#structuredraft) |
| `PatternDraft` / `BlockConditions` | `where(char, BlockCondition)`；`state(String)`；`smartInterface()` | [模式](../API/JavaAPI#patterndraft)、[条件](../API/JavaAPI#blockconditions) |
| `Recipes` / `RecipeDraft` | `smartInterface(SmartInterfaceRequirementSpec)`；`build()` → `RecipeSpec` | [参考](../API/JavaAPI#recipedraft) |
| `Requirements` | `smartInput(String, float)` / `smartInput(String, float, float)` | [参考](../API/JavaAPI#requirements) |
| 注册事件 | `RegisterMachineDefinitionsEvent`、`RegisterMachineStructuresEvent`、`RegisterMachineRecipesEvent` | [定义](../API/JavaAPI#registermachinedefinitionsevent)、[结构](../API/JavaAPI#registermachinestructuresevent)、[配方](../API/JavaAPI#registermachinerecipesevent) |

## 机器定义

```java
private static final Identifier PURPUR_FURNACE = id("purpur_furnace");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(PURPUR_FURNACE)) {
        MachineSpec machine = Machines
                .machine(PURPUR_FURNACE)
                .recipePool(PURPUR_FURNACE)
                .displayNameKey("machine.mmcr.purpur_furnace")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("end_stone_bricks")))
                .maxParallelism(32).parallelizable(true)
                .smartInterface(SmartInterfaces.type("mode", 1F, 3F, 1, SmartInterfaces.ValueType.INTEGER))
                .smartInterface(SmartInterfaces.type("conversation", 0F, 1F, 0))
                .smartInterfaceModifier(Modifiers.smartEnergy("mode",
                        value -> Math.pow(2D, value - 1D), ModifierOperation.MULTIPLY))
                .smartInterfaceModifier(Modifiers.smartDuration("conversation",
                        value -> value <= 0.5D ? 1D + value : 0.5D + 2D * value,
                        ModifierOperation.MULTIPLY))
                .runningSound(Identifier.parse("minecraft:block.furnace.fire_crackle"))
                .finishSound(Identifier.parse("minecraft:entity.ender_dragon.growl"))
                .build();
        event.registerMachine(machine);
    }
}
```

`SmartInterfaces.type(...)` 声明接口值规格：`mode` 范围 1–3、优先级 1、值类型为整数；`conversation` 范围 0–1、优先级 0，默认浮点。`maxParallelism(32).parallelizable(true)` 是机器的并行声明；运行与完成音效分别指定熔炉燃烧声和末影龙咆哮声。

### 用函数明确计算修饰值

`Modifiers.smartEnergy` 与 `smartDuration` 现在各接收接口名、`DoubleUnaryOperator` 函数和操作枚举。函数取得接口实际值，返回操作数；本例使用 `MULTIPLY`，所以返回值是倍率，不是最终能耗或耗时。库不再自动插值或夹紧，分段逻辑由函数自身决定。

| 规则 | 函数 | 输入示例 → 倍率 |
| --- | --- | --- |
| 能量 | `Math.pow(2D, value - 1D)` | `mode=1/2/3` → `1/2/4` |
| 耗时 | `value <= 0.5D ? 1D + value : 0.5D + 2D * value` | `conversation=0/0.5/1` → `1/1.5/2.5` |

只有一个提供这些值的智能接口时，基础耗时 200 tick 分别变为 200 / 300 / 500 tick。`conversation=1` 只用于说明函数结果，不表示第三条配方的 `[0, 0.31]` 筛选条件也允许该值。

:::warning 迁移与求值
旧的六参数端点重载已删除。新的能量与耗时规则各只有一条，不再得到旧示例叠加后的 `2/4/8` 与 `1.5/2.25/3.75` 倍率。单个函数可以写成互斥的分支，但额外声明的函数、其他接口方块产生的修饰符仍会继续叠加。

函数必须只依赖输入值、返回有限数值；注册时不执行，控制器刷新修饰符时才求值，不保证每 tick 调用。单条函数返回非有限值或抛 `RuntimeException` 时，控制器记录错误并跳过该条，继续处理其他规则。没有提供相应类型值的接口组件时，不会凭空得到修正。
:::

## 完整结构

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(PURPUR_FURNACE)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer(" ABBBD ", "       ", "       ", "       ", "  EEE  ", "       ", "       ", "       ")
                                .layer("AFXXXGD", "  HHH  ", "  III  ", "  JJJ  ", " EHHHE ", " KLLLM ", "       ", "       ")
                                .layer("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PXXXQ ", "  EHE  ", "   R   ")
                                .layer("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PX XQ ", "  H H  ", "  R R  ")
                                .layer("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PXXXQ ", "  EHE  ", "   R   ")
                                .layer("STXXXUV", "  HCH  ", "  III  ", "  JJJ  ", " EHHHE ", " WYYYZ ", "       ", "       ")
                                .layer(" abbbV ", "       ", "       ", "       ", "  EEE  ", "       ", "       ", "       ")
                                .where('X', block(Identifier.parse("minecraft:end_stone_bricks")))
                                .where('A', state("minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('B', state("minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]"))
                                .where('D', state("minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('E', block(Identifier.parse("minecraft:end_stone_brick_slab")))
                                .where('F', state("minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=inner_right,waterlogged=false]"))
                                .where('G', state("minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=inner_right,waterlogged=false]"))
                                .where('H', any(
                                        block(Identifier.parse("minecraft:purpur_pillar")),
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput(),
                                        BlockConditions.parallelControllers(),
                                        BlockConditions.smartInterface()
                                ))
                                .where('I', block(Identifier.parse("minecraft:purple_terracotta")))
                                .where('J', block(Identifier.parse("minecraft:purpur_block")))
                                .where('K', state("minecraft:purpur_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('L', state("minecraft:purpur_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]"))
                                .where('M', state("minecraft:purpur_stairs[facing=west,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('N', state("minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]"))
                                .where('O', state("minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]"))
                                .where('P', state("minecraft:purpur_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]"))
                                .where('Q', state("minecraft:purpur_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]"))
                                .where('R', block(Identifier.parse("minecraft:purpur_slab")))
                                .where('S', state("minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=outer_right,waterlogged=false]"))
                                .where('T', state("minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=inner_right,waterlogged=false]"))
                                .where('U', state("minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=inner_left,waterlogged=false]"))
                                .where('V', state("minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=outer_right,waterlogged=false]"))
                                .where('W', state("minecraft:purpur_stairs[facing=east,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('Y', state("minecraft:purpur_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]"))
                                .where('Z', state("minecraft:purpur_stairs[facing=north,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('a', state("minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('b', state("minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]"))
                                .controller('C')
                        )
                )
                .build(PURPUR_FURNACE);
        event.registerStructure(structure);
    }
}
```

七个切片，每片 8 行 × 7 列。大量空白行用于维持统一尺寸；空格未绑定，表示忽略该格。`H` 允许紫珀柱、物品输入 / 输出、能量输入、并行控制器和智能接口，其他字符分别绑定装饰方块或楼梯状态。

`BlockConditions.smartInterface()` 允许真实的智能接口方块进入结构组件集合；机器端的 `SmartInterfaces.type(...)` 只声明可配置值规格，不能替代接口安装位。玩家通过智能接口的配置界面设置值，不应把它描述成控制器自身无条件具备的调节器。

结构默认状态不敏感，因此楼梯 `state(...)` 中的属性用于声明预览 / 搭建状态，实际匹配忽略状态属性。本例没有调用 `stateSensitive()`；要强制检查朝向、半高、形状等属性，参照 [反应堆](reactor)。

## 三条配方与智能要求

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(PURPUR_FURNACE.withSuffix("_recipe_1"))
            .recipePool(PURPUR_FURNACE)
            .inputItem(Ingredient.of(Items.IRON_INGOT), 1)
            .outputItem(Items.IRON_NUGGET, 10)
            .inputEnergy(20)
            .smartInterface(smartInput("mode", 1))
            .duration(200)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(PURPUR_FURNACE.withSuffix("_recipe_2"))
            .recipePool(PURPUR_FURNACE)
            .inputItem(Ingredient.of(Items.IRON_INGOT), 1)
            .outputItem(Items.GOLD_NUGGET, 10)
            .inputEnergy(20)
            .smartInterface(smartInput("mode", 2))
            .duration(200)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(PURPUR_FURNACE.withSuffix("_recipe_3"))
            .recipePool(PURPUR_FURNACE)
            .inputItem(Ingredient.of(Items.APPLE), 1)
            .outputItem(Items.DIAMOND, 2)
            .inputEnergy(40)
            .smartInterface(smartInput("mode", 3))
            .smartInterface(smartInput("conversation", 0f, 0.31f))
            .duration(200)
            .build();
    event.registerRecipe(recipe);
}
```

`smartInput(...)` 静态导入自 `publicapi.recipe.requirement.Requirements`，返回 `SmartInterfaceRequirementSpec`。单值重载要求 `min == max == value`；范围重载要求值落在指定区间。

| 配方 | 基础输入 → 输出 | 基础能耗 | 接口条件 |
| --- | --- | --- | --- |
| `_recipe_1` | 1 铁锭 → 10 铁粒 | 20 FE/t | `mode=1` |
| `_recipe_2` | 1 铁锭 → 10 金粒 | 20 FE/t | `mode=2` |
| `_recipe_3` | 1 苹果 → 2 钻石 | 40 FE/t | `mode=3` 且 `conversation ∈ [0, 0.31]` |

三条配方基础耗时均为 200 tick。第三条在 `conversation=0.31` 时仍满足闭区间要求，超过该值则不满足；其耗时修饰仍由机器声明的映射计算。

## 运行时的两个独立步骤

1. 玩家安装并配置智能接口，结构扫描收集接口组件。
2. 配方匹配用 `smartInput(...)` 检查当前值，选出满足条件、材料和端口要求的配方。
3. 机器声明的智能映射将接口值转成修饰符，逐条应用能耗 / 耗时修正。

“要求匹配”与“数值映射”并不互相替代：每条配方声明自己的接口条件，机器声明共享的函数修正规则。分段函数只选择自身的分支，不会阻止其他函数或其他接口产生的修饰符叠加；应先计算结果，再设计玩家能理解的模式。

## 延伸阅读

- [SmartInterfaces](../API/JavaAPI#smartinterfaces) / [SmartInterfaceSpec](../API/JavaAPI#smartinterfacespec)：接口规格与值类型。
- [Modifiers](../API/JavaAPI#modifiers) / [SmartModifierSpec](../API/JavaAPI#smartmodifierspec)：映射规则与操作枚举。
- [Requirements](../API/JavaAPI#requirements) / [SmartInterfaceRequirementSpec](../API/JavaAPI#smartinterfacerequirementspec)：配方侧单值与范围要求。
- [StructureDraft](../API/JavaAPI#structuredraft)：状态敏感配置与结构阶段。
