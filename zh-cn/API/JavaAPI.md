---
title: JavaAPI
---

# Java 公共 API 参考

本页集中列出 Java 公共层的入口、声明、运行时视图和扩展契约。文中的签名以该提交的实现为准，不代表某个尚未确认的 Maven 发布版本。

端口数量与等级约束部分已按提交 [`c2563c41`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/commit/c2563c4110cd15bad0218dc4fa5a4f091fbccc87) 更新，包含 Mekanism 化学品、放射性化学品与热量端口；其余章节仍以 `f234477b` 为基准。

## 包路径与边界

公共 API 根包为 **`cn.howxu.mmcr.publicapi`**。下文每节注明包名；节内的简单类型名与该包拼接即为完整类名，嵌套类型按 `外层类型.内层类型` 引用。签名块省略 import 和实现体；接口方法隐含 `public`，工厂方法标明 `static`，可空值用 `@Nullable` 标出。

| 包（均以 `cn.howxu.mmcr.publicapi` 为前缀） | 内容 |
| --- | --- |
| root | `Machines`、`Structures`、`Recipes`、`ApiIds`、`ReadableNumber` |
| `registration` `event` | 注册窗口、注册器、定义 Provider、注册异常 |
| `machine` | 机器声明、控制器/外观/工厂选项、智能接口 |
| `structure` `structure.level` | 模式、阶段、端口约束、等级与槽位 |
| `recipe` `recipe.requirement` | 配方、IO 值、需求、输出扩展 |
| `recipe.component` `recipe.modifier` | 数据组件条件、修饰符 |
| `recipe.extension` | 规划、能力读取、预留、事务操作、同步 Codec |
| `behavior` `runtime` | 行为钩子、上下文、IO 快照和事务、运行状态 |
| `data` `network` | 数据值/存储/仓库契约、排队请求 |
| `presentation` | 控制器文本、Jade 文本、IO 展示 |
| `client.render` `client.jei` | 客户端渲染与 JEI 注册 |

[`apiJar` 的包含规则](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/gradle/scripts/publishing.gradle)仅为 `cn/howxu/mmcr/publicapi/**/*.class`。Minecraft、NeoForge、Gson、Mojang Codec 等签名依赖仍需由调用方的开发环境提供。

`cn.howxu.mmcr.api` 是底层能力、注册和执行实现，`cn.howxu.mmcr.internal.api.facade` 是适配层，均不属于这个公共 jar。公共层没有暴露底层控制器方块实体、能力注册表、facet 注册、`bridgeValue()` 或内部转换入口。KubeJS 直接使用底层 API。

### 对象所有权与扩展规则

- `Draft`、`Options`、`Spec`、`View`、注册器等标有 `@ApiStatus.NonExtendable` 的接口由 MMCR 创建。通过工厂或回调取得，**不要自行实现、继承或强转到底层类型**。
- `Draft` 是可变配置句柄，链式方法返回当前句柄；`build()` 产生声明视图，并不等于注册。注册回调内部由 MMCR 自动构建，不要求回调返回构建器。
- `Spec` 是声明视图；运行中的配方使用 `RecipeView`，机器使用 `MachineView`。它们不是可用 `new` 构造的公共 record。
- 真正可由附属 Mod 实现的 SPI 包括 `MachineDefinitionProvider`、行为/网络/文本/渲染回调、`Repository`、`Reservation`、`RequirementExtension`、`RequirementExecution`、`OutputExtension`、`RecipeOperation`、`OperationPlanner`、`ReservationPlanner`、`SyncPayloadCodec`。
- 公共 record 用于明确的数据载体，例如 `RepositoryContext`、`RepositoryRequest`、`ResourceAmount`、`HeatState` 和扩展规划结果。

## 1. 注册事件与 Provider

`cn.howxu.mmcr.publicapi.registration` 与 `cn.howxu.mmcr.publicapi.event`

启动按**机器定义 → 结构 → 配方**收集。结构与 Java/KubeJS 共用底层收集器；同一机器结构不能在两端重复提交。注册窗口由 MMCR 关闭，公共注册器和事件不暴露 `freeze()`、`prepare()`、`current()`、`resetCollector()`。

### `MachineDefinitionProvider`

完整类名：`cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider`。

```java
public interface MachineDefinitionProvider {
    void register(RegisterMachineDefinitionsEvent event);
}
```

定义注册需要实现 Provider。生产启动先调用 `ServiceLoader.load(MachineDefinitionProvider)` 中的 Provider，随后注册动态控制器并冻结窗口。不要在两条路径中重复提交同一 ID。

Provider 示例：

```java
public final class MyMachinesProvider implements MachineDefinitionProvider {
    public static final Identifier MACHINE =
            Identifier.fromNamespaceAndPath("my_mod", "my_machine");

    @Override
    public void register(RegisterMachineDefinitionsEvent event) {
        event.registerMachine(MACHINE, machine -> machine
                .displayNameKey("machine.my_mod.my_machine")
                .recipePool(Identifier.fromNamespaceAndPath("my_mod", "shared_pool")));
    }
}
```

资源文件 `META-INF/services/cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider` 每行填写实现类全名：

```text
com.example.MyMachinesProvider
```

Provider 只收集定义，结构和配方仍在各自事件中注册。启动声明变更需要重启游戏。

源码：[Provider](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/registration/MachineDefinitionProvider.java)、[生产启动顺序](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/registration/StartupContentRegistration.java)。

### `RegisterMachineDefinitionsEvent` 与 `MachineRegistrar`

```java
// event.RegisterMachineDefinitionsEvent extends net.neoforged.bus.api.Event
public RegisterMachineDefinitionsEvent();
public RegisterMachineDefinitionsEvent(MachineRegistrar registrar);
public MachineRegistrar registrar();
public void registerMachine(Identifier id, Consumer<MachineDraft> configuration);
public void registerMachine(MachineSpec definition);
public Map<Identifier, MachineSpec> definitions();

// registration.MachineRegistrar
void registerMachine(Identifier id, Consumer<MachineDraft> configuration);
void registerMachine(MachineSpec definition);
Map<Identifier, MachineSpec> definitions();
```

回调方式自动执行构建；直接方式接受 `Machines.machine(id)...build()` 产生的 `MachineSpec`。`definitions()` 返回不可变映射快照，可用于检查已有 ID，但不要借此默默覆盖别的 Mod 的声明。事件的公开构造器不表示可以自行创建窗口并让生产注册系统采用它。

### `RegisterMachineStructuresEvent` 与 `StructureRegistrar`

```java
// event.RegisterMachineStructuresEvent extends Event
public RegisterMachineStructuresEvent(Collection<Identifier> machineIds);
public RegisterMachineStructuresEvent(StructureRegistrar registrar);
public StructureRegistrar registrar();
public void registerStructure(Identifier id, Consumer<StructureDraft> configuration);
public void registerStructure(StructureSpec structure);
public void registerLevelType(LevelTypeSpec type);
public void registerLevel(MachineLevelSpec level);
public void registerModifier(Identifier id, ModifierBundle modifier);
public void registerModifierItem(ItemStack stack, Identifier modifierId);
public Map<Identifier, StructureSpec> structures();
public Map<Identifier, LevelTypeSpec> levelTypes();
public Map<Identifier, MachineLevelSpec> levels();
public Map<Identifier, ModifierBundle> modifiers();
public Map<Identifier, List<ItemStack>> modifierItems();

// registration.StructureRegistrar：与事件的注册/查询方法同名同签名
void registerStructure(Identifier machineId, Consumer<StructureDraft> configuration);
void registerStructure(StructureSpec structure);
void registerLevelType(LevelTypeSpec type);
void registerLevel(MachineLevelSpec level);
void registerModifier(Identifier id, ModifierBundle modifier);
void registerModifierItem(ItemStack stack, Identifier modifierId);
Map<Identifier, StructureSpec> structures();
Map<Identifier, LevelTypeSpec> levelTypes();
Map<Identifier, MachineLevelSpec> levels();
Map<Identifier, ModifierBundle> modifiers();
Map<Identifier, List<ItemStack>> modifierItems();
```

机器 ID 必须在定义阶段声明，一台机器只能提交一个结构。注册等级前先注册等级类型。修饰符物品绑定保留组件、将数量归一化为 1。窗口结束时还会校验等级槽位引用、修饰符替换和物品绑定是否引用已注册声明。

### `RegisterMachineRecipesEvent` 与 `RecipeRegistrar`

```java
// event.RegisterMachineRecipesEvent extends Event
public RegisterMachineRecipesEvent();
public RegisterMachineRecipesEvent(RecipeRegistrar registrar);
public RecipeRegistrar registrar();
public void registerRecipe(RecipeSpec recipe);
public void registerRecipe(Identifier id, Consumer<RecipeDraft> configuration);
public Map<Identifier, RecipeSpec> recipes();

// registration.RecipeRegistrar
void registerRecipe(RecipeSpec recipe);
void registerRecipe(Identifier id, Consumer<RecipeDraft> configuration);
Map<Identifier, RecipeSpec> recipes();
```

配方 ID 全局唯一；配方必须声明一个配方池。`recipes()` 是不可变声明快照，不是运行中的合成列表。客户端渲染和 JEI 的三个注册事件见后文。

### `RegistrationException`

```java
public final class RegistrationException extends IllegalStateException {
    public RegistrationException(String message);
    public RegistrationException(String message, Throwable cause);
}
```

公共适配层将注册窗口拒绝、重复声明等底层 `IllegalStateException` 转换为该异常；已是 `RegistrationException` 的错误保留。空参数仍可能抛 `NullPointerException`，非法声明参数仍可能抛 `IllegalArgumentException`；不要将所有错误一概描述成同一种异常。构建失败或校验失败应修正声明，而不是在关闭窗口后重试。

## 2. 顶层入口

`cn.howxu.mmcr.publicapi`

### `Machines`

```java
public static boolean isRegistrationOpen();
public static MachineDraft machine(Identifier id);
```

创建机器声明草稿；`id` 不能为 `null`。`isRegistrationOpen()` 查询定义注册状态，不负责开启窗口。

### `Structures`

```java
public static StructureDraft structure();
public static PatternDraft pattern();
public static StructureStageDraft stage();
```

结构、模式和单个阶段的工厂入口。**模式入口是 `Structures.pattern()`**；该提交没有独立的 `Patterns` 类型。

### `Recipes`

```java
public static boolean isRegistrationOpen();
public static RecipeDraft recipe(Identifier id);
```

查询配方声明窗口，或创建草稿。`recipe(null)` 抛 `IllegalArgumentException`。创建草稿与提交到注册器是两件事。

### `ApiIds`

```java
public static Identifier id(String path);
```

产生 **`mmcr` 命名空间**的 ID。附属 Mod 自己的 ID 应使用 `Identifier.fromNamespaceAndPath("my_mod", "...")`，不要误用该工厂。

### `ReadableNumber`

```java
public static String format(int value);
public static String format(long value);
public static String format(BigInteger value);
public static String format(BigDecimal value);
public static String formatExact(long value);
public static String formatCompact(int value);
public static String formatCompact(long value);
public static String formatCompact(BigInteger value);
public static String formatCompact(BigDecimal value);
public static String formatForSlot(long value, int scale, String unit);
```

用于可读数字和槽位显示。`formatForSlot` 接受缩放精度及单位；返回的是展示字符串，不能作为存储数值或反向解析协议。大整数/小数应直接传 `BigInteger`/`BigDecimal`，避免先转换成 `double` 丢精度。

## 3. 机器声明

`cn.howxu.mmcr.publicapi.machine`

### `MachineDraft`

由 `Machines.machine(id)` 或定义事件回调提供。

```java
MachineDraft displayNameKey(String key);
MachineDraft recipePool(Identifier... ids);
MachineDraft controller(Consumer<ControllerOptions> configure);
MachineDraft appearance(Consumer<AppearanceOptions> configure);
MachineDraft factory(Consumer<FactoryOptions> configure);
MachineDraft recipeBehavior(Consumer<RecipeHooks> configure);
MachineDraft tickBehavior(Consumer<TickHooks> configure);
MachineDraft preServerTick(Consumer<MachineContext> callback);
MachineDraft postServerTick(Consumer<MachineContext> callback);
MachineDraft role(MachineKind kind);
MachineDraft acceptedModule(Identifier id);
MachineDraft networkInterface(int maxCount, int maxConnections);
MachineDraft allowNetworkMachine(Identifier id);
MachineDraft maxParallelism(long amount);
MachineDraft parallelizable(boolean enabled);
MachineDraft allowModifiers();
MachineDraft allowModifiers(boolean enabled);
MachineDraft allowMultithreading();
MachineDraft allowMultithreading(boolean enabled);
MachineDraft maxParallelAmount(int amount);
MachineDraft smartInterface(SmartInterfaceSpec type);
MachineDraft shareSmartInterfaces();
MachineDraft shareSmartInterfaces(boolean enabled);
MachineDraft smartInterfaceModifier(SmartModifierSpec modifier);
MachineDraft runningSound(Identifier id);
MachineDraft finishSound(Identifier id);
MachineDraft failureAction(RecipeFailureMode mode);
MachineDraft requestProcess(Identifier id, RequestHandler handler);
MachineDraft requestFailed(Identifier id, FailureHandler handler);
MachineSpec build();
```

| 配置 | 语义与约束 |
| --- | --- |
| `displayNameKey` | 本地化键；不设置时使用 `machine.<namespace>.<path>`。 |
| `recipePool` | 有序、非空、无重复的配方池列表；不设置时仅使用机器 ID。每条配方仍只属于一个池。 |
| `controller` / `appearance` / `factory` | 每次传入新选项构建器并自动构建，重复调用会替换相应规格。 |
| `recipeBehavior` / `tickBehavior` | 选择当前行为模式；后一次模式配置可替换前一次。顶层 pre/post tick 钩子只适用于配方模式。 |
| `maxParallelism` / `maxParallelAmount` | 均须正数；前者在最终声明构建时校验，后者在设置时校验。 |
| `parallelizable` | 配方并行能力，与工厂的多个工作线程不是同一概念。 |
| `allowMultithreading` / `factory` | 声明多线程调度能力与工厂线程规格；不是要求附属 Mod 自己开启 Java 线程。 |
| `allowModifiers` | 允许机器修饰符。 |
| `smartInterface` | 类型名重复抛 `IllegalArgumentException`。 |
| `shareSmartInterfaces` | 允许多个相同机器控制器绑定并共享同一智能接口方块的值，不是工厂线程共享开关。 |
| `requestProcess` / `requestFailed` | 相应映射中的请求 ID 重复会抛 `IllegalArgumentException`，不会“最后一次覆盖”。 |
| `runningSound` / `finishSound` | 可选声音资源 ID。 |

默认：普通机器 `NORMAL`；并行上限 `1L`、并行数量 `1`；并行、修饰符、多线程、接口共享均关闭；网络关闭；默认配方行为；失败模式 `STILL`；声音未设置。`HOST` 必须声明至少一个接受模块，其他角色不能声明接受模块，否则构建抛 `IllegalStateException`。不要在线程间共享草稿。

顶层 pre/post 钩子已存在时配置 tick 模式会失败；当前为 tick 模式时添加顶层 pre/post 钩子也会失败。不能把这一限制扩写为“两个模式的配置方法在任何调用顺序下都互相抛错”。

源码：[公共签名](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/machine/MachineDraft.java)、[底层构建和默认值](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/MachineBuilder.java)。

### `MachineSpec`

由 `build()` 返回，或从 `definitions()` 读取。声明集合只读；行为字段以钩子存在性视图表示。

```java
Identifier id();
List<Identifier> recipePoolIds();
Identifier recipePoolId();
String displayNameKey();
ControllerOptions.View controller();
AppearanceOptions.View appearance();
FactoryOptions.View factory();
MachineKind role();
Set<Identifier> acceptedModuleIds();
NetworkSettings networkInterface();
long maxParallelism();
int maxParallelAmount();
boolean parallelizable();
boolean allowModifiers();
boolean allowMultithreading();
boolean shareSmartInterfaces();
RecipeFailureMode failureAction();
Map<String, SmartInterfaceSpec> smartInterfaceTypes();
List<SmartModifierSpec> smartInterfaceModifiers();
@Nullable Identifier runningSoundId();
@Nullable Identifier finishSoundId();
Optional<RecipeHooksView> recipeHooks();
Optional<TickHooksView> tickHooks();
Set<Identifier> requestProcessorIds();
Set<Identifier> requestFailureIds();
Map<Identifier, RequestHandler> requestProcessors();
Map<Identifier, FailureHandler> requestFailures();

// MachineSpec.RecipeHooksView
boolean hasIdleStart();
boolean hasIdleEnd();
boolean hasBeforeStart();
boolean hasRecipeTick();
boolean hasBeforeFinish();
boolean hasPreServerTick();
boolean hasPostServerTick();

// MachineSpec.TickHooksView
boolean hasServerTick();
```

`recipePoolId()` 返回有序池列表的第一个 ID。`recipeHooks()` 与 `tickHooks()` 区分实际行为模式；存在性标志反映是否真正配置了回调，显式空回调也算已配置。结构通过 `StructureSpec` 单独声明，这里没有旧模式数组字段。

### `MachineKind`

```java
public enum MachineKind { NORMAL, HOST, MODULE }
```

`NORMAL` 为普通机器，`HOST` 为模块宿主，`MODULE` 为模块机器。模块配方可通过 `requiredHost(...)` 限定宿主。

### `ControllerOptions`

```java
ControllerOptions id(Identifier id);
ControllerOptions textures(Identifier front, Identifier otherFaces);
ControllerOptions textures(Identifier front, Identifier side, Identifier top, Identifier bottom);
ControllerOptions frontTexture(Identifier id);
ControllerOptions sideTexture(Identifier id);
ControllerOptions topTexture(Identifier id);
ControllerOptions bottomTexture(Identifier id);
ControllerOptions allowVerticalFacing();
ControllerOptions allowVerticalFacing(boolean enabled);
ControllerOptions fullyRotationallySymmetric();
ControllerOptions fullyRotationallySymmetric(boolean enabled);
ControllerOptions requireVerticalFacing();
ControllerOptions requireVerticalFacing(boolean enabled);
ControllerOptions tooltip(String... translationKeys);
ControllerOptions.View build();

// ControllerOptions.View
@Nullable Identifier id();
@Nullable Identifier frontTexture();
@Nullable Identifier sideTexture();
@Nullable Identifier topTexture();
@Nullable Identifier bottomTexture();
boolean allowVerticalFacing();
boolean fullyRotationallySymmetric();
boolean requireVerticalFacing();
List<String> tooltip();
```

双参数 `textures` 将其余面设置为同一纹理；四参数分别设置前、侧、顶、底。方向开关默认关闭，无参版本等于传 `true`；`requireVerticalFacing(true)` 同时启用 allowVerticalFacing。tooltip 参数是翻译键，重复调用追加有效的非空白键。未设置 ID/纹理时视图可返回 `null`；显式设置时参数不得 null。最终控制器资源由机器注册实现解析。

### `AppearanceOptions`

```java
AppearanceOptions appearance(Identifier id);
AppearanceOptions appearance(String id);
AppearanceOptions machineBasicBlock(Identifier id);
AppearanceOptions machineBasicBlock(String id);
AppearanceOptions controllerBaseTexture(Identifier id);
AppearanceOptions formedPortBaseTexture(Identifier id);
AppearanceOptions controllerIdleOverlayTexture(Identifier id);
AppearanceOptions controllerActiveOverlayTexture(Identifier id);
AppearanceOptions.View build();

// AppearanceOptions.View：以下五项都可为 null
@Nullable Identifier machineBasicBlock();
@Nullable Identifier controllerBaseTexture();
@Nullable Identifier formedPortBaseTexture();
@Nullable Identifier controllerIdleOverlayTexture();
@Nullable Identifier controllerActiveOverlayTexture();
```

`appearance` 是 `machineBasicBlock` 的别名。基础方块、控制器底纹、成型端口底纹、空闲/运行覆盖纹理均可选；字符串 ID 按 `Identifier.parse` 解析。资源 ID 合法不等于对应资源存在。

### `FactoryOptions`

```java
FactoryOptions hasFactory(boolean enabled);
FactoryOptions threadLimit(int limit);
FactoryOptions thread(String name, Identifier... recipeIds);
FactoryOptions.View build();

// FactoryOptions.View
boolean hasFactory();
int threadLimit();
List<FactoryOptions.ThreadView> threads();

// FactoryOptions.ThreadView
String name();
List<Identifier> recipeIds();
```

线程上限默认 1、须为正数；线程名不能为空白。非空线程声明会启用工厂。`recipeIds` 声明线程的配方集合，不应当描述为只影响显示的标签。工厂多个工作线程处理独立配方，配方并行则是同一执行的多份处理。

## 4. 结构与 Patterns

`cn.howxu.mmcr.publicapi.structure`。

### `StructureDraft` 与 `StructureSpec`

```java
// StructureDraft
StructureDraft stateSensitive();
StructureDraft stateInsensitive();
StructureDraft fullStructure(Consumer<StructureStageDraft> configure);
StructureDraft expandStructure(Consumer<StructureStageDraft> configure);
StructureDraft extension(Consumer<StructureStageDraft> configure);
StructureDraft singlePattern(Consumer<PatternDraft> configure);
StructureSpec build(Identifier machineId);

// StructureSpec
Identifier machineId();
List<StructureStageSpec> stages();
boolean stateSensitive();
```

默认状态不敏感。必须且只能有一个 `FULL` 阶段；`expandStructure` 要求先配置完整结构，且当前首阶段为 `FULL`。`singlePattern` 是 `fullStructure(stage -> stage.pattern(...))` 的便捷入口；不会向既有完整阶段合并第二个模式。`build(machineId)` 将自动控制器条件绑定到目标机器。

### `StructureStageDraft` 与 `StructureStageSpec`

```java
// StructureStageDraft
StructureStageDraft full();
StructureStageDraft expansion();
StructureStageDraft extension();
StructureStageDraft pattern(Consumer<PatternDraft> configure);
StructureStageDraft ports(Consumer<PortLimits.Builder> configure);
StructureStageDraft portTiers(Consumer<PortTierLimits.Builder> configure);
StructureStageDraft requirements(Consumer<StructureConstraints.Builder> configure);
StructureStageDraft modifier(char symbol, Identifier modifierId, BlockCondition replacement);
StructureStageSpec build();

// StructureStageSpec
enum Kind { FULL, EXPANSION, EXTENSION }
Kind kind();
PatternSpec pattern();
PortLimits portRequirements();
PortTierLimits portTiers();
StructureConstraints requirements();
```

独立的 `Structures.stage()` 默认完整阶段；结构草稿的三个阶段入口预设对应 kind。每阶段必须设置模式。端口数量、最低等级和字符替换是不同约束，不能相互替代。

### `PatternDraft` 与 `PatternSpec`

```java
// PatternDraft
PatternDraft layer(String... rows);
PatternDraft pattern(String... rows);
PatternDraft where(char symbol, BlockCondition condition);
PatternDraft controller(char symbol);
PatternSpec build();

// PatternSpec
List<List<String>> layers();
Map<Character, BlockCondition> predicates();
char controllerSymbol();
int width();
int height();
int depth();
```

`pattern(rows)` 与 `layer(rows)` 相同：每次调用增加一个 z 层，参数顺序对应该层从下到上的 y 行，字符串字符位置对应 x 列。所有层必须同宽、同高，行不能空。空格表示**不校验该单元格**，不是“必须为空气”；不可对空格调用 `where` 或 `controller`。

`controller(symbol)` 只能设置一次，该字符在全模式中必须恰好出现一次；没有显式绑定时自动使用目标机器控制器条件。其他非空格字符必须绑定。`where` 对同一字符再次调用会**替换**之前绑定，并非抛出重复错误。

示例：

```java
static void structures(RegisterMachineStructuresEvent event) {
    event.registerStructure(MACHINE, structure -> structure
            .fullStructure(stage -> stage
                    .pattern(pattern -> pattern
                            .layer("XXX", "XCX", "XIX")
                            .where('X', BlockConditions.block(Blocks.IRON_BLOCK))
                            .where('I', BlockConditions.itemInput())
                            .controller('C'))
                    .ports(ports -> ports.min("item_input_bus", 1))
                    .portTiers(tiers -> tiers.minItemInput(PortTierLimits.ItemTier.NORMAL))));
}
```

以上三行分别位于 y=0、1、2，仅声明一个 z 层。事件会自动 `build(MACHINE)`，回调里不需要自行调用 `build()`。裸 `Structures.pattern().build()` 尚未由结构绑定机器时，不应将自动控制器条件当成一个已注册的控制器方块 ID。

源码：[PatternDraft](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/structure/PatternDraft.java)、[模式校验](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/PatternBuilder.java)。

### `BlockConditions` 与 `BlockCondition`

`BlockConditions` 工厂全部为静态方法：

```java
public static BlockCondition block(Block block);
public static BlockCondition block(String id);
public static BlockCondition block(Identifier id);
public static BlockCondition state(String state);
public static BlockCondition state(Identifier id);
public static BlockCondition blockState(BlockState state);
public static BlockCondition deferredBlock(Supplier<? extends Block> supplier);
public static BlockCondition tag(TagKey<Block> tag);
public static BlockCondition coupler();
public static BlockCondition any(BlockCondition... conditions);
public static BlockCondition anyOf(Collection<BlockCondition> conditions);
public static BlockCondition itemInput();
public static BlockCondition itemOutput();
public static BlockCondition fluidInput();
public static BlockCondition fluidOutput();
public static BlockCondition energyInput();
public static BlockCondition energyOutput();
public static BlockCondition chemicalInput();
public static BlockCondition chemicalOutput();
public static BlockCondition radioactiveChemicalInput();
public static BlockCondition radioactiveChemicalOutput();
public static BlockCondition heatInput();
public static BlockCondition heatOutput();
public static BlockCondition itemPorts();
public static BlockCondition fluidPorts();
public static BlockCondition energyPorts();
public static BlockCondition chemicalPorts();
public static BlockCondition radioactiveChemicalPorts();
public static BlockCondition heatPorts();
public static BlockCondition upgradeBus();
public static BlockCondition ports();
public static BlockCondition ports(String... ids);
public static BlockCondition ports(Identifier... ids);
public static BlockCondition port(String id);
public static BlockCondition port(Identifier id);
public static BlockCondition parallelControllers();
public static BlockCondition factoryController();
public static BlockCondition smartInterface();
public static BlockCondition dataStorage();
public static BlockCondition networkInterface();
```

```java
// BlockCondition（只读描述，不是用户自定义 Predicate SPI）
boolean isMachineCoupler();
boolean isAny();
boolean isAir();
boolean isNetworkInterface();
Optional<Block> block();
Optional<BlockState> blockState();
Optional<Supplier<? extends Block>> blockSupplier();
Optional<TagKey<Block>> tag();
List<BlockCondition> alternatives();
```

`block` 匹配方块，`blockState` 精确描述状态；`state(String)` 可写 `minecraft:oak_log[axis=y]`。未知属性或非法属性值会被校验。`deferredBlock` 延迟取得方块；`tag` 匹配标签；`any`/`anyOf` 是条件并集，**不是无参通配符**。视图上的 `isAny`/`isAir` 是描述方法，并不意味着公共工厂存在 `air()`。

端口族工厂从对应注册族收集方块；`ports()` 无参返回端口集合，带参数版本只匹配指定端口。`parallelControllers`、`factoryController`、`smartInterface`、`dataStorage`、`networkInterface` 对应各自内置方块。Mekanism 族快捷条件是否有可用方块取决于联动加载，公共签名不依赖 Mekanism 类。

### `PortLimits`

```java
static PortLimits none();
static PortLimits.Builder builder();
Map<String, PortLimits.CountRangeView> requirements();

// PortLimits.CountRangeView
int min();
OptionalInt max();

// PortLimits.Builder
Builder min(String portId, int min);
Builder range(String portId, int min, int max);
PortLimits build();
```

按端口 ID 限定数量。`min` 只设下限，`range` 同时设上下限；数量不得负、上限不得低于下限。无要求时用 `none()`。这不限制每个端口的容量，容量最低要求见 `PortTierLimits`。

`portId` 使用端口族统计别名或具体端口种类 ID，按字符串精确匹配，区分大小写、不去除空格、不添加 `mmcr:` 命名空间。完整的内置族别名为：

| 端口族 | 输入别名 | 输出别名 |
| --- | --- | --- |
| 物品 | `item_input_bus` | `item_output_bus` |
| 流体 | `fluid_input_hatch` | `fluid_output_hatch` |
| 能量 | `energy_input_hatch` | `energy_output_hatch` |
| Mekanism 普通化学品 | `chemical_input_hatch` | `chemical_output_hatch` |
| Mekanism 放射性化学品 | `radioactive_chemical_input_hatch` | `radioactive_chemical_output_hatch` |
| Mekanism 热量 | `heat_input_hatch` | `heat_output_hatch` |

别名统计同族、同方向的全部等级及具有相应族声明的扩展 / 复合 / 联动端口，具体 ID 只统计该型号。完整型号列表与规则见 [KubeJS API：端口等级与端口需求](./KubeJS#port-requirements)，Java 与 KubeJS 使用同一套统计键。普通物品、流体、能量的 `normal` 型号 ID 没有 `_normal` 后缀，且与族别名重名，因此不能用这些键单独计数 `normal` 型号。

构建器拒绝空白键，但不会验证其他键是否已注册；未知键的实际计数为 0。`min(id, 0)` 不限制数量，要禁止该类端口应使用 `range(id, 0, 0)`；`range(id, n, n)` 要求恰好 `n` 个。同一个键重复声明时后一次覆盖前一次。

### `PortTierLimits`

```java
enum PortCategory { ITEM, FLUID, ENERGY, CHEMICAL, RADIOACTIVE_CHEMICAL, HEAT }
enum ItemTier {
    TINY, SMALL, NORMAL, REINFORCED, BIG, HUGE, LUDICROUS;
    public String id();
}
enum FluidTier {
    TINY, SMALL, NORMAL, REINFORCED, BIG, HUGE, LUDICROUS, VACUUM;
    public String id();
}
enum EnergyTier {
    TINY, SMALL, NORMAL, REINFORCED, BIG, HUGE, LUDICROUS, ULTIMATE;
    public String id();
}
enum ChemicalTier {
    BASIC, ADVANCED, ELITE, ULTIMATE;
    public String id();
}

static PortTierLimits none();
static Builder builder();
static PortTierLimits combine(PortTierLimits... declarations);
static PortTierLimits item(String id);
static PortTierLimits item(ItemTier tier);
static PortTierLimits item(ItemTier tier, IoDirection io);
static PortTierLimits fluid(String id);
static PortTierLimits fluid(FluidTier tier);
static PortTierLimits fluid(FluidTier tier, IoDirection io);
static PortTierLimits energy(String id);
static PortTierLimits energy(EnergyTier tier);
static PortTierLimits energy(EnergyTier tier, IoDirection io);
static PortTierLimits itemInput(String id);
static PortTierLimits itemInput(ItemTier tier);
static PortTierLimits itemOutput(String id);
static PortTierLimits itemOutput(ItemTier tier);
static PortTierLimits fluidInput(String id);
static PortTierLimits fluidInput(FluidTier tier);
static PortTierLimits fluidOutput(String id);
static PortTierLimits fluidOutput(FluidTier tier);
static PortTierLimits energyInput(String id);
static PortTierLimits energyInput(EnergyTier tier);
static PortTierLimits energyOutput(String id);
static PortTierLimits energyOutput(EnergyTier tier);
static PortTierLimits chemical(String id);
static PortTierLimits chemical(ChemicalTier tier);
static PortTierLimits chemical(ChemicalTier tier, IoDirection io);
static PortTierLimits chemicalInput(String id);
static PortTierLimits chemicalInput(ChemicalTier tier);
static PortTierLimits chemicalOutput(String id);
static PortTierLimits chemicalOutput(ChemicalTier tier);
static PortTierLimits radioactiveChemical();
static PortTierLimits radioactiveChemical(IoDirection io);
static PortTierLimits radioactiveChemicalInput();
static PortTierLimits radioactiveChemicalOutput();
static PortTierLimits heat();
static PortTierLimits heat(IoDirection io);
static PortTierLimits heatInput();
static PortTierLimits heatOutput();
List<RequirementView> requirements();

// PortTierLimits.RequirementView
PortCategory category();
IoDirection ioType();
int minTier();
String minTierId();

// PortTierLimits.Builder
Builder anyItemInput();
Builder anyItemOutput();
Builder anyFluidInput();
Builder anyFluidOutput();
Builder anyEnergyInput();
Builder anyEnergyOutput();
Builder anyChemicalInput();
Builder anyChemicalOutput();
Builder anyRadioactiveChemicalInput();
Builder anyRadioactiveChemicalOutput();
Builder anyHeatInput();
Builder anyHeatOutput();
Builder minItemInput(ItemTier tier);
Builder minItemOutput(ItemTier tier);
Builder minFluidInput(FluidTier tier);
Builder minFluidOutput(FluidTier tier);
Builder minEnergyInput(EnergyTier tier);
Builder minEnergyOutput(EnergyTier tier);
Builder minChemicalInput(ChemicalTier tier);
Builder minChemicalOutput(ChemicalTier tier);
PortTierLimits build();
```

**字符串等级的全部可选值**（各行从低到高排列；`...Input(String)` 与 `...Output(String)` 使用同族的列表）：

| 端口族 / 工厂 | `String id` 可选值 | 对应枚举 |
| --- | --- | --- |
| `item` / `itemInput` / `itemOutput` | `tiny`、`small`、`normal`、`reinforced`、`big`、`huge`、`ludicrous` | `ItemTier` |
| `fluid` / `fluidInput` / `fluidOutput` | `tiny`、`small`、`normal`、`reinforced`、`big`、`huge`、`ludicrous`、`vacuum` | `FluidTier` |
| `energy` / `energyInput` / `energyOutput` | `tiny`、`small`、`normal`、`reinforced`、`big`、`huge`、`ludicrous`、`ultimate` | `EnergyTier` |
| `chemical` / `chemicalInput` / `chemicalOutput` | `basic`、`advanced`、`elite`、`ultimate` | `ChemicalTier` |
| `radioactiveChemical` / `radioactiveChemicalInput` / `radioactiveChemicalOutput` | 无字符串等级重载，使用无参工厂或方向重载。 | 无等级枚举。 |
| `heat` / `heatInput` / `heatOutput` | 无字符串等级重载，使用无参工厂或方向重载。 | 无等级枚举。 |

字符串等级名不区分大小写，但不去除空格；`null`、空白或不属于该族的名称抛出 `IllegalArgumentException`。例如 `chemicalInput("ADVANCED")` 有效，`chemicalInput("normal")` 和 `chemicalInput(" advanced ")` 无效。`id()` 返回小写名称。字符串重载只接受已有等级名，不是新等级注册入口，也不接收 `chemical_input_hatch>=advanced` 这种 KubeJS 列表语法。

等级只在同族内比较，不能跨族比较 ordinal。物品、流体、能量的检测等级从 0 开始；化学品 `basic`、`advanced`、`elite`、`ultimate` 的检测等级分别为 2、3、4、5，不能用 `ChemicalTier.ordinal()` 代替。`anyItem...` / `anyFluid...` / `anyEnergy...` 等价于该方向的最低 `TINY`，`anyChemical...` 等价于最低 `BASIC`。放射性化学品与热量仅检查对应族、方向的端口存在，`RequirementView` 的 `minTier()` / `minTierId()` 为 `0` / `"any"`，这不是可传入字符串工厂的等级名。

每项声明要求结构中至少有一个同族、同方向、达到最低等级的端口，不要求所有端口都达到此等级；数量约束仍由 `PortLimits` 配置。普通化学品与放射性化学品是两个独立族。`combine` 合并声明，同一个端口可满足多项兼容需求，不设置时用 `none()`。不指定方向的 `item` / `fluid` / `energy` / `chemical` / `radioactiveChemical` / `heat` 同时约束输入和输出；指定方向或使用 Input/Output 工厂只约束一侧。Mekanism 未加载时仍可构造声明，但没有对应端口可满足成型校验。

```java
stage.ports(ports -> ports.range("chemical_input_hatch", 1, 2)
                .min("heat_output_hatch", 1))
        .portTiers(tiers -> tiers.minChemicalInput(PortTierLimits.ChemicalTier.ADVANCED)
                .anyHeatOutput());
```

该片段配置阶段约束，模式中还需通过 `BlockConditions` 允许放置这些端口。源码：[公共等级工厂与枚举](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/c2563c4110cd15bad0218dc4fa5a4f091fbccc87/src/main/java/cn/howxu/mmcr/publicapi/structure/PortTierLimits.java)、[字符串等级解析](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/c2563c4110cd15bad0218dc4fa5a4f091fbccc87/src/main/java/cn/howxu/mmcr/api/machine/definition/InterfaceTiers.java)。

### `StructureConstraints`

```java
static StructureConstraints empty();
static Builder builder();
Map<Character, List<ModifierPlacementView>> modifierReplacements();
Map<Character, Identifier> levelSlots();

// StructureConstraints.ModifierPlacementView
Identifier modifierId();
BlockCondition replacement();

// StructureConstraints.Builder
Builder modifier(char symbol, Identifier modifierId);
Builder modifier(char symbol, Identifier modifierId, BlockCondition replacement);
Builder levelSlot(char symbol, Identifier typeId);
StructureConstraints build();
```

等级槽位把模式字符关联到等级类型。修饰符替换把字符关联到修饰符及替换方块条件；无显式条件的 `modifier(symbol, id)` 重载使用**空气方块**作为替换条件。每字符可有多个修饰符候选；同一等级槽位绑定另一个类型会抛 `IllegalArgumentException`。引用的类型/修饰符须在结构窗口中注册。

## 5. 等级系统

`cn.howxu.mmcr.publicapi.structure.level`

### `Levels`、`LevelTypeSpec`、`MachineLevelSpec`

```java
// Levels
public static LevelTypeSpec type(Identifier id, Component displayName);
public static MachineLevelSpec level(Identifier id, Identifier typeId, int priority,
        BlockCondition condition, ItemStack representative, ModifierBundle modifier);

// LevelTypeSpec
Identifier id();
Component displayName();

// MachineLevelSpec
Identifier id();
Identifier typeId();
int priority();
BlockCondition statePredicate();
ItemStack representative();
ModifierBundle modifier();
```

类型是等级组，具体等级描述匹配条件、优先级、展示物品和修饰符。展示物品 getter 返回副本，不能通过修改该堆栈改变声明。等级槽位使用类型 ID，配方需求使用类型 ID 加等级 ID。

```java
Identifier typeId = Identifier.fromNamespaceAndPath("my_mod", "casing");
Identifier levelId = Identifier.fromNamespaceAndPath("my_mod", "steel");
event.registerLevelType(Levels.type(typeId, Component.translatable("level.my_mod.casing")));
event.registerLevel(Levels.level(levelId, typeId, 1,
        BlockConditions.block(Blocks.IRON_BLOCK), new ItemStack(Items.IRON_BLOCK),
        Modifiers.bundle()));
```

上述 `event` 为结构事件；随后在阶段配置中使用 `requirements(r -> r.levelSlot('X', typeId))`。等级不是仅仅“端口尺寸”的另一名称。

## 6. 配方声明

`cn.howxu.mmcr.publicapi.recipe`

### `RecipeDraft`

```java
RecipeDraft recipePool(Identifier id);
RecipeDraft duration(int ticks);
RecipeDraft priority(int priority);
RecipeDraft maxThreads(int threads);
RecipeDraft cancelIfPerTickFails(boolean value);
RecipeDraft parallelized(boolean value);
RecipeDraft allowPartialOutputs(boolean value);
RecipeDraft inputItem(Item item, int count);
RecipeDraft inputItem(Ingredient item, int count);
RecipeDraft inputItem(TagKey<Item> tag, int count);
RecipeDraft inputItemTag(TagKey<Item> tag, int count);
RecipeDraft inputItem(Ingredient item, int count, ComponentConstraints components, float consumeChance);
RecipeDraft inputFluid(Fluid fluid, int amount);
RecipeDraft inputFluid(Fluid fluid, int amount, float consumeChance);
RecipeDraft outputFluid(Fluid fluid, int amount);
RecipeDraft inputEnergy(long fePerTick);
RecipeDraft outputEnergy(long fePerTick);
RecipeDraft iFEt(long fePerTick);
RecipeDraft oFEt(long fePerTick);
RecipeDraft outputItem(Item item, int count);
RecipeDraft outputItem(ItemStack stack);
RecipeDraft outputItem(ItemStack stack, ComponentConstraints components);
RecipeDraft outputChance(ItemStack stack, float chance);
RecipeDraft outputChance(ItemStack stack, float chance, ComponentConstraints components);
RecipeDraft levelRequirement(Identifier typeId, Identifier levelId);
RecipeDraft stageRequirement(int minStage);
RecipeDraft requiredHost(Identifier id);
RecipeDraft modifier(Identifier id);
RecipeDraft requirement(RequirementSpec value);
RecipeDraft smartInterface(SmartInterfaceRequirementSpec value);
RecipeDraft custom(CustomIoSpec value);
RecipeDraft inputChemical(Identifier id, long amount);
RecipeDraft inputChemical(Identifier id, long amount, float consumeChance);
RecipeDraft inputChemicalTag(Identifier id, long amount);
RecipeDraft inputChemicalTag(Identifier id, long amount, float consumeChance);
RecipeDraft outputChemical(Identifier id, long amount, float chance);
RecipeDraft inputHeatTemperature(double temperature);
RecipeDraft outputHeat(double heat);
RecipeSpec build();
```

默认时长 1 tick、优先级 0、最大线程 1，三个布尔开关默认 `false`。时长/最大线程必须正数，优先级不得负。**配方池无默认值**，未设池时 `build()` 抛 `IllegalStateException`。输入输出与 requirement 为追加声明，不会因再次调用覆盖整个列表。

物品数量/流体数量使用 `int`，能量是 `long` **FE/t**（不是配方总耗能）；化学品是 `long`。`iFEt`/`oFEt` 是能量输入/输出别名。`consumeChance` 是输入消耗概率，0 表示仍须匹配但不消耗；输出 `chance` 是产出概率，二者不能混淆。概率需有限且位于 `[0,1]`。

`requiredHost` 约束模块配方可接受的宿主，`modifier` 引用已注册修饰符 ID，`stageRequirement` 约束最低结构阶段。部分输出开关允许规划器接受可容纳的产出，不表示所有输出都会忽略容量。

```java
static void recipes(RegisterMachineRecipesEvent event) {
    event.registerRecipe(Identifier.fromNamespaceAndPath("my_mod", "iron_block"), recipe -> recipe
            .recipePool(Identifier.fromNamespaceAndPath("my_mod", "shared_pool"))
            .duration(100)
            .inputItem(Items.IRON_INGOT, 9)
            .inputEnergy(40L)
            .outputItem(Items.IRON_BLOCK, 1));
}
```

源码：[RecipeDraft](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/RecipeDraft.java)、[校验及默认值](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/MachineRecipeBuilder.java)。

### `RecipeSpec`

```java
Identifier id();
Identifier recipePoolId();
int tickTime();
int priority();
int maxThreads();
boolean cancelRecipeOnPerTickFailure();
boolean parallelized();
boolean allowPartialOutputs();
List<ItemInputSpec> itemInputs();
List<FluidInputSpec> fluidInputs();
List<EnergyRateSpec> energyInputs();
List<ItemOutputSpec> itemOutputs();
List<FluidOutputSpec> fluidOutputs();
List<EnergyRateSpec> energyOutputs();
List<RequirementSpec> requirements();
List<CustomIoSpec> customOutputs();
List<Identifier> modifierIds();
Set<HostConstraint> requiredHosts();
Set<Identifier> requiredHostIds();
```

这是构建后的声明，IO 列表是相应种类的投影视图；`requirements()` 保留需求声明，`customOutputs()` 保留注册输出类型的自定义产出。运行修饰后的需求/输出应查询运行时 `RecipeView`，不能直接把 `RecipeSpec` 当执行配方使用。

### `IoDirection`、IO 值类型与 `IoValues`

```java
public enum IoDirection { INPUT, OUTPUT }

// ItemInputSpec
Ingredient ingredient();
int count();
ComponentConstraints components();
float consumeChance();
// ItemOutputSpec
ItemStack stack();
float chance();
ComponentConstraints components();
// FluidInputSpec
FluidIngredient ingredient();
int amount();
float consumeChance();
// FluidOutputSpec
FluidStack stack();
float chance();
// EnergyRateSpec
long fePerTick();
// HostConstraint
Identifier id();
// CustomIoSpec
Identifier typeId();
IoDirection io();
default IoDirection ioType(); // 返回 io()
JsonElement payload();
```

这些均是工厂生成的声明视图。物品/流体堆栈及 JSON 载荷 getter 返回副本。`FluidIngredient`、`FluidStack` 来自 NeoForge。

`IoValues` 静态工厂：

```java
public static ItemInputSpec itemInput(Item item, int count);
public static ItemInputSpec itemInput(Ingredient item, int count);
public static ItemInputSpec itemInput(Ingredient item, int count, ComponentConstraints components, float consumeChance);
public static ItemOutputSpec itemOutput(Item item, int count);
public static ItemOutputSpec itemOutput(ItemStack stack);
public static ItemOutputSpec itemOutput(ItemStack stack, float chance);
public static ItemOutputSpec itemOutput(ItemStack stack, ComponentConstraints components);
public static ItemOutputSpec itemOutput(ItemStack stack, float chance, ComponentConstraints components);
public static FluidInputSpec fluidInput(Fluid fluid, int amount);
public static FluidInputSpec fluidInput(FluidIngredient fluid, int amount);
public static FluidInputSpec fluidInput(FluidIngredient fluid, int amount, float consumeChance);
public static FluidOutputSpec fluidOutput(Fluid fluid, int amount);
public static FluidOutputSpec fluidOutput(FluidStack stack);
public static FluidOutputSpec fluidOutput(FluidStack stack, float chance);
public static EnergyRateSpec energyRate(long fePerTick);
public static HostConstraint requiredHost(Identifier id);
public static CustomIoSpec customIo(Identifier typeId, IoDirection io, JsonElement payload);
```

无概率重载默认 1；无组件重载使用空条件集。`customIo` 要求已注册类型及该类型 Codec 可解析的对象载荷；只是拼一个任意 JSON 并不会创造可执行能力。建议在构建、解码或同步配方前完成扩展类型注册，并保证客户端与服务端注册一致；需求/输出扩展注册本身没有注册窗口关闭检查。

### `MekanismIo`

```java
public static JsonObject chemicalInputPayload(Identifier id, long amount);
public static JsonObject chemicalInputPayload(Identifier id, long amount, float consumeChance);
public static JsonObject chemicalTagInputPayload(Identifier id, long amount);
public static JsonObject chemicalTagInputPayload(Identifier id, long amount, float consumeChance);
public static JsonObject chemicalOutputPayload(Identifier id, long amount, float chance);
public static JsonObject heatInputPayload(double value);
public static JsonObject heatOutputPayload(double value);
```

公共层的中立 JSON 构造器。化学品输入可精确指定 ID 或标签，热量输入表示最低温度，热量输出表示产生的热量。实际执行仍由 MMCR 的 Mekanism 联动能力提供；仅拥有公共 API jar 不会安装或注册化学品/热量端口。通常直接使用 `RecipeDraft.inputChemical` 等便捷方法即可。

## 7. 配方需求 requirements

`cn.howxu.mmcr.publicapi.recipe.requirement`

### `RequirementSpec` 与内置需求视图

```java
// RequirementSpec
Identifier kindId();
IoDirection io();
List<String> tags();
RequirementSpec copy();

// ItemRequirementSpec extends RequirementSpec
@Nullable Ingredient item();
@Nullable Ingredient ingredient();
int count();
ItemStack stack();
float chance();
ComponentConstraints components();
float consumeChance();
ItemStack resolvedStack();
ItemStack stack(DynamicOps<?> ops);

// FluidRequirementSpec extends RequirementSpec
@Nullable FluidIngredient fluid();
@Nullable FluidIngredient ingredient();
int amount();
FluidStack stack();
float chance();
float consumeChance();

// EnergyRequirementSpec extends RequirementSpec
long fePerTick();
// LevelRequirementSpec extends RequirementSpec
Identifier typeId();
Identifier levelId();
// StageRequirementSpec extends RequirementSpec
int minStage();
// SmartInterfaceRequirementSpec extends RequirementSpec
String interfaceType();
float minValue();
float maxValue();
```

`kindId()` 是需求类型 ID，`io()` 为流向，`tags()` 过滤可参与执行的能力标签。输入需求通常用 ingredient；输出用实际堆栈，因此 ingredient getter 可能为 `null`。不要假设任意需求都能强转成物品/流体需求。`resolvedStack`/带 ops 的 `stack` 用于取得组件解析后的物品堆栈。

需求接口不是外部直接实现的扩展点；自定义需求使用下文 `RequirementExtension` 注册，取得库生成的 `RequirementKind`，再调用 `Requirements.extension`。

### `Requirements`

完整静态工厂签名如下：

```java
public static <R> RequirementSpec extension(RequirementKind<R> kind, R payload);
public static ItemRequirementSpec item(IoDirection io, Ingredient item, int count, ItemStack stack);
public static ItemRequirementSpec item(IoDirection io, Ingredient item, int count, ItemStack stack, List<String> tags);
public static ItemRequirementSpec item(IoDirection io, Ingredient item, int count, ItemStack stack, float chance, List<String> tags);
public static ItemRequirementSpec item(IoDirection io, Ingredient item, int count, ItemStack stack,
        float chance, List<String> tags, ComponentConstraints components, float consumeChance);
public static ItemRequirementSpec item(IoDirection io, Ingredient item, int count, ItemStack stack,
        float chance, ComponentConstraints components, float consumeChance);
public static ItemRequirementSpec itemInput(ItemInputSpec input);
public static ItemRequirementSpec itemOutput(ItemOutputSpec output);
public static ItemRequirementSpec itemInput(Item item, int count);
public static ItemRequirementSpec itemInput(Ingredient item, int count);
public static ItemRequirementSpec itemOutput(ItemStack stack);
public static ItemRequirementSpec itemOutput(ItemStack stack, float chance);
public static FluidRequirementSpec fluid(IoDirection io, FluidIngredient fluid, int amount, FluidStack stack);
public static FluidRequirementSpec fluid(IoDirection io, FluidIngredient fluid, int amount, FluidStack stack, List<String> tags);
public static FluidRequirementSpec fluid(IoDirection io, FluidIngredient fluid, int amount, FluidStack stack, float chance, List<String> tags);
public static FluidRequirementSpec fluid(IoDirection io, FluidIngredient fluid, int amount, FluidStack stack,
        float chance, List<String> tags, float consumeChance);
public static FluidRequirementSpec fluid(IoDirection io, FluidIngredient fluid, int amount, FluidStack stack,
        float chance, float consumeChance);
public static FluidRequirementSpec fluidInput(FluidInputSpec input);
public static FluidRequirementSpec fluidOutput(FluidOutputSpec output);
public static FluidRequirementSpec fluidInput(Fluid fluid, int amount);
public static FluidRequirementSpec fluidOutput(FluidStack stack);
public static FluidRequirementSpec fluidOutput(FluidStack stack, float chance);
public static EnergyRequirementSpec energy(long rate);
public static EnergyRequirementSpec energy(long rate, List<String> tags);
public static EnergyRequirementSpec energy(IoDirection io, long rate);
public static EnergyRequirementSpec energy(IoDirection io, long rate, List<String> tags);
public static LevelRequirementSpec level(Identifier typeId, Identifier levelId);
public static LevelRequirementSpec level(IoDirection io, Identifier typeId, Identifier levelId);
public static StageRequirementSpec stage(int minStage);
public static StageRequirementSpec stage(IoDirection io, int minStage);
public static SmartInterfaceRequirementSpec smartInterface(IoDirection io, String type, float min, float max);
public static SmartInterfaceRequirementSpec smartInput(String type, float value);
public static SmartInterfaceRequirementSpec smartInput(String type, float min, float max);
public static SmartInterfaceRequirementSpec smartOutput(String type, float value);
```

优先用 `itemInput`/`itemOutput`、`fluidInput`/`fluidOutput` 避免混用流向和堆栈字段。省略方向的 `energy`、`level`、`stage` 是输入方向；等级/阶段是逻辑校验，不消耗一个物理资源槽。阶段范围为 1–64。`smartInput(type, value)` 表示精确值，范围重载表示区间；`smartOutput` 声明输出值。

示例：

```java
RecipeSpec spec = Recipes.recipe(Identifier.fromNamespaceAndPath("my_mod", "catalyst"))
        .recipePool(MACHINE)
        .duration(20)
        .requirement(Requirements.itemInput(IoValues.itemInput(
                Ingredient.of(Items.DIAMOND), 1, ComponentConstraints.EMPTY, 0F)))
        .requirement(Requirements.itemOutput(new ItemStack(Items.COAL), 0.5F))
        .build();
```

钻石仍是匹配条件，但消耗概率为 0；煤的产出概率为 0.5。`build()` 后仍须 `event.registerRecipe(spec)`。

## 8. 数据组件条件

`cn.howxu.mmcr.publicapi.recipe.component`

### `ComponentConditions` 与条件视图

```java
// ComponentConditions
public static ExactCondition exact(JsonElement value);
public static ExactCondition exact(Dynamic<?> value);
public static MapCondition map(Map<String, ComponentCondition> values);
public static ListCondition list(List<ComponentCondition> values);
public static RangeCondition range(double min, double max);
public static TextCondition text(String value, TextMatchMode mode);
public static TextCondition text(Component value, TextMatchMode mode);

// ComponentCondition
boolean isExact();
boolean matches(Dynamic<?> candidate);
// ExactCondition extends ComponentCondition
Dynamic<?> value();
// MapCondition extends ComponentCondition
Map<String, ComponentCondition> values();
// ListCondition extends ComponentCondition
List<ComponentCondition> values();
// RangeCondition extends ComponentCondition
double min();
double max();
// TextCondition extends ComponentCondition
Component value();
TextMatchMode mode();
public enum TextMatchMode { PLAIN, FULL }
```

精确条件比较编码后的值；map 要求所列键匹配，允许候选存在其他键；list 按无序包含语义匹配，各要求必须分配到不同候选元素，允许候选有额外元素，并非逐索引的完全相等。range 匹配闭区间数值；文本 `PLAIN` 比较纯文本，`FULL` 比较完整文本组件。不要把组件谓词当旧 NBT 字符串匹配。

### `ComponentConstraints`

```java
ComponentConstraints EMPTY;
static ComponentConstraints ofTypes(Map<DataComponentType<?>, ComponentCondition> values);
static ComponentConstraints ofIds(Map<Identifier, ComponentCondition> values);
Map<DataComponentType<?>, ComponentCondition> values();
boolean isEmpty();
boolean hasNonExactValues();
boolean matches(ItemStack stack);
boolean matches(ItemStack stack, DynamicOps<?> ops);
ItemStack displayStack(Item item, int count);
ItemStack displayStack(Item item, int count, DynamicOps<?> ops);
void applyTo(ItemStack stack);
void applyTo(ItemStack stack, DynamicOps<?> ops);
Optional<DataComponentPatch> exactPatch();
```

`ofIds` 会查数据组件注册表，未知 ID 抛 `IllegalArgumentException`。`matches` 要求声明的各组件满足条件；`displayStack` 创建展示堆栈，`applyTo` 修改传入堆栈。范围/map/list 等非精确条件不能直接变成一个确定产物；`exactPatch` 在包含非精确值或无法解码时返回空。需要注册表上下文的组件可传合适的 `DynamicOps`。默认展示写入会跳过无法解码的值；自定义名称文本有专门写入处理，因此不要概括成“任何文本条件都无法展示”。

```java
ComponentConstraints named = ComponentConstraints.ofTypes(Map.of(
        DataComponents.CUSTOM_NAME,
        ComponentConditions.text(Component.literal("Catalyst"), TextMatchMode.PLAIN)));
// 将 named 传给 inputItem(..., named, consumeChance)，只匹配指定名称的输入
```

源码：[公共条件集](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/component/ComponentConstraints.java)、[匹配与展示实现](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/component/DataComponentPredicateSet.java)。

## 9. 修饰符与智能接口

`cn.howxu.mmcr.publicapi.recipe.modifier`, 智能接口声明在 `.machine`

### `Modifiers`

```java
public static NumericModifierSpec numeric(String target, ModifierScope scope, double value,
        ModifierOperation operation, boolean affectsChance);
public static ParallelizationModifierSpec parallelized(boolean value);
public static ModifierBundle bundle(List<ModifierSpec> values);
public static ModifierBundle bundle(ModifierSpec... values);
public static ModifierBundle combine(ModifierBundle... values);
public static RecipeAdjustmentSpec recipe(String target, IoDirection io, float value,
        ModifierOperation operation, boolean affectsChance);
public static float apply(Collection<RecipeAdjustmentSpec> modifiers, String target,
        IoDirection io, float value, boolean chance);
public static double apply(Collection<RecipeAdjustmentSpec> modifiers, String target,
        IoDirection io, double value, boolean chance);
public static List<RecipeAdjustmentSpec> recipeModifiers(Collection<ModifierSpec> modifiers);
public static SmartModifierSpec smart(String type, String target, ModifierScope scope, boolean chance,
        float min, float max, float atMin, float atMax, ModifierOperation operation);
public static SmartModifierSpec smart(String type, String target, IoDirection io, boolean chance,
        float min, float max, float atMin, float atMax, ModifierOperation operation);
public static SmartModifierSpec smartDuration(String type, float min, float max,
        float atMin, float atMax, ModifierOperation op);
public static SmartModifierSpec smartEnergy(String type, float min, float max,
        float atMin, float atMax, ModifierOperation op);
public static SmartModifierSpec smartItem(String type, IoDirection io, boolean chance,
        float min, float max, float atMin, float atMax, ModifierOperation op);
public static SmartModifierSpec smartFluid(String type, IoDirection io, boolean chance,
        float min, float max, float atMin, float atMax, ModifierOperation op);
public static SmartModifierSpec smartChemical(String type, IoDirection io, boolean chance,
        float min, float max, float atMin, float atMax, ModifierOperation op);
public static SmartModifierSpec smartHeat(String type, IoDirection io, float min, float max,
        float atMin, float atMax, ModifierOperation op);
```

### 修饰符视图与枚举

```java
public enum ModifierOperation { ADD, MULTIPLY, SUBTRACT, DIVIDE }
public enum ModifierScope { INPUT, OUTPUT, MACHINE, RECIPE }
// ModifierSpec：库生成的标记接口，无方法
// NumericModifierSpec extends ModifierSpec
String target();
ModifierScope scope();
double value();
ModifierOperation operation();
boolean affectsChance();
// ParallelizationModifierSpec extends ModifierSpec
boolean value();
// ModifierBundle
List<ModifierSpec> modifiers();
// RecipeAdjustmentSpec（运行时配方修饰值，不继承 ModifierSpec）
String target();
IoDirection io();
float value();
ModifierOperation operation();
boolean affectsChance();
RecipeAdjustmentSpec multiply(float value);
RecipeAdjustmentSpec add(float value);
// SmartModifierSpec
String interfaceType();
String target();
ModifierScope scope();
boolean affectsChance();
float minValue();
float maxValue();
float atMin();
float atMax();
ModifierOperation operation();
IoDirection io();
float mappedValue(float value);
NumericModifierSpec toModifier(float value);
```

数值声明用 `NumericModifierSpec`，多个声明打包为 `ModifierBundle` 并在结构窗口 `registerModifier`；结构方块替换、等级和升级物品可以引用它。`RecipeAdjustmentSpec` 用于运行修饰计算。`multiply`/`add` 改的是修饰值，返回新视图，不是立刻操作机器资源。

`numeric` 的 target/scope 组合由底层校验，value 须有限；不是任意字符串都可用：

| target | scope | 支持 affectsChance |
| --- | --- | --- |
| `duration`、`energy`、`heat` | INPUT | 否 |
| `chemical` | INPUT | 是 |
| `output` | OUTPUT | 是 |
| `parallelism`、`factory_threads` | MACHINE | 否 |
| `recipe_threads` | RECIPE | 否 |

`parallelized` 是布尔修饰，使用专门工厂。智能修饰符 `toModifier` 同样受数值 target/scope 约束；存在 `smartItem` 等映射工厂不表示可任意将其转换为未受支持的机器数值修饰目标。

`apply` 按 target、方向和概率/数量标志筛选：累加加减项、累乘乘除项，最后计算 `(原值 + 加减总量) × 乘除总量`；不是简单按列表逐项执行。除数 0 在底层计算中被忽略。`smartDuration` 默认目标 `duration`、输入 scope；`smartEnergy` 为 `energy`、输入 scope。智能修饰符将接口值映射到 `atMin`–`atMax` 的修饰值。

```java
event.registerModifier(Identifier.fromNamespaceAndPath("my_mod", "fast"),
        Modifiers.bundle(Modifiers.numeric("duration", ModifierScope.INPUT,
                0.5D, ModifierOperation.MULTIPLY, false)));
```

### `SmartInterfaces` 与 `SmartInterfaceSpec`

```java
// machine.SmartInterfaces
public enum ValueType {
    FLOAT, INTEGER;
    public static ValueType byName(String name);
}
public static SmartInterfaceSpec type(String type, float defaultValue, int priority);
public static SmartInterfaceSpec type(String type, float defaultValue, int priority, ValueType valueType);
public static SmartInterfaceSpec type(String type, float min, float max, int priority);
public static SmartInterfaceSpec type(String type, float min, float max, int priority, ValueType valueType);
public static SmartInterfaceSpec type(String type, float defaultValue, float min, float max,
        int priority, ValueType valueType);

// machine.SmartInterfaceSpec
String type();
float defaultValue();
float minValue();
float maxValue();
int priority();
SmartInterfaces.ValueType valueType();
String translationKey();
String descriptionKey();
boolean accepts(float value);
float validatedValue(float value);
```

type 名不可空白；数值须有限，`min ≤ default ≤ max`。只传 default 的重载将其同时用作最小值，上限为 `Float.MAX_VALUE`；只传 min/max 时默认值为 min。INTEGER 要求默认值和边界为整数，但公共数值类型仍是 `float`。`validatedValue` 对非法值返回 **minValue**，不是抛异常，也不是返回 defaultValue。

`ValueType.byName` 接受 `float`、`int`、`integer`，忽略大小写；空白/null 返回 FLOAT，未知名称抛 `IllegalArgumentException`。翻译键为 `mmcr.smart_interface.type.<type>`，说明键再加 `.description`。

```java
machine.smartInterface(SmartInterfaces.type("speed", 1F, 1F, 4F, 0,
                SmartInterfaces.ValueType.INTEGER))
        .smartInterfaceModifier(Modifiers.smartDuration("speed", 1F, 4F,
                1F, 0.25F, ModifierOperation.MULTIPLY));
```

## 10. 行为 hooks 与上下文

`cn.howxu.mmcr.publicapi.behavior`

### `RecipeHooks` 与 `TickHooks`

```java
// RecipeHooks
RecipeHooks idleStart(Consumer<MachineContext> callback);
RecipeHooks idleEnd(Consumer<MachineContext> callback);
RecipeHooks beforeStart(Consumer<RecipeStartContext> callback);
RecipeHooks recipeTick(Consumer<RecipeTickContext> callback);
RecipeHooks beforeFinish(Consumer<RecipeFinishContext> callback);
RecipeHooks preServerTick(Consumer<MachineContext> callback);
RecipeHooks postServerTick(Consumer<MachineContext> callback);
// TickHooks
TickHooks serverTick(Consumer<TickContext> callback);
```

配置句柄由 `MachineDraft.recipeBehavior`/`tickBehavior` 的 `Consumer` 提供，不自行实现。配方钩子围绕空闲搜索、启动消耗、配方 tick、完成输出执行；直接 tick 模式由 `serverTick` 驱动。回调应短小，不在其中阻塞等待外部任务。

```java
machine.recipeBehavior(hooks -> hooks
        .beforeStart(start -> {
            if (start.duration() > 20) start.setDuration(20);
        })
        .recipeTick(tick -> {
            MachineContext context = tick.machineContext();
            if (context.isDue(20)) {
                context.jadeText().append(Identifier.fromNamespaceAndPath("my_mod", "progress"),
                        Component.translatable("jade.my_mod.progress", tick.currentTick(), tick.totalTick()));
            }
        }));
```

### `MachineContext`

```java
@Nullable MachineView controller();
ServerLevel level();
BlockPos controllerPos();
@Nullable Identifier machineId();
long gameTime();
boolean isDue(long period);
ControllerText screenText();
@Nullable DataStore dataStorage();
IoSnapshot ioView();
List<ItemStack> upgradeItems();
JadeText jadeText();
long countStructureBlocks(Block block);
long countStructureBlocks(String blockId);
```

服务器权威上下文。控制器 getter 返回只读 `MachineView`，不是方块实体。数据存储可缺失，使用前判空；升级物品返回复制堆栈。`isDue(period)` 按 gameTime 对正周期取模门控，非正周期抛 `IllegalArgumentException`。结构计数按当前成型结构统计，未成型返回 0；字符串方块 ID 空白、非法或未注册时抛 `IllegalArgumentException`，不等于扫描任意世界范围。不要把运行上下文当长期缓存或客户端数据源。

### `RecipeStartContext`

```java
RecipeView recipe();
MachineContext machineContext();
Identifier recipeId();
long requestedParallelism();
long effectiveParallelism();
int duration();
void setDuration(int ticks);
boolean replaceExactItemInputCount(Item item, int expectedCount, int replacementCount);
List<RequirementSpec> requirements();
void setRequirements(List<RequirementSpec> requirements);
List<OutputView> outputs();
void setOutputs(List<OutputView> outputs);
RecipeExecutionView snapshot();
void cancel();
boolean cancelled();
```

启动输入消耗前可调整本次执行；不会改写已注册配方。时长必须正数。精确输入替换只改第一个数量等于 expected 且 ingredient 仅解析为指定物品的输入，不会把包含多物品的标签输入也替换。

`setRequirements` 会重新推导内置物品/流体输出；当前存在注册自定义输出时会抛 `IllegalStateException`，不能假定它会自动重建所有扩展输出。`setOutputs` 通过输出注册类型转换对应 OUTPUT 需求并保留相应模板标签，输出扩展必须能正确执行该转换。读取列表后修改副本不会自动回写，应使用 setter。`snapshot()` 返回时长、需求和输出的本次执行快照。

### `RecipeTickContext`

```java
MachineContext machineContext();
RecipeView recipe();
int currentTick();
int totalTick();
long parallelism();
List<RequirementSpec> requirements();
List<OutputView> outputs();
IoSnapshot ioSnapshot();
```

读取当前执行进度和能力快照；该接口没有 setter 或取消方法，不应在参考中添加。

### `RecipeFinishContext`

```java
RecipeView recipe();
MachineContext machineContext();
Identifier recipeId();
long requestedParallelism();
long effectiveParallelism();
List<OutputView> outputs();
void setOutputs(List<OutputView> outputs);
void discardOutputs();
boolean outputsDiscarded();
void cancel();
boolean cancelled();
```

输出提交前调整本次产物。`setOutputs` 复制列表及输出，拒绝内置空物品/流体产物。`discardOutputs` 明确标记丢弃并清空产物；`cancel` 标记取消本次完成，二者不是同一个动作。

### `TickContext`

```java
public interface TickContext extends MachineContext {
    int factoryThreadCount();
    long parallelism();
    Optional<Float> smartInterfaceValue(String name);
    Map<String, Float> smartInterfaceValues();
    IoTransaction ioPlan();
}
```

直接 tick 模式可通过 `ioPlan()` 新建本次 IO 事务；先添加需求并模拟，再提交。`parallelism()` 是上下文元数据；直接 IO 计划本身按一次执行规划，若业务需要更大数量应显式构造对应需求，不要假设自动乘上该值。

源码：[行为适配](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/api/facade/behavior/BehaviorAdapters.java)、[启动上下文语义](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeStartContext.java)。

## 11. runtime 视图、IO 快照与事务

`cn.howxu.mmcr.publicapi.runtime`

### `MachineView`、`RecipeView`、`RecipeExecutionView`

```java
// MachineView
@Nullable Identifier machineId();
BlockPos controllerPos();
boolean formed();
long countStructureBlocks(Block block);
long countStructureBlocks(String blockId);

// RecipeView
Identifier id();
Identifier recipePoolId();
int tickTime();
int priority();
int maxThreads();
boolean cancelRecipeOnPerTickFailure();
boolean parallelized();
boolean allowPartialOutputs();
List<RequirementSpec> requirements();
List<OutputView> outputs();
List<RecipeAdjustmentSpec> modifiers();
Set<Identifier> requiredHostIds();
List<RequirementSpec> runtimeRequirements();
List<RequirementSpec> runtimeRequirements(List<RecipeAdjustmentSpec> extraModifiers);
List<RequirementSpec> runtimeRequirements(List<RecipeAdjustmentSpec> extraModifiers,
        double energyMultiplier, double outputMultiplier);
List<OutputView> runtimeMachineOutputs();
List<OutputView> runtimeMachineOutputs(List<RecipeAdjustmentSpec> extraModifiers);

// RecipeExecutionView
int duration();
List<RequirementSpec> requirements();
List<OutputView> outputs();
```

`runtimeRequirements` 和 `runtimeMachineOutputs` 生成应用修饰后的执行值；不要将其与原始声明列表混淆。`RecipeExecutionView` 来自启动上下文快照，包含本次回调调整结果。

### `IoSnapshot`

```java
IoSnapshot forTags(Set<String> requiredTags);
List<IoDisplay> displays();
List<ResourceAmount<ItemResource>> itemInputs();
List<ResourceAmount<FluidResource>> fluidInputs();
List<ResourceAmount<Identifier>> chemicalInputs();
long chemicalAmount(Identifier chemicalId);
long chemicalTagAmount(Identifier tagId);
long chemicalOutputCapacity(Identifier chemicalId);
List<HeatState> heatInputs();
List<HeatState> heatOutputs();
long energyInput();
long itemAmount(Ingredient ingredient);
long fluidAmount(FluidIngredient ingredient);
long itemOutputCapacity(ItemStack stack);
long fluidOutputCapacity(FluidStack stack);
long energyOutputCapacity();
Optional<Float> smartInterfaceValue(String name);
Map<String, Float> smartInterfaceValues();

public record ResourceAmount<R>(R resource, long amount) {}
public record HeatState(double heat, double temperature, double heatCapacity) {}
```

IO 快照是能力集合上的只读聚合视图，**不是承诺所有储量永远冻结的深拷贝**。查询仍读取能力存储，不能代替事务预留。`forTags` 只保留包含全部指定标签的能力；空集合不过滤。

`ItemResource`/`FluidResource` 来自 NeoForge transfer 包，数量为 `long`；输出容量查询按给定资源计算可接受量，不等于所有输出槽总空位。化学品视图用 `Identifier`，无需在公共调用代码里依赖 Mekanism 类型。温度以 Kelvin 读取，`heatCapacity` 是热容，不是最大可储热量。

### `IoTransaction`

```java
IoSnapshot view();
IoTransaction addInput(RequirementSpec requirement);
IoTransaction addOutput(RequirementSpec requirement, OutputMode mode);
IoTransaction add(RequirementSpec requirement);
List<RequirementSpec> requirements();
IoSimulation simulate();
IoCommitResult commit();
IoCommitResult commit(Consumer<DataStore.Transaction> writes);
IoCommitResult commitData(Consumer<DataStore.Transaction> writes);
List<OutputAcceptance> outputSimulations();
boolean inputsSatisfied();
boolean energySatisfied();
```

`addInput` 要求 INPUT；`addOutput` 要求 OUTPUT，模式为 null 时按 REQUIRE_FULL；`add` 按流向分派，输出默认要求完整容纳。新输入放在输出之前，新增需求使旧模拟失效。

**提交不会自动模拟。** 必须先 `simulate()`，或者调用会在尚无模拟时触发模拟的 `outputSimulations`/`inputsSatisfied`/`energySatisfied`。输入满足与能量满足两个标志不足以证明全部输出可提交，应同时检查 `failure()` 与输出接受情况。

计划只能提交一次：第一次尝试即消费计划，即使未模拟或失败；再次 commit 返回 unsuccessful，消费后 add/simulate 抛 `IllegalStateException`。成功模拟并不保证提交成功，提交时仍重新验证并由底层事务处理回滚。

`commit(writes)` 与 `commitData(writes)` 都将公共 `DataStore.Transaction` 借给回调，可把存储写入纳入同一次 IO 提交。回调只在提交路径执行；不要留存事务句柄。普通 `DataStore.set` 不会自动加入这个事务，须使用带 transaction 的重载。

```java
machine.tickBehavior(hooks -> hooks.serverTick(context -> {
    DataStore storage = context.dataStorage();
    if (storage == null || !context.isDue(20)) return;

    IoTransaction plan = context.ioPlan()
            .addInput(Requirements.itemInput(Items.IRON_INGOT, 1))
            .addOutput(Requirements.itemOutput(new ItemStack(Items.IRON_NUGGET, 9)),
                    OutputMode.REQUIRE_FULL);
    IoSimulation simulation = plan.simulate();
    if (simulation.failure() != null || !simulation.inputsSatisfied()
            || !simulation.energySatisfied()) return;

    long completed = storage.get("completed").flatMap(DataKey::asLong).orElse(0L);
    IoCommitResult result = plan.commit(transaction ->
            storage.set("completed", DataKey.of(completed + 1L), transaction));
    if (!result.successful()) {
        // 本次 IO 与事务存储写入没有成功提交；下次 tick 创建新计划
    }
}));
```

源码：[公共事务](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/runtime/IoTransaction.java)、[模拟与一次性提交实现](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/MachineIoPlan.java)。

### IO 结果与失败诊断

```java
// IoSimulation
boolean inputsSatisfied();
boolean energySatisfied();
List<OutputAcceptance> outputs();
@Nullable RuntimeFailure failure();
// IoCommitResult
boolean successful();
@Nullable RuntimeFailure failure();
// OutputAcceptance
long requested();
long accepted();
OutputFit fit();
public enum OutputFit { FULL, PARTIAL, NONE }
public enum OutputMode { REQUIRE_FULL, ALLOW_PARTIAL }
public enum RecipeFailureMode { RESET, STILL, DECREASE }
public enum FailureSeverity { INFO, BLOCKED, FAILURE }
public enum FailurePhase {
    CAPABILITY_PREPARE, CAPABILITY_COMMIT, REQUIREMENT_PLAN, LEVEL_CHECK, RECIPE_SEARCH,
    RECIPE_LOAD, RECIPE_START, PER_TICK, FINISH, RUNTIME, UNKNOWN
}

// RuntimeFailure
Identifier id();
FailureSeverity severity();
Identifier source();
Map<String, String> details();
@Nullable Identifier reasonId();
@Nullable String reasonTranslationKey();
@Nullable Integer reasonPriority();
List<FailureFrame> trace();
// FailureFrame
Identifier source();
FailurePhase phase();
@Nullable Identifier recipeId();
@Nullable Integer requirementIndex();
```

失败结果可能没有诊断对象（例如未模拟即提交或重复提交），因此 `failure()==null` 不等于 successful。`reasonTranslationKey` 是本地化键。失败模式 RESET/STILL/DECREASE 分别声明进度重置、保持或回退策略；默认 STILL。

### `OutputView`、`ItemOutputView`、`FluidOutputView`

```java
// OutputView
Identifier kindId();
String serializedId();
float chance();
long amount();
OutputView copy();
OutputView withChance(float chance);
OutputView applyModifiers(List<RecipeAdjustmentSpec> modifiers);
// ItemOutputView extends OutputView
ItemStack stack();
// FluidOutputView extends OutputView
FluidStack stack();
```

堆栈 getter 返回副本。`withChance`/`applyModifiers` 返回新的输出值；扩展输出可只表现为通用 `OutputView`，通过其 `OutputKind.payload` 读类型化载荷。

## 12. 输出工厂与输出转换

`cn.howxu.mmcr.publicapi.recipe`

### `Outputs`

```java
public static <O> OutputView extension(OutputKind<O> kind, O payload);
public static ItemOutputView item(ItemStack stack, float chance);
public static ItemOutputView item(ItemStack stack);
public static FluidOutputView fluid(FluidStack stack, float chance);
public static FluidOutputView fluid(FluidStack stack);
public static RequirementSpec toRequirement(OutputView output, List<String> tags);
public static Optional<RequirementSpec> tryToRequirement(OutputView output, List<String> tags);
public static Optional<OutputView> fromRequirement(RequirementSpec requirement);
public static boolean matchesOutputRequirement(RequirementSpec requirement);
public static boolean matchesOutputRequirement(OutputView output, RequirementSpec requirement);
```

省略概率时为 1。输出转换用于实际执行，不只是 JEI 显示。`toRequirement` 要求注册类型能给出输出需求；不确定转换是否可用时使用 Optional 版本。不是所有 OUTPUT 需求都能还原成展示输出，尤其是逻辑值类需求。

## 13. 需求与输出扩展契约

包：`cn.howxu.mmcr.publicapi.recipe.requirement`、`.recipe`、`.recipe.extension`。

### `RequirementKinds`、`RequirementKind` 与 `RequirementExtension`

```java
// RequirementKinds
public static <R> RequirementKind<R> register(RequirementExtension<R> extension);
// RequirementKind<R>：库生成的类型句柄
Identifier id();
TypePresentation presentation();
Optional<R> payload(RequirementSpec requirement);

// RequirementExtension<R>：用户 SPI
Identifier id();
MapCodec<R> codec();
IoDirection io(R value);
List<String> tags(R value);
R copy(R value);
RequirementExecution<R> execution();
default Set<Identifier> capabilityIds(); // Set.of(id())
default SyncPayloadCodec<R> syncCodec(); // null
default TypePresentation presentation();
```

使用需求类型前注册扩展并保存返回的 kind；随后 `Requirements.extension(kind, payload)` 生成需求。建议在启动初始化时完成注册，并保证两端类型与 Codec 一致。需求和输出扩展适配器直接调用各自 Registry，没有生命周期窗口检查。`payload` 只对相同类型所有权的需求返回值，并调用 `copy` 复制。句柄必须仍是注册表中的规范实例，重复 ID、保留内置 ID 或已失效句柄不能作为替代注册路径。

`codec()` 描述载荷字段，**不要包含保留的 `type` 判别字段**。`copy` 必须为可变载荷制作快照。`capabilityIds` 声明要参与规划的**已有能力族 ID**，注册时快照；默认仅该需求自身 ID。底层还会过滤方向和 tags。这一声明不是能力注册器：若没有实际端口能力，仅注册一个需求 ID 不会凭空产生存储。

### `RequirementExecution`

```java
RequirementPlanSpec plan(R value, PlanningView context);
default R applyModifiers(R value, List<RecipeAdjustmentSpec> modifiers); // 返回 value
default R applyLevelModifiers(R value, double energyMultiplier, double outputMultiplier); // 返回 value
default boolean overlaps(R value, RequirementSpec other); // false
default List<ResourceWakeupSpec<?>> resourceWakeups(R value); // List.of()
```

`plan` 只规划，不直接修改真实资源。若扩展数量受修饰符或等级倍率影响，必须覆写相应方法；默认方法不会自动解释载荷。`overlaps` 声明重叠关系，`resourceWakeups` 声明资源变化后需要重新尝试的条件。

### `OutputKinds`、`OutputKind` 与 `OutputExtension`

```java
// OutputKinds
public static <O> OutputKind<O> register(OutputExtension<O> extension);
// OutputKind<O>：库生成的类型句柄
Identifier id();
String serializedId();
TypePresentation presentation();
Optional<O> payload(OutputView output);

// OutputExtension<O>：用户 SPI
Identifier id();
default String serializedId(); // id().toString()
MapCodec<O> codec();
O copy(O value);
float chance(O value);
default long amount(O value); // 0
O withChance(O value, float chance);
O applyModifiers(O value, List<RecipeAdjustmentSpec> modifiers);
RequirementSpec toRequirement(O value, List<String> tags);
boolean matchesRequirement(RequirementSpec requirement);
default Optional<O> fromRequirement(RequirementSpec requirement); // Optional.empty()
default SyncPayloadCodec<O> syncCodec(); // null
default TypePresentation presentation();
```

`Outputs.extension(kind, payload)` 构造运行输出；配方声明可经 `Outputs.toRequirement` 和 `RecipeDraft.requirement` 提交对应需求，或使用已注册类型的 `CustomIoSpec` 路径。扩展必须把输出转换为真正可执行的 OUTPUT 需求，`matchesRequirement` 必须只匹配其支持的需求；需要反向重建时实现 `fromRequirement`。只提供 Codec 或 JEI 描述不足以让产物提交。

### `SyncPayloadCodec` 与 `TypePresentation`

```java
// SyncPayloadCodec<T>（用户 SPI）
void encode(RegistryFriendlyByteBuf buffer, T value);
T decode(RegistryFriendlyByteBuf buffer);
int maxPayloadSize();
void validate(T value);

public record TypePresentation(String translationKey, String descriptionKey) {}
```

`syncCodec()==null` 时使用底层有界 JSON 同步 Codec；自定义二进制同步必须给出有效大小上限并进行载荷验证，不能使用无限载荷声明。默认需求展示键为 `requirement.<id>` / `requirement.<id>.description`，输出为 `output.<id>` / `output.<id>.description`。两端必须注册一致的类型与同步格式。

源码：[需求扩展](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/requirement/RequirementExtension.java)、[输出扩展](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/OutputExtension.java)。

### `PlanningView` 与 `RequirementPlanSpec`

```java
// PlanningView：库生成的规划上下文
long requestedParallelism();
int requirementIndex();
boolean allowPartialOutputs();
OutputMode outputMode();
List<CapabilityAccess> capabilities();
ReservationsView reservations();
RequirementPlanSpec plan(RequirementSpec requirement);
RequirementPlanSpec prepared(long maxParallelism, List<RecipeOperation> operations);
RequirementPlanSpec deferred(long maxParallelism, OperationPlanner operations, ReservationPlanner reservations);
RequirementPlanSpec blocked(PlanStatus failure);
PlanStatus failure(Identifier id, Identifier source, Map<String, String> details);
OutputSimulationView outputSimulation(long requested, long accepted);

// RequirementPlanSpec
int requirementIndex();
long maxParallelism();
boolean successful();
Optional<PlanStatus> failure();
// PlanStatus
Identifier id();
Identifier source();
Map<String, String> details();
// OutputSimulationView
long requested();
long accepted();
Fit fit();
enum Fit { NONE, PARTIAL, FULL }
```

`plan(requirement)` 可委托已有注册需求处理器。`prepared` 给出已备好的事务操作，`deferred` 在最终并行度确定后创建操作和预留，`blocked` 返回失败。规划结果包含原始 requirement 索引，便于追踪失败。

### `CapabilityAccess`、`ResourceStore` 与 `LongStore`

```java
// CapabilityAccess：已有能力的只读元数据/操作准备句柄
Identifier kindId();
Set<IoDirection> directions();
int outputPriority();
<R> Optional<ResourceStore<R>> resources(Class<R> type);
Optional<LongStore> longValues();
boolean supportsLargeStacks();
<R> RecipeOperation prepareResources(IoDirection io, long parallelism, List<ResourceAction<R>> actions);
RecipeOperation prepareValue(IoDirection io, long parallelism, long amount, boolean insert);
RecipeOperation prepareSmartValue(IoDirection io, long parallelism, String interfaceType, float value);

// ResourceStore<R>：只读存储视图
Class<R> resourceType();
int size();
@Nullable R resource(int slot);
long amount(int slot);
long capacity(int slot, @Nullable R resource);
boolean isValid(int slot, R resource);
// LongStore
long amount();
long capacity();
long transferLimit();

public record ResourceAction<R>(int slot, R resource, long amount, boolean insert) {}
```

`ResourceStore`/`LongStore` 不是可自行实现后注册端口的公共 SPI。`prepareValue` 的 amount 是**已按并行度缩放的总量**，不要再乘一次 parallelism；资源 action 描述指定槽位的插入/提取。资源类型来自能力声明，先用 Optional 检查匹配。

### `ReservationsView`

```java
<R> @Nullable R resource(ResourceStore<R> storage, int slot);
long amount(ResourceStore<?> storage, int slot);
<R> boolean reserveExtract(ResourceStore<R> storage, int slot, R resource, long amount);
<R> boolean reserveInsert(ResourceStore<R> storage, int slot, R resource, long amount);
<R> long outputAvailable(ResourceStore<R> storage, R key, long capacity);
<R> boolean reserveOutput(ResourceStore<R> storage, R key, long amount);
long valueAvailable(LongStore storage, boolean insert);
boolean reserveValue(LongStore storage, long amount, boolean insert);
boolean reserveValueTotal(LongStore storage, long amount, boolean insert);
```

读取和预留同一规划过程中的逻辑库存，防止多个需求重复使用同一资源或输出空间。成功预留不等于已经修改真实存储；实际变化必须由事务操作提交。

- `reserveOutput` **不检查输出容量**，只累计正数预留量并防止 `long` 加法溢出。调用方必须先用 `outputAvailable(storage, key, capacity)` 检查足够空间，再登记预留；`capacity` 是调用方计算的非负可用容量基线，不是由该方法读取的槽位容量。同一存储预留身份与 key 共用账目。
- `insert=true` 表示向存储插入（输出），`false` 表示从存储提取（输入）。`valueAvailable` 返回扣除已有预留后的容量空间或库存，不包含 `transferLimit` 限制。
- `reserveValue` 检查可用量及本次 `amount <= transferLimit()`；`reserveValueTotal` 仍检查可用量和记账溢出，但**跳过单次传输上限检查**。用于并行总量时，调用方必须自行约束 `amount <= transferLimit() × parallelism`，并安全计算已缩放总量，不能借此绕过实际操作的传输限制。

最小预留示例（可放入扩展类；参数中的存储与预留视图由 MMCR 提供）：

```java
import cn.howxu.mmcr.publicapi.recipe.extension.LongStore;
import cn.howxu.mmcr.publicapi.recipe.extension.ReservationsView;
import cn.howxu.mmcr.publicapi.recipe.extension.ResourceStore;

static <R> boolean reserveOutputSpace(ReservationsView reservations,
        ResourceStore<R> storage, R key, long capacity, long amount) {
    return amount > 0L
            && reservations.outputAvailable(storage, key, capacity) >= amount
            && reservations.reserveOutput(storage, key, amount);
}

static boolean reserveParallelValue(ReservationsView reservations,
        LongStore storage, long perBatch, long parallelism, boolean insert) {
    if (perBatch <= 0L || parallelism <= 0L) return false;
    long total = Math.multiplyExact(perBatch, parallelism);
    long scaledLimit = Math.multiplyExact(storage.transferLimit(), parallelism);
    return total <= scaledLimit
            && reservations.reserveValueTotal(storage, total, insert);
}
```

例中 `Math.multiplyExact` 在乘法溢出时抛 `ArithmeticException`，不会登记溢出的数量。输出 key 必须非 null，并与其他输出预留使用一致的资源键；`capacity` 必须非负。这些方法只完成规划记账；后续仍需准备并提交对应事务操作，向 `prepareValue` 传入 `total` 时不要再乘并行度。

### 事务操作与延迟规划 SPI

```java
// RecipeOperation
OperationResult commit(TransactionContext transaction);
default RecipeOperation forParallelism(long parallelism); // null
// OperationPlanner
OperationBatch create(long parallelism, ReservationsView reservations);
// ReservationPlanner
ReservationCheck reserve(long parallelism, ReservationsView reservations);

public record OperationResult(boolean success, PlanStatus failure) {
    public static OperationResult successful();
    public static OperationResult failure(PlanStatus failure);
}
public record OperationBatch(List<RecipeOperation> operations,
        @Nullable PlanStatus failure, @Nullable OutputSimulationView outputSimulation) {
    public OperationBatch(List<RecipeOperation> operations, @Nullable PlanStatus failure);
}
public record ReservationCheck(@Nullable PlanStatus failure,
        @Nullable OutputSimulationView outputSimulation) {}
```

`TransactionContext` 是 `net.neoforged.neoforge.transfer.transaction.TransactionContext`。外部资源操作须参加 MMCR 提供的事务，确保失败时可回滚。默认 `forParallelism` 返回 null，表示预备 lambda **不支持重缩放**；要么明确实现重缩放，要么用 `deferred` 在最终并行度生成操作，不能重用固定数量操作冒充任意并行度。

### 资源唤醒契约

```java
public record ResourceWakeupSpec<T>(Set<Identifier> failureReasonIds, Reason reason,
        Class<T> resourceType, Predicate<ResourceChangeView<T>> matcher) {
    public enum Reason { INPUT_AVAILABLE, ENERGY_AVAILABLE, OUTPUT_CAPACITY }
}
// ResourceChangeView<T>
T resource();
ResourceWakeupSpec.Reason reason();
```

按失败原因、变化种类和资源类型匹配唤醒；不同资源类不会交给 matcher。能量等标量信号的资源类型是能力族 `Identifier`，物品/流体保留平台资源类型。没有声明时默认不提供扩展资源唤醒规则。这仍是已有资源变化的观察契约，不是能力底层实现的替代品。

## 14. data 数据与仓库

`cn.howxu.mmcr.publicapi.data`

### `DataKind` 与 `DataKey`

```java
public enum DataKind {
    BOOLEAN, STRING, BYTE, SHORT, INT, LONG, FLOAT, DOUBLE, BIG_INTEGER, BIG_DECIMAL, LIST, MAP
}

// DataKey 静态工厂
static DataKey of(boolean value);
static DataKey of(String value);
static DataKey of(byte value);
static DataKey of(short value);
static DataKey of(int value);
static DataKey of(long value);
static DataKey of(float value);
static DataKey of(double value);
static DataKey of(BigInteger value);
static DataKey of(BigDecimal value);
static DataKey list(List<DataKey> values);
static DataKey map(Map<String, DataKey> values);
// DataKey 访问器
DataKind type();
Optional<Boolean> asBoolean();
Optional<String> asString();
Optional<Byte> asByte();
Optional<Short> asShort();
Optional<Integer> asInt();
Optional<Long> asLong();
Optional<Float> asFloat();
Optional<Double> asDouble();
Optional<BigInteger> asBigInteger();
Optional<BigDecimal> asBigDecimal();
Optional<List<DataKey>> asList();
Optional<Map<String, DataKey>> asMap();
boolean booleanValue();
String stringValue();
byte byteValue();
short shortValue();
int intValue();
long longValue();
float floatValue();
double doubleValue();
BigInteger bigIntegerValue();
BigDecimal bigDecimalValue();
```

虽然名为 `DataKey`，它包装的是**值**，存储键仍为 `String`。数字类型区分精确种类，`of(1)` 是 INT、`of(1L)` 是 LONG；Optional getter 类型不符返回空，不进行随意数字强转。确定类型后才使用直接 getter，类型不符抛 `IllegalStateException`。浮点值须有限，字符串/大数/集合元素不得 null，map 键不得空白。集合工厂生成只读值，不能通过修改原始 map/list 改写已存储值。

### `DataStore` 与 `DataStore.Transaction`

```java
Optional<DataKey> get(String key);
boolean contains(String key);
Map<String, DataKey> values();
void set(String key, DataKey value);
boolean set(String key, DataKey value, DataStore.Transaction transaction);
Optional<DataKey> remove(String key);

// DataStore.Transaction
TransactionContext context();
```

活跃运行存储由 MMCR 提供。`values()` 返回映射快照，普通 set/remove **立即执行**，不主动登记事务快照，也没有事务一致性保证；带事务 set 参加提供的 IO 事务并可回滚。底层快照保存整张 Map，登记快照后混入的普通写入/删除也可能被整表恢复覆盖，不能据此推断逐键回滚界限。其返回 `false` 表示值未变化，不是事务失败。公共接口没有带事务的 remove 重载。

`Transaction` 只在提交回调内有效。`context()` 暴露共用 NeoForge 事务给外部预留操作；不要保存、关闭它，也不要另开一个根事务代替它。

```java
DataStore store = context.dataStorage();
if (store != null) {
    long count = store.get("completed").flatMap(DataKey::asLong).orElse(0L);
    store.set("completed", DataKey.of(count + 1L)); // 即时写入，非 IO 事务
}
```

### `Repository`、`Reservation`、`RepositoryContext`、`RepositoryRequest`

```java
// Repository（用户 SPI）
Identifier id();
RepositoryRequest request(RepositoryContext context);
// Reservation（用户 SPI）
boolean commit(DataStore.Transaction transaction);
void cancel();

public record RepositoryContext(Identifier machineId, BlockPos controllerPos,
        String key, DataKind requestedType) {}
public record RepositoryRequest(Identifier repositoryId, BlockPos controllerPos, String key,
        DataKind requestedType, DataKey requestedValue, Optional<Reservation> reservation) {
    public RepositoryRequest(Identifier id, BlockPos pos, String key, DataKind kind, DataKey value);
    public static RepositoryRequest available(Identifier id, BlockPos pos, String key,
            DataKind kind, DataKey value, Reservation reservation);
    public static RepositoryRequest unavailable(Identifier id, BlockPos pos, String key,
            DataKind kind, DataKey value);
}
```

record 自带同名字段访问器。上下文/结果要求非空 ID、位置和类型，键不得空白；位置归一化为 immutable。结果 `requestedValue.type()` 必须等于 requestedType。`available` 带预留，`unavailable` 仍保留请求值但没有预留；五参数构造器同样无预留。

仓库契约支持外部实现读取和预留，但当前公共包没有独立的全局仓库注册入口。不能据此编造 `Repositories.register`。外部预留提交须使用共享事务，失败/放弃时释放预留。

源码：[数据存储契约](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/data/DataStore.java)、[仓库结果校验](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/data/RepositoryRequest.java)。

## 15. network 排队请求

`cn.howxu.mmcr.publicapi.network`

### `NetworkSettings`

```java
static NetworkSettings of(int maxCount, int maxConnections, Set<Identifier> allowedMachineIds);
static NetworkSettings disabled();
int maxCount();
int maxConnections();
Set<Identifier> allowedMachineIds();
NetworkSettings withAllowedMachine(Identifier machineId);
```

`disabled()` 为 0 个接口、0 个连接、空白名单；数量上限不能负。机器配置通过 `networkInterface` 加 `allowNetworkMachine` 设置，并在 `MachineSpec.networkInterface()` 中读取。

### `NodeView`、`NetworkPortView`、`RequestPayload`、`RequestDetails`

```java
// NodeView
static NodeView of(Identifier type, long hash);
Identifier type();
long hash();
// NetworkPortView
BlockPos position();
List<NodeView> connections();
// RequestPayload
static RequestPayload of(Map<String, DataKey> values);
Map<String, DataKey> values();
Optional<DataKey> get(String key);
// RequestDetails
Identifier requestId();
NodeView peer();
```

节点用机器类型 ID 与实例身份 hash 定位。不要把 hash 当坐标或可自行推断的拓扑地址。端口只能从运行上下文枚举取得；`NodeView.of` 可以构造已知身份，但不能绕过连接校验。

请求体为不可变的字符串键→DataKey 值映射，键不得空白，值不得 null。`RequestDetails.peer()` 在接收处理时标识发送方，失败处理中表示请求的对端目标。

### `Networks`

```java
public static List<NetworkPortView> interfaces(MachineContext context);
public static void sendRequest(NetworkPortView source, NodeView target,
        Identifier requestId, RequestPayload body);
```

枚举当前已成型机器的可用网络接口；缺失控制器/结构或未加载接口不会产生可用句柄。发送将请求放入服务端队列，不同步返回处理结果；目标必须在 source 的连接表中，不相连时直接抛 `IllegalArgumentException`，不走派发失败回调。入队后的结构、hash、白名单、区块和处理器检查可能使请求失败。

```java
if (context.isDue(20)) {
    for (NetworkPortView port : Networks.interfaces(context)) {
        for (NodeView target : port.connections()) {
            Networks.sendRequest(port, target,
                    Identifier.fromNamespaceAndPath("my_mod", "report_power"),
                    RequestPayload.of(Map.of("power", DataKey.of(20.0D))));
        }
    }
}
```

### `RequestHandler`、`FailureHandler`、`RequestFailure`

```java
// RequestHandler（用户函数式接口）
void process(RequestPayload body, RequestDetails request,
        @Nullable DataStore senderStorage, @Nullable DataStore receiverStorage);
// FailureHandler（用户函数式接口）
void fail(RequestPayload body, RequestDetails request,
        @Nullable DataStore senderStorage, RequestFailure reason);

public enum RequestFailure {
    SOURCE_INTERFACE_MISSING, TARGET_INTERFACE_MISSING, TARGET_CHUNK_UNLOADED, CONNECTION_MISSING,
    SOURCE_STRUCTURE_INVALID, TARGET_STRUCTURE_INVALID, HASH_MISMATCH, ALLOWLIST_REJECTED,
    TARGET_HANDLER_MISSING, UNREACHABLE
}
```

两个存储参数都可为 null，先判空。处理器由 `MachineDraft.requestProcess`/`requestFailed` 注册，重复 ID 被拒绝。回调写入**不隐式具有事务性**；若处理异常，不应假设之前的普通存储写入自动回滚。

```java
Identifier report = Identifier.fromNamespaceAndPath("my_mod", "report_power");
machine.networkInterface(1, 4)
        .allowNetworkMachine(Identifier.fromNamespaceAndPath("my_mod", "producer"))
        .requestProcess(report, (body, request, sender, receiver) -> {
            if (receiver == null) return;
            double power = body.get("power").flatMap(DataKey::asDouble).orElse(0D);
            receiver.set("power_" + request.peer().hash(), DataKey.of(power));
        })
        .requestFailed(report, (body, request, sender, reason) -> {
            if (sender != null) sender.set("last_failure", DataKey.of(reason.name()));
        });
```

源/目标接口缺失、区块未加载、连接缺失、结构失效、身份不匹配、白名单拒绝、目标处理器缺失和不可达分别对应枚举值。白名单与网络接口能力是不同配置，应配置实际通信双方允许的机器类型。

源码：[公共网络入口](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/network/Networks.java)、[网络适配](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/api/facade/network/NetworkAdapters.java)。

## 16. presentation 控制器文本与 Jade

`cn.howxu.mmcr.publicapi.presentation`

### `ControllerText` 与 `TextScope`

```java
public enum TextScope { CONTROLLER, OPERATION }
void append(TextScope scope, Identifier lineId, Component text);
void appendAfter(TextScope scope, Identifier lineId, Identifier afterLineId, Component text);
void replace(Identifier lineId, Component text);
void remove(TextScope scope, Identifier lineId);
void clear(TextScope scope);
```

文本使用稳定、带命名空间的 lineId 管理；CONTROLLER 为控制器级文本，OPERATION 为操作文本。`appendAfter` 仅相对同 scope 的已存在行插入，缺失或跨 scope 的引用是 no-op。`replace` 无 scope 参数，排队等待控制器处理器结束后的 flush，**不是立刻更改当前快照**；不要写成不存在的 `replace(scope, ...)`。通过 `Component.translatable` 保留本地化。

### `ControllerTexts`、`ControllerTextHandler`、`ControllerTextContext`

```java
// ControllerTexts
public static ControllerTexts.Registration register(Identifier machineId, ControllerTextHandler handler);
// ControllerTexts.Registration
void unregister();
// ControllerTextHandler（用户 SPI）
void apply(ControllerTextContext context);
// ControllerTextContext
Identifier machineId();
BlockPos controllerPos();
ControllerText screenText();
```

注册特定机器的文本处理器，返回可注销句柄。此上下文只提供机器 ID、位置和文本出口，没有服务器世界、数据存储或可变控制器实体；需要运行数据时应在行为上下文中更新文本。

```java
ControllerTexts.Registration registration = ControllerTexts.register(MACHINE, context ->
        context.screenText().append(TextScope.CONTROLLER,
                Identifier.fromNamespaceAndPath("my_mod", "hint"),
                Component.translatable("screen.my_mod.hint")));
// 需要撤销时 registration.unregister()
```

### `JadeText`

```java
void append(Identifier lineId, Component text);
void appendAfter(Identifier lineId, Identifier afterLineId, Component text);
void replace(Identifier lineId, Component text);
void remove(Identifier lineId);
void clear();
```

由 `MachineContext.jadeText()` 取得，行 ID 用于更新/移除，而不是在每个 tick 无标识地重复添加字符串。Jade 文本无 scope 参数。

### `IoDisplay` 与 `DisplayStackView`

```java
// IoDisplay
String label();
String value();
String unit();
Optional<DisplayStackView> icon();
// DisplayStackView
ItemStack stack();
```

从 `IoSnapshot.displays()` 读取能力展示条目。icon 可缺失；展示堆栈是副本。label/value/unit 是展示数据，不是执行需求或资源句柄。

## 17. 客户端 rendering

`cn.howxu.mmcr.publicapi.client.render`, 事件在 `.event`

### `RegisterControllerRenderersEvent` 与 `RendererRegistrar`

```java
// RegisterControllerRenderersEvent extends Event
public RegisterControllerRenderersEvent(Collection<Identifier> machineIds);
public RendererRegistrar registrar();
public void register(Identifier machineId, ControllerRenderer renderer);
public Map<Identifier, ControllerRenderer> renderers();
// RendererRegistrar
void register(Identifier machineId, ControllerRenderer renderer);
Map<Identifier, ControllerRenderer> renderers();
```

客户端窗口注册每机器渲染器；机器 ID 必须存在，重复/窗口关闭会被拒绝。仅在客户端初始化订阅此事件，避免专用服务器加载渲染类。渲染器注册不是替换机器基础控制器定义。

### `ControllerRenderer`

```java
void render(ControllerRenderContext context, PoseStack poses,
        SubmitNodeCollector nodes, CameraRenderState camera);
default boolean shouldRenderOffScreen(); // false
default int getViewDistance(); // 64
```

Minecraft 26.1.2 使用提交节点渲染路径。`PoseStack` 来自 `com.mojang.blaze3d.vertex`，`SubmitNodeCollector` 来自 `net.minecraft.client.renderer`，`CameraRenderState` 来自 `net.minecraft.client.renderer.state.level`。不要套用旧的 MultiBufferSource 参数示例。默认只在视野内渲染、视距 64。

### `ControllerRenderContext`

```java
BlockPos controllerPos();
Identifier machineId();
@Nullable Direction facing();
ControllerRenderContext.StructureView structure();
ControllerRenderContext.CraftingView crafting();
Map<String, DataKey> dataStorageValues();
int lightCoords();
float partialTick();

// ControllerRenderContext.StructureView
boolean formed();
boolean structureAreaLoaded();
int matchedStage();
// ControllerRenderContext.CraftingView
@Nullable Identifier recipeId();
ControllerRenderContext.Status status();
String statusMessage();
@Nullable RuntimeFailure failure();
int tick();
int totalTick();
long parallelism();
long maxParallelism();
enum Status { IDLE, CRAFTING, MISSING_STRUCTURE, CHUNK_UNLOADED, NO_RECIPE, PAUSED }
```

渲染回调只收到 MMCR 发布的渲染安全只读状态，没有服务器世界或可变存储。`statusMessage` 是翻译键；`recipeId`/`failure`/`facing` 可缺失。渲染时只能读取 `dataStorageValues()`，不能通过它修改服务端数据。

```java
event.register(MACHINE, new ControllerRenderer() {
    @Override
    public void render(ControllerRenderContext context, PoseStack poses,
            SubmitNodeCollector nodes, CameraRenderState camera) {
        if (!context.structure().formed()) return;
        poses.pushPose();
        try {
            // 根据 crafting() / dataStorageValues() 计算动画并提交渲染节点
        } finally {
            poses.popPose();
        }
    }
});
```

源码：[渲染签名](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderer.java)、[已发布状态视图](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderContext.java)。

18. JEI 工作台与说明

`cn.howxu.mmcr.publicapi.client.jei`, 事件在 `.event`

### `RegisterJeiWorkstationsEvent` 与 `WorkstationRegistrar`

```java
// RegisterJeiWorkstationsEvent extends Event
public RegisterJeiWorkstationsEvent();
public WorkstationRegistrar registrar();
public void addRecipePoolWorkstation(Identifier poolId, Identifier itemId);
public void addRecipePoolWorkstation(Identifier poolId, ItemLike workstation);
public void addRecipePoolWorkstation(Identifier poolId, ItemStack workstation);
public void addMachineWorkstation(Identifier machineId, Identifier recipeTypeId);
public List<Workstation> entries();
// WorkstationRegistrar
void addRecipePoolWorkstation(Identifier poolId, Identifier itemId);
void addRecipePoolWorkstation(Identifier poolId, ItemLike workstation);
void addRecipePoolWorkstation(Identifier poolId, ItemStack workstation);
void addMachineWorkstation(Identifier machineId, Identifier recipeTypeId);
List<Workstation> entries();
```

配方池工作台绑定物品 ID 或带组件堆栈；机器工作台将机器控制器关联到指定 JEI recipe type ID。第二个 ID 不是机器 ID，也不能未经核对就认为与任意配方池 ID 相同。`ItemLike` 来自 Minecraft。

### `Workstation`

```java
// Workstation：库生成的基础接口，无方法
// Workstation.RecipePoolItem extends Workstation
Identifier recipePoolId();
Identifier itemId();
// Workstation.RecipePoolStack extends Workstation
Identifier recipePoolId();
ItemStack workstation();
// Workstation.Machine extends Workstation
Identifier machineId();
Identifier recipeTypeId();
```

根据具体子接口读取关联；堆栈 getter 返回副本，不能通过更改它调整已注册工作台。

### `RegisterJeiRecipeInformationEvent` 与 `RecipeInformationRegistrar`

```java
// RegisterJeiRecipeInformationEvent extends Event
public RegisterJeiRecipeInformationEvent();
public RecipeInformationRegistrar registrar();
public void registerRecipePool(Identifier id, String translationKey, Object... arguments);
public void registerRecipe(Identifier id, String translationKey, Object... arguments);
public List<RecipeInformation> entries();
// RecipeInformationRegistrar
void registerRecipePool(Identifier id, String translationKey, Object... arguments);
void registerRecipe(Identifier id, String translationKey, Object... arguments);
List<RecipeInformation> entries();
```

注册整池说明或单配方说明，参数作为本地化参数而非 Java 格式化字符串拼接。客户端 JEI 注册窗口结束后不能追加。

### `RecipeInformation`

```java
enum Target { RECIPE_POOL, RECIPE }
Target target();
Identifier targetId();
String translationKey();
List<Object> arguments();
Component component();
```

返回说明目标与本地化数据；组件与可变参数在公共边界按实现复制处理。

```java
static void workstations(RegisterJeiWorkstationsEvent event) {
    event.addRecipePoolWorkstation(Identifier.fromNamespaceAndPath("my_mod", "shared_pool"),
            Items.IRON_BLOCK);
}
static void information(RegisterJeiRecipeInformationEvent event) {
    event.registerRecipePool(Identifier.fromNamespaceAndPath("my_mod", "shared_pool"),
            "jei.my_mod.shared_pool.info", 40);
}
```

这些事件在 JEI 集成收集阶段发布，不是通用机器定义 Provider 的附加方法。注册返回列表只用于查看条目，不表示 JEI 已经完成解析和渲染。

## 19. 使用与迁移自检

- import 从 `cn.howxu.mmcr.publicapi` 及本页列出的子包选择；Java 公共示例不引入 MMCR 底层 `api`/内部适配类型。
- 机器、结构、配方分别通过 `Machines`、`Structures`、`Recipes` 工厂声明，并在相应事件窗口提交。`Consumer<Draft>` 配置完成后由 MMCR 构建。
- 声明视图、运行视图和自定义载荷 SPI 有不同所有权：只实现明确开放的 SPI，复制堆栈/载荷后修改不会自动回写。
- 直接 tick IO 先模拟再一次性提交；同步数据变更用带事务的 `DataStore.set`，网络回调普通写入不隐式回滚。
- 客户端渲染读取已发布状态，26.1.2 渲染签名使用提交节点；JEI 注册工作台与说明各有窗口。
- 扩展需求/输出同时提供序列化、复制、规划及输出需求转换契约；底层端口能力实现不包含在公共 API jar 中。

端口数量与等级约束部分以 `c2563c41` 为基准，其余签名与源码链接以 `f234477b` 为基准。升级源码后应重新核对公共层声明及底层执行语义，而不是仅替换包名前缀。
