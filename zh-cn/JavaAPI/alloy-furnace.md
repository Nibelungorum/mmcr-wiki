---
title: 合金炉
order: 2
---

# 合金炉

合金炉演示**结构修饰符**：把结构里的原版高炉替换为钻石块可缩短配方时间，替换为金块可增加输出。

## 入口与类型签名

| 类型 / 方法 | 签名与职责 | API 参考 |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)` → 草稿；`build()` → `MachineSpec` | [参考](../API/JavaAPI#machinedraft) |
| `Structures` / `StructureDraft` | `structure()` → 草稿；`build(Identifier)` → `StructureSpec` | [参考](../API/JavaAPI#structuredraft) |
| `Recipes` / `RecipeDraft` | `recipe(Identifier)` → 草稿；`build()` → `RecipeSpec` | [参考](../API/JavaAPI#recipedraft) |
| `AppearanceOptions` | `appearance(Consumer<AppearanceOptions>)` | [参考](../API/JavaAPI#appearanceoptions) |
| `Modifiers` | `numeric(String, ModifierScope, double, ModifierOperation, boolean)` → `NumericModifierSpec` | [参考](../API/JavaAPI#modifiers) |
| `ModifierBundle` | `Modifiers.bundle(ModifierSpec...)` 返回可注册的规则集合 | [参考](../API/JavaAPI#modifierbundle) |
| `StructureConstraints.Builder` | `modifier(char, Identifier, BlockCondition)` 声明替换位 | [参考](../API/JavaAPI#structureconstraints) |
| `BlockConditions` / `PatternDraft` | `where(char, BlockCondition)` 绑定字符 | [条件](../API/JavaAPI#blockconditions)、[模式](../API/JavaAPI#patterndraft) |
| 注册事件 | `RegisterMachineDefinitionsEvent`、`RegisterMachineStructuresEvent`、`RegisterMachineRecipesEvent` | [定义](../API/JavaAPI#registermachinedefinitionsevent)、[结构](../API/JavaAPI#registermachinestructuresevent)、[配方](../API/JavaAPI#registermachinerecipesevent) |

## 机器定义

```java
private static final Identifier ALLOY_FURNACE = id("alloy_furnace");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(ALLOY_FURNACE)) {
        MachineSpec machine = Machines
                .machine(ALLOY_FURNACE)
                .recipePool(ALLOY_FURNACE)
                .allowModifiers()
                .displayNameKey("machine.mmcr.alloy_furnace")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:bricks")))
                .build();
        event.registerMachine(machine);
    }
}
```

`allowModifiers()` 启用机器应用修饰符的能力；它不代替修饰符定义、物品绑定或结构替换位。`recipePool(ALLOY_FURNACE)` 指定合金炉配方池。`appearance(...)` 接受 `Consumer<AppearanceOptions>`，配置未成型主题方块为砖块。`build()` 返回 `MachineSpec`。

## 多方块结构与修饰符注册

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    event.registerModifier(
            id("alloy_furnace_diamond_speedup"),
            Modifiers.bundle(Modifiers.numeric(
                    "duration", ModifierScope.INPUT, 0.5F,
                    ModifierOperation.MULTIPLY, false
            )));
    event.registerModifierItem(
            new ItemStack(Items.DIAMOND_BLOCK), id("alloy_furnace_diamond_speedup"));

    event.registerModifier(
            id("alloy_furnace_gold_doubling"),
            Modifiers.bundle(Modifiers.numeric(
                    "output", ModifierScope.OUTPUT, 2.0F,
                    ModifierOperation.MULTIPLY, false
            )));
    event.registerModifierItem(
            new ItemStack(Items.GOLD_BLOCK), id("alloy_furnace_gold_doubling"));

    if (!event.structures().containsKey(ALLOY_FURNACE)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("XXX", "XIX", "XXX")
                                .layer("XMX", "I I", "XMX")
                                .layer("XXX", "XCX", "XXX")
                                .where('X', block(Blocks.BRICKS))
                                .where('I', any(
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput()
                                ))
                                .where('M', block(Blocks.BLAST_FURNACE))
                                .controller('C'))
                        .requirements(r -> r
                                .modifier('M', id("alloy_furnace_diamond_speedup"), block(Blocks.DIAMOND_BLOCK))
                                .modifier('M', id("alloy_furnace_gold_doubling"), block(Blocks.GOLD_BLOCK))
                        ))
                .build(ALLOY_FURNACE);
        event.registerStructure(structure);
    }
}
```

### 三层声明分别负责什么

1. `event.registerModifier(id, bundle)` 注册规则本身。`Modifiers.numeric(...)` 返回数值规则，`Modifiers.bundle(...)` 将规则包装成 `ModifierBundle`。
2. `event.registerModifierItem(stack, id)` 绑定修饰符代表物品；应先注册规则再绑定物品。
3. `requirements(r -> r.modifier('M', id, replacement))` 决定结构中哪些字符允许被对应方块替换。此处直接传 ID 与 `BlockCondition`，不需要另建包装记录。

| 修饰符 ID（省略命名空间） | 代表物品 | target | scope | value | operation | 效果 |
| --- | --- | --- | --- | --- | --- | --- |
| `alloy_furnace_diamond_speedup` | 钻石块 | `duration` | `INPUT` | 0.5 | `MULTIPLY` | 持续时间乘 0.5 |
| `alloy_furnace_gold_doubling` | 金块 | `output` | `OUTPUT` | 2.0 | `MULTIPLY` | 输出数量乘 2 |

最后一个 `false` 是 `affectsChance`，本例修改数量或耗时，不修改概率。金块规则的目标以源码为准是 `"output"`，不是 `"item"`。

### 替换位不是强制升级

模式为 3×3×3：`X` 是砖块，`I` 是物品输入 / 输出或能量输入，`C` 是控制器；中间切片有**两个 `M` 位置**，默认放原版高炉。每个 `M` 可以选择高炉、钻石块或金块，一个位置不能同时放两种升级方块，但两个位置可以分别放钻石块和金块，从而同时获得两种修饰。

空格没有绑定条件，表示忽略，不要求空气。模式坐标会随控制器朝向转换；两个 `M` 都不是空心内部的中心格。

同一字符可声明多条替换规则，结构匹配检查相应位置实际放置的方块。所有回调（`fullStructure`、`pattern`、`requirements`）都是立即配置的 `Consumer`，最终 `build(ALLOY_FURNACE)` 返回 `StructureSpec`。

:::info
结构 ID 的 `containsKey(...)` 判断只保护结构注册；源码的两条修饰符及物品注册位于判断之前。不要把整个方法理解成在同一注册窗口内可任意重复调用的幂等操作。
:::

## 配方

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(ALLOY_FURNACE.withSuffix("_recipe_1"))
            .recipePool(ALLOY_FURNACE)
            .inputItem(Ingredient.of(Items.GOLD_INGOT), 1)
            .outputItem(Items.GOLD_NUGGET, 10)
            .inputEnergy(20)
            .duration(200)
            .build();
    event.registerRecipe(recipe);
}
```

基础配方是 1 金锭 → 10 金粒，20 FE/t、200 tick（10 秒）。放置钻石升级时耗时被修正，放置金块升级时输出数量被修正；实际执行还需要输入、输出空间和能量供应。

这条配方没有 `.modifier(...)`，结构找到的修饰符仍可以生效。配方侧 `RecipeDraft.modifier(Identifier)` 则引用已注册规则，把其中的配方修正转换为这条配方自带的修饰符；它不是“必须在结构中摆出该修饰符方块”的匹配要求。引用未知修饰符 ID 会在注册转换时失败。

## 小结

保留三个独立的概念：**机器允许修饰符**、**注册修饰符规则与代表物品**、**结构声明替换位置**。配方端再按需增加要求。对外实现只需 [Modifiers](../API/JavaAPI#modifiers)、[StructureConstraints](../API/JavaAPI#structureconstraints) 和 [RecipeDraft](../API/JavaAPI#recipedraft)，无需导入底层实现类型。
