---
title: JavaAPI版
order: 4
---

<div align=center style="background: #fff; padding: 24px; border-radius: 8px;">
    <h1 style="color: black;">Oh My IDEA</h1>
</div>

## 一些准备

本节面向具备 NeoForge Mod 开发经验的读者，属于**有门槛**的内容。

在阅读之前，请确认已经熟悉以下前置知识：

- NeoForge Mod 的开发流程。
- `ServiceLoader` 机制(不需要特别懂)，以及编写 `META-INF` 目录下文件的能力。
- 了解并能使用 NeoForge 事件总线与 `@SubscribeEvent`、`@EventBusSubscriber`。
- Java 注解、函数式接口与流式 API（`UnaryOperator`、`Consumer`）的基本用法。

### 工程要求

Java API 没有任何硬性依赖，但要求目标工程具备以下条件：

- 工程的 `modid` 已确定并固定。示例中假定 `modid` 为 `my_mod`。
- 工程的 `mods.toml` 声明 MMCR 为必需依赖（`[[dependencies.${modid}]]` 段中包含 `modId="mmcr"` 且 `mandatory=true`），否则机器定义事件不会被发布到 MMCR 的事件总线。
- 已将 MMCR 通过 Maven 依赖添加到构建脚本中。

### 添加依赖

MMCR 的发布仓库托管于 [HowXu's Maven](https://maven.howxu.cn/)，使用前需先在 `build.gradle` 中声明仓库地址：

```groovy
repositories {
    maven {
        name = 'HowXu'
        url = 'https://maven.howxu.cn/' 
    }
}
```

随后按需声明 MMCR 依赖。MMCR 在仓库中以两个分类发布：

- `cn.howxu:ModularMachinery-Community-Refoxed:<version>`：完整 Mod JAR，包含运行时类、Mixin、资源等。
- `cn.howxu:ModularMachinery-Community-Refoxed:<version>:api`：仅含 `cn/howxu/mmcr/api/publicapi/**` 公共 API 的精简 JAR，无运行时类。

建议通常情况下使用 `compileOnly`的API 和 `runtimeOnly`的本体：

```groovy
dependencies {
    compileOnly "cn.howxu:ModularMachinery-Community-Refoxed:0.0.2+efa2122d:api"
    runtimeOnly "cn.howxu:ModularMachinery-Community-Refoxed:0.0.2+efa2122d"
}
```

如果你希望解锁更多更高级的功能，可以完全引入：

```groovy
dependencies {
    implementation "cn.howxu:ModularMachinery-Community-Refoxed:0.0.2+efa2122d"
}
```

版本号以仓库当前最新发布为准，可在 [https://maven.howxu.cn/](https://maven.howxu.cn/#/cn/howxu/ModularMachinery-Community-Refoxed) 浏览版本列表。本教程示例采用 `0.0.2+efa2122d`。

### 为什么使用 ServiceLoader

MMCR 的机器定义采用 `ServiceLoader` 进行发现，主要基于以下考量：

- **依赖反转**：MMCR 不需要也无法感知具体 Mod 的入口类。只要一个类实现 `MachineDefinitionProvider` 接口，就可以作为定义入口。
- **多 Mod 隔离**：每个 Mod 独立提供自己的 Provider，互不耦合；MMCR 启动期统一遍历所有已声明的 Provider。
- **生命周期正确性**：`ServiceLoader` 在 `ServiceLoader#load` 调用时实例化 Provider，确保机器定义事件发布时所有 Provider 都已可用。

结构与配方事件不属于 `ServiceLoader` 范畴，它们通过 NeoForge 事件总线发布，通过 `@SubscribeEvent` 订阅。

### 三个事件的顺序与关系

注册流程严格按以下顺序执行：

1. **机器定义**（`MMCRMachineDefinationsEvent`）：通过 `ServiceLoader` 调用所有 Provider，收集 `MachineDefinition`。该阶段**不可**热加载。
2. **结构**（`MMCRMachineStructuresEvent`）：通过 NeoForge 事件总线发布，订阅者向已定义的机器追加 `MachineStructureDefinition`。
3. **配方**（`MMCRMachineRecipesEvent`）：通过 NeoForge 事件总线发布，订阅者注册 `MachineRecipeDefinition`。

后两个阶段在对于Java API也是不可热加载的。所有内容一旦提交即被冻结，注册窗口关闭后再次注册会抛出 `IllegalStateException`。

## 机器定义阶段

机器定义通过 `MachineBuilder` 流式构建，并通过 `MachineDefinitionProvider` 接口 + `ServiceLoader` 提交到 MMCR 的注册窗口。

### 1. 实现 Provider 类

新建 `MyFirstMachineProvider.java`，文件路径为：

```
src/main/java/com/example/myfirstmachine/MyFirstMachineProvider.java
```

主要内容如下：

```java
/*
省略导入和包名
*/

public final class MyFirstMachineProvider implements MachineDefinitionProvider {

    private static final Identifier MY_FIRST_MACHINE =
            Identifier.fromNamespaceAndPath("my_mod", "my_first_machine");

    @Override
    public void register(MMCRMachineDefinationsEvent event) {
        // 选择性的冲突处理
        if (event.definitions().containsKey(MY_FIRST_MACHINE)) {
            return;
        }
        MachineDefinition definition = MachineBuilder
                .machine(MY_FIRST_MACHINE)
                .displayNameKey("machine.my_mod.my_first_machine")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:purpur_block")))
                .build();
        event.registerMachine(definition);
    }
}
```

### 2. 声明 ServiceLoader 文件

在资源目录下创建 `META-INF/services/` 目录，新建文件：

```
src/main/resources/META-INF/services/cn.howxu.mmcr.api.publicapi.MachineDefinitionProvider
```

文件名必须为`cn.howxu.mmcr.api.publicapi.MachineDefinitionProvider`

文件内容按行写入 Provider 类的全限定名：

```
com.example.myfirstmachine.MyFirstMachineProvider
```

MMCR 启动时会通过 `ServiceLoader.load(MachineDefinitionProvider.class)` 加载所有声明的 Provider，逐个调用 `register` 方法。

### 字段说明

示例中调用的接口含义：

- `MachineDefinitionProvider`：MMCR 的启动期扩展点接口。Provider 必须重写 `register(MMCRMachineDefinationsEvent)`，向事件提交机器定义。
- `MMCRMachineDefinationsEvent.definitions()`：返回当前已注册的机器定义映射，可用于幂等检查避免重复注册。
- `MMCRMachineDefinationsEvent.registerMachine(MachineDefinition)`：将机器定义提交到当前注册窗口。重复提交相同 ID 会抛出 `IllegalStateException`。
- `MachineBuilder.machine(Identifier)`：以命名空间 ID 创建机器构建器，返回 `MachineBuilder`。
- `MachineBuilder.displayNameKey(String)`：设置机器的本地化键名。建议遵循 `machine.<命名空间>.<机器注册名>` 惯例。
- `MachineBuilder.appearance(UnaryOperator<AppearanceSpec.Builder>)`：声明机器的基础外观方块，决定控制器方块在结构未成型时所呈现的纹理。
- `AppearanceSpec.Builder.machineBasicBlock(Identifier)`：设置外观方块 ID（如 `minecraft:purpur_block`）。
- `MachineBuilder.build()`：终结构建，返回不可变的 `MachineDefinition`。

未显式指定行为时，构建器默认使用 `RecipeBehavior.defaults()`，机械运转完全由配方数据驱动。与 KubeJS 版 `createMachine(...).register()` 等价。

## 结构阶段

结构在机器定义注册完成后，通过订阅 `MMCRMachineStructuresEvent` 提交。

### 1. 创建订阅类

新建 `MyFirstMachineRegistrar.java`，文件路径为：

```
src/main/java/com/example/myfirstmachine/MyFirstMachineRegistrar.java
```

文件内容如下：

```java
/*
省略导入和包名
*/

@EventBusSubscriber(modid = "my_mod")
public final class MyFirstMachineRegistrar {

    private static final Identifier MY_FIRST_MACHINE =
            Identifier.fromNamespaceAndPath("my_mod", "my_first_machine");

    @SubscribeEvent
    public static void registerStructures(MMCRMachineStructuresEvent event) {
        if (event.structures().containsKey(MY_FIRST_MACHINE)) {
            return;
        }
        MachineStructureDefinition structure = MachineStructureBuilder
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("XXX", "XHX", "XXX")
                                .layer("XHX", "HCH", "XHX")
                                .layer("XXX", "XHX", "XXX")
                                .where('X', block(Blocks.PURPUR_PILLAR))
                                .where('H', block(Blocks.PURPUR_PILLAR))
                                .controller('C')
                        )
                )
                .build(MY_FIRST_MACHINE);
        event.registerStructure(structure);
    }
}
```

### 2. 字段说明

示例中调用的接口含义：

- `@EventBusSubscriber(modid = "my_mod")`：将类中所有 `@SubscribeEvent` 方法注册到指定 mod 的事件总线，避免在主类手动注册订阅者。
- `MMCRMachineStructuresEvent.structures()`：返回当前已注册的结构映射。
- `MMCRMachineStructuresEvent.registerStructure(MachineStructureDefinition)`：将结构绑定到目标机器。若机器 ID 未在机器定义阶段声明过，会抛出 `ApiRegistrationException`。
- `MachineStructureBuilder.structure()`：创建结构构建器。
- `MachineStructureBuilder.fullStructure(UnaryOperator<StructureStage.Builder>)`：声明一个完整结构阶段。对于仅含单一模式的机器，只需声明一次 `fullStructure`。
- `StructureStage.Builder.pattern(UnaryOperator<PatternBuilder>)`：在阶段内声明匹配模式。
- `MachineStructureBuilder.build(Identifier)`：终结构建并绑定到目标机器 ID。
- `PatternBuilder.layer(String... rows)`：声明一个 z 层。同一参数列表的多个字符串按 `rowIndex` 顺序对应同一 z 层内从下到上的不同 y 行。同一字符串内的每个字符按 `columnIndex` 顺序对应同一行中的不同 x 位置。空格 `' '` 表示该位置不校验方块。
- `PatternBuilder.where(char symbol, BlockPredicate predicate)`：将字符绑定到方块匹配谓词。
- `PatternBuilder.controller(char symbol)`：指定控制器方块所在字符。该字符必须在整个结构中出现且仅出现一次。
- `PatternBuilder.build()`：终结构建并校验模式合法性。
- `BlockPredicate.block(Block)`：直接匹配方块实例。

所有 `layer(...)` 调用的字符串宽度必须一致，所有 z 层的 y 行数也必须一致，否则 `PatternBuilder.build()` 会抛出 `IllegalArgumentException`。

## 可替换接口

机械搭建完成后，若要接收物品与能量，必须在结构中预留可替换接口位置。MMCR 提供了 `InterfacePredicates` 静态方法，覆盖全部内置端口、控制器与升级总线的快捷谓词。

### 1. 修改模式绑定

将 `.where('H', block(Blocks.PURPUR_PILLAR))` 修改为：

```java
.where('H', any(
        InterfacePredicates.anyOfItemInput(),
        InterfacePredicates.anyOfItemOutput(),
        InterfacePredicates.anyOfEnergyInput()
))
```

修改完成后，重新编译并重启游戏。

### 2. 字段说明

示例中调用的接口含义：

- `BlockPredicate.any(BlockPredicate...)`：并集谓词，匹配任意一个子谓词即视为合法。
- `InterfacePredicates.anyOfItemInput()`：匹配全部内置物品输入端口方块。
- `InterfacePredicates.anyOfItemOutput()`：匹配全部内置物品输出端口方块。
- `InterfacePredicates.anyOfEnergyInput()`：匹配全部内置能量输入端口方块。

Java API 不支持运行时热重载接口绑定。修改谓词后必须重新编译并重启游戏。

## 配方阶段

配方通过订阅 `MMCRMachineRecipesEvent` 注册。一台机器可以注册多个配方，配方 ID 必须全局唯一。

### 1. 扩展订阅类

在 `MyFirstMachineRegistrar.java` 同一类中追加订阅方法：

```java
@SubscribeEvent
public static void registerRecipes(MMCRMachineRecipesEvent event) {
    MachineRecipeDefinition recipe = MachineRecipeBuilder
            .recipe(MY_FIRST_MACHINE.withSuffix("_recipe_1"), MY_FIRST_MACHINE)
            .inputItem(Ingredient.of(Items.IRON_INGOT), 1)
            .outputItem(Items.IRON_NUGGET, 10)
            .iFEt(10)
            .duration(200)
            .build();
    event.registerRecipe(recipe);
}
```

### 字段说明

本示例中调用的接口含义：

- `MMCRMachineRecipesEvent.registerRecipe(MachineRecipeDefinition)`：将配方提交到注册窗口。重复 ID 会抛出 `IllegalStateException`。
- `MachineRecipeBuilder.recipe(Identifier id, Identifier machineId)`：创建配方构建器，第一个参数为配方 ID，第二个参数为所属机器 ID。
- `MachineRecipeBuilder.inputItem(Ingredient, int)`：声明物品输入。
- `MachineRecipeBuilder.outputItem(Item, int)`：声明物品输出。
- `MachineRecipeBuilder.inputEnergy(long)`：声明每 tick 消耗的 FE 能量。
- `MachineRecipeBuilder.duration(int)`：配方总耗时（tick），必须为正整数。
- `MachineRecipeBuilder.build()`：终结构建，返回不可变的 `MachineRecipeDefinition`。

### 2. 配方字段含义对照

| 字段 | 值 | 含义 |
| --- | --- | --- |
| `id` | `my_mod:my_first_machine_recipe_1` | 配方注册 ID |
| `machineId` | `my_mod:my_first_machine` | 所属机器 ID |
| `inputItem` | `IRON_INGOT × 1` | 消耗 1 个铁锭 |
| `outputItem` | `IRON_NUGGET × 10` | 产出 10 个铁粒 |
| `iFEt` | `10 FE/tick` | 每 tick 消耗 10 FE |
| `duration` | `200 tick` | 配方总耗时 10 秒 |

## 后续步骤

完成编译并启动游戏后：

- 进入游戏后，使用 `/mmcr build my_mod:my_first_machine` 命令可快速搭建该机械。
- 安装 JEI 后可在合成表中查阅该配方。
- 为多方块机械放置输入输出接口，接入能源与材料后，机械将按配方驱动运转。