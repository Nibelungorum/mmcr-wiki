---
title: Data Storage Test Machine
order: 11
---

# Data Storage Test Machine

This recipe-free, pure-Tick machine demonstrates persistent energy storage: every 5 ticks, it probes extractable FE, stores the energy in a `BigInteger` counter, then withdraws it according to the amount accepted by output ports. Finally, it updates the controller screen. **This example does not write JADE text.**

## Files and APIs

- [DATA_STORAGE_MACHINE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/builtin/DATA_STORAGE_MACHINE.java)
- [KubeJS structure reference example](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Data_Storage_Machine.js): it registers `mmcr_kubejs:kubejs_data_storage_machine`, not the Java machine on this page.

| API | Purpose and signature reference |
| --- | --- |
| `Machines` / `Structures` | [Machine entry point](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Machines.java) / [structure entry point](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Structures.java) |
| `RegisterMachineDefinitionsEvent` / `RegisterMachineStructuresEvent` | Registers machine definitions and structures; `build()` produces `MachineSpec` and `StructureSpec`, respectively |
| `BlockConditions` | [Block, energy-port, and data-storage-port conditions](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/structure/BlockConditions.java) |
| `MachineContext` / `TickContext` | [General server context](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/MachineContext.java) / [direct Tick context](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/TickContext.java) |
| `IoTransaction` / `IoSnapshot` | [One-shot IO plan](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/runtime/IoTransaction.java) / [capability collection view](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/runtime/IoSnapshot.java) |
| `Requirements` / `IoDirection` / `OutputMode` | `energy(INPUT, amount)` declares input; `ALLOW_PARTIAL` permits partial output |
| `DataStore` / `DataKey` | [Live storage handle](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/data/DataStore.java) / [typed data value](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/data/DataKey.java) |
| `ControllerText` / `TextScope` | [Screen-text handle](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/presentation/ControllerText.java); this page uses `OPERATION` |
| `ReadableNumber` | `formatCompact(BigInteger)` displays a compact value |

## Machine Definition

```java
private static final Identifier DATA_STORAGE_MACHINE = id("data_storage_machine");
private static final Identifier FE_STATUS = id("fe_storage_status");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(DATA_STORAGE_MACHINE)) {
        MachineSpec machine = Machines.machine(DATA_STORAGE_MACHINE)
                .recipePool(DATA_STORAGE_MACHINE)
                .displayNameKey("machine.mmcr.data_storage_machine")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:crying_obsidian")))
                .tickBehavior(behavior -> behavior.serverTick((TickContext context) -> {
                    // 将下文“数据流”的代码按顺序放在这里。
                }))
                .build();
        event.registerMachine(machine);
    }
}
```

`recipePool(...)` matches the current builtin, but it does not turn `tickBehavior(...)` into recipe behavior. This machine's runtime logic is still entirely driven by `serverTick`.

## Multiblock Structure

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(DATA_STORAGE_MACHINE)) {
        StructureSpec structure = Structures.structure()
                .fullStructure(s -> s.pattern(p -> p
                        .layer()
                        // ...省略
                        .where('X', block(Blocks.REDSTONE_BLOCK))
                        .where('A', block(Blocks.CRYING_OBSIDIAN))
                        .where('B', any(BlockConditions.energyInput(), BlockConditions.energyOutput()))
                        .where('D', BlockConditions.dataStorage())
                        .controller('C')))
                .build(DATA_STORAGE_MACHINE);
        event.registerStructure(structure);
    }
}
```

`B` permits an energy input or output port; `D` must be a data-storage port. Persistent data belongs to that port's block entity, rather than the controller automatically saving arbitrary custom fields. `context.dataStorage()` returns the associated port's `DataStore`, or `null` when there is no associated storage. Structure recognition associates player-placed blocks; it does not create a new storage block out of nothing when the structure forms.

## Data Flow

### 1. Read Stored Energy

```java
DataStore storage = context.dataStorage();
if (storage == null) return;

BigInteger stored = BigInteger.ZERO;
var saved = storage.get("energy");
if (saved.isPresent()) {
    stored = saved.get().asBigInteger().orElse(BigInteger.ZERO);
}
```

`get(String)` returns `Optional<DataKey>`. `DataKey` is a value object, and `asBigInteger()` is a type conversion; a missing key or type mismatch both fall back to zero. `BigInteger` is suitable for accumulated counts beyond the `long` limit, though each port transfer in this example remains limited to `Integer.MAX_VALUE`.

### 2. Probe and Deposit

```java
if (context.isDue(5)) {
    int available = (int) Math.min(context.ioView().energyInput(), Integer.MAX_VALUE);
    int low = 0;
    int high = available;
    while (low < high) {
        int candidate = low + (int) Math.ceil((high - low) / 2.0);
        IoTransaction probe = context.ioPlan();
        probe.addInput(Requirements.energy(IoDirection.INPUT, candidate));
        if (probe.simulate().energySatisfied()) {
            low = candidate;
        } else {
            high = candidate - 1;
        }
    }

    if (low > 0) {
        IoTransaction inputPlan = context.ioPlan();
        inputPlan.addInput(Requirements.energy(IoDirection.INPUT, low));
        BigInteger next = stored.add(BigInteger.valueOf(low));
        var inputSimulation = inputPlan.simulate();
        if (inputSimulation.energySatisfied() && inputPlan.commitData(transaction ->
                storage.set("energy", DataKey.of(next), transaction)).successful()) {
            stored = next;
        }
    }
}
```

`IoSnapshot.energyInput()` queries the current total energy and does not guarantee that all of it can be extracted in one transfer. The binary search uses `simulate()` to probe the input amount that current ports can satisfy, creating an independent plan each time. It then creates a new plan for the actual commit, updating local `stored` only after success.

`simulate()` performs no actual consumption and reserves no resources, so a successful simulation must still be followed by `commitData(...).successful()`. The binary search suits this example's energy requirement; do not generalize it directly to custom capabilities with non-monotonic acceptance.

### 3. Withdraw According to Output Capacity

```java
if (context.isDue(5)) {
    long outputCapacity = context.ioView().energyOutputCapacity();
    if (outputCapacity > 0 && stored.signum() > 0) {
        BigInteger requestedBig = stored.min(
                BigInteger.valueOf(Math.min(outputCapacity, Integer.MAX_VALUE)));
        int requested = requestedBig.intValue();
        if (requested > 0) {
            IoTransaction outputPlan = context.ioPlan();
            outputPlan.addOutput(Requirements.energy(IoDirection.OUTPUT, requested),
                    OutputMode.ALLOW_PARTIAL);
            var simulation = outputPlan.simulate();
            var outputs = simulation.outputs();
            if (!outputs.isEmpty()) {
                long accepted = outputs.get(0).accepted();
                if (accepted > 0) {
                    BigInteger finalStored = stored.subtract(BigInteger.valueOf(accepted));
                    if (outputPlan.commitData(transaction ->
                            storage.set("energy", DataKey.of(finalStored), transaction)).successful()) {
                        stored = finalStored;
                    }
                }
            }
        }
    }
}
```

- `energyOutputCapacity()` is a query for the current total remaining capacity; the amount actually output still depends on the simulation result.
- `OutputMode.REQUIRE_FULL` requires full acceptance; `ALLOW_PARTIAL` allows accepting part of it.
- Elements of `outputs()` are `OutputAcceptance`; `requested()` is the requested amount and `accepted()` is the **simulated accepted amount**, not an already-performed world write.
- This example calculates the withdrawal from the simulated accepted amount and updates the local count only after IO commit succeeds. Input and output are two independent transactions, not one transaction shared by the whole tick.

### 4. Screen Display

```java
if (stored.signum() == 0) {
    context.screenText().append(TextScope.OPERATION, FE_STATUS,
            Component.literal("No FE stored."));
    return;
}
context.screenText().append(TextScope.OPERATION, FE_STATUS,
        Component.literal("FE stored: " + ReadableNumber.formatCompact(stored)));
```

`screenText()` returns `ControllerText`. Repeatedly calling `append` with the same `lineId` in the same scope updates that line; `OPERATION` is the operation-state scope. This example rewrites the display every tick and does not call `jadeText()`. If JADE is needed, write it explicitly and separately; screen text does not automatically become JADE text.

## Transaction Boundaries: What Rolls Back

Public storage is the **`DataStore` interface, not a subclass of `SnapshotJournal`**. Transaction implementations are encapsulated in the internal adapter layer; callers use only the following signatures:

```java
// DataStore
void set(String key, DataKey value);
boolean set(String key, DataKey value, DataStore.Transaction transaction);

// IoTransaction
IoCommitResult commit();
IoCommitResult commit(Consumer<DataStore.Transaction> writes);
IoCommitResult commitData(Consumer<DataStore.Transaction> writes);
```

Here, `Consumer` comes from `java.util.function`, and `IoCommitResult` comes from `cn.howxu.mmcr.publicapi.runtime`. The builtin uses `commitData`; the callback overload of `commit` also receives `DataStore.Transaction`, not a bare `TransactionContext`.

1. The three-argument `storage.set(..., transaction)` joins the transaction log and commits or rolls back with IO. Its `false` return **only means the value did not change**; it does not mean commit failed.
2. The two-argument `set` and ordinary `remove` take effect immediately, do not actively register a transaction snapshot, and have no transactional consistency guarantee. The underlying `DataStorage` transaction snapshot saves the entire Map: after an existing transaction write registers a snapshot for the same storage, a later ordinary write or deletion may also be overwritten by whole-map restoration on rollback. Do not mix the two kinds of operations to infer per-key rollback boundaries; writes that must commit consistently with IO should use the three-argument `set`.
3. World or presentation side effects such as explosions, entity spawning, and screen updates do not roll back automatically. Exceptions from callbacks propagate, and registered data snapshots and the IO journal roll back; results of ordinary storage operations may be affected by the whole-map restoration above, so they cannot be promised to persist or roll back consistently.
4. `DataStore.Transaction` is a borrowed handle, **valid only while that commit callback is executing**. Do not retain it in a field, asynchronous task, or later tick.
5. `transaction.context()` returns the shared platform `TransactionContext` for external resource reservation. It too is borrowed only during the commit callback; do not retain it or open or close another root transaction.

`DataStore` itself is a live storage handle, not an immutable data snapshot; the preceding "valid only during the callback" specifically refers to the commit transaction handle and its platform context. To retain data, read the data value rather than retaining a transaction.

## Further Reading

- [Pure Tick Test Machine](./pure-tick-test-machine): different boundaries for energy, entity side effects, and item IO.
- [Computing Network - Producer](./compute-network-producer): ordinary persistent writes and network messages.
- [Java Public API Reference](../API/JavaAPI).
