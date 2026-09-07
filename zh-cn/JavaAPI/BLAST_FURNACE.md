---
title: BLAST_FURNACE
---

# BLAST_FURNACE — 高炉

本文是 MMCR 第一个 Java API 示例。我们逐行拆解 [BLAST_FURNACE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/builtin/BLAST_FURNACE.java) 的源代码，看看一台带并行控制器与工厂多线程的高炉是如何从三个 Java 文件搭起来的。

## 概览

高炉（BLAST_FURNACE）是一台能并行处理配方、并在多线程上同时跑多份配方的高炉型多方块机器。它在 MMCR 内置机器中的地位，类似"Hello, World!"之于编程语言——所有 MMCR API 的常见组合都在这里出现一次：

- 机器定义（启动期、ServiceLoader）
- 多方块结构（结构加载阶段、NeoForge 事件总线）
- 配方（配方加载阶段、NeoForge 事件总线）
- 并行控制器、多线程工厂

涉及的全部 API 在 API 参考中都有独立页面：

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
| `FactorySpec` | [链接](../API/JavaAPI#factoryspec) |
| `PortTiers` | [链接](../API/JavaAPI#porttiers) |

## 机器定义

打开 [BLAST_FURNACE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/builtin/BLAST_FURNACE.java)，第一段是注册 ID 与 `registerDefinitions(...)`：

```java
private static final Identifier BLAST_FURNACE = id("blast_furnace"); // equal to mmcr:blast_furnace

public static void registerDefinitions(MMCRMachineDefinationsEvent event) {
    if (!event.definitions().containsKey(BLAST_FURNACE)) {
        var machine = MachineBuilder
                .machine(BLAST_FURNACE)
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

`id("blast_furnace")` 是 MMCR 内置的辅助方法，等价于 `Identifier.fromNamespaceAndPath("mmcr", "blast_furnace")`——把当前命名空间默认填上，自己 mod 中应使用 `Identifier.fromNamespaceAndPath("my_mod", "...")`。

接下来 `MachineBuilder.machine(...)` 创建构建器，链式调用三件事：

- `displayNameKey("machine.mmcr.blast_furnace")`：声明本地化键。MMCR 会按 `命名空间:注册名` 自动生成翻译键兜底，但显式声明可以让所有翻译文件统一在一个命名空间。
- `allowMultithreading()`：启用多线程。这是高炉能同时处理多份配方的关键开关。
- `maxParallelism(Integer.MAX_VALUE)`：把并行上限设到 `int` 最大值。配合 `parallelizable(true)`，结构中放置并行控制器后同一配方可同时跑多份。
- `factory(factory -> factory.hasFactory(true).threadLimit(4))`：启用工厂并行，并把线程上限设为 4。

`build()` 终结构建，返回 `MachineDefinition`；`event.registerMachine(...)` 把它提交到注册窗口。`definitions().containsKey(...)` 用于幂等检查——同一 ID 重复提交会抛 `IllegalStateException`，幂等检查能让 `registerDefinitions(...)` 在被重复调用时安全跳过。

这段代码通过 [`BuiltInProvider.register(...)`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/provider/BuiltInProvider.java) 间接被调用，而 `BuiltInProvider` 又通过 `ServiceLoader` 被 MMCR 启动期发现。这就是机器定义阶段的完整路径：

1. MMCR 启动期调用 `ServiceLoader.load(MachineDefinitionProvider.class)`。
2. 加载到 `BuiltInProvider`，调用 `register(...)`。
3. `register(...)` 依次调用所有内置机器的 `registerDefinitions(...)`。
4. 高炉的 `registerDefinitions(...)` 把机器定义提交到事件。
5. 启动期结束，事件冻结。

如果你的 mod 只声明一台机器，可以直接让自己的类实现 `MachineDefinitionProvider` 并在 `META-INF/services` 里声明，不必套一层 `BuiltInProvider`。详见 [MachineDefinitionProvider](../API/JavaAPI#machinedefinitionprovider)。

## 多方块结构

接下来是结构注册。BLAST_FURNACE 的结构是一个 3×3×3 的多方块，外层是紫珀柱（基础方块），中心是控制器，内壁在不同面上分别支持并行控制器、物品 / 能量端口与熔炉：

```java
@SubscribeEvent
public static void registerStructures(MMCRMachineStructuresEvent event) {
    if (!event.structures().containsKey(BLAST_FURNACE)) {
        var structure = MachineStructureBuilder
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("AXA", "XIX", "XXX")
                                .layer("XXX", "I I", "XBX")
                                .layer("AXA", "XCX", "XXX")
                                .where('X', block(ModBlocks.CASING.get()))
                                .where('A', any(
                                        block(Blocks.IRON_BLOCK),
                                        InterfacePredicates.parallelControllers()
                                ))
                                .where('B', block(Blocks.FURNACE))
                                .where('I', any(
                                        InterfacePredicates.anyItemInput(),
                                        InterfacePredicates.anyItemOutput(),
                                        InterfacePredicates.anyEnergyInput()
                                ))
                                .controller('C'))
                        .portTiers(t -> t
                                .minEnergyInput(PortTiers.EnergyTier.NORMAL)
                                .minItemInput(PortTiers.ItemTier.NORMAL)
                                .anyItemOutput())
                )
                .build(BLAST_FURNACE);
        event.registerStructure(structure);
    }
}
```

`@SubscribeEvent` 是 NeoForge 事件总线订阅标识。MMCR 在结构加载阶段发布 `MMCRMachineStructuresEvent`，所有订阅该事件的 `@SubscribeEvent` 方法都会被调用。`@EventBusSubscriber` 让 MMCR 自动注册到你的 mod 事件总线，不需要手动 `bus.register(...)`。

模式本身用 9 个字符串铺成 3 个 z 层，每层 3 个 y 行；每个字符绑定一个 [`BlockPredicate`](../API/JavaAPI#blockpredicate)。把这一段拆开来读：

- `layer("AXA", "XIX", "XXX")`：`y = 0, 1, 2` 三行，`x` 列分别是 `A, X, A` / `X, I, X` / `X, X, X`。
- `layer("XXX", "I I", "XBX")`：中层。中间一行的空格表示不校验方块，这给玩家预留了"内部挖空"的可能性。
- `layer("AXA", "XCX", "XXX")`：顶层。`C` 是控制器。
- `.where('X', block(ModBlocks.CASING.get()))`：基础外壳。
- `.where('A', any(block(Blocks.IRON_BLOCK), InterfacePredicates.parallelControllers()))`：上层四个角允许铁块或并行控制器。也就是说，高炉的 4 个角既能摆装饰性的铁块，又能摆并行控制器以提高并行能力。
- `.where('B', block(Blocks.FURNACE))`：中层中间的 B 必须是熔炉，作为高炉的"炉心"语义。
- `.where('I', any(...anyItemInput(), ...anyItemOutput(), ...anyEnergyInput()))`：中层周边的 I 位置允许任意物品输入 / 输出或能量输入端口。
- `.controller('C')`：顶层中心的 C 是控制器方块位置。

`.portTiers(t -> t.minEnergyInput(NORMAL).minItemInput(NORMAL).anyItemOutput())` 声明端口的最低等级——能量输入与物品输入至少 NORMAL，物品输出可以是任意等级。`minEnergyInput` 等方法在 [`PortTiers`](../API/JavaAPI#porttiers) 里有完整列表。

`.build(BLAST_FURNACE)` 把结构与目标机器绑定起来，返回 `MachineStructureDefinition`。`event.registerStructure(...)` 把它提交给当前注册窗口。

模式层的字符与方块的对应关系、层高与列宽必须严格一致；细节见 [`PatternBuilder`](../API/JavaAPI#patternbuilder) 与 [`BlockPredicate`](../API/JavaAPI#blockpredicate)。

## 配方

最后是配方：

```java
@SubscribeEvent
public static void register(MMCRMachineRecipesEvent event) {
    var recipe = MachineRecipeBuilder
            .recipe(BLAST_FURNACE.withSuffix("_recipe_1"),BLAST_FURNACE)
            .inputItem(Ingredient.of(Items.IRON_INGOT),9)
            .outputItem(Items.IRON_NUGGET,10)
            .inputEnergy(20)
            .duration(240)
            .build();
    event.registerRecipe(recipe);
}
```

配方 ID `BLAST_FURNACE.withSuffix("_recipe_1")` 展开后是 `mmcr:blast_furnace_recipe_1`——配方 ID 命名上把机器 ID 作为前缀是好习惯，便于阅读与去重。

配方内容：

- `inputItem(Ingredient.of(Items.IRON_INGOT), 9)`：9 个铁锭。
- `outputItem(Items.IRON_NUGGET, 10)`：10 个铁粒。
- `inputEnergy(20)`：每 tick 消耗 20 FE。
- `duration(240)`：耗时 12 秒。

`build()` 返回 `MachineRecipeDefinition`。`event.registerRecipe(...)` 把配方提交到当前注册窗口——`MMCRMachineRecipesEvent` 接受多个配方，所以没有"是否已存在该机器的配方"这种概念，只看"是否已存在该配方 ID"。重复注册同一配方 ID 抛 `IllegalStateException`。

## 三个阶段的协作关系

BLAST_FURNACE 把三个阶段写在同一个类里：

1. `registerDefinitions(...)` 通过 `BuiltInProvider` 被 MMCR 启动期调用（间接通过 `ServiceLoader`）。
2. `registerStructures(...)` 通过 `@SubscribeEvent` 订阅 `MMCRMachineStructuresEvent`。
3. `register(...)` 通过 `@SubscribeEvent` 订阅 `MMCRMachineRecipesEvent`。

三个阶段按以下顺序触发：

```text
启动期
  → ServiceLoader 加载 MachineDefinitionProvider
  → MMCRMachineDefinationsEvent 注册机器定义（高炉）
  → 冻结机器定义
服务期
  → MMCRMachineStructuresEvent 注册多方块结构
  → 冻结结构
  → MMCRMachineRecipesEvent 注册配方
  → 冻结配方
```

结构与配方在生产构建中不可热加载——修改后必须重启游戏。机器定义窗口更严，启动期之后就再也打不开了。

## 小结

BLAST_FURNACE 的代码看起来很短，但它把 MMCR 的三阶段注册模型完整演示了一遍：

- 机器定义阶段用 [`MachineBuilder`](../API/JavaAPI#machinebuilder) + [`MachineDefinitionProvider`](../API/JavaAPI#machinedefinitionprovider) 提交机器属性；
- 结构阶段用 [`MachineStructureBuilder`](../API/JavaAPI#machinestructurebuilder) + [`StructureStage`](../API/JavaAPI#structurestage) + [`PatternBuilder`](../API/JavaAPI#patternbuilder) 声明多方块结构；
- 配方阶段用 [`MachineRecipeBuilder`](../API/JavaAPI#machinerecipebuilder) 声明配方；
- 接口与并行控制器通过 [`InterfacePredicates`](../API/JavaAPI#interfacepredicates) 与 [`FactorySpec`](../API/JavaAPI#factoryspec) 接入。

接下来可以阅读 [A_Simple_Machine](../KubeJS/A_Simple_Machine) 看同样的高炉在 KubeJS 端怎么实现，并对照 Java API 的 [`MachineBuilderJS`](../API/KubeJS#machinebuilderjs) 等对应方法。或者去 [API 参考](../API/开始) 浏览全部 API。