---
title: UI测试机器
order: 16
---

# UI 测试机器

这台机器用 Modern UI 替换控制器屏幕，演示从客户端提交一个整数、由服务端写入数据存储，再通过 UI 快照显示权威数值的流程。机器仍使用普通配方行为。

本文按 `neo/26.1.2` 提交 [`ef4c6e03`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/commit/ef4c6e03968275bf2edeeaaf7ea978c6d04b1297) 核对。以下代码为接入节选，省略控件创建、标题排版、按钮样式及布局；完整实现见源码。

## API

| 文件 | 职责 |
| --- | --- |
| [MODERN_UI.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/ef4c6e03968275bf2edeeaaf7ea978c6d04b1297/src/main/java/org/nibelungorum/builtin/MODERN_UI.java) | 机器定义、结构、请求类型与服务端处理器。 |
| [ModernUiControllerUi.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/ef4c6e03968275bf2edeeaaf7ea978c6d04b1297/src/main/java/org/nibelungorum/client/ModernUiControllerUi.java) | 客户端屏幕工厂、Modern UI Fragment、订阅及请求反馈。 |
| [BuiltInProvider.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/ef4c6e03968275bf2edeeaaf7ea978c6d04b1297/src/main/java/org/nibelungorum/provider/BuiltInProvider.java) | 在机器定义阶段调用 `MODERN_UI.registerDefinitions(event)`。 |
| [ControllerUiFixture.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/ef4c6e03968275bf2edeeaaf7ea978c6d04b1297/src/apiUsage/java/example/addon/ControllerUiFixture.java) | 仅依赖公共 API jar 的原生 Minecraft 屏幕对照，另外演示自定义状态流。 |

| API | 用途 |
| --- | --- |
| `Machines` / `Structures` | [机器](../API/JavaAPI#machinedraft)与[结构](../API/JavaAPI#structuredraft-与-structurespec)声明。 |
| `UiRequestType<Q, R>` / `UiResult<R>` | 类型化请求与服务端返回结果。 |
| `RegisterControllerUiProtocolsEvent` | 在两端的 Mod 事件总线上注册协议。 |
| `RegisterControllerUisEvent` / `ControllerUiFactory` | 在客户端注册完整屏幕工厂。 |
| `ControllerUiOpenContext` / `ControllerUiSession` | 保留原菜单，读取快照、订阅更新并发送请求。 |
| `ControllerUiSnapshot` / `UiSubscription` | 读取发布后的状态，管理回调生命周期。 |
| `DataStore` / `DataKey` / `ControllerText` | 服务端存储数值并更新控制器文本。 |

新接口的完整签名与约束见 [Java API的完整控制器 UI](../API/JavaAPI#controller-ui)。
## 1. 机器定义与数据来源

```java
public static final Identifier MACHINE_ID = id("modern_ui");
public static final Identifier VALUE_LINE = id("modern_ui_value");
public static final String VALUE_KEY = "value";

MachineSpec machine = Machines.machine(MACHINE_ID)
        .recipePool(id("alloy_furnace"))
        .displayNameKey("machine.mmcr_test.modern_ui")
        .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:bricks")))
        .recipeBehavior(behavior -> behavior.postServerTick(context -> {
            var storage = context.dataStorage();
            if (storage == null) {
                context.screenText().append(TextScope.CONTROLLER, VALUE_LINE,
                        Component.translatable("gui.mmcr_test.modern_ui.unavailable"));
                return;
            }
            if (!storage.contains(VALUE_KEY)) storage.set(VALUE_KEY, DataKey.of(0));
            int value = storage.get(VALUE_KEY).flatMap(DataKey::asInt).orElse(0);
            context.screenText().append(TextScope.CONTROLLER, VALUE_LINE,
                    Component.translatable("gui.mmcr_test.modern_ui.controller_value", value));
        }))
        .build();
event.registerMachine(machine);
```

这里的 `id` 来自 `publicapi.ApiIds.id`，机器实际 ID 是 **`mmcr:modern_ui`**；`mmcr_test` 是本例的翻译资源命名空间，不是机器 ID。定义由 Provider 提交，结构与协议仍通过各自事件注册。

`postServerTick` 负责在关联的数据存储中初始化 `value` 并刷新控制器文本，不是客户端控件回调。更换整张屏幕后，这段机器逻辑仍照常运行；UI 读取的数值与文本均来自服务端。

## 2. 结构与数据存储接口

```java
StructureSpec structure = Structures.structure()
        .fullStructure(s -> s.pattern(p -> p
                .layer("XXX", "XIX", "XXX")
                .layer("XMX", "I I", "XMX")
                .layer("XXX", "XCX", "XXX")
                .where('X', block(Blocks.BRICKS))
                .where('I', BlockConditions.any(
                        BlockConditions.ports(), BlockConditions.dataStorage()))
                .where('M', block(Blocks.BLAST_FURNACE))
                .controller('C')))
        .build(MACHINE_ID);
event.registerStructure(structure);
```

`I` 允许 IO 端口或数据存储接口，`M` 是高炉。源码没有为数据存储接口声明必装数量，因此**结构成型不保证存在存储**。要测试数值交互，应在一个 `I` 位安装数据存储接口；缺少存储时，服务端处理器拒绝写入，界面也不会启用提交。

配方执行仍需要合金炉配方要求的 IO 与资源，UI 测试的数值写入不依赖配方完成。

## 3. 声明请求类型并注册服务端处理器

```java
public record SetValue(int value) {
    public static final StreamCodec<RegistryFriendlyByteBuf, SetValue> CODEC =
            StreamCodec.composite(ByteBufCodecs.VAR_INT, SetValue::value, SetValue::new);
}

public static final UiRequestType<SetValue, SetValue> SET_VALUE = UiRequestType.of(
        id("modern_ui_set_value"), 1, SetValue.CODEC, SetValue.CODEC);

@SubscribeEvent
public static void registerProtocols(RegisterControllerUiProtocolsEvent event) {
    event.registrar().request(MACHINE_ID, SET_VALUE, (context, request) -> {
        var storage = context.machine().dataStorage();
        if (storage == null) {
            return UiResult.reject(Component.translatable("gui.mmcr_test.modern_ui.unavailable"));
        }
        storage.set(VALUE_KEY, DataKey.of(request.value()));
        return UiResult.success(request);
    });
}
```

`SetValue` 是纯数据载荷，请求和成功响应复用同一个 Codec，协议版本为 1。共享描述符与 Codec 应作为静态常量复用，不要在每次提交时重新创建。

协议事件在客户端与服务端都收集；真正的处理器只在服务端线程执行。这里接受任意 `int`，成功时写入 `DataStore` 并回传该载荷。普通 `storage.set(...)` 立即生效，不会因后续处理异常自动回滚。

本例没有注册 `UiStateType`：`value` 已经包含在基础快照的 `dataStorageValues()` 中。需要额外的类型化状态时，可参考对照示例的 `UiStateProvider`，按修订号发布状态。

## 4. 客户端注册与原菜单绑定

```java
@EventBusSubscriber(value = Dist.CLIENT)
public final class ModernUiControllerUi {
    @SubscribeEvent
    public static void register(RegisterControllerUisEvent event) {
        if (ModList.get().isLoaded("modernui")) {
            event.register(MODERN_UI.MACHINE_ID, ModernUiControllerUi::create);
        }
    }

    private static Screen create(ControllerUiOpenContext context) {
        context.session().slots().setPlayerInventoryVisible(false);
        return new StorageScreen(new StorageFragment(context), context);
    }
}
```

此监听器仅在客户端加载，并且只有加载 Modern UI 后才注册工厂。没有工厂时 MMCR 使用默认控制器屏幕。Modern UI 是该示例选择的 UI 框架，MMCR 公共 UI 接口本身没有要求附属 Mod 使用它。

工厂在 Minecraft 客户端主线程执行，可以在这里隐藏原菜单的玩家背包槽位。这个操作保留原槽位索引，也不改变服务端背包；不能放到 Modern UI 的 UI 线程调用。

屏幕通过 Modern UI 的 `MenuScreen` 保留原菜单，`StorageFragment` 负责自定义内容：

```java
private static final class StorageScreen extends MenuScreen<AbstractContainerMenu> {
    private final ControllerUiSession session;

    private StorageScreen(Fragment fragment, ControllerUiOpenContext context) {
        super(fragment, null, context.menu(), context.inventory(), context.title());
        session = context.session();
    }

    @Override
    public void onClose() {
        session.close();
    }
}
```

返回的屏幕必须满足 `MenuAccess` 契约，并绑定同一个 `context.menu()`。使用 `MenuScreen` 已满足该菜单访问契约；原生 `Screen` 实现则需自行实现 `MenuAccess<AbstractContainerMenu>`。界面销毁和菜单关闭是不同的生命周期：销毁视图时释放订阅，真正关闭屏幕时结束会话。

## 5. 订阅快照与线程切换

`StorageFragment` 保存 `context.session()`。其 UI executor 为：

```java
private static final Executor UI_THREAD = MuiModApi::postToUiThread;
```

在 `onViewCreated` 中注册订阅，核心流程为：

```java
ready = false;
pending = false;
long currentGeneration = ++generation;
snapshotSubscription = session.subscribe(UI_THREAD, snapshot -> {
    if (generation == currentGeneration) updateSnapshot(snapshot);
});
closeSubscription = session.onClosed(UI_THREAD, () -> {
    if (generation != currentGeneration) return;
    ready = false;
    // 更新界面为关闭状态。
});
```

`updateSnapshot` 依据以下条件判断能否提交：

```java
ready = session.isOpen()
        && snapshot.ready()
        && snapshot.formed()
        && snapshot.hasDataStorage()
        && session.supports(MODERN_UI.SET_VALUE);
```

`ready()` 表示首份权威快照已到达，`formed()` 表示结构成型，`hasDataStorage()` 表示存在关联存储，`supports()` 表示协议可用，四者含义不同。

显示的数据来自快照，不从客户端输入框或响应体推断：

```java
if (snapshot.hasDataStorage()) {
    int stored = Optional.ofNullable(snapshot.dataStorageValues().get(MODERN_UI.VALUE_KEY))
            .flatMap(DataKey::asInt).orElse(0);
    // 用 stored 更新数值显示。
}
String controllerLine = snapshot.lines().stream()
        .filter(line -> line.id().equals(MODERN_UI.VALUE_LINE))
        .map(line -> line.text().getString())
        .findFirst().orElse("");
// 用 controllerLine 更新控制器文本显示。
```

UI 只持有发布后的展示值，不跨线程读取服务器世界或可变存储。两类订阅的回调均由 `UI_THREAD` 执行；原生 Minecraft 界面则使用客户端主线程 executor。

## 6. 提交、反馈与视图销毁

本例先把输入解析为 `int`，无效输入不发送请求；请求在途时禁用重复提交。省略控件操作后的流程如下：

```java
if (!ready || pending) return;
pending = true;
long currentGeneration = generation;
session.request(MODERN_UI.SET_VALUE, new MODERN_UI.SetValue(number))
        .whenCompleteAsync((result, failure) -> {
            if (generation != currentGeneration) return;
            pending = false;
            if (failure != null) {
                // 显示调用失败。
            } else {
                // 根据 result.status() 和 result.message() 显示请求反馈。
            }
        }, UI_THREAD);
```

这里的 `number` 是已经解析完成的整数。请求结果在客户端主线程完成，`whenCompleteAsync(..., UI_THREAD)` 将后续控件更新转到 Modern UI 线程。成功 ACK 只用于反馈；实际显示的值仍由快照订阅更新，不用 `result.value()` 直接覆盖。

`onDestroyView` 必须释放订阅：

```java
generation++;
if (snapshotSubscription != null) snapshotSubscription.close();
if (closeSubscription != null) closeSubscription.close();
snapshotSubscription = null;
closeSubscription = null;
// 保存输入草稿并释放旧控件引用，随后调用 super.onDestroyView()。
```

订阅句柄取消尚未执行的交付；`generation` 另外阻止旧请求的异步反馈写入已经重建的视图。单纯销毁 Fragment 视图不应关闭仍有效的菜单会话。

## 数据流小结

1. Provider 注册 `mmcr:modern_ui`，结构事件提交多方块模式。
2. 协议事件在两端登记 `SET_VALUE`；客户端 UI 事件为该机器登记屏幕工厂。
3. 打开控制器后，屏幕绑定原菜单，Fragment 订阅会话快照。
4. 客户端提交纯数据请求，服务端处理器写入关联数据存储。
5. MMCR 同步存储值与控制器文本；界面从快照刷新显示，响应只提供请求反馈。
6. 视图销毁时取消订阅；屏幕关闭时通过 `session.close()` 结束会话。
