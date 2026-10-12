---
title: Computing Network - Network Center
order: 13
---

# Computing Network - Network Center

The center receives producers' `REPORT_POWER` requests and stores computing power in buckets by sender hash; every tick it collects connections, cleans up stale buckets, and totals computing power, displaying the results separately on the controller screen and in JADE. The center does not actively send requests.

## Files and APIs

- [NETWORK_CENTER_MACHINE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/builtin/NETWORK_CENTER_MACHINE.java)
- [KubeJS network-structure reference](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Network_Machine.js): uses separate `mmcr_kubejs:kubejs_network_*` IDs.

| API | Purpose and signature reference |
| --- | --- |
| `Machines` / `Structures` | Declares `MachineSpec` and `StructureSpec` |
| `RegisterMachineDefinitionsEvent` / `RegisterMachineStructuresEvent` | Registers definitions and structures |
| `BlockConditions` | Energy-input, network-port, and storage-port conditions |
| `MachineContext` / `TickContext` | [Server machine context](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/MachineContext.java); the direct-Tick context additionally provides `ioPlan()` |
| `IoTransaction` / `IoSnapshot` | [One-shot plan](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/runtime/IoTransaction.java) / current capability query |
| `Requirements` / `IoDirection` | Energy-input requirement factory |
| `DataStore` / `DataKey` | [Live storage](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/data/DataStore.java) / typed data value |
| `Networks` / `NetworkPortView` / `NodeView` | [Network operation entry point](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/network/Networks.java), port and connected-machine views |
| `RequestPayload` / `RequestDetails` / `RequestHandler` | [Request body](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/network/RequestPayload.java) / [request information](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/network/RequestDetails.java) / [handler signature](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/network/RequestHandler.java) |
| `ControllerText` / `TextScope` / `JadeText` | Independent presentation handles for the screen and JADE |

## Machine Definition

```java
private static final Identifier CENTER_POWER = id("center_power");
private static final Identifier CENTER_COUNT = id("center_count");
private static final Identifier CENTER_FE = id("center_fe");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(NETWORK_CENTER_MACHINE)) {
        MachineSpec machine = Machines.machine(NETWORK_CENTER_MACHINE)
                .recipePool(NETWORK_CENTER_MACHINE)
                .displayNameKey("machine.mmcr.network_center_machine")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:black_wool")))
                .networkInterface(1, 16)
                .allowNetworkMachine(NETWORK_PRODUCER_MACHINE.NETWORK_PRODUCER_MACHINE)
                .requestProcess(REPORT_POWER, (RequestPayload body, RequestDetails request,
                        DataStore senderStorage, DataStore receiverStorage) -> {
                    if (receiverStorage == null) return;
                    double reported = body.get("power").flatMap(value -> value.asDouble()).orElse(0.0);
                    long hash = request.peer().hash();
                    receiverStorage.set("power_" + hash, DataKey.of(reported));
                })
                .tickBehavior(behavior -> behavior.serverTick((TickContext context) -> {
                    // 下文“汇总 Tick”的代码组成此回调。
                }))
                .build();
        event.registerMachine(machine);
    }
}
```

Both ends use the same request ID, but their roles differ:

| Declaration | Producer | Center |
| --- | --- | --- |
| `networkInterface(maxCount, maxConnections)` | `(1, 1)` | `(1, 16)` |
| `allowNetworkMachine(...)` | Allows the center | Allows producers |
| `requestProcess(REPORT_POWER, ...)` | None | Handles reports |

## Request-Handler Signature and Data Boundaries

`requestProcess` accepts the public functional interface `RequestHandler`, whose signature is:

```java
void process(RequestPayload body, RequestDetails request,
             @Nullable DataStore senderStorage, @Nullable DataStore receiverStorage);
```

`Nullable` comes from `org.jetbrains.annotations`.

| Parameter | Meaning |
| --- | --- |
| `body` | Payload supplied by the sender; `get(String)` returns `Optional<DataKey>` |
| `request` | `requestId()` is the request ID; `peer()` is the sender's `NodeView` |
| `senderStorage` | Storage associated with the sender, possibly `null` |
| `receiverStorage` | Storage associated with the receiver, possibly `null` |

Only `receiverStorage` is written here; it does not depend on sender storage. A report that cannot convert to `double` falls back to `0.0`; the key name is `power_<senderHash>`, and subsequent reports from the same sender overwrite the old value.

The handler has no implicit transaction. The two-argument `set` writes immediately, and rollback of other IO does not undo it. `DataStore` is not a `SnapshotJournal` subclass; only three-argument writes that explicitly receive `DataStore.Transaction` participate in the corresponding IO transaction. For detailed boundaries, see [Data Storage Test Machine](./data-store-test-machine#transaction-boundaries-what-rolls-back).

## Structure

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(NETWORK_CENTER_MACHINE)) {
        StructureSpec structure = Structures.structure()
                .fullStructure(s -> s.pattern(p -> p
                        .layer("XXXX", "XAAX", "XXXX")
                        .layer("XXXX", "A  A", "XXXX")
                        .layer("XXXX", "A  A", "XXXX")
                        .layer("XXXX", "XCAX", "XXXX")
                        .where('X', block(Blocks.BLACK_WOOL))
                        .where('A', any(BlockConditions.energyInput(),
                                BlockConditions.networkInterface(), BlockConditions.dataStorage(),
                                block(Blocks.RED_TERRACOTTA)))
                        .controller('C')))
                .build(NETWORK_CENTER_MACHINE);
        event.registerStructure(structure);
    }
}
```

`A` permits different ports or red terracotta; it is not a count constraint requiring every type of port. The actual build needs a storage port to aggregate, and a network port with established connections to receive reports.

## Aggregation Tick

### 1. Energy Check

```java
DataStore storage = context.dataStorage();
if (storage == null) return;
IoTransaction energyPlan = context.ioPlan();
energyPlan.addInput(Requirements.energy(IoDirection.INPUT, 200));
var energySim = energyPlan.simulate();
boolean energyOk = energySim.energySatisfied() && energyPlan.commit().successful();
```

Every tick attempts to consume 200 FE. **This example does not return when `energyOk == false`**: without power, it still cleans up, sums, and displays, only showing LOW as the energy status. Therefore this check must not be interpreted as a power gate for network reception or aggregation.

### 2. Collect Current Connections

```java
int liveCount = 0;
Set<String> connectedHashes = new HashSet<>();
var interfaces = Networks.interfaces(context);
NetworkPortView iface = interfaces != null && !interfaces.isEmpty() ? interfaces.get(0) : null;
if (iface != null) {
    for (var target : iface.connections()) {
        liveCount = liveCount + 1;
        connectedHashes.add(String.valueOf(target.hash()));
    }
}
```

`connections()` returns `List<NodeView>`; this example considers only the first port. `liveCount` counts the connections returned by the current query, **not a heartbeat-proven count of online, healthy producers**. `connectedHashes` provides the basis for later bucket cleanup.

### 3. Clean Up Stale Reports

```java
var staleKeys = new ArrayList<String>();
if (iface != null) {
    for (var entry : storage.values().entrySet()) {
        String keyString = entry.getKey();
        if (keyString.startsWith("power_")
                && !connectedHashes.contains(keyString.substring("power_".length()))) {
            staleKeys.add(keyString);
        }
    }
}
for (var key : staleKeys) storage.remove(key);
```

`values()` returns `Map<String, DataKey>`. It collects keys before deleting them to avoid modifying storage during iteration. Cleanup relies only on connection hashes: buckets for disconnected nodes are deleted; buckets whose node remains connected but has not reported for a long time are not automatically deleted by timeout. This example has no timestamp, TTL, or heartbeat protocol.

When there is no available port, cleanup is skipped; when there is a port but its connection list is empty, every `power_*` bucket is deleted. These cases differ. `remove` is an ordinary immediate deletion and does not roll back when other IO fails.

### 4. Sum and Display

```java
double total = 0;
for (var entry : storage.values().entrySet()) {
    if (entry.getKey().startsWith("power_")) {
        total = total + entry.getValue().asDouble().orElse(0.0);
    }
}
int count = liveCount;
context.screenText().append(TextScope.OPERATION, CENTER_POWER,
        Component.literal("Total Power: " + total + " tfps"));
context.screenText().append(TextScope.OPERATION, CENTER_COUNT,
        Component.literal("Connected Devices: " + count));
context.screenText().append(TextScope.OPERATION, CENTER_FE,
        Component.literal(energyOk ? "Energy: OK" : "Energy: LOW"));
context.jadeText().append(CENTER_POWER,
        Component.literal("Total Power: " + total + " tfps"));
context.jadeText().append(CENTER_COUNT,
        Component.literal("Connected Devices: " + count + " producers"));
```

Total computing power is the sum of reports in storage that have not been cleaned up, not a value synchronously queried from every producer this tick. Producers report only every 20 ticks and only when powered, so state lags between the center and producers. The screen and JADE are two independent handles; the current center's JADE does not show an energy line.

## Hash and Request-Failure Boundaries

The current [MachineReferenceHasher](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/network/MachineReferenceHasher.java) computes deterministic XXH64 from the **dimension ID, machine type, and controller coordinates**. The same inputs can reproduce the same hash; it is not a random online ID or a UUID guaranteed to remain unchanged across dimensions or after relocation. Rebuilding at the same location with the same type can reuse the same identifier, so it cannot distinguish different historical instances; a 64-bit hash also cannot guarantee absolute collision freedom.

The center does not declare `requestFailed`. If a producer needs to handle validation failure after queued delivery, it can register a failure handler; if the target is not in the source port's connection list at all, `Networks.sendRequest` synchronously throws an exception and does not turn it into that callback. The current scheduler catches and records runtime exceptions from receiver handlers, but does not then call the sender's failure handler; submitting a request does not guarantee the target will ultimately process it successfully.

## Further Reading

- [Computing Network - Producer](./compute-network-producer): input consumption, reporting cadence, and payloads.
- [Data Storage Test Machine](./data-store-test-machine): ordinary and transactional writes.
- [KubeJS communication model](../KubeJS/compute-network-example#network-communication-model-diagram) / [Java Public API Reference](../API/JavaAPI).
