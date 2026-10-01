---
title: 太空电梯
order: 7
---

# 太空电梯

太空电梯与太空重组机演示 **HOST / MODULE 主机模块关系**、耦合器连接、有序配方池以及药水数据组件的匹配与输出。本文以 [SPACE.java（f234477b）](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/builtin/SPACE.java) 为准。

## 两台机器与六个用途不同的 ID

`SPACE.java` 只注册两台机器：

1. `SPACE_ELEVATOR`（`mmcr:space_elevator`）：`MachineKind.HOST` 主机。
2. `SPACE_REASSEMBLER`（`mmcr:space_reassembler`）：`MachineKind.MODULE` 模块。

`SPACE_MINER`（`mmcr:space_miner`）是**配方池 ID**，不是第三台机器，也没有独立机器控制器或结构。`SPACE_POOL_1/2/3` 同样只是重组机列出的额外配方池，本文件没有往这三个池注册配方。

## 入口与类型签名

| 类型 / 方法 | 签名与职责 | API 参考 |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)`；`build()` → `MachineSpec` | [参考](../API/JavaAPI#machinedraft) |
| `MachineKind` | `role(MachineKind)`，`NORMAL` / `HOST` / `MODULE` | [参考](../API/JavaAPI#machinekind) |
| `MachineDraft` | `acceptedModule(Identifier)`；`recipePool(Identifier...)` | [参考](../API/JavaAPI#machinedraft) |
| `AppearanceOptions` | `appearance(Consumer<AppearanceOptions>)` | [参考](../API/JavaAPI#appearanceoptions) |
| `Structures` / `StructureDraft` | `fullStructure(Consumer<StructureStageDraft>)`；`build(Identifier)` → `StructureSpec` | [参考](../API/JavaAPI#structuredraft) |
| `BlockConditions` | `coupler()` → `BlockCondition`；接口条件 | [参考](../API/JavaAPI#blockconditions) |
| `Recipes` / `RecipeDraft` | `requiredHost(Identifier)`；`build()` → `RecipeSpec` | [参考](../API/JavaAPI#recipedraft) |
| `ComponentConstraints` | `ofIds(Map<Identifier, ComponentCondition>)` | [参考](../API/JavaAPI#componentconstraints) |
| `ComponentConditions` | `exact(JsonElement)` → `ExactCondition` | [参考](../API/JavaAPI#componentconditions) |
| 注册事件 | `RegisterMachineDefinitionsEvent`、`RegisterMachineStructuresEvent`、`RegisterMachineRecipesEvent` | [定义](../API/JavaAPI#registermachinedefinitionsevent)、[结构](../API/JavaAPI#registermachinestructuresevent)、[配方](../API/JavaAPI#registermachinerecipesevent) |

## 机器定义

```java
private static final Identifier SPACE_ELEVATOR = id("space_elevator");
private static final Identifier SPACE_REASSEMBLER = id("space_reassembler");
private static final Identifier SPACE_MINER = id("space_miner");
private static final Identifier SPACE_POOL_1 = id("space_1");
private static final Identifier SPACE_POOL_2 = id("space_2");
private static final Identifier SPACE_POOL_3 = id("space_3");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(SPACE_ELEVATOR)
            && !event.definitions().containsKey(SPACE_REASSEMBLER)) {
        MachineSpec machine = Machines
                .machine(SPACE_ELEVATOR)
                .recipePool(SPACE_ELEVATOR)
                .displayNameKey("machine.mmcr.space_elevator")
                .appearance(a -> a
                        .machineBasicBlock("smooth_quartz")
                        .controllerBaseTexture(Identifier.parse("block/quartz_block_bottom"))
                        .formedPortBaseTexture(Identifier.parse("block/quartz_block_bottom"))
                )
                .role(MachineKind.HOST)
                .acceptedModule(SPACE_REASSEMBLER)
                .build();
        event.registerMachine(machine);

        machine = Machines
                .machine(SPACE_REASSEMBLER)
                .recipePool(SPACE_REASSEMBLER, SPACE_MINER, SPACE_POOL_1, SPACE_POOL_2, SPACE_POOL_3)
                .displayNameKey("machine.mmcr.space_reassembler")
                .appearance(a -> a.machineBasicBlock("quartz_pillar"))
                .allowMultithreading()
                .role(MachineKind.MODULE)
                .build();
        event.registerMachine(machine);
    }
}
```

### 主机接受关系与外观

电梯用平滑石英作主题方块；`controllerBaseTexture` 与 `formedPortBaseTexture` 指定控制器和成型端口的基础纹理，不是只替换某一个世界朝向的底面。纹理 ID 默认 `minecraft` 命名空间。

`role(MachineKind.HOST)` 配合 `acceptedModule(SPACE_REASSEMBLER)` 声明接受的模块机器 ID。主机必须有模块接受声明，非主机不能声明接受模块；这属于机器声明约束。它不等于“两个机器都注册后，`build()` 才会返回”：源码明确先构建、注册电梯，然后构建、注册重组机。

### 模块与有序配方池

重组机角色是 `MODULE`，列出五个有序配方池。配方池是机器查找加工规则的入口；一台模块机器可以访问多个池，配方通过自己的 `recipePool(...)` 选择所属池。`SPACE_MINER` 这个池因此能由重组机使用，并不要求存在一台名叫太空采矿机的机器。

源码的两个 ID 存在检查使用 `&&`：只有两台都不存在才注册。如果已有其中一台，会跳过整个块；它不是自动补齐缺失机器的逻辑。结构注册使用相同的成对检查方式。

## 两台机器的完整结构

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(SPACE_ELEVATOR)
            && !event.structures().containsKey(SPACE_REASSEMBLER)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer()
                                // ...省略
                                .where('X', block("minecraft:smooth_quartz"))
                                .where('A', block("minecraft:amethyst_block"))
                                .where('B', coupler())
                                .where('D', any(
                                        block("minecraft:smooth_quartz"),
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput(),
                                        BlockConditions.factoryController()
                                ))
                                .controller('E')
                        )
                )
                .build(SPACE_ELEVATOR);
        event.registerStructure(structure);

        structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("AAA", "XBX", "XBX", "XDX")
                                .layer("AAA", "BEB", "B B", "DDD")
                                .layer("AAA", "XFX", "XBX", "XDX")
                                .where('X', block("minecraft:quartz_pillar"))
                                .where('A', block("minecraft:amethyst_block"))
                                .where('B', any(
                                        block("minecraft:smooth_quartz"),
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput()
                                ))
                                .where('D', block("minecraft:glass"))
                                .where('E', coupler())
                                .controller('F')
                        )
                )
                .build(SPACE_REASSEMBLER);
        event.registerStructure(structure);
    }
}
```

### 耦合器与接口安装点

电梯有 17 个切片，每片 12 行、行宽 17；重组机有 3 个切片，每片 4 行、行宽 3。空白位置没有条件，表示忽略。每个模式各自只绑定一个控制器字符。

- 电梯 `B` 是 `BlockConditions.coupler()`，模块 `E` 也是 `coupler()`，为主机 / 模块连接提供物理锚点。
- 电梯 `D` 允许平滑石英、物品输入 / 输出、能量输入与**工厂控制器**；模块 `B` 允许平滑石英、物品输入 / 输出和能量输入。
- 耦合器条件只声明安装点，不能替代 `acceptedModule(...)` 的接受关系，也不能替代配方的 `requiredHost(...)` 要求。

`fullStructure(...)`、`pattern(...)` 使用 `Consumer` 配置库提供的草稿；最终两次 `build(machineId)` 分别产生 `StructureSpec`。

## 药水组件辅助方法

```java
private static ComponentConstraints potion(String potionId) {
    JsonObject contents = new JsonObject();
    contents.addProperty("potion", potionId);

    return ComponentConstraints.ofIds(Map.of(
            Identifier.parse("minecraft:potion_contents"),
            ComponentConditions.exact(contents)));
}
```

这不是注册一个新药水，而是构造原版 `potion_contents` 数据组件的精确约束。`ComponentConditions.exact(...)` 描述整个 JSON 值，`ComponentConstraints.ofIds(...)` 按组件 ID 组合约束。输入用于匹配，输出用于生成精确组件值；模糊条件不能作为输出数据。

## 三条完整配方

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(SPACE_REASSEMBLER.withSuffix("_space_reassembler_1"))
            .recipePool(SPACE_REASSEMBLER)
            .inputItem(Ingredient.of(Items.POTION), 1, potion("minecraft:water"), 1F)
            .outputItem(new ItemStack(Items.POTION), potion("minecraft:healing"))
            .inputEnergy(100)
            .parallelized(true)
            .duration(100)
            .requiredHost(SPACE_ELEVATOR)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(SPACE_REASSEMBLER.withSuffix("_space_miner_1"))
            .recipePool(SPACE_MINER)
            .inputItem(Items.APPLE, 1)
            .outputItem(Items.IRON_INGOT, 12)
            .inputEnergy(100)
            .parallelized(true)
            .duration(200)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(SPACE_ELEVATOR.withSuffix("_recipe_1"))
            .recipePool(SPACE_ELEVATOR)
            .inputItem(Items.APPLE, 1)
            .outputItem(Items.GOLDEN_APPLE, 3)
            .inputEnergy(100)
            .parallelized(true)
            .duration(1000)
            .build();
    event.registerRecipe(recipe);
}
```

| 配方 ID（省略命名空间） | 所属池 | 基础输入 → 输出 | 时间 | 主机要求 |
| --- | --- | --- | --- | --- |
| `space_reassembler_space_reassembler_1` | `space_reassembler` | 1 水瓶 → 1 治疗药水 | 100 tick（5 秒） | `space_elevator` |
| `space_reassembler_space_miner_1` | `space_miner` | 1 苹果 → 12 铁锭 | 200 tick（10 秒） | 未显式声明 |
| `space_elevator_recipe_1` | `space_elevator` | 1 苹果 → 3 金苹果 | 1000 tick（50 秒） | 未显式声明 |

三条基础能耗均为 100 FE/t，配方均声明 `parallelized(true)`。这只表示配方可参与并行，不能代替机器能力与控制器配置；源码并未为这两台机器显式开启 `parallelizable(true)`。

水瓶输入的最后一个 `1F` 是 `consumeChance`，即按 100% 消耗输入。输出使用全新的 `Items.POTION` 栈并附加治疗药水组件，不是把原输入栈原地改写。

`requiredHost(SPACE_ELEVATOR)` 是这条药水配方自身的主机限制。采矿池配方没有同样的调用，不能把药水配方的限制推给所有池中的规则；模块是否可运行仍受模块连接机制约束。

## 从声明到运行

1. **启动期**：电梯声明 `HOST` 并接受重组机 ID；重组机声明 `MODULE` 与有序配方池。
2. **结构期**：分别注册两个完整模式，耦合器为实际世界连接提供安装位置。
3. **搭建期**：主机与模块各自成型，并通过耦合器连接；声明接受关系不意味着世界里已经存在模块。
4. **运行期**：重组机在自己的池列表中寻找配方，按输入组件、材料、能量和主机要求等检查后加工。

## 延伸阅读

- [MachineKind](../API/JavaAPI#machinekind) / [MachineDraft](../API/JavaAPI#machinedraft)：主机、模块与接受关系。
- [BlockConditions](../API/JavaAPI#blockconditions)：耦合器和接口条件。
- [RecipeDraft](../API/JavaAPI#recipedraft)：配方池与主机要求。
- [ComponentConstraints](../API/JavaAPI#componentconstraints) / [ComponentConditions](../API/JavaAPI#componentconditions)：原版数据组件的精确匹配与输出。
