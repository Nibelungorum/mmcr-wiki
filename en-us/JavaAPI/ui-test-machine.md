---
title: UI Test Machine
order: 16
---

# UI Test Machine

This machine replaces the controller screen with Modern UI and demonstrates the flow of submitting an integer from the client, writing it to data storage on the server, and displaying the authoritative value through a UI snapshot. The machine still uses ordinary recipe behavior.

This page was checked against commit [`ef4c6e03`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/commit/ef4c6e03968275bf2edeeaaf7ea978c6d04b1297) on `neo/26.1.2`. The integration excerpts below omit widget creation, title formatting, button styling, and layout. See the source code for the complete implementation.

## API

| File | Responsibilities |
| --- | --- |
| [MODERN_UI.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/ef4c6e03968275bf2edeeaaf7ea978c6d04b1297/src/main/java/org/nibelungorum/builtin/MODERN_UI.java) | Machine definition, structure, request type, and server handler. |
| [ModernUiControllerUi.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/ef4c6e03968275bf2edeeaaf7ea978c6d04b1297/src/main/java/org/nibelungorum/client/ModernUiControllerUi.java) | Client screen factory, Modern UI Fragment, subscriptions, and request feedback. |
| [BuiltInProvider.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/ef4c6e03968275bf2edeeaaf7ea978c6d04b1297/src/main/java/org/nibelungorum/provider/BuiltInProvider.java) | Calls `MODERN_UI.registerDefinitions(event)` during the machine definition phase. |
| [ControllerUiFixture.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/ef4c6e03968275bf2edeeaaf7ea978c6d04b1297/src/apiUsage/java/example/addon/ControllerUiFixture.java) | A native Minecraft screen example for comparison that depends only on the public API jar and also demonstrates a custom state stream. |

| API | Purpose |
| --- | --- |
| `Machines` / `Structures` | [Machine](../API/JavaAPI#machinedraft) and [structure](../API/JavaAPI#structuredraft-and-structurespec) declarations. |
| `UiRequestType<Q, R>` / `UiResult<R>` | Typed requests and server results. |
| `RegisterControllerUiProtocolsEvent` | Registers protocols on the mod event bus on both sides. |
| `RegisterControllerUisEvent` / `ControllerUiFactory` | Registers a complete screen factory on the client. |
| `ControllerUiOpenContext` / `ControllerUiSession` | Preserves the original menu, reads snapshots, subscribes to updates, and sends requests. |
| `ControllerUiSnapshot` / `UiSubscription` | Reads published state and manages callback lifetimes. |
| `DataStore` / `DataKey` / `ControllerText` | Stores values and updates controller text on the server. |

For the complete signatures and constraints of the new interfaces, see [Full Controller UI in the Java API reference](../API/JavaAPI#controller-ui).
## 1. Machine Definition and Data Source

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

Here, `id` comes from `publicapi.ApiIds.id`, and the actual machine ID is **`mmcr:modern_ui`**. `mmcr_test` is the namespace used for this example's localization resources, not the machine ID. The Provider submits the definition; the structure and protocol are registered through their respective events.

`postServerTick` initializes `value` in the associated data storage and refreshes the controller text; it is not a client widget callback. This machine logic continues to run normally after the entire screen is replaced. Both the values and text read by the UI come from the server.

## 2. Structure and Data Storage Port

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

`I` allows an IO port or a data storage port, and `M` is a blast furnace. The source code does not require a minimum number of data storage ports, so **a formed structure does not guarantee that storage is available**. To test value interactions, install a data storage port at one of the `I` positions. Without storage, the server handler rejects writes and the UI keeps submission disabled.

Recipe execution still requires the IO ports and resources specified by the alloy furnace recipe. Writing values in this UI test does not depend on recipe completion.

## 3. Declare the Request Type and Register the Server Handler

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

`SetValue` is a data-only payload. The request and successful response share the same Codec, and the protocol version is 1. Reuse the shared descriptor and Codec as static constants rather than recreating them for each submission.

Protocol registrations are collected on both the client and server, but the actual handler runs only on the server thread. This handler accepts any `int`; on success, it writes the value to `DataStore` and returns the payload. A normal `storage.set(...)` call takes effect immediately and is not automatically rolled back if subsequent processing throws an exception.

This example does not register a `UiStateType` because `value` is already included in the base snapshot's `dataStorageValues()`. If you need additional typed state, refer to the comparison example's `UiStateProvider`, which publishes state by revision number.

## 4. Client Registration and Original Menu Binding

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

This listener loads only on the client and registers the factory only when Modern UI is loaded. If no factory is registered, MMCR uses the default controller screen. Modern UI is the UI framework chosen for this example; MMCR's public UI interfaces do not require add-on mods to use it.

The factory runs on Minecraft's client main thread, where you can hide the player inventory slots in the original menu. This operation preserves the original slot indices and does not change the server-side inventory. Do not call it on Modern UI's UI thread.

The screen preserves the original menu through Modern UI's `MenuScreen`, while `StorageFragment` provides the custom content:

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

The returned screen must satisfy the `MenuAccess` contract and bind to the same `context.menu()`. `MenuScreen` already satisfies this menu access contract; a native `Screen` implementation must implement `MenuAccess<AbstractContainerMenu>` itself. View destruction and menu closure are separate lifecycle events: release subscriptions when the view is destroyed, and end the session when the screen actually closes.

## 5. Subscribe to Snapshots and Switch Threads

`StorageFragment` stores `context.session()`. Its UI executor is:

```java
private static final Executor UI_THREAD = MuiModApi::postToUiThread;
```

Register subscriptions in `onViewCreated`. The core flow is:

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

`updateSnapshot` uses the following conditions to determine whether submission is allowed:

```java
ready = session.isOpen()
        && snapshot.ready()
        && snapshot.formed()
        && snapshot.hasDataStorage()
        && session.supports(MODERN_UI.SET_VALUE);
```

`ready()` means the first authoritative snapshot has arrived, `formed()` means the structure is formed, `hasDataStorage()` means associated storage is available, and `supports()` means the protocol is available. These four checks have distinct meanings.

The displayed data comes from the snapshot, rather than being inferred from the client input field or response body:

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

The UI holds only published display values; it does not read the server world or mutable storage across threads. Callbacks for both subscription types run on `UI_THREAD`. A native Minecraft screen uses the client main-thread executor instead.

## 6. Submission, Feedback, and View Destruction

This example first parses the input as an `int` and sends no request if the input is invalid. Repeat submissions are disabled while a request is in flight. With widget operations omitted, the flow is:

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

Here, `number` is the integer that has already been parsed. The request completes on the client main thread, and `whenCompleteAsync(..., UI_THREAD)` moves subsequent widget updates to the Modern UI thread. A successful acknowledgment (ACK) is used only for feedback. The snapshot subscription still updates the displayed value; do not overwrite it directly with `result.value()`.

`onDestroyView` must release the subscriptions:

```java
generation++;
if (snapshotSubscription != null) snapshotSubscription.close();
if (closeSubscription != null) closeSubscription.close();
snapshotSubscription = null;
closeSubscription = null;
// 保存输入草稿并释放旧控件引用，随后调用 super.onDestroyView()。
```

Closing the subscription handles cancels deliveries that have not yet run. The `generation` check also prevents asynchronous feedback from an old request from updating a rebuilt view. Destroying a Fragment's view alone should not close a menu session that is still valid.

## Data Flow Summary

1. The Provider registers `mmcr:modern_ui`, and the structure event submits the multiblock pattern.
2. The protocol event registers `SET_VALUE` on both sides, and the client UI event registers a screen factory for the machine.
3. When the controller is opened, the screen binds to the original menu and the Fragment subscribes to session snapshots.
4. The client submits a data-only request, and the server handler writes to the associated data storage.
5. MMCR synchronizes the stored values and controller text. The UI refreshes its display from snapshots; the response provides only request feedback.
6. Subscriptions are canceled when the view is destroyed, and `session.close()` ends the session when the screen closes.
