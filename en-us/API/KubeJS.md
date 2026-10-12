---
title: KubeJS API
---

# KubeJS API

This page is a consolidated reference for MMCR's KubeJS integration, targeting **Minecraft 26.1.2, Java 25, and KubeJS 26.1.2-8.0.6**, with commit [`f234477b`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/gradle.properties) as the source baseline. Examples use KubeJS/Rhino JavaScript syntax.

Port count requirements, tier requirements, and related factory shortcuts have been updated to match commit [`c2563c41`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/commit/c2563c4110cd15bad0218dc4fa5a4f091fbccc87), including Mekanism chemical, radioactive chemical, and heat ports.

MMCR's KubeJS API has three declaration windows: machine, tier, modifier, and screen text registration in startup scripts; structure and programmatic recipe registration during server script loading; and data-driven recipe registration in `ServerEvents.recipes`. Changes to startup declarations require a restart; server-side structures and recipes can be replaced during a resource reload. There are also client-side recipe information events and runtime smart interface update events.

The KubeJS bridge uses the underlying `cn.howxu.mmcr.api` types directly. The addon-facing `cn.howxu.mmcr.publicapi` is a separate interface layer; you cannot simply replace the signatures or `Java.loadClass` paths on this page with `publicapi`. This page retains the applicable registration, structure, tier, behavior, network, and text sections, and documents new entry points according to their actual implementations.

Types such as `String`, `List`, `Map`, and `Consumer<T>` on this page are Java signature type names. Rhino converts JavaScript strings, arrays, objects, and callbacks to the corresponding parameters. An overload marked `@HideFromJS` is reserved for Java interoperability or internal bridging and is not a script entry point.

Field tables sometimes describe builder state rather than public fields: event `api` fields, smart interface sub-builder fields, stage builder state fields, and the screen event's `context` are private and should be configured or read through the documented methods. `MachineBuilderJS`, `MachineStructureBuilderJS`, and tier builders do have the public transient fields listed in their tables, but methods are still preferred to keep related state consistent.

## 1. Top-Level Global Bindings

During KubeJS's binding phase, the MMCR plugin injects an `MMCRKubeJS` instance named `MMCR` and registers the `mmcr` event group. The plugin also retains the `MMCREvents` alias for this event group, so `MMCREvents.startup(...)` and `MMCREvents.server(...)` are recommended.

### `MMCR`

> `MMCR` is the KubeJS global binding name. Its actual type is `cn.howxu.mmcr.compat.kubejs.MMCRKubeJS`, which provides an API facade and a constants facade.

**Fields**

The global object does not expose fields directly; both facades are accessed through methods.

**Methods**

#### `getAPI() → KubeJSApi`

- **Parameters**: None.
- **Returns**: A `KubeJSApi` instance that can be reused in startup scripts, server scripts, and behavior callbacks.
- **Throws**: No additional argument exceptions are defined in the source.
- **Default**: The same `MMCRKubeJS` instance always returns the same API facade.
- **Example**:

```javascript
const api = MMCR.getAPI()
const stone = api.block("minecraft:stone")
```

#### `getValues() → MMCRValues`

- **Parameters**: None.
- **Returns**: An `MMCRValues` instance containing integer boundary constants.
- **Throws**: No additional argument exceptions are defined in the source.
- **Default**: The same global object always returns the same values facade.
- **Example**:

```javascript
const maxInt = MMCR.getValues().INT_MAX
const minInt = MMCR.getValues().INT_MIN
```

:::warning Notes

- `MMCR.getAPI()` and the event object's `event.getAPI()` return the same type; there is no need to recreate it for each script.
- Startup scripts can generally use the global `MMCR.getAPI()` directly. In structure scripts, using `event.getAPI()` makes it clear that the code is inside an `mmcr.server` callback.
- `MMCR` is not itself a machine registrar. Machines must still be created through `MMCREvents.startup` and registered with `register()`.
:::
#### `MMCRKubeJS` Implementation Class

The fully qualified name of `MMCRKubeJS` is `cn.howxu.mmcr.compat.kubejs.MMCRKubeJS`. It has only two public methods, `getAPI()` and `getValues()`. Its two facade fields are private and should not be accessed directly by name.

### `MMCRValues`

> `cn.howxu.mmcr.compat.kubejs.MMCRValues` provides Java `int` / `long` boundary values commonly used in scripts.

**Fields**

| Name | Type | Value and Description |
|------|------|------|
| `INT_MAX` | `int` | `2147483647`, `Integer.MAX_VALUE`. |
| `INT_MIN` | `int` | `-2147483648`, `Integer.MIN_VALUE`. |
| `LONG_MAX` | `long` | `9223372036854775807`, `Long.MAX_VALUE`. |
| `LONG_MIN` | `long` | `-9223372036854775808`, `Long.MIN_VALUE`. |

**Methods**

This class declares no public methods.

**Example**

```javascript
const upper = MMCR.getValues().INT_MAX
const lower = MMCR.getValues().INT_MIN
const longUpper = MMCR.getValues().LONG_MAX
const longLower = MMCR.getValues().LONG_MIN
```

:::warning Notes

- `INT_MAX` / `INT_MIN` are Java `int` boundaries; `LONG_MAX` / `LONG_MIN` are Java `long` boundaries.
- Use Java `BigInteger` for arbitrary-precision integer arithmetic. Check parameter types and ranges before passing large numbers to the API.
:::
### `MMCREvents`

> `cn.howxu.mmcr.compat.kubejs.MMCREvents` is MMCR's script event group, containing startup, server, and client events.

**Fields**

| Name | Type | Description |
|------|------|------|
| `STARTUP_ID` | `String` | `"mmcr.startup"`. |
| `SERVER_ID` | `String` | `"mmcr.server"`. |
| `CLIENT_ID` | `String` | `"mmcr.client"`. |
| `GROUP` | `EventGroup` | The KubeJS event group named `mmcr`. |

**Listener Syntax**

```javascript
MMCREvents.startup(event => {
    event.createMachine("example:machine").register()
})

MMCREvents.server(event => {
    event.createStructure("example:machine").pattern("C").set("C", "minecraft:iron_block").controller("C").build()
})

MMCREvents.client(event => {
    event.addRecipePoolInfo("example:press", "jei.example.press.info")
})
```

The `mmcr` event group is exposed globally in KubeJS through `EventGroupWrapper`. The keys `startup`, `server`, and `client` correspond to three `EventHandler` instances; a `KubeEvent` subclass is automatically passed as the `event` argument.

#### `group() → EventGroup`

- **Parameters**: None.
- **Returns**: Initializes and returns the `mmcr` event group.
- **Throws**: There are no script parameters in the source; KubeJS throws a runtime exception if event group initialization fails.
- **Default**: Returns the static event group object.
- **Example**:

```javascript
const group = MMCREvents.group()
```

#### `postStartup() → void`

- **Parameters**: None.
- **Returns**: Nothing.
- **Throws**: Scripts should not call this manually; calling it at the wrong lifecycle stage may leave the registration window in an invalid state.
- **Default**: Called by `Plugin.afterScriptsLoaded` after startup scripts finish.
- **Example**:

```javascript
MMCREvents.startup(event => {
    event.createMachine("example:machine").register()
})
```

#### `postServer() → void`

- **Parameters**: None.
- **Returns**: Nothing.
- **Throws**: Scripts should not call this manually; when no transaction is active, it cannot replace the normal server script loading process.
- **Default**: Called by `Plugin.afterScriptsLoaded` after server scripts finish.
- **Example**:

```javascript
MMCREvents.server(event => {
    event.createStructure("example:machine").pattern("C").set("C", "minecraft:iron_block").controller("C").build()
})
```

#### `postClient(RecipeInformationEventJS event) → void`

- **Parameters**: `event` (`RecipeInformationEventJS`) — The client-side recipe information event object.
- **Returns**: Nothing.
- **Default**: Called by the plugin after client scripts load.
- **Example**: Scripts should subscribe to `MMCREvents.client(...)` rather than call this lifecycle method manually.

#### `events() → Map<String, String>`

- **Parameters**: None.
- **Returns**: An ordered map containing the three event IDs `mmcr.startup`, `mmcr.server`, and `mmcr.client`.
- **Throws**: None.
- **Default**: Creates a new `LinkedHashMap` on each call.
- **Example**:

```javascript
const ids = MMCREvents.events()
```

:::warning Notes

- `MMCREvents.startup` callbacks run under `ScriptType.STARTUP`. Register machine definitions, tier types, tiers, modifiers, and controller screen text here.
- `MMCREvents.server` callbacks run within a KubeJS content transaction under `ScriptType.SERVER`. Structure `build()` calls must run in this window.
- `MMCREvents.client` registers client-side JEI recipe information. If JEI is not loaded, registration is ignored and a warning is logged only once.
- `postStartup()`, `postServer()`, `postClient()`, and `group()` are Java-side event group lifecycle methods; ordinary scripts should use only the event group's listener entry points.
- The event group is also available under the plugin-registered name `mmcr`. For compatibility and readability, prefer the `MMCREvents` alias in machine definition scripts.
:::

### `RecipeInformationEventJS`

> `cn.howxu.mmcr.compat.kubejs.RecipeInformationEventJS` is the client event object for `MMCREvents.client`, used to add localized descriptions to JEI recipe pool pages or individual recipes.

#### `addRecipePoolInfo(String poolId, String translationKey, Object... arguments) → void`

Adds translated text to the specified recipe pool page. `poolId` must be a valid resource ID, the translation key should be defined in a language file, and arguments are passed to `Component.translatable(...)`.

```javascript
MMCREvents.client(event => {
    event.addRecipePoolInfo("example:press", "jei.example.press.info", 10)
})
```

#### `addRecipeInfo(String recipeId, String translationKey, Object... arguments) → void`

Adds translated text to the specified recipe. Throws `IllegalArgumentException` if the resource ID is blank or malformed.

```javascript
MMCREvents.client(event => {
    event.addRecipeInfo("example:press_recipe", "jei.example.press_recipe.info", "extra")
})
```

If JEI is not loaded, both methods ignore registration and emit a warning only once.

### Smart Interface Update Event

Source: [SmartInterfaceEvents](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/SmartInterfaceEvents.java), [SmartInterfaceUpdateEventJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/SmartInterfaceUpdateEventJS.java).

This is a separate server-side event group, `mmcr.smart_interface`, with the event ID `mmcr.smart_interface.updated`; it is not a fourth listener method on `MMCREvents`. Define the listener in `server_scripts`:

```javascript
this["mmcr.smart_interface"].updated(event => {
    console.log(String(event.machineId()), event.type(), event.oldValue(), event.newValue())
    console.log("controllers:", event.controllerCount())
})
```

KubeJS 26.1.2-8.0.6's built-in binding injects global keys using `group.name` as-is. The dot here is part of the key name; it does not indicate a `smart_interface` property on an `mmcr` object. At the top level of the script, use `this["mmcr.smart_interface"]` to obtain the event group wrapper, then call `updated`.

`SmartInterfaceUpdateEventJS` is an immutable record with the following accessors:

| Method | Return Type | Meaning |
| --- | --- | --- |
| `interfacePos()` | `BlockPos` | An immutable copy of the position of the updated smart interface. |
| `machineId()` | `Identifier` | The ID of the machine bound to the interface. |
| `type()` | `String` | The name of the updated parameter type. |
| `oldValue()` / `newValue()` | Nullable `Float` | Values before and after the update; the record allows `null`, so handlers should check for it. |
| `controllerPositions()` | `List<BlockPos>` | An immutable position list sorted by `BlockPos.asLong()`; passing `null` to the constructor produces an empty list. |
| `controllerCount()` | `int` | The size of the list above. |
| `controllerPos()` | Nullable `BlockPos` | The first controller after sorting, or `null` if there are no controllers. |

The trigger conditions follow the implementation: [SmartInterfaceBlockEntity.setValue](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/tile/SmartInterfaceBlockEntity.java#L99) posts the event only when an existing parameter's new value is finite and differs from its old value, and the interface is on the server side with a `machineId`. Setting the same value succeeds without posting an event. `claimController`, `releaseController`, `syncTypes`, and the capability transaction's `applyCapabilityValues` do not post this event directly, so it is not guaranteed to fire on every bind/unbind or every capability output. Dispatch occurs only after the event group is registered and when a listener exists.

`SmartInterfaceEvents.group()` / `post(event)` are Java lifecycle and dispatch helpers; scripts should only subscribe to `updated`. The event record has no cancellation or modification methods, and callbacks do not automatically change interface values.

## 2. Startup Callbacks

### `MMCRStartupEventJS`

> `cn.howxu.mmcr.compat.kubejs.MMCRStartupEventJS` is the event object received by `MMCREvents.startup` callbacks. It collects content that can only be declared during the startup window.

**Fields**

| Name | Type | Description |
|------|------|------|
| `api` | `KubeJSApi` | Private API facade exposed through `getAPI()`. |

**Methods**

#### `getAPI() → KubeJSApi`

- **Parameters**: None.
- **Returns**: The `KubeJSApi` used by the current startup event.
- **Throws**: No additional argument exceptions.
- **Default**: Each event object holds one API instance.
- **Example**:

```javascript
MMCREvents.startup(event => {
    const api = event.getAPI()
    const id = api.id("example:machine")
})
```

#### `registerControllerScreenText(String machineId, Consumer<ControllerScreenTextEventJS> handler) → void`

- **Parameters**: `machineId` (`String`) — Machine registration ID; an explicit namespace is recommended. This entry point uses `Identifier.tryParse` and does not require a colon in the string. `handler` (`Consumer<ControllerScreenTextEventJS>`) — Controller screen text callback.
- **Returns**: Nothing; the handler is added to the controller screen text registry.
- **Throws**: `IllegalArgumentException` if the machine ID is null, blank, or malformed, or the callback is `null`; registry lifecycle exceptions propagate to the caller. See Section 10 for namespace requirements on screen text line IDs.
- **Default**: No default handler.
- **Example**:

```javascript
MMCREvents.startup(event => {
    event.registerControllerScreenText("example:machine", text => {
        text.appendTranslatable("controller", "example:status", "gui.example.status")
    })
})
```

#### `createMachine(String id) → MachineBuilderJS`

- **Parameters**: `id` (`String`) — Machine registration ID, typically in `namespace:path` format.
- **Returns**: A `MachineBuilderJS` bound to that ID.
- **Throws**: `IllegalArgumentException` if `Identifier.parse` cannot parse the ID; submission may throw a registration exception for a duplicate ID or a closed lifecycle window.
- **Default**: The builder uses the machine definition's default controller, appearance, recipe behavior, and parallel limit.
- **Example**:

```javascript
MMCREvents.startup(event => {
    event.createMachine("example:press").displayNameKey("machine.example.press").register()
})
```

#### `createLevelType(String id) → LevelTypeBuilderJS`

- **Parameters**: `id` (`String`) — Tier type registration ID.
- **Returns**: A `LevelTypeBuilderJS` bound to that ID.
- **Throws**: `IllegalArgumentException` if the ID is malformed; the tier registrar throws an exception if the registration window is closed or the ID is duplicated.
- **Default**: The display name key defaults to the tier type ID string.
- **Example**:

```javascript
MMCREvents.startup(event => {
    event.createLevelType("example:coil").displayNameKey("level.example.coil").register()
})
```

#### `createLevel(String id) → MachineLevelBuilderJS`

- **Parameters**: `id` (`String`) — Registration ID for a specific machine tier.
- **Returns**: A `MachineLevelBuilderJS` bound to that ID.
- **Throws**: `IllegalArgumentException` if the ID is malformed; missing `type()` or `state()` causes `IllegalStateException` during building or registration.
- **Default**: Priority is `0`, and the modifier definition is `ModifierDefinition.EMPTY`.
- **Example**:

```javascript
MMCREvents.startup(event => {
    event.createLevel("example:coil_iron")
        .type("example:coil")
        .state("minecraft:iron_block")
        .register()
})
```

#### `levelSlot(String typeId) → LevelSlot`

- **Parameters**: `typeId` (`String`) — A registered machine tier type ID.
- **Returns**: A `LevelSlot` referencing that tier type, which can be passed to the structure builder's `set(symbol, value)`.
- **Throws**: `IllegalArgumentException` if the type ID is invalid or unregistered, or the current tier registry is unavailable.
- **Default**: None; the type must be provided explicitly.
- **Example**:

```javascript
MMCREvents.startup(event => {
    const slot = event.levelSlot("example:coil")
})
```

#### `registerModifier(String id, ModifierDefinition definition) → void`

- **Parameters**: `id` (`String`) — Modifier ID; `definition` (`cn.howxu.mmcr.api.machine.definition.ModifierDefinition`) is usually created with `event.getAPI().modifierDefinition(...)`.
- **Returns**: Nothing; adds the modifier to the current machine structure registration window.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed; the registrar may throw exceptions for a duplicate ID, a null definition, or an invalid lifecycle state.
- **Default**: None.
- **Example**:

```javascript
MMCREvents.startup(event => {
    const api = event.getAPI()
    const modifier = api.modifier("duration", "input", 0.5, "multiply", false)
    event.registerModifier("example:speed", api.modifierDefinition([modifier]))
})
```

#### `registerModifierItem(ItemStack stack, String modifierId) → void`

- **Parameters**: `stack` (`ItemStack`) — Item stack bound to the modifier; `modifierId` (`String`) — A registered modifier ID.
- **Returns**: Nothing; registers the item as a trigger item for that modifier. The registrar normalizes its count to 1.
- **Throws**: `IllegalArgumentException` if the modifier ID is invalid; the registrar may throw exceptions if the modifier does not exist, the item is empty, or the lifecycle state is invalid.
- **Default**: None.
- **Example**:

```javascript
MMCREvents.startup(event => {
    event.registerModifierItem(Item.of("minecraft:diamond"), "example:speed")
})
```

#### `addRecipePoolWorkstation(String recipePoolId, String itemId) → void`

Registers the specified item as a workstation for an MMCR recipe pool page in JEI. Both IDs must be valid resource IDs.

```javascript
MMCREvents.startup(event => {
    event.addRecipePoolWorkstation("example:press", "minecraft:blast_furnace")
})
```

#### `addRecipePoolWorkstation(String recipePoolId, ItemStack workstation) → void`

Registers an item stack as a recipe pool workstation. Empty stacks are rejected, and the item count is normalized to 1 during registration.

#### `addMachineWorkstation(String machineId, String recipeTypeId) → void`

Registers an MMCR machine controller as a workstation for the specified JEI recipe type. `recipeTypeId` must refer to a registered JEI recipe type.

```javascript
MMCREvents.startup(event => {
    event.addMachineWorkstation("example:press", "minecraft:smelting")
})
```

`addMachineWorkStation(...)` (with an uppercase `S` in `Station`) is a compatibility alias. New scripts should use `addMachineWorkstation(...)`.

:::warning Notes

- The plugin opens the startup window in `beforeScriptsLoaded`, then posts the event and completes submission in `afterScriptsLoaded`. Once scripts finish, `/reload` cannot reopen the machine registration window.
- Register tier types before specific tiers; structure scripts can only reference existing tier types.
- `registerControllerScreenText` can only be called on the startup event; the server event has no such method.
- Although `registerModifier` and `registerModifierItem` are part of the startup callback API, they are ultimately validated together by the machine structure registration snapshot.
- JEI workstation registrations are collected during startup and applied when JEI registers workstations.
:::
## 3. Server Callbacks

### `MMCRServerEventJS`

> `cn.howxu.mmcr.compat.kubejs.MMCRServerEventJS` is the event object received by `MMCREvents.server` callbacks. It collects machine structures within the server resource reload transaction.

**Fields**

| Name | Type | Description |
|------|------|------|
| `api` | `KubeJSApi` | Private API facade exposed through `getAPI()`. |

**Methods**

#### `getAPI() → KubeJSApi`

- **Parameters**: None.
- **Returns**: The `KubeJSApi` used by the current server event.
- **Throws**: None.
- **Default**: Each event object holds one API instance.
- **Example**:

```javascript
MMCREvents.server(event => {
    const api = event.getAPI()
    const casing = api.block("minecraft:iron_block")
})
```

#### `createStructure(String id) → MachineStructureBuilderJS`

- **Parameters**: `id` (`String`) — A machine ID registered during startup.
- **Returns**: A `MachineStructureBuilderJS` bound to that ID.
- **Throws**: `IllegalArgumentException` if the ID is malformed; structure submission throws a runtime exception if the machine does not exist, the structure is duplicated, or no transaction is active.
- **Default**: Structures are state-insensitive by default, with no port or dynamic pattern requirements.
- **Example**:

```javascript
MMCREvents.server(event => {
    event.createStructure("example:press")
        .pattern("C")
        .set("C", "minecraft:iron_block")
        .controller("C")
        .build()
})
```

:::warning Notes

- `build()` must be called during `MMCREvents.server` script loading; calling it outside that callback throws `IllegalStateException`.
- The server reload transaction collects both structures and programmatic recipes. `Plugin.completeServerReload` attempts to commit when the error count has not increased, **or when the transaction still contains publishable content**. Valid content may therefore still be published after a script error; `/reload` does not provide an atomic rollback of the entire reload cycle. Invalid recipes are validated, skipped, and logged as warnings; see the internal transaction section for details.
- Machine definitions, tier types, and modifiers should not be registered again in this event.
:::
## 4. Complete KubeJSApi Methods

### `KubeJSApi`

> `cn.howxu.mmcr.compat.kubejs.KubeJSApi` is the script-safe factory facade returned by the global `MMCR.getAPI()` or an event's `getAPI()`.

The structure predicate type returned by `KubeJSApi` is `cn.howxu.mmcr.api.machine.BlockPredicate`. The structure builder accepts it; `modifierUse` converts it to `cn.howxu.mmcr.api.machine.definition.BlockPredicate`. Neither underlying class is a `publicapi` predicate view.

**Fields**

The class itself has only four private cached fields: `screenScope`, `recipeIO`, `outputPolicy`, and `modifierOperation`. Scripts access them through the methods below.

**Methods**

#### Constant Objects

##### `screenScope() → ScreenScopeValues`

- **Parameters**: None.
- **Returns**: The screen text scope constants object.
- **Throws**: None.
- **Default**: The cached `ScreenScopeValues`.
- **Example**:

```javascript
const scope = MMCR.getAPI().screenScope()
const operation = scope.OPERATION
```

##### `recipeIO() → RecipeIoValues`

- **Parameters**: None.
- **Returns**: The recipe input/output direction constants object.
- **Throws**: None.
- **Default**: The cached `RecipeIoValues`.
- **Example**:

```javascript
const io = MMCR.getAPI().recipeIO()
const input = io.INPUT
```

##### `outputPolicy() → OutputPolicyValues`

- **Parameters**: None.
- **Returns**: The planned output policy constants object.
- **Throws**: None.
- **Default**: The cached `OutputPolicyValues`.
- **Example**:

```javascript
const policy = MMCR.getAPI().outputPolicy().ALLOW_PARTIAL
```

##### `modifierOperation() → ModifierOperationValues`

- **Parameters**: None.
- **Returns**: The recipe modifier operation constants object.
- **Throws**: None.
- **Default**: The cached `ModifierOperationValues`.
- **Example**:

```javascript
const operation = MMCR.getAPI().modifierOperation()
machine.durationByInterface("temperature", 0, 100, 2, 0.5, operation.ADD)
```

#### `ScreenScopeValues`

| Name | Type | Value |
|------|------|------|
| `CONTROLLER` | `ControllerScreenTextScope` | Controller static text scope. |
| `OPERATION` | `ControllerScreenTextScope` | Running/operation text scope. |

#### `RecipeIoValues`

| Name | Type | Value |
|------|------|------|
| `INPUT` | `RecipeModifier.IOType` | Recipe input direction. |
| `OUTPUT` | `RecipeModifier.IOType` | Recipe output direction. |

The fully qualified direction type is `cn.howxu.mmcr.api.recipe.modifier.RecipeModifier.IOType`. `recipeIO()` returns the constants container `RecipeIoValues`, whose fields hold this enum. It is neither the port direction type `cn.howxu.mmcr.util.IOType` nor a direction type from `publicapi`.

#### `OutputPolicyValues`

| Name | Type | Value |
|------|------|------|
| `REQUIRE_FULL` | `OutputPolicy` | Requires all output to be accepted. |
| `ALLOW_PARTIAL` | `OutputPolicy` | Allows the output plan to be partially accepted. |

#### `ModifierOperationValues`

| Name | Type | Value |
|------|------|------|
| `ADD` | `RecipeModifier.Operation` | Addition. |
| `MULTIPLY` | `RecipeModifier.Operation` | Multiplication. |
| `SUBTRACT` | `RecipeModifier.Operation` | Subtraction. |
| `DIVIDE` | `RecipeModifier.Operation` | Division. |

#### Strings and Numbers

These methods are the KubeJS facade for `cn.howxu.mmcr.api.presentation.ReadableNumber`. All methods
reject negative numbers; decimal and SI-formatted values are truncated downward,
not rounded to the nearest value.

| Method Family | SI Prefix Threshold | Prefixes | Decimal Places |
| --- | --- | --- | --- |
| `readableNumber(...)` | `1,000` | `k`, `M`, `G`, `T`, `P`, `E`, `Z`, `Y` | Up to 2; trailing `0`s removed |
| `readableNumberFull(...)` | `1,000,000` | `k`, `M`, `G`, `T`, `P`, `E`, `Z`, `Y` | Up to 2; trailing `0`s retained |
| `readableNumberExact(long)` | Not used | None | Integer with thousands separators |
| `readableNumberForSlot(...)` | Chosen to fit the slot width | `K`, `M`, `G`, `T`, `P`, `E` | Determined by the remaining width |

When the value exceeds the range representable with the `Y` prefix, the first two method families switch to scientific notation. For example,
`readableNumberBigInt(new BigInteger("123456789012345678901234567890"))`
returns `1.23E29`.

##### `readableNumber(long value) → String`

- **Parameters**: `value` (`long`) — The integer to format.
- **Returns**: A compact, readable format. Uses SI prefixes starting at `1000` and removes trailing zeros, e.g., `1000` → `1k`, `1500` → `1.5k`.
- **Throws**: `IllegalArgumentException` (`value < 0`).
- **Default**: None.
- **Example**:

```javascript
const text = MMCR.getAPI().readableNumber(1000000)
```

##### `readableNumberBigInt(BigInteger value) → String`

- **Parameters**: `value` (`BigInteger`) — The arbitrary-precision integer to format.
- **Returns**: A compact, readable format, e.g., `1_000_000` is formatted as `1M`.
- **Throws**: `IllegalArgumentException` (negative numbers).
- **Example**:

```javascript
const BigInteger = Java.loadClass("java.math.BigInteger")
const stored = new BigInteger("123456789012345678901234567890")
const text = MMCR.getAPI().readableNumberBigInt(stored) // "1.23E29"
```

##### `readableNumberBigDecimal(BigDecimal value) → String`

- **Parameters**: `value` (`BigDecimal`) — The arbitrary-precision decimal to format.
- **Returns**: A compact, readable format, e.g., `12345.678` is formatted as `12.34k`.
- **Throws**: `IllegalArgumentException` (negative numbers).
- **Example**:

```javascript
const BigDecimal = Java.loadClass("java.math.BigDecimal")
const text = MMCR.getAPI().readableNumberBigDecimal(new BigDecimal("12345.678"))
```

##### `readableNumberExact(long value) → String`

- **Parameters**: `value` (`long`) — The integer to format.
- **Returns**: An exact format with grouping separators, e.g., `1000000` is formatted as `1,000,000`.
- **Throws**: `IllegalArgumentException` (`value < 0`).
- **Default**: None.
- **Example**:

```javascript
const text = MMCR.getAPI().readableNumberExact(1000000)
```

##### `readableNumberFull(long value) → String`

- **Parameters**: `value` (`long`) — The integer to format.
- **Returns**: A full, readable SI-prefixed format: values up to `999_999` return a grouped integer; values starting at `1_000_000` use an SI prefix with two decimal places (`1_000_000` → `"1.00M"`, `1_230_000_000` → `"1.23G"`).
- **Throws**: `IllegalArgumentException` (negative numbers).
- **Example**:

```javascript
const text = MMCR.getAPI().readableNumberFull(1234567890) // "1.23G"
```

##### `readableNumberFullBigInt(BigInteger value) → String`

- **Parameters**: `value` (`BigInteger`) — The arbitrary-precision integer to format.
- **Returns**: A full, readable SI-prefixed format without the precision limit of long.
- **Throws**: `IllegalArgumentException` (negative numbers).
- **Example**:

```javascript
const BigInteger = Java.loadClass("java.math.BigInteger")
const stored = new BigInteger("999999999999999999999999999999")
const text = MMCR.getAPI().readableNumberFullBigInt(stored) // "9.99E29"
```

##### `readableNumberFullBigDecimal(BigDecimal value) → String`

- **Parameters**: `value` (`BigDecimal`) — The arbitrary-precision decimal to format.
- **Returns**: A full, readable SI-prefixed format.
- **Throws**: `IllegalArgumentException` (negative numbers).
- **Example**:

```javascript
const BigDecimal = Java.loadClass("java.math.BigDecimal")
const text = MMCR.getAPI().readableNumberFullBigDecimal(new BigDecimal("1234567.89")) // "1.23M"
```

##### `readableNumberForSlot(long value, int scale, String unit) → String`

- **Parameters**: `value` (`long`) — Raw integer value; `scale` (`int`, `0..18`) — Decimal point offset; `unit` (`String`) — Unit suffix (such as `"B"` or `"FE"`).
- **Returns**: A slot string of at most 5 characters, rendering `value / 10^scale` with the given `unit` and **uppercase** SI prefixes (`""`, `"K"`, `"M"`, `"G"`, `"T"`, `"P"`, `"E"`). Excess digits are truncated rather than rounded. For example, `readableNumberForSlot(1_001, 3, "B")` returns `"1.00B"`, and `readableNumberForSlot(15_000_000, 0, "FE")` returns `"15MFE"`.
- **Throws**: `IllegalArgumentException` (negative numbers / `scale` out of range / `unit` too long to fit in the slot).
- **Example**:

```javascript
const text = MMCR.getAPI().readableNumberForSlot(1_001, 3, "B") // "1.00B"
```

##### `id(String id) → Identifier`

- **Parameters**: `id` (`String`) — Resource ID in `namespace:path` format.
- **Returns**: The parsed Minecraft `Identifier`.
- **Throws**: `IllegalArgumentException` if the string does not follow resource ID syntax.
- **Default**: None.
- **Example**:

```javascript
const recipeId = MMCR.getAPI().id("example:iron_press")
```

#### Block Predicates

##### `air() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A predicate that matches air.
- **Throws**: None.
- **Default**: None.
- **Example**:

```javascript
builder.set("A", api.air())
```

##### `any() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A predicate that matches any block.
- **Throws**: None.
- **Default**: None.
- **Example**:

```javascript
builder.set("X", api.any())
```

##### `coupler() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A predicate that matches an MMCR module coupler.
- **Throws**: None.
- **Default**: None.
- **Example**:

```javascript
builder.set("X", api.coupler())
```

##### `block(String blockId) → BlockPredicate`

- **Parameters**: `blockId` (`String`) — Resource ID of a registered block.
- **Returns**: A predicate that matches any state of that block.
- **Throws**: `IllegalArgumentException` if the block ID is invalid or absent from the block registry.
- **Default**: None.
- **Example**:

```javascript
const casing = api.block("minecraft:iron_block")
```

##### `state(String blockStateId) → BlockPredicate`

- **Parameters**: `blockStateId` (`String`) — `namespace:block[property=value,...]`; uses the block's default state if no brackets are present.
- **Returns**: A predicate that exactly matches the block state and its property values.
- **Throws**: `IllegalArgumentException` if the block does not exist, brackets are unclosed, properties are empty, a property name is unknown, or a property value is invalid.
- **Default**: The default block state when no properties are specified.
- **Example**:

```javascript
const log = api.state("minecraft:oak_log[axis=x]")
```

##### `tag(String tagId) → BlockPredicate`

- **Parameters**: `tagId` (`String`) — Block tag ID.
- **Returns**: A predicate that matches blocks belonging to that tag.
- **Throws**: `IllegalArgumentException` if the tag ID cannot be parsed.
- **Default**: None; the tag system determines whether the tag contains any members after resources load.
- **Example**:

```javascript
builder.set("B", api.tag("c:natural_logs"))
```

##### `anyOf(BlockPredicate... children) → BlockPredicate`

- **Parameters**: `children` (`BlockPredicate...`) — At least one child predicate; both JavaScript arrays and multiple arguments can be converted to varargs.
- **Returns**: A union predicate that matches any child predicate.
- **Throws**: `IllegalArgumentException` if the array is `null` or contains no child predicates.
- **Default**: None.
- **Example**:

```javascript
const portOrStone = api.anyOf(api.block("minecraft:stone"), api.anyOfItemInput())
```

##### `anyOfItemInput() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A union predicate for all registered item input ports.
- **Throws**: None.
- **Default**: Automatically includes matching ports from the current port registry.
- **Example**:

```javascript
structure.set("I", api.anyOfItemInput())
```

##### `anyOfItemOutput() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A union predicate for all registered item output ports.
- **Throws**: None.
- **Default**: Automatically includes matching ports from the current port registry.
- **Example**:

```javascript
structure.set("O", api.anyOfItemOutput())
```

##### `anyOfFluidInput() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A union predicate for all registered fluid input ports.
- **Throws**: None.
- **Default**: Automatically includes matching ports from the current port registry.
- **Example**:

```javascript
structure.set("F", api.anyOfFluidInput())
```

##### `anyOfFluidOutput() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A union predicate for all registered fluid output ports.
- **Throws**: None.
- **Default**: Automatically includes matching ports from the current port registry.
- **Example**:

```javascript
structure.set("F", api.anyOfFluidOutput())
```

##### `anyOfEnergyInput() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A union predicate for all registered energy input ports.
- **Throws**: None.
- **Default**: Automatically includes matching ports from the current port registry.
- **Example**:

```javascript
structure.set("E", api.anyOfEnergyInput())
```

##### `anyOfEnergyOutput() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A union predicate for all registered energy output ports.
- **Throws**: None.
- **Default**: Automatically includes matching ports from the current port registry.
- **Example**:

```javascript
structure.set("E", api.anyOfEnergyOutput())
```

##### Combined Port Predicates

Each method below returns the union of input and output ports in the same family. Port families that require Mekanism match no blocks when Mekanism is not loaded.

| Method | Matches |
| --- | --- |
| `anyOfItemPorts()` | All item input and output ports. |
| `anyOfFluidPorts()` | All fluid input and output ports. |
| `anyOfEnergyPorts()` | All energy input and output ports. |
| `anyOfChemicalPorts()` | Mekanism chemical input and output ports. |
| `anyOfRadioactiveChemicalPorts()` | Mekanism radioactive chemical input and output ports. |
| `anyOfHeatPorts()` | Mekanism heat input and output ports. |
| `ports()` | All built-in ports; also includes chemical and heat ports when Mekanism is available. |

```javascript
structure.set("P", api.anyOfItemPorts())
structure.set("A", api.ports())
```

##### `anyOfUpgradeBus() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A union predicate for all registered upgrade buses.
- **Throws**: None.
- **Default**: Automatically includes members of the current upgrade bus registry.
- **Example**:

```javascript
structure.set("U", api.anyOfUpgradeBus())
```

##### `parallelControllers() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A union predicate for parallel controllers of all tiers.
- **Throws**: None.
- **Default**: Includes all currently registered parallel controller tiers.
- **Example**:

```javascript
structure.set("P", api.parallelControllers())
```

##### `smartInterface() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A predicate that matches the built-in smart interface block.
- **Throws**: None.
- **Default**: Resolves the actual block through a deferred block reference.
- **Example**:

```javascript
structure.set("S", api.smartInterface())
```

##### `dataStorage() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A predicate that matches the built-in data storage block.
- **Throws**: None.
- **Default**: Resolves the actual block through a deferred block reference.
- **Example**:

```javascript
structure.set("D", api.dataStorage())
```

##### `factoryController() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A predicate that matches the built-in factory controller block.
- **Throws**: None.
- **Default**: Resolves the actual block through a deferred block reference.
- **Example**:

```javascript
structure.set("T", api.factoryController())
```

##### `networkInterface() → BlockPredicate`

- **Parameters**: None.
- **Returns**: A predicate that matches the built-in network interface block.
- **Throws**: None.
- **Default**: Resolves the actual block through a deferred block reference.
- **Example**:

```javascript
structure.set("N", api.networkInterface())
```

#### Port Tiers and Port Requirements {#port-requirements}

Count requirements count ports before the structure forms. Tier requirements demand **at least one port in the structure from the same family and direction that meets the minimum tier**, rather than requiring every port in that family to meet it. Both requirements can be configured together, but neither automatically adds port positions to the structure pattern; you must still bind the corresponding block predicates with `set(...)`.

##### `portRequirements(Map<String, Object> ranges) → PortRequirementSpec`

- **Parameters**: `ranges` (`Map<String,Object>`) — Keys are port family counting aliases or specific port kind IDs from the tables below. A single number specifies the minimum count; `[min, max]` specifies an inclusive range.
- **Returns**: An immutable port count requirement object.
- **Throws**: `IllegalArgumentException` if a key is blank, a value is neither a number nor a two-number array, a number is not a finite integer or is outside the `int` range, a count is negative, or the maximum is less than the minimum.
- **Default**: An empty map produces `PortRequirementSpec.none()`, with no port count requirements.
- **Example**:

```javascript
const ports = api.portRequirements({
    item_input_bus: [1, 2],
    energy_input_hatch: 1,
    chemical_input_hatch: [1, 2],
    chemical_output_hatch_ultimate: 1,
    radioactive_chemical_input_hatch: 1,
    heat_output_hatch: [1, 1]
})
```

**Port Family Counting Aliases (Complete List)**

Aliases count all ports in the same family and direction, regardless of specific model or tier.

| Port Family | Input Alias | Output Alias |
| --- | --- | --- |
| Items | `item_input_bus` | `item_output_bus` |
| Fluids | `fluid_input_hatch` | `fluid_output_hatch` |
| Energy | `energy_input_hatch` | `energy_output_hatch` |
| Mekanism regular chemicals | `chemical_input_hatch` | `chemical_output_hatch` |
| Mekanism radioactive chemicals | `radioactive_chemical_input_hatch` | `radioactive_chemical_output_hatch` |
| Mekanism heat | `heat_input_hatch` | `heat_output_hatch` |

Item and fluid aliases also include combined ports, extended ports, and AE2 interfaces that declare the corresponding family. Energy aliases also include extended energy hatches and Applied Flux interfaces. Regular and radioactive chemicals are counted separately, as are inputs and outputs. One combined port can contribute a count of 1 to both items and fluids.

**Specific Port Kind IDs (Complete List for This Commit)**

Specific IDs count only that model. All IDs in the table below omit the `mmcr:` namespace; integration ports have countable blocks only after the corresponding mod is loaded and the ports are registered.

| Model | Input ID | Output ID |
| --- | --- | --- |
| Standard items | `item_input_bus_tiny`, `item_input_bus_small`, `item_input_bus`, `item_input_bus_reinforced`, `item_input_bus_big`, `item_input_bus_huge`, `item_input_bus_ludicrous` | `item_output_bus_tiny`, `item_output_bus_small`, `item_output_bus`, `item_output_bus_reinforced`, `item_output_bus_big`, `item_output_bus_huge`, `item_output_bus_ludicrous` |
| Standard fluids | `fluid_input_hatch_tiny`, `fluid_input_hatch_small`, `fluid_input_hatch`, `fluid_input_hatch_reinforced`, `fluid_input_hatch_big`, `fluid_input_hatch_huge`, `fluid_input_hatch_ludicrous`, `fluid_input_hatch_vacuum` | `fluid_output_hatch_tiny`, `fluid_output_hatch_small`, `fluid_output_hatch`, `fluid_output_hatch_reinforced`, `fluid_output_hatch_big`, `fluid_output_hatch_huge`, `fluid_output_hatch_ludicrous`, `fluid_output_hatch_vacuum` |
| Standard energy | `energy_input_hatch_tiny`, `energy_input_hatch_small`, `energy_input_hatch`, `energy_input_hatch_reinforced`, `energy_input_hatch_big`, `energy_input_hatch_huge`, `energy_input_hatch_ludicrous`, `energy_input_hatch_ultimate` | `energy_output_hatch_tiny`, `energy_output_hatch_small`, `energy_output_hatch`, `energy_output_hatch_reinforced`, `energy_output_hatch_big`, `energy_output_hatch_huge`, `energy_output_hatch_ludicrous`, `energy_output_hatch_ultimate` |
| Extended items | `extended_item_input_bus_basic`, `extended_item_input_bus_advanced`, `extended_item_input_bus_reinforced`, `extended_item_input_bus_ultimate` | `extended_item_output_bus_basic`, `extended_item_output_bus_advanced`, `extended_item_output_bus_reinforced`, `extended_item_output_bus_ultimate` |
| Extended fluids | `extended_fluid_input_hatch_basic`, `extended_fluid_input_hatch_advanced`, `extended_fluid_input_hatch_reinforced`, `extended_fluid_input_hatch_ultimate` | `extended_fluid_output_hatch_basic`, `extended_fluid_output_hatch_advanced`, `extended_fluid_output_hatch_reinforced`, `extended_fluid_output_hatch_ultimate` |
| Extended energy | `extended_energy_input_hatch_reinforced`, `extended_energy_input_hatch_ultimate` | `extended_energy_output_hatch_reinforced`, `extended_energy_output_hatch_ultimate` |
| Standard combined | `combined_input_basic`, `combined_input_advanced`, `combined_input_reinforced`, `combined_input_ultimate` | `combined_output_basic`, `combined_output_advanced`, `combined_output_reinforced`, `combined_output_ultimate` |
| Extended combined | `extended_combined_input_advanced`, `extended_combined_input_reinforced`, `extended_combined_input_ultimate` | `extended_combined_output_advanced`, `extended_combined_output_reinforced`, `extended_combined_output_ultimate` |
| Mekanism regular chemicals | `chemical_input_hatch_basic`, `chemical_input_hatch_advanced`, `chemical_input_hatch_elite`, `chemical_input_hatch_ultimate` | `chemical_output_hatch_basic`, `chemical_output_hatch_advanced`, `chemical_output_hatch_elite`, `chemical_output_hatch_ultimate` |
| Mekanism radioactive chemicals | `radioactive_chemical_input_hatch` | `radioactive_chemical_output_hatch` |
| Mekanism heat | `heat_input_hatch` | `heat_output_hatch` |
| AE2 interfaces | `ae2_me_input_interface`, `ae2_me_stocking_input_interface` | `ae2_me_output_interface`, `ae2_me_async_output_interface` |
| Applied Flux interfaces (require AE2 and Applied Flux) | `appflux_me_flux_input_interface` | `appflux_me_flux_output_interface` |

AE2 also provides `ae2_me_pattern_interface`. This single port declares both item and fluid input and return-output families, so it can count toward all four directional aliases.

Note that the `normal` models for standard item, fluid, and energy ports use IDs without a suffix, such as `item_input_bus`; there is no `item_input_bus_normal`. These unsuffixed IDs are also family aliases, so count requirements count the entire family and cannot use them to restrict the count of the `normal` model alone.

Keys are strings that are **case-sensitive, are not trimmed, and do not support namespace or wildcard parsing**. Building only checks that keys are not blank, not whether they are registered. A misspelled or uncounted key such as `mmcr:item_input_bus` has an actual count of 0, so a positive minimum prevents the structure from forming. Port kind IDs and counting aliases added by addons can also be used, according to their actual registration declarations. `upgrade_bus_*`, `parallel_controller_*`, `factory_controller`, `smart_interface`, `data_storage`, and `network_interface` are not IO ports counted here.

The value `0` sets neither a minimum nor a maximum count. To prohibit a port category, use `[0, 0]`. `[n, n]` means exactly `n` ports.

##### `portTierRequirements(List<String> minimums) → PortTierRequirementSpec`

- **Parameters**: `minimums` (`List<String>`) — Each entry uses the full syntax in the table below. Tiered port families use `port_family>=tier`; single-tier radioactive chemical and heat ports use only the port family name.
- **Returns**: An immutable minimum port tier requirement object.
- **Throws**: `IllegalArgumentException` if the format is invalid, the port family is not in the allowed list, or the tier is blank or does not belong to the corresponding port family.
- **Default**: An empty list returns `PortTierRequirementSpec.none()`.
- **Example**:

```javascript
const tiers = api.portTierRequirements([
    "item_input_bus>=normal",
    "energy_input_hatch>=small",
    "chemical_input_hatch>=advanced",
    "chemical_output_hatch>=ultimate",
    "radioactive_chemical_input_hatch",
    "heat_output_hatch"
])
```

**Allowed Syntax and Tiers (Complete List)**

`<tier>` is a placeholder that must be replaced with one of the tiers listed in that row. Tiers are ordered from lowest to highest.

| Port Family and Direction | String Syntax | All Allowed `<tier>` Values |
| --- | --- | --- |
| Item input | `item_input_bus>=<tier>` | `tiny`, `small`, `normal`, `reinforced`, `big`, `huge`, `ludicrous` |
| Item output | `item_output_bus>=<tier>` | `tiny`, `small`, `normal`, `reinforced`, `big`, `huge`, `ludicrous` |
| Fluid input | `fluid_input_hatch>=<tier>` | `tiny`, `small`, `normal`, `reinforced`, `big`, `huge`, `ludicrous`, `vacuum` |
| Fluid output | `fluid_output_hatch>=<tier>` | `tiny`, `small`, `normal`, `reinforced`, `big`, `huge`, `ludicrous`, `vacuum` |
| Energy input | `energy_input_hatch>=<tier>` | `tiny`, `small`, `normal`, `reinforced`, `big`, `huge`, `ludicrous`, `ultimate` |
| Energy output | `energy_output_hatch>=<tier>` | `tiny`, `small`, `normal`, `reinforced`, `big`, `huge`, `ludicrous`, `ultimate` |
| Mekanism regular chemical input | `chemical_input_hatch>=<tier>` | `basic`, `advanced`, `elite`, `ultimate` |
| Mekanism regular chemical output | `chemical_output_hatch>=<tier>` | `basic`, `advanced`, `elite`, `ultimate` |
| Mekanism radioactive chemical input | `radioactive_chemical_input_hatch` | No tier parameter; omit `>=`. |
| Mekanism radioactive chemical output | `radioactive_chemical_output_hatch` | No tier parameter; omit `>=`. |
| Mekanism heat input | `heat_input_hatch` | No tier parameter; omit `>=`. |
| Mekanism heat output | `heat_output_hatch` | No tier parameter; omit `>=`. |

The port family must exactly match the lowercase string in the table. Tier names are **case-insensitive**, so `chemical_input_hatch>=ADVANCED` is valid. The parser does not trim spaces or accept namespaces, specific model IDs, wildcards, or other comparison operators (such as `>`, `<=`, or `=`). The eight tiered forms must contain exactly one `>=` and must specify a tier; the four untiered forms must not have `>=any` or `>=ultimate` appended.

For example, `chemical_input_hatch>=normal`, `chemical_input_hatch_basic>=basic`, `chemical_input_hatch`, `heat_input_hatch>=ultimate`, `radioactive_chemical_input_hatch>=any`, and `item_input_bus >= normal` all throw exceptions. Specific port IDs accepted by count requirements cannot be used directly as port families here.

Tier comparisons use the detection tier declared by the family. Extension, composite, and integration ports can also satisfy requirements through their corresponding family declarations; tiers are not inferred from port ID suffixes. Chemical tiers `basic`, `advanced`, `elite`, and `ultimate` correspond to detection tiers 2, 3, 4, and 5. Radioactive chemical and heat requirements check only the family and direction and offer no tier selection. Even an `ultimate` regular chemical port cannot replace a radioactive chemical port.

Every entry in the list must be satisfied, but entries do not each reserve a separate port: one port can satisfy multiple compatible requirements. Use `portRequirements` as well when at least two ports are needed. These requirement objects can still be created when Mekanism is not loaded, but no matching ports will be available to satisfy them, so the structure cannot pass the corresponding formation checks.

##### Mekanism Tier and Presence Factory Shortcuts

The following six methods are available on `KubeJSApi` and all three builders: `MachineBuilderJS`, `MachineStructureBuilderJS`, and `MachineStructureStageBuilderJS`. They return `PortTierRequirementSpec`, not block predicates. Methods with string parameters accept all chemical tiers in the table above; tier names are case-insensitive, and spaces are not trimmed. Methods without parameters require only that a port of the corresponding family and direction exists.

| Method | Equivalent `portTierRequirements` entry |
| --- | --- |
| `chemicalInputTier(String id)` | `chemical_input_hatch>=<tier>` |
| `chemicalOutputTier(String id)` | `chemical_output_hatch>=<tier>` |
| `radioactiveChemicalInputTier()` | `radioactive_chemical_input_hatch` |
| `radioactiveChemicalOutputTier()` | `radioactive_chemical_output_hatch` |
| `heatInputTier()` | `heat_input_hatch` |
| `heatOutputTier()` | `heat_output_hatch` |

```javascript
structure.portTierRequirements(api.chemicalInputTier("advanced"))
// 同样也可以在阶段回调中：
// stage.portTierRequirements(stage.heatOutputTier())
```

Source: [String parsing entry point](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/c2563c4110cd15bad0218dc4fa5a4f091fbccc87/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java), [Port kinds and count aliases](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/c2563c4110cd15bad0218dc4fa5a4f091fbccc87/src/main/java/cn/howxu/mmcr/registry/PortKinds.java), [Tier matching rules](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/c2563c4110cd15bad0218dc4fa5a4f091fbccc87/src/main/java/cn/howxu/mmcr/api/machine/PortTierRequirementSpec.java).

#### Recipe Inputs and Outputs

The following factories create Java IO declarations; they do not register recipes on their own. Requirements and `CustomRecipeIo` can be added to a custom tick's `MachineIoPlan` or passed to a programmatic `MachineRecipeBuilderJS`; pass `MachineIngredient` to its `inputs` / `addInput` methods. Data-driven schemas accept JSON, so these Java objects cannot be used directly as JSON list entries.

Item and fluid amounts in the facade (including `fluidStack` and the corresponding Requirement factories) go through `MachineOutput.recipeStackAmount(long)`: **values below 1 are rejected immediately, and values above `Integer.MAX_VALUE` are capped at that limit**. The `int` overloads delegate to the `long` overloads. This is not a general limit on FE/t or chemical `long` amounts, which use their own models and validation.

##### `itemInput(String itemId, long count, float consumeChance) → MachineIngredient`

- **Parameters**: `itemId` (`String`) — item ID; `count` (`long`) — input count; `consumeChance` (`float`) — probability of consuming this input each time. An `int` overload is also available.
- **Returns**: An item `MachineIngredient`; the direction is fixed to `INPUT`.
- **Throws**: `IllegalArgumentException` if the item is unknown, the ID is invalid, or the count is below 1. Counts above the `int` limit are capped at that limit; the input model normalizes the probability to `0..1`.
- **Defaults**: None; the component predicate is empty.
- **Example**:

```javascript
const ingredient = api.itemInput("minecraft:iron_ingot", 1, 1.0)
```

##### `tagInput(String tagId, long count, float consumeChance) → MachineIngredient`

- **Parameters**: `tagId` (`String`) — item tag ID; `count` (`long`) — count; `consumeChance` (`float`) — consumption probability. An `int` overload is also available.
- **Returns**: An item input constructed from an item tag.
- **Throws**: `IllegalArgumentException` if the tag ID is invalid, the tag does not exist, or the resulting count is invalid; `IllegalStateException` if the current item registry is unavailable.
- **Defaults**: The component predicate is empty.
- **Example**:

```javascript
const ingredient = api.tagInput("c:ingots/iron", 1, 1.0)
```

##### `fluidInput(String fluidId, long amount) → MachineIngredient`

- **Parameters**: `fluidId` (`String`) — fluid ID; `amount` (`long`) — fluid amount. An `int` overload is also available.
- **Returns**: A fluid input `MachineIngredient`.
- **Throws**: `IllegalArgumentException` if the fluid ID is invalid or unregistered.
- **Defaults**: None.
- **Example**:

```javascript
const water = api.fluidInput("minecraft:water", 1000)
```

##### `fluidStack(String fluidId, long amount) → FluidStack`

- **Parameters**: `fluidId` (`String`) — fluid ID; `amount` (`long`) — stack amount. An `int` overload is also available.
- **Returns**: A NeoForge `FluidStack`, which can be passed to the programmatic recipe builder's fluid output list.
- **Throws**: `IllegalArgumentException` if the fluid ID is invalid or unregistered.
- **Defaults**: None.
- **Example**:

```javascript
const output = api.fluidStack("minecraft:lava", 250)
```

##### `chemicalInput(String chemicalId, long amount) → CustomRecipeIo`

- **Parameters**: `chemicalId` (`String`) — chemical ID; `amount` (`long`) — input amount.
- **Returns**: A `mekanism:chemical` input IO using a specific chemical ID, with full consumption by default.
- **Throws**: `IllegalArgumentException` if the ID is empty or malformed, or the chemical payload does not conform to the codec.
- **Example**:

```javascript
const oxygen = api.chemicalInput("mekanism:oxygen", 1000)
```

##### `chemicalInput(String chemicalId, long amount, double consumeChance) → CustomRecipeIo`

- **Parameters**: The first two parameters are as above; `consumeChance` (`double`) — input consumption probability.
- **Returns**: A `mekanism:chemical` input IO with `consume_chance`.
- **Throws**: `IllegalArgumentException` if the ID is invalid or payload validation fails.
- **Example**:

```javascript
const oxygen = api.chemicalInput("mekanism:oxygen", 1000, 0.5)
```

##### `chemicalTagInput(String tagId, long amount) → CustomRecipeIo`

- **Parameters**: `tagId` (`String`) — chemical tag ID; `amount` (`long`) — input amount for each matching chemical.
- **Returns**: A `mekanism:chemical` input IO that matches chemicals by tag, with full consumption by default.
- **Throws**: `IllegalArgumentException` if the tag ID is empty or malformed, or payload validation fails.
- **Example**:

```javascript
const fuel = api.chemicalTagInput("mekanism:fuels", 1000)
```

##### `chemicalTagInput(String tagId, long amount, double consumeChance) → CustomRecipeIo`

- **Parameters**: The first two parameters are as above; `consumeChance` (`double`) — input consumption probability.
- **Returns**: A tag-based chemical input IO with `consume_chance`.
- **Throws**: `IllegalArgumentException` if the tag ID is invalid or payload validation fails.
- **Example**:

```javascript
const fuel = api.chemicalTagInput("mekanism:fuels", 1000, 0.5)
```

##### `chemicalOutput(String chemicalId, long amount, double chance) → CustomRecipeIo`

- **Parameters**: `chemicalId` (`String`) — chemical ID; `amount` (`long`) — output amount; `chance` (`double`) — output probability.
- **Returns**: A `mekanism:chemical` output IO; outputs must specify a concrete chemical ID and cannot use tags.
- **Throws**: `IllegalArgumentException` if the ID is invalid or payload validation fails.
- **Example**:

```javascript
const hydrogen = api.chemicalOutput("mekanism:hydrogen", 500, 0.75)
```

##### `heatTemperatureInput(double temperature) → CustomRecipeIo`

- **Parameters**: `temperature` (`double`) — minimum required temperature, in K.
- **Returns**: A `mekanism:temperature` input IO.
- **Throws**: `IllegalArgumentException` if the temperature is not a nonnegative finite number or payload validation fails.
- **Example**:

```javascript
const temperature = api.heatTemperatureInput(1000)
```

##### `heatOutput(double heat) → CustomRecipeIo`

- **Parameters**: `heat` (`double`) — heat output value.
- **Returns**: A `mekanism:heat` output IO.
- **Throws**: `IllegalArgumentException` if the heat is not a nonnegative finite number or payload validation fails.
- **Example**:

```javascript
const heat = api.heatOutput(250)
```

##### `energyInput(long fePerTick) → MachineIngredient`

- **Parameters**: `fePerTick` (`long`) — FE input per tick.
- **Returns**: An energy input `MachineIngredient`.
- **Throws**: Negative values are rejected during recipe build validation.
- **Defaults**: None.
- **Example**:

```javascript
const energy = api.energyInput(32)
```

##### `energyOutput(long fePerTick) → MachineIngredient`

- **Parameters**: `fePerTick` (`long`) — FE output per tick.
- **Returns**: An energy `MachineIngredient` with direction `OUTPUT`.
- **Throws**: Negative values are rejected during recipe build validation.
- **Defaults**: None.
- **Example**:

```javascript
const energy = api.energyOutput(8)
```

##### `energyRequirement(RecipeModifier.IOType io, long fePerTick) → MachineRequirement`

- **Parameters**: `io` (`RecipeModifier.IOType`) — use `api.recipeIO().INPUT` or `OUTPUT`; `fePerTick` (`long`) — FE per tick.
- **Returns**: An energy requirement that can be added to `MachineIoPlan` or a programmatic recipe's `requirements`.
- **Validation**: The facade constructs `EnergyRequirement` directly; amount validation is handled later by recipe validation or runtime execution.
- **Defaults**: The `EnergyRequirement` constructor normalizes a `null` direction to `INPUT`.
- **Example**:

```javascript
const requirement = api.energyRequirement(api.recipeIO().INPUT, 32)
```

##### `customRecipeIo(String typeId, RecipeModifier.IOType io, JsonElement payload) → CustomRecipeIo`

- **Parameters**: `typeId` (`String`) — registered requirement/output type ID; `io` (`RecipeModifier.IOType`) — input or output direction; `payload` (`JsonElement`) — JSON data accepted by the type's codec.
- **Returns**: A `CustomRecipeIo` validated against the registry and codec.
- **Throws**: `IllegalArgumentException` if the type is unregistered or the direction or payload does not conform to the type's codec.
- **Defaults**: None.
- **Example**:

```javascript
const payload = { type: "neoforge:energy", io: "input", fe_per_tick: 12 }
const custom = api.customRecipeIo("neoforge:energy", api.recipeIO().INPUT, payload)
```

##### `itemOutputRequirement(String itemId, long count, float chance) → MachineRequirement`

- **Parameters**: `itemId` (`String`) — item ID; `count` (`long`) — output count; `chance` (`float`) — output probability. An `int` overload is also available.
- **Returns**: An item requirement with output direction.
- **Throws**: `IllegalArgumentException` if the item is unknown, the ID is invalid, or the count is below 1.
- **Defaults**: None; the data component predicate is empty.
- **Example**:

```javascript
const output = api.itemOutputRequirement("minecraft:iron_nugget", 10, 1.0)
```

##### `itemOutputRequirementWithComponents(String itemId, long count, JsonElement components, float chance) → MachineRequirement`

- **Parameters**: `itemId` (`String`) — item ID; `count` (`long`) — output count; `components` (`JsonElement`) — JSON for the `DataComponentPredicateSet` codec; `chance` (`float`) — output probability. An `int` overload is also available.
- **Returns**: An item output requirement with a `DataComponentPredicateSet`; `ItemRequirement.resolvedStack()` applies decodable exact component values to a stack copy. Non-exact predicates are not automatically converted into concrete components.
- **Throws**: `IllegalArgumentException` or a codec exception if the item is unknown, the component JSON cannot be parsed, or the count is invalid.
- **Defaults**: Components must be supplied explicitly; the output model normalizes the probability.
- **Example**:

```javascript
const output = api.itemOutputRequirementWithComponents(
    "minecraft:diamond_sword",
    1,
    { "minecraft:custom_name": { text: "Marked" } },
    1.0
)
```

##### `itemInputRequirement(String itemId, long count) → MachineRequirement`

- **Parameters**: `itemId` (`String`) — item ID; `count` (`long`) — input count. An `int` overload is also available.
- **Returns**: An item requirement with input direction and consumption probability `1`.
- **Throws**: `IllegalArgumentException` if the item is unknown, the ID is invalid, or the count is below 1.
- **Defaults**: No component predicate; full consumption.
- **Example**:

```javascript
const input = api.itemInputRequirement("minecraft:iron_ingot", 1)
```

##### `fluidInputRequirement(String fluidId, long amount) → MachineRequirement`

- **Parameters**: `fluidId` (`String`) — fluid ID; `amount` (`long`) — input amount. An `int` overload is also available.
- **Returns**: A fluid requirement with input direction.
- **Throws**: `IllegalArgumentException` if the fluid is unknown, the ID is invalid, or the amount is below 1.
- **Defaults**: None.
- **Example**:

```javascript
const input = api.fluidInputRequirement("minecraft:water", 1000)
```

##### `fluidOutputRequirement(String fluidId, long amount, float chance) → MachineRequirement`

- **Parameters**: `fluidId` (`String`) — fluid ID; `amount` (`long`) — output amount; `chance` (`float`) — output probability. An `int` overload is also available.
- **Returns**: A fluid requirement with output direction.
- **Throws**: `IllegalArgumentException` if the fluid is unknown; amount and probability checks are handled by fluid requirement/recipe validation.
- **Defaults**: None.
- **Example**:

```javascript
const output = api.fluidOutputRequirement("minecraft:lava", 250, 0.5)
```

#### Modifiers and Levels

##### `modifier(String target, String scope, double value, String operation, boolean chance) → MachineModifier.Numeric`

- **Parameters**: `target` (`String`) — `duration`, `energy`, `chemical`, `heat`, `output`, `parallelism`, `factory_threads`, or `recipe_threads`; `scope` (`String`) — the target's corresponding `input`, `output`, `machine`, or `recipe` scope; `value` (`double`) — modifier value; `operation` (`String`) — `add`, `multiply`, `subtract`, or `divide`; `chance` (`boolean`) — whether to affect output/chemical probabilities.
- **Returns**: A numeric machine modifier.
- **Throws**: `IllegalArgumentException` if the target and scope do not match, the operation is unknown, the value is not finite, or the target does not support `chance`.
- **Defaults**: None; `target` and `scope` are required.
- **Example**:

```javascript
const modifier = api.modifier("duration", "input", 0.5, "multiply", false)
```

Numeric targets map to scopes as follows: `duration` / `energy` / `chemical` / `heat` use `input`; `output` uses `output`; `parallelism` / `factory_threads` use `machine`; `recipe_threads` uses `recipe`. `chemical` supports `chance`, but `heat` does not. `parallelized` is a boolean target; use the boolean overload below.

##### `modifier(String target, String scope, boolean value) → MachineModifier.Parallelized`

- **Parameters**: `target` must be `parallelized`, and `scope` must be `recipe`; `value` (`boolean`) — whether to enable recipe parallelization.
- **Returns**: A boolean parallelization modifier.
- **Throws**: `IllegalArgumentException` if the target or scope is not `parallelized` / `recipe`.
- **Example**:

```javascript
const parallelized = api.modifier("parallelized", "recipe", true)
```

##### `modifierDefinition(List<MachineModifier> modifiers) → ModifierDefinition`

- **Parameters**: `modifiers` (`List<MachineModifier>`) — a list of numeric modifiers and/or parallelization modifiers.
- **Returns**: An immutable `ModifierDefinition` that can be passed to `registerModifier`.
- **Throws**: A `null` list is treated as an empty list; `null` elements in the list are rejected.
- **Defaults**: The public record treats a `null` list as empty; scripts should explicitly pass an array.
- **Example**:

```javascript
const definition = api.modifierDefinition([
    api.modifier("duration", "input", 0.75, "multiply", false)
])
```

##### `modifierUse(String modifierId, BlockPredicate replacement) → ModifierUse`

- **Parameters**: `modifierId` (`String`) — registered modifier ID; `replacement` (internal `BlockPredicate`) — predicate for blocks that may be replaced when using the modifier.
- **Returns**: A `ModifierUse` for structure requirements.
- **Throws**: `IllegalArgumentException` if the ID is invalid, `any()` is supplied as a modifier replacement predicate, or the replacement is null or its structural form cannot be converted.
- **Defaults**: None.
- **Example**:

```javascript
const use = api.modifierUse("example:speed", api.block("minecraft:diamond_block"))
structure.modifier("M", use)
```

##### `levelRequirement(String typeId, String levelId) → LevelRequirement`

- **Parameters**: `typeId` (`String`) — level type ID; `levelId` (`String`) — specific level ID.
- **Returns**: A recipe level requirement bound to a type and level.
- **Throws**: `IllegalArgumentException` if the type or level is unregistered or the level belongs to another type. If `typeId` / `levelId` is an invalid `Identifier` string (it cannot be split into a namespace and path using `:`), `Identifier.parse(...)` throws `IllegalArgumentException`.
- **Defaults**: None.
- **Example**:

```javascript
const requirement = api.levelRequirement("example:coil", "example:coil_iron")
```

##### `stageRequirement(int minStage) → StageRequirement`

- **Parameters**: `minStage` (`int`) — minimum structure stage, from 1 to 64.
- **Returns**: An input-direction structure stage requirement that can be passed to `MachineRecipeBuilderJS.addRequirement(...)`.
- **Throws**: `IllegalArgumentException` if `minStage` is below 1 or above 64.
- **Example**:

```javascript
const requirement = api.stageRequirement(2)
```

##### `levelSlot(String typeId) → LevelSlot`

- **Parameters**: `typeId` (`String`) — registered level type ID.
- **Returns**: A level slot that can be assigned to a structure character.
- **Throws**: `IllegalArgumentException` if the level type is unregistered.
- **Defaults**: None.
- **Example**:

```javascript
structure.set("L", api.levelSlot("example:coil"))
```

#### Smart Interfaces

##### `smartInterfaceInput(String type, float min, float max) → SmartInterfaceRequirement`

- **Parameters**: `type` (`String`) — smart interface type in the machine definition; `min` (`float`) — minimum input value; `max` (`float`) — maximum input value.
- **Returns**: A ranged input requirement.
- **Throws**: The smart interface requirement constructor throws an exception if the range is invalid or the type is empty.
- **Defaults**: None.
- **Example**:

```javascript
const requirement = api.smartInterfaceInput("temperature", 10, 50)
```

##### `smartInterfaceOutput(String type, float value) → SmartInterfaceRequirement`

- **Parameters**: `type` (`String`) — smart interface type; `value` (`float`) — required output value.
- **Returns**: A fixed-value output requirement.
- **Throws**: The smart interface requirement constructor throws an exception if the type or value is invalid.
- **Defaults**: None.
- **Example**:

```javascript
const requirement = api.smartInterfaceOutput("mode", 2)
```

#### Custom Data and Networking

##### `networkInterfaces(MachineBehaviorContext context) → List<NetworkInterfaceReference>`

- **Parameters**: `context` (`MachineBehaviorContext`) — current machine behavior callback context.
- **Returns**: A list of network interface references visible to the currently formed machine, sorted in ascending order by block position `(x, y, z)`. Returns an empty list if the machine is not formed, `context` is not on a `ServerLevel`, or no network interfaces exist.
- **Throws**: `NullPointerException("context")` if the context is null; other errors are obtained synchronously on the MMCR main thread.
- **Defaults**: Returns an empty list when no interfaces exist.
- **Example**:

```javascript
machine.tickBehavior(behavior => behavior.serverTick(ctx => {
    const interfaces = api.networkInterfaces(ctx)
}))
```

##### `sendRequest(NetworkInterfaceReference source, MachineReference target, String requestId, Object body) → void`

- **Parameters**: `source` (`NetworkInterfaceReference`) — interface sending the request; `target` (`MachineReference`) — target machine reference; `requestId` (`String`) — request handler ID; `body` (`Object`) — script object convertible to a map with string keys.
- **Returns**: Nothing; the MMCR network system delivers the request asynchronously, and the target machine invokes `requestProcess(requestId, ...)` on the next tick.
- **Throws**: `NullPointerException("source"/"target"/"body")` or `IllegalArgumentException("requestId must not be blank")` if an argument is null or empty; `IllegalArgumentException("Target is not connected to the source interface")` if the target is not in `source`'s connection list. `body` must be convertible to a map with string keys; keys cannot be empty or non-string values.
- **Defaults**: An empty map is accepted as a request body; providing at least one application-specific field is recommended.
- **Example**:

```javascript
const iface = api.networkInterfaces(ctx).get(0)
const target = iface.connections().get(0)
api.sendRequest(iface, target, "example:report", { power: 20 })
```

In actual callbacks, check whether the interface and connection lists are empty before accessing their first elements. `sendRequest` first converts the request body to the underlying `DataValue.MAP`, then parses `requestId` and enqueues the request; format errors do not return an asynchronous failure result.

##### Network Runtime Types

These references reside in `cn.howxu.mmcr.api.network` and are created by the server. Do not replace them with the `publicapi.network` types used by addon mods:

| Type | Public accessors and purpose |
| --- | --- |
| `NetworkInterfaceReference` | `position() → BlockPos`, `connections() → List<MachineReference>`. The connection list is empty if the endpoint is invalid, the dimension is missing, or the chunk is not loaded. There are no public `server()` / `source()` methods, so it cannot be used to bypass the facade when sending requests. |
| `MachineReference` | Record: `type() → Identifier`, `hash() → long`; represents the machine type and stable identity, rather than a block position. |
| `RequestBody` | `values() → Map<String, DataValue>`, `get(String key) → Optional<DataValue>`; an immutable request body. `of(Map<String, DataValue>)` rejects blank keys and null values; scripts typically let `sendRequest` construct it. |
| `RequestInfo` | Record: `requestId() → Identifier`, `peer() → MachineReference`; success callbacks use it to read the request ID and peer identity. |

`requestFailed` uses `RequestBody` / `RequestInfo` / `RequestFailureReason` from `api.network.view`, along with `api.data.view.DataStorage`; `requestProcess` uses the underlying objects in the table above and `api.data.DataStorage`. They have similar accessors in scripts, but their Java signatures differ.

##### `dataValue(Object value) → DataValue`

- **Parameters**: `value` (`Object`) — a `DataValue`, JavaScript object/map, collection, array, boolean, string, integer, floating-point number, `BigInteger`, or `BigDecimal`.
- **Returns**: An immutable `DataValue` produced by recursive conversion.
- **Throws**: `IllegalArgumentException` if the value is `null`, a map key is not a nonempty string, a floating-point number is not finite, or the object type is unsupported.
- **Defaults**: An existing `DataValue` is returned unchanged; collections and arrays are converted to lists.
- **Example**:

```javascript
const value = api.dataValue({ power: 20, labels: ["active", "safe"] })
ctx.dataStorage().set("state", value)
```

:::warning Notes

- Block predicate factories check the registry entry for `block` immediately, while tag predicates allow tags to be resolved later during resource binding.
- Property names and values in `state` must exactly match the corresponding block's state definition.
- Port IDs in `portRequirements` are registered port names, not block tags; write ranges as two-element JavaScript arrays.
- `customRecipeIo` accepts only types with registered codecs; arbitrary JSON does not automatically become custom IO.
- Map values in `dataValue` are also converted recursively; the root object of a network request must be a map, so a single number or string cannot be sent directly.
- `DataStorage.set(...)` now also accepts supported plain script values; call `api.dataValue(...)` only when you need an explicit typed wrapper or a value for a network request.
- The API facade's `smartInterfaceInput` has only a range signature; for a fixed-value requirement, use equal `min` and `max` values or the programmatic recipe builder's fixed-value overload.
:::

#### `DataValue`

Fully qualified class name: `cn.howxu.mmcr.api.data.DataValue`

`DataValue` is an immutable, type-tagged value wrapper used for data storage and network requests. In KubeJS,
you cannot call its constructor directly; create it through [`api.dataValue(...)`](#datavalue-object-value-→-datavalue)
instead. It does not implicitly convert between numeric types: an `Integer` does not automatically become a `Long`. When reading,
use the `asXxx()` accessor that matches the type written.

The implementation class declared by the KubeJS facade is `cn.howxu.mmcr.api.data.DataValue`; the Java public API's
`cn.howxu.mmcr.publicapi.data.DataValue` is a separate public view for external mods.
Do not mix the two in Java code. Scripts can use the object returned by `api.dataValue(...)` directly.

##### Supported Types

| `DataValueType` | Java type | KubeJS input example |
| --- | --- | --- |
| `BOOLEAN` | `Boolean` | `true` / `false` |
| `STRING` | `String` | `"running"` |
| `BYTE` | `Byte` | `Byte.valueOf(1)` |
| `SHORT` | `Short` | `Short.valueOf(1)` |
| `INT` | `Integer` | `1` |
| `LONG` | `Long` | `Long.valueOf(1)` |
| `FLOAT` | `Float` | `Float.valueOf(1.5)` |
| `DOUBLE` | `Double` | `1.5` |
| `BIG_INTEGER` | `BigInteger` | `new BigInteger("100000000000000000000")` |
| `BIG_DECIMAL` | `BigDecimal` | `new BigDecimal("1.5")` |
| `LIST` | `List<DataValue>` | JavaScript array or Java `Collection` |
| `MAP` | `Map<String, DataValue>` | JavaScript object or Java `Map` |

`api.dataValue(value)` performs recursive conversion in the following order:

- An existing `DataValue` is returned unchanged.
- JavaScript objects/Java `Map` instances are converted to `MAP`; keys must be nonempty strings, and values are converted recursively.
- JavaScript arrays, Java `Collection` instances, and Java arrays are converted to `LIST`; each element is converted recursively.
- Booleans, strings, `Byte`, `Short`, `Integer`, `Long`, `Float`, `Double`, `BigInteger`, and `BigDecimal` are converted to their corresponding scalar types.
- `null`, blank map keys, `NaN`, positive or negative infinity, and other Java objects all cause `IllegalArgumentException`.

##### `type() → DataValueType`

Returns the current value's type tag. The tag describes only the type actually written, not a numeric range to which the value can be converted.

##### `value() → Object`

Returns the internal value. Scalars return the corresponding Java wrapper type; composite values return `List<DataValue>` or
`Map<String, DataValue>`. Prefer `type()` and `asXxx()` for reliable type checks.

##### Safe Accessors `asXxx() → Optional<...>`

Returns a value only when the type matches exactly; otherwise, returns `Optional.empty()`. No numeric conversion is performed.

| Method | Return type | Matching type |
| --- | --- | --- |
| `asBoolean()` | `Optional<Boolean>` | `BOOLEAN` |
| `asString()` | `Optional<String>` | `STRING` |
| `asByte()` | `Optional<Byte>` | `BYTE` |
| `asShort()` | `Optional<Short>` | `SHORT` |
| `asInt()` | `Optional<Integer>` | `INT` |
| `asLong()` | `Optional<Long>` | `LONG` |
| `asFloat()` | `Optional<Float>` | `FLOAT` |
| `asDouble()` | `Optional<Double>` | `DOUBLE` |
| `asBigInteger()` | `Optional<BigInteger>` | `BIG_INTEGER` |
| `asBigDecimal()` | `Optional<BigDecimal>` | `BIG_DECIMAL` |
| `asList()` | `Optional<List<DataValue>>` | `LIST` |
| `asMap()` | `Optional<Map<String, DataValue>>` | `MAP` |

##### Typed Accessors `xxxValue() → ...`

`booleanValue()`, `stringValue()`, `byteValue()`, `shortValue()`, `intValue()`,
`longValue()`, `floatValue()`, `doubleValue()`, `bigIntegerValue()`, and
`bigDecimalValue()` return values without an `Optional` wrapper. A type mismatch throws
`IllegalStateException`, so scripts should generally prefer `asXxx().orElse(...)`.

##### Example

```javascript
const BigInteger = Java.loadClass("java.math.BigInteger")
const api = MMCR.getAPI()

const state = api.dataValue({
    enabled: true,
    count: 3,
    energy: new BigInteger("12345678901234567890"),
    labels: ["active", "stored"]
})

const energy = state.asMap()
    .orElseThrow()
    .get("energy")
    .asBigInteger()
    .orElse(BigInteger.ZERO)
```

:::warning Notes

- `asInt()`, `asLong()`, `asBigInteger()`, and similar accessors read only their corresponding tags; they do not convert other integer types.
- `LIST` and `MAP` are immutable containers; their elements or key-value entries cannot be modified after the `DataValue` is created.
- For network requests, the root value must be `MAP`; passing a number, string, or list directly to `sendRequest(...)` is rejected.
- For the Java public view of `DataValue`, `DataStorage`, and transactional writes, see [Java API: Data and repositories](./JavaAPI#_14-data-and-repositories).
:::

## 5. Machine Definition Builders

### `MachineBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.MachineBuilderJS` is the machine registration builder used in startup scripts, created by `MMCRStartupEventJS.createMachine`.

**Fields**

| Name | Type | Default | Description |
|------|------|------|------|
| `displayNameKey` | `String` | `null` | Translation key for the machine's display name. |
| `controllerFrontTexture` | `Identifier` | Automatic default | Controller front texture. |
| `controllerSideTexture` | `Identifier` | Automatic default | Controller side texture. |
| `controllerTopTexture` | `Identifier` | Automatic default | Controller top texture. |
| `controllerBottomTexture` | `Identifier` | Automatic default | Controller bottom texture. |
| `controllerIdleOverlayTexture` | `Identifier` | Unset | Controller idle-state overlay texture. |
| `controllerActiveOverlayTexture` | `Identifier` | Unset | Controller active-state overlay texture. |
| `allowVerticalFacing` | `boolean` | `false` | Whether the controller may face vertically. |
| `fullyRotationallySymmetric` | `boolean` | `false` | Whether the machine is fully rotationally symmetric. |
| `requireVerticalFacing` | `boolean` | `false` | Whether vertical facing is required. |
| `allowModifiers` | `boolean` | `false` | Whether machine modifiers are allowed. |
| `allowMultithreading` | `boolean` | `false` | Whether factory multithreading is allowed. |
| `allowParallelism` | `boolean` | `false` | Whether parallel controllers are allowed. |
| `maxParallelAmount` | `long` | `1` | Maximum parallel count. |
| `machineBasicBlock` | `Identifier` | Appearance default | Base block for the machine's appearance. |
| `controllerBaseTexture` | `Identifier` | Appearance default | Controller base texture. |
| `formedPortBaseTexture` | `Identifier` | Appearance default | Base texture for formed ports. |
| `runningSoundId` | `Identifier` | `null` | Running sound. |
| `finishSoundId` | `Identifier` | `null` | Completion sound. |

**Creation**

The public constructors are `MachineBuilderJS(Identifier id)` and `MachineBuilderJS(String id)`; neither has `@HideFromJS`. Scripts typically use `event.createMachine(id)` to make the startup window in which the declaration occurs clearer.

**Methods**

#### Basic Properties and Behavior

##### `displayNameKey(String key) → MachineBuilderJS`

- **Parameters**: `key` (`String`) — translation key; `machine.namespace.path` is recommended.
- **Returns**: The current builder.
- **Throws**: The source performs no null check; downstream registration records handle invalid display names.
- **Defaults**: When unset, the machine registration object uses the default display name fallback.
- **Example**:

```javascript
const machine = event.createMachine("example:press").displayNameKey("machine.example.press")
```

##### `localizedName(String name) → MachineBuilderJS`

- **Parameters**: `name` (`String`) — legacy name parameter.
- **Returns**: The current builder, equivalent to `displayNameKey(name)`.
- **Throws**: Same as `displayNameKey`.
- **Defaults**: None.
- **Example**:

```javascript
const machine = event.createMachine("example:press").localizedName("machine.example.press")
```
::: warning
This method is marked `@Deprecated(forRemoval = true)`; new scripts should use `displayNameKey`.
:::

##### `recipePool(String... recipePoolIds) → MachineBuilderJS`

- **Parameters**: `recipePoolIds` (`String...`) — ordered list of recipe pool IDs, with at least one entry and no duplicates.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if no IDs are provided, an ID is invalid, or the list contains duplicate IDs.
- **Defaults**: The machine's own ID.
- **Example**:

```javascript
machine.recipePool("example:press", "example:secondary_press")
```

The list order is preserved and determines the machine's recipe pool selection order. A machine can belong to multiple recipe pools, but each recipe still specifies only one `recipe_pool`.

##### `expandableStructure() → MachineBuilderJS`

- **Parameters**: None.
- **Returns**: The current builder, with expandable structures set to `true`.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.expandableStructure()
```

##### `expandableStructure(boolean expandableStructure) → MachineBuilderJS`

- **Parameters**: `expandableStructure` (`boolean`) — whether structure expansion stages are allowed.
- **Returns**: The current builder.
- **Throws**: None; consistency between structure stages and this setting is validated at runtime.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.expandableStructure(true)
```

##### `role(String role) → MachineBuilderJS`

- **Parameters**: `role` (`String`) — `NORMAL`, `HOST`, or `MODULE`, parsed case-insensitively.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the role is not one of the three valid values; `createObject()` also throws if the role conflicts with the `host`/`module` declarations.
- **Defaults**: `NORMAL`, with no explicitly assigned role.
- **Example**:

```javascript
machine.role("host").host("example:module")
```

##### `host(String... moduleIds) → MachineBuilderJS`

- **Parameters**: `moduleIds` (`String...`) — module machine IDs accepted by this host; duplicates are removed while preserving insertion order.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if a non-null ID cannot be parsed; an explicit `HOST` role with no modules throws at build time.
- **Defaults**: An empty set; a `null` array or `null` entries in the array are ignored.
- **Example**:

```javascript
machine.role("HOST").host("example:module_a", "example:module_b")
```

##### `module() → MachineBuilderJS`

- **Parameters**: None.
- **Returns**: The current builder, with the module flag set to `true`.
- **Throws**: An exception at build time if it conflicts with an explicit `role`.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.module()
```

##### `module(boolean module) → MachineBuilderJS`

- **Parameters**: `module` (`boolean`) — whether this is a module machine.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` during `createObject()` or `register()` if it conflicts with an explicit role.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.module(true)
```

##### `factoryThreads(int factoryThreads) → MachineBuilderJS`

- **Parameters**: `factoryThreads` (`int`) — factory thread limit.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the value is below `1`.
- **Defaults**: `1`.
- **Example**:

```javascript
machine.allowMultithreading().factoryThreads(4)
```

##### `allowMultithreading() → MachineBuilderJS`

- **Parameters**: None.
- **Returns**: The current builder, with multithreading enabled.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.allowMultithreading()
```

##### `allowMultithreading(boolean allow) → MachineBuilderJS`

- **Parameters**: `allow` (`boolean`) — whether multithreading is allowed.
- **Returns**: The current builder.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.allowMultithreading(false)
```

##### `allowParallelism() → MachineBuilderJS`

- **Parameters**: None.
- **Returns**: The current builder, with parallel processing enabled.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.allowParallelism()
```

##### `allowParallelism(boolean allow) → MachineBuilderJS`

- **Parameters**: `allow` (`boolean`) — whether parallel controllers are allowed.
- **Returns**: The current builder.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.allowParallelism(true)
```

##### `maxParallelAmount(long amount) → MachineBuilderJS`

- **Parameters**: `amount` (`long`) — maximum parallel count; supports long integers above `Integer.MAX_VALUE`.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if final machine registration validation finds that the count is below `1`.
- **Defaults**: `1`.
- **Example**:

```javascript
machine.maxParallelAmount(32)
```

##### `maxParallelism(long maxParallelism) → MachineBuilderJS`

- **Parameters**: `maxParallelism` (`long`) — alias parameter for `maxParallelAmount`.
- **Returns**: The current builder, equivalent to `maxParallelAmount(maxParallelism)`.
- **Throws**: Same as `maxParallelAmount`.
- **Defaults**: `1`.
- **Example**:

```javascript
machine.maxParallelism(32)
```

##### `allowModifiers() → MachineBuilderJS`

- **Parameters**: None.
- **Returns**: The current builder, with machine modifiers allowed.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.allowModifiers()
```

##### `allowModifiers(boolean allow) → MachineBuilderJS`

- **Parameters**: `allow` (`boolean`) — whether machine modifiers are allowed.
- **Returns**: The current builder.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.allowModifiers(true)
```

##### `allowParallelism()` / `allowParallelism(boolean allow) → MachineBuilderJS`

Enables or explicitly sets parallel controller support, which defaults to `false`; the no-argument overload is equivalent to passing `true`. Returns the current builder without immediately changing the parallel count. Use it with `maxParallelAmount(long)` to set the machine limit; whether a recipe can run in parallel is still determined by the recipe's `parallelized` setting.

```javascript
machine.allowParallelism().maxParallelAmount(32)
```

#### Controller and Appearance

##### `controllerSpec(MachineControllerSpec controllerSpec) → MachineBuilderJS`

- **Parameters**: `controllerSpec` (`MachineControllerSpec`) — a fully constructed controller specification.
- **Returns**: The current builder.
- **Throws**: The source does not immediately check for `null`; passing `null` falls back to an automatically derived specification.
- **Defaults**: Derived from the texture, facing, and tooltip fields.
- **Example**:

```javascript
const spec = Java.loadClass("cn.howxu.mmcr.api.machine.MachineControllerSpec").defaultsFor(api.id("example:press"))
machine.controllerSpec(spec)
```

##### `controllerTooltip(String... lines) → MachineBuilderJS`

- **Parameters**: `lines` (`String...`) — tooltip translation keys or text lines; blank lines and `null` entries are ignored.
- **Returns**: The current builder.
- **Throws**: No additional exceptions; a `null` array adds no content.
- **Defaults**: An empty list.
- **Example**:

```javascript
machine.controllerTooltip("tooltip.example.press.0", "tooltip.example.press.1")
```

##### `controllerTextures(String front, String otherFive) → MachineBuilderJS`

- **Parameters**: `front` (`String`) — front texture ID; `otherFive` (`String`) — texture ID shared by the remaining directions.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if either ID cannot be parsed.
- **Defaults**: Uses the default controller textures when not called.
- **Example**:

```javascript
machine.controllerTextures("example:block/controller_front", "example:block/controller_side")
```

##### `controllerFrontTexture(String texture) → MachineBuilderJS`

- **Parameters**: `texture` (`String`) — front texture resource ID.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed.
- **Defaults**: The controller specification's default front texture.
- **Example**:

```javascript
machine.controllerFrontTexture("example:block/controller_front")
```

##### `controllerSideTexture(String texture) → MachineBuilderJS`

- **Parameters**: `texture` (`String`) — side texture resource ID.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed.
- **Defaults**: The controller specification's default side texture.
- **Example**:

```javascript
machine.controllerSideTexture("example:block/controller_side")
```

##### `controllerTopTexture(String texture) → MachineBuilderJS`

- **Parameters**: `texture` (`String`) — top texture resource ID.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed.
- **Defaults**: The controller specification's default top texture.
- **Example**:

```javascript
machine.controllerTopTexture("example:block/controller_top")
```

##### `controllerBottomTexture(String texture) → MachineBuilderJS`

- **Parameters**: `texture` (`String`) — bottom texture resource ID.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed.
- **Defaults**: The controller specification's default bottom texture.
- **Example**:

```javascript
machine.controllerBottomTexture("example:block/controller_bottom")
```

##### `controllerTopTexture(String texture)` / `controllerBottomTexture(String texture) → MachineBuilderJS`

Sets the controller's top and bottom texture IDs, respectively, stores the parsed IDs in the corresponding fields, and returns the current builder; invalid ID syntax throws an exception. When unset, the corresponding default textures from `MachineControllerSpec.defaultsFor(id)` are used. Like the front/side methods, each has an `Identifier` overload hidden by `@HideFromJS`.

##### `controllerIdleOverlayTexture(String texture) → MachineBuilderJS`

- **Parameters**: `texture` (`String`) — resource ID for the controller's idle-state overlay texture.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed.
- **Defaults**: No idle overlay texture is rendered.
- **Example**:

```javascript
machine.controllerIdleOverlayTexture("example:block/controller_idle_overlay")
```

##### `controllerActiveOverlayTexture(String texture) → MachineBuilderJS`

- **Parameters**: `texture` (`String`) — resource ID for the controller's active-state overlay texture.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed.
- **Defaults**: No active overlay texture is rendered.
- **Example**:

```javascript
machine.controllerActiveOverlayTexture("example:block/controller_active_overlay")
```

##### `allowVerticalFacing() → MachineBuilderJS`

- **Parameters**: None.
- **Returns**: The builder, with vertical facing enabled.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.allowVerticalFacing()
```

##### `allowVerticalFacing(boolean allow) → MachineBuilderJS`

- **Parameters**: `allow` (`boolean`) — whether vertical facing is allowed.
- **Returns**: The current builder.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.allowVerticalFacing(true)
```

##### `fullyRotationallySymmetric() → MachineBuilderJS`

- **Parameters**: None.
- **Returns**: The builder, with full rotational symmetry enabled.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.fullyRotationallySymmetric()
```

##### `fullyRotationallySymmetric(boolean symmetric) → MachineBuilderJS`

- **Parameters**: `symmetric` (`boolean`) — whether the machine is fully rotationally symmetric.
- **Returns**: The current builder.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.fullyRotationallySymmetric(true)
```

##### `requireVerticalFacing() → MachineBuilderJS`

- **Parameters**: None.
- **Returns**: The builder, with vertical facing required; also automatically enables `allowVerticalFacing`.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.requireVerticalFacing()
```

##### `requireVerticalFacing(boolean required) → MachineBuilderJS`

- **Parameters**: `required` (`boolean`) — whether vertical facing is required; setting it to `true` also allows vertical facing.
- **Returns**: The current builder.
- **Throws**: None.
- **Defaults**: `false`.
- **Example**:

```javascript
machine.requireVerticalFacing(true)
```

##### `machineBasicBlock(String blockId) → MachineBuilderJS`

- **Parameters**: `blockId` (`String`) — base appearance block ID.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed; missing resources are handled by the appearance system.
- **Defaults**: The appearance's default base block.
- **Example**:

```javascript
machine.machineBasicBlock("minecraft:smooth_basalt")
```

##### `controllerBaseTexture(String textureId) → MachineBuilderJS`

- **Parameters**: `textureId` (`String`) — controller base texture ID.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed.
- **Defaults**: Derived from the base appearance block.
- **Example**:

```javascript
machine.controllerBaseTexture("example:block/controller_base")
```

##### `formedPortBaseTexture(String textureId) → MachineBuilderJS`

- **Parameters**: `textureId` (`String`) — base texture ID for formed ports.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed.
- **Defaults**: Derived from the base appearance block.
- **Example**:

```javascript
machine.formedPortBaseTexture("example:block/formed_port_base")
```

##### `appearance(String machineBasicBlock) → MachineBuilderJS`

- **Parameters**: `machineBasicBlock` (`String`), the base appearance block ID.
- **Returns**: Equivalent to `machineBasicBlock(machineBasicBlock)`.
- **Throws**: Same as `machineBasicBlock(String)`.
- **Default**: The default appearance.
- **Example**:

```javascript
machine.appearance("minecraft:green_terracotta")
```

#### Behavior Callbacks

##### `recipeBehavior(Consumer<MachineBehaviorBuilderJS> builder) → MachineBuilderJS`

- **Parameters**: `builder` (`Consumer<MachineBehaviorBuilderJS>`), a callback for configuring recipe behavior.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if tick behavior has already been selected; a null callback is also rejected.
- **Default**: `RecipeBehavior.defaults()`.
- **Example**:

```javascript
machine.recipeBehavior(behavior => behavior.recipeTick(ctx => {
    ctx.machineContext().screenText().append(api.screenScope().OPERATION, api.id("example:running"), Text.literal("Running"))
}))
```

##### `tickBehavior(Consumer<MachineBehaviorBuilderJS> builder) → MachineBuilderJS`

- **Parameters**: `builder` (`Consumer<MachineBehaviorBuilderJS>`), a callback for configuring direct server tick behavior.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if recipe behavior has already been selected or `preServerTick`/`postServerTick` has already been configured; a null callback is also rejected.
- **Default**: Uses the default recipe behavior if this method is not called.
- **Example**:

```javascript
machine.tickBehavior(behavior => behavior.serverTick(ctx => {
    if (!ctx.isDue(20)) return
    const plan = ctx.ioPlan()
}))
```

##### `preServerTick(Consumer<MachineBehaviorContext> callback) → MachineBuilderJS`

- **Parameters**: `callback` (`Consumer<MachineBehaviorContext>`), a callback executed before each server tick of a recipe machine.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if tick behavior has been selected; `NullPointerException` if the callback is null.
- **Default**: Uses the recipe behavior's default pre-tick callback.
- **Example**:

```javascript
machine.preServerTick(ctx => {
    const storage = ctx.dataStorage()
})
```

##### `postServerTick(Consumer<MachineBehaviorContext> callback) → MachineBuilderJS`

- **Parameters**: `callback` (`Consumer<MachineBehaviorContext>`), a callback executed after each server tick of a recipe machine.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if tick behavior has been selected; `NullPointerException` if the callback is null.
- **Default**: Uses the recipe behavior's default post-tick callback.
- **Example**:

```javascript
machine.postServerTick(ctx => {
    ctx.screenText().append(api.screenScope().OPERATION, api.id("example:tick"), Text.literal("Ticked"))
})
```

#### Networking

##### `networkInterface(int maxCount, int maxConnections) → MachineBuilderJS`

- **Parameters**: `maxCount` (`int`), the number of network interfaces allowed on the machine; `maxConnections` (`int`), the maximum number of connections allowed per network interface.
- **Returns**: The current builder.
- **Throws**: An exception during machine creation/registration if a value is negative or exceeds the registrar's constraints.
- **Default**: Both values are `0`, meaning network interface support is disabled.
- **Example**:

```javascript
machine.networkInterface(1, 16)
```

##### `allowNetworkMachine(String machineId) → MachineBuilderJS`

- **Parameters**: `machineId` (`String`), the ID of a target machine allowed to communicate with this machine.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed; the network registrar may validate the target during the final build.
- **Default**: The allowlist is empty.
- **Example**:

```javascript
machine.allowNetworkMachine("example:network_center")
```

##### `requestProcess(String requestId, RequestProcess process) → MachineBuilderJS`

- **Parameters**: `requestId` (`String`) — the request ID; `process` (`cn.howxu.mmcr.api.network.RequestProcess`) — a four-argument callback `(body, request, senderStorage, receiverStorage)`. `body` and `request` are `api.network.RequestBody` and `api.network.RequestInfo`, respectively; use `body.get("power").flatMap(v => v.asDouble())` to retrieve a value and `request.peer().hash()` to read the peer identifier. Both storage arguments are underlying `api.data.DataStorage` objects and are `null` when no data storage is present, so check for null. This success callback uses `requestProcessInternal`, rather than a `publicapi` callback.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed, is empty, or is registered more than once; `NullPointerException` if the handler is null.
- **Default**: No handler.
- **Example**:

```javascript
machine.requestProcess("example:report", (body, request, senderStorage, receiverStorage) => {
    if (receiverStorage == null) return
    const reported = body.get("power").flatMap(v => v.asDouble()).orElse(0)
    receiverStorage.set("power_" + request.peer().hash(), api.dataValue(reported))
})
```

##### `requestFailed(String requestId, RequestFailed failure) → MachineBuilderJS`

- **Parameters**: `requestId` (`String`) — the request ID; `failure` (`cn.howxu.mmcr.api.network.view.RequestFailed`) — a four-argument failure callback `(body, request, senderStorage, reason)`. Here, `body` / `request` / `reason` are views under `api.network.view`, and `senderStorage` is a nullable `api.data.view.DataStorage`. The success and failure callbacks use different sets of Java types.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID is invalid or duplicated; `NullPointerException` if the failure handler is null.
- **Default**: No failure handler.
- **Example**:

```javascript
machine.requestFailed("example:report", (body, request, senderStorage, reason) => {
    console.warn("request failed:", String(reason), "peer", String(request.peer().hash()))
})
```

#### Sounds

##### `runningSound(String soundId) → MachineBuilderJS`

- **Parameters**: `soundId` (`String`), a registered sound event ID.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed; `ApiRegistrationException` if the sound ID fails MMCR sound validation.
- **Default**: No running sound.
- **Example**:

```javascript
machine.runningSound("minecraft:block.furnace.fire_crackle")
```

##### `finishSound(String soundId) → MachineBuilderJS`

- **Parameters**: `soundId` (`String`), a registered sound event ID.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID cannot be parsed; `ApiRegistrationException` if the sound ID is unregistered or invalid.
- **Default**: No completion sound.
- **Example**:

```javascript
machine.finishSound("minecraft:entity.ender_dragon.growl")
```

#### Smart Interfaces

##### `smartInterface(String type, float defaultValue) → SmartInterfaceTypeBuilderJS`

- **Parameters**: `type` (`String`) — the smart interface type name; `defaultValue` (`float`) — the default value, also used as the minimum for this overload.
- **Returns**: A temporary `SmartInterfaceTypeBuilderJS`; you must call `end()` to add it to the machine.
- **Throws**: `IllegalArgumentException` during `end()`/machine construction if the type is empty or the final range is invalid.
- **Default**: The maximum is `Float.MAX_VALUE`, the priority is `0`, and the value type is `float`.
- **Example**:

```javascript
machine.smartInterface("speed", 1).end()
```

##### `smartInterface(String type, float minValue, float maxValue) → SmartInterfaceTypeBuilderJS`

- **Parameters**: `type` (`String`) — the type name; `minValue` (`float`) — the minimum; `maxValue` (`float`) — the maximum.
- **Returns**: A temporary builder for configuring the smart interface type.
- **Throws**: `IllegalArgumentException` if the range contains nonfinite values, the minimum exceeds the maximum, or an integer type's range contains fractional values.
- **Default**: The default value is `minValue`, the priority is `0`, and the value type is `float`.
- **Example**:

```javascript
machine.smartInterface("temperature", 0, 100).priority(5).end()
```

##### `shareSmartInterface() → MachineBuilderJS`

- **Parameters**: None.
- **Returns**: Enables a single smart interface block to bind to multiple controllers of the same machine type, and returns the builder.
- **Throws**: None.
- **Default**: `false`.
- **Example**:

```javascript
machine.shareSmartInterface()
```

##### `shareSmartInterface(boolean share) → MachineBuilderJS`

- **Parameters**: `share` (`boolean`), whether a single smart interface block can bind to multiple controllers of the same machine type; when enabled, these controllers read the same interface values.
- **Returns**: The current builder.
- **Throws**: None.
- **Default**: `false`.
- **Example**:

```javascript
machine.shareSmartInterface(true)
```

:::warning Current Implementation Note

After machine modifiers were unified, `itemInputByInterface(...)`, `itemInputChanceByInterface(...)`, `fluidInputByInterface(...)`, and `fluidInputChanceByInterface(...)` remain on the builder, but current target validation does not accept input scopes for `item` / `fluid`, so calling them throws `IllegalArgumentException`. `durationByInterface(...)`, `energyByInterface(...)`, chemical input/output methods, heat input/output methods, and the other output-side variants use supported targets.
:::

##### `durationByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type` (`String`) — the smart interface type; `min`/`max` (`float`) — the active range; `atMin`/`atMax` (`float`) — the duration modifier values at the range endpoints.
- **Returns**: The current builder; the default operation is `MULTIPLY`.
- **Throws**: An exception during machine definition construction if the range or interface type is invalid.
- **Default**: The operation is multiplication.
- **Example**:

```javascript
machine.durationByInterface("temperature", 0, 100, 2, 0.5)
```

##### `durationByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **Parameters**: The first five parameters are the same as above; `operation` (`RecipeModifier.Operation`) — `ADD`, `MULTIPLY`, `SUBTRACT`, or `DIVIDE`.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the smart interface range is invalid or `operation` is null or unsupported.
- **Default**: No additional defaults; you must explicitly supply an operation unless you use the five-argument overload.
- **Example**:

```javascript
const operation = MMCR.getAPI().modifierOperation()
machine.durationByInterface("temperature", 0, 100, 2, 0.5, operation.ADD)
```

##### `energyByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type`, `min`, `max`, `atMin`, `atMax` — the same as `durationByInterface`, targeting energy consumption.
- **Returns**: The current builder; the default operation is multiplication.
- **Throws**: An exception during the final build if the range or type is invalid.
- **Default**: The operation is `MULTIPLY`.
- **Example**:

```javascript
machine.energyByInterface("mode", 1, 3, 1, 2)
```

##### `energyByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **Parameters**: The first five parameters are the same as above; `operation` (`RecipeModifier.Operation`), the operation to apply.
- **Returns**: The current builder.
- **Throws**: An exception if the operation or range is invalid.
- **Default**: No additional defaults.
- **Example**:

```javascript
const operation = MMCR.getAPI().modifierOperation()
machine.energyByInterface("mode", 1, 3, 1, 2, operation.MULTIPLY)
```

##### `itemInputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type`, `min`, `max`, `atMin`, `atMax`, the smart interface range and item input quantity modifier values.
- **Returns**: The current builder; targets item input quantity, with multiplication as the fixed operation.
- **Throws**: `IllegalArgumentException` when called, because current unified modifier target validation does not support `item` / `input`.

##### `itemOutputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type`, `min`, `max`, `atMin`, `atMax`, the item output quantity modifier parameters.
- **Returns**: The current builder; the operation is fixed to multiplication.
- **Throws**: An exception if the range or type is invalid.
- **Default**: Does not affect output chance.
- **Example**:

```javascript
machine.itemOutputByInterface("batch", 1, 4, 1, 4)
```

##### `itemInputChanceByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type`, `min`, `max`, `atMin`, `atMax`, the item input chance modifier parameters.
- **Returns**: The current builder; the default operation is multiplication and affects only input chance.
- **Throws**: `IllegalArgumentException` when called, because current unified modifier target validation does not support `item` / `input`.

##### `itemInputChanceByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **Parameters**: The first five parameters are the same as above; `operation` (`RecipeModifier.Operation`), the operation applied to the chance.
- **Returns**: The current builder.
- **Throws**: An exception if the operation or range is invalid; this input target also currently triggers `IllegalArgumentException` in unified modifier target validation.

##### `itemOutputChanceByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type`, `min`, `max`, `atMin`, `atMax`, the item output chance modifier parameters.
- **Returns**: The current builder; the default operation is multiplication, applied to output chance.
- **Throws**: An exception if the range or type is invalid.
- **Default**: The operation is `MULTIPLY`.
- **Example**:

```javascript
machine.itemOutputChanceByInterface("quality", 0, 1, 0.5, 1)
```

##### `itemOutputChanceByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **Parameters**: The first five parameters are the same as above; `operation` (`RecipeModifier.Operation`), the operation applied to the chance.
- **Returns**: The current builder.
- **Throws**: An exception if the operation, range, or type is invalid.
- **Default**: No additional defaults.
- **Example**:

```javascript
const operation = MMCR.getAPI().modifierOperation()
machine.itemOutputChanceByInterface("quality", 0, 1, 0.5, 1, operation.MULTIPLY)
```

##### `fluidInputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type`, `min`, `max`, `atMin`, `atMax`, the fluid input quantity modifier parameters.
- **Returns**: The current builder; the operation is fixed to multiplication.
- **Throws**: `IllegalArgumentException` when called, because current unified modifier target validation does not support `fluid` / `input`.

##### `fluidOutputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type`, `min`, `max`, `atMin`, `atMax`, the fluid output quantity modifier parameters.
- **Returns**: The current builder; the operation is fixed to multiplication.
- **Throws**: An exception if the range or type is invalid.
- **Default**: Does not affect fluid output chance.
- **Example**:

```javascript
machine.fluidOutputByInterface("pressure", 0, 100, 1, 2)
```

##### `fluidInputChanceByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type`, `min`, `max`, `atMin`, `atMax`, the fluid input chance modifier parameters.
- **Returns**: The current builder; the default operation is multiplication.
- **Throws**: `IllegalArgumentException` when called, because current unified modifier target validation does not support `fluid` / `input`.

##### `fluidInputChanceByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **Parameters**: The first five parameters are the same as above; `operation` (`RecipeModifier.Operation`) — the operation applied to the chance.
- **Returns**: The current builder.
- **Throws**: An exception if the operation or range is invalid; this input target also currently triggers `IllegalArgumentException` in unified modifier target validation.

##### `fluidOutputChanceByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type`, `min`, `max`, `atMin`, `atMax`, the fluid output chance modifier parameters.
- **Returns**: The current builder; the default operation is multiplication.
- **Throws**: An exception if the range or type is invalid.
- **Default**: The operation is `MULTIPLY`.
- **Example**:

```javascript
machine.fluidOutputChanceByInterface("quality", 0, 1, 0.5, 1)
```

##### `fluidOutputChanceByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **Parameters**: The first five parameters are the same as above; `operation` (`RecipeModifier.Operation`), the operation applied to the chance.
- **Returns**: The current builder.
- **Throws**: An exception if the operation or range is invalid.
- **Default**: No additional defaults.
- **Example**:

```javascript
const operation = MMCR.getAPI().modifierOperation()
machine.fluidOutputChanceByInterface("quality", 0, 1, 0.5, 1, operation.ADD)
```

##### `chemicalInputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type`, `min`, `max`, `atMin`, `atMax`: the smart interface type, input value range, and endpoint modifier values for chemical input quantity, respectively.
- **Returns**: The current builder; the default operation is `MULTIPLY`, applied to chemical input quantity.
- **Throws**: `IllegalArgumentException` if the smart interface range or type is invalid.

##### `chemicalOutputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: Same as `chemicalInputByInterface`, with endpoint modifier values applied to chemical output quantity.
- **Returns**: The current builder; the default operation is `MULTIPLY`.
- **Throws**: `IllegalArgumentException` if the smart interface range or type is invalid.

##### `chemicalInputChanceByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: Same as `chemicalInputByInterface`, with endpoint modifier values applied to the chance of consuming chemical inputs.
- **Returns**: The current builder; the default operation is `MULTIPLY`.
- **Throws**: `IllegalArgumentException` if the smart interface range or type is invalid.

##### `chemicalInputChanceByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **Parameters**: The first five parameters are the same as above; `operation` (`RecipeModifier.Operation`) — `ADD`, `MULTIPLY`, `SUBTRACT`, or `DIVIDE`.
- **Returns**: The current builder; affects the chance of consuming chemical inputs.
- **Throws**: `IllegalArgumentException` if the operation, range, or type is invalid.

##### `chemicalOutputChanceByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: Same as `chemicalInputByInterface`, with endpoint modifier values applied to chemical output chance.
- **Returns**: The current builder; the default operation is `MULTIPLY`.
- **Throws**: `IllegalArgumentException` if the smart interface range or type is invalid.

##### `chemicalOutputChanceByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **Parameters**: The first five parameters are the same as above; `operation` (`RecipeModifier.Operation`) — the operation applied to the chance.
- **Returns**: The current builder; affects chemical output chance.
- **Throws**: `IllegalArgumentException` if the operation, range, or type is invalid.

##### `heatInputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: `type`, `min`, `max`, `atMin`, `atMax`: the smart interface type, input value range, and endpoint modifier values for heat input, respectively.
- **Returns**: The current builder; the default operation is `MULTIPLY`, applied to the heat input value.
- **Throws**: `IllegalArgumentException` if the smart interface range or type is invalid.

##### `heatOutputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **Parameters**: Same as `heatInputByInterface`, with endpoint modifier values applied to the heat output value.
- **Returns**: The current builder; the default operation is `MULTIPLY`.
- **Throws**: `IllegalArgumentException` if the smart interface range or type is invalid.

Example:

```javascript
machine
    .chemicalInputByInterface("chemical_rate", 0, 100, 1, 2)
    .chemicalOutputChanceByInterface("quality", 0, 100, 0.5, 1, MMCR.getAPI().modifierOperation().MULTIPLY)
    .heatInputByInterface("temperature", 0, 100, 1, 1.5)
```

#### Port Predicate and Tier Shortcuts

`MachineBuilderJS` exposes the following factory methods, which return a `BlockPredicate` or `PortTierRequirementSpec` for use in structure configuration calls that accept these types.

| Method | Returns | Description |
| --- | --- | --- |
| `anyOfItemInput()` / `anyOfItemOutput()` | `BlockPredicate` | Union of item input/output ports. |
| `anyOfFluidInput()` / `anyOfFluidOutput()` | `BlockPredicate` | Union of fluid input/output ports. |
| `anyOfEnergyInput()` / `anyOfEnergyOutput()` | `BlockPredicate` | Union of energy input/output ports. |
| `anyOfItemPorts()` / `anyOfFluidPorts()` / `anyOfEnergyPorts()` | `BlockPredicate` | Union of inputs and outputs in the corresponding port family. |
| `anyOfChemicalPorts()` / `anyOfRadioactiveChemicalPorts()` / `anyOfHeatPorts()` | `BlockPredicate` | Union of Mekanism chemical, radioactive chemical, or heat ports. |
| `anyOfUpgradeBus()` | `BlockPredicate` | Union of all upgrade buses. |
| `anyOfPort(String...)` / `anyOfPort(Identifier...)` / `anyOfPort(api.machine.definition.BlockPredicate...)` | `BlockPredicate` | Union of the specified ports; the third overload accepts another underlying predicate type. |
| `parallelControllers()` | `BlockPredicate` | Built-in parallel controllers. For the factory controller predicate, use `api.factoryController()`; the machine builder does not have that method. |
| `smartInterfaceBlock()` / `smartInterface()` | `BlockPredicate` | Built-in smart interface predicate. |
| `dataStorage()` | `BlockPredicate` | Built-in data storage predicate. |
| `itemInputTier(String)` / `itemOutputTier(String)` | `PortTierRequirementSpec` | Minimum item port tier; see [Port Requirements](#port-requirements) for all available values. |
| `fluidInputTier(String)` / `fluidOutputTier(String)` | `PortTierRequirementSpec` | Minimum fluid port tier. |
| `energyInputTier(String)` / `energyOutputTier(String)` | `PortTierRequirementSpec` | Minimum energy port tier. |
| `chemicalInputTier(String)` / `chemicalOutputTier(String)` | `PortTierRequirementSpec` | Minimum chemical port tier: `basic`, `advanced`, `elite`, `ultimate`. |
| `radioactiveChemicalInputTier()` / `radioactiveChemicalOutputTier()` | `PortTierRequirementSpec` | Requires a radioactive chemical port to be present; no tier parameter. |
| `heatInputTier()` / `heatOutputTier()` | `PortTierRequirementSpec` | Requires a heat port to be present; no tier parameter. |

Mekanism chemical, radioactive chemical, and heat port predicates match no blocks when Mekanism is not loaded.

#### Finalization

##### `createObject() → MachineRegistration`

- **Parameters**: None.
- **Returns**: An immutable `MachineRegistration` containing all configured machine properties.
- **Throws**: `IllegalArgumentException`/`IllegalStateException`: see the role/host/module mutual exclusion rules above; `ApiRegistrationException` if a sound ID is invalid or the machine registration window has closed.
- **Default**: No explicit defaults; unset fields use the builder's initial values.
- **Example**:

```javascript
const registration = machine.createObject()
```

##### `registerObject() → void`

- **Parameters**: None.
- **Returns**: Nothing; calls `createObject()` and submits the result to the current machine registration window.
- **Throws**: Same as `createObject()`; `ApiRegistrationException` if the machine registration window has been frozen.
- **Default**: None.
- **Example**:

```javascript
machine.registerObject()
```

##### `register() → MachineBuilderJS`

- **Parameters**: None.
- **Returns**: The current builder for continued method chaining.
- **Throws**: Same as `registerObject()`.
- **Default**: None.
- **Example**:

```javascript
event.createMachine("example:press").displayNameKey("machine.example.press").register()
```

### `SmartInterfaceTypeBuilderJS`

> An inner class defined at `cn.howxu.mmcr.compat.kubejs.MachineBuilderJS.SmartInterfaceTypeBuilderJS`. Returned by `MachineBuilderJS.smartInterface(...)`; you must call `end()` to return to the parent builder.

**Fields**

| Name | Type | Description |
|------|------|------|
| `type` | `String` | Smart interface type name. |
| `minValue` | `float` | Minimum value. |
| `maxValue` | `float` | Maximum value. |
| `priority` | `int` | Priority, initially `0`. |
| `valueType` | `SmartInterfaceType.ValueType` | Value type, initially `FLOAT`. |

**Methods**

#### `priority(int priority) → SmartInterfaceTypeBuilderJS`

- **Parameters**: `priority` (`int`) — higher values take precedence.
- **Returns**: The current inner builder.
- **Throws**: None.
- **Default**: `0`.
- **Example**:

```javascript
machine.smartInterface("speed", 0, 100).priority(5).end()
```

#### `valueType(String valueType) → SmartInterfaceTypeBuilderJS`

- **Parameters**: `valueType` (`String`) — `float` (default), `int`, or `integer`; case-insensitive.
- **Returns**: The current inner builder.
- **Throws**: `IllegalArgumentException` if the string is not an allowed value; `null` or a blank string falls back to `FLOAT`.
- **Default**: `FLOAT`.
- **Example**:

```javascript
machine.smartInterface("mode", 1, 3).valueType("integer").end()
```

#### `end() → MachineBuilderJS`

- **Parameters**: None.
- **Returns**: The parent `MachineBuilderJS`.
- **Throws**: `IllegalArgumentException` during machine definition if the range or type is invalid.
- **Default**: None.
- **Example**:

```javascript
machine.smartInterface("mode", 1, 3).priority(1).valueType("integer").end()
```

:::warning Notes

- A smart interface's minimum must be less than or equal to its maximum; the `INTEGER` type also requires both bounds and the default value to be integers.
- You can call `priority`/`valueType` in either order before `end()`; if you call a method multiple times, the last call takes effect.
- You can call `smartInterface(type, ...)` multiple times on the same `MachineBuilderJS`; duplicate type names are rejected during machine registration.
:::
## 6. Structure Builders

### `MachineStructureBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.MachineStructureBuilderJS` is the server-side structure registration builder returned by `MMCRServerEventJS.createStructure`.

**Fields**

| Name | Type | Default | Description |
|------|------|------|------|
| `pattern` | `BlockArray` | Empty | Main structure pattern, accumulated through `pattern(...)`. |
| `portRequirements` | `PortRequirementSpec` | `PortRequirementSpec.none()` | Main structure port count requirements. |
| `portTierRequirements` | `PortTierRequirementSpec` | `PortTierRequirementSpec.none()` | Minimum port tiers for the main structure. |
| `dynamicPatterns` | `List<DynamicPatternSpec>` | Empty | List of dynamic patterns. |
| `requirements` | `MachineStructureRequirements` | `EMPTY` | Accumulated structure requirements (level slots, modifiers, etc.). |

**Creation**

The public constructors are `MachineStructureBuilderJS(Identifier id)` and `MachineStructureBuilderJS(String id)`. Scripts typically use `event.createStructure(id)`.

**Methods**

#### Flat Declarations

##### `stateSensitive() → MachineStructureBuilderJS`

- **Parameters**: None.
- **Returns**: The current builder; makes structure matching state-sensitive.
- **Throws**: None.
- **Default**: `false` (state-insensitive).
- **Example**:

```javascript
event.createStructure("example:press").stateSensitive()
```

##### `stateInsensitive() → MachineStructureBuilderJS`

- **Parameters**: None.
- **Returns**: The current builder; explicitly disables state sensitivity.
- **Throws**: None.
- **Default**: `false`.
- **Example**:

```javascript
event.createStructure("example:press").stateInsensitive()
```

##### `pattern(String... rows) → MachineStructureBuilderJS`

- **Parameters**: `rows` (`String...`) — multiple y rows in the same z slice; each character in a string corresponds to a different x position from left to right in that row. An empty string is treated as having zero characters.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if row widths differ or the row count differs from existing slices.
- **Default**: None; before the first call, `pattern` is an empty `BlockArray`.
- **Example**:

```javascript
event.createStructure("example:press")
    .pattern("CCC", "CBC", "CCC")
```

##### `patternAll(List<List<String>> slices) → MachineStructureBuilderJS`

- **Parameters**: `slices` (`List<List<String>>`) — multiple z slices.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the list is empty or slice dimensions differ.
- **Default**: None.
- **Example**:

```javascript
structure.patternAll([
    ["CCC"],
    ["CBC"],
    ["CCC"]
])
```

##### `set(String symbol, Object value) → MachineStructureBuilderJS`

- **Parameters**: `symbol` (`String`) — a single-character pattern symbol; `value` (`Object`) — a `String` (block ID), `Block`, `BlockState`, internal `BlockPredicate`, or `LevelSlot`.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the symbol is not a single non-space character; `IllegalStateException` if the symbol does not exist in the current pattern.
- **Default**: Unbound characters remain `air()`.
- **Example**:

```javascript
structure.set("C", "minecraft:iron_block")
structure.set("L", api.levelSlot("example:coil"))
```

##### `controller(String symbol) → MachineStructureBuilderJS`

- **Parameters**: `symbol` (`String`) — the controller character.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the symbol is not a single non-space character; `IllegalStateException` if the symbol does not appear in `pattern(...)`.
- **Default**: The script builder calls `noController()` during initialization and does not infer the controller character; you must explicitly call `controller(symbol)`.
- **Example**:

```javascript
structure.controller("C")
```

##### `modifier(String symbol, ModifierUse use) → MachineStructureBuilderJS`

- **Parameters**: `symbol` (`String`) — the pattern character; `use` (`ModifierUse`) — modifier usage rules created with `KubeJSApi.modifierUse(...)`.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the symbol is not a single non-space character; `NullPointerException` if `use` is null.
- **Default**: None.
- **Example**:

```javascript
const api = event.getAPI()
structure.modifier("M", api.modifierUse("example:speed", api.block("minecraft:diamond_block")))
```

##### `portRequirements(PortRequirementSpec requirements) → MachineStructureBuilderJS`

- **Parameters**: `requirements` (`PortRequirementSpec`) — typically created with `api.portRequirements(...)`.
- **Returns**: The current builder.
- **Throws**: `NullPointerException` if `requirements` is null.
- **Default**: `PortRequirementSpec.none()`.
- **Example**:

```javascript
structure.portRequirements(api.portRequirements({ item_input_bus: 1 }))
```

##### `portTierRequirements(PortTierRequirementSpec requirements) → MachineStructureBuilderJS`

- **Parameters**: `requirements` (`PortTierRequirementSpec`) — typically created with `api.portTierRequirements(...)`.
- **Returns**: The current builder.
- **Throws**: `NullPointerException` if `requirements` is null.
- **Default**: `PortTierRequirementSpec.none()`.
- **Example**:

```javascript
structure.portTierRequirements(api.portTierRequirements(["item_input_bus>=normal"]))
```

##### `dynamicPattern(DynamicPatternSpec pattern) → MachineStructureBuilderJS`

- **Parameters**: `pattern` (`DynamicPatternSpec`) — a dynamic pattern definition.
- **Returns**: The current builder.
- **Throws**: `NullPointerException` if `pattern` is null.
- **Default**: An empty list.
- **Example**:

```javascript
structure.dynamicPattern(myDynamicPattern)
```

##### `build() → void`

- **Parameters**: None.
- **Returns**: Nothing; registers the current structure in the server-side KubeJS content transaction.
- **Throws**: `IllegalStateException` if no KubeJS server script loading transaction is active; other structure validation failures are handled by the transaction.
- **Default**: None.
- **Example**:

```javascript
event.createStructure("example:press")
    .pattern("C")
    .set("C", "minecraft:iron_block")
    .controller("C")
    .build()
```

#### Staged Declarations

`MachineStructureBuilderJS` supports two modes: top-level and callback-based. `pattern` / `set` / `controller` / `modifier` and `fullStructure(...)` use the top-level mode; `mainStructure` / `expandStructure` / `extension(Consumer)` use the callback-based mode. You cannot mix the two modes. `fullStructure` can wrap the pattern accumulated at the top level into a complete stage.

##### `fullStructure(PortRequirementSpec ports, PortTierRequirementSpec tiers, List<DynamicPatternSpec> dynamicPatterns, MachineStructureRequirements requirements) → MachineStructureBuilderJS`

- **Parameters**: `ports`/`tiers`/`dynamicPatterns`/`requirements` (corresponding to the parameters of `MachineStructureBuilder`'s `fullStructure(...)`) — all accept `null`, meaning no additions for that component.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if the builder has switched to the callback-based API; transaction or `MachineStructureRequirements` validation failures propagate to the caller.
- **Default**: Merges the current `pattern/requirements` with the additional `requirements`.
- **Example**:

```javascript
structure.fullStructure(api.portRequirements({}), api.portTierRequirements([]), [], MachineStructureRequirements.EMPTY)
```

##### `fullStructure(BlockArray pattern) → MachineStructureBuilderJS`

- **Parameters**: `pattern` (`BlockArray`) — the block array for the complete structure.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if the builder has switched to the callback-based API; `NullPointerException` if `pattern` is null.
- **Default**: Port and dynamic pattern requirements are empty.
- **Example**:

```javascript
structure.fullStructure(blockArray)
```

##### `fullStructure(BlockArray pattern, PortRequirementSpec ports, PortTierRequirementSpec tiers, List<DynamicPatternSpec> dynamicPatterns, MachineStructureRequirements requirements) → MachineStructureBuilderJS`

- **Parameters**: `pattern` cannot be `null`; the other parameters are normalized and validated by `Declaration`.
- **Returns**: The current builder.
- **Throws**: Same as the previous two overloads.
- **Default**: Merges the current requirements.
- **Example**:

```javascript
structure.fullStructure(alt, null, null, [], MachineStructureRequirements.EMPTY)
```

##### `mainStructure(Consumer<MachineStructureStageBuilderJS> consumer) → MachineStructureBuilderJS`

- **Parameters**: `consumer` (`Consumer<MachineStructureStageBuilderJS>`) — a callback for configuring the main structure.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if the main structure has already been declared or the flat API has been mixed in; `NullPointerException` if the consumer is null.
- **Default**: None.
- **Example**:

```javascript
structure.mainStructure(stage => stage
    .pattern("CCC", "CBC", "CCC")
    .set("C", "minecraft:iron_block")
    .controller("C")
)
```

##### `expandStructure(Consumer<MachineStructureStageBuilderJS> consumer) → MachineStructureBuilderJS`

- **Parameters**: `consumer` (`Consumer<MachineStructureStageBuilderJS>`) — a callback for configuring the expanded structure.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if `mainStructure` has not been called first or the flat API has been mixed in; `NullPointerException` if the consumer is null.
- **Default**: None.
- **Example**:

```javascript
structure.mainStructure(stage => stage.pattern("X").set("X", "minecraft:iron_block").controller("X"))
       .expandStructure(stage => stage.pattern("XX").set("X", "minecraft:iron_block"))
```

##### `extension(BlockArray pattern) → MachineStructureBuilderJS` (Java Side)

- **Parameters**: `pattern` (`BlockArray`) — the block array for an auxiliary structure. This overload is marked `@HideFromJS`; scripts use `extension(stage => ...)`.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if the main structure has not been declared first or the callback-based API has been mixed in; `NullPointerException` if `pattern` is null.
- **Default**: Port and dynamic pattern requirements are empty.
- **Example**:

```javascript
structure.extension(extensionBlockArray)
```

##### `extension(BlockArray pattern, PortRequirementSpec ports, PortTierRequirementSpec tiers, List<DynamicPatternSpec> dynamicPatterns, MachineStructureRequirements requirements) → MachineStructureBuilderJS`

- **Parameters**: Similar to `fullStructure`; marked `@HideFromJS`.
- **Returns**: The current builder.
- **Throws**: Same as the other `extension` overloads.
- **Default**: None.
- **Example**:

```javascript
structure.extension(ext, null, null, [], MachineStructureRequirements.EMPTY)
```

##### `extension(Consumer<MachineStructureStageBuilderJS> consumer) → MachineStructureBuilderJS`

- **Parameters**: `consumer` (`Consumer<MachineStructureStageBuilderJS>`) — a callback for configuring an auxiliary structure.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if the main structure has not been declared first or the flat API has been mixed in; `NullPointerException` if the consumer is null.
- **Default**: None.
- **Example**:

```javascript
structure.extension(stage => stage.pattern("Y").set("Y", "minecraft:iron_block"))
```

#### Port Predicate and Tier Shortcuts

`MachineStructureBuilderJS` also exposes port predicate and tier factory methods with the same names as those in `KubeJSInterfaceHelpers`:

| Method | Returns | Description |
| --- | --- | --- |
| `anyOfItemInput()` | `BlockPredicate` | Union of all item input ports. |
| `anyOfItemOutput()` | `BlockPredicate` | Union of all item output ports. |
| `anyOfFluidInput()` | `BlockPredicate` | Union of all fluid input ports. |
| `anyOfFluidOutput()` | `BlockPredicate` | Union of all fluid output ports. |
| `anyOfEnergyInput()` | `BlockPredicate` | Union of all energy input ports. |
| `anyOfEnergyOutput()` | `BlockPredicate` | Union of all energy output ports. |
| `anyOfItemPorts()` | `BlockPredicate` | Union of all item input and output ports. |
| `anyOfFluidPorts()` | `BlockPredicate` | Union of all fluid input and output ports. |
| `anyOfEnergyPorts()` | `BlockPredicate` | Union of all energy input and output ports. |
| `anyOfChemicalPorts()` | `BlockPredicate` | Union of Mekanism chemical input and output ports. |
| `anyOfRadioactiveChemicalPorts()` | `BlockPredicate` | Union of Mekanism radioactive chemical input and output ports. |
| `anyOfHeatPorts()` | `BlockPredicate` | Union of Mekanism heat input and output ports. |
| `anyOfUpgradeBus()` | `BlockPredicate` | Union of all upgrade buses. |
| `anyOfPort(String...)` | `BlockPredicate` | Union of the specified list of port IDs. |
| `anyOfPort(Identifier...)` | `BlockPredicate` | Same as above, using an `Identifier` array. |
| `anyOfPort(api.machine.definition.BlockPredicate...)` | `BlockPredicate` | Union of a list of underlying definition predicates; returns `api.machine.BlockPredicate`. |
| `factoryController()` | `BlockPredicate` | Built-in factory controller. |
| `parallelControllers()` | `BlockPredicate` | All parallel controllers. |
| `smartInterface()` | `BlockPredicate` | Built-in smart interface. |
| `dataStorage()` | `BlockPredicate` | Built-in data storage. |
| `itemInputTier(String)` | `PortTierRequirementSpec` | Tier specification for item input ports. |
| `itemOutputTier(String)` | `PortTierRequirementSpec` | Tier specification for item output ports. |
| `fluidInputTier(String)` | `PortTierRequirementSpec` | Tier specification for fluid input ports. |
| `fluidOutputTier(String)` | `PortTierRequirementSpec` | Tier specification for fluid output ports. |
| `energyInputTier(String)` | `PortTierRequirementSpec` | Tier specification for energy input ports. |
| `energyOutputTier(String)` | `PortTierRequirementSpec` | Tier specification for energy output ports. |
| `chemicalInputTier(String)` | `PortTierRequirementSpec` | Tier specification for chemical input ports. |
| `chemicalOutputTier(String)` | `PortTierRequirementSpec` | Tier specification for chemical output ports. |
| `radioactiveChemicalInputTier()` | `PortTierRequirementSpec` | Requires a radioactive chemical input port to be present; no tier parameter. |
| `radioactiveChemicalOutputTier()` | `PortTierRequirementSpec` | Requires a radioactive chemical output port to be present; no tier parameter. |
| `heatInputTier()` | `PortTierRequirementSpec` | Requires a heat input port to be present; no tier parameter. |
| `heatOutputTier()` | `PortTierRequirementSpec` | Requires a heat output port to be present; no tier parameter. |

See [Port Tiers and Port Requirements](#port-requirements) for all accepted string values and matching rules for each tier factory.

Mekanism chemical, radioactive chemical, and heat port predicates match no blocks when Mekanism is not loaded.

#### Finalization

##### `createObject() → MachineStructureDefinition`

- **Parameters**: None.
- **Returns**: An immutable `MachineStructureDefinition`; usable without calling `build()`, for example in unit tests.
- **Throws**: `IllegalStateException` if declaration order conflicts with the API mode; `NullPointerException` if a required field is null.
- **Default**: Falls back to an empty pattern declaration if nothing has been declared.
- **Example**:

```javascript
const definition = builder.createObject()
```

#### `PatternEntry`

> The internal record `cn.howxu.mmcr.compat.kubejs.MachineStructureBuilderJS.PatternEntry` is retained on the KubeJS side so character values already bound to a `BlockPredicate` can be reused in `set(symbol, value)`.

**Fields**

| Name | Type | Description |
|------|------|------|
| `base` | `BlockPredicate` | The base block predicate associated with the character. |

**Example**

```javascript
const entry = new (Java.loadClass("cn.howxu.mmcr.compat.kubejs.MachineStructureBuilderJS$PatternEntry"))(api.block("minecraft:iron_block"))
structure.set("X", entry)
```

:::warning Notes

- Pattern symbols must be single non-space characters; a space means the position is not checked.
- Calls to `pattern(...)` must use the same width and height; otherwise, `IllegalArgumentException` is thrown.
- The staged and flat APIs cannot be mixed; after calling `mainStructure` / `expandStructure` / `extension(Consumer)`, calling `pattern`/`set`/`controller`/`modifier` also throws `IllegalStateException`.
- The `fullStructure(BlockArray)` overloads use underlying `api.machine` types and are not marked `@HideFromJS`; both `extension(BlockArray)` overloads are hidden, so scripts use the callback overload. `pattern(List<String>)` is also hidden on both the top-level and stage builders; scripts use varargs or `patternAll`.
- `PatternEntry` does not modify requirements (modifiers or level slots); to bind multiple alternatives to the same character, call `modifier(symbol, use)` multiple times.
:::
### `MachineStructureStageBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.MachineStructureStageBuilderJS` is the temporary builder passed to `mainStructure` / `expandStructure` / `extension` callbacks; it applies only to the current stage.

**Fields**

| Name | Type | Default | Description |
|------|------|------|------|
| `portRequirements` | `PortRequirementSpec` | `none` | Port count requirements for the current stage. |
| `portTierRequirements` | `PortTierRequirementSpec` | `none` | Minimum port tiers for the current stage. |
| `dynamicPatterns` | `List<DynamicPatternSpec>` | Empty | List of dynamic patterns for the current stage. |

**Methods**

#### `pattern(String... rows) → MachineStructureStageBuilderJS`

- **Parameters**: `rows` (`String...`) — multiple y rows in the same z slice.
- **Returns**: The current stage builder.
- **Throws**: `IllegalArgumentException` if row widths or heights differ.
- **Default**: None.
- **Example**:

```javascript
mainStructure(stage => stage.pattern("CCC", "CBC", "CCC"))
```

#### `patternAll(List<List<String>> slices) → MachineStructureStageBuilderJS`

- **Parameters**: `slices` (`List<List<String>>`) — multiple z slices.
- **Returns**: The current stage builder.
- **Throws**: `IllegalArgumentException` if the list is empty or slice dimensions differ.
- **Default**: None.
- **Example**:

```javascript
mainStructure(stage => stage.patternAll([
    ["CCC"],
    ["CBC"],
    ["CCC"]
]))
```

#### `set(String symbol, Object value) → MachineStructureStageBuilderJS`

- **Parameters**: `symbol` (`String`) — the character; `value` (`Object`) — a `String`, `Block`, `BlockState`, internal `BlockPredicate`, or `LevelSlot`.
- **Returns**: The current stage builder.
- **Throws**: `IllegalArgumentException` if the character is invalid; `IllegalStateException` if the character does not appear in `pattern(...)`.
- **Default**: Unbound characters remain `air()`.
- **Example**:

```javascript
mainStructure(stage => stage.set("C", "minecraft:iron_block"))
```

#### `modifier(String symbol, ModifierUse use) → MachineStructureStageBuilderJS`

- **Parameters**: `symbol` (`String`) — the character; `use` (`ModifierUse`) — created with `KubeJSApi.modifierUse(...)`.
- **Returns**: The current stage builder.
- **Throws**: `IllegalArgumentException` if the character is invalid; `NullPointerException` if `use` is null.
- **Default**: None.
- **Example**:

```javascript
mainStructure(stage => stage.modifier("M", api.modifierUse("example:speed", api.block("minecraft:diamond_block"))))
```

#### `controller(String symbol) → MachineStructureStageBuilderJS`

- **Parameters**: `symbol` (`String`) — the controller character.
- **Returns**: The current stage builder.
- **Throws**: `IllegalArgumentException` if the character is invalid; `IllegalStateException` if the character does not appear in `pattern(...)`.
- **Default**: The stage builder calls `noController()` during initialization; the controller character must be explicitly declared, but can be omitted for expanded/auxiliary stages that do not need one.
- **Example**:

```javascript
mainStructure(stage => stage.controller("C"))
```

#### `portRequirements(PortRequirementSpec requirements) → MachineStructureStageBuilderJS`

- **Parameters**: `requirements` (`PortRequirementSpec`) — port requirements for the current stage.
- **Returns**: The current stage builder.
- **Throws**: `NullPointerException` if `requirements` is null.
- **Default**: `PortRequirementSpec.none()`.
- **Example**:

```javascript
mainStructure(stage => stage.portRequirements(api.portRequirements({ item_input_bus: 1 })))
```

#### `portTierRequirements(PortTierRequirementSpec requirements) → MachineStructureStageBuilderJS`

- **Parameters**: `requirements` (`PortTierRequirementSpec`) — minimum port tiers for the current stage.
- **Returns**: The current stage builder.
- **Throws**: `NullPointerException` if `requirements` is null.
- **Default**: `PortTierRequirementSpec.none()`.
- **Example**:

```javascript
mainStructure(stage => stage.portTierRequirements(api.portTierRequirements(["item_input_bus>=normal"])))
```

#### `dynamicPattern(DynamicPatternSpec pattern) → MachineStructureStageBuilderJS`

- **Parameters**: `pattern` (`DynamicPatternSpec`) — a dynamic pattern.
- **Returns**: The current stage builder.
- **Throws**: `NullPointerException` if `pattern` is null.
- **Default**: An empty list.
- **Example**:

```javascript
mainStructure(stage => stage.dynamicPattern(myDynamicPattern))
```

#### Port Predicate and Tier Shortcuts

The stage builder provides port unions, built-in controller predicates, and port tier factories:

| Method | Returns | Description |
| --- | --- | --- |
| `anyOfItemInput()` / `anyOfItemOutput()` | `BlockPredicate` | Union of item input/output ports. |
| `anyOfFluidInput()` / `anyOfFluidOutput()` | `BlockPredicate` | Union of fluid input/output ports. |
| `anyOfEnergyInput()` / `anyOfEnergyOutput()` | `BlockPredicate` | Union of energy input/output ports. |
| `anyOfItemPorts()` / `anyOfFluidPorts()` / `anyOfEnergyPorts()` | `BlockPredicate` | Union of inputs and outputs in the corresponding port family. |
| `anyOfChemicalPorts()` / `anyOfRadioactiveChemicalPorts()` / `anyOfHeatPorts()` | `BlockPredicate` | Union of Mekanism chemical, radioactive chemical, or heat ports. |
| `anyOfUpgradeBus()` | `BlockPredicate` | Union of all upgrade buses. |
| `anyOfPort(String...)` / `anyOfPort(Identifier...)` / `anyOfPort(api.machine.definition.BlockPredicate...)` | `BlockPredicate` | Union of the specified ports. |
| `factoryController()` / `parallelControllers()` / `smartInterface()` | `BlockPredicate` | Built-in controller or smart interface predicates. |
| `itemInputTier(String)` / `itemOutputTier(String)` | `PortTierRequirementSpec` | Minimum item port tier; see [Port Requirements](#port-requirements) for all available values. |
| `fluidInputTier(String)` / `fluidOutputTier(String)` | `PortTierRequirementSpec` | Minimum fluid port tier. |
| `energyInputTier(String)` / `energyOutputTier(String)` | `PortTierRequirementSpec` | Minimum energy port tier. |
| `chemicalInputTier(String)` / `chemicalOutputTier(String)` | `PortTierRequirementSpec` | Minimum chemical port tier: `basic`, `advanced`, `elite`, `ultimate`. |
| `radioactiveChemicalInputTier()` / `radioactiveChemicalOutputTier()` | `PortTierRequirementSpec` | Requires a radioactive chemical port to be present; no tier parameter. |
| `heatInputTier()` / `heatOutputTier()` | `PortTierRequirementSpec` | Requires a heat port to be present; no tier parameter. |

Mekanism chemical, radioactive chemical, and heat port predicates match no blocks when Mekanism is not loaded.

#### `build() → MachineStructureDefinition.Declaration`

- **Parameters**: None.
- **Returns**: A `Declaration` object; the parent `MachineStructureBuilderJS` wraps it as a `fullStructure` or `extension` stage.
- **Throws**: `IllegalStateException` if array dimension validation is missing or `set` is inconsistent; `NullPointerException` if required data is missing.
- **Default**: Unbound characters remain `air()`.
- **Example**:

```javascript
// 在 MachineStructureBuilderJS.mainStructure(...) 回调内
stage.pattern("X").set("X", "minecraft:iron_block").controller("X")
```

:::warning Notes

- The parent builder extracts the stage declaration as soon as the `mainStructure` / `expandStructure` / `extension` callback ends; modifying a saved stage builder afterward does not change the extracted declaration.
- Characters in a stage must be declared through `pattern(...)`; you cannot use `set` for a character that is absent.
- Level slots are automatically registered in the current stage's `requirements` through `set(symbol, levelSlot)`.
:::
## 7. Recipes

### Two Types of Recipe Builders

| Approach | Object and entry point | IO parameters | Finalization and publication |
| --- | --- | --- | --- |
| Data-driven schema | `event.custom({type: "mmcr:machine_recipe", ...})` in `ServerEvents.recipes` returns a KubeJS `KubeRecipe` | JSON; the schema's `custom` accepts the direction strings `"input"` / `"output"` | KubeJS collects recipes, which are then bridged into MMCR through datapack synchronization. |
| Programmatic JavaScript bridge | `new MachineRecipeBuilderJS(String/Identifier id)`; obtain the class with `Java.loadClass` | `MachineIngredient`, `MachineRequirement`, `RecipeIoDeclaration`; `custom` accepts `RecipeModifier.IOType` | `createObject()` only constructs the recipe; `build()` registers it in the active server transaction, or uses static registration otherwise. |

Their method names are not identical. The schema provides `chemicalInputChance` and `smartInterfaceInputRange`; the programmatic builder uses `chemicalInput(..., consumeChance)` and the three-argument `smartInterfaceInput`. Do not mix up `MachineRecipeBuilderJS` with the underlying Java `api.recipe.MachineRecipeBuilder` or the add-on API's `publicapi.recipe.RecipeDraft`.

### `MachineRecipeBuilderJS`

Source: [MachineRecipeBuilderJS.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeBuilderJS.java). This class does not extend `BuilderBase` and has no `register()` method like the machine registration builder; `MMCRServerEventJS` also has no `createRecipe` method.

#### Construction, Fields, and Defaults

The public constructors are `MachineRecipeBuilderJS(String id)` and `MachineRecipeBuilderJS(Identifier id)`. The ID must be parseable; you must then call `recipePool` to set the recipe pool. Public fields are `recipePoolId`, `tickTime=40`, `inputs`, `outputs`, `energyPerTick=0`, `cancelIfPerTickFails=false`, and `requiredHostIds`. Internal defaults are `priority=0`, `maxThreads=1`, `parallelized=false`, `deriveRequirements=true`, and `allowPartialOutputs=false`; the fluid output, explicit requirement, custom output, and condition lists start empty.

All configuration methods below return the current builder; only `createObject` and `build` are terminal methods. Do not add stacks directly to the `outputs` field: output chances are stored in a separate internal list, so use the methods to keep the lists aligned.

#### Basic Settings and List Overloads

| Method | Behavior and validation |
| --- | --- |
| `id(String id)` | Replaces the recipe ID; throws if parsing fails. |
| `recipePool(String id)` | Sets a single recipe pool; immediately throws `IllegalArgumentException` if `MachineRegistry.containsRecipePool` is false. |
| `tickTime(int ticks)` | Sets the duration; `createObject()` requires at least 1 tick. |
| `priority(int priority)` | Sets the recipe priority. |
| `maxThreads(int threads)` | Defaults to 1; negative values are rejected during construction, but the source allows 0. |
| `parallelized()` / `parallelized(boolean enabled)` | The no-argument form sets `true`; defaults to `false`. |
| `cancelIfPerTickFails(boolean cancel)` | Sets whether to cancel when a per-tick requirement fails; defaults to `false`. |
| `allowPartialOutputs()` / `allowPartialOutputs(boolean allow)` | The no-argument form sets `true`; defaults to `false`. |
| `deriveRequirements(boolean derive)` | Controls whether requirements are derived from legacy inputs, item outputs, and fluid outputs; defaults to `true`. |
| `inputs(List<MachineIngredient>)` / `addInput(MachineIngredient)` | The former clears and replaces legacy inputs; the latter appends an input. |
| `outputs(List<ItemStack>)` / `addOutput(ItemStack, float chance)` | The former clears item outputs, chances, and pending component outputs, setting each chance to 1; the latter appends a stack and its chance. |
| `fluidOutputs(List<FluidStack>)` | Replaces the fluid output list, with a final output chance of 1 for each entry; there is no `fluidOutput(...)` shortcut, so use `api.fluidStack`. |
| `requirements(List<MachineRequirement>)` | Replaces the explicit requirement list without clearing custom outputs. |
| `addRequirement(RecipeIoDeclaration)` | Appends an underlying requirement; the underlying builder decodes `CustomRecipeIo` into a requirement or custom output, and rejects other implementations. |
| `custom(String typeId, RecipeModifier.IOType io, JsonElement payload)` | Constructs a `CustomRecipeIo` and passes it to `addRequirement`; the type and codec must match. |
| `conditions(List<MachineModifier>)` | Replaces conditions, converting them to recipe modifiers through `MachineModifier.recipeModifiers`; only numeric duration, energy, chemical, heat, and output targets are retained. Machine scheduling targets and boolean parallelization entries are ignored. |

`deriveRequirements(false)` does not automatically convert legacy `inputs` into requirements. Only explicitly added requirements are included in this part; legacy item/fluid outputs are still converted into canonical outputs. This option is intended for scripts that already provide a complete set of explicit requirements; it does not mean "do not consume inputs."

#### Item and Tag Inputs

Every method in the table below with a `long` quantity also has an overload with `int` in the same parameter position. Input components use `DataComponentPredicateSet.CODEC` and act as matching predicates; the consumption chance defaults to 1 when omitted, while 0 means the input must still be present but is not consumed. The builder's `tagInput` uses tag sets from the built-in registry and creates an empty named set if the tag is missing; this differs from the API facade's immediate `getOrThrow` tag lookup.

| Method | Meaning |
| --- | --- |
| `itemInput(String itemId, long count)` | Specific item input, with no component matching and full consumption. |
| `tagInput(String tagId, long count)` | Tag input, with no component matching and full consumption. |
| `itemInputWithComponents(String itemId, long count, JsonElement components)` | Component-matched input with a chance of 1. |
| `itemInputWithComponents(String itemId, long count, JsonElement components, float consumeChance)` | Component-matched input with an explicit consumption chance. |
| `tagInputWithComponents(String tagId, long count, JsonElement components, float consumeChance)` | Matches both the tag and components; there is no three-argument overload that omits the chance. |
| `notConsumableItemInput(String itemId, long count)` | Fixes the consumption chance at 0; the input is still checked for presence. |
| `chancedItemInput(String itemId, long count, float consumeChance)` | Chance-based consumption with no component predicates. |

#### Component Item Outputs and Plain Outputs

| Method | Meaning |
| --- | --- |
| `itemOutput(String itemId, long count)` / corresponding `int` overload | Appends an item output with a chance of 1. |
| `chancedItemOutput(String itemId, long count, float chance)` / corresponding `int` overload | Appends a chance-based item output. |
| `itemOutputWithComponents(String itemId, long count, JsonElement components)` / corresponding `int` overload | Stores a pending JSON output with actual stack components; the count must be positive and the chance is fixed at 1. There is no four-argument chance overload. |

**Exact names and distinct semantics**: `api.itemOutputRequirementWithComponents(itemId, count, components, chance)` is a requirement factory; `builder.itemOutputWithComponents(itemId, count, components)` creates a recipe stack output. Both exist, and their names are not interchangeable. The former parses component predicates and resolves the output stack through the requirement; the latter decodes `MachineOutput.RECIPE_ITEM_STACK_CODEC` in `createObject()` using the current `RecipesKubeEvent`'s registry-aware ops.

Therefore, whenever you use the builder's `itemOutputWithComponents`, you must **call `createObject()` / `build()` inside a `ServerEvents.recipes` callback**; otherwise, it throws `IllegalStateException("Component item outputs must be built during the KubeJS recipe event")`. Its order relative to plain item outputs is preserved. You can use `createObject()` in the recipe event to check construction, but this does not register the recipe.

#### Fluids, Energy, and Mekanism

| Method | Behavior and overloads |
| --- | --- |
| `fluidInput(String fluidId, long amount)` | Fluid input with a chance of 1; also has an `int` overload. |
| `fluidInput(String fluidId, long amount, double consumeChance)` | Chance-based fluid consumption; also has an overload with an `int` amount. |
| `energyPerTick(long fe)` | Sets an additional energy input; if greater than 0, it is appended during construction without replacing existing `iFEt` entries. |
| `iFEt(long fePerTick)` | Appends an energy input to the legacy input list. |
| `oFEt(long fePerTick)` | Appends an energy declaration with the OUTPUT direction, still stored in the legacy input list, then derived into a requirement with the correct direction. |
| `chemicalInput(String chemicalId, long amount)` | Chemical input with a chance of 1. |
| `chemicalInput(String chemicalId, long amount, double consumeChance)` | Chance-based chemical consumption. |
| `chemicalTagInput(String tagId, long amount)` | Tag-based chemical input with a chance of 1. |
| `chemicalTagInput(String tagId, long amount, double consumeChance)` | Chance-based consumption of tagged chemicals. |
| `chemicalOutput(String chemicalId, long amount, double chance)` | Chance-based output of a specific chemical; a tag cannot replace the specific ID. |
| `heatTemperatureInput(double temperature)` | Minimum temperature input (K). |
| `heatOutput(double heat)` | Heat output declaration. |

Chemical/heat calls use the `custom` path with registered codecs, rather than placing Mekanism objects in an item stack list. Consumption chances are converted to `float`; type IDs, amounts, chances, temperatures, and heat values must also pass the relevant payload validation. Passing a `long` amount does not make underlying item and fluid stacks unlimited: these stacks call `MachineOutput.recipeStackAmount`, which requires a positive amount and clamps values above `Integer.MAX_VALUE` to that limit.

#### Smart Interfaces, Levels, Stages, and Hosts

| Method | Behavior |
| --- | --- |
| `smartInterfaceInput(String type, float value)` | Fixed-value input requirement. |
| `smartInterfaceInput(String type, float min, float max)` | Range input requirement; distinct from the schema's `smartInterfaceInputRange`. |
| `smartInterfaceOutput(String type, float value)` | Fixed-value output requirement. |
| `requiresLevel(String typeId, String levelId)` | Checks that the level exists and belongs to the type, then appends an input requirement; throws `IllegalArgumentException` on failure. |
| `requiresStage(int minStage)` | Minimum structure stage requirement, in the range 1..64. |
| `requiredHost(String hostId)` | Adds one entry to the host ID set. |
| `requiredHosts(String... hostIds)` | Adds multiple entries, ignoring `null` arrays/elements; the ID set removes duplicates. |

#### Finalization and Usage Example

- `createObject() → cn.howxu.mmcr.api.recipe.MachineRecipe`: Does not register the recipe. Throws `IllegalStateException` if `recipePool` is missing; throws `IllegalArgumentException` for a duration below 1, negative additional energy/thread counts, and similar invalid values. It derives requirements from legacy IO, appends explicit requirements, builds canonical outputs, conditions, and the host set, and finally adds custom outputs.
- `build() → void`: Calls `createObject()`; registers the recipe in the current transaction when `KubeJSContentReloadTransaction.active()` is available, or calls `RecipeRegistry.registerStatic` otherwise. The static path does not mean "automatically hot-reload next time" and is also subject to the static registration lifecycle.

```javascript
// server_scripts：普通编程式配方随结构一起进入服务端内容事务
const MachineRecipeBuilderJS = Java.loadClass("cn.howxu.mmcr.compat.kubejs.MachineRecipeBuilderJS")
MMCREvents.server(event => {
    new MachineRecipeBuilderJS("example:press_programmatic")
        .recipePool("example:press")
        .tickTime(200)
        .itemInput("minecraft:iron_ingot", 1)
        .notConsumableItemInput("minecraft:diamond", 1)
        .fluidInput("minecraft:water", 1000, 0.5)
        .iFEt(32)
        .itemOutput("minecraft:iron_nugget", 10)
        .build()
})
```

For data-driven outputs with stack components, it is usually clearer to provide the stack components directly in the JSON `outputs` within `ServerEvents.recipes`. Do not mix KubeJS's `.id(...)` or schema functions into this programmatic chain.

### `MachineRecipeSchema`

> `cn.howxu.mmcr.compat.kubejs.MachineRecipeSchema` defines the schema for KubeJS data-driven recipes. Use it through `event.custom({ type: 'mmcr:machine_recipe', ... })`. RecipeKeys and additional functions are created during class initialization, then added to the registry through `MachineRecipeSchema.register(registry)` during KubeJS plugin registration, rather than injected into Java registries during script compilation.

**Fields**

| Name | Type | Description |
|------|------|------|
| `JSON_ELEMENT` | `RecipeComponent<JsonElement>` | Generic JSON element component used as the list entry type for `requirements`/`outputs`/`modifiers`. |
| `RECIPE_POOL` | `RecipeKey<String>` | The `recipe_pool` field, specifying the recipe's pool. |
| `TICK_TIME` | `RecipeKey<Integer>` | The `tick_time` field, a nonnegative integer. |
| `OUTPUTS` | `RecipeKey<List<JsonElement>>` | The `outputs` field, whose entries are JSON elements; shares its type with `requirements`. |
| `MODIFIERS` | `RecipeKey<List<JsonElement>>` | The `modifiers` field, defaulting to an empty list. Like `OUTPUTS`, it calls `exclude()`, which only excludes it from automatically generated constructor parameters and does not remove the JSON field. |
| `REQUIREMENTS` | `RecipeKey<List<JsonElement>>` | The `requirements` field, included in the result. |
| `MAX_THREADS` | `RecipeKey<Integer>` | The `max_threads` field, defaulting to `1`. |
| `PARALLELIZED` | `RecipeKey<Boolean>` | The `parallelized` field, defaulting to `false`. |
| `CANCEL_IF_PER_TICK_FAILS` | `RecipeKey<Boolean>` | The `cancelIfPerTickFails` field, defaulting to `false`. |
| `ALLOW_PARTIAL_OUTPUTS` | `RecipeKey<Boolean>` | The `allow_partial_outputs` field, defaulting to `false`. |
| `SCHEMA` | `RecipeSchema` | The KubeJS-side `RecipeSchema` instance for the `mmcr:machine_recipe` recipe type. |

**Methods**

#### `register(RecipeSchemaRegistry registry) → void`

- **Parameters**: `registry` (`RecipeSchemaRegistry`) — passed by KubeJS during `registerRecipeSchemas`.
- **Returns**: Nothing; registers `SCHEMA` in `registry`.
- **Throws**: Internal registry exceptions.
- **Defaults**: None.
- **Example**: Used only during plugin initialization; scripts do not need to call it directly.

#### Callable Functions Registered on `SCHEMA`

The following additional functions are registered on the data-driven recipe `RecipeSchema`; their signatures are listed below:

| Name | Parameters | Behavior |
| --- | --- | --- |
| `allowPartialOutputs()` | None | Writes the JSON field `allow_partial_outputs=true`. |
| `smartInterfaceInput(type, value)` | `(String, float)` | Appends a smart interface input requirement to `requirements`. |
| `smartInterfaceInputRange(type, min, max)` | `(String, float, float)` | Appends a range-based smart interface input requirement. |
| `smartInterfaceOutput(type, value)` | `(String, float)` | Appends a smart interface output requirement. |
| `custom(typeId, io, payload)` | `(String, String, JsonElement)` | Validates through the underlying `RecipeIoValidation.custom(...)` and appends the codec-encoded requirement or output to the corresponding array. `io` must be lowercase `input` or `output`. |
| `requiredHost(hostId)` | `(String)` | Appends a host machine ID to `required_host_ids`. |
| `requiresLevel(typeId, levelId)` | `(String, String)` | Validates that the level matches the type and appends the level requirement to `requirements`. |
| `chemicalInput(chemicalId, amount)` | `(String, long)` | Appends a specific chemical input with full consumption. |
| `chemicalTagInput(tagId, amount)` | `(String, long)` | Appends a tag-based chemical input with full consumption. |
| `chemicalInputChance(chemicalId, amount, consumeChance)` | `(String, long, double)` | Appends a chance-based specific chemical input; chance is 0..1. |
| `chemicalTagInputChance(tagId, amount, consumeChance)` | `(String, long, double)` | Appends a chance-based tag chemical input; chance is 0..1. |
| `chemicalOutput(chemicalId, amount, chance)` | `(String, long, double)` | Appends a specific chemical output to `outputs`; chance is 0..1. |
| `heatTemperatureInput(temperature)` | `(double)` | Appends a minimum temperature input with a nonnegative temperature. |
| `heatOutput(heat)` | `(double)` | Appends to `outputs` if an output codec is registered; otherwise uses requirement decoding. Heat must be nonnegative. |

Source: [MachineRecipeSchema.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeSchema.java). These are all 14 additionally registered schema functions. Chemical amounts are constrained to positive `long` values by their component; temperature and heat use nonnegative `double` components, with payload validation also checking that values are finite. Do not infer from the programmatic builder that the schema has `itemOutputWithComponents`, `requiresStage`, `requiredHosts`, or a three-argument `chemicalInput`; the source does not register these functions.

The schema's required keys are `recipe_pool`, `tick_time`, and `requirements`; `outputs` and `modifiers` default to empty lists. The schema component for `tick_time` permits nonnegative integers, but valid machine recipes are still subject to MMCR's execution/decoding validation, so the examples use positive durations. Additional functions modify `cx.recipe().json` and then call `save()`; they operate on a `KubeRecipe`, not the programmatic builder.

KubeJS also automatically generates setters for keys that do not call `noFunctions()`. Available setters include `tickTime(int)`, `requirements(List<JsonElement>)`, `outputs(List<JsonElement>)`, `modifiers(List<JsonElement>)`, `maxThreads(int)`, `parallelized(boolean)`, and `cancelIfPerTickFails(boolean)`. Since `recipe_pool` calls `noFunctions()`, that key does not generate a `recipePool` setter. These list parameters are still JSON, not Java IO objects.

`allowPartialOutputs` is a special case of a same-name override: in KubeJS 26.1.2-8.0.6, the function map first adds the automatic key setter, then MMCR's explicitly registered no-argument `allowPartialOutputs()`, which overwrites the former. As a result, the schema has **no usable boolean overload**; `.allowPartialOutputs(false)` ignores the argument and still writes `allow_partial_outputs=true`. To disable it, set `allow_partial_outputs: false` in the recipe JSON (also the default) and do not call this function. Only the programmatic `MachineRecipeBuilderJS` supports `allowPartialOutputs(boolean)`; that signature does not apply to the schema.

#### Mekanism Recipe IO Types

When Mekanism is enabled, the following custom types can be used in `requirements`. `io` still only specifies the input / output direction; `type` distinguishes chemicals from heat:

| `type` | Direction | Main fields | Programmatic equivalent |
| --- | --- | --- | --- |
| `mekanism:chemical` | Input / output | `kind`, `id`, `amount`, `consume_chance`, `chance` | `chemicalInput(...)`, `chemicalTagInput(...)`, `chemicalOutput(...)` |
| `mekanism:temperature` | Input | `value` | `heatTemperatureInput(...)` |
| `mekanism:heat` | Output | `value` | `heatOutput(...)` |

```javascript
requirements: [
    { type: "mekanism:chemical", io: "input", kind: "chemical", id: "mekanism:oxygen", amount: 1000 },
    { type: "mekanism:temperature", io: "input", value: 1000 },
    { type: "mekanism:heat", io: "output", value: 250 }
]
```

The `kind` of `mekanism:chemical` can be `chemical` or `tag`; outputs must specify a concrete chemical ID. `consume_chance` and `chance` range from `0` to `1`. These types cannot execute when Mekanism is not loaded.

You can also write a stage requirement directly in `requirements`:

```javascript
{ type: "mmcr:stage", io: "input", min_stage: 2 }
```

The valid range for `min_stage` is 1 to 64; `io` defaults to `input` when omitted.

:::warning Notes

- The `allowPartialOutputs` function takes no arguments and is equivalent to setting `allow_partial_outputs: true`; the field defaults to `false`.
- The `custom` function uses `RecipeIoValidation.decodeRequirement` for the `input` direction or types without an output codec, and `MachineRecipeConverter.toOutput` for registered output types. Having no output codec does not permit unregistered types: declarations must still pass requirement codec validation.
- `requiresLevel` throws `IllegalArgumentException` if the level type does not match; KubeJS catches it and writes it to the recipe console.
:::
#### Minimal Data-Driven Recipe Example

```javascript
ServerEvents.recipes(event => {
    event.custom({
        type: "mmcr:machine_recipe",
        recipe_pool: "example:press",
        tick_time: 200,
        requirements: [
            { type: "minecraft:item", io: "input", item: "minecraft:iron_ingot", count: 1 },
            { type: "minecraft:item", io: "output", stack: { id: "minecraft:iron_nugget", count: 10 } },
            { type: "neoforge:energy", io: "input", fe_per_tick: 32 }
        ]
    }).id("example:press_recipe_1")
})
```

#### Data-Driven Recipe + Schema Functions

```javascript
ServerEvents.recipes(event => {
    event.custom({
        type: "mmcr:machine_recipe",
        recipe_pool: "example:press",
        tick_time: 200,
        requirements: [
            { type: "minecraft:item", io: "input", item: "minecraft:iron_ingot", count: 1 },
            { type: "minecraft:item", io: "output", stack: { id: "minecraft:iron_nugget", count: 10 } }
        ]
    })
    .allowPartialOutputs()
    .smartInterfaceInput("mode", 1)
    .requiredHost("example:host_machine")
    .id("example:press_recipe_with_smart_interface")
})
```

## 8. Behavior Builders

### `MachineBehaviorBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.MachineBehaviorBuilderJS` is the behavior collector passed to `MachineBuilderJS.recipeBehavior(...)` and `tickBehavior(...)` callbacks.

**Fields**

| Name | Type | Description |
|------|------|------|
| `kind` | `MachineBehavior.Kind` | Determines the available callbacks; set by `MachineBuilderJS` during construction. |

**Methods**

#### `idleStart(Consumer<MachineBehaviorContext> callback) → MachineBehaviorBuilderJS`

- **Parameters**: `callback` (`Consumer<MachineBehaviorContext>`), called when a recipe machine's idle period begins.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if this is not a recipe behavior; `NullPointerException` if the callback is null.
- **Defaults**: Recipe behavior callbacks are unset by default.
- **Example**:

```javascript
machine.recipeBehavior(behavior => behavior.idleStart(ctx => {
    ctx.screenText().append(api.screenScope().OPERATION, api.id("example:idle"), Text.literal("Idle"))
}))
```

#### `idleEnd(Consumer<MachineBehaviorContext> callback) → MachineBehaviorBuilderJS`

- **Parameters**: `callback` (`Consumer<MachineBehaviorContext>`), called when a recipe machine's idle period ends.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if this is not a recipe behavior; `NullPointerException` if the callback is null.
- **Defaults**: Recipe behavior callbacks are unset by default.
- **Example**:

```javascript
behavior.idleEnd(ctx => {
    ctx.screenText().remove(api.screenScope().OPERATION, api.id("example:idle"))
})
```

#### `beforeStart(Consumer<RecipeStartContext> callback) → MachineBehaviorBuilderJS`

- **Parameters**: `callback` (`Consumer<RecipeStartContext>`), called before a recipe starts; can read or replace requirements.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if this is not a recipe behavior; `NullPointerException` if the callback is null.
- **Defaults**: Recipe behavior callbacks are unset by default.
- **Example**:

```javascript
behavior.beforeStart(ctx => {
    if (ctx.requirements().isEmpty()) ctx.cancel()
})
```

#### `recipeTick(Consumer<RecipeTickContext> callback) → MachineBehaviorBuilderJS`

- **Parameters**: `callback` (`Consumer<RecipeTickContext>`), called on every tick while a recipe is running.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if this is not a recipe behavior; `NullPointerException` if the callback is null.
- **Defaults**: Recipe behavior callbacks are unset by default.
- **Example**:

```javascript
behavior.recipeTick(ctx => {
    ctx.machineContext().screenText().append(api.screenScope().OPERATION, api.id("example:tick"), Text.literal("Working"))
})
```

#### `beforeFinish(Consumer<RecipeFinishContext> callback) → MachineBehaviorBuilderJS`

- **Parameters**: `callback` (`Consumer<RecipeFinishContext>`), called before a completed recipe produces its outputs.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if this is not a recipe behavior; `NullPointerException` if the callback is null.
- **Defaults**: Recipe behavior callbacks are unset by default.
- **Example**:

```javascript
behavior.beforeFinish(ctx => {
    if (ctx.requestedParallelism() < 1) ctx.cancel()
})
```

#### `serverTick(Consumer<TickBehaviorContext> callback) → MachineBehaviorBuilderJS`

- **Parameters**: `callback` (`Consumer<TickBehaviorContext>`), a direct server tick callback.
- **Returns**: The current builder.
- **Throws**: `IllegalStateException` if this is not a tick behavior; `NullPointerException` if the callback is null.
- **Defaults**: Tick behavior callbacks are unset by default.
- **Example**:

```javascript
machine.tickBehavior(behavior => behavior.serverTick(ctx => {
    if (ctx.isDue(40)) {
        const plan = ctx.ioPlan()
    }
}))
```

#### `build() → MachineBehavior`

- **Parameters**: None.
- **Returns**: An immutable recipe or tick behavior instance for `MachineBuilderJS.createObject()` to embed in the machine.
- **Throws**: `IllegalStateException` if the calls do not meet the requirements of `kind`.
- **Defaults**: None.
- **Example**:

```javascript
const behavior = behaviorBuilder.build()
```

:::warning Notes

- `RecipeStartContext`, `RecipeTickContext`, `RecipeFinishContext`, and `TickBehaviorContext` are passed to callbacks by the runtime; scripts do not need to load them with `Java.loadClass` or construct them manually.
- `RecipeTickContext` does not provide `ioPlan`; only `TickBehaviorContext` exposes IO plans.
- In recipe callbacks, `ctx.machineContext()` returns a `MachineBehaviorContext`, providing access to runtime state such as `dataStorage`, `screenText`, `jadeText`, `level`, and `controllerPos()`.
:::
### Behavior Runtime Types

All types in this section are in `cn.howxu.mmcr.api.machine.definition`, not `publicapi.machine`. Source: [MachineBehaviorContext](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/MachineBehaviorContext.java), [TickBehaviorContext](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/TickBehaviorContext.java), [RecipeStartContext](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeStartContext.java), [RecipeTickContext](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeTickContext.java), [RecipeFinishContext](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeFinishContext.java).

#### `MachineBehaviorContext`

| Method | Return value and semantics |
| --- | --- |
| `controller()` | The underlying controller block entity; prefer the context's dedicated accessors. |
| `level()` / `controllerPos()` / `machineId()` | `ServerLevel`, immutable `BlockPos`, and nullable `Identifier`. |
| `gameTime()` / `isDue(long period)` | World tick count and `floorMod(gameTime, period)==0`; the period must be positive. Timing is not tracked separately from each machine's start time. |
| `screenText()` / `jadeText()` | Handles for `api.controller.ControllerScreenText` and `api.controller.JadeText`. Runtime `screenText` is not the screen event wrapper; it uses enum scopes and `Identifier` row IDs. |
| `dataStorage()` | Nullable `api.data.view.DataStorage`; returns `null` when no storage is available. |
| `ioView()` | A read-only aggregate `MachineIoView`. |
| `upgradeItems()` | Returns a list of defensive copies of upgrade item stacks. |
| `countStructureBlocks(Block block)` / `countStructureBlocks(String blockId)` | `long`; counts blocks in the currently formed structure, or returns 0 if unformed. The string version validates that the block exists. |

`dataStorageForRuntime()` is an internal bridge; regular scripts should use `dataStorage()`. The view's `get` returns `Optional<api.data.view.DataValue>`; `set(key, Object)` supports ordinary script values, and the three-argument transaction version accepts `api.data.view.DataStorage.Transaction`. Do not treat the facade's `api.data.DataValue` and the view type as the same Java class.

```javascript
machine.preServerTick(ctx => {
    if (!ctx.isDue(20)) return
    const storage = ctx.dataStorage()
    if (storage != null) storage.set("formed_iron", ctx.countStructureBlocks("minecraft:iron_block"))
})
```

#### `TickBehaviorContext`

Inherits all accessors above and adds `factoryThreadCount() → int`, `parallelism() → long`, `smartInterfaceValue(String) → Optional<Float>`, `smartInterfaceValues() → Map<String, Float>`, `ioPlan() → MachineIoPlan`, and `capabilityTickContext(CapabilityTickPhase) → CapabilityTickContext`. `ioPlan()` creates a new plan **on every call**; even two calls within the same callback do not share requirements or simulation results. Store the plan in a local variable.

#### `RecipeStartContext`

`machineContext()`, `recipe()`, `recipeId()`, `requestedParallelism()`, `effectiveParallelism()`, and `duration()` provide information about this start attempt. `setDuration(int)` requires a positive value; `requirements()` returns a list of requirement copies, and `outputs()` returns the output list. `setRequirements(List<MachineRequirement>)` re-derives item/fluid outputs and rejects the operation if registered custom outputs already exist. In that case, use `setOutputs(List<MachineOutput>)`, which also updates the corresponding output requirements through the output registry.

`replaceExactItemInputCount(Item, int expectedCount, int replacementCount) → boolean` replaces only the first single-item input with a matching count. Both counts must be positive; it returns `false` if no match is found. It ultimately calls `setRequirements` and is subject to the same custom output restriction. `snapshot()` returns `ExecutionSnapshot(duration, requirements, outputs)`; `cancel()` / `cancelled()` control the cancellation flag for this start attempt.

#### `RecipeTickContext`

The immutable record's accessors are `machineContext()`, `recipe()`, `currentTick()`, `totalTick()`, `parallelism()`, `requirements()`, `outputs()`, and `capabilitySnapshot()`. Requirements/outputs are copied during construction. There are no `cancel`, `setDuration`, `setRequirements`, or `ioPlan` methods; the start context's mutation API does not apply here.

#### `RecipeFinishContext`

Accessors are `machineContext()`, `recipe()`, `recipeId()`, `requestedParallelism()`, `effectiveParallelism()`, and `outputs()`. `setOutputs(List<MachineOutput>)` copies the list and rejects empty item/fluid output stacks; `discardOutputs()` clears the list and sets the `outputsDiscarded()` flag; `cancel()` / `cancelled()` use a separate cancellation flag. Discarding outputs and canceling are distinct operations. Make changes through the methods rather than modifying the returned list directly and bypassing validation.

### `MachineIoView`

> `cn.howxu.mmcr.api.machine.definition.MachineIoView` is the read-only capability view returned by `ctx.machineContext().ioView()` (recipe callbacks) or `ctx.ioView()` (machine/tick callbacks). Source: [MachineIoView.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/MachineIoView.java).

#### Basic and Filtering Accessors

| Method | Return value and semantics |
| --- | --- |
| `forTags(Set<String> requiredTags)` | A new view containing only capabilities that match all tags; an empty set retains all capabilities. Does not modify the original view. |
| `displays()` | `List<CapabilityDisplay>`, display entries for the current capabilities. |
| `itemInputs()` / `fluidInputs()` | `List<ResourceAmount<ItemResource>>` / `List<ResourceAmount<FluidResource>>`, aggregating positive input amounts by resource identity (including components). |
| `itemAmount(Ingredient)` / `fluidAmount(FluidIngredient)` | `long`, totals amounts matching the input predicate; throws if the argument is `null`. |
| `energyInput()` | `long`, aggregates amounts in long-integer storage on the input side. |
| `itemOutputCapacity(ItemStack)` / `fluidOutputCapacity(FluidStack)` | `long`, remaining output capacity for the matching resource; returns 0 for an empty stack or `null`. |
| `energyOutputCapacity()` | `long`, remaining capacity in output-side long-integer storage. |
| `smartInterfaceValue(String name)` | `Optional<Float>`; empty if missing or if the name is `null`. Uses the first matching value in the snapshot. |
| `smartInterfaceValues()` | Immutable `Map<String, Float>`; deduplicates shared storage and uses the first value for each name. |

`ResourceAmount<R>` provides `resource()` and `amount()`; totals saturate at `Long.MAX_VALUE` on overflow. Capacity queries are read-only estimates and cannot replace a plan's combined simulation; multiple outputs can compete for the same capacity.

#### Additional Chemical and Heat Accessors

| Method | Returns | Meaning |
| --- | --- | --- |
| `chemicalInputs()` | `List<ResourceAmount<Identifier>>` | Aggregates all input capabilities by chemical ID. |
| `chemicalAmount(Identifier chemicalId)` | `long` | Queries the total input amount of the specified chemical. Throws if the ID is `null`. |
| `chemicalTagAmount(Identifier tagId)` | `long` | Queries the total chemical input amount matching the specified tag. Throws if the ID is `null`. |
| `chemicalOutputCapacity(Identifier chemicalId)` | `long` | Queries the remaining output capacity for the specified chemical. Throws if the ID is `null`. |
| `heatInputs()` | `List<HeatState>` | Returns the list of heat input states. |
| `heatOutputs()` | `List<HeatState>` | Returns the list of heat output states. |

`HeatState` provides three accessors: `heat()`, `temperature()`, and `heatCapacity()`, representing heat, temperature in K, and heat capacity, respectively. When no matching capability exists, lists are empty and amount/capacity queries return `0`.

```javascript
const view = ctx.machineContext().ioView()
const Identifier = Java.loadClass("net.minecraft.resources.Identifier")
const oxygen = view.chemicalAmount(Identifier.parse("mekanism:oxygen"))
const heatStates = view.heatInputs()
```

### `MachineIoPlan`

> `cn.howxu.mmcr.api.machine.definition.MachineIoPlan` is the IO plan entry point returned by `TickBehaviorContext.ioPlan()`. In direct tick callbacks, declare the inputs/outputs using `cn.howxu.mmcr.api.recipe.RecipeIoDeclaration` (`MachineRequirement` or `CustomRecipeIo`), then call `simulate()` followed by `commit()`. Each call to `ctx.ioPlan()` creates a new object. Source: [MachineIoPlan.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/MachineIoPlan.java).

**Fields**

No public fields; all data is accessed through methods.

**Methods**

#### `view() → MachineIoView`

Returns a new read-only view using the same capability snapshot, without adding requirements or performing simulation or IO. Use it to decide the planned amounts; feasibility must still be checked with `simulate()`.

#### `addInput(RecipeIoDeclaration requirement) → MachineIoPlan`

- **Parameters**: `requirement` (`RecipeIoDeclaration`) — an input declaration (`requirement.io() == INPUT`), typically from `api.itemInputRequirement(...)` / `api.fluidInputRequirement(...)` / `api.energyRequirement(...)` / `api.chemicalInput(...)` / `api.chemicalTagInput(...)` / `api.heatTemperatureInput(...)`. Decoded through `RecipeIoValidation.decodeIoRequirement`, then copied and stored.
- **Returns**: The current plan for chaining.
- **Throws**: `IllegalArgumentException` if `requirement.io()` is not `INPUT`.
- **Defaults**: None.
- **Example**:

```javascript
const plan = ctx.ioPlan()
    .addInput(api.itemInputRequirement("minecraft:iron_ingot", 1))
```

#### `addOutput(RecipeIoDeclaration requirement, OutputPolicy policy) → MachineIoPlan`

- **Parameters**: `requirement` (`RecipeIoDeclaration`) — an output declaration, typically from `api.itemOutputRequirement(...)` / `api.fluidOutputRequirement(...)` / `api.chemicalOutput(...)` / `api.heatOutput(...)`; obtain `policy` (`api.capability.plan.OutputPolicy`) through `api.outputPolicy()`.
- **Returns**: The current plan for chaining.
- **Throws**: `IllegalArgumentException` if the direction is not `OUTPUT` or declaration decoding fails; `IllegalStateException` when adding to a consumed plan.
- **Defaults**: Uses `REQUIRE_FULL` when `policy == null`. The `addOutput(RecipeIoDeclaration requirement)` overload also uses `REQUIRE_FULL`.
- **Example**:

```javascript
const plan = ctx.ioPlan()
    .addOutput(api.itemOutputRequirement("minecraft:iron_nugget", 10, 1.0),
               api.outputPolicy().ALLOW_PARTIAL)
```

#### `add(RecipeIoDeclaration requirement) → MachineIoPlan`

- **Parameters**: `requirement` (`RecipeIoDeclaration`) — automatically routed by direction to `addInput(...)` or `addOutput(requirement, REQUIRE_FULL)`.
- **Returns**: The current plan.
- **Throws**: As in the corresponding path (input mismatches throw `IllegalArgumentException`; the output policy is implicitly `REQUIRE_FULL`).
- **Defaults**: None.
- **Example**:

```javascript
const plan = ctx.ioPlan().add(api.energyRequirement(api.recipeIO().INPUT, 32))
```

#### `requirements() → List<MachineRequirement>`

- **Parameters**: None.
- **Returns**: A list of copies of decoded requirements, with **all inputs before outputs** and insertion order preserved within each group. Even if outputs are added first, new inputs are inserted before the first output and output policy indices are adjusted. Finish declaring requirements before simulating.
- **Throws**: Nothing.
- **Defaults**: Empty list.
- **Example**:

```javascript
const all = plan.requirements()
```

#### `simulate() → Simulation`

- **Parameters**: None.
- **Returns**: A `Simulation` record containing `inputsSatisfied`, `energySatisfied`, `outputs` (`List<OutputSimulation>`), and `failure` (the failure reason; `null` means simulation passed). You can call it repeatedly before `commit(...)` to preview results; it recalculates each time.
- **Throws**: `IllegalStateException` if the plan has been consumed by `commit(...)`.
- **Defaults**: No result until called.
- **Example**:

```javascript
const sim = plan.simulate()
if (sim.failure() == null) {
    plan.commit()
}
```

#### `commit() → CommitResult`

- **Parameters**: None.
- **Returns**: `CommitResult`; `successful` is `true` on success, and `failure` describes the failure reason.
- **Failure results**: Repeated commits return `CommitResult(false, null)` rather than throwing. Also returns failure when there is no cached successful simulation, simulation failed, or no actual `CraftingPlan` exists; **`commit()` does not simulate automatically** and consumes the plan even on failure.
- **Defaults**: Equivalent to `commit(ignored => {})`; the actual IO commit can still fail. Check `successful()` rather than relying only on earlier input checks.
- **Example**:

```javascript
const result = plan.commit()
if (!result.successful()) {
    console.log("commit failed:", result.failure())
}
```

#### `commit(Consumer<TransactionContext> transactionWrites) → CommitResult`

- **Parameters**: `transactionWrites` (`Consumer<TransactionContext>`), a transaction callback running in a NeoForge transfer transaction context. The callback receives NeoForge's `TransactionContext`; for data storage writes, prefer `commitData(...)` below.
- **Returns**: `CommitResult`.
- **Throws**: `NullPointerException` if the callback is `null`; callback and underlying transaction exceptions may propagate. Repeated commits and missing successful simulations return failure, with the same semantics as the no-argument commit.
- **Defaults**: None.
- **Example**:

```javascript
plan.commit(transaction => {
    // 低层 NeoForge transfer 事务操作
    // 必须此前成功 simulate；脚本额外写入需使用此 transaction
})
```

#### `commitData(Consumer<DataStorage.Transaction> transactionWrites) → CommitResult`

- **Parameters**: `transactionWrites` (`Consumer<api.data.view.DataStorage.Transaction>`), a data storage view transaction callback whose transaction can be passed to the three-argument overload of `ctx.dataStorage().set(...)`; this is not the `publicapi` transaction type.
- **Returns**: `CommitResult`.
- **Throws**: `NullPointerException` if `transactionWrites` is `null`; other commit semantics match `commit(...)`.
- **Example**:

```javascript
const storage = ctx.dataStorage()
if (storage == null) return
plan.commitData(transaction => {
    // 直接传入脚本值；写入会随 plan 一起回滚
    storage.set("energy", 20.0, transaction)
})
```

#### `outputSimulations() → List<OutputSimulation>` / `inputsSatisfied() → boolean` / `energySatisfied() → boolean`

- **Parameters**: None.
- **Returns**: Convenience accessors; if `simulate()` has not been called, they call it once automatically, then return the corresponding field.
- **Cache semantics**: With no cache, calls `simulate()`, which throws if the plan is consumed. With a cache, reads the original simulation result without simulating again, even if the plan has been committed. This is an old result and does not mean current resources still satisfy the requirements.
- **Defaults**: None.
- **Example**:

```javascript
if (plan.simulate().failure() == null) {
    plan.commit()
}
```

**Nested Records**

- `Simulation` — returned by `simulate()`. Fields: `inputsSatisfied` (`boolean`), `energySatisfied` (`boolean`), `outputs` (`List<OutputSimulation>`), and `failure` (`@Nullable ExecutionStatus`).
- `CommitResult` — returned by `commit(...)`. Fields: `successful` (`boolean`) and `failure` (`@Nullable ExecutionStatus`).

Read record fields through methods with the same names. `OutputSimulation` is in `api.capability.plan`, with accessors `requested() → long`, `accepted() → long`, and `fit() → OutputFit`; it only represents simulated amounts and fit classification, without producing outputs.

:::warning Notes

- `MachineIoPlan` is single-use: the first commit attempt consumes it, including attempts made before simulation or after a failed simulation. Repeated commits return `successful=false`; afterward, you cannot add requirements or call `simulate()` again. Convenience accessors may still read cached results, which do not permit another commit.
- `addInput(...)` / `addOutput(...)` reset the cached `Simulation`; you do not need to call `simulate()` manually to clear it.
- `OutputPolicy.ALLOW_PARTIAL` permits partial outputs when capacity is limited; `REQUIRE_FULL` requires room for all outputs. `inputsSatisfied` and `energySatisfied` only classify input failures and do not establish that outputs passed; check `Simulation.failure()` and the final `CommitResult.successful()`.
- `TransactionContext` is only usable inside the `commit(callback)` callback. The context closes when the callback returns, and accessing it outside the callback throws.
- Nontransactional `DataStorage.set(...)` (without `transaction`) and ordinary `remove` take effect immediately, do not register transaction snapshots themselves, and have no transactional consistency guarantee. The underlying `DataStorage` transaction snapshot saves the entire Map; once a transactional write has registered a snapshot for that storage, later ordinary writes or removals may also be overwritten by whole-map restoration on rollback. Do not infer per-key rollback boundaries from mixed operations; writes that must commit consistently with IO must use the transactional version.
:::
## 9. Levels and Level Types

### `LevelTypeBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.LevelTypeBuilderJS` is the level type builder returned by `MMCRStartupEventJS.createLevelType`.

**Fields**

| Name | Type | Default | Description |
|------|------|------|------|
| `displayNameKey` | `String` | `null` | Translation key for the level type's display name. |

**Methods**

#### `displayName(String displayName) → LevelTypeBuilderJS`

- **Parameters**: `displayName` (`String`), a translation key or text.
- **Returns**: The current builder; writes to `displayNameKey`.
- **Throws**: Nothing.
- **Defaults**: Uses the type ID string as the translation key when unset.
- **Example**:

```javascript
event.createLevelType("example:coil").displayName("level.example.coil")
```

#### `displayNameKey(String key) → LevelTypeBuilderJS`

- **Parameters**: `key` (`String`), a translation key.
- **Returns**: The current builder; an alias for `displayName`.
- **Throws**: Nothing.
- **Defaults**: None.
- **Example**:

```javascript
event.createLevelType("example:coil").displayNameKey("level.example.coil")
```

#### `createObject() → LevelType`

- **Parameters**: None.
- **Returns**: An immutable `LevelType`.
- **Throws**: No additional exceptions.
- **Defaults**: Falls back to the type ID string when the display name is unset.
- **Example**:

```javascript
const type = levelTypeBuilder.createObject()
```

#### `registerObject() → void`

- **Parameters**: None.
- **Returns**: Nothing; registers the `LevelType` in the current structure registration window.
- **Throws**: `ApiRegistrationException` on duplicates or if the window is frozen.
- **Defaults**: None.
- **Example**:

```javascript
levelTypeBuilder.registerObject()
```

#### `register() → LevelTypeBuilderJS`

- **Parameters**: None.
- **Returns**: The current builder.
- **Throws**: As in `registerObject()`.
- **Defaults**: None.
- **Example**:

```javascript
event.createLevelType("example:coil").displayNameKey("level.example.coil").register()
```

### `MachineLevelBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.MachineLevelBuilderJS` is the builder for individual levels returned by `MMCRStartupEventJS.createLevel`.

**Fields**

| Name | Type | Default | Description |
|------|------|------|------|
| `typeId` | `Identifier` | `null` | Parent level type ID. |
| `priority` | `int` | `0` | Level priority. |
| `state` | `BlockState` | `null` | Block representing the level. |
| `modifier` | `ModifierDefinition` | `ModifierDefinition.EMPTY` | Set of modifiers applied when the level is active. |

**Methods**

#### `type(String typeId) → MachineLevelBuilderJS`

- **Parameters**: `typeId` (`String`), a registered level type ID.
- **Returns**: The current builder.
- **Throws**: `IllegalArgumentException` if the ID is invalid.
- **Defaults**: `createObject()` throws `IllegalStateException` if unset.
- **Example**:

```javascript
event.createLevel("example:coil_iron").type("example:coil")
```

#### `priority(int priority) → MachineLevelBuilderJS`

- **Parameters**: `priority` (`int`), the level priority; higher values take precedence.
- **Returns**: The current builder.
- **Throws**: Nothing.
- **Defaults**: `0`.
- **Example**:

```javascript
event.createLevel("example:coil_iron").type("example:coil").priority(0)
```

#### `state(Object state) → MachineLevelBuilderJS`

- **Parameters**: `state` (`Object`), a `String` (block ID) or `BlockState`.
- **Returns**: The current builder; the string form uses the block's default state.
- **Throws**: `IllegalArgumentException` if the block is unknown or the argument is not a string/`BlockState`.
- **Defaults**: `createObject()` throws `IllegalStateException` if unset.
- **Example**:

```javascript
event.createLevel("example:coil_iron").state("minecraft:iron_block")
```

#### `modifier(ModifierDefinition modifier) → MachineLevelBuilderJS`

- **Parameters**: `modifier` (`ModifierDefinition`), a set of machine modifiers created through `KubeJSApi.modifierDefinition(...)`.
- **Returns**: The current builder.
- **Throws**: `NullPointerException` if `modifier` is `null`.
- **Defaults**: `ModifierDefinition.EMPTY`.
- **Example**:

```javascript
const api = event.getAPI()
event.createLevel("example:coil_iron")
    .modifier(api.modifierDefinition([
        api.modifier("duration", "input", 0.95, "multiply", false),
        api.modifier("parallelism", "machine", 4, "add", false)
    ]))
```

#### `createObject() → MachineLevel`

- **Parameters**: None.
- **Returns**: An immutable `MachineLevel`.
- **Throws**: `IllegalStateException` if `type` or `state` is unset.
- **Defaults**: `modifier` is `ModifierDefinition.EMPTY`.
- **Example**:

```javascript
const level = levelBuilder.createObject()
```

#### `registerObject() → void`

- **Parameters**: None.
- **Returns**: Nothing; registers the `MachineLevel` in the current structure registration window.
- **Throws**: `ApiRegistrationException` on duplicates or if the window is frozen; the registry rejects unregistered types.
- **Defaults**: None.
- **Example**:

```javascript
levelBuilder.registerObject()
```

#### `register() → MachineLevelBuilderJS`

- **Parameters**: None.
- **Returns**: The current builder.
- **Throws**: As in `registerObject()`.
- **Defaults**: None.
- **Example**:

```javascript
event.createLevel("example:coil_iron")
    .type("example:coil")
    .state("minecraft:iron_block")
    .register()
```

:::warning Notes

- Register level types before individual levels; registering a level first is rejected because its type cannot be found.
- A level's `priority` selects among levels of the same type; it does not replace structure or recipe level requirements.
- `modifier` uses the unified `ModifierDefinition(List<MachineModifier>)`; the old `parallelismBonus` / `factoryThreadBonus` / `IDENTITY` fields are not present here. Numeric entries must be finite, and targets, scopes, and chance flags are validated by `MachineModifier`; values for all operations should not be interpreted as positive multipliers.
:::
## 10. Controller Screen Text

### `ControllerScreenTextEventJS`

> `cn.howxu.mmcr.compat.kubejs.ControllerScreenTextEventJS` is the event object passed to `MMCRStartupEventJS.registerControllerScreenText` callbacks, allowing you to add, modify, or remove text rows on the controller screen.

**Fields**

| Name | Type | Description |
|------|------|------|
| `context` | `ControllerRuntimeContext` | Controller runtime context; not visible to `MachineBehaviorBuilderJS`, used only for internal bridging. |

**Methods**

#### `machineId() → Identifier`

- **Parameters**: None.
- **Returns**: The registered ID of the machine associated with the current screen.
- **Throws**: Nothing.
- **Defaults**: None.
- **Example**:

```javascript
event.registerControllerScreenText("example:press", text => {
    const id = text.machineId()
})
```

#### `controllerPos() → BlockPos`

- **Parameters**: None.
- **Returns**: The current controller block position.
- **Throws**: Nothing.
- **Defaults**: None.
- **Example**:

```javascript
const pos = text.controllerPos()
```

#### `append(String scope, String lineId, Component text) → void`

- **Parameters**: `scope` (`String`), either `controller` or `operation`; `lineId` (`String`), which must be namespaced, such as `example:status`; `text` (`Component`), the screen text.
- **Returns**: Nothing.
- **Throws**: `IllegalArgumentException` if `scope` is empty or not allowed; `lineId` is empty or missing a namespace or path; or `text` is `null`.
- **Defaults**: None.
- **Example**:

```javascript
text.append("controller", "example:status", Text.literal("Idle"))
```

#### `appendAfter(String scope, String lineId, String afterLineId, Component text) → void`

- **Parameters**: `scope` (`String`), either `controller` or `operation`; `lineId` (`String`), the new row ID; `afterLineId` (`String`), an existing row ID; `text` (`Component`) — the text.
- **Returns**: Nothing.
- **Throws**: `IllegalArgumentException` if either ID is invalid or `text` is `null`.
- **Defaults**: None.
- **Example**:

```javascript
text.appendAfter("operation", "example:new", "example:in", Text.literal("after"))
```

#### `replace(String lineId, Component text) → void`

- **Parameters**: `lineId` (`String`), an existing row ID; `text` (`Component`), the new text.
- **Returns**: Nothing.
- **Throws**: `IllegalArgumentException` if `lineId` is invalid or `text` is `null`.
- **Defaults**: None.
- **Example**:

```javascript
text.replace("example:status", Text.literal("Updated"))
```

#### `appendTranslatable(String scope, String lineId, String key, Object... args) → void`

- **Parameters**: `scope` and `lineId` as above; `key` (`String`), a translation key; `args` (`Object...`), translation placeholder arguments.
- **Returns**: Nothing.
- **Throws**: `IllegalArgumentException` if `scope`/`lineId`/`key` is invalid or `args` is `null`.
- **Defaults**: None.
- **Example**:

```javascript
text.appendTranslatable("controller", "example:status", "gui.example.status", Text.literal("75%"), 4)
```

#### `appendAfterTranslatable(String scope, String lineId, String afterLineId, String key, Object... args) → void`

- **Parameters**: Similar to `appendTranslatable`, with an additional `afterLineId`.
- **Returns**: Nothing.
- **Throws**: `IllegalArgumentException` if either ID or `key` is invalid, or `args` is `null`.
- **Defaults**: None.
- **Example**:

```javascript
text.appendAfterTranslatable("controller", "example:after", "example:in", "gui.example.after", Text.literal("arg"))
```

#### `replaceTranslatable(String lineId, String key, Object... args) → void`

- **Parameters**: `lineId` (`String`), an existing row ID; `key` (`String`), a translation key; `args` (`Object...`), translation placeholder arguments.
- **Returns**: Nothing.
- **Throws**: `IllegalArgumentException` if `lineId`/`key` is invalid or `args` is `null`.
- **Defaults**: None.
- **Example**:

```javascript
text.replaceTranslatable("example:status", "gui.example.status")
```

#### `remove(String scope, String lineId) → void`

- **Parameters**: `scope` (`String`), either `controller` or `operation`; `lineId` (`String`), an existing row ID.
- **Returns**: Nothing.
- **Throws**: `IllegalArgumentException` if `scope` or `lineId` is invalid.
- **Defaults**: None.
- **Example**:

```javascript
text.remove("operation", "example:status")
```

#### Java-Side Static Helpers

- `parseIdentifier(String value, String name)`: Parses a namespaced ID; throws `IllegalArgumentException` containing the field name on failure.
- `handler(Consumer<ControllerScreenTextEventJS> handler)`: Wraps a script callback as a `ControllerScreenTextHandler`.
- `parseScope(String value)`: Maps a string to `ControllerScreenTextScope`; throws `IllegalArgumentException` for values other than `controller`/`operation`.
- `parseNamespacedIdentifier(String value, String name)`: Validates that `value` contains a namespace and path, then calls `parseIdentifier`.

These are not public script entry points: `parseIdentifier` / `handler` are package-private, and `parseScope` / `parseNamespacedIdentifier` are private. The screen event's `context` field is also private and cannot be accessed directly.

**Registration Entry Point**

Controller screen text can only be registered during startup through `MMCRStartupEventJS.registerControllerScreenText(String machineId, Consumer<ControllerScreenTextEventJS> handler)`; `MMCRServerEventJS` has no such method.

**Example**

```javascript
MMCREvents.startup(event => {
    event.registerControllerScreenText("example:press", text => {
        text.append("controller", "example:status", Text.literal("Idle"))
        text.appendTranslatable("operation", "example:progress", "gui.example.progress", 50)
    })
})
```

:::warning Notes

- `lineId` must be a valid namespaced ID; `your_mod:line_name` is recommended.
- Static text rows (`controller` scope) are re-evaluated every client tick; `replace` uses last-write-wins semantics.
- Translation placeholder arguments support `Component` and primitive numeric values; do not pass objects that cannot be serialized to JSON.
:::
## 11. Internal Helpers

> This section lists helper classes used internally by the KubeJS integration layer, **not exposed to scripts**. They support the APIs above; do not reference them directly in user scripts.

### `KubeJSInterfaceHelpers`

> `cn.howxu.mmcr.compat.kubejs.KubeJSInterfaceHelpers` is the internal KubeJS-side factory for block predicates, port tiers, and smart interface requirements. All same-name methods in `KubeJSApi`, along with the port predicate and tier factories in `MachineBuilderJS`/`MachineStructureBuilderJS`/`MachineStructureStageBuilderJS`, delegate here; regular scripts do not need to call it directly.

Although this class is a public factory, it has no global binding; regular scripts should prefer the facade/builders. It provides input/output/combined predicates for items, fluids, energy, chemicals, radioactive chemicals, and heat; upgrade bus predicates; `ports()`; `anyOfPort(String...)` / `anyOfPort(Identifier...)` / `anyOfPort(api.machine.definition.BlockPredicate...)`; and a zero-argument `anyOfPort()` that explicitly throws. It also provides `factoryController`, `parallelControllers`, `smartInterface`, `dataStorage`, `networkInterface`, `port(String)` / `port(Identifier)`, twelve port tier / presence factories, two `smartInterfaceInput` overloads (fixed value and range), and one `smartInterfaceOutput`. The private `convert(...)` method converts underlying definition predicates to `api.machine.BlockPredicate`.

The facade and builders do not automatically expose every helper method: for example, the facade only exposes combined Mekanism port predicates, not `anyOfChemicalInput`; the machine builder has no `factoryController`, and the stage builder has no `dataStorage`.

The helper's direction-specific Mekanism factories are named `anyOfChemicalInput()` / `anyOfChemicalOutput()`, `anyOfRadioactiveChemicalInput()` / `anyOfRadioactiveChemicalOutput()`, and `anyOfHeatInput()` / `anyOfHeatOutput()`; all return the underlying `BlockPredicate`. `port(String)` / `port(Identifier)` construct a single port predicate; `anyOfPort` does not accept an empty list. The eight builder factories with tier parameters are `itemInputTier`, `itemOutputTier`, `fluidInputTier`, `fluidOutputTier`, `energyInputTier`, `energyOutputTier`, `chemicalInputTier`, and `chemicalOutputTier`; the four no-argument factories are `radioactiveChemicalInputTier()`, `radioactiveChemicalOutputTier()`, `heatInputTier()`, and `heatOutputTier()`. All return `PortTierRequirementSpec`. See [Port Tiers and Port Requirements](#port-requirements) for full tier names and presence semantics.

### `MachineRecipeFactory`

> `cn.howxu.mmcr.compat.kubejs.MachineRecipeFactory` is the KubeJS-side `KubeRecipeFactory` for the `mmcr:machine_recipe` recipe type. It exposes only two static constants:

- `TYPE` (`Identifier`) — the recipe type ID `mmcr:machine_recipe`.
- `INSTANCE` (`KubeRecipeFactory`) — the factory instance used by KubeJS's `RecipeFactoryRegistry`.

There are also four static helper methods for the integration layer: `allowPartialOutputs(KubeRecipe) → boolean`, `smartInterfaceInput(String, float) → MachineRequirement`, `smartInterfaceInput(String, float, float) → MachineRequirement`, and `smartInterfaceOutput(String, float) → MachineRequirement`. The first reads a JSON flag and is not a setter; scripts set the flag through the schema's same-name no-argument function.

### `MachineRecipeSchema`

> `cn.howxu.mmcr.compat.kubejs.MachineRecipeSchema` defines the `RecipeSchema` for `mmcr:machine_recipe` recipes (see Section 7). Internally, it maintains nine `RecipeKey` entries — `RECIPE_POOL` (`recipe_pool`)/`TICK_TIME`/`OUTPUTS`/`MODIFIERS`/`REQUIREMENTS`/`MAX_THREADS`/`PARALLELIZED`/`CANCEL_IF_PER_TICK_FAILS`/`ALLOW_PARTIAL_OUTPUTS` — along with the generic `JSON_ELEMENT` JSON component and a static `SCHEMA` instance.

`register(RecipeSchemaRegistry)` is called during the plugin's `registerRecipeSchemas` phase, and the internal `JsonElementComponent` bridges JSON elements and the KubeJS type system. Scripts should not construct `MachineRecipeSchema` directly; use its registered fields and functions through `event.custom({ type: "mmcr:machine_recipe", ... })`.

Within the component, `type()` returns the `mmcr:json` component type key, `codec()` converts JSON using `Codec.PASSTHROUGH`, `typeInfo()` declares `JsonElement`, `wrap(RecipeScriptContext, Object)` converts script values through KubeJS's `JsonUtils.of`, and `allowEmpty()` returns `true`. Each additional function's internal `arguments()` declares parameter components, and `execute(...)` modifies and saves the recipe JSON; these are KubeJS execution interfaces, not new methods for user scripts.

### `Plugin`

> `cn.howxu.mmcr.compat.kubejs.Plugin` is MMCR's `KubeJSPlugin` implementation. It injects `MMCR` and `MMCREvents` in `registerBindings` and registers the `mmcr` and `mmcr.smart_interface` event groups in `registerEvents`; the three registration methods below provide `MachineRecipeFactory.INSTANCE`, `JSON_ELEMENT`, and `MachineRecipeSchema.SCHEMA`, respectively.

These methods are `registerRecipeFactories(RecipeFactoryRegistry)`, `registerRecipeComponents(RecipeComponentTypeRegistry)`, and `registerRecipeSchemas(RecipeSchemaRegistry)`. All are called by KubeJS and are not registration entry points for user scripts.

`beforeScriptsLoaded` and `afterScriptsLoaded` also handle the following:

- Open a `KubeJSContentReloadTransaction` before loading `ScriptType.SERVER` scripts.
- Call `PublicApiBootstrap.begin()` and register development levels (currently a no-op) before loading `ScriptType.STARTUP` scripts.
- Call `MMCREvents.postServer()` and commit the transaction through `Plugin.completeServerReload(...)` after loading `ScriptType.SERVER` scripts.
- Call `MMCREvents.postStartup()` and `StartupContentRegistration.completeKubeJSStartupIfReady()` after loading `ScriptType.STARTUP` scripts.

Before client script loading, the error count is recorded; afterward, the recipe information event is posted. Client descriptions for that cycle are replaced only if JEI is available and the error count has not increased. `startupScriptsLoaded() → boolean` is a Java-side state query, not an entry point for reopening the startup window.

Scripts do not need to reference `Plugin` directly.

### `KubeJSContentReloadTransaction`

> `cn.howxu.mmcr.compat.kubejs.KubeJSContentReloadTransaction` accumulates structures and recipes during the `MMCREvents.server` transaction. Both `MachineStructureBuilderJS.build()` and `MachineRecipeBuilderJS.build()` obtain the current transaction through `KubeJSContentReloadTransaction.active()` and call `registerStructure(...)` or `registerRecipe(...)`.

Each ID can be registered only once per content type in a transaction. When preparing candidate content, it reads the dynamic snapshot, removes entries published by this transaction in the previous cycle that still match the current snapshot, then adds the current declarations. Recipes whose IDs already belong to another recipe pool are skipped and logged as errors. `RuntimeContentCoordinator.commitDynamicAndSnapshot` validates and publishes structure/recipe snapshots together, returning errors and the actual snapshot; the transaction retains this cycle's valid recipes for later replacement.

Source: [KubeJSContentReloadTransaction](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSContentReloadTransaction.java), [Plugin.completeServerReload](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/Plugin.java#L127). The condition for completing a reload is `errorCount == initialErrorCount || transaction.hasPublishableContent()`. If publishable candidates exist, it still attempts to commit valid content and synchronize the actual snapshot even when new errors appear in the script console; there is no guarantee that "any script error rolls back the entire cycle." The completion path clears the active transaction in `finally`; the abort path removes the current transaction and clears active state. This class is package-private and not visible to scripts.

### `KubeJSRecipeSync`

> `cn.howxu.mmcr.compat.kubejs.KubeJSRecipeSync` is the synchronization entry point called by the KubeJS datapack recipe reload mixin (`RecipeManagerMixin`). `replaceDataPackRecipes(Iterable<RecipeHolder<?>>)` is called each time KubeJS datapack recipes finish loading:

1. Iterates through the supplied `RecipeHolder` entries and selects those of type `MachineRecipe`.
2. Skips recipes owned by the currently active transaction based on the holder ID or recipe content, and validates that their recipe pools are registered; it does not skip every recipe ever published.
3. Calls `RuntimeContentCoordinator.replaceKubeJSRecipesAndSnapshot` to replace the KubeJS datapack recipe layer and reloads the display if JEI is available.

This class is an internal bridge that is not visible to scripts.

### `KubeJSReloadHooks`

> `cn.howxu.mmcr.compat.kubejs.KubeJSReloadHooks` bridges calls to `Plugin.abortServerReload(manager)` from KubeJS reload mixins on error paths, avoiding the need to place mixins outside the public `compat.kubejs` package. It exposes only the static `abortServerReload(Object manager)` method and is not visible to scripts.

---

## Appendix: Pinned Source Index

The index below covers all 24 source files under `compat/kubejs` in this baseline, making it easier to check public entry points, hidden overloads, and internal calls. All links are pinned to `f234477b`.

- **Globals and events**: [MMCRKubeJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MMCRKubeJS.java), [MMCRValues](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MMCRValues.java), [MMCREvents](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MMCREvents.java), [MMCRStartupEventJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MMCRStartupEventJS.java), [MMCRServerEventJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MMCRServerEventJS.java), [RecipeInformationEventJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/RecipeInformationEventJS.java).
- **Machines and structures**: [MachineBuilderJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBuilderJS.java), [MachineStructureBuilderJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineStructureBuilderJS.java), [MachineStructureStageBuilderJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineStructureStageBuilderJS.java), [MachineBehaviorBuilderJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBehaviorBuilderJS.java), [MachineLevelBuilderJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineLevelBuilderJS.java), [LevelTypeBuilderJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/LevelTypeBuilderJS.java).
- **Factories and recipes**: [KubeJSApi](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java), [KubeJSInterfaceHelpers](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSInterfaceHelpers.java), [MachineRecipeBuilderJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeBuilderJS.java), [MachineRecipeSchema](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeSchema.java), [MachineRecipeFactory](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeFactory.java).
- **Text and updates**: [ControllerScreenTextEventJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/ControllerScreenTextEventJS.java), [SmartInterfaceEvents](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/SmartInterfaceEvents.java), [SmartInterfaceUpdateEventJS](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/SmartInterfaceUpdateEventJS.java).
- **Loading and synchronization**: [Plugin](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/Plugin.java), [KubeJSContentReloadTransaction](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSContentReloadTransaction.java), [KubeJSRecipeSync](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSRecipeSync.java), [KubeJSReloadHooks](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSReloadHooks.java).

## Appendix: Cross-Section Notes

- **Lifecycle**: MMCR's startup window is opened by `Plugin.beforeScriptsLoaded` and closed by `afterScriptsLoaded`; machine definitions, levels, modifiers, and controller screen text must be registered within `MMCREvents.startup` callbacks. `MMCREvents.server` callbacks run inside the server-side KubeJS content transaction; calling `build()` after that transaction has ended throws `IllegalStateException`.
- **Block predicate types**: The facade returns `cn.howxu.mmcr.api.machine.BlockPredicate`, and `modifierUse` converts it to `cn.howxu.mmcr.api.machine.definition.BlockPredicate`. Both are in the underlying `api`; `publicapi` views cannot replace script bridge parameters.
- **Multiple recipe paths**: Data-driven recipes and programmatic transactional recipes use separate collection paths; without an active transaction, programmatic `build()` uses static registration. `MachineRecipeConverter` is an IO conversion bridge, not a separate recipe registration channel. Avoid duplicate IDs across layers; duplicate registration within a transaction is rejected, while cross-layer conflicts are validated by the content coordinator. There is no guarantee that every path immediately throws the same exception.
- **Network requests**: `sendRequest` throws `IllegalArgumentException` if the target interface cannot be found or is absent from `source`'s connection table; once queued, server-side network processing triggers `requestProcess` with the same ID. Failed checks during processing pass along the failure reason; the failure callback must already be registered on the source machine. The request body's root object must be a string-keyed map, with no empty or non-string keys; values are ultimately wrapped into `DataValue` by [`api.dataValue(...)`](#datavalue-object-value-→-datavalue).
- **Smart interfaces**: A smart interface type registered through `MachineBuilderJS.smartInterface(type, ...)` is a machine-level declaration. Structures can also use `set(symbol, smartInterfaceBlock())` to determine which positions allow interfaces; interface values are stored by the smart interface block and read by its bound controller.
- **Hot-reload scope**: Machine definitions, level types, levels, modifiers, and controller screen text are registered in startup scripts and require a game restart after changes; structures and recipe content can be reloaded with `/reload`.
- **Language conventions**: KubeJS converts the relevant arguments, but this does not make same-name classes in different Java packages interchangeable. Overloads marked `@HideFromJS` are for Java-side use only; in this baseline, `extension(BlockArray...)`, `pattern(List<String>)`, and the `Identifier` overloads for machine textures/sounds are hidden, while `fullStructure(...)`, `controllerSpec(...)`, and the machine constructor do not have this annotation.
