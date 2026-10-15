---
title: 高炉
order: 1
---

# 高炉

高炉（`BLAST_FURNACE`）是 MMCR Java API 的入门样板：机器定义、结构、配方分阶段注册，同时演示并行、多线程工厂和 JEI 工作站关联。
## 入口与类型签名

| 入口 / 类型 | 本例使用的签名与作用 | API 参考 |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)` 返回机器草稿；`build()` 返回 `MachineSpec` | [Machines](../API/JavaAPI#machines)、[MachineDraft](../API/JavaAPI#machinedraft) |
| `Structures` / `StructureDraft` | `structure()` 返回结构草稿；`build(Identifier)` 返回 `StructureSpec` | [Structures](../API/JavaAPI#structures)、[StructureDraft](../API/JavaAPI#structuredraft) |
| `Recipes` / `RecipeDraft` | `recipe(Identifier)` 返回配方草稿；`build()` 返回 `RecipeSpec` | [Recipes](../API/JavaAPI#recipes)、[RecipeDraft](../API/JavaAPI#recipedraft) |
| `MachineDefinitionProvider` | `register(RegisterMachineDefinitionsEvent)`，启动期 ServiceLoader 入口 | [参考](../API/JavaAPI#machinedefinitionprovider) |
| `RegisterMachineDefinitionsEvent` | `registerMachine(MachineSpec)` | [参考](../API/JavaAPI#registermachinedefinitionsevent) |
| `RegisterMachineStructuresEvent` | `registerStructure(StructureSpec)` | [参考](../API/JavaAPI#registermachinestructuresevent) |
| `RegisterMachineRecipesEvent` | `registerRecipe(RecipeSpec)` | [参考](../API/JavaAPI#registermachinerecipesevent) |
| `StructureStageDraft` / `PatternDraft` | `pattern(Consumer<PatternDraft>)`；`where(char, BlockCondition)` | [阶段](../API/JavaAPI#structurestagedraft)、[模式](../API/JavaAPI#patterndraft) |
| `BlockConditions` | 方块、接口和并集条件工厂，返回 `BlockCondition` | [参考](../API/JavaAPI#blockconditions) |
| `PortTierLimits` | `portTiers(Consumer<PortTierLimits.Builder>)` 的等级声明 | [参考](../API/JavaAPI#porttierlimits) |
| `FactoryOptions` | `factory(Consumer<FactoryOptions>)` 配置工厂线程 | [参考](../API/JavaAPI#factoryoptions) |
| `RegisterJeiWorkstationsEvent` | 为配方池或任意 JEI 配方类型关联工作站 | [参考](../API/JavaAPI#registerjeiworkstationsevent) |

`controller(...)`、`factory(...)`、`fullStructure(...)`、`pattern(...)` 等回调接受的是 `Consumer`，用于立即配置已有草稿，不要求回传另一个构建器。下面的表达式 lambda 可以直接使用；改成 `{ ... }` 形式时不写 `return`。

## 机器定义

```java
private static final Identifier BLAST_FURNACE = id("blast_furnace");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(BLAST_FURNACE)) {
        MachineSpec machine = Machines
                .machine(BLAST_FURNACE)
                .recipePool(BLAST_FURNACE)
                .displayNameKey("machine.mmcr.blast_furnace")
                .allowMultithreading()
                .maxParallelism(Integer.MAX_VALUE)
                .parallelizable(true)
                .factory(factory -> factory.hasFactory(true).threadLimit(4))
                .build();
        event.registerMachine(machine);
    }
}
```

- `id("blast_furnace")` 来自 `publicapi.ApiIds`，展开为 `mmcr:blast_furnace`。附属 mod 应使用自己的命名空间，例如 `Identifier.fromNamespaceAndPath("my_mod", "blast_furnace")`。
- `recipePool(BLAST_FURNACE)` 显式把机器绑定到高炉配方池。机器 ID、池 ID、配方 ID 是不同用途的标识符，即使前两者在本例中相同。
- `displayNameKey(...)` 声明本地化键。
- `parallelizable(true)` 允许并行，`maxParallelism(Integer.MAX_VALUE)` 声明机器侧上限；实际并行还取决于配方、并行控制器与可用资源。
- `allowMultithreading()` 配合 `factory(...hasFactory(true).threadLimit(4))` 启用工厂多线程，线程上限为 4。并行处理同一配方的多份材料，多线程则调度独立配方任务。

`build()` 返回 `MachineSpec`，再提交给 `event.registerMachine(...)`。`definitions().containsKey(...)` 防止同一机器 ID 被重复注册。

内置的 [BuiltInProvider](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/provider/BuiltInProvider.java) 实现 `publicapi.registration.MachineDefinitionProvider`，由启动期 ServiceLoader 发现，并调用本方法。自己的 provider 对应服务文件为 `META-INF/services/cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider`，内容写 provider 的完整类名。启动定义需要先于控制器方块注册完成，不能把这段挪到启动过程后续的结构事件窗口里。

## 多方块结构

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(BLAST_FURNACE)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("AXA", "XIX", "XXX")
                                .layer("XXX", "I I", "XBX")
                                .layer("AXA", "XCX", "XXX")
                                .where('X', block("mmcr:casing"))
                                .where('A', any(
                                        block(Blocks.IRON_BLOCK),
                                        BlockConditions.parallelControllers()
                                ))
                                .where('B', block(Blocks.FURNACE))
                                .where('I', any(
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput()
                                ))
                                .controller('C'))
                        .portTiers(t -> t
                                .minEnergyInput(PortTierLimits.EnergyTier.NORMAL)
                                .minItemInput(PortTierLimits.ItemTier.NORMAL)
                                .anyItemOutput())
                )
                .build(BLAST_FURNACE);
        event.registerStructure(structure);
    }
}
```

`@EventBusSubscriber` 配合 `@SubscribeEvent` 订阅 NeoForge 游戏事件总线上的注册事件；不是把 MMCR 结构事件订阅到 mod 生命周期总线。

三个 `layer(...)` 构成三个模式切片，每个切片 3 行、每行 3 列。层、行和列是模式本地坐标，世界中的摆放会依据控制器朝向转换，不能仅凭代码行序判断某行是世界里的顶层。

| 字符 | 条件 | 用途 |
| --- | --- | --- |
| `X` | `block("mmcr:casing")` | 外壳，通过注册 ID 引用，教程无需导入内部 `ModBlocks` |
| `A` | 铁块或 `parallelControllers()` | 四个可替换位置，提供并行控制器安装点 |
| `B` | 原版熔炉 | 固定炉心 |
| `I` | `itemInput()` / `itemOutput()` / `energyInput()` | 接口安装点，条件只决定哪些方块可放 |
| `C` | `controller('C')` | 绑定本机器控制器，在模式中只出现一次 |
| 空格 | 未绑定条件 | 忽略该位置，不等于要求空气 |

`portTiers(...)` 另外声明物品输入、能量输入至少 `NORMAL`，物品输出不限等级。方块允许条件与端口等级要求是两个层次：能放某类接口不代表低等级接口能满足运行要求。`anyItemOutput()` 不会把额外位置变成端口槽位。

每层的行数、每行的宽度必须一致；字符条件见 [BlockConditions](../API/JavaAPI#blockconditions)。`build(BLAST_FURNACE)` 返回绑定到高炉的 `StructureSpec`。

## 两条配方

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(BLAST_FURNACE.withSuffix("_recipe_1"))
            .recipePool(BLAST_FURNACE)
            .inputItem(Ingredient.of(Items.IRON_INGOT), 9)
            .outputItem(Items.IRON_NUGGET, 10)
            .inputEnergy(20)
            .duration(240)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(BLAST_FURNACE.withSuffix("_recipe_2"))
            .recipePool(BLAST_FURNACE)
            .inputItem(Ingredient.of(Items.GOLD_INGOT), 9)
            .outputItem(Items.GOLD_NUGGET, 10)
            .inputEnergy(20)
            .duration(240)
            .build();
    event.registerRecipe(recipe);
}
```

| 配方 ID | 输入 | 输出 | 能耗 | 基础时间 |
| --- | --- | --- | --- | --- |
| `mmcr:blast_furnace_recipe_1` | 9 铁锭 | 10 铁粒 | 20 FE/t | 240 tick（12 秒） |
| `mmcr:blast_furnace_recipe_2` | 9 金锭 | 10 金粒 | 20 FE/t | 240 tick（12 秒） |

`Recipes.recipe(...)` 接受配方 ID，`recipePool(...)` 决定配方所属池，`build()` 返回 `RecipeSpec`。不能用 `event.recipes().containsKey(BLAST_FURNACE)` 判断机器是否已有配方：一个池可以有多条配方，重复检查应针对完整配方 ID。

## JEI 工作站

高炉还演示两种方向不同的工作站关联：

```java
@SubscribeEvent
public static void registerWorkstations(RegisterJeiWorkstationsEvent event) {
    event.addRecipePoolWorkstation(BLAST_FURNACE, Blocks.BLAST_FURNACE);
    event.addMachineWorkstation(
            BLAST_FURNACE,
            Identifier.parse("minecraft:smelting")
    );
}
```

1. `addRecipePoolWorkstation(poolId, item)`：把原版高炉作为 `mmcr:blast_furnace` 配方池页面的工作站。
2. `addMachineWorkstation(machineId, recipeTypeId)`：把 MMCR 高炉机器的控制器作为 `minecraft:smelting` 这个 JEI 配方类型的工作站。

这只是客户端 JEI 页面关联，不会把原版熔炼配方自动注册进高炉配方池，也不会改变机器加工逻辑。

## 三个注册阶段如何协作

```text
启动过程：定义窗口
  → ServiceLoader 调用 MachineDefinitionProvider
  → RegisterMachineDefinitionsEvent 接收 MachineSpec
  → 冻结定义，供控制器方块注册使用
启动过程：后续结构与配方窗口
  → RegisterMachineStructuresEvent 接收 StructureSpec
  → RegisterMachineRecipesEvent 接收 RecipeSpec
客户端 JEI 注册
  → RegisterJeiWorkstationsEvent 关联工作站
```

机器定义也有启动期事件订阅扩展点；本例选择 provider 调用 `registerDefinitions(...)`。定义、结构与 Java 配方都在启动过程中收集，三个事件均发布到 `NeoForge.EVENT_BUS`；结构与配方分别提交到自己的窗口，不应跨阶段注册。Java 注册声明不是脚本热重载入口。

## 小结

- 机器属性走 [Machines / MachineDraft](../API/JavaAPI#machinedraft)，结果是 `MachineSpec`。
- 模式与要求走 [Structures / StructureDraft](../API/JavaAPI#structuredraft)，结果是 `StructureSpec`。
- 两条加工规则走 [Recipes / RecipeDraft](../API/JavaAPI#recipedraft)，结果是 `RecipeSpec`。
- 接口条件使用 `BlockConditions`，等级要求使用 `PortTierLimits`，工厂配置使用 `FactoryOptions`。
- JEI 工作站关联独立于机器配方注册。
