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
- Java 注解、函数式接口与流式 API（尤其是 `Consumer`）的基本用法。

### 工程要求

附属 Mod 在编译时需要公共 API，在运行时需要完整 MMCR Mod。目标工程应具备以下条件：

- 工程的 `modid` 已确定并固定。示例中假定 `modid` 为 `my_mod`。
- 使用 Java 25 工具链，并在 `src/main/resources/META-INF/neoforge.mods.toml` 声明 MMCR 为必需依赖。
- 已将 MMCR 通过 Maven 依赖添加到构建脚本中。

### 添加依赖

先在附属工程的 `build.gradle` 中指定工具链：

```groovy
java.toolchain.languageVersion = JavaLanguageVersion.of(25)
```

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

- `cn.howxu:<artifactId>:<发布版本>`：完整 Mod JAR，包含运行时实现、Mixin、资源等。
- `cn.howxu:<artifactId>:<发布版本>:api`：仅含 `cn/howxu/mmcr/publicapi/**/*.class` 的精简 JAR。它不包含底层 `api`、`internal` 或 KubeJS 实现，不能单独作为运行时 Mod。

通常使用 `compileOnly` 的 API 和 `runtimeOnly` 的本体。在附属工程的 `gradle.properties` 中先放入以下**待替换变量**：

```properties
# 必须从 Maven 实际发布记录填写，以下内容不是可解析的发布坐标
mmcr_maven_artifact=REPLACE_WITH_PUBLISHED_ARTIFACT_ID
mmcr_maven_version=REPLACE_WITH_PUBLISHED_26_1_2_VERSION
mmcr_mod_version_range=REPLACE_WITH_COMPATIBLE_MOD_VERSION_RANGE
```

然后引用这两个 Maven 变量：

```groovy
dependencies {
    compileOnly "cn.howxu:${mmcr_maven_artifact}:${mmcr_maven_version}:api"
    runtimeOnly "cn.howxu:${mmcr_maven_artifact}:${mmcr_maven_version}"
}
```

如果需要编译时使用完整本体，可以将上述两行改为：

```groovy
dependencies {
    implementation "cn.howxu:${mmcr_maven_artifact}:${mmcr_maven_version}"
}
```

版本与 artifactId 必须在 [Maven 仓库](https://maven.howxu.cn/) 核对，选择 Minecraft 26.1.2 对应且同时提供本体与 `api` 分类的发布。当前 [`publishing.gradle`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/gradle/scripts/publishing.gradle) 将 Maven 版本拼成 `${minecraft_version}-${mod_version}`，未显式设置 `artifactId`，它默认取 Gradle 的 `project.name`；本地源码目录名不能作为已发布 artifactId 的依据。

源码中的 `mod_version=0.0.0` 只是占位值。[正式发布工作流](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/.github/workflows/standard-release.yml) 用输入的 `X.Y.Z` 覆盖它；[开发发布工作流](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/.github/workflows/dev-release.yml) 使用 `X.Y.Z+dev-<短提交号>`。对应 Maven 版本形式为 `26.1.2-X.Y.Z` 或 `26.1.2-X.Y.Z+dev-<短提交号>`。这些是格式说明，不代表某个版本已经发布。

在附属 Mod 的 `neoforge.mods.toml` 中添加依赖（`my_mod` 替换为你的 modid）：

```toml
[[dependencies.my_mod]]
modId="mmcr"
type="required"
versionRange="${mmcr_mod_version_range}"
ordering="AFTER"
side="BOTH"
```

`mmcr_mod_version_range` 应填写兼容的 **Mod 元数据版本范围**，它与带 Minecraft 前缀的 Maven 版本不是同一个字段。请在工程现有的资源展开配置中加入该变量，再核对生成的 TOML；也可以直接把 `versionRange` 写成已经核实的范围。`ordering="AFTER"` 声明附属 Mod 在 MMCR 之后加载。依赖声明用于加载约束，不能替代事件监听器注册。

### Provider 与定义事件两种入口

本教程以 Provider 为主线：实现 `cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider`，再用 `ServiceLoader` 声明供 MMCR 发现。它适合将附属 Mod 的启动期定义集中到独立入口中：

- **依赖反转**：MMCR 不需要也无法感知具体 Mod 的入口类。只要一个类实现 `MachineDefinitionProvider` 接口，就可以作为定义入口。
- **多 Mod 隔离**：每个 Mod 独立提供自己的 Provider，互不耦合；MMCR 启动期统一遍历所有已声明的 Provider。
- **生命周期正确性**：MMCR 在机器定义注册窗口内遍历并调用 Provider。

**ServiceLoader 不是必需的唯一入口。**生产流程 [`StartupContentRegistration`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/registration/StartupContentRegistration.java) 先调用 Provider，再向 **`NeoForge.EVENT_BUS`** 发布 `RegisterMachineDefinitionsEvent`。你也可以直接订阅该事件来提交机器定义；此时无需 Provider 或 SPI 文件。两条路径共用注册窗口，不要重复提交同一个机器 ID。

结构与静态配方通过同一 NeoForge 游戏事件总线发布。这里的三个事件都不是附属 Mod 的 Mod 生命周期事件。

### 三个事件的顺序与关系

注册流程严格按以下顺序执行：

1. **机器定义**（`cn.howxu.mmcr.publicapi.event.RegisterMachineDefinitionsEvent`）：先调用 Provider，再发布定义事件，收集 `MachineSpec`，然后注册控制器。
2. **结构**（`cn.howxu.mmcr.publicapi.event.RegisterMachineStructuresEvent`）：控制器存在后发布，为已定义的机器提交 `StructureSpec`。
3. **静态配方**（`cn.howxu.mmcr.publicapi.event.RegisterMachineRecipesEvent`）：物品组件绑定后发布，收集 `RecipeSpec`。

这三个 Java 注册阶段都属于启动期声明，不会因 `/reload` 重新发布。声明收集后相应窗口被冻结，不能保留事件并在窗口关闭后继续注册；修改代码后需重新编译、重启游戏。

重复 ID、未知目标机器或冻结窗口中的提交会被公共注册层拒绝，并以 `cn.howxu.mmcr.publicapi.registration.RegistrationException` 报告。排查时先核对机器 ID、配方池 ID、注册阶段，以及是否同时启用了 Provider 与定义事件的同一份注册代码。

公共 API 使用 **draft/spec** 模型：`Machines.machine(...)`、`Structures.structure()`、`Recipes.recipe(...)` 分别返回可配置的 `MachineDraft`、`StructureDraft`、`RecipeDraft`，`build(...)` 生成 `MachineSpec`、`StructureSpec`、`RecipeSpec`，再由事件提交。`build()` 本身不注册。嵌套配置使用 `Consumer`，调用者不需要实现这些 draft 接口，也不需要接触底层构建器。

## 机器定义阶段

机器定义通过 `Machines` 创建 draft，并通过 Provider 或定义事件提交到 MMCR 的注册窗口。

### 1. 实现 Provider 类

新建 `MyFirstMachineProvider.java`，文件路径为：

```
src/main/java/com/example/myfirstmachine/MyFirstMachineProvider.java
```

主要内容如下：

```java
package com.example.myfirstmachine;

public final class MyFirstMachineProvider implements MachineDefinitionProvider {

    private static final Identifier MY_FIRST_MACHINE =
            Identifier.fromNamespaceAndPath("my_mod", "my_first_machine");

    @Override
    public void register(RegisterMachineDefinitionsEvent event) {
        MachineSpec definition = Machines
                .machine(MY_FIRST_MACHINE)
                .recipePool(MY_FIRST_MACHINE)
                .displayNameKey("machine.my_mod.my_first_machine")
                .appearance(a -> a.machineBasicBlock("minecraft:purpur_block"))
                .build();
        event.registerMachine(definition);
    }
}
```

### 2. 声明 ServiceLoader 文件

在资源目录下创建 `META-INF/services/` 目录，新建文件：

```
src/main/resources/META-INF/services/cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider
```

文件名必须为 `cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider`。

文件内容按行写入 Provider 类的全限定名：

```
com.example.myfirstmachine.MyFirstMachineProvider
```

MMCR 启动时遍历声明的 Provider，逐个调用 `register` 方法。Provider 应是可由 ServiceLoader 实例化的公共类，并具有公共无参构造器；上面的类使用隐式公共无参构造器即可。确认资源文件被打入附属 Mod 的 JAR。

### 3. 可选：改用定义事件

若更习惯事件订阅，可以不创建 SPI 文件，将以下方法加入后文的 `MyFirstMachineRegistrar` 类，用它替代 Provider 注册：

```java
@SubscribeEvent
public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    event.registerMachine(Machines.machine(MY_FIRST_MACHINE)
            .recipePool(MY_FIRST_MACHINE)
            .displayNameKey("machine.my_mod.my_first_machine")
            .appearance(a -> a.machineBasicBlock("minecraft:purpur_block"))
            .build());
}
```

此时补充导入 `cn.howxu.mmcr.publicapi.Machines` 与 `cn.howxu.mmcr.publicapi.event.RegisterMachineDefinitionsEvent`。监听器必须在 MMCR 发布定义事件之前就已注册；后文使用的自动订阅类用于这一点。

### 字段说明

示例中调用的接口含义：

- `MachineDefinitionProvider.register(RegisterMachineDefinitionsEvent)`：Provider 的启动期注册回调。
- `RegisterMachineDefinitionsEvent.definitions()`：返回已收集定义的只读快照，可用于检查 ID；不要用检查静默掩盖不同 Mod 的 ID 冲突。
- `RegisterMachineDefinitionsEvent.registerMachine(MachineSpec)`：提交机器声明。也可用 `registerMachine(Identifier, Consumer<MachineDraft>)` 在事件内直接配置。
- `Machines.machine(Identifier)`：以命名空间 ID 创建 `MachineDraft`。
- `MachineDraft.recipePool(Identifier...)`：声明机器使用的配方池。本教程让池 ID 与机器 ID 相同，但它们是不同概念，多个机器可以共享池。
- `MachineDraft.displayNameKey(String)`：设置本地化键，建议遵循 `machine.<命名空间>.<机器注册名>`。
- `MachineDraft.appearance(Consumer<AppearanceOptions>)`：配置基础外观；`AppearanceOptions.machineBasicBlock(String)` 设置外观方块 ID。
- `MachineDraft.build()`：生成不可变声明 `MachineSpec`。

未显式指定行为时，机器默认由配方驱动。公共 Java API 的 `build()` 加事件提交，对应 KubeJS 的 `createMachine(...).register()`。

## 结构阶段

结构在机器定义注册完成、控制器存在后，通过订阅 `RegisterMachineStructuresEvent` 提交。

### 1. 创建订阅类

新建 `MyFirstMachineRegistrar.java`，文件路径为：

```
src/main/java/com/example/myfirstmachine/MyFirstMachineRegistrar.java
```

文件内容如下：

```java
package com.example.myfirstmachine;

@EventBusSubscriber(modid = "my_mod")
public final class MyFirstMachineRegistrar {

    private static final Identifier MY_FIRST_MACHINE =
            Identifier.fromNamespaceAndPath("my_mod", "my_first_machine");

    @SubscribeEvent
    public static void registerStructures(RegisterMachineStructuresEvent event) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("XXX", "XHX", "XXX")
                                .layer("XHX", "HCH", "XHX")
                                .layer("XXX", "XHX", "XXX")
                                .where('X', BlockConditions.block(Blocks.PURPUR_PILLAR))
                                .where('H', BlockConditions.block(Blocks.PURPUR_PILLAR))
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

- `@EventBusSubscriber(modid = "my_mod")`：自动注册类中的静态订阅方法；本教程的事件发布于 `NeoForge.EVENT_BUS`，不要把它们挂到 Mod 生命周期总线。26.1.2 的注解用法无需添加旧版的 `bus` 参数。
- `RegisterMachineStructuresEvent.structures()`：返回当前已收集结构的只读快照。
- `RegisterMachineStructuresEvent.registerStructure(StructureSpec)`：提交结构；目标机器必须已定义。也支持 `registerStructure(Identifier, Consumer<StructureDraft>)`。
- `Structures.structure()`：创建 `StructureDraft`。
- `StructureDraft.fullStructure(Consumer<StructureStageDraft>)`：配置一个完整结构阶段；本例只需一个。
- `StructureStageDraft.pattern(Consumer<PatternDraft>)`：配置阶段内的模式。单阶段也可用 `StructureDraft.singlePattern(...)` 简写。
- `StructureDraft.build(Identifier)`：生成 `StructureSpec`，绑定到目标机器 ID。
- `PatternDraft.layer(String... rows)`：声明一个 z 层。同一次调用的字符串从下到上对应 y 行，每行字符对应 x 列。空格 `' '` 表示该位置不校验方块。
- `PatternDraft.where(char, BlockCondition)`：绑定字符与匹配条件。
- `PatternDraft.controller(char)`：指定控制器字符，整个模式必须恰好有一个控制器。
- `PatternDraft.build()`：可单独生成 `PatternSpec`；上述嵌套配置会在结构构建时完成模式构建。
- `BlockConditions.block(Block)`：创建直接匹配方块的条件。

所有 `layer(...)` 调用的字符串宽度必须一致，所有 z 层的 y 行数也必须一致。示例是 3×3×3 的结构，`C` 只出现一次，`H` 留作下一步的接口位置。

## 可替换接口

机械搭建完成后，若要接收物品与能量，必须在结构中预留可替换接口位置。公共 API 的 `BlockConditions` 提供内置接口族的匹配条件。

### 1. 修改模式绑定

将 `.where('H', BlockConditions.block(Blocks.PURPUR_PILLAR))` 修改为：

```java
.where('H', BlockConditions.any(
        BlockConditions.block(Blocks.PURPUR_PILLAR),
        BlockConditions.itemInput(),
        BlockConditions.itemOutput(),
        BlockConditions.energyInput()
))
```

修改完成后，重新编译并重启游戏。

### 2. 字段说明

示例中调用的接口含义：

- `BlockConditions.any(BlockCondition...)`：匹配任一子条件即可。
- `BlockConditions.itemInput()`：匹配内置物品输入接口族。
- `BlockConditions.itemOutput()`：匹配内置物品输出接口族。
- `BlockConditions.energyInput()`：匹配内置能量输入接口族。

保留紫珀柱条件后，未使用的 `H` 位置仍可填紫珀柱；至少将三个位置换成物品输入、物品输出、能量输入接口，才能运行后面的示例配方。

Java API 不支持运行时热重载接口绑定。修改谓词后必须重新编译并重启游戏。

## 配方阶段

静态配方通过订阅 `RegisterMachineRecipesEvent` 注册。一个配方池可以有多个配方，配方 ID 必须全局唯一；此处沿用机器定义已声明的池 `my_mod:my_first_machine`。

### 1. 扩展订阅类

在 `MyFirstMachineRegistrar.java` 同一类中追加订阅方法：

先补充导入：

```java
import cn.howxu.mmcr.publicapi.Recipes;
import cn.howxu.mmcr.publicapi.event.RegisterMachineRecipesEvent;
import cn.howxu.mmcr.publicapi.recipe.RecipeSpec;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.crafting.Ingredient;
```

```java
@SubscribeEvent
public static void registerRecipes(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(Identifier.fromNamespaceAndPath("my_mod", "my_first_machine_recipe_1"))
            .recipePool(MY_FIRST_MACHINE)
            .inputItem(Ingredient.of(Items.IRON_INGOT), 1)
            .outputItem(Items.IRON_NUGGET, 10)
            .inputEnergy(10)
            .duration(200)
            .build();
    event.registerRecipe(recipe);
}
```

### 字段说明

本示例中调用的接口含义：

- `RegisterMachineRecipesEvent.registerRecipe(RecipeSpec)`：提交配方，也可用 `registerRecipe(Identifier, Consumer<RecipeDraft>)`。避免重复 ID。
- `Recipes.recipe(Identifier)`：创建 `RecipeDraft`。
- `RecipeDraft.recipePool(Identifier)`：指定配方池；机器定义的 `.recipePool(...)` 必须包含该池才能使用这些配方。
- `RecipeDraft.inputItem(Ingredient, int)`：声明物品输入。
- `RecipeDraft.outputItem(Item, int)`：声明物品输出。
- `RecipeDraft.inputEnergy(long)`：声明每 tick 消耗的 FE；`iFEt(long)` 是同义快捷方法。
- `RecipeDraft.duration(int)`：配方总耗时（tick），必须为正整数。
- `RecipeDraft.build()`：生成 `RecipeSpec`。

### 2. 配方字段含义对照

| 字段 | 值 | 含义 |
| --- | --- | --- |
| `id` | `my_mod:my_first_machine_recipe_1` | 配方注册 ID |
| `recipePoolId` | `my_mod:my_first_machine` | 所属配方池 ID |
| `inputItem` | `IRON_INGOT × 1` | 消耗 1 个铁锭 |
| `outputItem` | `IRON_NUGGET × 10` | 产出 10 个铁粒 |
| `inputEnergy` | `10 FE/tick` | 每 tick 消耗 10 FE |
| `duration` | `200 tick` | 配方总耗时 10 秒 |

## 后续步骤

编译启动之前，先在附属 Mod 的 `src/main/resources/assets/my_mod/lang/zh_cn.json` 中添加翻译：

```json
{
    "machine.my_mod.my_first_machine": "我的第一台 MMCR 机械",
    "recipe_pool.my_mod.my_first_machine": "我的第一台 MMCR 机械",
    "item.mmcr.my_first_machine_controller": "我的第一台 MMCR 机械控制器",
    "block.mmcr.my_first_machine_controller": "我的第一台 MMCR 机械控制器"
}
```

机器名与配方池名是两组翻译键。当前默认生成的控制器由 MMCR 注册，其实际方块/物品 ID 为 `mmcr:my_first_machine_controller`，不要把它与机器 ID `my_mod:my_first_machine` 混为一谈。

完成编译并启动游戏后：

- 进入游戏后，使用 `/mmcr build my_mod:my_first_machine` 命令可快速搭建该机械。
- 安装 JEI 后可在合成表中查阅该配方。
- 为多方块机械放置输入输出接口，接入能源与材料后，机械将按配方驱动运转。