---
title: Data Storage Test Machine
order: 10
---

# Data Storage Test Machine — KubeJS Data Storage Machine

This is the first article in the advanced KubeJS examples.

The callback uses `api.machine.definition.TickBehaviorContext` and the underlying `MachineIoPlan`, rather than Java `publicapi`. The official script at this commit still uses `commit(transaction => storage.set(..., api.dataValue(next), transaction))`, but the current storage view requires a wrapped transaction type, and its `Object` overload does not accept the underlying `api.data.DataValue`; below, these two points are changed to `commitData(transaction => storage.set(..., next, transaction))`, passing `BigInteger` directly while retaining the rest of the data flow.
## Machine

The Data Storage Test Machine is an energy storage block **with no recipes**, with a data storage interface block embedded at its center:

1. Every 5 ticks, use **binary search** to probe the maximum FE currently extractable from energy input ports, and update the `BigInteger` count after a successful commit
2. Every 5 ticks, also withdraw stored energy: write the stored FE into energy output ports; supplying external devices from those ports is a separate, subsequent process
3. The amount is kept in the associated data storage block's `DataStorage` and saved with the block entity; persistence after an abnormal exit or block removal is not guaranteed
4. The tick callback writes controller screen text showing the current stored amount

## Files Involved


- [`startup_scripts/advance/A_Data_Storage_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/advance/A_Data_Storage_Machine.js)
Machine definition and tick behavior.
- [`server_scripts/structure/advance/A_Data_Storage_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Data_Storage_Machine.js)
Multiblock structure.

## API Reference Links

| KubeJS API Used | API Reference |
| --- | --- |
| `MMCR.getAPI()` | [Link](../API/KubeJS#getapi-→-kubejsapi) |
| `event.createMachine(...)` | [Link](../API/KubeJS#createmachine-string-id-→-machinebuilderjs) |
| `MachineBuilderJS.displayNameKey(...)` | [Link](../API/KubeJS#displaynamekey-string-key-→-machinebuilderjs) |
| `MachineBuilderJS.recipePool(...)` | [Link](../API/KubeJS#recipepool-string-recipepoolids-→-machinebuilderjs) |
| `MachineBuilderJS.appearance(...)` | [Link](../API/KubeJS#appearance-string-machinebasicblock-→-machinebuilderjs) |
| `MachineBuilderJS.tickBehavior(...)` | [Link](../API/KubeJS#tickbehavior-consumer-machinebehaviorbuilderjs-builder-→-machinebuilderjs) |
| `MachineBehaviorBuilderJS.serverTick(...)` | [Link](../API/KubeJS#servertick-consumer-tickbehaviorcontext-callback-→-machinebehaviorbuilderjs) |
| `TickBehaviorContext.ioPlan()` / `MachineIoPlan.simulate()` / `commitData(...)` | [Underlying implementation](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/MachineIoPlan.java) |
| `MachineBehaviorContext.dataStorage()` / `DataStorage.set(key, value, transaction)` | [Current storage view](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/data/view/DataStorage.java) |
| `KubeJSApi.recipeIO()` | [Link](../API/KubeJS#recipeio-→-recipeiovalues) |
| `KubeJSApi.outputPolicy()` | [Link](../API/KubeJS#outputpolicy-→-outputpolicyvalues) |
| `KubeJSApi.energyRequirement(...)` | [Link](../API/KubeJS#energyrequirement-recipemodifier-iotype-io-long-fepertick-→-machinerequirement) |
| `DataStorage.set(String, Object, DataStorage.Transaction)` | [Storage view](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/data/view/DataStorage.java) |
| `KubeJSApi.id(...)` | [Link](../API/KubeJS#id-string-id-→-identifier) |
| `KubeJSApi.screenScope()` | [Link](../API/KubeJS#screenscope-→-screenscopevalues) |
| `MMCR.getValues().INT_MAX` | [Link](../API/KubeJS#getvalues-→-mmcrvalues) |
| `KubeJSApi.readableNumberBigInt(...)` | [Link](../API/KubeJS#readablenumberbigint-biginteger-value-→-string) |
| `ControllerScreenText.append(ControllerScreenTextScope, Identifier, Component)` | [Underlying text interface](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/controller/ControllerScreenText.java) |
| `KubeJSApi.block(...)` / `anyOf(...)` | [Link](../API/KubeJS#block-string-blockid-→-blockpredicate) / [Link](../API/KubeJS#anyof-blockpredicate-children-→-blockpredicate) |
| `KubeJSApi.anyOfEnergyInput()` / `anyOfEnergyOutput()` | [Link](../API/KubeJS#anyofenergyinput-→-blockpredicate) / [Link](../API/KubeJS#anyofenergyoutput-→-blockpredicate) |
| `KubeJSApi.dataStorage()` | [Link](../API/KubeJS#datastorage-→-blockpredicate) |
| `MachineStructureBuilderJS.pattern(...)` / `set(...)` / `controller(...)` / `build()` | [Link](../API/KubeJS#pattern-string-rows-→-machinestructurebuilderjs) / [Link](../API/KubeJS#set-string-symbol-object-value-→-machinestructurebuilderjs) / [Link](../API/KubeJS#controller-string-symbol-→-machinestructurebuilderjs) / [Link](../API/KubeJS#build-→-void) |

The source also obtains a public Java class directly through `Java.loadClass`:

| Java Class | Purpose |
| --- | --- |
| `java.math.BigInteger` | Counting |

## Machine Definition in Detail

Startup script [`A_Data_Storage_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/advance/A_Data_Storage_Machine.js):

```javascript
MMCREvents.startup(event => {
    const machine = event
        .createMachine("mmcr_kubejs:kubejs_data_storage_machine")
        .displayNameKey("machine.mmcr_kubejs.kubejs_data_storage_machine")
        .recipePool("mmcr_kubejs:kubejs_data_storage_machine")
        .appearance("minecraft:crying_obsidian");
    // ... 见下文
    machine.register()
})
```

Chain four method calls:

- `.displayNameKey(...)`: Declare the localization key.
- `.recipePool(...)`: Bind the machine to a recipe pool ID. This machine **has no recipes**, but still sets a recipe pool ID.
- `.appearance("minecraft:crying_obsidian")`: Use crying obsidian as the appearance block.
- `.tickBehavior(...)`: Switch behavior to direct tick mode. You **cannot then** call `.recipeBehavior(...)`; the two are mutually exclusive in [`MachineBuilderJS`](../API/KubeJS#machinebuilderjs).

Declare several constants that will be used repeatedly:

```javascript
const BigInteger = Java.loadClass("java.math.BigInteger")
const api = MMCR.getAPI()
const RecipeIO = api.recipeIO()
const OutputPolicy = api.outputPolicy()
const INT_MAX = MMCR.getValues().INT_MAX
```

Explanation of each:

- `Java.loadClass("java.math.BigInteger")`: The virtual stored amount uses an arbitrary-precision integer. MMCR's underlying energy storage and requirements use `long`; this example deliberately limits each request to `INT_MAX`, which does not mean that all ports have only `int` capacity.
- `MMCR.getAPI()` returns [`KubeJSApi`](../API/KubeJS#kubejsapi), referred to as `api` throughout the following sections. The stored-amount string is rendered with [`api.readableNumberBigInt(...)`](../API/KubeJS#readablenumberbigint-biginteger-value-→-string).
- `api.recipeIO()` returns the [`RecipeIoValues`](../API/KubeJS#recipeio-→-recipeiovalues) constants object; this tutorial uses the two direction enum values `.INPUT` / `.OUTPUT`.
- `api.outputPolicy()` returns the [`OutputPolicyValues`](../API/KubeJS#outputpolicy-→-outputpolicyvalues) constants object. This tutorial uses `.ALLOW_PARTIAL`, which allows partial acceptance.
- `MMCR.getValues()` returns [`MMCRValues`](../API/KubeJS#getvalues-→-mmcrvalues); `.INT_MAX` is `Integer.MAX_VALUE`, used here to limit the amount transferred per round.

## Structure

Open [`structure/advance/A_Data_Storage_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Data_Storage_Machine.js):

```javascript
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_data_storage_machine")

    structure
        .pattern("         ", "         ", "         ", "   AAA   ", "   ABA   ", "   AAA   ", "         ", "         ", "         ")
        .pattern("         ", "         ", "  AAAAA  ", "  AXXXA  ", "  AXXXA  ", "  AXXXA  ", "  AAAAA  ", "         ", "         ")
        .pattern("         ", "  AAAAA  ", " AXXXXXA ", " AXXXXXA ", " AXXXXXA ", " AXXXXXA ", " AXXXXXA ", "  AAAAA  ", "         ")
        .pattern("   AAA   ", "  AXXXA  ", " AXXXXXA ", "AXXXXXXXA", "AXXXXXXXA", "AXXXXXXXA", " AXXXXXA ", "  AXXXA  ", "   AAA   ")
        .pattern("   ABA   ", "  AXXXA  ", " AXXXXXA ", "AXXXXXXXA", "BXXXDXXXB", "AXXXXXXXA", " AXXXXXA ", "  AXXXA  ", "   ABA   ")
        .pattern("   AAA   ", "  AXXXA  ", " AXXXXXA ", "AXXXXXXXA", "AXXXXXXXA", "AXXXXXXXA", " AXXXXXA ", "  AXXXA  ", "   AAA   ")
        .pattern("         ", "  AAAAA  ", " AXXXXXA ", " AXXXXXA ", " AXXXXXA ", " AXXXXXA ", " AXXXXXA ", "  AAAAA  ", "         ")
        .pattern("         ", "         ", "  AAAAA  ", "  AXXXA  ", "  AXXXA  ", "  AXXXA  ", "  AAAAA  ", "         ", "         ")
        .pattern("         ", "         ", "         ", "   AAA   ", "   ACA   ", "   AAA   ", "         ", "         ", "         ")
        .set('X', api.block('minecraft:redstone_block'))
        .set('A', api.block('minecraft:crying_obsidian'))
        .set('B', api.anyOf(
            api.anyOfEnergyInput(),
            api.anyOfEnergyOutput()
        ))
        .set('D', api.dataStorage())
        .controller('C')
        .build()
})
```

Symbol meanings:

- `'X'` → [`api.block('minecraft:redstone_block')`](../API/KubeJS#block-string-blockid-→-blockpredicate): Redstone block.
- `'A'` → [`api.block('minecraft:crying_obsidian')`](../API/KubeJS#block-string-blockid-→-blockpredicate): Crying obsidian.
- `'B'` → [`api.anyOf(...)`](../API/KubeJS#anyof-blockpredicate-children-→-blockpredicate) wraps [`api.anyOfEnergyInput()`](../API/KubeJS#anyofenergyinput-→-blockpredicate) and [`api.anyOfEnergyOutput()`](../API/KubeJS#anyofenergyoutput-→-blockpredicate): There are five port positions on the sphere's surface, with the controller at the center of the sixth face; each port can be either an input or an output.
- `'D'` → [`api.dataStorage()`](../API/KubeJS#datastorage-→-blockpredicate): **Key point**
Place a data storage block at `D`; `ctx.dataStorage()` can obtain the storage view of the associated data.
If this block is absent from the structure, `dataStorage()` returns `null`, and the tick immediately executes `return`.
- `'C'` → Controller.

`.controller('C')` marks the controller position, and `.build()` submits to the current server KubeJS content transaction.

## Data Flow in Detail (Tick Behavior)

The core logic is in the callback of `.tickBehavior(behavior => behavior.serverTick(ctx => { ... }))`.

### 1. Read the Current Stored Amount

```javascript
const api = MMCR.getAPI()       // 已经在外面取过；这里仅为引用
const RecipeIO = api.recipeIO()
const OutputPolicy = api.outputPolicy()
const INT_MAX = MMCR.getValues().INT_MAX

machine.tickBehavior(behavior => behavior
    .serverTick(ctx => {
        var storage = ctx.dataStorage()
        if (storage == null) return

        // get big integer data from data storage
        var stored = BigInteger.ZERO
        var saved = storage.get("energy")

        if (saved.isPresent()) {
            stored = saved.get()
                .asBigInteger()
                .orElse(BigInteger.ZERO)
        }
        // ...
    })
)
```

`ctx.dataStorage()` returns a nullable `cn.howxu.mmcr.api.data.view.DataStorage` view, with `api.data.DataStorage` as its underlying state. It is neither the BlockEntity itself nor the data repository interface in `publicapi`.

If the player has not placed a data storage block at `D` (or has not formed the machine), this is `null`, and the entire tick immediately executes `return`.

`storage.get("energy")` returns `Optional<api.data.view.DataValue>`; `.asBigInteger()` returns a non-empty value only when the value is actually a `BigInteger`, and does not automatically convert other numeric values to big integers. The view's `set(String, Object, Transaction)` accepts `BigInteger` directly, but cannot accept what `api.dataValue(next)` produces: the underlying `api.data.DataValue`.

### 2. Binary Search for the Maximum FE That Can Be Stored

```javascript
// every 5 ticks do one input check
if (ctx.isDue(5)) {
    // 本例将单轮请求限制为 INT_MAX，底层能量需求仍使用 long
    var available = ctx.ioView().energyInput()
    var maxRequest = Math.min(available, INT_MAX)

    var low = 0
    var high = maxRequest

    // a binary search for every input hatch for transferLimit
    while (low < high) {
        var candidate = low + Math.ceil((high - low) / 2)

        var probe = ctx.ioPlan()
        probe.addInput(api.energyRequirement(RecipeIO.INPUT, candidate))

        if (probe.simulate().energySatisfied()) {
            low = candidate
        } else {
            high = candidate - 1
        }
    }

    // ...
}
```

`ctx.isDue(5)` is MMCR's utility for "triggering once every N ticks", avoiding repeated heavy work on every tick. Here, energy input is attempted only once every 5 ticks.

The logic: first use `ctx.ioView().energyInput()` to obtain the total stored energy in the input ports, then binary-search `[0, maxRequest]` for the largest `candidate` that the current plan can extract. The total stored amount is not the amount transferable in one operation; simulation also considers port transfer limits. In each iteration:

- Create a new plan (`ctx.ioPlan()`) and add an input requirement of `candidate` FE with [`api.energyRequirement(RecipeIO.INPUT, candidate)`](../API/KubeJS#energyrequirement-recipemodifier-iotype-io-long-fepertick-→-machinerequirement)
- Use `probe.simulate().energySatisfied()` to probe whether the ports can satisfy this input
- Raise the lower bound if they can; lower the upper bound if they cannot

At the end, `low` is the largest satisfiable input amount in this round of probing; binary search relies on the current ports' satisfiability being monotonic with respect to the requested amount, a property that cannot be guaranteed for arbitrary custom capabilities.

`INT_MAX` limits each request in this example and also makes the later `intValue()` conversion safe; the underlying `EnergyRequirement` FE amount parameter is still `long`.

### 3. Store and Persist Energy

```javascript
if (low > 0) {
    var inputPlan = ctx.ioPlan()
    inputPlan.addInput(api.energyRequirement(RecipeIO.INPUT, low))

    var next = stored.add(BigInteger.valueOf(low))
    var inputSimulation = inputPlan.simulate()

    if (inputSimulation.energySatisfied() && inputPlan.commitData(transaction => {
        // update the data storage value
        storage.set("energy", next, transaction)
    }).successful()) {
        stored = next
    }
}
```

A plan is single-use: any commit attempt consumes it. Here, a new plan is created to simulate again and actually commit the `low` obtained from binary search.

Note the callback of `commitData(transaction => { ... })`:

- `commit(Consumer<TransactionContext>)` uses `net.neoforged.neoforge.transfer.transaction.TransactionContext`; `commitData(Consumer<api.data.view.DataStorage.Transaction>)` wraps the same transaction in the type accepted by the current storage view.
- `storage.set(String, Object, DataStorage.Transaction)` returns a `boolean` indicating whether the value changed, not whether the transaction has committed. The actual journal is the internal `api.data.DataStorage extends SnapshotJournal<Map<String, DataValue>>`.
- The data-writing callback is invoked only after all IO succeeds, and the root transaction is then committed. An IO failure does not execute the callback; if the callback throws an exception, the IO / data journal state participating in that transaction is rolled back, and the exception propagates outward rather than returning a failure result.

After success, `stored = next` updates the locally cached `BigInteger` to match.

### 4. Withdraw Energy

```javascript
// every 5 tick do one output
if (ctx.isDue(5)) {
    // get output capability
    var outputCapacity = ctx.ioView().energyOutputCapacity()

    if (outputCapacity > 0 && stored.signum() > 0) {
        // limit 2.1G
        var requestedBig = stored.min(
            BigInteger.valueOf(Math.min(outputCapacity, INT_MAX))
        )
        var requested = requestedBig.intValue()

        if (requested > 0) {
            var outputPlan = ctx.ioPlan()

            // some output hatches have transformer limit, so OutputPolicy.ALLOW_PARTIAL
            outputPlan.addOutput(
                api.energyRequirement(RecipeIO.OUTPUT, requested),
                OutputPolicy.ALLOW_PARTIAL
            )

            var simulation = outputPlan.simulate()
            var outputs = simulation.outputs()

            if (!outputs.isEmpty()) {
                var accepted = outputs.get(0).accepted()

                if (accepted > 0) {
                    var next = stored.subtract(
                        BigInteger.valueOf(accepted)
                    )

                    // 与 IO 共用事务写入储量；不是 JS Promise
                    if (outputPlan.commitData(transaction => {
                        storage.set("energy", next, transaction)
                    }).successful()) {
                        stored = next
                    }
                }
            }
        }
    }
}
```

Key points:

- `ctx.ioView().energyOutputCapacity()` obtains the total remaining capacity of all energy output ports.
- The write direction is [`RecipeIO.OUTPUT`](../API/KubeJS#recipeio-→-recipeiovalues); [`OutputPolicy.ALLOW_PARTIAL`](../API/KubeJS#outputpolicy-→-outputpolicyvalues) allows the plan to output less than the requested amount, whereas `REQUIRE_FULL` requires the plan to accommodate the entire request.
- `.accepted()` from `simulation.outputs()` is the amount planned to be written into the output ports, which may be less than `requested`; it is not the amount already received by the world.
- Built-in energy operations must transfer the planned amount when committing; an insufficient actual transfer fails and rolls back their journal state. Therefore, the planned accepted amount is deducted only after `commitData(...).successful()`; on failure, the local `stored` remains unchanged. This does not re-simulate and silently accept a smaller output amount.
- Input and output are two independent transactions; an output failure does not undo a successful storage operation from the same tick.

### 5. Controller Screen Text

```javascript
if (stored.signum() === 0){
    ctx.screenText().append(
        api.screenScope().OPERATION,
        api.id("mmcr_kubejs:fe_storage_status"),
        Text.literal("No FE stored.")
    )
    return
}
ctx.screenText().append(
    api.screenScope().OPERATION,
    api.id("mmcr_kubejs:fe_storage_status"),
    Text.literal("FE stored: " + api.readableNumberBigInt(stored))
)
```

`ctx.screenText()` obtains the underlying `api.controller.ControllerScreenText`, not the `ControllerScreenTextEventJS` used for startup registration; the scope / ID here are provided by `api.screenScope().OPERATION` / `api.id(...)`, respectively.

[`api.screenScope().OPERATION`](../API/KubeJS#screenscope-→-screenscopevalues) participates in runtime operation-text cleanup; this example writes to the same scope / ID every tick, and `append` replaces the existing content at that key. Having no recipes does not mean this scope will never be cleared; text display also depends on controller refresh and synchronization.

[`api.readableNumberBigInt(stored)`](../API/KubeJS#readablenumberbigint-biginteger-value-→-string) renders a `BigInteger` as a compact string suitable for display in screen slots. Its underlying counterpart is [`api.presentation.ReadableNumber`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/presentation/ReadableNumber.java).

[`api.id("mmcr_kubejs:fe_storage_status")`](../API/KubeJS#id-string-id-→-identifier) parses a string into a namespaced ID to serve as the screen text line's `lineId`. Repeatedly calling `append` with the same `lineId` replaces the content, providing an "idempotent overwrite".

> JADE text: This machine does not call `ctx.jadeText()`. Jade text and screen text are two independent channels.

## Special Mechanisms

### Transaction-Aware `DataStorage`

What you obtain at runtime is a storage view; the underlying [`api.data.DataStorage`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/data/DataStorage.java) it delegates to extends NeoForge's `SnapshotJournal<Map<String, DataValue>>`. The view's current signatures are:

| Method | Return Value / Meaning |
| --- | --- |
| `get(String key)` | `Optional<api.data.view.DataValue>` |
| `contains(String key)` | `boolean` |
| `values()` | An unmodifiable `Map<String, api.data.view.DataValue>` snapshot, not a live mutable Map |
| `set(String key, DataValue value)` / `set(String key, Object value)` | `void`; writes immediately |
| `set(String key, DataValue value, Transaction tx)` / `set(String key, Object value, Transaction tx)` | `boolean`; joins the transaction journal and indicates whether the value changed |
| `remove(String key)` | `Optional<api.data.view.DataValue>`; removes immediately; there is currently no transactional removal overload |

Here, `DataValue` / `Transaction` refer to the types in `api.data.view`, and `Transaction` is a nested class of `DataStorage`. Keys cannot be null or blank.

Use the underlying `MachineIoPlan.commitData(...)` to obtain the corresponding view transaction:

```javascript
plan.commitData(transaction => {
    storage.set("energy", next, transaction)
}).successful()
```

You must call `plan.simulate()` before committing; `commitData` does not simulate automatically. Storage writes participating in the transaction can be rolled back until the root transaction commits. Ordinary `set`, `remove`, screen updates, network sends, lightning, and explosions do not automatically join the journal, so atomic rollback cannot be guaranteed even when they are written inside the commit callback.

The storage view's `Object` overload wraps supported values through `api.data.view.DataValue.from(...)`; this example passes `BigInteger` directly. The underlying `api.data.DataValue`, the view's `api.data.view.DataValue`, and Java `publicapi` data values are not the same interchangeable class.

### `BigInteger` Counting

`BigInteger` is slower than `long`, but can hold accumulated values of arbitrary size. If your storage machine uses FE as its energy unit and handles a few hundred FE per tick, `long` is sufficient. If you want to simulate an "infinite reservoir", such as cosmic energy or a mod's custom energy source, `BigInteger` will never overflow.

In the source, `Math.min(outputCapacity, INT_MAX)` caps the `long` output capacity at the `int` range to allow safe conversion with `BigInteger.intValue()`.

### Separating Probing from Committing

Binary search calls only `simulate()` and never commits; the actual write uses a second, independent plan. This follows `MachineIoPlan`'s single-use rule. A plan becomes invalid after a `commit`, so the plan newly created the **second time** is the one used for the actual commit.

### The Boundary Between the Two `DataValue` Types

[`api.dataValue(value)`](../API/KubeJS#datavalue-object-value-→-datavalue) produces the underlying `api.data.DataValue`, suitable for entry points such as the underlying storage received by network handlers. `ctx.dataStorage()`, however, returns a storage view; pass a supported raw value directly or use `api.data.view.DataValue`. The round trip in this example is:

- `storage.set("energy", next, transaction)`: The view wraps the `BigInteger` and joins the same IO transaction

- On the receiving side, `saved.get().asBigInteger().orElse(BigInteger.ZERO)` safely retrieves the `BigInteger` from `DataValue`

The retrieval methods supported on the KubeJS side include not only `asBigInteger`, but also `asBoolean` / `asString` / `asInt` / `asLong` / `asFloat` / `asDouble`, among others.


## Further Reading

- [Pure Tick Machine Example](./pure-tick-machine-example) — Also a direct tick machine, but without data storage.
- [Compute–Network Interaction Example](./compute-network-example) — Uses [`api.dataValue(...)`](../API/KubeJS#datavalue-object-value-→-datavalue) to transfer data between machines.
- [Data Storage Test Machine](../JavaAPI/data-store-test-machine) — The Java-side implementation of this machine.
- [KubeJS API](../API/KubeJS) — A central reference for the APIs cited in this tutorial.
- [KubeJS API#dataValue](../API/KubeJS#datavalue-object-value-→-datavalue) — Complete documentation for the typed value wrapper.
- [KubeJS API#dataStorage()](../API/KubeJS#datastorage-→-blockpredicate) — The data storage block predicate.
- [KubeJS API#tickBehavior](../API/KubeJS#tickbehavior-consumer-machinebehaviorbuilderjs-builder-→-machinebuilderjs) — The entry point for switching a machine to direct tick mode.
