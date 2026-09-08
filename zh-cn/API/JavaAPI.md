---
title: JavaAPI
---

# Java 公共 API 参考

本节是 MMCR 全部 Java 公共 API 的集中参考。所有 Java API 按主题分节，每节先给完整类名，再列出方法签名、参数、抛出条件、默认值与示例。教程文档中提到的所有 API 都可以在这里查到详细说明。

## 包路径

所有公共 API 都位于 `cn.howxu.mmcr.api.publicapi` 及其子包，并通过 `apiJar` 单独发布：

- `cn.howxu.mmcr.api.publicapi` — 顶层接口与运行时入口（`MachineApi`、`RecipeApi`、`ReadableNumber`、`ApiRegistrationException`、`ApiRuntime`、`MachineDefinitionProvider` 等）。
- `cn.howxu.mmcr.api.publicapi.event` — 事件总线事件。
- `cn.howxu.mmcr.api.publicapi.machine` — 机器相关类型。
- `cn.howxu.mmcr.api.publicapi.recipe` — 配方相关类型。
- `cn.howxu.mmcr.api.publicapi.recipe.component` — 配方组件谓词（`ComponentPredicate`、`DataComponentPredicateSet`）。
- `cn.howxu.mmcr.api.publicapi.recipe.modifier` — 配方修饰符操作名（`RecipeModifier.IOType`、`RecipeModifier.Operation`）。
- `cn.howxu.mmcr.api.publicapi.recipe.requirement` — 配方需求项边界接口（`MachineRequirement`、`CustomRequirement`）。
- `cn.howxu.mmcr.api.publicapi.data` — 机器数据存储与值包装（`DataStorage`、`DataValue`、`DataValueType`、`DataReservation`、`DataRepository*`）。
- `cn.howxu.mmcr.api.publicapi.network` — 机器网络通信（`NetworkApi`、`MachineReference`、`NetworkInterfaceReference`、`RequestBody`、`RequestInfo`、`RequestProcess`、`RequestFailed`、`RequestFailureReason`）。
- `cn.howxu.mmcr.api.publicapi.controller` — 控制器屏幕文本与 Jade。
- `cn.howxu.mmcr.api.publicapi.render` — 控制器渲染器。

启动期注册相关的类型（见 `package-info.java` 的 ABI allow-list）是稳定 API；运行期数据存储、网络与配方修饰符等子包位于公共 jar 内、API 仍可能在后续小版本内调整，调用方应在小版本升级时回归验证。

## 阅读建议

- 第一次阅读：仅看教程目录下 [JavaAPI/开始](/zh-cn/JavaAPI/BLAST_FURNACE) 这篇示例，看完对整体流程有概念。
- 写代码时：按需跳转到本节对应章节查阅签名与边界条件。
- 写完代码后：回到教程页面，对照本节注意事项一节检查是否触及边界。

---

## 1 机器定义阶段

### `MachineDefinitionProvider`

完整类名：`cn.howxu.mmcr.api.publicapi.MachineDefinitionProvider`

MMCR 的启动期扩展点接口。所有声明机器定义的 Mod 必须实现该接口，并通过 `ServiceLoader` 在 `META-INF/services/cn.howxu.mmcr.api.publicapi.MachineDefinitionProvider` 中注册实现类。

#### 接口签名

```java
public interface MachineDefinitionProvider {
    default void register(MMCRMachineDefinationsEvent event) {}
}
```

#### `register(MMCRMachineDefinationsEvent event)`

启动期由 MMCR 内部调用，向当前注册窗口提交该 Provider 的全部机器定义。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `event` | `MMCRMachineDefinationsEvent` | MMCR 提供的注册窗口。 |

抛出：

- `ApiRegistrationException`：启动注册窗口尚未开启、已被冻结，或声明无效或重复。
- `IllegalStateException`：重复声明同一机器 ID 或同一配方 ID。
- `IllegalArgumentException`：机器 ID、配方 ID 或参数非法。

#### 使用方式

1. 实现接口。在 `register(...)` 内通过 `event.registerMachine(...)` 提交机器定义；配方与结构推荐通过 NeoForge 事件总线（`MMCRMachineStructuresEvent`、`MMCRMachineRecipesEvent`）单独注册，避免与启动期耦合。
2. 在 `src/main/resources/META-INF/services/` 下新建与接口全限定名完全同名的文件，文件内每行写入一个 Provider 类的全限定名。
3. 编译并启动游戏，MMCR 启动期会自动遍历所有声明的 Provider。

#### 示例

```java
public final class MyMachinesProvider implements MachineDefinitionProvider {
    public static final Identifier MY_MACHINE =
            Identifier.fromNamespaceAndPath("my_mod", "my_machine");

    @Override
    public void register(MMCRMachineDefinationsEvent event) {
        if (event.definitions().containsKey(MY_MACHINE)) return;
        event.registerMachine(MY_MACHINE, builder -> builder
                .displayNameKey("machine.my_mod.my_machine"));
    }
}
```

`META-INF/services/cn.howxu.mmcr.api.publicapi.MachineDefinitionProvider`：

```
com.example.mymachines.MyMachinesProvider
```

:::warning 注意事项

- 一个 Mod 可以注册多个 Provider，每个 Provider 仅负责自己声明的机器，MMCR 会按 `ServiceLoader.load(...)` 返回顺序依次调用。
- 不要在 Provider 实现内持有任何 `MachineDefinition` 实例的强引用；定义应在 `register(...)` 内即时构建并提交。
- Provider 的生命周期与启动期绑定。结构与配方事件通过 NeoForge 事件总线发布，必须通过 `@SubscribeEvent` 订阅，与 Provider 是两条独立路径。

---
:::
### `MMCRMachineDefinationsEvent`

完整类名：`cn.howxu.mmcr.api.publicapi.event.MMCRMachineDefinationsEvent`

机器定义阶段的注册窗口事件。该事件由 MMCR 在启动期通过 `ServiceLoader` 收集所有 `MachineDefinitionProvider` 时发布，用于接收 Mod 提交的机器定义。

#### 类签名

```java
public class MMCRMachineDefinationsEvent extends Event {
    public void registerMachine(Identifier id, UnaryOperator<MachineBuilder> consumer);
    public void registerMachine(MachineDefinition definition);
    public Map<Identifier, MachineDefinition> definitions();
    public void freeze();
}
```

#### `registerMachine(Identifier id, UnaryOperator<MachineBuilder> consumer)`

以回调方式创建机器定义。MMCR 会创建默认 `MachineBuilder`，交由回调链式配置。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `id` | `Identifier` | 机器注册 ID，必须全局唯一。 |
| `consumer` | `UnaryOperator<MachineBuilder>` | 配置机器构建器的回调。返回的构建器会自动 `build()`。 |

抛出：

- `IllegalStateException`：注册窗口已冻结（`freeze()` 后再次调用），或同一 ID 已被声明。
- `NullPointerException`：`id` 或 `consumer` 为 `null`，或回调返回 `null`。

#### `registerMachine(MachineDefinition definition)`

直接提交一个已构建好的机器定义。

抛出：

- `IllegalStateException`：注册窗口已冻结，或同一 ID 已被声明。
- `NullPointerException`：`definition` 为 `null`。

#### `definitions()`

返回当前已注册的全部机器定义的不可变快照。键为机器 ID，值为机器定义实例。适合用于幂等检查：

```java
if (event.definitions().containsKey(MY_MACHINE)) return;
event.registerMachine(MY_MACHINE, ...);
```

#### `freeze()`

冻结注册窗口。冻结后再次调用 `registerMachine` 会抛出 `IllegalStateException`。MMCR 内部在收集完所有 Provider 后自动调用。

#### 触发时机

MMCR 启动期在加载所有 Provider 之前初始化一个空的 `MMCRMachineDefinationsEvent`，逐个调用 `Provider.register(event)`，最后调用 `freeze()`。启动窗口结束后不可再次注册。

:::warning 注意事项

- 机器定义事件不可热加载。修改 Provider 后必须重启游戏。
- 不要在同一 Mod 内用多个 Provider 声明同一机器 ID。
- 机器定义只包含机器本身的属性（外观、控制器、并行、工厂等）。多方块结构应在 `MMCRMachineStructuresEvent` 中提交，配方应在 `MMCRMachineRecipesEvent` 中提交。

---
:::
### `MachineBuilder`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.MachineBuilder`

流式构建机器定义的入口。所有机器属性通过该构建器声明，最终调用 `build()` 返回一个不可变的 `MachineDefinition`。

#### 类签名

```java
public final class MachineBuilder {
    public static MachineBuilder machine(Identifier id);

    public MachineBuilder displayNameKey(String displayNameKey);
    public MachineBuilder controller(UnaryOperator<ControllerSpec.Builder> builder);
    public MachineBuilder appearance(UnaryOperator<AppearanceSpec.Builder> builder);
    public MachineBuilder factory(UnaryOperator<FactorySpec.Builder> builder);
    public MachineBuilder recipeBehavior(UnaryOperator<RecipeBehavior.Builder> builder);
    public MachineBuilder tickBehavior(Consumer<TickBehavior.Builder> builder);
    public MachineBuilder preServerTick(MachineBehavior.MachineCallback callback);
    public MachineBuilder postServerTick(MachineBehavior.MachineCallback callback);

    public MachineBuilder role(MachineRole role);
    public MachineBuilder acceptedModule(Identifier moduleId);

    public MachineBuilder networkInterface(int maxCount, int maxConnections);
    public MachineBuilder allowNetworkMachine(Identifier machineId);

    public MachineBuilder maxParallelism(long maxParallelism);
    public MachineBuilder parallelizable(boolean parallelizable);
    public MachineBuilder allowModifiers();
    public MachineBuilder allowModifiers(boolean allow);
    public MachineBuilder allowMultithreading();
    public MachineBuilder allowMultithreading(boolean allow);
    public MachineBuilder maxParallelAmount(int amount);

    public MachineBuilder smartInterface(SmartInterfaceType type);
    public MachineBuilder shareSmartInterfaces();
    public MachineBuilder shareSmartInterfaces(boolean share);
    public MachineBuilder smartInterfaceModifier(SmartInterfaceModifier modifier);

    public MachineBuilder runningSound(Identifier soundId);
    public MachineBuilder finishSound(Identifier soundId);

    public MachineBuilder failureAction(RecipeFailureActions failureAction);
    public MachineBuilder requestProcess(Identifier requestId, RequestProcess process);
    public MachineBuilder requestFailed(Identifier requestId, RequestFailed failure);

    public MachineDefinition build();
}
```

#### `machine(Identifier id)`

静态工厂方法，以命名空间 ID 创建机器构建器。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `id` | `Identifier` | 机器注册 ID，必须全局唯一。建议遵循 `命名空间:注册名` 惯例。 |

抛出：

- `NullPointerException`：`id` 为 `null`。

#### `displayNameKey(String displayNameKey)`

设置机器的本地化键名。建议遵循 `machine.<命名空间>.<注册名>` 惯例。

#### `appearance(UnaryOperator<AppearanceSpec.Builder> builder)`

声明机器的基础外观方块、控制器方块纹理、成型后的端口底面纹理。详见后续 `AppearanceSpec` 节。

#### `factory(UnaryOperator<FactorySpec.Builder> builder)`

声明机器的工厂并行能力。详见后续 `FactorySpec` 节。

#### `recipeBehavior(UnaryOperator<RecipeBehavior.Builder> builder)`

自定义配方行为（`idleStart`、`recipeTick`、`beforeFinish` 等钩子）。

#### `tickBehavior(Consumer<TickBehavior.Builder> builder)`

声明机器不使用配方，而是按 tick 由自定义逻辑驱动。与 `recipeBehavior(...)` 互斥；调用 `tickBehavior(...)` 后再调用 `recipeBehavior(...)` 会抛 `IllegalStateException`。

#### `preServerTick(...)` / `postServerTick(...)`

注册服务器 tick 钩子。仅在 `recipeBehavior` 上下文内可用；调用 `tickBehavior(...)` 后再调用这些钩子会抛 `IllegalStateException`。

#### `maxParallelism(long maxParallelism)`

设置最大并行数。`< 1L` 抛 `IllegalArgumentException`。

#### `parallelizable(boolean parallelizable)`

是否允许并行处理。允许时，结构中放置并行控制器可让同一配方同时运行多份。

#### `allowMultithreading()` / `allowMultithreading(boolean allow)`

是否允许多线程处理。允许时机器可以在多个工作线程上并发处理多个配方。

#### `maxParallelAmount(int amount)`

最大并行倍数。`< 1` 抛 `IllegalArgumentException`。

#### `allowModifiers()` / `allowModifiers(boolean allow)`

是否允许使用机器修饰符。

#### `role(MachineRole role)`

设置机器角色。普通机器为 `MachineRole.NORMAL`；作为模块宿主的机器使用 `MachineRole.HOST`。`HOST` 角色必须通过 `acceptedModule(...)` 至少声明一个接受的模块 ID，否则 `build()` 抛 `IllegalStateException`。

#### `acceptedModule(Identifier moduleId)`

声明本机器接受的模块机器 ID。仅 `HOST` 角色可以使用。

#### `networkInterface(int maxCount, int maxConnections)`

启用网络接口能力，限制最大接口数与最大连接数。

#### `allowNetworkMachine(Identifier machineId)`

将指定机器 ID 加入网络白名单。

#### `smartInterface(SmartInterfaceType type)`

注册智能接口类型。类型 ID 重复抛 `IllegalArgumentException`。

#### `shareSmartInterfaces()` / `shareSmartInterfaces(boolean share)`

是否让多线程实例共享智能接口。

#### `smartInterfaceModifier(SmartInterfaceModifier modifier)`

注册智能接口修饰符。

#### `runningSound(Identifier soundId)` / `finishSound(Identifier soundId)`

设置运行时 / 配方结束时的音效 ID。

#### `failureAction(RecipeFailureActions failureAction)`

设置配方失败处理策略。详见 `RecipeFailureActions`。

#### `requestProcess(Identifier requestId, RequestProcess process)`

注册请求处理器。`requestId` 重复抛 `IllegalArgumentException`。

#### `requestFailed(Identifier requestId, RequestFailed failure)`

注册请求失败处理器。`requestId` 重复抛 `IllegalArgumentException`。

#### `build()`

终结构建，返回不可变的 `MachineDefinition`。`build()` 在内部会进行所有约束的最终检查，例如：

- `maxParallelism < 1` → `IllegalArgumentException`
- `maxParallelAmount < 1` → `IllegalArgumentException`
- `role == HOST` 但未声明任何模块 → `IllegalStateException`
- `role != HOST` 但声明了模块 → `IllegalStateException`
- 配方 tick 钩子与 `tickBehavior` 互斥 → `IllegalStateException`

#### 默认值

- `appearance` → `AppearanceSpec.builder().build()`
- `controller` → `ControllerSpec.builder().build()`
- `factory` → `FactorySpec.builder().build()`
- `role` → `MachineRole.NORMAL`
- `maxParallelism` → `1L`
- `parallelizable` → `false`
- `allowMultithreading` → `false`
- `maxParallelAmount` → `1`
- `behavior` → `RecipeBehavior.defaults()`（配方数据驱动）

:::warning 注意事项

- 构建器内部持有可变状态，所有 `xxx(...)` 调用返回 `this` 以支持链式调用。
- 多次调用同一字段方法会覆盖之前的值。例如两次 `displayNameKey(...)`，以最后一次为准。
- 不要在多个线程上共享一个构建器实例。构建器不是线程安全的。

---
:::
### `MachineDefinition`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.MachineDefinition`

机器定义的不可变记录，通过 `MachineBuilder.build()` 创建。包含机器的全部静态属性。

#### 记录签名

```java
public record MachineDefinition(
        Identifier id,
        String displayNameKey,
        ControllerSpec controller,
        AppearanceSpec appearance,
        FactorySpec factory,
        MachineRole role,
        Set<Identifier> acceptedModuleIds,
        NetworkInterfaceSpec networkInterface,
        long maxParallelism,
        boolean parallelizable,
        RecipeFailureActions failureAction,
        boolean allowModifiers,
        boolean allowMultithreading,
        int maxParallelAmount,
        boolean expandableStructure,
        Map<String, SmartInterfaceType> smartInterfaceTypes,
        boolean shareSmartInterfaces,
        List<SmartInterfaceModifier> smartInterfaceModifiers,
        Identifier runningSoundId,
        Identifier finishSoundId,
        BlockArray pattern,
        MachineBehavior behavior,
        Map<Identifier, RequestProcess> requestProcessors,
        Map<Identifier, RequestFailed> requestFailures) { ... }
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | `Identifier` | 机器注册 ID。 |
| `displayNameKey` | `String` | 本地化键名。如果未指定则回退到 `machine.<命名空间>.<注册名>`。 |
| `controller` | `ControllerSpec` | 控制器规格。 |
| `appearance` | `AppearanceSpec` | 外观规格。 |
| `factory` | `FactorySpec` | 工厂并行规格。 |
| `role` | `MachineRole` | 机器角色：普通 / 模块宿主。 |
| `acceptedModuleIds` | `Set<Identifier>` | 已接受的模块机器 ID 集合（仅 HOST）。 |
| `networkInterface` | `NetworkInterfaceSpec` | 网络接口规格。 |
| `maxParallelism` | `long` | 最大并行数。`< 1` 抛 `IllegalArgumentException`。 |
| `parallelizable` | `boolean` | 是否允许并行处理。 |
| `failureAction` | `RecipeFailureActions` | 配方失败处理策略。 |
| `allowModifiers` | `boolean` | 是否允许使用机器修饰符。 |
| `allowMultithreading` | `boolean` | 是否允许多线程处理。 |
| `maxParallelAmount` | `int` | 最大并行倍数。`< 1` 抛 `IllegalArgumentException`。 |
| `expandableStructure` | `boolean` | 是否支持扩展结构。 |
| `smartInterfaceTypes` | `Map<String, SmartInterfaceType>` | 智能接口类型映射。 |
| `shareSmartInterfaces` | `boolean` | 多线程实例是否共享智能接口。 |
| `smartInterfaceModifiers` | `List<SmartInterfaceModifier>` | 智能接口修饰符列表。 |
| `runningSoundId` | `Identifier` | 运行时音效 ID。 |
| `finishSoundId` | `Identifier` | 配方结束时音效 ID。 |
| `pattern` | `BlockArray` | 旧式结构的方块数组模式（兼容字段）。 |
| `behavior` | `MachineBehavior` | 机器行为实现（配方行为 / tick 行为）。 |
| `requestProcessors` | `Map<Identifier, RequestProcess>` | 请求处理器映射。 |
| `requestFailures` | `Map<Identifier, RequestFailed>` | 请求失败处理器映射。 |

#### 构造约束

- `id` 不能为 `null`，否则 `IllegalArgumentException`。
- `displayNameKey` 不能为空字符串，但可以为 `null`（使用默认）。
- `maxParallelism < 1` 抛 `IllegalArgumentException`。
- `maxParallelAmount < 1` 抛 `IllegalArgumentException`。
- `role != HOST` 但 `acceptedModuleIds` 非空 → `IllegalStateException`。
- `role == HOST` 但 `acceptedModuleIds` 为空 → `IllegalStateException`。

:::warning 注意事项

- `MachineDefinition` 是不可变值对象。一旦构建完成，所有属性都不可修改。
- `pattern` 字段为旧式兼容字段，新代码应使用 `MachineStructureDefinition` 替代。
- `behavior` 字段必须是 `RecipeBehavior` 或 `TickBehavior` 的实例。

---
:::
### `AppearanceSpec`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.AppearanceSpec`

机器外观规格的不可变记录。通过 `MachineBuilder.appearance(...)` 配置。

#### 记录签名

```java
public record AppearanceSpec(
        Identifier machineBasicBlock,
        Identifier controllerBaseTexture,
        Identifier formedPortBaseTexture) {
    public static Builder builder();
}
```

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `machineBasicBlock` | `Identifier` | 机器未成型时的基础方块 ID（外观方块）。 |
| `controllerBaseTexture` | `Identifier` | 控制器方块的底面纹理 ID。 |
| `formedPortBaseTexture` | `Identifier` | 成型后端口方块的底面纹理 ID。 |

#### 构建器方法

```java
public static final class Builder {
    public Builder machineBasicBlock(Identifier machineBasicBlock);
    public Builder machineBasicBlock(String machineBasicBlock);
    public Builder controllerBaseTexture(Identifier controllerBaseTexture);
    public Builder formedPortBaseTexture(Identifier formedPortBaseTexture);

    public AppearanceSpec build();
}
```

| 方法 | 含义 |
| --- | --- |
| `machineBasicBlock(...)` | 设置机器未成型时的基础方块。 |
| `controllerBaseTexture(...)` | 设置控制器方块的底面纹理 ID。 |
| `formedPortBaseTexture(...)` | 设置成型后端口方块的底面纹理 ID。 |
| `build()` | 终结构建，返回不可变的 `AppearanceSpec`。 |

:::warning 注意事项

- 三个字段都是可选的，未设置时为 `null`。MMCR 在内部使用各自的回退值。
- 字符串 ID 通过 `Identifier.parse(...)` 解析；非法字符串会抛 `IllegalArgumentException`。
- 外观纹理与基础方块的 ID 必须指向已注册的资源；未注册的 ID 不会立即报错，而是在首次渲染时表现为默认纹理。

---
:::
### `FactorySpec`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.FactorySpec`

工厂并行规格的不可变记录。通过 `MachineBuilder.factory(...)` 配置。声明机器是否支持工厂并行（多线程处理多个独立配方）。

#### 记录签名

```java
public record FactorySpec(boolean hasFactory, int threadLimit, List<ThreadSpec> threads) {
    public static Builder builder();

    public record ThreadSpec(String name, List<Identifier> recipeIds) { ... }
}
```

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `hasFactory` | `boolean` | 是否启用工厂并行。 |
| `threadLimit` | `int` | 工厂最大线程数。`< 1` 在构造时抛 `IllegalArgumentException`。 |
| `threads` | `List<ThreadSpec>` | 线程规格列表，可用于声明每个线程专用的配方子集。 |

#### `ThreadSpec`

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `name` | `String` | 线程显示名，不可为空字符串。 |
| `recipeIds` | `List<Identifier>` | 此线程专用的配方 ID 列表。 |

#### 构建器方法

```java
public static final class Builder {
    public Builder hasFactory(boolean hasFactory);
    public Builder threadLimit(int threadLimit);
    public Builder thread(String name, Identifier... recipeIds);
    public FactorySpec build();
}
```

| 方法 | 含义 |
| --- | --- |
| `hasFactory(boolean hasFactory)` | 显式声明是否启用工厂并行。`build()` 时如果 `threads` 非空也会自动启用工厂并行。 |
| `threadLimit(int threadLimit)` | 设置工厂最大线程数。`< 1` 抛 `IllegalArgumentException`。默认 `1`。 |
| `thread(String name, Identifier... recipeIds)` | 添加一个线程规格。`recipeIds` 可为空数组。 |
| `build()` | 终结构建。 |

抛出：

- `IllegalArgumentException`：`name` 为空字符串，`threadLimit < 1`。

:::warning 注意事项

- 工厂并行是"在机器内部独立线程上同时处理多个配方"的能力，与"并行控制器"（一台机器的同一配方运行多份）不同。
- 启用工厂并行后，必须同时通过 `MachineBuilder.allowMultithreading()` 启用，否则多线程不会被调度。
- 线程规格的 `recipeIds` 只是一种优先级声明——MMCR 调度器仍可在多个线程间重新分配配方。

---
:::
## 2 结构阶段

### `MMCRMachineStructuresEvent`

完整类名：`cn.howxu.mmcr.api.publicapi.event.MMCRMachineStructuresEvent`

结构阶段的注册窗口事件。该事件由 MMCR 在结构加载阶段发布，所有结构定义都通过它提交。订阅者必须通过 `@SubscribeEvent` 注册。

#### 类签名

```java
public class MMCRMachineStructuresEvent extends Event {
    public static MMCRMachineStructuresEvent prepare(Collection<Identifier> machineIds);
    public static MMCRMachineStructuresEvent current();
    public static void resetCollector();

    public void registerStructure(Identifier machineId, UnaryOperator<MachineStructureBuilder> consumer);
    public void registerStructure(MachineStructureDefinition structure);

    public void registerLevelType(cn.howxu.mmcr.api.publicapi.machine.LevelType type);
    public void registerLevel(cn.howxu.mmcr.api.publicapi.machine.MachineLevel level);

    public void registerModifier(Identifier id, ModifierDefinition definition);
    public void registerModifierItem(ItemStack stack, Identifier modifierId);

    public Map<Identifier, MachineStructureDefinition> structures();
    public Map<Identifier, LevelType> levelTypes();
    public Map<Identifier, MachineLevel> levels();
    public Map<Identifier, ModifierDefinition> modifiers();
    public Map<Identifier, List<ItemStack>> modifierItems();

    public Snapshot freeze();
}
```

#### 订阅方式

```java
@EventBusSubscriber(modid = "my_mod")
public final class MyStructureRegistrar {
    @SubscribeEvent
    public static void register(MMCRMachineStructuresEvent event) {
        event.registerStructure(MY_MACHINE, builder -> builder.fullStructure(...));
    }
}
```

#### `registerStructure(Identifier machineId, UnaryOperator<MachineStructureBuilder> consumer)`

以回调方式创建结构。回调返回的 `MachineStructureBuilder` 必须调用 `build(machineId)`。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `machineId` | `Identifier` | 目标机器的注册 ID，必须在机器定义阶段已经声明。 |
| `consumer` | `UnaryOperator<MachineStructureBuilder>` | 配置结构构建器的回调。 |

抛出：

- `ApiRegistrationException`：`machineId` 未在机器定义阶段声明过，或 `machineId` 已被声明过结构，或回调返回 `null`。
- `IllegalStateException`：注册窗口已冻结。
- `RuntimeException`：构建器配置过程中出现的任何异常都会被包装为 `ApiRegistrationException`，并附上 `machineId` 前缀。

#### `registerStructure(MachineStructureDefinition structure)`

直接提交一个已构建好的结构定义。

抛出：

- `ApiRegistrationException`：`structure` 的 `machineId` 未在机器定义阶段声明，或已被声明过结构。
- `IllegalStateException`：注册窗口已冻结。
- `NullPointerException`：`structure` 为 `null`。

#### `structures()`

返回当前已注册的全部结构的不可变快照。适合用于幂等检查。

#### 等级与修饰符

| 方法 | 含义 |
| --- | --- |
| `registerLevelType(LevelType type)` | 注册机器等级类型。等级类型是注册级别的全声明项。 |
| `registerLevel(MachineLevel level)` | 注册某个等级类型的具体等级。`level.typeId()` 必须已通过 `registerLevelType` 注册。 |
| `registerModifier(Identifier id, ModifierDefinition definition)` | 注册机器修饰符定义。 |
| `registerModifierItem(ItemStack stack, Identifier modifierId)` | 将物品绑定到修饰符。物品会被归一化到数量 1。 |

#### `freeze()`

冻结结构事件。在冻结时会对所有已注册结构进行校验：等级槽位引用的等级类型必须存在；修饰符替换项引用的修饰符必须存在；修饰符物品绑定的修饰符必须存在。

#### 触发时机

MMCR 在结构加载阶段创建并发布该事件。所有 Mod 的订阅者依次执行后冻结事件。当前生产构建中结构定义不可热加载——修改后必须重启游戏。

:::warning 注意事项

- 结构事件是 NeoForge 事件总线事件，必须通过 `@SubscribeEvent` 订阅。
- 一个机器 ID 只能注册一个结构。重复注册抛 `ApiRegistrationException`。
- 结构的全部字符方块必须在模式构建阶段通过 `PatternBuilder.where(...)` 绑定。
- `freeze()` 时会做最终一致性校验。
- 同一机器 ID 在 KubeJS 与 Java 端如果都想注册结构，只允许一次——重复注册会被覆盖检测拦截。

---
:::
### `MachineStructureBuilder`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.MachineStructureBuilder`

机器结构阶段的入口构建器，由 `MMCRMachineStructuresEvent.registerStructure(...)` 创建。一台机器的结构由一个或多个"结构阶段"（`StructureStage`）组成，最常见的结构只包含一个完整的 `FULL` 阶段。

#### 类签名

```java
public final class MachineStructureBuilder {
    public static MachineStructureBuilder structure();

    public MachineStructureBuilder stateSensitive();
    public MachineStructureBuilder stateInsensitive();

    public MachineStructureBuilder fullStructure(UnaryOperator<StructureStage.Builder> consumer);
    public MachineStructureBuilder expandStructure(UnaryOperator<StructureStage.Builder> consumer);
    public MachineStructureBuilder extension(UnaryOperator<StructureStage.Builder> consumer);

    public MachineStructureDefinition build(Identifier machineId);
}
```

#### 方法

| 方法 | 含义 |
| --- | --- |
| `structure()` | 静态工厂方法，创建结构构建器。 |
| `stateSensitive()` / `stateInsensitive()` | 声明结构匹配是否对方块状态敏感。默认 `stateInsensitive`。 |
| `fullStructure(UnaryOperator<StructureStage.Builder> consumer)` | 添加一个完整结构阶段。回调 `StructureStage.Builder` 内可声明模式、端口需求、端口等级和结构要求。一台机器必须且只能有一个 `FULL` 阶段。 |
| `expandStructure(UnaryOperator<StructureStage.Builder> consumer)` | 添加一个扩展结构阶段。必须在 `fullStructure(...)` 之后调用。 |
| `extension(UnaryOperator<StructureStage.Builder> consumer)` | 添加附属结构。附属结构独立于 `FULL` 阶段。 |
| `build(Identifier machineId)` | 终结构建，返回不可变的 `MachineStructureDefinition`。 |

抛出：

- `IllegalArgumentException`：阶段列表为空、缺少 `FULL` 阶段、存在多个 `FULL` 阶段。
- `IllegalStateException`：`expandStructure` 之前未声明 `FULL` 阶段；模式未声明或控制器符号缺失。

:::warning 注意事项

- 一台机器必须且只能有一个 `FULL` 阶段。
- `expandStructure(...)` 必须在 `fullStructure(...)` 之后调用。
- 与 KubeJS API 的对照：KubeJS 的 `.pattern(...)` / `.set(...)` / `.controller(...)` / `.build()` 在底层会自动包裹一个 `fullStructure(...)`，Java API 因此多了一层包装。

---
:::
### `StructureStage`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.StructureStage`

一个机器结构由若干个"结构阶段"组成。`StructureStage` 是其中一个阶段的不可变记录。

#### 记录签名

```java
public record StructureStage(
        Kind kind,
        PatternDefinition pattern,
        PortRequirements portRequirements,
        PortTiers portTiers,
        StructureRequirements requirements) {
    public enum Kind { FULL, EXPANSION, EXTENSION }

    public static Builder builder();
}
```

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `kind` | `Kind` | 阶段种类：`FULL`、`EXPANSION`、`EXTENSION`。 |
| `pattern` | `PatternDefinition` | 结构模式定义。 |
| `portRequirements` | `PortRequirements` | 端口需求。 |
| `portTiers` | `PortTiers` | 端口最低等级。 |
| `requirements` | `StructureRequirements` | 等级槽位、修饰符替换等高级要求。 |

#### 构建器方法

```java
public static final class Builder {
    public Builder full();          // 默认 FULL
    public Builder expansion();
    public Builder extension();

    public Builder pattern(UnaryOperator<PatternBuilder> builder);
    public Builder ports(UnaryOperator<PortRequirements.Builder> builder);
    public Builder portTiers(UnaryOperator<PortTiers.Builder> builder);
    public Builder requirements(UnaryOperator<StructureRequirements.Builder> builder);
    public Builder modifier(char symbol, ModifierUse use);

    public StructureStage build();
}
```

| 方法 | 含义 |
| --- | --- |
| `full()` / `expansion()` / `extension()` | 设置阶段种类。 |
| `pattern(...)` | 声明该阶段的方块匹配模式。 |
| `ports(...)` | 声明端口需求。 |
| `portTiers(...)` | 声明端口最低等级。 |
| `requirements(...)` | 声明等级槽位、修饰符替换等高级要求。 |
| `modifier(char, ModifierUse)` | 为模式中已有的字符绑定一个修饰符替换规则。 |
| `build()` | 终结构建，返回不可变的 `StructureStage`。 |

:::warning 注意事项

- 大多数机器只需要一个 `FULL` 阶段。
- 一台机器必须且只能有一个 `FULL` 阶段，由 `MachineStructureBuilder.build(...)` 校验。
- `pattern(...)` 必须被调用，否则构建器内部会因 `pattern` 为 `null` 在 `build()` 阶段抛 `NullPointerException`。

---
:::
### `PatternBuilder`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.PatternBuilder`

结构模式的入口构建器，由 `StructureStage.Builder.pattern(...)` 创建。

#### 类签名

```java
public final class PatternBuilder {
    public static PatternBuilder pattern();

    public PatternBuilder layer(String... rows);
    public PatternBuilder pattern(String... rows);
    public PatternBuilder where(char symbol, BlockPredicate predicate);
    public PatternBuilder controller(char symbol);

    public PatternDefinition build();
}
```

#### 方法

| 方法 | 含义 |
| --- | --- |
| `pattern()` | 静态工厂方法，创建模式构建器。 |
| `layer(String... rows)` / `pattern(String... rows)` | 声明一个 z 层（多个 y 行）。两种方法完全等价。 |
| `where(char symbol, BlockPredicate predicate)` | 把字符 `symbol` 绑定到方块谓词。`' '`（空格）保留为空单元格，不允许绑定。 |
| `controller(char symbol)` | 指定控制器方块所在字符。该字符必须在整个结构中出现且仅出现一次。 |
| `build()` | 终结构建，返回不可变的 `PatternDefinition`。 |

#### `layer(String... rows)` / `pattern(String... rows)` 参数

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `rows` | `String...` | 表示该 z 层上从下到上的多行。每个字符串内的字符对应从左到右的不同 x 位置。 |

示例：

```java
.layer("AXA", "XIX", "XXX")
```

展开为：

```
AXA      ← y = 0（最下层 y 行）
XIX      ← y = 1
XXX      ← y = 2（最上层 y 行）
```

字符 `' '`（空格）表示该位置不校验任何方块；其他字符必须通过 `where(...)` 绑定到一个 `BlockPredicate`。

抛出：

- `IllegalArgumentException`：`rows` 为空、行为空字符串、同层内各行宽度不一致、不同 `layer(...)` 调用之间的宽度或行数不一致。

#### `controller(char symbol)`

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `symbol` | `char` | 控制器位置的字符。 |

抛出：

- `IllegalArgumentException`：`symbol` 为空格。
- `IllegalStateException`：已经声明过控制器符号。

调用 `controller(...)` 之后，模式中未通过 `where(...)` 显式绑定该字符时，构建器会自动绑定到 `BlockPredicate.automaticController()`。

#### `build()`

抛出：

- `IllegalStateException`：未声明任何 layer、未声明控制器符号、模式中存在未绑定的字符、控制器符号在模式中未出现或出现多于一次。

#### 字符匹配语义

`layer(...)` 的参数按 `rowIndex` 顺序对应同一 z 层内从下到上的 y 行；同一字符串内的每个字符按 `columnIndex` 顺序对应同一行中的不同 x 位置。不同 `layer(...)` 调用对应不同 z 层。

:::warning 注意事项

- 不同 `layer(...)` 调用必须保持相同的行数（高度）和每行的字符数（宽度）。
- `where(...)` 与 `controller(...)` 的调用顺序不影响最终结果。
- 调用 `controller(...)` 而不调用 `where(...)` 绑定同字符的方块时，构建器会自动绑定到 `BlockPredicate.automaticController()`。
- 一个模式中每个字符绑定一个谓词；同一字符不可重复绑定到不同谓词。

---
:::
### `BlockPredicate`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.BlockPredicate`

方块匹配谓词。结构模式中每个字符绑定一个 `BlockPredicate`，MMCR 在结构成型时根据谓词判定每个位置是否合法。

#### 类签名

```java
public final class BlockPredicate {
    public static BlockPredicate block(Block block);
    public static BlockPredicate block(String id);
    public static BlockPredicate block(Identifier id);
    public static BlockPredicate blockState(BlockState state);
    public static BlockPredicate deferredBlock(Supplier<? extends Block> blockSupplier);
    public static BlockPredicate state(String id);
    public static BlockPredicate state(Identifier id);
    public static BlockPredicate tag(TagKey<Block> tag);

    public static BlockPredicate machineCoupler();
    public static BlockPredicate coupler();

    public static BlockPredicate any(BlockPredicate... predicates);
    public static BlockPredicate anyOf(Collection<BlockPredicate> predicates);
}
```

#### 静态构造方法

| 方法 | 含义 |
| --- | --- |
| `block(Block block)` | 直接匹配方块实例。匹配任意方块状态。 |
| `block(String id)` / `block(Identifier id)` | 通过字符串或 `Identifier` 延迟匹配方块。 |
| `blockState(BlockState state)` | 精确匹配方块状态，包括所有属性值。 |
| `state(String id)` / `state(Identifier id)` | 通过"方块 ID[属性=值,属性=值,...]"格式字符串匹配方块状态。 |
| `tag(TagKey<Block> tag)` | 匹配属于指定方块标签的所有方块。 |
| `machineCoupler()` / `coupler()` | 匹配 MMCR 的所有机器耦合器方块。两种方法完全等价。 |
| `deferredBlock(Supplier<? extends Block> blockSupplier)` | 通过 `Supplier` 延迟匹配方块。 |
| `any(BlockPredicate... predicates)` / `anyOf(Collection<BlockPredicate> predicates)` | 构造并集谓词。 |

`state(String id)` 抛出：

- `IllegalArgumentException`：状态字符串格式错误、属性名未知、属性值非法。

#### 实例方法

| 方法 | 返回类型 | 含义 |
| --- | --- | --- |
| `isMachineCoupler()` | `boolean` | 是否为机器耦合器谓词。 |
| `block()` | `Optional<Block>` | 返回构造时直接绑定的方块实例。 |
| `blockState()` | `Optional<BlockState>` | 返回构造时绑定的方块状态。 |
| `blockSupplier()` | `Optional<Supplier<? extends Block>>` | 返回构造时绑定的延迟供应器。 |
| `tag()` | `Optional<TagKey<Block>>` | 返回构造时绑定的标签。 |
| `alternatives()` | `List<BlockPredicate>` | 返回并集谓词的子谓词列表；非并集谓词返回空列表。 |

:::warning 注意事项

- `BlockPredicate` 是不可变值对象，可以安全共享。
- 通过字符串 ID 构造的方块谓词在调用时才会解析方块引用；如果注册表中不存在该 ID，匹配会失败（不会立即报错）。
- `any(...)` / `anyOf(...)` 是并集语义，匹配时尝试每个子谓词直到命中为止。
- 在网络/线程安全的上下文中，`Supplier<? extends Block>` 必须保证线程安全。
- `state(...)` 字符串中的属性名必须严格匹配方块状态定义中的属性名；属性值也必须合法（区分大小写）。

---
:::
### `InterfacePredicates`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.InterfacePredicates`

MMCR 内置端口、控制器与升级总线的快捷谓词集合。所有方法都是静态的，返回一个匹配指定方块集合的 `BlockPredicate`。

#### 类签名

```java
public final class InterfacePredicates {
    public static BlockPredicate anyOfItemInput();
    public static BlockPredicate anyItemInput();
    public static BlockPredicate anyOfItemOutput();
    public static BlockPredicate anyItemOutput();
    public static BlockPredicate anyOfFluidInput();
    public static BlockPredicate anyFluidInput();
    public static BlockPredicate anyOfFluidOutput();
    public static BlockPredicate anyFluidOutput();
    public static BlockPredicate anyOfEnergyInput();
    public static BlockPredicate anyEnergyInput();
    public static BlockPredicate anyOfEnergyOutput();
    public static BlockPredicate anyEnergyOutput();
    public static BlockPredicate anyOfUpgradeBus();
    public static BlockPredicate anyUpgradeBus();
    public static BlockPredicate ports();
    public static BlockPredicate anyOfPort();
    public static BlockPredicate anyOfPort(String... ids);
    public static BlockPredicate anyOfPort(Identifier... ids);
    public static BlockPredicate anyOfPort(BlockPredicate... predicates);
    public static BlockPredicate port(String id);
    public static BlockPredicate port(Identifier id);
    public static BlockPredicate parallelControllers();
    public static BlockPredicate factoryController();
    public static BlockPredicate smartInterface();
    public static BlockPredicate dataStorage();
    public static BlockPredicate networkInterface();
}
```

#### 端口族快捷方法

| 方法 | 匹配方块 |
| --- | --- |
| `anyOfItemInput()` / `anyItemInput()` | 所有内置物品输入端口 |
| `anyOfItemOutput()` / `anyItemOutput()` | 所有内置物品输出端口 |
| `anyOfFluidInput()` / `anyFluidInput()` | 所有内置流体输入端口 |
| `anyOfFluidOutput()` / `anyFluidOutput()` | 所有内置流体输出端口 |
| `anyOfEnergyInput()` / `anyEnergyInput()` | 所有内置能量输入端口 |
| `anyOfEnergyOutput()` / `anyEnergyOutput()` | 所有内置能量输出端口 |
| `anyOfUpgradeBus()` / `anyUpgradeBus()` | 所有尺寸的内置升级总线 |
| `ports()` | 所有内置端口（物品 + 流体 + 能量，输入 + 输出） |

`anyOf...()` 与 `any...()` 完全等价，命名风格的差异仅为兼容旧版 API。

#### 自定义端口

| 方法 | 含义 |
| --- | --- |
| `port(String id)` / `port(Identifier id)` | 按 ID 匹配单一端口方块。底层使用 `BlockPredicate.deferredBlock(...)`。 |
| `anyOfPort(String... ids)` / `anyOfPort(Identifier... ids)` / `anyOfPort(BlockPredicate... predicates)` | 构造一组指定端口的并集谓词。 |
| `anyOfPort()` | 无参版本，抛 `IllegalArgumentException`。 |

#### 内置控制器与智能接口

| 方法 | 匹配方块 |
| --- | --- |
| `parallelControllers()` | 所有等级的内置并行控制器 |
| `factoryController()` | 内置工厂控制器（多线程） |
| `smartInterface()` | 内置智能接口 |
| `dataStorage()` | 内置数据存储方块 |
| `networkInterface()` | 内置网络接口方块 |

:::warning 注意事项

- 端口"族"快捷方法通过遍历所有已注册端口的实现，匹配绑定到指定族与流向的端口方块。新增自定义端口后这些快捷方法会自动包含。
- 不要在结构中使用 `ports()` 作为某个字符的绑定，除非该字符位置允许任意端口。
- `parallelControllers()` 匹配所有等级的并行控制器。如果只允许特定等级，应使用 `port("parallel_controller_normal")` 等精确 ID。
- `anyOfPort()` 的所有变体都要求至少一个端口参数。

---
:::
### `PortTiers`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.PortTiers`

机器结构对端口等级的声明，描述该机器至少需要哪种等级的端口才能正常工作。通过 `StructureStage.Builder.portTiers(...)` 配置。

#### 记录签名

```java
public record PortTiers(List<Requirement> requirements) {
    public static PortTiers none();
    public static PortTiers combine(PortTiers... declarations);

    public enum PortCategory { ITEM, FLUID, ENERGY }
    public enum ItemTier { TINY, SMALL, NORMAL, REINFORCED, BIG, HUGE, LUDICROUS }
    public enum FluidTier { TINY, SMALL, NORMAL, REINFORCED, BIG, HUGE, LUDICROUS, VACUUM }
    public enum EnergyTier { TINY, SMALL, NORMAL, REINFORCED, BIG, HUGE, LUDICROUS, ULTIMATE }

    public record Requirement(PortCategory category, IOType ioType, int minTier, String minTierId) { ... }

    public static Builder builder();
}
```

#### 等级枚举

`ItemTier` / `FluidTier` / `EnergyTier` 三套枚举的等级从低到高排列：

- `TINY` < `SMALL` < `NORMAL` < `REINFORCED` < `BIG` < `HUGE` < `LUDICROUS`
- `FluidTier` 额外提供 `VACUUM`（位于 `LUDICROUS` 之上）
- `EnergyTier` 额外提供 `ULTIMATE`（位于 `LUDICROUS` 之上）

等级 ID 与枚举常量名之间通过 `xxxTier.id()` 获取，例如 `ItemTier.NORMAL.id() == "normal"`。

#### 构建器方法

```java
public static final class Builder {
    public Builder anyItemInput();      // 等同于 minItemInput(TINY)
    public Builder anyItemOutput();     // 等同于 minItemOutput(TINY)
    public Builder anyFluidInput();     // 等同于 minFluidInput(TINY)
    public Builder anyFluidOutput();    // 等同于 minFluidOutput(TINY)
    public Builder anyEnergyInput();    // 等同于 minEnergyInput(TINY)
    public Builder anyEnergyOutput();   // 等同于 minEnergyOutput(TINY)

    public Builder minItemInput(ItemTier size);
    public Builder minItemOutput(ItemTier size);
    public Builder minFluidInput(FluidTier size);
    public Builder minFluidOutput(FluidTier size);
    public Builder minEnergyInput(EnergyTier size);
    public Builder minEnergyOutput(EnergyTier size);

    public PortTiers build();
}
```

| 方法 | 含义 |
| --- | --- |
| `anyXxxXxx()` / `minXxxXxx(xxxTier size)` | 声明该机器对指定端口类型的最低等级要求。 |
| `build()` | 终结构建，返回不可变的 `PortTiers`。如果未声明任何要求，等同于 `PortTiers.none()`。 |

#### `Requirement`

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `category` | `PortCategory` | 端口类别：物品 / 流体 / 能量。 |
| `ioType` | `IOType` | 输入或输出。 |
| `minTier` | `int` | 最低等级序号，对应枚举的 `ordinal()`。 |
| `minTierId` | `String` | 最低等级 ID，对应枚举的 `id()`。 |

抛出：

- `IllegalArgumentException`：`minTier` 与 `minTierId` 不匹配。

:::warning 注意事项

- 端口等级要求只是声明，不参与结构匹配的合法性判定。MMCR 启动期会校验玩家放置的端口方块是否满足这些要求；不满足的端口方块仍可放置，但机器无法正常运转。
- 不同端口族的等级枚举互不兼容。
- `PortTiers.combine(...)` 用于合并多个端口等级声明，结果按声明顺序追加。

---
:::
### `MachineStructureDefinition`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.MachineStructureDefinition`

结构定义的不可变记录，通过 `MachineStructureBuilder.build(...)` 创建。

#### 记录签名

```java
public record MachineStructureDefinition(
        Identifier machineId,
        List<StructureStage> stages,
        boolean stateSensitive) { ... }
```

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `machineId` | `Identifier` | 绑定的机器 ID，必须与机器定义阶段的注册 ID 一致。 |
| `stages` | `List<StructureStage>` | 结构阶段列表，必须包含一个且仅一个 `FULL` 阶段。 |
| `stateSensitive` | `boolean` | 结构匹配是否对方块状态敏感。 |

#### 构造约束

- `machineId` 不能为 `null`。
- `stages` 不能为空，且第一个阶段必须是 `FULL`。
- 只能存在一个 `FULL` 阶段。

:::warning 注意事项

- `MachineStructureDefinition` 是不可变值对象。一旦构建完成，全部阶段都不可修改。
- 多阶段结构适用于需要多形态或附属结构的机器。大多数机器只包含一个 `FULL` 阶段。
- 结构与机器定义是两条独立路径——机器定义在启动期冻结，结构在结构加载阶段冻结。一台机器可以只声明定义而不声明结构，但反过来不行。

---
:::
## 3 配方阶段

### `MMCRMachineRecipesEvent`

完整类名：`cn.howxu.mmcr.api.publicapi.event.MMCRMachineRecipesEvent`

配方阶段的注册窗口事件。该事件由 MMCR 在配方加载阶段发布，所有静态配方都通过它提交。订阅者必须通过 `@SubscribeEvent` 注册。

#### 类签名

```java
public class MMCRMachineRecipesEvent extends Event {
    public void registerRecipe(MachineRecipeDefinition definition);
    public Map<Identifier, MachineRecipeDefinition> recipes();
    public void freeze();
}
```

#### 订阅方式

```java
@EventBusSubscriber(modid = "my_mod")
public final class MyRecipeRegistrar {
    @SubscribeEvent
    public static void register(MMCRMachineRecipesEvent event) {
        event.registerRecipe(MachineRecipeBuilder
                .recipe(Identifier.fromNamespaceAndPath("my_mod", "my_recipe"),
                        MY_MACHINE)
                .duration(200)
                .inputItem(Ingredient.of(Items.IRON_INGOT), 1)
                .outputItem(Items.IRON_NUGGET, 10)
                .build());
    }
}
```

#### `registerRecipe(MachineRecipeDefinition definition)`

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `definition` | `MachineRecipeDefinition` | 通过 `MachineRecipeBuilder` 构建的配方定义。 |

抛出：

- `IllegalStateException`：注册窗口已冻结，或配方 ID 已被声明。
- `IllegalArgumentException`：构建器在 `build()` 期间检测到参数非法。
- `NullPointerException`：`definition` 为 `null`。

#### `recipes()`

返回当前已注册的全部配方的不可变快照。幂等检查应针对具体配方 ID，而非机器 ID：

```java
if (event.recipes().containsKey(MY_RECIPE)) return;
event.registerRecipe(MY_RECIPE, ...);
```

#### `freeze()`

冻结注册窗口。

#### 触发时机

MMCR 在配方加载阶段创建并发布该事件。生产构建中配方不可热加载——修改后必须重启游戏。

:::warning 注意事项

- 配方事件是 NeoForge 事件总线事件，必须通过 `@SubscribeEvent` 订阅。
- 配方 ID 必须全局唯一，跨机器不可重复。
- 数据驱动的配方（`data/<namespace>/recipes/*.json` 或 KubeJS `ServerEvents.recipes`）走另外一条通道，不通过此事件。
- 配方与机器的耦合只通过机器 ID：配方 ID 不必包含机器 ID，但建议使用 `<machine_id>_<recipe_index>` 命名以便阅读。

---
:::
### `MachineRecipeBuilder`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.MachineRecipeBuilder`

配方阶段的入口构建器，由用户直接调用 `recipe(id, machineId)` 创建。

#### 类签名

```java
public final class MachineRecipeBuilder {
    public static MachineRecipeBuilder recipe(Identifier id, Identifier machineId);

    public MachineRecipeBuilder duration(int duration);
    public MachineRecipeBuilder priority(int priority);
    public MachineRecipeBuilder maxThreads(int maxThreads);
    public MachineRecipeBuilder cancelIfPerTickFails(boolean value);
    public MachineRecipeBuilder parallelized(boolean value);
    public MachineRecipeBuilder allowPartialOutputs(boolean value);

    public MachineRecipeBuilder inputItem(Item item, int count);
    public MachineRecipeBuilder inputItem(Ingredient item, int count);
    public MachineRecipeBuilder inputItem(TagKey<Item> tag, int count);
    public MachineRecipeBuilder inputItemTag(TagKey<Item> tag, int count);
    public MachineRecipeBuilder inputItem(Ingredient item, int count, DataComponentPredicateSet components, float consumeChance);

    public MachineRecipeBuilder inputFluid(Fluid fluid, int amount);
    public MachineRecipeBuilder outputFluid(Fluid fluid, int amount);
    public MachineRecipeBuilder inputEnergy(long fePerTick);
    public MachineRecipeBuilder outputEnergy(long fePerTick);
    public MachineRecipeBuilder outputItem(Item item, int count);
    public MachineRecipeBuilder outputItem(ItemStack stack);
    public MachineRecipeBuilder outputItem(ItemStack stack, DataComponentPredicateSet components);
    public MachineRecipeBuilder outputChance(ItemStack stack, float chance);
    public MachineRecipeBuilder outputChance(ItemStack stack, float chance, DataComponentPredicateSet components);

    public MachineRecipeBuilder levelRequirement(Identifier typeId, Identifier levelId);
    public MachineRecipeBuilder requiredHost(Identifier hostId);

    public MachineRecipeBuilder requirement(RecipeRequirement requirement);
    public MachineRecipeBuilder custom(CustomRecipeIo io);
    public MachineRecipeBuilder smartInterface(SmartInterfaceRequirement requirement);
    public MachineRecipeBuilder modifier(Identifier modifierId);

    public MachineRecipeDefinition build();
}
```

#### `recipe(Identifier id, Identifier machineId)`

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `id` | `Identifier` | 配方 ID，必须全局唯一。 |
| `machineId` | `Identifier` | 所属机器的注册 ID，必须已在机器定义阶段声明。 |

抛出：

- `IllegalArgumentException`：`id` 或 `machineId` 为 `null`。

#### 行为控制方法

| 方法 | 含义 |
| --- | --- |
| `duration(int duration)` | 设置配方持续时间（tick）。`< 1` 抛 `IllegalArgumentException`。默认 `1`。 |
| `priority(int priority)` | 设置配方优先级，数值越大越优先。`< 0` 抛 `IllegalArgumentException`。默认 `0`。 |
| `maxThreads(int maxThreads)` | 设置最大线程数。`< 1` 抛 `IllegalArgumentException`。默认 `1`。 |
| `cancelIfPerTickFails(boolean value)` | 若 `true`，每 tick 失败时取消配方。默认 `false`。 |
| `parallelized(boolean value)` | 若 `true`，配方可以使用并行控制器。默认 `false`。 |
| `allowPartialOutputs(boolean value)` | 若 `true`，允许部分输出。默认 `false`。 |

#### 物品输入 / 输出

| 方法 | 含义 |
| --- | --- |
| `inputItem(Item item, int count)` | 以物品实例与数量声明输入。 |
| `inputItem(Ingredient item, int count)` | 以 `Ingredient`（可包含物品或标签）声明输入。 |
| `inputItem(TagKey<Item> tag, int count)` | 以物品标签声明输入。`tag` 为 `null` 抛 `IllegalArgumentException`。 |
| `inputItemTag(...)` | 与上一方法等价。 |
| `inputItem(Ingredient, int, DataComponentPredicateSet, float)` | 声明带数据组件谓词与消耗概率的输入。 |
| `outputItem(Item item, int count)` | 以物品实例与数量声明输出。 |
| `outputItem(ItemStack stack)` | 以物品栈声明输出。 |
| `outputItem(ItemStack, DataComponentPredicateSet)` | 声明带数据组件谓词的输出。 |
| `outputChance(ItemStack, float)` | 以概率声明输出。 |
| `outputChance(ItemStack, float, DataComponentPredicateSet)` | 以概率与数据组件谓词声明输出。 |

#### 流体 / 能量

| 方法 | 含义 |
| --- | --- |
| `inputFluid(Fluid fluid, int amount)` | 声明流体输入。 |
| `outputFluid(Fluid fluid, int amount)` | 声明流体输出。 |
| `inputEnergy(long fePerTick)` | 声明每 tick 消耗的能量。 |
| `outputEnergy(long fePerTick)` | 声明每 tick 产生的能量。 |

#### 等级、宿主、修饰符

| 方法 | 含义 |
| --- | --- |
| `levelRequirement(Identifier typeId, Identifier levelId)` | 声明等级要求。等级类型与等级必须在 `MMCRMachineStructuresEvent` 阶段注册。 |
| `requiredHost(Identifier hostId)` | 声明宿主机器要求。 |
| `modifier(Identifier modifierId)` | 声明配方接受的修饰符。 |

#### 自定义与智能接口

| 方法 | 含义 |
| --- | --- |
| `custom(CustomRecipeIo io)` | 注入自定义输入输出条目。 |
| `smartInterface(SmartInterfaceRequirement requirement)` | 声明智能接口要求。 |

#### `build()`

终结构建，返回不可变的 `MachineRecipeDefinition`。约束由构建器在 `build()` 阶段进行最终检查。

:::warning 注意事项

- 多次调用同一字段方法会覆盖之前的值。
- 数据驱动的配方走另外一条通道，不通过此事件。
- `custom(...)` 与 `smartInterface(...)` 适用于需要与 MMCR 之外的子系统对接的高级场景。

---
:::
### `MachineRecipeDefinition`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.MachineRecipeDefinition`

配方定义的不可变记录，通过 `MachineRecipeBuilder.build()` 创建。

#### 记录签名

```java
public record MachineRecipeDefinition(
        Identifier id,
        Identifier machineId,
        int tickTime,
        int priority,
        int maxThreads,
        boolean cancelRecipeOnPerTickFailure,
        boolean parallelized,
        boolean allowPartialOutputs,
        List<ItemInput> itemInputs,
        List<FluidInput> fluidInputs,
        List<EnergyInput> energyInputs,
        List<ItemOutput> itemOutputs,
        List<FluidOutput> fluidOutputs,
        List<EnergyInput> energyOutputs,
        List<RecipeRequirement> requirements,
        List<CustomRecipeIo> customOutputs,
        List<Identifier> modifierIds,
        List<LevelRequirement> levelRequirements,
        Set<RequiredHost> requiredHosts) {
    public Set<Identifier> requiredHostIds();
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | `Identifier` | 配方 ID，全局唯一。 |
| `machineId` | `Identifier` | 所属机器的注册 ID。 |
| `tickTime` | `int` | 持续时间（tick）。`< 1` 抛 `IllegalArgumentException`。 |
| `priority` | `int` | 配方优先级。`< 0` 抛 `IllegalArgumentException`。 |
| `maxThreads` | `int` | 最大线程数。`< 1` 抛 `IllegalArgumentException`。 |
| `cancelRecipeOnPerTickFailure` | `boolean` | 每 tick 失败时是否取消配方。 |
| `parallelized` | `boolean` | 是否可使用并行控制器。 |
| `allowPartialOutputs` | `boolean` | 是否允许部分输出。 |
| `itemInputs` | `List<ItemInput>` | 物品输入。 |
| `fluidInputs` | `List<FluidInput>` | 流体输入。 |
| `energyInputs` | `List<EnergyInput>` | 能量输入。 |
| `itemOutputs` | `List<ItemOutput>` | 物品输出。 |
| `fluidOutputs` | `List<FluidOutput>` | 流体输出。 |
| `energyOutputs` | `List<EnergyInput>` | 能量输出（复用 `EnergyInput`，由 `ioType` 区分）。 |
| `requirements` | `List<RecipeRequirement>` | 全部输入输出与自定义条目。 |
| `customOutputs` | `List<CustomRecipeIo>` | 自定义输出条目。 |
| `modifierIds` | `List<Identifier>` | 接受的修饰符 ID 列表。 |
| `levelRequirements` | `List<LevelRequirement>` | 等级要求列表。 |
| `requiredHosts` | `Set<RequiredHost>` | 宿主机器要求集合。 |

#### `requiredHostIds()`

便捷方法，返回 `requiredHosts` 的 ID 集合。

#### 构造约束

- `id` / `machineId` 不能为 `null`。
- `tickTime < 1` 抛 `IllegalArgumentException`。
- `priority < 0` 抛 `IllegalArgumentException`。
- `maxThreads < 1` 抛 `IllegalArgumentException`。

:::warning 注意事项

- `MachineRecipeDefinition` 是不可变值对象，构建后全部字段都不可修改。
- 能量输出字段复用 `EnergyInput` 类型，由 `ioType` 区分输入 / 输出。
- 配方 ID 必须全局唯一，跨机器不可重复。

---
:::
## 4 顶层入口

本节覆盖公共 API 模块的顶层入口类。这些类不参与机器 / 结构 / 配方构建流程，但提供 MMCR 启动期状态的查询入口、自定义 IO 校验、注册异常类型与数字格式化工具。

### `MachineApi`

完整类名：`cn.howxu.mmcr.api.publicapi.MachineApi`

启动期机器生命周期状态查询 API。`MachineApi` 是 `MMCRMachineDefinationsEvent` 的客户端查询入口——通常 Mod 不必直接调用它，而是在启动期通过实现 `MachineDefinitionProvider` 接口接入即可；当 Mod 想在 Provider 之外检查启动窗口是否仍开放时，可调用 `isRegistrationOpen()`。

#### `isRegistrationOpen() → boolean`

返回当前是否处于启动注册窗口期。

| 返回 | 含义 |
| --- | --- |
| `true` | 启动窗口仍开放，`MMCRMachineDefinationsEvent` 还可以接收新的机器定义。 |
| `false` | 启动窗口已关闭（已冻结），新增定义会被拒绝。 |

底层委托给 `ApiRuntime.isRegistrationOpen()`，因此只有 MMCR 在启动期通过 `ApiRuntime.install(...)` 注入 `Hook` 后此方法才返回有意义的结果。

#### 示例

```java
if (MachineApi.isRegistrationOpen()) {
    // 启动窗口内才执行的注册逻辑
}
```

:::warning 注意事项

- 该方法读取的是 MMCR 内部 `Hook` 状态，仅在 Mod 启动期或服务端线程内调用。
- 在游戏主菜单或世界中调用将始终返回 `false`。

---
:::
### `RecipeApi`

完整类名：`cn.howxu.mmcr.api.publicapi.RecipeApi`

启动期配方生命周期状态查询 API，以及自定义 IO 的运行时工厂。`RecipeApi.custom(...)` 在 Java 端构造 `CustomRecipeIo` 时会立即校验 `typeId` 与 `payload` 是否匹配已注册的需求 / 输出 codec。

#### `isRegistrationOpen() → boolean`

返回当前是否处于启动注册窗口期。同 `MachineApi.isRegistrationOpen()`，但语义针对配方注册事件（`MMCRMachineStructuresEvent` 与 `MMCRMachineRecipesEvent`）。

#### `custom(Identifier typeId, RecipeIo ioType, JsonElement payload) → CustomRecipeIo`

创建一个经过校验的 `CustomRecipeIo`。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `typeId` | `Identifier` | 已注册的需求类型（输入）或输出类型（输出）ID。 |
| `ioType` | `RecipeIo` | IO 方向：`INPUT` / `OUTPUT`。 |
| `payload` | `JsonElement` | codec 负载，必须是 JSON 对象。 |

返回：经过类型校验的 `CustomRecipeIo`，其 `payload()` 总是返回深拷贝。

抛出：

- `IllegalArgumentException`：`typeId` 未在 `RequirementHandlerRegistry` 或 `OutputRegistry` 中注册；或 `payload` 与 `typeId` / `ioType` 不匹配。
- `NullPointerException`：`typeId` / `ioType` / `payload` 为 `null`。

#### 示例

```java
JsonElement payload = JsonParser.parseString("{\"amount\": 1000}");
CustomRecipeIo io = RecipeApi.custom(
        Identifier.fromNamespaceAndPath("my_mod", "mana"),
        RecipeIo.INPUT, payload);
```

:::warning 注意事项

- 该方法在调用时会解析 codec，因此依赖于目标类型已被注册；启动期之前调用会因类型未注册而抛 `IllegalArgumentException`。
- 与 `CustomRecipeIo` 的直接构造器不同，`RecipeApi.custom(...)` 会主动执行 codec 校验；KubeJS 端走 `KubeJSApi.custom(...)`。

---
:::
### `ApiRegistrationException`

完整类名：`cn.howxu.mmcr.api.publicapi.ApiRegistrationException`

注册生命周期违规时抛出的异常。继承自 `IllegalStateException`，因此 `catch (IllegalStateException)` 也能捕获它，但本异常携带额外的语义信息——表示是注册窗口或注册项校验失败，而非一般的不合法状态。

#### 构造方法

```java
public ApiRegistrationException(String message)
```

抛出场景：

- `MMCRMachineDefinationsEvent` / `MMCRMachineStructuresEvent` / `MMCRMachineRecipesEvent` / `MMCRMachineRendersEvent` 在已冻结后再次调用注册方法。
- 重复声明同一机器 ID、结构 ID、配方 ID 或渲染器 ID。
- 在 KubeJS 与 Java 端重复注册同一 ID。
- 注册阶段非法调用（如在启动期之前 `ControllerScreenTextRegistry.register(...)`）。

#### 示例

```java
try {
    event.registerMachine(id, builder);
} catch (ApiRegistrationException ex) {
    LOGGER.warn("Skipping registration: {}", ex.getMessage());
}
```

:::warning 注意事项

- 该异常专门用于 API 注册路径。配方数据驱动的 `IllegalArgumentException`（配方参数非法）与 `IllegalStateException`（配方 ID 重复）仍按原类型抛出。
- 启动窗口之外的注册操作通常抛 `IllegalStateException` 而非 `ApiRegistrationException`，例如 `ApiRuntime` 在 hook 缺失时直接抛 `IllegalStateException`。

---
:::
### `ApiRuntime`

完整类名：`cn.howxu.mmcr.api.publicapi.ApiRuntime`

MMCR 内部实现与公共 API artifact 之间的桥接类。`ApiRuntime` 自身由 MMCR 主模块在启动期调用 `install(Hook)` 注入实现；公共 API 模块（包括其他 Mod）通过它查询启动窗口状态或注册能力定义。

#### 静态方法

#### `install(Hook implementation)`

Mod 在启动期通过该方法注入 MMCR 的内部实现。同步方法，仅由 MMCR 主模块调用，外部 Mod 不要调用。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `implementation` | `Hook` | MMCR 内部提供的 `Hook` 实现。 |

抛出：

- `NullPointerException`：`implementation` 为 `null`。

#### `uninstall()`

卸载当前安装的 `Hook`，清空能力定义并解冻能力注册。仅供测试与热卸载场景使用。

#### `isRegistrationOpen() → boolean`

返回当前是否处于启动注册窗口期。实现委托给已安装的 `Hook.isRegistrationOpen()`。

| 返回 | 含义 |
| --- | --- |
| `true` | `Hook` 已安装且窗口仍开放。 |
| `false` | `Hook` 未安装或窗口已关闭。 |

#### `registerCapability(CapabilityDefinition definition)`

注册一个能力定义。同步方法，需要在启动窗口内调用。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `definition` | `CapabilityDefinition` | 能力定义实例。 |

抛出：

- `IllegalStateException`：注册窗口已关闭、能力注册已冻结、或 `Hook` 未安装。
- `IllegalStateException`：同一类型 ID 的能力已被注册。
- `NullPointerException`：`definition` 为 `null`。

#### `capability(CapabilityType type) → CapabilityDefinition`

按 `CapabilityType` 查询已注册的能力定义。返回同步快照，外部可安全持有。`type` 为 `null` 时返回 `null`。

#### `capabilityValues() → List<CapabilityDefinition>`

返回当前所有已注册能力定义的不可变快照。

#### `freezeCapabilities()`

冻结能力注册。冻结后任何 `registerCapability(...)` 调用都会抛 `IllegalStateException`。由 MMCR 在启动期统一调用。

#### `Hook` 接口

```java
public interface Hook {
    boolean isRegistrationOpen();
}
```

MMCR 内部实现的桥接接口。Mod 通常不直接实现它，而是依赖 MMCR 启动时自动安装的实现。

:::warning 注意事项

- `ApiRuntime` 是公共 API 模块与 MMCR 主模块之间的边界类；它对外可见是为了让主模块能够在不同的运行环境（开发、单元测试、模组）中替换实现。
- 启动期之外的注册路径应使用 `MachineDefinitionProvider`、`@SubscribeEvent` 订阅结构 / 配方事件等正常方式，不要绕过 `ApiRuntime` 直接操作。

---
:::
### `ReadableNumber`

完整类名：`cn.howxu.mmcr.api.publicapi.ReadableNumber`

将非负数字格式化为人类可读的 UI 显示字符串的工具。所有方法都接受非负数；负数会抛 `IllegalArgumentException`。`format` / `formatCompact` 方法支持 4 种数值类型，并自动按数量级选择 SI 前缀；`formatForSlot` 是 5 字符定长格式，专用于屏幕槽位。

#### `format(int value) → String`

`format(long)` 的 int 重载。

#### `format(long value) → String`

小于 100 万时直接返回千分位整数格式；达到 100 万后切换为 SI 前缀（如 `1.23M`），截断为 2 位小数。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `value` | `long` | 非负整数。 |

抛出：

- `IllegalArgumentException`：`value < 0`。

#### `formatExact(long value) → String`

始终返回不带 SI 前缀的千分位整数格式。

#### `format(BigInteger value) → String`

`BigInteger` 版本，行为同 `format(long)`。

#### `format(BigDecimal value) → String`

`BigDecimal` 版本，行为同 `format(long)`。小于 100 万时整数部分向下取整。

#### `formatCompact(int|long|BigInteger|BigDecimal) → String`

`format(...)` 的紧凑变体，从 1000 起跳使用 SI 前缀，单位与 `format` 一致。

#### `formatForSlot(long value, int scale, String unit) → String`

5 字符定长槽位格式。`value` 按 `10^scale` 缩放后取整数与两位小数，使用大写 SI 前缀（如 `1.23MFE`），结果截断（不是取整）。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `value` | `long` | 非负原始值。 |
| `scale` | `int` | 单位倍率（`10^scale`）。范围 `[0, 18]`。 |
| `unit` | `String` | 后缀单位字符串，不能为空且不能过长（剩余空间至少 1 个数字）。 |

返回：长度恰为 5 字符的字符串，例如 `formatForSlot(1_001, 3, "B")` 返回 `"1.00B"`、`formatForSlot(15_000_000, 0, "FE")` 返回 `"15.0MFE"`。

抛出：

- `IllegalArgumentException`：`value < 0`、`scale` 不在 `[0, 18]`、或 `unit` 过长导致剩余宽度为非正。

#### 示例

```java
ReadableNumber.format(1_234_567L);             // "1.23M"
ReadableNumber.formatCompact(1_500_000L);      // "1.50M"
ReadableNumber.formatExact(1_234_567L);        // "1,234,567"
ReadableNumber.formatForSlot(2_500_000, 0, "FE"); // "2.50MFE"
```

:::warning 注意事项

- 所有数字格式化都按 `Locale.ROOT` 渲染，避免本地化导致 UI 数值错位。
- `format` / `formatCompact` 使用截断（`RoundingMode.DOWN`），不是四舍五入——`999.999` 会被格式化为 `999`。
- `formatForSlot` 与 `formatCompact` 的 SI 前缀选择策略不同：`formatCompact` 从 1000 起跳；`formatForSlot` 还会把 `value / 10^scale` 重新对齐到 5 字符宽度。

---
:::
## 5 渲染事件

本节覆盖渲染器注册阶段的事件。渲染器在 MMCRMachineRendersEvent 阶段提交，绑定到机器 ID，并在控制器方块渲染时被回调。

### `MMCRMachineRendersEvent`

完整类名：`cn.howxu.mmcr.api.publicapi.event.MMCRMachineRendersEvent`

控制器渲染器阶段的注册窗口事件。该事件由 MMCR 在渲染器加载阶段发布，每个机器 ID 最多注册一个 `ControllerRenderer`。订阅者必须通过 `@SubscribeEvent` 注册。

#### 类签名

```java
public class MMCRMachineRendersEvent extends Event {
    public MMCRMachineRendersEvent(Collection<Identifier> machineIds);

    public void register(Identifier machineId, ControllerRenderer renderer);
    public Map<Identifier, ControllerRenderer> renderers();
    public void freeze();
}
```

#### 构造方法

```java
public MMCRMachineRendersEvent(Collection<Identifier> machineIds)
```

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `machineIds` | `Collection<Identifier>` | 该事件允许注册的机器 ID 集合；传 `null` 或包含 `null` / 重复 ID 都抛 `ApiRegistrationException`。 |

抛出：

- `ApiRegistrationException`：`machineIds` 为 `null`、包含 `null` 元素或存在重复 ID。

#### `register(Identifier machineId, ControllerRenderer renderer)`

将渲染器绑定到指定机器 ID。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `machineId` | `Identifier` | 已通过构造方法传入的合法机器 ID。 |
| `renderer` | `ControllerRenderer` | 自定义渲染器回调。 |

抛出：

- `ApiRegistrationException`：`machineId` / `renderer` 为 `null`、`machineId` 不在构造时传入的 ID 集合中、或同一 `machineId` 已被注册过渲染器。
- `IllegalStateException`：注册窗口已冻结（`freeze()` 之后）。

#### `renderers() → Map<Identifier, ControllerRenderer>`

返回当前已注册渲染器的不可变快照。每次返回新拷贝，适合用于幂等检查或日志。

#### `freeze()`

冻结注册窗口。冻结后任何 `register(...)` 调用都会抛 `IllegalStateException`。MMCR 内部在收集完所有订阅者后自动调用。

#### 订阅方式

```java
@EventBusSubscriber(modid = "my_mod")
public final class MyRendererRegistrar {
    @SubscribeEvent
    public static void register(MMCRMachineRendersEvent event) {
        event.register(MY_MACHINE, (context, pose, collector, camera) -> {
            // 自定义渲染逻辑
        });
    }
}
```

#### 触发时机

MMCR 在启动期与结构加载之后、配方加载之后发布渲染器事件。生产构建中渲染器不可热加载。

:::warning 注意事项

- 同一机器 ID 只能注册一个渲染器；重复注册会被 `ApiRegistrationException` 拦截。
- 渲染器回调只在客户端运行，不要在其中调用任何服务端 API。
- `machineIds` 在构造时确定——构造事件时传入的 ID 集合决定了允许注册哪些机器的渲染器。

---
:::
## 6 行为与上下文（机器端）

本节覆盖机器端的行为策略与运行时上下文。机器在构建时声明一个 `MachineBehavior`（配方驱动或 tick 驱动），运行时 MMCR 会向策略注入 `MachineBehaviorContext` 或其子类，使回调能够读写 IO、屏幕文本与 JADE 文本。

### `MachineBehavior`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.MachineBehavior`

策略接口：定义机器如何在服务端执行。`sealed`，仅允许 `RecipeBehavior` 与 `TickBehavior` 两种实现。

#### 接口签名

```java
public sealed interface MachineBehavior permits RecipeBehavior, TickBehavior {
    enum Kind { RECIPE, TICK }
    Kind kind();

    @FunctionalInterface interface MachineCallback { void accept(MachineBehaviorContext context); }
    @FunctionalInterface interface TickCallback { void accept(TickBehaviorContext context); }
    @FunctionalInterface interface RecipeStartCallback { void accept(RecipeStartContext context); }
    @FunctionalInterface interface RecipeTickCallback { void accept(RecipeTickContext context); }
    @FunctionalInterface interface RecipeFinishCallback { void accept(RecipeFinishContext context); }
}
```

#### `Kind` 枚举

| 常量 | 含义 |
| --- | --- |
| `RECIPE` | 机器由配方驱动，由 `RecipeBehavior` 实现。 |
| `TICK` | 机器由 tick 直接驱动，由 `TickBehavior` 实现。 |

#### `kind() → Kind`

返回该行为对应的种类。

#### 内部函数式接口

| 接口 | 接收的上下文 | 用途 |
| --- | --- | --- |
| `MachineCallback` | `MachineBehaviorContext` | 通用 tick 与 idle 钩子（`idleStart` / `idleEnd` / `preServerTick` / `postServerTick`）。 |
| `TickCallback` | `TickBehaviorContext` | 直接 tick 机器的 `serverTick` 钩子。 |
| `RecipeStartCallback` | `RecipeStartContext` | 配方消费起始输入前的钩子。 |
| `RecipeTickCallback` | `RecipeTickContext` | 配方每 tick 的钩子。 |
| `RecipeFinishCallback` | `RecipeFinishContext` | 配方提交输出前的钩子。 |

每个接口都是 `@FunctionalInterface`，可用 lambda 简写。

#### 示例

```java
MachineBehavior.MachineCallback idleStart = ctx ->
        ctx.screenText().append(ControllerScreenTextScope.CONTROLLER,
                Identifier.fromNamespaceAndPath("my_mod", "idle"),
                Component.literal("Idle"));
```

:::warning 注意事项

- 该接口是 `sealed`，不能由用户自行实现；如需自定义行为，组合 `RecipeBehavior` 或 `TickBehavior`。
- 内部函数式接口通过 `RecipeBehavior.Builder` / `TickBehavior.Builder` 暴露，而不是直接由用户实现。

---
:::
### `MachineBehaviorContext`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.MachineBehaviorContext`

服务端权威上下文：所有机器行为回调共享的基础字段。包括机器 ID、控制器位置、当前游戏时间、屏幕文本、IO 视图、升级总线物品与 JADE 文本。

#### 字段（通过访问器读取）

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `controller()` | `MachineControllerBlockEntity` | 控制器方块实体。 |
| `level()` | `ServerLevel` | 所在服务端世界。 |
| `controllerPos()` | `BlockPos` | 控制器方块位置（不可变）。 |
| `machineId()` | `Identifier` | 当前机器 ID。 |
| `gameTime()` | `long` | 当前服务端游戏时间。 |
| `screenText()` | `ControllerScreenText` | 运行时屏幕文本句柄。 |
| `dataStorage()` | `@Nullable DataStorage` | 数据存储句柄，可能为 `null`。 |
| `ioView()` | `MachineIoView` | 当前能力的只读视图。 |
| `upgradeItems()` | `List<ItemStack>` | 升级总线中已注册的物品副本。 |
| `jadeText()` | `JadeText` | JADE 渲染文本句柄。 |

所有非 `null` 字段都由构造时校验：传入 `null` 会抛 `NullPointerException`。

#### `isDue(long period) → boolean`

判断当前 tick 是否满足 `period` 周期的对齐点。可用于按 N tick 一次执行副作用。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `period` | `long` | 周期长度（tick），必须为正。 |

抛出：

- `IllegalArgumentException`：`period <= 0`。

#### `countStructureBlocks(Block block) → long`

统计结构中指定方块的数量。未成型时返回 `0`。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `block` | `Block` | 目标方块实例。 |

抛出：

- `NullPointerException`：`block` 为 `null`。

#### `countStructureBlocks(String blockId) → long`

按方块 ID（`namespace:path`）统计结构中匹配方块的数量。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `blockId` | `String` | 方块注册 ID。 |

抛出：

- `IllegalArgumentException`：`blockId` 为 `null` / 空字符串、格式非法、或目标方块未在注册表中。
- `NullPointerException`：内部参数为 `null`。

#### 构造器

MMCR 内部使用以下构造器创建上下文。Mod 通常不直接调用，而是通过 `RecipeBehavior` / `TickBehavior` 的回调获得。

```java
public MachineBehaviorContext(MachineControllerBlockEntity controller, ServerLevel level,
                              BlockPos controllerPos, Identifier machineId, long gameTime,
                              ControllerScreenText screenText)

public MachineBehaviorContext(MachineControllerBlockEntity controller, ServerLevel level,
                              BlockPos controllerPos, Identifier machineId, long gameTime,
                              ControllerScreenText screenText, @Nullable DataStorage dataStorage)

public MachineBehaviorContext(MachineControllerBlockEntity controller, ServerLevel level,
                              BlockPos controllerPos, Identifier machineId, long gameTime,
                              ControllerScreenText screenText, @Nullable DataStorage dataStorage,
                              MachineIoView ioView)

public MachineBehaviorContext(MachineControllerBlockEntity controller, ServerLevel level,
                              BlockPos controllerPos, Identifier machineId, long gameTime,
                              ControllerScreenText screenText, @Nullable DataStorage dataStorage,
                              MachineIoView ioView, List<ItemStack> upgradeItems)

public MachineBehaviorContext(MachineControllerBlockEntity controller, ServerLevel level,
                              BlockPos controllerPos, Identifier machineId, long gameTime,
                              ControllerScreenText screenText, @Nullable DataStorage dataStorage,
                              MachineIoView ioView, List<ItemStack> upgradeItems, JadeText jadeText)
```

构造约束：

- `controllerPos` / `machineId` / `screenText` / `ioView` / `upgradeItems` / `jadeText` 不能为 `null`，否则 `NullPointerException`。
- `upgradeItems` 会被深拷贝，外部修改不会影响上下文中的列表。
- `controllerPos` 会被冻结为不可变副本。

:::warning 注意事项

- 上下文中的所有字段都是只读视图；要修改机器内部状态，应当通过 `controller()` 或 `screenText()` 提供的句柄。
- `gameTime()` 是服务端世界时间，不是客户端世界时间，不要在客户端回调中使用。
- 默认 `MachineBehaviorContext.empty(machineId)` 会构造一个无控制器、无屏幕文本、无 IO 视图的占位上下文，仅用于 MMCR 内部不直接来自控制器的场景（如 `RecipeStartContext` 的初始构造）。

---
:::
### `RecipeBehavior`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.RecipeBehavior`

配方驱动机器的行为策略。包含 7 个回调槽位：配方空闲开始 / 结束、配方起始 / 每 tick / 完成前，以及全局 tick 前 / 后钩子。

#### 类签名

```java
public final class RecipeBehavior implements MachineBehavior {
    public static RecipeBehavior defaults();
    public static Builder builder();

    @Override public Kind kind();

    public MachineCallback idleStart();
    public MachineCallback idleEnd();
    public RecipeStartCallback beforeStart();
    public RecipeTickCallback recipeTick();
    public RecipeFinishCallback beforeFinish();
    public MachineCallback preServerTick();
    public MachineCallback postServerTick();

    public static final class Builder { ... }
}
```

#### `defaults() → RecipeBehavior`

返回所有钩子均为空实现的默认 `RecipeBehavior`。`MachineBuilder` 在未显式声明 `recipeBehavior(...)` 时使用此默认值（即数据驱动配方行为）。

#### `builder() → Builder`

返回新的 `Builder`。

#### 钩子访问器

| 方法 | 返回 | 触发时机 |
| --- | --- | --- |
| `idleStart()` | `MachineCallback` | 控制器进入 idle 状态的第一个 tick。 |
| `idleEnd()` | `MachineCallback` | 控制器离开 idle 状态。 |
| `beforeStart()` | `RecipeStartCallback` | 配方启动前，允许修改 duration / requirements / outputs。 |
| `recipeTick()` | `RecipeTickCallback` | 配方每 tick 触发。 |
| `beforeFinish()` | `RecipeFinishCallback` | 配方提交输出前，允许调整 outputs 或取消。 |
| `preServerTick()` | `MachineCallback` | 服务端 tick 之前，与 `TickBehavior` 互斥。 |
| `postServerTick()` | `MachineCallback` | 服务端 tick 之后，与 `TickBehavior` 互斥。 |

#### `Builder`

```java
public static final class Builder {
    public Builder idleStart(MachineCallback callback);
    public Builder idleEnd(MachineCallback callback);
    public Builder beforeStart(RecipeStartCallback callback);
    public Builder recipeTick(RecipeTickCallback callback);
    public Builder beforeFinish(RecipeFinishCallback callback);
    public Builder preServerTick(MachineCallback callback);
    public Builder postServerTick(MachineCallback callback);
    public RecipeBehavior build();
}
```

每个钩子方法返回 `this` 以支持链式调用；`callback` 为 `null` 抛 `NullPointerException`。

默认值：所有钩子均为空 lambda。

#### 示例

```java
MachineBuilder.machine(MY_ID)
        .recipeBehavior(b -> b
                .idleStart(ctx -> ctx.screenText().append(
                        ControllerScreenTextScope.CONTROLLER,
                        Identifier.fromNamespaceAndPath("my_mod", "idle"),
                        Component.literal("Idle")))
                .recipeTick(ctx -> {
                    if (ctx.currentTick() == 0) return;
                    ctx.machineContext().ioView().itemInputs();
                }));
```

:::warning 注意事项

- `RecipeBehavior` 与 `TickBehavior` 互斥；在 `MachineBuilder` 中调用 `recipeBehavior(...)` 后再调用 `tickBehavior(...)` 会抛 `IllegalStateException`。
- `preServerTick` / `postServerTick` 只在 `recipeBehavior` 上下文中可用；`tickBehavior(...)` 之后调用会抛 `IllegalStateException`。
- 回调抛出的异常会被 MMCR 捕获并记录，机器会进入失败状态。

---
:::
### `RecipeStartContext`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.RecipeStartContext`

`beforeStart` 钩子的上下文：配方消费起始输入前可调整 duration、requirements 与 outputs，或直接取消配方。

#### 字段（通过访问器读取）

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `recipe()` | `MachineRecipe` | 配方实例。 |
| `machineContext()` | `MachineBehaviorContext` | 共享的机器上下文。 |
| `recipeId()` | `Identifier` | 配方 ID。 |
| `requestedParallelism()` | `long` | 请求的并行数。 |
| `effectiveParallelism()` | `long` | 实际生效的并行数（受并行控制器上限限制）。 |
| `duration()` | `int` | 配方持续时间（tick），初始为修饰符链应用后的值。 |
| `requirements()` | `List<MachineRequirement>` | 配方输入需求。 |
| `outputs()` | `List<MachineOutput>` | 配方输出项。 |

#### `setDuration(int duration)`

修改配方持续时间（tick）。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `duration` | `int` | 新持续时间。 |

抛出：

- `IllegalArgumentException`：`duration <= 0`。

#### `setRequirements(List<MachineRequirement> requirements)`

替换输入需求。如果原 `outputs` 包含自定义输出，会抛 `IllegalStateException`（自定义输出不能从需求推导）。

#### `setOutputs(List<MachineOutput> outputs)`

替换输出。同步将输出对应的需求项一并替换；调用前必须保证 `requirements` 中的输出位置项数与新 `outputs` 一致。

#### `snapshot() → ExecutionSnapshot`

冻结当前 duration / requirements / outputs，返回不可变快照。用于在异步任务中保留当前状态。

#### `cancel()` / `cancelled() → boolean`

调用 `cancel()` 后配方在 `beforeStart` 结束后中止；`cancelled()` 反映当前取消状态。

#### `ExecutionSnapshot`

不可变记录：

```java
public record ExecutionSnapshot(int duration,
                                List<MachineRequirement> requirements,
                                List<MachineOutput> outputs);
```

构造约束：`duration <= 0` 抛 `IllegalArgumentException`。

#### 构造器

MMCR 内部构造。Mod 通常通过 `beforeStart` 钩子接收上下文，而非直接构造。

抛出：

- `IllegalArgumentException`：`requestedParallelism <= 0` / `effectiveParallelism <= 0` / `duration <= 0`。
- `NullPointerException`：`recipe` / `machineContext` / `requirements` / `outputs` 为 `null`。

:::warning 注意事项

- 修改 `duration` / `requirements` / `outputs` 不会立即影响底层 `MachineRecipe`；MMCR 在 `beforeStart` 结束时统一应用。
- 在 `setRequirements(...)` 中只能修改内置需求（物品 / 流体 / 能量），自定义输出条目必须改用 `setOutputs(...)`。

---
:::
### `RecipeTickContext`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.RecipeTickContext`

`recipeTick` 钩子的上下文：配方每 tick 触发，提供当前 tick、配方总 tick、并行数以及只读的需求 / 输出 / 能力快照。

#### 字段（通过访问器读取）

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `recipe()` | `MachineRecipe` | 配方实例。 |
| `machineContext()` | `MachineBehaviorContext` | 共享的机器上下文。 |
| `currentTick()` | `int` | 当前 tick 序号（从 0 开始）。 |
| `totalTick()` | `int` | 配方总 tick 数。 |
| `parallelism()` | `long` | 当前并行数。 |
| `requirements()` | `List<MachineRequirement>` | 配方需求（只读）。 |
| `outputs()` | `List<MachineOutput>` | 配方输出（只读）。 |
| `capabilitySnapshot()` | `CapabilitySnapshot` | 当前能力快照。 |

#### 构造器

```java
public RecipeTickContext(MachineBehaviorContext machineContext, MachineRecipe recipe, int currentTick,
                         int totalTick, long parallelism, List<MachineRequirement> requirements,
                         List<MachineOutput> outputs, CapabilitySnapshot capabilitySnapshot)
```

抛出：

- `IllegalArgumentException`：`currentTick < 0` / `totalTick <= 0` / `parallelism <= 0`。
- `NullPointerException`：任一引用参数为 `null`。

:::warning 注意事项

- 与 `RecipeStartContext` / `RecipeFinishContext` 不同，`RecipeTickContext` 的 `requirements` / `outputs` 是只读副本；不要尝试调用 `setXxx(...)`。
- 修改配方运行时表现应通过 `MachineIoView` 读取状态后使用 `MachineBuilder.recipeBehavior(...)` 中的其他钩子。

---
:::
### `RecipeFinishContext`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.RecipeFinishContext`

`beforeFinish` 钩子的上下文：配方提交输出前可调整 outputs，或直接取消。

#### 字段（通过访问器读取）

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `recipe()` | `MachineRecipe` | 配方实例。 |
| `machineContext()` | `MachineBehaviorContext` | 共享的机器上下文。 |
| `recipeId()` | `Identifier` | 配方 ID。 |
| `requestedParallelism()` | `long` | 请求的并行数。 |
| `effectiveParallelism()` | `long` | 实际生效的并行数。 |
| `outputs()` | `List<MachineOutput>` | 当前输出项。 |

#### `setOutputs(List<MachineOutput> outputs)`

替换输出。输入不能为空 `ItemStack` / `FluidStack`，否则抛 `IllegalArgumentException`。

#### `discardOutputs()` / `outputsDiscarded() → boolean`

丢弃所有输出，配方正常完成但不产出物品 / 流体。常用于"占位"或"条件完成"场景。

#### `cancel()` / `cancelled() → boolean`

取消配方完成。与 `discardOutputs()` 不同，取消后配方视为失败。

#### 构造器

```java
public RecipeFinishContext(MachineBehaviorContext machineContext, MachineRecipe recipe,
                           long requestedParallelism, long effectiveParallelism, List<MachineOutput> outputs)
```

抛出：

- `IllegalArgumentException`：`requestedParallelism <= 0` / `effectiveParallelism <= 0`、或输出包含空 `ItemStack` / `FluidStack`。
- `NullPointerException`：任一引用参数为 `null`。

:::warning 注意事项

- 自定义输出条目在 `setOutputs(...)` 时按 codec 校验，但与 `RecipeStartContext` 不同，本上下文不主动推导需求；修改自定义输出可能需要同步修改 `requirements`。
- `cancel()` 与 `discardOutputs()` 二选一：调用 `discardOutputs()` 后再调用 `cancel()` 仍按取消处理。

---
:::
### `TickBehavior`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.TickBehavior`

直接 tick 驱动的机器行为策略。当机器不通过配方运行，而是按 tick 自行推进时使用。`TickBehavior` 与 `RecipeBehavior` 互斥。

#### 类签名

```java
public final class TickBehavior implements MachineBehavior {
    public static TickBehavior defaults();
    public static Builder builder();

    @Override public Kind kind();
    public TickCallback serverTick();
    public CapabilityTickPhase capabilityTickPhase();

    public static final class Builder { ... }
}
```

#### `defaults() → TickBehavior`

返回空 `serverTick` 的默认实现。

#### `builder() → Builder`

返回新的 `Builder`。

#### `serverTick() → TickCallback`

返回当前 `serverTick` 回调。

#### `capabilityTickPhase() → CapabilityTickPhase`

返回能力 tick 的执行阶段，默认为 `IDLE`。当前公开 API 中此值固定。

#### `Builder`

```java
public static final class Builder {
    public Builder serverTick(TickCallback callback);
    public TickBehavior build();
}
```

| 方法 | 含义 |
| --- | --- |
| `serverTick(TickCallback callback)` | 设置每服务端 tick 的回调。 |
| `build()` | 终结构建。 |

#### 示例

```java
MachineBuilder.machine(MY_ID)
        .tickBehavior(b -> b.serverTick(ctx -> {
            ctx.machineContext().ioView().itemInputs();
        }));
```

:::warning 注意事项

- 调用 `TickBehavior` 后再调用 `RecipeBehavior`（或在 `MachineBuilder` 中调用 `preServerTick` / `postServerTick`）会抛 `IllegalStateException`。
- `serverTick` 回调中如果要做"配方消费"，应通过 `MachineIoPlan` 显式声明输入输出并 commit；不要假定 MMCR 会自动 tick 配方。

---
:::
### `TickBehaviorContext`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.TickBehaviorContext`

`TickBehavior.serverTick` 钩子的上下文：扩展了 `MachineBehaviorContext`，新增工厂线程数、并行数与能力快照访问器，并提供 IO 计划入口。

#### 字段（通过访问器读取）

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `factoryThreadCount()` | `int` | 当前工厂线程数。 |
| `parallelism()` | `long` | 当前并行数。 |
| `smartInterfaceValue(String name)` | `Optional<Float>` | 按名称查询智能接口值。 |
| `smartInterfaceValues()` | `Map<String, Float>` | 所有智能接口值。 |
| `ioPlan()` | `MachineIoPlan` | 当前 IO 计划入口（用于 commit 输入输出）。 |
| `capabilityTickContext(CapabilityTickPhase phase)` | `CapabilityTickContext` | 按阶段构造能力 tick 上下文。 |

继承自 `MachineBehaviorContext` 的字段全部可用。

#### 构造器

```java
public TickBehaviorContext(MachineBehaviorContext base, CapabilitySnapshot snapshot)
public TickBehaviorContext(MachineBehaviorContext base, CapabilitySnapshot snapshot,
                           int factoryThreadCount, long parallelism)
```

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `base` | `MachineBehaviorContext` | 父级上下文。 |
| `snapshot` | `CapabilitySnapshot` | 当前能力快照。 |
| `factoryThreadCount` | `int` | 工厂线程数，必须 ≥ 1。 |
| `parallelism` | `long` | 并行数，必须 ≥ 1。 |

抛出：

- `IllegalArgumentException`：`factoryThreadCount < 1` / `parallelism < 1`。
- `NullPointerException`：`base` / `snapshot` 为 `null`。

:::warning 注意事项

- `ioPlan()` 每次调用都返回新的 `MachineIoPlan`；多次调用之间状态不共享。
- `capabilityTickContext(phase)` 的阶段由调用者决定；MMCR 内部按阶段调度能力，Mod 通常使用 `IDLE` 即可。

---
:::
## 7 控制器规格

本节覆盖控制器方块的外观与朝向规格。

### `ControllerSpec`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.ControllerSpec`

控制器纹理与朝向声明的不可变记录。通过 `MachineBuilder.controller(...)` 配置。

#### 记录签名

```java
public record ControllerSpec(
        Identifier id,
        Identifier frontTexture,
        Identifier sideTexture,
        Identifier topTexture,
        Identifier bottomTexture,
        boolean allowVerticalFacing,
        boolean fullyRotationallySymmetric,
        boolean requireVerticalFacing,
        List<String> tooltip) {
    public static Builder builder();

    public static final class Builder { ... }
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | `Identifier` | 控制器方块注册 ID。 |
| `frontTexture` | `Identifier` | 控制器正面纹理 ID。 |
| `sideTexture` | `Identifier` | 控制器侧面纹理 ID。 |
| `topTexture` | `Identifier` | 控制器顶面纹理 ID。 |
| `bottomTexture` | `Identifier` | 控制器底面纹理 ID。 |
| `allowVerticalFacing` | `boolean` | 是否允许竖直朝向。 |
| `fullyRotationallySymmetric` | `boolean` | 是否完全旋转对称（所有面使用同一纹理）。 |
| `requireVerticalFacing` | `boolean` | 是否要求竖直朝向。 |
| `tooltip` | `List<String>` | 控制器方块的本地化提示行；空字符串与 `null` 元素会被丢弃。 |

#### `Builder`

```java
public static final class Builder {
    public Builder id(Identifier id);
    public Builder textures(Identifier frontTexture, Identifier otherFaces);
    public Builder textures(Identifier frontTexture, Identifier sideTexture, Identifier topTexture, Identifier bottomTexture);
    public Builder frontTexture(Identifier frontTexture);
    public Builder sideTexture(Identifier sideTexture);
    public Builder topTexture(Identifier topTexture);
    public Builder bottomTexture(Identifier bottomTexture);

    public Builder allowVerticalFacing();
    public Builder allowVerticalFacing(boolean allowVerticalFacing);
    public Builder fullyRotationallySymmetric();
    public Builder fullyRotationallySymmetric(boolean fullyRotationallySymmetric);
    public Builder requireVerticalFacing();
    public Builder requireVerticalFacing(boolean requireVerticalFacing);

    public Builder tooltip(String... lines);

    public ControllerSpec build();
}
```

| 方法 | 含义 |
| --- | --- |
| `id(Identifier id)` | 设置控制器方块注册 ID。`null` 抛 `NullPointerException`。 |
| `textures(front, otherFaces)` | 同时设置正面与其他三面共用纹理。 |
| `textures(front, side, top, bottom)` | 分别设置四个面纹理。 |
| `frontTexture(...)` / `sideTexture(...)` / `topTexture(...)` / `bottomTexture(...)` | 单面纹理设置。 |
| `allowVerticalFacing()` / `allowVerticalFacing(boolean)` | 是否允许竖直朝向。默认 `false`。 |
| `fullyRotationallySymmetric()` / `fullyRotationallySymmetric(boolean)` | 是否完全旋转对称（开启后所有面共享纹理）。默认 `false`。 |
| `requireVerticalFacing()` / `requireVerticalFacing(bool)` | 要求竖直朝向；开启时自动启用 `allowVerticalFacing`。 |
| `tooltip(String...)` | 追加提示行；空字符串 / `null` 元素被丢弃。 |
| `build()` | 终结构建，返回不可变 `ControllerSpec`。 |

抛出：

- `NullPointerException`：纹理或 `id` 为 `null`。

#### 示例

```java
MachineBuilder.machine(MY_ID)
        .controller(c -> c
                .id(Identifier.fromNamespaceAndPath("my_mod", "my_controller"))
                .textures(Identifier.fromNamespaceAndPath("my_mod", "front"),
                          Identifier.fromNamespaceAndPath("my_mod", "side"),
                          Identifier.fromNamespaceAndPath("my_mod", "top"),
                          Identifier.fromNamespaceAndPath("my_mod", "bottom"))
                .allowVerticalFacing()
                .tooltip("controller.my_mod.my_controller.tip"));
```

:::warning 注意事项

- 控制器纹理与朝向是玩家放置控制器方块时的判定依据；若开启 `requireVerticalFacing()`，玩家无法将其放置为水平朝向。
- `tooltip` 元素会自动去重空字符串，但不会去重重复行；如有需要可在调用方处理。
- `MachineDefinition.controller` 默认是空 `ControllerSpec`，所有纹理字段为 `null`；MMCR 启动期会使用内置回退纹理。

---
:::
## 8 高级机器属性

本节覆盖机器的高级属性：角色、IO 计划与视图、显示物品栈、并行控制器等级。

### `MachineRole`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.MachineRole`

机器角色枚举。

#### 枚举值

| 常量 | 含义 |
| --- | --- |
| `NORMAL` | 普通机器：默认角色。 |
| `HOST` | 模块宿主：必须通过 `MachineBuilder.acceptedModule(...)` 声明接受的模块机器 ID，否则 `build()` 抛 `IllegalStateException`。 |
| `MODULE` | 模块机器：被宿主接受后才能放置。 |

#### 示例

```java
MachineBuilder.machine(MY_HOST)
        .role(MachineRole.HOST)
        .acceptedModule(Identifier.fromNamespaceAndPath("my_mod", "module_a"));
```

:::warning 注意事项

- `MachineRole.HOST` 与 `acceptedModule(...)` 是一对约束：只有 `HOST` 可以声明模块；只有 `MODULE` 角色会被宿主 `acceptedModule(...)` 接受。
- `MODULE` 角色的机器通常不能独立形成结构——它们只能作为宿主结构的一部分。

---
:::
### `MachineIoPlan`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.MachineIoPlan`

`TickBehavior` 直接驱动时的 IO 计划入口。提供对输入 / 输出的添加、模拟、commit 操作。

#### 类签名

```java
public final class MachineIoPlan {
    public MachineIoPlan(CapabilitySnapshot capabilitySnapshot);

    public record Simulation(boolean inputsSatisfied, boolean energySatisfied,
                             List<OutputSimulation> outputs, @Nullable ExecutionStatus failure) { }
    public record CommitResult(boolean successful, @Nullable ExecutionStatus failure) { }

    public MachineIoView view();
    public MachineIoPlan addInput(MachineRequirement requirement);
    public MachineIoPlan addOutput(MachineRequirement requirement, OutputPolicy policy);
    public MachineIoPlan add(MachineRequirement requirement);
    public List<MachineRequirement> requirements();
    public Simulation simulate();
    public CommitResult commit();
    public CommitResult commit(Consumer<TransactionContext> transactionWrites);
    public List<OutputSimulation> outputSimulations();
    public boolean inputsSatisfied();
    public boolean energySatisfied();
}
```

#### 构造方法

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `capabilitySnapshot` | `CapabilitySnapshot` | 当前能力快照。 |

抛出：

- `NullPointerException`：`capabilitySnapshot` 为 `null`。

#### `view() → MachineIoView`

返回当前能力快照对应的只读视图（每次返回新实例）。

#### `addInput(MachineRequirement requirement) → MachineIoPlan`

追加一个输入需求。会自动插入到所有已有输出项之前，确保输入先于输出参与模拟。`requirement.io()` 必须为 `INPUT`，否则抛 `IllegalArgumentException`。

#### `addOutput(MachineRequirement requirement, OutputPolicy policy) → MachineIoPlan`

追加一个输出需求，并指定该输出的放置策略。`requirement.io()` 必须为 `OUTPUT`，`policy` 为 `null` 抛 `NullPointerException`。

#### `add(MachineRequirement requirement) → MachineIoPlan`

根据 `requirement.io()` 自动路由到 `addInput(...)` 或 `addOutput(requirement, REQUIRE_FULL)`。

#### `requirements() → List<MachineRequirement>`

返回当前已添加的全部需求（按插入顺序）。模拟前需要的所有需求必须先加入。

#### `simulate() → Simulation`

对当前需求执行规划，返回 `Simulation`。在 `commit(...)` 前可重复调用以预览效果。每次 `simulate()` 都会重算结果。

抛出：

- `IllegalStateException`：plan 已被 `commit(...)` 消耗。

#### `commit() → CommitResult`

使用空事务 commit。等价于 `commit(ignored -> {})`。

#### `commit(Consumer<TransactionContext> transactionWrites) → CommitResult`

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `transactionWrites` | `Consumer<TransactionContext>` | 事务回调；运行在 NeoForge transfer 事务上下文中。 |

抛出：

- `IllegalStateException`：plan 已被 `commit(...)` 消耗。
- `NullPointerException`：`transactionWrites` 为 `null`。

#### `Simulation`

| 字段 | 含义 |
| --- | --- |
| `inputsSatisfied` | 所有非能量输入是否满足。 |
| `energySatisfied` | 能量输入是否满足。 |
| `outputs` | 每个输出项的模拟结果。 |
| `failure` | 失败原因；`null` 表示模拟通过。 |

#### `CommitResult`

| 字段 | 含义 |
| --- | --- |
| `successful` | commit 是否成功。 |
| `failure` | 失败原因；`null` 表示成功。 |

#### `outputSimulations() → List<OutputSimulation>` / `inputsSatisfied()` / `energySatisfied()`

便捷访问器：如果尚未模拟则先调用 `simulate()`，再返回结果。

#### 示例

```java
TickBehaviorContext tickCtx = ...;
MachineIoPlan plan = tickCtx.ioPlan()
        .addInput(itemRequirement)
        .addOutput(itemOutputRequirement, OutputPolicy.ALLOW_PARTIAL);
Simulation sim = plan.simulate();
if (sim.inputsSatisfied()) {
    plan.commit();
}
```

:::warning 注意事项

- `MachineIoPlan` 是一次性的，`commit(...)` 后不可再用；多次调用 `commit(...)` 会返回 `successful=false`。
- `OutputPolicy.ALLOW_PARTIAL` 允许输出在容量受限时部分完成；`REQUIRE_FULL` 要求输出全部能放下，否则视为失败。
- 调用 `addInput(...)` / `addOutput(...)` 会重置已缓存的 `Simulation`；不需要手动调用 `simulate()` 来清空。

---
:::
### `MachineIoView`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.MachineIoView`

机器能力的只读聚合视图。提供对当前输入 / 输出、容量、智能接口值与展示条目的查询。

#### 字段（通过访问器读取）

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `displays()` | `List<CapabilityDisplay>` | 全部能力的展示条目（用于屏幕显示）。 |
| `itemInputs()` | `List<ResourceAmount<ItemResource>>` | 当前所有物品输入资源的聚合量。 |
| `fluidInputs()` | `List<ResourceAmount<FluidResource>>` | 当前所有流体输入资源的聚合量。 |
| `energyInput()` | `long` | 当前所有能量输入的总量。 |
| `smartInterfaceValue(String name)` | `Optional<Float>` | 按名称查询智能接口值。 |
| `smartInterfaceValues()` | `Map<String, Float>` | 所有智能接口值。 |

#### `ResourceAmount<R>`

不可变记录：

```java
public record ResourceAmount<R>(R resource, long amount);
```

构造约束：`resource == null` 或 `amount < 0` 抛 `IllegalArgumentException`。

#### `forTags(Set<String> requiredTags) → MachineIoView`

按能力标签过滤，返回只包含同时具备全部标签的子集。`requiredTags` 为 `null` 抛 `NullPointerException`，空集合返回当前视图的浅拷贝。

#### `itemAmount(Ingredient ingredient) → long`

按 `Ingredient` 聚合所有匹配物品输入的总量。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `ingredient` | `Ingredient` | 物品原料谓词。 |

抛出：

- `NullPointerException`：`ingredient` 为 `null`。

#### `fluidAmount(FluidIngredient ingredient) → long`

按 `FluidIngredient` 聚合所有匹配流体输入的总量。

#### `itemOutputCapacity(ItemStack stack) → long`

返回当前物品输出能力中还能容纳指定物品栈的总余量。会忽略已含其他物品的 slot。空栈返回 `0`。

#### `fluidOutputCapacity(FluidStack stack) → long`

返回当前流体输出能力中还能容纳指定流体栈的总余量。

#### `energyOutputCapacity() → long`

返回当前能量输出能力中还能容纳的能量总数。

#### 示例

```java
MachineIoView view = ctx.ioView();
long available = view.itemAmount(Ingredient.of(Items.IRON_INGOT));
long spare = view.itemOutputCapacity(new ItemStack(Items.DIAMOND));
Optional<Float> tier = view.smartInterfaceValue("efficiency");
```

:::warning 注意事项

- 所有容量与数量都是聚合值，可能溢出到 `Long.MAX_VALUE`（`saturatedAdd`）。
- `itemAmount(...)` / `fluidAmount(...)` 使用 `Ingredient.test(...)` 进行匹配，对于复合谓词可能产生多次比较；调用频率高时请注意性能。
- `displays()` 返回的是渲染用的展示条目；不应在逻辑判断中依赖其内容。

---
:::
### `DisplayStack`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.DisplayStack`

不可变的展示物品栈包装。专用于 `MachineLevel` 等需要以 `ItemStack` 表示某个等级外观但又不希望被外部直接修改的场景。

#### 记录签名

```java
public record DisplayStack(ItemStack stack) {
    public static DisplayStack of(ItemStack stack);
    public static Optional<DisplayStack> optional(ItemStack stack);

    @Override public ItemStack stack();
}
```

#### 静态方法

| 方法 | 含义 |
| --- | --- |
| `of(ItemStack stack)` | 从 `ItemStack` 构造。构造时会复制栈，因此外部修改不影响实例。`stack == null` 抛 `NullPointerException`。 |
| `optional(ItemStack stack)` | 安全构造：空栈 / `null` 返回 `Optional.empty()`，否则返回 `Optional.of(of(stack))`。 |

#### `stack() → ItemStack`

返回栈的拷贝。

#### 示例

```java
DisplayStack sample = DisplayStack.of(new ItemStack(Items.DIAMOND));
Optional<DisplayStack> optional = DisplayStack.optional(registry.getItem("my_mod:icon").map(Item::getDefaultInstance).orElse(null));
```

:::warning 注意事项

- 每次 `stack()` 调用都返回新拷贝，外部修改不会影响 `DisplayStack` 内部状态。
- 构造时若传入空栈（`stack.isEmpty()`），构造器仍然允许——`DisplayStack` 不校验内容。`optional(...)` 才将空栈视为"无"。

---
:::
### `ParallelTier`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.ParallelTier`

并行控制器等级枚举，绑定到内置并行控制器方块。

#### 枚举值与最大并行数

| 常量 | 最大并行数 | 内置方块 ID 后缀 |
| --- | --- | --- |
| `NORMAL` | 4 | `parallel_controller_normal` |
| `PLUS` | 16 | `parallel_controller_plus` |
| `REINFORCED` | 64 | `parallel_controller_reinforced` |
| `PRO` | 256 | `parallel_controller_pro` |
| `ELITE` | 1024 | `parallel_controller_elite` |
| `FANTASY` | 4096 | `parallel_controller_fantasy` |
| `MAX` | 16384 | `parallel_controller_max` |
| `ULTIMATE` | `Integer.MAX_VALUE` | `parallel_controller_ultimate` |

#### 方法

| 方法 | 含义 |
| --- | --- |
| `maxParallelism() → int` | 该等级对应的最大并行数。 |
| `idSuffix() → String` | 内置并行控制器方块的 ID 后缀（仅后缀部分，需要拼接命名空间）。 |

#### 示例

```java
Identifier blockId = Identifier.fromNamespaceAndPath("mmcr", ParallelTier.PRO.idSuffix());
int max = ParallelTier.PRO.maxParallelism();  // 256
```

:::warning 注意事项

- 这些等级对应 MMCR 内置的并行控制器方块；如果 Mod 添加自定义并行控制器，需要自己扩展此枚举或通过 `MachineBuilder.maxParallelism(...)` 自行控制。
- `ULTIMATE.maxParallelism()` 等于 `Integer.MAX_VALUE`，用于理论上限；实际受机器上限 `MachineDefinition.maxParallelism` 进一步约束。

---
:::
## 9 接口与等级

本节覆盖端口等级与端口需求的便捷工厂。这些工厂是 `PortTiers` / `PortRequirements` 的快捷方式，主要供 `StructureStage.Builder` 之外的代码（如工具方法、跨阶段共享声明）使用。

### `InterfaceTiers`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.InterfaceTiers`

独立构造物品 / 流体 / 能量端口等级声明的工厂。所有方法都返回不可变的 `PortTiers`。

#### 静态方法（按端口族分组）

| 方法 | 含义 |
| --- | --- |
| `item(String id)` | 按字符串 ID（不区分大小写）解析物品等级，返回同时声明输入与输出等级的 `PortTiers`。 |
| `item(PortTiers.ItemTier tier)` | 同上，使用枚举等级。 |
| `item(PortTiers.ItemTier tier, IOType ioType)` | 只声明输入或输出等级。`ioType == INPUT` 等同 `itemInput(tier)`，否则等同 `itemOutput(tier)`。 |
| `fluid(String id)` / `fluid(PortTiers.FluidTier tier)` / `fluid(PortTiers.FluidTier, IOType)` | 流体版本，与物品对称。 |
| `energy(String id)` / `energy(PortTiers.EnergyTier tier)` / `energy(PortTiers.EnergyTier, IOType)` | 能量版本。 |

| 方法 | 含义 |
| --- | --- |
| `itemInput(PortTiers.ItemTier tier)` / `itemInput(String id)` | 仅声明物品输入端口的最低等级。 |
| `itemOutput(PortTiers.ItemTier tier)` / `itemOutput(String id)` | 仅声明物品输出端口的最低等级。 |
| `fluidInput(PortTiers.FluidTier tier)` / `fluidInput(String id)` | 仅声明流体输入端口的最低等级。 |
| `fluidOutput(PortTiers.FluidTier tier)` / `fluidOutput(String id)` | 仅声明流体输出端口的最低等级。 |
| `energyInput(PortTiers.EnergyTier tier)` / `energyInput(String id)` | 仅声明能量输入端口的最低等级。 |
| `energyOutput(PortTiers.EnergyTier tier)` / `energyOutput(String id)` | 仅声明能量输出端口的最低等级。 |
| `combine(PortTiers... declarations)` | 等价于 `PortTiers.combine(declarations)`。 |

抛出：

- `NullPointerException`：`ioType` 为 `null`。
- `IllegalArgumentException`：`id` 为 `null` / 空字符串 / 未知的等级 ID。

#### 示例

```java
PortTiers tiers = InterfaceTiers.combine(
        InterfaceTiers.item(PortTiers.ItemTier.REINFORCED),
        InterfaceTiers.fluid(PortTiers.FluidTier.BIG));
```

:::warning 注意事项

- `InterfaceTiers` 不会主动检查 `PortTiers` 是否会与结构中已有的等级声明冲突；冲突由结构加载阶段的最终一致性校验处理。
- 字符串 ID 与枚举常量的映射不区分大小写，如 `"NORMAL"` / `"normal"` / `"Normal"` 都解析到 `NORMAL`。

---
:::
### `PortRequirements`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.PortRequirements`

基础端口数量声明的不可变记录。声明机器至少需要多少个特定 ID 的端口。

#### 记录签名

```java
public record PortRequirements(Map<String, CountRange> requirements) {
    public static PortRequirements none();
    public static Builder builder();

    public record CountRange(int min, OptionalInt max) { ... }

    public static final class Builder {
        public Builder min(String portId, int min);
        public Builder range(String portId, int min, int max);
        public PortRequirements build();
    }
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `requirements` | `Map<String, CountRange>` | 端口 ID → 数量范围。键为端口注册 ID（字符串形式）。 |

#### `none() → PortRequirements`

返回无要求的占位实例。

#### `CountRange`

不可变记录：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `min` | `int` | 最少数量。 |
| `max` | `OptionalInt` | 最多数量；`OptionalInt.empty()` 表示无上限。 |

构造约束：

- `min < 0` → `IllegalArgumentException`。
- `max == null` → `NullPointerException`。
- `max.isPresent()` 且 `max.getAsInt() < min` → `IllegalArgumentException`。

#### `Builder`

| 方法 | 含义 |
| --- | --- |
| `min(String portId, int min)` | 声明"至少 `min` 个"，`max` 留空（无上限）。 |
| `range(String portId, int min, int max)` | 声明 `[min, max]` 区间。 |
| `build()` | 终结构建。空 `requirements` 返回 `PortRequirements.none()`。 |

抛出：

- `IllegalArgumentException`：`portId` 为 `null` / 空字符串。
- `IllegalArgumentException`：`min < 0`、`max < min`（仅 `range`）。

#### 示例

```java
PortRequirements req = PortRequirements.builder()
        .min("item_input_normal", 1)
        .range("fluid_output_huge", 1, 2)
        .build();
```

:::warning 注意事项

- `PortRequirements` 与 `PortTiers` 是两个独立维度：前者声明数量，后者声明等级。一台机器通常同时声明两者。
- `PortRequirements.builder().build()` 不会因为没有声明任何端口而抛错——空声明等价于 `none()`。
- `requirements` 是不可变 `LinkedHashMap` 的快照，键按插入顺序保留。

---
:::
## 10 模式与结构

本节覆盖结构模式定义与结构高级要求。`PatternDefinition` 是 `PatternBuilder` 链式构建的不可变结果；`StructureRequirements` 承载修饰符替换与等级槽位声明。

### `PatternDefinition`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.PatternDefinition`

不可变的分层结构模式。由 `PatternBuilder.build()` 创建。

#### 记录签名

```java
public record PatternDefinition(
        List<List<String>> layers,
        Map<Character, BlockPredicate> predicates,
        char controllerSymbol,
        int width, int height, int depth) {
    // 隐藏方法 bindController(Identifier machineId) 由 MMCR 在结构加载阶段调用
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `layers` | `List<List<String>>` | 分层模式。每个元素是一层，每层是按 y 行的字符串列表；同一字符串内的字符按 x 排序。 |
| `predicates` | `Map<Character, BlockPredicate>` | 字符到方块谓词的绑定。 |
| `controllerSymbol` | `char` | 控制器位置字符。 |
| `width` | `int` | 模式宽度（每行字符数）。 |
| `height` | `int` | 模式高度（每层行数）。 |
| `depth` | `int` | 模式深度（层数）。 |

#### 构造约束

- `layers` / `predicates` 为 `null` → `NullPointerException`。
- `layers.isEmpty()` 或 `width` / `height` / `depth` 任一 `≤ 0` → `IllegalArgumentException`。
- `layers.size() != depth` → `IllegalArgumentException("Pattern depth must match layer count")`。
- 同一层内的行长度必须等于 `width`；同一模式内每层的行数必须等于 `height`。
- `controllerSymbol == ' '` → `IllegalArgumentException("Controller symbol must not be empty space")`。
- 模式中存在未在 `predicates` 中绑定的非空字符 → `IllegalArgumentException("Unbound pattern symbol: ...")`。
- 控制器符号在模式中出现次数不为 1 → `IllegalArgumentException("Pattern must contain exactly one controller symbol")`。

#### `bindController(Identifier machineId)`

MMCR 内部在结构加载阶段调用，将 `controllerSymbol` 绑定到机器对应的自动控制器谓词。Mod 通常不直接调用。

抛出：

- 父级构造约束外，`machineId == null` 抛 `NullPointerException`（由内部 `BuiltinRegistration.controller(...)` 处理）。

#### 示例

```java
PatternDefinition pattern = new PatternDefinition(
        List.of(List.of("A A", " C ")),
        Map.of('A', BlockPredicate.any(), 'C', BlockPredicate.any()),
        'C', 3, 1, 1);
```

:::warning 注意事项

- `PatternDefinition` 是不可变值对象；同一实例可以被多台机器共享（实际上 `PatternBuilder.build()` 会被结构加载阶段调用 `bindController(...)`）。
- 字符 `' '`（空格）保留为"空匹配"，不会出现在 `predicates` 中。
- `width` / `height` / `depth` 由构造器从 `layers` 推导，但用户直接构造时仍需自行提供正确数值。

---
:::
### `StructureRequirements`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.StructureRequirements`

等级槽位与修饰符替换声明的不可变记录。通过 `StructureStage.Builder.requirements(...)` 配置。

#### 记录签名

```java
public record StructureRequirements(
        Map<Character, List<ModifierUse>> modifierReplacements,
        Map<Character, Identifier> levelSlots) {
    public static final StructureRequirements EMPTY = new StructureRequirements(Map.of(), Map.of());
    public static Builder builder();

    public static final class Builder {
        public Builder modifier(char symbol, Identifier modifierId);
        public Builder modifier(char symbol, ModifierUse use);
        public Builder levelSlot(char symbol, Identifier typeId);
        public StructureRequirements build();
    }
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `modifierReplacements` | `Map<Character, List<ModifierUse>>` | 字符 → 修饰符替换规则列表。同一个字符可以挂多个修饰符。 |
| `levelSlots` | `Map<Character, Identifier>` | 字符 → 等级类型 ID。同一个字符只能绑定一个等级类型。 |

#### `Builder`

| 方法 | 含义 |
| --- | --- |
| `modifier(char symbol, Identifier modifierId)` | 为字符添加一个修饰符替换，使用 `air` 作为替换谓词。`modifierId` 必须已注册，否则 `freeze()` 时抛 `ApiRegistrationException`。 |
| `modifier(char symbol, ModifierUse use)` | 同上，使用自定义 `ModifierUse`。`use == null` 抛 `NullPointerException`。 |
| `levelSlot(char symbol, Identifier typeId)` | 绑定字符到等级类型。同一字符重复调用且类型不同抛 `IllegalArgumentException`。 |
| `build()` | 终结构建。 |

抛出：

- `NullPointerException`：`symbol` / `typeId` / `use` 为 `null`。
- `IllegalArgumentException`：同一字符绑定到不同的等级类型。

#### 示例

```java
StructureRequirements req = StructureRequirements.builder()
        .modifier('P', Identifier.fromNamespaceAndPath("my_mod", "speed_boost"))
        .levelSlot('L', Identifier.fromNamespaceAndPath("my_mod", "tech_level"))
        .build();
```

:::warning 注意事项

- 等级槽位字符必须出现在模式中且只对应一个方块谓词，否则结构匹配失败。
- 修饰符替换会按顺序尝试：玩家在结构中放置 `symbol` 对应方块时，按 `modifierReplacements.get(symbol)` 列表顺序尝试第一个能放下的修饰符物品。
- `StructureRequirements.EMPTY` 是无修饰符无等级槽位的空声明。

---
:::
## 11 等级系统

本节覆盖等级类型与等级实例声明。等级是结构中"标识玩家将机器升级到某级"的标记；每台机器可选地声明若干等级槽位，每个槽位对应一个等级类型。

### `LevelType`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.LevelType`

机器等级类型的不可变记录。通过 `MMCRMachineStructuresEvent.registerLevelType(...)` 注册。

#### 记录签名

```java
public record LevelType(Identifier id, Component displayName);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | `Identifier` | 等级类型 ID，必须全局唯一。 |
| `displayName` | `Component` | 等级类型的显示名（用于屏幕与 JADE）。 |

构造约束：

- `id` / `displayName` 为 `null` → `NullPointerException`。

#### 示例

```java
LevelType type = new LevelType(
        Identifier.fromNamespaceAndPath("my_mod", "tech_level"),
        Component.literal("Tech Level"));
event.registerLevelType(type);
```

:::warning 注意事项

- `LevelType` 是不可变值对象；同一实例可被多个等级引用。
- 等级类型必须在结构加载阶段之前注册，否则 `MachineLevel.typeId` 会指向未注册 ID。

---
:::
### `MachineLevel`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.MachineLevel`

某个等级类型下具体等级的不可变记录。通过 `MMCRMachineStructuresEvent.registerLevel(...)` 注册。

#### 记录签名

```java
public record MachineLevel(
        Identifier id,
        Identifier typeId,
        int priority,
        BlockPredicate statePredicate,
        DisplayStack representative,
        LevelModifier modifier);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | `Identifier` | 等级 ID（同一 `typeId` 下唯一）。 |
| `typeId` | `Identifier` | 所属等级类型 ID。 |
| `priority` | `int` | 优先级。数值越大越优先（决定结构匹配时多个等级并存时的优先级）。 |
| `statePredicate` | `BlockPredicate` | 等级槽位方块必须满足的状态谓词。 |
| `representative` | `DisplayStack` | 用于屏幕 / JADE 显示的代表物品。 |
| `modifier` | `LevelModifier` | 该等级生效时的配方修正系数。 |

构造约束：

- 任一引用字段为 `null` → `NullPointerException`。

#### 示例

```java
MachineLevel lv = new MachineLevel(
        Identifier.fromNamespaceAndPath("my_mod", "tech_level/mk2"),
        Identifier.fromNamespaceAndPath("my_mod", "tech_level"),
        10,
        BlockPredicate.block(Items.DIAMOND_BLOCK),
        DisplayStack.of(new ItemStack(Items.DIAMOND)),
        new LevelModifier(0.5D, 1.5D, 1.0D, 0, 0));
event.registerLevel(lv);
```

:::warning 注意事项

- `statePredicate` 必须与等级槽位字符所绑定的方块一致；不一致会导致结构匹配时该等级被忽略。
- `modifier` 影响所有走该机器的配方：持续时间倍率小于 1 表示加速，大于 1 表示减速；并行度加成加到机器原本的并行上限上。

---
:::
### `LevelModifier`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.LevelModifier`

等级生效时的配方修正系数。包含五个字段，全部乘数 / 加成。

#### 记录签名

```java
public record LevelModifier(
        double durationMultiplier,
        double energyMultiplier,
        double outputMultiplier,
        int parallelismBonus,
        int factoryThreadBonus);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `durationMultiplier` | `double` | 持续时间乘数。`<= 0` 抛 `IllegalArgumentException`。`< 1` 加速，`> 1` 减速。 |
| `energyMultiplier` | `double` | 能量乘数。`<= 0` 抛 `IllegalArgumentException`。 |
| `outputMultiplier` | `double` | 输出数量乘数。`<= 0` 抛 `IllegalArgumentException`。 |
| `parallelismBonus` | `int` | 并行加成（加到机器 `maxParallelism`）。 |
| `factoryThreadBonus` | `int` | 工厂线程加成（加到机器工厂线程上限）。 |

#### 静态常量

| 常量 | 含义 |
| --- | --- |
| `IDENTITY` | `(1D, 1D, 1D, 0, 0)`，无任何修正。 |

#### 构造约束

- 三个乘数字段任一 `≤ 0` → `IllegalArgumentException("Machine level multipliers must be positive")`。

#### 示例

```java
LevelModifier speedTwo = new LevelModifier(0.5D, 1.0D, 1.0D, 0, 0); // 2x 加速
LevelModifier bonus = new LevelModifier(1.0D, 1.0D, 2.0D, 4, 1);      // 2x 输出、+4 并行、+1 线程
```

:::warning 注意事项

- 乘数对配方持续时间的影响在 `beforeStart` 钩子应用之前就已计算完毕——回调中的 `duration()` 反映的是等级修正后的结果。
- `parallelismBonus` 会直接加到 `MachineDefinition.maxParallelism` 上；超过 `maxParallelAmount` 的并行度上限仍受机器配置约束。

---
:::
### `LevelRequirement`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.LevelRequirement`

不可变的配方等级要求。通过 `MachineRecipeBuilder.levelRequirement(...)` 创建。

#### 记录签名

```java
public record LevelRequirement(Identifier typeId, Identifier levelId);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `typeId` | `Identifier` | 等级类型 ID。 |
| `levelId` | `Identifier` | 该类型下具体等级 ID。 |

构造约束：

- `typeId` / `levelId` 为 `null` → `NullPointerException`。

#### 示例

```java
MachineRecipeBuilder.recipe(MY_RECIPE, MY_MACHINE)
        .levelRequirement(
                Identifier.fromNamespaceAndPath("my_mod", "tech_level"),
                Identifier.fromNamespaceAndPath("my_mod", "tech_level/mk2"));
```

:::warning 注意事项

- 等级要求在配方执行时由 MMCR 校验；如果玩家的机器未达到该等级，配方不匹配。
- 配方可以声明多个 `LevelRequirement`，全部需要满足。

---
:::
## 12 修饰符系统

本节覆盖机器修饰符（modifier）的定义与使用声明。修饰符是玩家可以放置到结构中的特殊物品，会按配方中预先声明的规则影响配方执行。

### `ModifierDefinition`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.ModifierDefinition`

不可变的修饰符定义记录。通过 `MMCRMachineStructuresEvent.registerModifier(...)` 注册。

#### 记录签名

```java
public record ModifierDefinition(List<RecipeModifier> modifiers) {
    public static ModifierDefinition of(String target, String ioTarget, float modifier, String operation,
            boolean affectsChance);
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `modifiers` | `List<RecipeModifier>` | 该修饰符包含的全部 `RecipeModifier` 项。空列表表示无效果（仍可作为占位注册）。 |

#### 静态构造方法 `of(...)`

便捷工厂，使用字符串名构造单条 `RecipeModifier`。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `target` | `String` | 修饰目标（"duration" / "energy" / "input.&lt;id&gt;" / "output.&lt;id&gt;"）。 |
| `ioTarget` | `String` | IO 方向："input" / "output"。会通过 `RecipeModifier.IOType.valueOf(ioTarget.toUpperCase(Locale.ROOT))` 解析。 |
| `modifier` | `float` | 修饰系数（具体含义取决于 `operation`）。 |
| `operation` | `String` | 操作类型（"multiply" / "add" / "set" / 等）。 |
| `affectsChance` | `boolean` | 是否影响概率字段（仅 `output` 方向生效）。 |

抛出：

- `IllegalArgumentException`：`ioTarget` 或 `operation` 对应的枚举名未知。

#### 示例

```java
event.registerModifier(Identifier.fromNamespaceAndPath("my_mod", "speed"),
        ModifierDefinition.of("duration", "input", 0.5F, "multiply", false));
```

:::warning 注意事项

- `ModifierDefinition` 是不可变值对象；同一修饰符 ID 的注册只能有一次。
- 多个 `RecipeModifier` 项在配方执行时按顺序应用——前面的修饰符可能影响后续修饰符的目标值。

---
:::
### `ModifierUse`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.ModifierUse`

不可变的修饰符使用声明。记录哪个修饰符 ID 在结构匹配时会被尝试替换为哪个方块。

#### 记录签名

```java
public record ModifierUse(Identifier modifierId, BlockPredicate replacement) {
    public static ModifierUse of(Identifier modifierId, BlockPredicate replacement);
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `modifierId` | `Identifier` | 已注册的修饰符 ID。 |
| `replacement` | `BlockPredicate` | 该修饰符放置时匹配的方块谓词。 |

#### 静态构造方法 `of(...)`

便捷工厂，等价于 `new ModifierUse(modifierId, replacement)`。

构造约束：

- `modifierId` / `replacement` 为 `null` → `NullPointerException`。

#### 示例

```java
StructureRequirements.builder()
        .modifier('P', ModifierUse.of(
                Identifier.fromNamespaceAndPath("my_mod", "speed_boost"),
                BlockPredicate.block(Items.REDSTONE_BLOCK)));
```

:::warning 注意事项

- 同一字符可以挂多个 `ModifierUse`（通过 `StructureRequirements.Builder.modifier(char, ModifierUse)` 多次调用）。匹配时按注册顺序尝试。
- `replacement` 是方块谓词，可以是单方块 / 方块状态 / 标签 / 并集；详见 `BlockPredicate` 一节。

---
:::
### `OutputPolicy`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.OutputPolicy`

控制输出操作的策略枚举。

#### 枚举值

| 常量 | 含义 |
| --- | --- |
| `REQUIRE_FULL` | 要求输出能完全放入对应能力槽位，否则视为 commit 失败。默认策略。 |
| `ALLOW_PARTIAL` | 允许输出在容量受限时部分完成；未放下的部分被丢弃。 |

#### 示例

```java
MachineIoPlan plan = tickCtx.ioPlan()
        .addOutput(requirement, OutputPolicy.ALLOW_PARTIAL);
```

:::warning 注意事项

- `ALLOW_PARTIAL` 在 `TickBehavior` 中常用——很多直接驱动的机器（反应堆、发电机）允许产物部分输出。
- `OutputPolicy` 仅影响 `MachineIoPlan`；`MachineRecipeDefinition.allowPartialOutputs` 是另一个独立字段，控制配方路径下的部分输出语义。

---
:::
## 13 智能接口

本节覆盖智能接口（Smart Interface）类型与修饰符。智能接口允许玩家向机器传递非物品 / 流体的浮点参数（如"效率"），并由机器按修饰符规则影响配方。

### `SmartInterfaceType`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.SmartInterfaceType`

智能接口值类型的不可变记录。通过 `MachineBuilder.smartInterface(...)` 注册。

#### 记录签名

```java
public record SmartInterfaceType(
        String type,
        float defaultValue,
        float minValue,
        float maxValue,
        int priority,
        ValueType valueType) {

    public enum ValueType { FLOAT, INTEGER }

    public SmartInterfaceType(String type, float minValue, float maxValue, int priority);
    public SmartInterfaceType(String type, float minValue, float maxValue, int priority, ValueType valueType);
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `type` | `String` | 接口类型名称，全局唯一。 |
| `defaultValue` | `float` | 默认值。 |
| `minValue` | `float` | 最小值。 |
| `maxValue` | `float` | 最大值。 |
| `priority` | `int` | 优先级。数值越大越优先。 |
| `valueType` | `ValueType` | 值类型：`FLOAT` 或 `INTEGER`。 |

#### `ValueType`

| 常量 | 含义 |
| --- | --- |
| `FLOAT` | 浮点数；默认值。 |
| `INTEGER` | 整数；要求 `defaultValue` / `minValue` / `maxValue` 都为整数。 |

`ValueType.byName(String name)`：将字符串解析为 `ValueType`，接受 `"float"` / `"int"` / `"integer"`，大小写不敏感。`null` / 空字符串默认 `FLOAT`。

#### 构造约束

- `type` 为 `null` / 空字符串 → `IllegalArgumentException("type blank")`。
- 任一数值非有限（`Float.isFinite` 返回 `false`）、`minValue > maxValue`、`defaultValue` 越界 → `IllegalArgumentException("invalid smart interface range")`。
- `valueType == INTEGER` 且任一数值非整数 → `IllegalArgumentException("integer smart interface range must be integral")`。

#### 便捷构造器

```java
public SmartInterfaceType(String type, float minValue, float maxValue, int priority)
public SmartInterfaceType(String type, float minValue, float maxValue, int priority, ValueType valueType)
```

两者都会把 `defaultValue` 默认设置为 `minValue`。

#### 示例

```java
SmartInterfaceType type = new SmartInterfaceType("efficiency", 0F, 5F, 0);
MachineBuilder.machine(MY_ID).smartInterface(type);
```

:::warning 注意事项

- `type` 名称是注册 ID，必须全局唯一；在 `MachineBuilder.smartInterface(...)` 中重复注册同一名称抛 `IllegalArgumentException`。
- `INTEGER` 类型的最小 / 最大值使用 `Math.rint(...)` 校验小数部分；不要把 `0.5F` 之类的值传给 `INTEGER` 类型。
- `priority` 决定当多个智能接口实例出现时的优先级；通常 0 即可。

---
:::
### `SmartInterfaceModifier`

完整类名：`cn.howxu.mmcr.api.publicapi.machine.SmartInterfaceModifier`

将智能接口值映射到配方修饰符的不可变记录。通过 `MachineBuilder.smartInterfaceModifier(...)` 注册。

#### 记录签名

```java
public record SmartInterfaceModifier(
        String interfaceType,
        String target,
        RecipeModifier.IOType io,
        boolean affectsChance,
        float minValue, float maxValue,
        float atMin, float atMax,
        RecipeModifier.Operation operation) {

    public static SmartInterfaceModifier duration(String type, float min, float max,
                                                  float atMin, float atMax,
                                                  RecipeModifier.Operation operation);
    public static SmartInterfaceModifier energy(String type, float min, float max,
                                                float atMin, float atMax,
                                                RecipeModifier.Operation operation);
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `interfaceType` | `String` | 对应的 `SmartInterfaceType.type`。 |
| `target` | `String` | 修饰目标（"duration" / "energy" / "input.&lt;id&gt;" / "output.&lt;id&gt;"）。 |
| `io` | `RecipeModifier.IOType` | IO 方向，默认为 `INPUT`。 |
| `affectsChance` | `boolean` | 是否影响概率字段。 |
| `minValue` / `maxValue` | `float` | 智能接口值范围。 |
| `atMin` / `atMax` | `float` | 当智能接口值取到 `minValue` / `maxValue` 时，映射到目标上的修饰值。 |
| `operation` | `RecipeModifier.Operation` | 应用方式，默认为 `MULTIPLY`。 |

#### 便捷静态方法

| 方法 | 等价于 |
| --- | --- |
| `duration(type, min, max, atMin, atMax, op)` | `new SmartInterfaceModifier(type, "duration", INPUT, false, min, max, atMin, atMax, op)` |
| `energy(type, min, max, atMin, atMax, op)` | `new SmartInterfaceModifier(type, "energy", INPUT, false, min, max, atMin, atMax, op)` |

#### 构造约束

- `interfaceType` / `target` 为 `null` / 空字符串 → `IllegalArgumentException`。
- 任一数值非有限 → `IllegalArgumentException("smart interface modifier values must be finite")`。

#### 示例

```java
SmartInterfaceModifier durationMod = SmartInterfaceModifier.duration(
        "efficiency", 0F, 5F, 1F, 0.25F, RecipeModifier.Operation.MULTIPLY);
MachineBuilder.machine(MY_ID).smartInterfaceModifier(durationMod);
```

:::warning 注意事项

- `atMin` / `atMax` 决定智能接口值与配方修饰值的映射曲线。当 `op == MULTIPLY` 时，`atMin = 1F` 表示"最小智能接口值时不缩放"，`atMax = 0.25F` 表示"最大智能接口值时缩放到 0.25x"。
- 智能接口的实际值由运行时 `MachineIoView.smartInterfaceValue(name)` 提供，回调中的取值随玩家设置变化。

---
:::
## 14 配方 IO 类型

本节覆盖配方 IO 类型的不可变记录。这些类都是 `record`，仅包含数据字段与构造约束。运行时操作（添加输入 / 输出到配方）请使用 `MachineRecipeBuilder`。

### `CustomRecipeIo`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.CustomRecipeIo`

基于 codec 的自定义配方 IO 声明。实现 `RecipeRequirement`。

#### 记录签名

```java
public record CustomRecipeIo(Identifier typeId, RecipeIo ioType, JsonElement payload) implements RecipeRequirement {
    @Override public JsonElement payload();
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `typeId` | `Identifier` | 已注册的需求 / 输出类型 ID。 |
| `ioType` | `RecipeIo` | IO 方向。 |
| `payload` | `JsonElement` | codec 负载，必须是 JSON 对象。 |

#### 构造约束

- 任一引用参数为 `null` → `NullPointerException`。
- `payload` 不是 JSON 对象 → `IllegalArgumentException("Recipe IO payload must be an object")`。

#### `payload() → JsonElement`

返回 payload 的深拷贝（防止外部修改影响内部状态）。

#### 替代构造路径

`RecipeRequirement.custom(typeId, ioType, payload)` 与 `RecipeApi.custom(typeId, ioType, payload)` 都会先校验 codec 一致性，建议优先使用这两个便捷方法。

#### 示例

```java
JsonElement payload = JsonParser.parseString("{\"mana\": 1000}");
CustomRecipeIo io = new CustomRecipeIo(
        Identifier.fromNamespaceAndPath("my_mod", "mana_input"),
        RecipeIo.INPUT, payload);
```

:::warning 注意事项

- 直接用 `new CustomRecipeIo(...)` 不会主动校验 `typeId` 与 `payload` 是否一致；类型错配会在 `freeze()` 阶段或运行时被发现。
- `payload` 在构造与 `payload()` 读取时都会被深拷贝，可以安全持有外部引用。

---
:::
### `ItemInput`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.ItemInput`

不可变的物品输入值。

#### 记录签名

```java
public record ItemInput(Ingredient ingredient, int count,
                        DataComponentPredicateSet components, float consumeChance);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `ingredient` | `Ingredient` | 物品原料谓词。 |
| `count` | `int` | 数量。`< 1` 抛 `IllegalArgumentException`。 |
| `components` | `DataComponentPredicateSet` | 数据组件谓词。`null` 替换为 `DataComponentPredicateSet.EMPTY`。 |
| `consumeChance` | `float` | 消耗概率，范围 `[0, 1]`。`> 1` / `< 0` / 非有限抛 `IllegalArgumentException`。 |

#### 便捷构造器

```java
public ItemInput(Item item, int count);
public ItemInput(Ingredient ingredient, int count);
```

两者都使用 `DataComponentPredicateSet.EMPTY` 与 `consumeChance = 1F`。

抛出：

- `IllegalArgumentException`：`count < 1`、`consumeChance` 非法。
- `NullPointerException`：`item` / `ingredient` 为 `null`。

#### 示例

```java
ItemInput input = new ItemInput(Ingredient.of(Items.IRON_INGOT), 2);
ItemInput chanced = new ItemInput(Ingredient.of(Items.COAL), 1, DataComponentPredicateSet.EMPTY, 0.5F);
```

:::warning 注意事项

- `components` 可以包含模糊谓词（`Range` / `TextValue`），这些值在匹配时按模糊规则生效。
- `consumeChance = 1F` 表示每次执行必定消耗；`< 1F` 表示按概率保留物品（用于"工具磨损"或"概率消耗"场景）。

---
:::
### `ItemOutput`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.ItemOutput`

不可变的物品输出值。

#### 记录签名

```java
public record ItemOutput(ItemStack stack, float chance, DataComponentPredicateSet components);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `stack` | `ItemStack` | 输出的物品栈。空栈 / 数量 `< 1` 抛 `IllegalArgumentException`。 |
| `chance` | `float` | 出现概率，范围 `[0, 1]`。非法值抛 `IllegalArgumentException`。 |
| `components` | `DataComponentPredicateSet` | 数据组件谓词。`null` 替换为 `DataComponentPredicateSet.EMPTY`。 |

构造约束：

- `components` 含非 `Exact` 谓词（即 `hasNonExactValues() == true`）抛 `IllegalArgumentException("Item output components must be exact")`。
- `stack()` 返回拷贝。

#### 便捷构造器

```java
public ItemOutput(Item item, int count);
public ItemOutput(ItemStack stack);
public ItemOutput(ItemStack stack, float chance);
public ItemOutput(ItemStack stack, DataComponentPredicateSet components);
```

抛出：

- `NullPointerException`：`item` / `stack` 为 `null`。

#### 示例

```java
ItemOutput out = new ItemOutput(new ItemStack(Items.DIAMOND, 1));
ItemOutput chanced = new ItemOutput(new ItemStack(Items.EMERALD, 1), 0.25F);
```

:::warning 注意事项

- 与 `ItemInput` 不同，`ItemOutput` 不允许模糊组件谓词——输出必须明确指定 `Exact` 谓词。
- `stack()` 每次返回新拷贝，外部修改不会影响 `ItemOutput`。

---
:::
### `ItemRequirement`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.ItemRequirement`

不可变的物品配方需求条目。实现 `RecipeRequirement`。`io == INPUT` 时使用 `ingredient` / `count` / `consumeChance`；`io == OUTPUT` 时使用 `stack` / `chance`。

#### 记录签名

```java
public record ItemRequirement(
        RecipeIo io,
        Ingredient ingredient,
        int count,
        ItemStack stack,
        float chance,
        DataComponentPredicateSet components,
        float consumeChance) implements RecipeRequirement {

    public static ItemRequirement input(ItemInput input);
    public static ItemRequirement output(ItemOutput output);

    @Override public ItemStack stack();
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `io` | `RecipeIo` | IO 方向，决定哪些字段生效。 |
| `ingredient` | `Ingredient` | 输入谓词；`OUTPUT` 时为 `null`。 |
| `count` | `int` | 输入数量；`OUTPUT` 时为 `0`。`< 1`（输入时）抛 `IllegalArgumentException`。 |
| `stack` | `ItemStack` | 输出栈；`INPUT` 时为 `ItemStack.EMPTY`。空栈（输出时）抛 `IllegalArgumentException`。 |
| `chance` | `float` | 输出概率；`INPUT` 时为 `1F`。范围 `[0, 1]`。 |
| `components` | `DataComponentPredicateSet` | 数据组件谓词；`null` 替换为 `EMPTY`。 |
| `consumeChance` | `float` | 消耗概率；`OUTPUT` 时为 `1F`。范围 `[0, 1]`。 |

构造约束（按方向）：

- `INPUT`：`ingredient == null` 抛 `NullPointerException`；`count < 1` 抛 `IllegalArgumentException`。
- `OUTPUT`：`stack == null` 或空栈抛 `IllegalArgumentException` / `NullPointerException`。

#### 静态工厂

| 方法 | 含义 |
| --- | --- |
| `input(ItemInput input)` | 从 `ItemInput` 创建 `INPUT` 方向的 `ItemRequirement`。 |
| `output(ItemOutput output)` | 从 `ItemOutput` 创建 `OUTPUT` 方向的 `ItemRequirement`。 |

#### 示例

```java
ItemRequirement in = ItemRequirement.input(new ItemInput(Ingredient.of(Items.IRON_INGOT), 2));
ItemRequirement out = ItemRequirement.output(new ItemOutput(new ItemStack(Items.IRON_NUGGET, 10)));
```

:::warning 注意事项

- 这是 `MachineRecipeDefinition.itemInputs` / `itemOutputs` 字段实际存储的类型。
- `stack()` 每次返回新拷贝。

---
:::
### `FluidInput`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.FluidInput`

不可变的流体输入值。

#### 记录签名

```java
public record FluidInput(FluidIngredient ingredient, int amount);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `ingredient` | `FluidIngredient` | 流体原料谓词。 |
| `amount` | `int` | 数量。`< 1` 抛 `IllegalArgumentException`。 |

#### 便捷构造器

```java
public FluidInput(Fluid fluid, int amount);
```

`fluid == null` 抛 `NullPointerException`。

#### 示例

```java
FluidInput in = new FluidInput(Fluids.WATER, 1000);
FluidInput tag = new FluidInput(FluidIngredient.tag(FluidTags.WATER), 500);
```

:::warning 注意事项

- 与 `ItemInput` 不同，`FluidInput` 没有消耗概率与数据组件字段——流体的消耗在 MMCR 中总是按配方定义执行。

---
:::
### `FluidOutput`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.FluidOutput`

不可变的流体输出值。

#### 记录签名

```java
public record FluidOutput(FluidStack stack, float chance);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `stack` | `FluidStack` | 流体栈。空栈 / 数量 `< 1` 抛 `IllegalArgumentException`。 |
| `chance` | `float` | 出现概率，范围 `[0, 1]`。非法值抛 `IllegalArgumentException`。 |

#### 便捷构造器

```java
public FluidOutput(Fluid fluid, int amount);
public FluidOutput(FluidStack stack);
```

`fluid == null` 抛 `NullPointerException`。`stack()` 返回拷贝。

#### 示例

```java
FluidOutput out = new FluidOutput(Fluids.LAVA, 250);
FluidOutput chanced = new FluidOutput(new FluidStack(Fluids.LAVA, 250), 0.5F);
```

---

### `FluidRequirement`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.FluidRequirement`

不可变的流体配方需求条目。实现 `RecipeRequirement`。

#### 记录签名

```java
public record FluidRequirement(
        RecipeIo io,
        FluidIngredient ingredient,
        int amount,
        FluidStack stack,
        float chance) implements RecipeRequirement {

    public static FluidRequirement input(FluidInput input);
    public static FluidRequirement output(FluidOutput output);

    @Override public FluidStack stack();
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `io` | `RecipeIo` | IO 方向。 |
| `ingredient` | `FluidIngredient` | 输入谓词；`OUTPUT` 时为 `null`。 |
| `amount` | `int` | 输入数量；`OUTPUT` 时为 `0`。`< 1`（输入时）抛 `IllegalArgumentException`。 |
| `stack` | `FluidStack` | 输出栈；`INPUT` 时为 `FluidStack.EMPTY`。 |
| `chance` | `float` | 输出概率；`INPUT` 时为 `1F`。范围 `[0, 1]`。 |

#### 静态工厂

| 方法 | 含义 |
| --- | --- |
| `input(FluidInput input)` | 从 `FluidInput` 创建 `INPUT` 方向的 `FluidRequirement`。 |
| `output(FluidOutput output)` | 从 `FluidOutput` 创建 `OUTPUT` 方向的 `FluidRequirement`。 |

:::warning 注意事项

- 与 `ItemRequirement` 对称，但是不包含 `components` 与 `consumeChance` 字段——流体不支持模糊组件或消耗概率。

---
:::
### `EnergyInput`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.EnergyInput`

不可变的能量值。实际表示每 tick 的 FE 量，但范围限制与 `EnergyRequirement` 相同（按 `MachineRecipeDefinition.energyOutputs` 字段约定）。

#### 记录签名

```java
public record EnergyInput(long fePerTick);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `fePerTick` | `long` | 每 tick 的 FE 数。`fePerTick < 1` 或 `> Integer.MAX_VALUE` 抛 `IllegalArgumentException("Energy per tick must be in [1, Integer.MAX_VALUE]")`。 |

#### 示例

```java
EnergyInput fe = new EnergyInput(40L); // 40 FE/t
```

:::warning 注意事项

- 实际能量需求 / 产生由 `MachineRecipeBuilder.inputEnergy(...)` / `outputEnergy(...)` 设置；`EnergyInput` 类型仅在 `MachineRecipeDefinition` 字段中复用，按 `ioType` 区分输入 / 输出。

---
:::
### `EnergyRequirement`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.EnergyRequirement`

不可变的能量配方需求条目。实现 `RecipeRequirement`。

#### 记录签名

```java
public record EnergyRequirement(RecipeIo io, long fePerTick) implements RecipeRequirement;
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `io` | `RecipeIo` | IO 方向。`null` 抛 `NullPointerException`。 |
| `fePerTick` | `long` | 每 tick 的 FE 数。`< 1` 或 `> Integer.MAX_VALUE` 抛 `IllegalArgumentException`。 |

#### 示例

```java
EnergyRequirement req = new EnergyRequirement(RecipeIo.INPUT, 80L);
```

:::warning 注意事项

- 与 `EnergyInput` 不同，`EnergyRequirement` 显式携带 `io` 字段，因此可以直接用于 `MachineRecipeDefinition.energyInputs` / `energyOutputs`。

---
:::
### `RecipeIo`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.RecipeIo`

配方 IO 方向枚举。

#### 枚举值

| 常量 | 含义 |
| --- | --- |
| `INPUT` | 输入方向。 |
| `OUTPUT` | 输出方向。 |

#### `isInput() → boolean`

| 返回 | 含义 |
| --- | --- |
| `true` | 当前方向是输入。 |
| `false` | 当前方向是输出。 |

#### 示例

```java
RecipeIo dir = RecipeIo.INPUT;
boolean isInput = dir.isInput();  // true
```

---

### `RecipeRequirement`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.RecipeRequirement`

不可变配方需求的密封接口。`sealed`，仅允许 `ItemRequirement` / `FluidRequirement` / `EnergyRequirement` / `SmartInterfaceRequirement` / `CustomRecipeIo` 实现。

#### 接口签名

```java
public sealed interface RecipeRequirement permits ItemRequirement, FluidRequirement, EnergyRequirement,
        SmartInterfaceRequirement, CustomRecipeIo {
    static CustomRecipeIo custom(net.minecraft.resources.Identifier typeId, RecipeIo ioType,
                                 com.google.gson.JsonElement payload);
}
```

#### `custom(Identifier typeId, RecipeIo ioType, JsonElement payload) → CustomRecipeIo`

便捷工厂，等价于 `RecipeApi.custom(typeId, ioType, payload)`。详见 `RecipeApi` 一节。

#### 示例

```java
RecipeRequirement req = RecipeRequirement.custom(
        Identifier.fromNamespaceAndPath("my_mod", "mana"),
        RecipeIo.INPUT,
        JsonParser.parseString("{\"amount\": 500}"));
```

:::warning 注意事项

- 直接用 `new CustomRecipeIo(...)` 不会执行 codec 校验，`RecipeRequirement.custom(...)` 会主动校验。
- 该接口是 `sealed`，不能由用户自行实现——如需扩展自定义需求，需通过 MMCR 内部的 codec 注册路径。

---
:::
### `RequiredHost`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.RequiredHost`

不可变的配方宿主机器要求。

#### 记录签名

```java
public record RequiredHost(Identifier id);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | `Identifier` | 宿主机器 ID。`null` 抛 `NullPointerException`。 |

#### 示例

```java
MachineRecipeBuilder.recipe(MY_RECIPE, MY_MODULE)
        .requiredHost(Identifier.fromNamespaceAndPath("my_mod", "module_host"));
```

:::warning 注意事项

- `RequiredHost` 不是 `RecipeRequirement`——它是 `MachineRecipeDefinition.requiredHosts` 字段的独立条目类型，专门表示"此模块配方只能在指定宿主的机器上执行"。

---
:::
### `SmartInterfaceRequirement`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.SmartInterfaceRequirement`

不可变的智能接口配方需求。实现 `RecipeRequirement`。

#### 记录签名

```java
public record SmartInterfaceRequirement(RecipeIo io, String interfaceType, float minValue, float maxValue)
        implements RecipeRequirement {

    public static SmartInterfaceRequirement input(String type, float value);
    public static SmartInterfaceRequirement input(String type, float min, float max);
    public static SmartInterfaceRequirement output(String type, float value);
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `io` | `RecipeIo` | IO 方向。 |
| `interfaceType` | `String` | 智能接口类型名。空字符串 / `null` 抛 `IllegalArgumentException("interfaceType must not be blank")`。 |
| `minValue` | `float` | 最小值。 |
| `maxValue` | `float` | 最大值。`minValue > maxValue` 或非有限抛 `IllegalArgumentException("Smart interface range must be finite and ordered")`。 |

#### 静态工厂

| 方法 | 含义 |
| --- | --- |
| `input(String type, float value)` | 输入方向，单点值（`min == max == value`）。 |
| `input(String type, float min, float max)` | 输入方向，区间值。 |
| `output(String type, float value)` | 输出方向，单点值。 |

#### 示例

```java
SmartInterfaceRequirement req = SmartInterfaceRequirement.input("efficiency", 0F, 5F);
```

:::warning 注意事项

- 智能接口需求仅在机器声明了对应 `SmartInterfaceType` 时生效；否则该需求始终不满足，配方永不匹配。

---
:::
### `ComponentPredicate`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.component.ComponentPredicate`

JSON 驱动的物品数据组件匹配谓词。`sealed` 接口。

#### 接口签名

```java
public sealed interface ComponentPredicate permits ComponentPredicate.Exact, ComponentPredicate.MapValue,
        ComponentPredicate.ListValue, ComponentPredicate.Range, ComponentPredicate.TextValue {

    static ComponentPredicate exact(JsonElement value);
    static ComponentPredicate map(Map<String, ComponentPredicate> values);
    static ComponentPredicate list(List<ComponentPredicate> values);
    static ComponentPredicate range(double min, double max);
    static ComponentPredicate text(String value, TextMode mode);

    default boolean isExact();

    record Exact(JsonElement value) implements ComponentPredicate;
    record MapValue(Map<String, ComponentPredicate> values) implements ComponentPredicate;
    record ListValue(List<ComponentPredicate> values) implements ComponentPredicate;
    record Range(double min, double max) implements ComponentPredicate;
    record TextValue(String value, TextMode mode) implements ComponentPredicate;

    enum TextMode { PLAIN, FULL }
}
```

#### 静态构造方法

| 方法 | 含义 |
| --- | --- |
| `exact(JsonElement value)` | 精确匹配某个 JSON 值（值比较时按 JSON 等价）。`value.deepCopy()` 在构造时被复制。 |
| `map(Map<String, ComponentPredicate> values)` | 匹配 map 类型数据组件——map 中每个键都对应一个子谓词，全部满足才算匹配。 |
| `list(List<ComponentPredicate> values)` | 匹配 list 类型数据组件——list 中所有元素都要满足。 |
| `range(double min, double max)` | 匹配数值范围（含端点）。 |
| `text(String value, TextMode mode)` | 匹配文本，参见 `TextMode`。 |

#### `isExact() → boolean`

| 返回 | 含义 |
| --- | --- |
| `true` | 当前谓词是 `Exact`（精确匹配）。 |
| `false` | 其他类型（`MapValue` / `ListValue` / `Range` / `TextValue`）。 |

#### 子记录字段

| 记录 | 字段 | 含义 |
| --- | --- | --- |
| `Exact` | `value` | JSON 值。`value()` 读取时返回深拷贝。 |
| `MapValue` | `values` | 子谓词映射。构造时复制为不可变 Map。 |
| `ListValue` | `values` | 子谓词列表。构造时复制为不可变 List。 |
| `Range` | `min`, `max` | 数值范围。 |
| `TextValue` | `value`, `mode` | 文本与匹配模式。 |

#### `TextMode` 枚举

| 常量 | 含义 |
| --- | --- |
| `PLAIN` | 忽略文本样式与文本颜色，按字符串内容匹配。 |
| `FULL` | 严格匹配文本的样式、颜色、悬浮事件等全部属性。 |

#### 示例

```java
ComponentPredicate exact = ComponentPredicate.exact(JsonPrimitive.of(42));
ComponentPredicate range = ComponentPredicate.range(0D, 100D);
ComponentPredicate text = ComponentPredicate.text("Hello", ComponentPredicate.TextMode.PLAIN);
```

:::warning 注意事项

- `Exact` 用于输出端的精确匹配；模糊谓词（`Range` / `TextValue` / `MapValue` / `ListValue`）仅允许出现在输入端，输出端若包含模糊谓词会抛 `IllegalArgumentException("Item output components must be exact")`。
- `map` / `list` 是嵌套谓词，可以组合出复杂的数据组件匹配规则。

---
:::
### `DataComponentPredicateSet`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.component.DataComponentPredicateSet`

按数据组件 ID 组织的 `ComponentPredicate` 集合。

#### 记录签名

```java
public record DataComponentPredicateSet(Map<Identifier, ComponentPredicate> values) {
    public static final DataComponentPredicateSet EMPTY = new DataComponentPredicateSet(Map.of());

    public boolean hasNonExactValues();
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `values` | `Map<Identifier, ComponentPredicate>` | 数据组件 ID → 谓词。构造时复制为不可变 Map。`null` 会被替换为 `Map.of()`。 |

#### `EMPTY`

无组件谓词的空集合，可作为默认值使用。

#### `hasNonExactValues() → boolean`

| 返回 | 含义 |
| --- | --- |
| `true` | 集合中存在非 `Exact` 谓词——只能在输入端使用。 |
| `false` | 全部是 `Exact`，输入 / 输出端均可使用。 |

#### 示例

```java
DataComponentPredicateSet set = new DataComponentPredicateSet(Map.of(
        Identifier.fromNamespaceAndPath("minecraft", "damage"),
        ComponentPredicate.range(0D, 50D)));
```

:::warning 注意事项

- `DataComponentPredicateSet` 构造时不会主动校验 ID 是否对应已注册的数据组件；校验发生在配方匹配阶段。
- `hasNonExactValues()` 在 `ItemOutput` 构造时被调用，输出端不允许模糊谓词。

---
:::
## 15 控制器渲染

本节覆盖客户端控制器方块的渲染器接口。渲染器通过 `MMCRMachineRendersEvent` 注册，绑定到机器 ID，并在控制器方块的 `BlockEntityRenderer` 流程中被回调。

### `ControllerRenderer`

完整类名：`cn.howxu.mmcr.api.publicapi.render.ControllerRenderer`

控制器渲染器接口。`@FunctionalInterface`，可用 lambda 简写。

#### 接口签名

```java
@FunctionalInterface
public interface ControllerRenderer {
    void render(ControllerRenderContext context, PoseStack poseStack,
                SubmitNodeCollector nodeCollector, CameraRenderState camera);

    default boolean shouldRenderOffScreen();
    default int getViewDistance();
}
```

#### `render(...) → void`

执行实际的渲染逻辑。回调在客户端主线程 / 渲染线程触发。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `context` | `ControllerRenderContext` | 当前控制器的渲染上下文。 |
| `poseStack` | `PoseStack` | 当前变换栈。 |
| `nodeCollector` | `SubmitNodeCollector` | 用于提交渲染节点的收集器。 |
| `camera` | `CameraRenderState` | 摄像机渲染状态。 |

抛出：抛出的异常会被 MMCR 记录日志，但不会传播到渲染流程外。

#### `shouldRenderOffScreen() → boolean`

| 返回 | 含义 |
| --- | --- |
| `true` | 即使控制器不在视野内也强制渲染（用于滚动指示灯等特效）。默认 `false`。 |
| `false` | 仅在视野内渲染（默认）。 |

#### `getViewDistance() → int`

返回渲染器需要的最远视距（方块数）。默认 `64`。MMCR 在调度渲染时会参考该值决定是否跳过远处的实例。

#### 示例

```java
ControllerRenderer renderer = (context, pose, collector, camera) -> {
    if (context.crafting().status() == CraftingStatus.Status.RUNNING) {
        // 在控制器正面绘制进度条
    }
};
event.register(MY_MACHINE, renderer);
```

:::warning 注意事项

- `render(...)` 中不应修改任何服务端状态——它运行在客户端。
- `shouldRenderOffScreen()` 与 `getViewDistance()` 是性能调优接口；过度启用会导致大量不必要的渲染。
- 渲染器回调中不要持有 `ControllerRenderContext` 跨 tick 使用——它是当前帧的不可变快照。

---
:::
### `ControllerRenderContext`

完整类名：`cn.howxu.mmcr.api.publicapi.render.ControllerRenderContext`

控制器渲染器的不可变渲染上下文。

#### 记录签名

```java
public record ControllerRenderContext(
        BlockPos controllerPos,
        Identifier machineId,
        @Nullable Direction facing,
        StructureView structure,
        CraftingView crafting,
        Map<String, DataValue> dataStorageValues,
        int lightCoords,
        float partialTick) {

    public record StructureView(boolean formed, boolean structureAreaLoaded, int matchedStage) { }
    public record CraftingView(@Nullable Identifier recipeId,
                               CraftingStatus.Status status, String statusMessage,
                               @Nullable ExecutionStatus failure,
                               int tick, int totalTick, long parallelism, long maxParallelism,
                               boolean recipeLocked, String lockedRecipeId) { }
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `controllerPos` | `BlockPos` | 控制器方块位置（不可变）。 |
| `machineId` | `Identifier` | 机器 ID。 |
| `facing` | `@Nullable Direction` | 控制器朝向，可为 `null`（未成型时）。 |
| `structure` | `StructureView` | 结构成型状态。 |
| `crafting` | `CraftingView` | 当前配方 / tick / 失败状态。 |
| `dataStorageValues` | `Map<String, DataValue>` | 数据存储中可被客户端访问的键值。`null` 替换为 `Map.of()`。 |
| `lightCoords` | `int` | 当前光照坐标（packed light）。 |
| `partialTick` | `float` | 当前帧的部分 tick（用于插值）。 |

构造约束：

- `controllerPos` / `machineId` / `structure` / `crafting` 为 `null` → `NullPointerException`。
- `controllerPos` 在构造时调用 `immutable()` 冻结。

#### `StructureView`

| 字段 | 含义 |
| --- | --- |
| `formed` | 结构是否成型。 |
| `structureAreaLoaded` | 结构区域是否已加载（避免在未加载区域执行渲染）。 |
| `matchedStage` | 当前匹配到的阶段（`FULL` / `EXPANSION` / `EXTENSION`）。 |

#### `CraftingView`

| 字段 | 含义 |
| --- | --- |
| `recipeId` | 当前配方 ID，可为 `null`。 |
| `status` | 当前 `CraftingStatus.Status`。 |
| `statusMessage` | 状态描述字符串，可为空字符串。 |
| `failure` | 当前失败状态（`ExecutionStatus`），可空。 |
| `tick` / `totalTick` | 当前 tick 与配方总 tick。 |
| `parallelism` / `maxParallelism` | 当前并行数与上限。 |
| `recipeLocked` | 配方是否被锁定（控制器界面上不再显示配方切换）。 |
| `lockedRecipeId` | 被锁定配方的 ID 字符串（`recipeLocked == false` 时为空字符串）。 |

#### 示例

```java
ControllerRenderer renderer = (ctx, pose, collector, camera) -> {
    CraftingView crafting = ctx.crafting();
    if (crafting.status() == CraftingStatus.Status.RUNNING) {
        float progress = (float) crafting.tick() / crafting.totalTick();
        // 用 progress 驱动自定义进度条
    }
};
```

:::warning 注意事项

- `CraftingView.failure` 是不可变副本，可以安全地序列化到渲染线程外使用。
- `dataStorageValues` 仅包含显式标记为"客户端可见"的数据值；不要假设服务端所有数据都可读。
- `partialTick` 用于在两个 tick 之间做插值（例如进度条动画），但不应用于逻辑判断。

---
:::
## 16 控制器屏幕文本

本节覆盖服务端运行时控制器屏幕文本的注册与渲染。屏幕文本通过 `ControllerScreenTextRegistry` 注册到机器 ID，每次控制器 tick 时由 MMCR 调用。

### `ControllerScreenText`

完整类名：`cn.howxu.mmcr.api.publicapi.controller.ControllerScreenText`

运行时控制器屏幕文本的句柄。Mod 通过 `MachineBehaviorContext.screenText()` 或 `ControllerRuntimeContext.screenText()` 获得。

#### 接口签名

```java
public interface ControllerScreenText {
    void append(ControllerScreenTextScope scope, Identifier lineId, Component text);
    default void replace(Identifier lineId, Component text) { }
    default void appendAfter(ControllerScreenTextScope scope, Identifier lineId, Identifier afterLineId, Component text);
    void remove(ControllerScreenTextScope scope, Identifier lineId);
    void clear(ControllerScreenTextScope scope);
}
```

#### `append(scope, lineId, text)`

向指定 scope 追加一行。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `scope` | `ControllerScreenTextScope` | 文本作用域：`CONTROLLER` 或 `OPERATION`。 |
| `lineId` | `Identifier` | 行 ID；同 scope 内相同 `lineId` 会被替换。 |
| `text` | `Component` | 显示文本。 |

#### `appendAfter(scope, lineId, afterLineId, text)`

将 `text` 插入到 `afterLineId` 之后；目标行不存在时操作被忽略。默认实现退化为 `append(...)`。

#### `replace(lineId, text)`

替换一行（不依赖 scope）。默认实现为空——需要全局可见的实现应覆写该方法。

#### `remove(scope, lineId)`

从指定 scope 删除一行。

#### `clear(scope)`

清空指定 scope 中的全部行。

#### 示例

```java
ctx.screenText().append(
        ControllerScreenTextScope.CONTROLLER,
        Identifier.fromNamespaceAndPath("my_mod", "status"),
        Component.literal("Working..."));
```

:::warning 注意事项

- `lineId` 应保持稳定——MMCR 用它做幂等检查；不同 tick 之间使用相同 `lineId` 的 `append(...)` 会替换上一帧的内容。
- `OPERATION` scope 的内容会随当前配方操作状态变化（开始 / 结束 / 失败），由 MMCR 在每个 tick 自动重置；`CONTROLLER` scope 由 Mod 完全控制。

---
:::
### `ControllerScreenTextHandler`

完整类名：`cn.howxu.mmcr.api.publicapi.controller.ControllerScreenTextHandler`

单次屏幕文本更新的应用回调。`@FunctionalInterface`。

#### 接口签名

```java
@FunctionalInterface
public interface ControllerScreenTextHandler {
    void apply(ControllerRuntimeContext context);
}
```

#### `apply(context)`

由 `ControllerScreenTextRegistry` 在每 tick 调用，向 `context.screenText()` 写入屏幕文本。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `context` | `ControllerRuntimeContext` | 当前控制器的运行时上下文。 |

抛出：抛出的异常会被 `ControllerScreenTextRegistry` 捕获并记录日志，不会传播到其他 handler。

#### 示例

```java
ControllerScreenTextHandler handler = ctx -> {
    if (ctx.machineId().equals(MY_MACHINE)) {
        ctx.screenText().append(
                ControllerScreenTextScope.CONTROLLER,
                Identifier.fromNamespaceAndPath("my_mod", "title"),
                Component.literal("My Machine"));
    }
};
```

:::warning 注意事项

- `apply(...)` 运行在服务端线程内；可访问服务端能力。
- 一个机器 ID 可以注册多个 handler，按注册顺序依次执行。

---
:::
### `ControllerScreenTextRegistry`

完整类名：`cn.howxu.mmcr.api.publicapi.controller.ControllerScreenTextRegistry`

服务端屏幕文本 handler 注册表。

#### 类签名

```java
public final class ControllerScreenTextRegistry {
    public static synchronized Registration register(Identifier machineId, ControllerScreenTextHandler handler);
    public static void apply(ControllerRuntimeContext context);

    public interface Registration {
        void unregister();
    }
}
```

#### `register(machineId, handler) → Registration`

将 handler 注册到指定机器 ID。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `machineId` | `Identifier` | 目标机器 ID。 |
| `handler` | `ControllerScreenTextHandler` | 屏幕文本更新回调。 |

抛出：

- `IllegalStateException`：当前线程既不是服务端线程，也不在启动注册窗口内。
- `NullPointerException`：`machineId` / `handler` 为 `null`。

返回：`Registration` 句柄，调用 `unregister()` 即可移除该 handler。

#### `apply(context)`

MMCR 内部在每个控制器 tick 触发，按注册顺序调用目标机器 ID 的全部 handler。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `context` | `ControllerRuntimeContext` | 当前控制器的运行时上下文。 |

抛出：

- `NullPointerException`：`context` 为 `null`。

抛出异常会被捕获并记录日志，handler 链不会因单个失败而中断。

#### `Registration.unregister()`

注销该 handler。重复调用无副作用；调用后 handler 不再触发。

抛出：

- `IllegalStateException`：当前线程不是服务端线程，且不在启动注册窗口内。

#### 线程约束

- 注册 / 注销必须在服务端线程或启动注册窗口内完成。
- 在游戏中调用 `register()` 会因线程检查而抛 `IllegalStateException`。

#### 示例

```java
Registration reg = ControllerScreenTextRegistry.register(
        Identifier.fromNamespaceAndPath("my_mod", "my_machine"),
        ctx -> ctx.screenText().append(
                ControllerScreenTextScope.CONTROLLER,
                Identifier.fromNamespaceAndPath("my_mod", "line"),
                Component.literal("On")));
// ... 卸载时：
reg.unregister();
```

:::warning 注意事项

- 注册表是进程内单例；服务关闭 / 重载时由 MMCR 自动清空。
- `clearForTesting()` 是测试专用的清空方法，**生产代码不要调用**。

---
:::
### `ControllerScreenTextScope`

完整类名：`cn.howxu.mmcr.api.publicapi.controller.ControllerScreenTextScope`

屏幕文本行生命周期作用域枚举。

#### 枚举值

| 常量 | 含义 |
| --- | --- |
| `CONTROLLER` | 控制器范围——只要控制器存在就一直保留。 |
| `OPERATION` | 单次操作范围——随当前配方操作状态自动失效（开始 / 结束 / 失败时由 MMCR 清空）。 |

#### 示例

```java
ctx.screenText().append(
        ControllerScreenTextScope.OPERATION,
        Identifier.fromNamespaceAndPath("my_mod", "progress"),
        Component.literal("50%"));
```

:::warning 注意事项

- `OPERATION` scope 在配方未运行时不显示任何内容；适合"当前配方状态"等临时信息。
- `CONTROLLER` scope 适合"机器标题"、"升级等级"等长驻显示的内容。

---
:::
### `ControllerRuntimeContext`

完整类名：`cn.howxu.mmcr.api.publicapi.controller.ControllerRuntimeContext`

`ControllerScreenTextHandler.apply(...)` 的不可变运行时上下文。

#### 记录签名

```java
public record ControllerRuntimeContext(Identifier machineId, BlockPos controllerPos,
                                       ControllerScreenText screenText);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `machineId` | `Identifier` | 当前控制器的机器 ID。`null` 抛 `NullPointerException`。 |
| `controllerPos` | `BlockPos` | 控制器方块位置（不可变）。`null` 抛 `NullPointerException`。 |
| `screenText` | `ControllerScreenText` | 屏幕文本句柄。`null` 抛 `NullPointerException`。 |

构造约束：

- `controllerPos` 在构造时调用 `immutable()` 冻结。

#### 示例

```java
ControllerScreenTextHandler handler = ctx -> {
    Identifier lineId = Identifier.fromNamespaceAndPath("my_mod", "title");
    ctx.screenText().append(ControllerScreenTextScope.CONTROLLER, lineId,
            Component.literal("Machine @ " + ctx.controllerPos()));
};
```

:::warning 注意事项

- 与 `MachineBehaviorContext` 不同，本上下文只携带机器 ID、位置与屏幕文本句柄——handler 不应假设可以读取 IO / 等级 / 数据存储。
- `screenText` 在每次 `apply(...)` 调用之间是同一个实例，handler 写入的内容会一直保留直到下次 tick。

---
:::
### `JadeText`

完整类名：`cn.howxu.mmcr.api.publicapi.controller.JadeText`

可选的 JADE（Just Another Debug Enhancer）渲染文本句柄。`MachineBehaviorContext.jadeText()` 返回该句柄；当机器没有启用 JADE 时返回 `JadeText.noop()`。

#### 接口签名

```java
public interface JadeText {
    void append(Identifier lineId, Component text);
    default void appendAfter(Identifier lineId, Identifier afterLineId, Component text);
    default void replace(Identifier lineId, Component text);
    void remove(Identifier lineId);
    void clear();

    static JadeText noop();
    enum Noop implements JadeText { INSTANCE, ... }
}
```

#### `append(lineId, text)`

向 JADE 工具提示追加一行。`lineId` 用于幂等。

#### `appendAfter(lineId, afterLineId, text)`

将 `text` 插入到 `afterLineId` 之后。默认实现退化为 `append(...)`。

#### `replace(lineId, text)`

替换一行。默认实现退化为 `append(...)`。

#### `remove(lineId)` / `clear()`

移除单行或清空全部行。

#### `noop() → JadeText`

返回不执行任何操作的占位实现。用于机器未启用 JADE 的场景。

#### `Noop` 枚举常量

`Noop.INSTANCE` 是单例。所有方法都是空实现。

#### 示例

```java
ctx.jadeText().append(
        Identifier.fromNamespaceAndPath("my_mod", "temperature"),
        Component.literal("Temp: " + temperature + "°C"));
```

:::warning 注意事项

- `JadeText` 的 `lineId` 命名空间化习惯与 `ControllerScreenText` 相同，但两者是独立的文本层——`ControllerScreenText` 用于控制器屏幕，`JadeText` 用于 JADE 的悬浮提示。
- 当玩家未安装 JADE 时，`MachineBehaviorContext.jadeText()` 始终返回 `noop()`；因此调用方无需判空即可安全调用。

---
:::
## 17 数据子包

本节覆盖 `cn.howxu.mmcr.api.publicapi.data` 子包——机器数据存储的公共视图、值包装、跨机器数据查询扩展点以及事务封装的对外入口。运行期类型位于公共 jar 内，但**不在** `package-info.java` 列出的"启动期 ABI allow-list"中，调用方应在小版本升级时回归验证。

### `DataValueType`

完整类名：`cn.howxu.mmcr.api.publicapi.data.DataValueType`

`DataValue` 支持的类型标签枚举。决定 `DataStorage` 中键对应值的存储与反序列化格式。

#### 枚举值

| 常量 | 对应 Java 类型 | 含义 |
| --- | --- | --- |
| `BOOLEAN` | `Boolean` | 布尔值。 |
| `STRING` | `String` | UTF-8 字符串。 |
| `BYTE` | `Byte` | 8 位有符号整数。 |
| `SHORT` | `Short` | 16 位有符号整数。 |
| `INT` | `Integer` | 32 位有符号整数。 |
| `LONG` | `Long` | 64 位有符号整数。 |
| `FLOAT` | `Float` | 32 位浮点（必须有限）。 |
| `DOUBLE` | `Double` | 64 位浮点（必须有限）。 |
| `BIG_INTEGER` | `BigInteger` | 任意精度整数。 |
| `BIG_DECIMAL` | `BigDecimal` | 任意精度小数。 |
| `LIST` | `List<DataValue>` | 有序复合值，元素为 `DataValue`。 |
| `MAP` | `Map<String, DataValue>` | 键值复合值，键为非空字符串，值为 `DataValue`。 |

:::warning 注意事项

- 公共枚举与底层 NBT 序列化一一对应；Mod 只需通过工厂方法构造 `DataValue`，序列化由 MMCR 内部完成。
- 浮点 `FLOAT` / `DOUBLE` 工厂在传入 `NaN` / `Infinity` 时会抛 `IllegalArgumentException("value must be finite")`。

---
:::
### `DataValue`

完整类名：`cn.howxu.mmcr.api.publicapi.data.DataValue`

不可变、带类型标签的值包装。所有 `DataStorage` 键对应的值都是 `DataValue`；`RequestBody` 也只接受 `DataValue` 作为载荷。**没有公开构造器**——只能通过工厂方法创建。

#### 类签名

```java
public final class DataValue {
    public static DataValue of(boolean value);
    public static DataValue of(String value);
    public static DataValue of(byte value);
    public static DataValue of(short value);
    public static DataValue of(int value);
    public static DataValue of(long value);
    public static DataValue of(float value);
    public static DataValue of(double value);
    public static DataValue of(BigInteger value);
    public static DataValue of(BigDecimal value);

    public static DataValue list(List<DataValue> values);
    public static DataValue map(Map<String, DataValue> values);

    public Object value();
    public DataValueType type();

    public Optional<Boolean> asBoolean();
    public Optional<String> asString();
    public Optional<Byte> asByte();
    public Optional<Short> asShort();
    public Optional<Integer> asInt();
    public Optional<Long> asLong();
    public Optional<Float> asFloat();
    public Optional<Double> asDouble();
    public Optional<BigInteger> asBigInteger();
    public Optional<BigDecimal> asBigDecimal();
    public Optional<List<DataValue>> asList();
    public Optional<Map<String, DataValue>> asMap();

    public boolean booleanValue();
    public String stringValue();
    public byte byteValue();
    public short shortValue();
    public int intValue();
    public long longValue();
    public float floatValue();
    public double doubleValue();
    public BigInteger bigIntegerValue();
    public BigDecimal bigDecimalValue();
}
```

##### 工厂方法

| 方法 | 含义 |
| --- | --- |
| `DataValue.of(boolean)` | 布尔。 |
| `DataValue.of(String)` | 字符串。`null` → `NullPointerException("value")`。 |
| `DataValue.of(byte)` / `short` / `int` / `long` | 整数。 |
| `DataValue.of(float)` / `double` | 浮点。`NaN` / `Infinity` → `IllegalArgumentException("value must be finite")`。 |
| `DataValue.of(BigInteger)` / `BigDecimal` | 任意精度数。`null` → `NullPointerException("value")`。 |
| `DataValue.list(List<DataValue>)` | 有序列表。元素或入参为 `null` → `NullPointerException("values")`。 |
| `DataValue.map(Map<String, DataValue>)` | 键值映射。键为空 / `null` → `IllegalArgumentException("map key must not be blank")`；值或入参为 `null` → `NullPointerException("map value")`。 |

##### `value() → Object`

返回原始 Java 对象（`Boolean` / `String` / 数值包装类 / `List<DataValue>` / `Map<String, DataValue>`）。调用方应先用 `type()` 判类型再取值。

##### `type() → DataValueType`

当前值的类型标签——通过运行时类型分派，不存额外字段。

##### 安全转换 `asXxx() → Optional<...>`

类型不匹配返回 `Optional.empty()`。

| 方法 | 返回 | 适用类型 |
| --- | --- | --- |
| `asBoolean()` | `Optional<Boolean>` | `BOOLEAN` |
| `asString()` | `Optional<String>` | `STRING` |
| `asByte()` / `asShort()` / `asInt()` / `asLong()` | 对应包装类 `Optional` | `BYTE` / `SHORT` / `INT` / `LONG` |
| `asFloat()` / `asDouble()` | `Optional<Float>` / `Optional<Double>` | `FLOAT` / `DOUBLE` |
| `asBigInteger()` / `asBigDecimal()` | 对应 `Optional` | `BIG_INTEGER` / `BIG_DECIMAL` |
| `asList()` | `Optional<List<DataValue>>` | `LIST` |
| `asMap()` | `Optional<Map<String, DataValue>>` | `MAP` |

##### 强类型取值 `xxxValue() → ...`

与 `asXxx()` 同名但不带 `Optional`、类型不匹配时抛 `IllegalStateException("Expected <类型名>")`。

##### 示例

```java
DataValue v = DataValue.of(42L);
long n = v.longValue();                         // 42
DataValueType tag = v.type();                   // DataValueType.LONG
double miss = v.asDouble().orElse(0.0);         // 0.0（类型不对）

DataValue list = DataValue.list(List.of(
        DataValue.of("hello"),
        DataValue.of(true)));
```

:::warning 注意事项

- `DataValue` 是不可变且实现值相等：相同类型 + 相同值的两实例 `equals` 返回 `true`；`DataStorage` 内部据此跳过同值写入。
- `LIST` / `MAP` 工厂返回的容器都是不可修改的；尝试修改会抛 `UnsupportedOperationException`。

---
:::
### `DataStorage`

完整类名：`cn.howxu.mmcr.api.publicapi.data.DataStorage`

机器数据存储的**公共视图**——MMCR 在底层持有的存储块（`cn.howxu.mmcr.api.data.DataStorage`）只能通过静态工厂 `DataStorage.view(Object)` 转换为公共视图暴露给外部 Mod。`MachineBehaviorContext.dataStorage()` 在机器持有数据存储方块时返回公共视图，否则返回 `null`。

#### 类签名

```java
public final class DataStorage {
    public static DataStorage view(Object storage);

    public Optional<DataValue> get(String key);
    public boolean contains(String key);
    public Map<String, DataValue> values();

    public void set(String key, DataValue value);
    public boolean set(String key, DataValue value, DataStorage.Transaction transaction);
    public Optional<DataValue> remove(String key);

    public Object bridgeValue();

    public static final class Transaction {
        public static Transaction view(Object context);
    }
}
```

##### `view(storage) → DataStorage`

将 MMCR 内部存储块转换为公共视图。

- `storage`：MMCR 内部的 `cn.howxu.mmcr.api.data.DataStorage` 实例（来自 `MachineBehaviorContext.dataStorage()` 返回的对象）。`null` 或类型不匹配 → `IllegalArgumentException("storage must be a machine data storage")`。
- 返回：包装后的公共视图。**不要**自行缓存——同一内部存储块通过 `view(...)` 反复调用会得到不同视图对象，但都引用同一份底层数据。

##### `get(key) → Optional<DataValue>`

- `key`：`String` — 键名。
- 返回：键对应的 `DataValue`（从内部存储自动转换为公共值包装）；不存在时返回 `Optional.empty()`。

##### `contains(key) → boolean`

判断键是否存在。

##### `values() → Map<String, DataValue>`

返回当前全部键值的**不可变**快照（按插入顺序，`LinkedHashMap`）。每次调用都会重新生成快照；调用方在 `set(...)` / `remove(...)` 后需要重新取值。

##### `set(key, value)`

非事务写入。值与现存值相等时跳过变更通知；其他情况覆写键、失效缓存、触发监听器。

##### `set(key, value, transaction) → boolean`

事务感知写入。事务回滚时写入自动撤销；根提交时按需触发监听器。

- `transaction`：`DataStorage.Transaction`（公共事务包装），`null` → `NullPointerException("transaction")`。
- 返回：`true` 表示值真正发生变化；`false` 表示新值与现存值相等，未发生写入。

##### `remove(key) → Optional<DataValue>`

删除键。键不存在时返回 `Optional.empty()` 且不触发监听器。

##### `bridgeValue() → Object`

返回底层 MMCR 内部存储块实例。仅供 MMCR 内部适配器使用；外部 Mod 不应调用。

##### `Transaction`

公共事务包装——把 NeoForge 的 `TransactionContext` 转换成可被外部代码持有的类型。

```java
public static final class Transaction {
    public static Transaction view(Object context);
}
```

`view(context)`：将 NeoForge `TransactionContext` 包装为 `Transaction`。`context` 为 `null` 或类型不匹配 → `IllegalArgumentException("context must be a transaction")`。

##### 示例

```java
DataStorage storage = DataStorage.view(ctx.dataStorageBridge());
if (storage == null) return;

// 非事务写入
storage.set("power", DataValue.of(20.0));

// 事务写入（MachineIoPlan.commit 回调里）
plan.commit(transaction -> {
    DataStorage.Transaction publicTransaction = DataStorage.Transaction.view(transaction);
    storage.set("energy", DataValue.of(next), publicTransaction);
    if (energyShort) transaction.getSnapshotLedger().abort();
});

// 链式取值
double power = storage.get("power").flatMap(DataValue::asDouble).orElse(0.0);
```

:::warning 注意事项

- `DataStorage` 是公共视图而不是原始存储——`view(...)` 接受 MMCR 内部的 `cn.howxu.mmcr.api.data.DataStorage` 实例（来自 `ctx.dataStorage()` 返回的对象），并包装成可被外部 Mod 操作的公共类型。
- 外部 Mod **不能** 直接 `new DataStorage(...)`——构造器私有。
- 非事务版本（`set(...)` 不带 `transaction`）与事务版本（带 `transaction`）行为不同：`MachineIoPlan` 失败回滚时只有事务版本的写入会被撤销，非事务版本一旦调用立即生效。
- `get(...)` 返回 `Optional`，**不要**用 `null` 判定键是否存在；用 `contains(...)`。

---
:::
### `DataReservation`

完整类名：`cn.howxu.mmcr.api.publicapi.data.DataReservation`

未来惰性数据存储库的事务性预留边界接口。外部 Mod 一般不需要直接实现。

#### 接口签名

```java
public interface DataReservation {
    boolean commit(DataStorage.Transaction transaction);
    void cancel();
}
```

##### `commit(transaction) → boolean`

在事务上下文中确认预留。返回 `true` 表示预留成功落实；返回 `false` 表示已取消。

- `transaction`：`DataStorage.Transaction`，`null` → `NullPointerException`。

##### `cancel()`

主动释放预留；通常在请求方决定不再消费时被调用。

:::warning 注意事项

- 当前 MMCR 不会主动暴露数据存储库实现，`DataRepository` 接口（见下）只为未来扩展而保留——除非自行实现 `DataRepository`，否则无需直接构造 `DataReservation`。

---
:::
### `DataRepositoryContext`

完整类名：`cn.howxu.mmcr.api.publicapi.data.DataRepositoryContext`

请求未来数据存储库时的不可变输入上下文。

#### 记录签名

```java
public record DataRepositoryContext(Identifier machineId, BlockPos controllerPos,
                                    String key, DataValueType requestedType);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `machineId` | `Identifier` | 目标机器 ID。`null` → `IllegalArgumentException("machineId must not be null")`。 |
| `controllerPos` | `BlockPos` | 目标控制器方块位置。构造时调用 `immutable()` 冻结；`null` → `IllegalArgumentException("controllerPos must not be null")`。 |
| `key` | `String` | 待读写的数据键。`null` 或空白 → `IllegalArgumentException("key must not be blank")`。 |
| `requestedType` | `DataValueType` | 期望的 `DataValue` 类型。`null` → `IllegalArgumentException("requestedType must not be null")`。 |

:::warning 注意事项

- 该类型为未来扩展点保留；当前 MMCR 数据存储块仍按"每控制器独立持有 `DataStorage`"模式运作。

---
:::
### `DataRepositoryRequest`

完整类名：`cn.howxu.mmcr.api.publicapi.data.DataRepositoryRequest`

`DataRepository.request(...)` 的不可变结果，可附带一个 `DataReservation` 表示惰性可获取的结果。

#### 记录签名

```java
public record DataRepositoryRequest(Identifier repositoryId, BlockPos controllerPos, String key,
                                    DataValueType requestedType, DataValue requestedValue,
                                    Optional<DataReservation> reservation) {
    public DataRepositoryRequest(Identifier repositoryId, BlockPos controllerPos, String key,
                                 DataValueType requestedType, DataValue requestedValue);

    public static DataRepositoryRequest available(Identifier repositoryId, BlockPos controllerPos, String key,
                                                  DataValueType requestedType, DataValue requestedValue,
                                                  DataReservation reservation);
    public static DataRepositoryRequest unavailable(Identifier repositoryId, BlockPos controllerPos, String key,
                                                    DataValueType requestedType, DataValue requestedValue);
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `repositoryId` | `Identifier` | 数据存储库 ID。`null` → `IllegalArgumentException("repositoryId must not be null")`。 |
| `controllerPos` | `BlockPos` | 控制器方块位置。构造时调用 `immutable()` 冻结；`null` → `IllegalArgumentException("controllerPos must not be null")`。 |
| `key` | `String` | 数据键。`null` 或空白 → `IllegalArgumentException("key must not be blank")`。 |
| `requestedType` | `DataValueType` | 期望类型。`null` → `IllegalArgumentException("requestedType must not be null")`。 |
| `requestedValue` | `DataValue` | 期望值。`null` → `IllegalArgumentException("requestedValue must not be null")`；`requestedValue.type()` 必须等于 `requestedType`，否则 `IllegalArgumentException("requestedValue type must match requestedType")`。 |
| `reservation` | `Optional<DataReservation>` | 可选的预留结果；空表示当前无可用数据。`null` → `IllegalArgumentException("reservation must not be null")`。 |

##### 便捷构造（无预留）

`new DataRepositoryRequest(repositoryId, controllerPos, key, requestedType, requestedValue)` 等价于 `...unavailable(...)`——`reservation` 字段为空。

##### `available(...) → DataRepositoryRequest`

工厂：构造一个带 `DataReservation` 的请求。`reservation` 为 `null` → `NullPointerException("reservation")`。

##### `unavailable(...) → DataRepositoryRequest`

工厂：构造一个无可用预留的请求。

:::warning 注意事项

- 该类型为未来扩展点保留；当前 MMCR 数据存储块不调用 `DataRepository.request(...)`。

---
:::
### `DataRepository`

完整类名：`cn.howxu.mmcr.api.publicapi.data.DataRepository`

未来惰性数据存储库的开放扩展点。当前 MMCR 不提供内置仓库；实现类需自行注册（注册路径见未来扩展）。

#### 接口签名

```java
public interface DataRepository {
    Identifier id();

    DataRepositoryRequest request(DataRepositoryContext context);
}
```

##### `id() → Identifier`

数据存储库的唯一 ID。

##### `request(context) → DataRepositoryRequest`

对给定上下文尝试获取数据。`context` 不为 `null`。

- 返回：`DataRepositoryRequest`。返回值的 `reservation` 字段为空表示当前无可用结果；非空表示调用方可以保留并在事务中提交。

:::warning 注意事项

- 当前 MMCR 数据存储块仍按"每控制器独立持有 `DataStorage`"运作；`DataRepository` 仅作为未来跨机器数据查询的扩展点。
- 实现类不应主动假定自己的 `request(...)` 何时被调用——MMCR 仅在启用跨机器数据查询时调用。

---
:::
## 18 网络子包

本节覆盖 `cn.howxu.mmcr.api.publicapi.network` 子包——机器网络通信的公共视图、不可变消息体、回调接口与静态门面。运行期网络类型位于公共 jar 内，但**不在** `package-info.java` 列出的"启动期 ABI allow-list"中，调用方应在小版本升级时回归验证。

### `MachineReference`

完整类名：`cn.howxu.mmcr.api.publicapi.network.MachineReference`

已成型机器控制器的稳定身份标识。`record`，值类型。

#### 记录签名

```java
public record MachineReference(Identifier type, long hash) {
    public Object bridgeValue();
    public static MachineReference fromInternal(cn.howxu.mmcr.api.network.MachineReference reference);
}
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `type` | `Identifier` | 机器 ID（如 `Identifier.fromNamespaceAndPath("my_mod", "producer")`）。`null` → `NullPointerException("type")`。 |
| `hash` | `long` | 实例稳定哈希——成型后生成，跨重启保持。 |

##### `bridgeValue() → Object`

返回底层 MMCR 内部 `cn.howxu.mmcr.api.network.MachineReference` 实例。仅供 MMCR 内部适配器使用；外部 Mod 不应调用。

##### `fromInternal(reference) → MachineReference`

把 MMCR 内部 `MachineReference` 转换为公共 `MachineReference`。外部 Mod 一般不直接调用——`RequestInfo.peer()` / `NetworkInterfaceReference.connections()` 已返回公共类型。

#### 示例

```java
MachineReference peer = request.peer();
Identifier peerType = peer.type();
long peerHash = peer.hash();
storage.set("power_" + peerHash, DataValue.of(reported));
```

:::warning 注意事项

- `hash` 由 MMCR 内部从结构快照计算；不同实例即使机器 ID 相同也会有不同 `hash`。
- 该类型在网络通信中用作对端标识，是 `RequestInfo.peer()` 与 `NetworkInterfaceReference.connections()` 的公共字段类型。

---
:::
### `NetworkInterfaceReference`

完整类名：`cn.howxu.mmcr.api.publicapi.network.NetworkInterfaceReference`

服务端活跃网络接口方块的**公共视图句柄**。由 `NetworkApi.interfaces(...)` 创建并返回；不要自行构造（构造器为包级，外部不可见）。

#### 类签名

```java
public final class NetworkInterfaceReference {
    public BlockPos position();
    public List<MachineReference> connections();

    public Object bridgeValue();
}
```

##### `position() → BlockPos`

当前接口方块的世界坐标。

##### `connections() → List<MachineReference>`

该接口方块当前已建立的物理连接对应的机器引用列表（已转换为公共 `MachineReference`）。返回按服务端稳定顺序；空列表表示接口已放置但暂未连任何机器。

- 返回：接口连接表为空或接口方块实体不存在时返回空列表。

##### `bridgeValue() → Object`

返回底层 MMCR 内部 `cn.howxu.mmcr.api.network.NetworkInterfaceReference` 实例。仅供 MMCR 内部适配器使用；外部 Mod 不应调用。

##### 示例

```java
List<NetworkInterfaceReference> interfaces = NetworkApi.interfaces(context);
for (NetworkInterfaceReference iface : interfaces) {
    List<MachineReference> targets = iface.connections();
    if (targets.isEmpty()) continue;
    NetworkApi.sendRequest(iface, targets.get(0), REPORT_POWER,
            RequestBody.of(Map.of("power", DataValue.of(powerPublished))));
}
```

:::warning 注意事项

- 该类**不能**自行构造；只能通过 `NetworkApi.interfaces(...)` 获取。
- 返回值依赖于调用时接口方块所在的 chunk 是否已加载——未加载的接口会被 `NetworkApi.interfaces(...)` 过滤。
- 公共视图不再暴露 `sourceController()` / `source()` / `server()` / `sourceFailure(...)` 等内部状态访问器；如需源控制器位置或失败回调，请通过 `MachineBuilder.requestFailed(...)` 注册处理器，并在 `RequestProcess` 内通过 `RequestInfo.peer()` 获取对端引用。

---
:::
### `RequestBody`

完整类名：`cn.howxu.mmcr.api.publicapi.network.RequestBody`

不可变的网络请求体。本质是带校验的 `Map<String, DataValue>`。

#### 类签名

```java
public final class RequestBody {
    public static RequestBody of(Map<String, DataValue> values);

    public Map<String, DataValue> values();
    public Optional<DataValue> get(String key);

    public static RequestBody fromInternal(cn.howxu.mmcr.api.network.RequestBody body);
    public Object bridgeValue();
}
```

##### 静态构造 `of(values) → RequestBody`

构造不可变请求体。

- `values`：`Map<String, DataValue>`，`null` → `NullPointerException("values")`。
- 内部深拷贝：键不允许为 `null` / 空白字符串（`IllegalArgumentException("request body key must not be blank")`），值不允许为 `null`（`NullPointerException("request body value")`）。

##### `values() → Map<String, DataValue>`

返回当前请求体的不可变快照。

##### `get(key) → Optional<DataValue>`

读取键对应的值。键不存在时返回空。

##### `fromInternal(body) → RequestBody`

把 MMCR 内部 `cn.howxu.mmcr.api.network.RequestBody` 转换为公共 `RequestBody`。外部 Mod 一般不直接调用——`RequestProcess.process(...)` 收到的 `body` 已为公共类型。

##### `bridgeValue() → Object`

返回底层 MMCR 内部 `RequestBody` 实例。仅供 MMCR 内部适配器使用；外部 Mod 不应调用。

##### 示例

```java
RequestBody body = RequestBody.of(Map.of(
        "power", DataValue.of(powerPublished),
        "online", DataValue.of(true)));

double power = body.get("power").flatMap(DataValue::asDouble).orElse(0.0);
```

:::warning 注意事项

- 与 KubeJS 端不同——Java 端必须显式用 `DataValue.of(...)` 包好每个值；脚本端由 [`api.dataValue(...)`](#) 自动包装。
- 构造时键与值都需合法；构造完成后请求体不可修改。

---
:::
### `RequestInfo`

完整类名：`cn.howxu.mmcr.api.publicapi.network.RequestInfo`

`RequestProcess.process(...)` 回调收到的请求上下文——标识一次到达的请求与对端机器。

#### 记录签名

```java
public record RequestInfo(Identifier requestId, MachineReference peer);
```

#### 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `requestId` | `Identifier` | 请求 ID（命名空间 + 路径均非空）。`null` → `NullPointerException("requestId")`。 |
| `peer` | `MachineReference` | 发送方机器引用。`null` → `NullPointerException("peer")`。 |

#### 示例

```java
ctx.requestProcess(REPORT_POWER, (body, request, senderStorage, receiverStorage) -> {
    Identifier reqId = request.requestId();
    MachineReference peer = request.peer();
    String key = "power_" + peer.hash();
    double reported = body.get("power").flatMap(DataValue::asDouble).orElse(0.0);
    if (receiverStorage != null) receiverStorage.set(key, DataValue.of(reported));
});
```

:::warning 注意事项

- 该类型为不可变值对象——可以安全地在 `RequestProcess` 闭包内捕获。

---
:::
### `RequestProcess`

完整类名：`cn.howxu.mmcr.api.publicapi.network.RequestProcess`

`@FunctionalInterface`：处理一次到达的网络请求的回调。

#### 接口签名

```java
@FunctionalInterface
public interface RequestProcess {
    void process(RequestBody body, RequestInfo request,
                 DataStorage senderStorage,
                 DataStorage receiverStorage);
}
```

##### `process(body, request, senderStorage, receiverStorage)`

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `body` | `RequestBody` | 来自发送方的请求体。 |
| `request` | `RequestInfo` | 请求 ID 与发送方机器引用。 |
| `senderStorage` | `DataStorage` | 发送方机器的公共数据存储视图；发送方未启用数据存储或当前不在主线程时为 `null`（需在闭包内自行判空）。 |
| `receiverStorage` | `DataStorage` | 接收方（当前机器）的公共数据存储视图；当前机器未启用数据存储或当前不在主线程时为 `null`（需在闭包内自行判空）。 |

##### 示例

```java
ctx.requestProcess(REPORT_POWER,
        (body, request, senderStorage, receiverStorage) -> {
            if (receiverStorage == null) return;
            String key = "power_" + request.peer().hash();
            double reported = body.get("power")
                    .flatMap(DataValue::asDouble).orElse(0.0);
            receiverStorage.set(key, DataValue.of(reported));
        });
```

:::warning 注意事项

- 通过 `MachineBuilder.requestProcess(Identifier, RequestProcess)` 注册；同一请求 ID 注册多次时，以最后一次为准。
- 公共签名上的 `senderStorage` / `receiverStorage` 不再带 `@Nullable` 注解，但运行时仍可能为 `null`——处理器必须在闭包开头自行判空。
- 抛出的异常会被 MMCR 捕获并记日志；不要把控制流逻辑放在异常抛出上。

---
:::
### `RequestFailed`

完整类名：`cn.howxu.mmcr.api.publicapi.network.RequestFailed`

`@FunctionalInterface`：当网络请求无法送达时触发的回调。

#### 接口签名

```java
@FunctionalInterface
public interface RequestFailed {
    void fail(RequestBody body, RequestInfo request,
              @Nullable DataStorage senderStorage,
              RequestFailureReason reason);
}
```

##### `fail(body, request, senderStorage, reason)`

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `body` | `RequestBody` | 未能送达的请求体。 |
| `request` | `RequestInfo` | 原始请求的 ID 与对端机器引用。 |
| `senderStorage` | `DataStorage` 或 `null` | 发送方 `DataStorage`；发送方未启用数据存储时为 `null`。参数带 `@Nullable`，可直接判空。 |
| `reason` | `RequestFailureReason` | 失败原因枚举。 |

:::warning 注意事项

- 仅当 MMCR 内部判定请求**不能**送达时才会调用该回调；正常接收请使用 `RequestProcess`。
- 注册位置见 `MachineBuilder.requestFailed(...)`。

---
:::
### `RequestFailureReason`

完整类名：`cn.howxu.mmcr.api.publicapi.network.RequestFailureReason`

`RequestFailed.fail(...)` 的失败原因枚举。

#### 枚举值

| 常量 | 含义 |
| --- | --- |
| `SOURCE_INTERFACE_MISSING` | 发送方网络接口缺失。 |
| `TARGET_INTERFACE_MISSING` | 目标方网络接口缺失。 |
| `TARGET_CHUNK_UNLOADED` | 目标方所在 chunk 未加载。 |
| `CONNECTION_MISSING` | 物理连接缺失（接口方块之间未连）。 |
| `SOURCE_STRUCTURE_INVALID` | 发送方结构失效。 |
| `TARGET_STRUCTURE_INVALID` | 目标方结构失效。 |
| `HASH_MISMATCH` | 控制器实例哈希不匹配（成型中途结构变化）。 |
| `ALLOWLIST_REJECTED` | 网络白名单拒绝。 |
| `TARGET_HANDLER_MISSING` | 目标方未注册对应请求 ID 的处理器。 |
| `UNREACHABLE` | 通用不可达兜底原因。 |

:::warning 注意事项

- 多个常量可同时触发；MMCR 内部选择最先匹配的常量。回调方应只依据具体常量做对应处理，不要假设互斥。

---
:::
### `NetworkApi`

完整类名：`cn.howxu.mmcr.api.publicapi.network.NetworkApi`

机器网络通信的 Java 静态门面。提供"枚举当前机器的网络接口"与"把请求入队"两个入口。

#### 类签名

```java
public final class NetworkApi {
    private NetworkApi();

    public static List<NetworkInterfaceReference> interfaces(MachineBehaviorContext context);
    public static void sendRequest(NetworkInterfaceReference source, MachineReference target,
                                   Identifier requestId, RequestBody body);
}
```

##### `interfaces(context) → List<NetworkInterfaceReference>`

返回当前机器所有活跃网络接口的公共视图，按方块位置 `(x, y, z)` 升序排序。

- `context`：`MachineBehaviorContext`（来自 `MachineBehavior` 钩子），`null` → `NullPointerException("context")`。
- 返回：仅在 `ServerLevel` 上调用且控制器当前已成型时返回非空列表；其他情况返回空列表。
- 行为细节：
  - 接口方块所在 chunk 必须已加载，否则被过滤；
  - 通过 `executeBlocking(...)` 在主线程同步获取；
  - 返回值是**不可变**副本。

##### `sendRequest(source, target, requestId, body)`

将请求入队，等待送达目标机器后触发目标方的 `RequestProcess` 回调。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `source` | `NetworkInterfaceReference` | 发送方接口引用（公共视图）。`null` → `NullPointerException("source")`。 |
| `target` | `MachineReference` | 目标机器引用。`null` → `NullPointerException("target")`。 |
| `requestId` | `Identifier` | 请求 ID；命名空间 + 路径均非空，否则 `IllegalArgumentException("requestId must not be blank")`。`null` → `NullPointerException("requestId")`。 |
| `body` | `RequestBody` | 请求体。`null` → `NullPointerException("body")`。 |

行为细节：

- 通过 `source.bridgeValue()` 取出内部 `cn.howxu.mmcr.api.network.NetworkInterfaceReference`，由 MMCR 在主线程入队；
- 目标不在 `source` 的连接表中时抛 `IllegalArgumentException("Target is not connected to the source interface")`；
- 若目标方未注册对应 `requestId` 的 `RequestProcess`，请求在送达时按 `TARGET_HANDLER_MISSING` 失败，调用源机器通过 `MachineBuilder.requestFailed(...)` 注册的失败回调。

##### 示例

```java
public final class ProducerBehavior implements MachineBehavior {
    public static final Identifier REPORT_POWER =
            Identifier.fromNamespaceAndPath("my_mod", "report_power");

    @Override
    public void serverTick(MachineBehaviorContext context) {
        List<NetworkInterfaceReference> interfaces = NetworkApi.interfaces(context);
        for (NetworkInterfaceReference iface : interfaces) {
            for (MachineReference target : iface.connections()) {
                NetworkApi.sendRequest(iface, target, REPORT_POWER,
                        RequestBody.of(Map.of("power", DataValue.of(20.0))));
            }
        }
    }
}
```

:::warning 注意事项

- 该类是网络通信的**唯一** Java 入口——不要直接访问 MMCR 内部的 `NetworkServerState` / `PendingRequest`。
- `interfaces(...)` 仅在控制器已成型时返回非空；调用方应忽略空结果。
- `sendRequest(...)` 是异步入队；目标方实际处理发生在服务端下一 tick。

---
:::
## 19 修饰符与需求类型

本节覆盖 `cn.howxu.mmcr.api.publicapi.recipe.modifier.RecipeModifier`、`cn.howxu.mmcr.api.publicapi.recipe.requirement.MachineRequirement` 及其扩展点 `CustomRequirement`。

注意：公共 API 中的 `RecipeModifier` 仅作为命名空间持有 `IOType` / `Operation` 两个枚举——实际的修饰符值、修饰器逻辑、Codec 都不属于公共 API 表面，由 MMCR 内部实现。配方修饰项的构造与注入仍由 `MachineRecipeBuilder` / `MachineDefinition.modifierUse(...)` 等高层 API 处理（见 [12 修饰符系统](#12-修饰符系统)）。

### `RecipeModifier`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.modifier.RecipeModifier`

仅作为命名空间持有 `IOType` 与 `Operation` 两个枚举。无方法、无字段；不可实例化（私有构造器）。

#### 类签名

```java
public final class RecipeModifier {
    private RecipeModifier();

    public enum IOType { INPUT, OUTPUT }
    public enum Operation { ADD, MULTIPLY, SUBTRACT, DIVIDE }
}
```

---

#### `RecipeModifier.IOType`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.modifier.RecipeModifier.IOType`

配方 IO 方向枚举。

##### 枚举值

| 常量 | 含义 |
| --- | --- |
| `INPUT` | 输入方向——消耗方向。 |
| `OUTPUT` | 输出方向——产出方向。 |

:::warning 注意事项

- 在配方 IO 类型语义上与 `cn.howxu.mmcr.api.publicapi.recipe.RecipeIo.INPUT` / `RecipeIo.OUTPUT` 完全一致（见 [14 配方 IO 类型](#14-配方-io-类型)）。`FluidRequirement` / `ItemRequirement` / `EnergyRequirement` 等公共 `MachineRequirement` 子类型在 Java 端使用 `RecipeIo` 作为 IO 字段；`RecipeModifier.IOType` 主要在配方修饰表达式中引用。
- KubeJS 教程引用此类型时写作 `RecipeModifier.IOType`，对应此锚点。

---
:::
#### `RecipeModifier.Operation`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.modifier.RecipeModifier.Operation`

修饰运算类型枚举。

##### 枚举值

| 常量 | 含义 |
| --- | --- |
| `ADD` | 加法。 |
| `MULTIPLY` | 乘法。 |
| `SUBTRACT` | 减法。 |
| `DIVIDE` | 除法。 |

:::warning 注意事项

- 与之前版本的命名顺序一致；序列化协议保持向后兼容。

---
:::
### `MachineRequirement`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.requirement.MachineRequirement`

配方 IO 项的统一抽象接口——任何配方输入 / 输出（`ItemRequirement`、`FluidRequirement`、`EnergyRequirement`、`SmartInterfaceRequirement`、`CustomRequirement`、`RecipeRequirement.custom(...)` 等）都实现该接口。`MachineRecipeBuilder.addInput(...)` / `addOutput(...)` 与 `MachineBehaviorContext.requirements()` 都通过此类型。

#### 接口签名

```java
public interface MachineRequirement extends RecipeRequirement {
    RecipeIo io();
}
```

##### `io() → RecipeIo`

IO 方向（`RecipeIo.INPUT` / `RecipeIo.OUTPUT`）。

##### 父接口 `RecipeRequirement`

```java
public interface RecipeRequirement {
    static CustomRecipeIo custom(Identifier typeId, RecipeIo ioType, JsonElement payload);
}
```

- `custom(typeId, ioType, payload)`：通过已注册的 `RequirementType`（`typeId`）构造一条自定义 IO 项。`payload` 必须是 JSON 对象；构造时深拷贝传入 payload，`null` payload / 非对象 payload 分别抛 `IllegalArgumentException("Recipe IO payload must be an object")`。构造失败由 `RecipeApi.custom(...)` 抛出。
- `MachineRequirement` 仅扩展 `RecipeRequirement` 并强制暴露 `io()`——其余工具方法（`copyOf`、`copyList`、`fromInput`、`itemOutput`、`fluidOutput`、`CODEC` 等）位于 MMCR 内部实现，**不在公共 API 表面**。配方需求项的具体类型见 `cn.howxu.mmcr.api.publicapi.recipe.ItemRequirement` / `FluidRequirement` / `EnergyRequirement` / `SmartInterfaceRequirement` / `CustomRecipeIo`；修饰项注入见 `MachineDefinition.modifierUse(...)` 与 `MachineRecipeBuilder` 的对应字段。

##### 示例

```java
import cn.howxu.mmcr.api.publicapi.recipe.ItemRequirement;
import cn.howxu.mmcr.api.publicapi.recipe.RecipeIo;
import cn.howxu.mmcr.api.publicapi.recipe.component.DataComponentPredicateSet;

ItemRequirement in = ItemRequirement.input(new ItemInput(
        Ingredient.of(Items.IRON_INGOT), 1, DataComponentPredicateSet.EMPTY, 1F));

MachineRequirement out = ItemRequirement.output(new ItemOutput(new ItemStack(Items.IRON_BLOCK), 1F));
```

:::warning 注意事项

- 实现类至少要正确实现 `io()`；MMCR 内部按 `io()` 区分输入输出。
- 公共 API 不再暴露 `MachineRequirement.CODEC` / `copyOf` / `copyList` / `fromInput` 等运行期工具——这些能力在 MMCR 内部由专属注册表与处理器负责。

---
:::
### `CustomRequirement`

完整类名：`cn.howxu.mmcr.api.publicapi.recipe.requirement.CustomRequirement`

对 `MachineRequirement` 的扩展点——供 Mod 在 MMCR 内置需求集之外自定义需求项时实现。

#### 接口签名

```java
public interface CustomRequirement extends MachineRequirement {
    Identifier typeId();
    JsonElement payload();
}
```

##### `typeId() → Identifier`

当前需求项对应已注册的 `RequirementType` 标识。MMCR 内部按此字段路由处理器与 Codec。

##### `payload() → JsonElement`

自定义需求项的 Codec 载荷（JSON 对象）。返回深拷贝后的不可修改 payload。

##### 注册与使用

1. 实现 `CustomRequirement` 子接口（或直接实现该接口），并通过 `RecipeRequirement.custom(typeId, ioType, payload)` 构造（返回 `CustomRecipeIo`）。
2. 在 MMCR 内部注册对应的 `RequirementType` / `RequirementHandler`（注册路径与 `MachineRequirement` 的内部 `RequirementHandlerRegistry` 一致，但这些 API 不在公共 API 表面）。
3. 在配方定义中使用 `MachineRecipeBuilder.addInput(...)` / `addOutput(...)` 直接传入构造好的 `CustomRecipeIo`。

##### 示例（通过 `RecipeRequirement.custom(...)`）

```java
import cn.howxu.mmcr.api.publicapi.recipe.RecipeIo;
import cn.howxu.mmcr.api.publicapi.recipe.RecipeRequirement;
import com.google.gson.JsonObject;

CustomRecipeIo mana = RecipeRequirement.custom(
        Identifier.fromNamespaceAndPath("my_mod", "mana"),
        RecipeIo.INPUT,
        new JsonObject()); // 由 my_mod 的 RequirementHandler 解析
```

:::warning 注意事项

- `CustomRequirement` 自身**不能**直接 new——它是空标记接口；外部 Mod 一般通过 `RecipeRequirement.custom(...)` 工厂构造，实例类型为 `CustomRecipeIo`。
- `typeId` 必须在 MMCR 内部注册——未注册的 typeId 会在 `RecipeRequirement.custom(...)` 阶段抛异常；序列化 / 反序列化失败时配方加载会失败。

---
:::
