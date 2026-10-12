---
title: Computing Network - Producer
order: 12
---

# Computing Network - Producer

A producer is a direct-Tick machine and also a sending node in the computing network. Every tick it attempts to consume 100 FE; every 20 ticks it attempts to draw 100 mB of water, updates its computing power and reports it to the center; the screen and JADE display status separately.

## Files and APIs

- [NETWORK_PRODUCER_MACHINE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/builtin/NETWORK_PRODUCER_MACHINE.java)
- [KubeJS network-structure reference](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Network_Machine.js): the script uses `mmcr_kubejs:kubejs_network_*` IDs, which differ from the Java builtin.

| API | Purpose and signature reference |
| --- | --- |
| `Machines` / `Structures` | [Machine definitions](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Machines.java) / [structure declarations](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Structures.java) |
| `RegisterMachineDefinitionsEvent` / `RegisterMachineStructuresEvent` | Registers `MachineSpec` / `StructureSpec` |
| `BlockConditions` | Energy, fluid, network, and data-port conditions |
| `MachineContext` / `TickContext` | [Server context](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/TickContext.java); `TickContext` extends `MachineContext` |
| `IoTransaction` / `IoSnapshot` | [Plan](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/runtime/IoTransaction.java) / [capability collection view](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/runtime/IoSnapshot.java) |
| `Requirements` / `IoDirection` | [Energy and fluid requirement factories](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/requirement/Requirements.java); do not construct the underlying requirement record directly |
| `DataStore` / `DataKey` | Stores `power`, `dry_sec`, and `has_water` |
| `Networks` | [Gets ports and sends requests](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/network/Networks.java) |
| `NetworkPortView` / `NodeView` | [Port positions and connections](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/network/NetworkPortView.java) / [machine type and hash](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/network/NodeView.java) |
| `RequestPayload` / `RequestDetails` | [Request data](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/network/RequestPayload.java) / [request information used by the receiver](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/network/RequestDetails.java) |
| `ControllerText` / `TextScope` / `JadeText` | Separate writes for screen and JADE; screen lines use the `OPERATION` scope |

## Machine Definition and Connection Declaration

```java
public static final Identifier NETWORK_PRODUCER_MACHINE = id("network_producer_machine");
public static final Identifier NETWORK_CENTER_MACHINE = id("network_center_machine");
public static final Identifier REPORT_POWER = id("report_power");
public static final Identifier PRODUCER_POWER = id("producer_power");
public static final Identifier PRODUCER_WATER = id("producer_water");
public static final Identifier PRODUCER_FE = id("producer_fe");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(NETWORK_PRODUCER_MACHINE)) {
        MachineSpec machine = Machines.machine(NETWORK_PRODUCER_MACHINE)
                .recipePool(NETWORK_PRODUCER_MACHINE)
                .displayNameKey("machine.mmcr.network_producer_machine")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:white_wool")))
                .networkInterface(1, 1)
                .allowNetworkMachine(NETWORK_CENTER_MACHINE)
                .tickBehavior(behavior -> behavior.serverTick((TickContext context) -> {
                    // 下文的五段代码按顺序组成此回调。
                }))
                .build();
        event.registerMachine(machine);
    }
}
```

`networkInterface(1, 1)` declares at most one active port, with at most one connection per port. `allowNetworkMachine` specifies connectable machine types; both endpoints must grant permission, so the center must also allow the producer. Declaring the capability does not connect machines automatically; players must still establish a port connection.

## Structure

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(NETWORK_PRODUCER_MACHINE)) {
        StructureSpec structure = Structures.structure()
                .fullStructure(s -> s.pattern(p -> p
                        .layer("XXXX", "XAAX", "XXXX")
                        .layer("XXXX", "A  A", "XXXX")
                        .layer("XXXX", "A  A", "XXXX")
                        .layer("XXXX", "XCAX", "XXXX")
                        .where('X', block(Blocks.WHITE_WOOL))
                        .where('A', any(BlockConditions.fluidInput(),
                                BlockConditions.energyInput(), BlockConditions.networkInterface(),
                                BlockConditions.dataStorage(), block(Blocks.RED_TERRACOTTA)))
                        .controller('C')))
                .build(NETWORK_PRODUCER_MACHINE);
        event.registerStructure(structure);
    }
}
```

`A` is an optional condition set and does not require every type of port to appear. To run this example, the actual build needs a data-storage port; communication also needs a network port; normal operation additionally needs energy and water inputs. The callback returns directly when there is no associated storage.

## Complete Tick Data Flow

### 1. Read State and Consume Energy Every Tick

```java
DataStore storage = context.dataStorage();
if (storage == null) return;
double power = storage.get("power").flatMap(value -> value.asDouble()).orElse(0.0);
double drySec = storage.get("dry_sec").flatMap(value -> value.asDouble()).orElse(0.0);
boolean feOk = true;

IoTransaction energyPlan = context.ioPlan();
energyPlan.addInput(Requirements.energy(IoDirection.INPUT, 100));
var energySim = energyPlan.simulate();
if (!energySim.energySatisfied() || !energyPlan.commit().successful()) {
    feOk = false;
}
double powerPublished = power;
double dryPublished = drySec;
boolean shouldReport = false;
```

`get` returns `Optional<DataKey>`; failed conversions fall back to defaults. Insufficient energy and failed actual commits both make `feOk` false, but that does not automatically roll back later ordinary state writes.

### 2. Draw Water Every 20 Ticks and Calculate Computing Power

```java
if (context.isDue(20)) {
    IoTransaction waterPlan = context.ioPlan();
    waterPlan.addInput(Requirements.fluid(IoDirection.INPUT,
            FluidIngredient.of(Fluids.WATER), 100, FluidStack.EMPTY, 1F, 1F));
    var waterSim = waterPlan.simulate();
    boolean hasWater = waterSim.inputsSatisfied();
    if (feOk && hasWater && waterPlan.commit().successful()) {
        power = 20;
        drySec = 0;
    } else {
        power = 10;
        if (feOk) {
            drySec = drySec + 1;
            hasWater = false;
        }
    }
    storage.set("has_water", DataKey.of(hasWater));
    storage.set("power", DataKey.of(power));
    storage.set("dry_sec", DataKey.of(drySec));
    powerPublished = power;
    dryPublished = drySec;

    // 将下一段的超限检查放在这里。
    if (drySec >= 30) {
        var level = context.level();
        var pos = context.controllerPos();
        level.explode(null, pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5,
                4.0F, false, Level.ExplosionInteraction.BLOCK);
        return;
    }
    shouldReport = feOk;
}
```

The six-argument `Requirements.fluid` overload takes direction, fluid condition, amount, output stack, `chance`, and `consumeChance`. This example inputs 100 mB of water, uses `FluidStack.EMPTY` as the output stack, and sets both probabilities to `1F`.

The source branches must be understood according to their actual conditions:

| Period state | Computing power | Dry count | Report? |
| --- | --- | --- | --- |
| Has energy; water simulation and commit both succeed | 20 | Reset | Yes |
| Has energy; water draw fails | 10 | Add 1 and record no water | Yes |
| No energy | 10 | Does not increment; does not commit the water plan | No |

Therefore, it cannot be summarized as "it will definitely explode after 30 consecutive seconds without water": the dry count increments only in cycles that have energy but fail to draw water. Upon reaching 30 it performs an explosion with strength `4.0F`, **not a guaranteed radius of exactly 4 blocks**. Without energy, `has_water` still comes from the simulation result and does not mean water was consumed; UI state cannot replace the commit result.

### 3. World Side Effects and Ordinary Storage

The preceding `set` calls are ordinary two-argument writes that take effect immediately and do not automatically form a transaction with energy or water IO. Explosions are also world side effects and do not roll back automatically. To commit data changes with IO, use the `commitData` and three-argument `set` pattern from [Data Storage Test Machine](./data-store-test-machine#transaction-boundaries-what-rolls-back).

### 4. Report to the Center

```java
if (shouldReport) {
    var interfaces = Networks.interfaces(context);
    NetworkPortView iface = interfaces != null && !interfaces.isEmpty() ? interfaces.get(0) : null;
    if (iface != null) {
        var connections = iface.connections();
        NodeView target = connections != null && !connections.isEmpty() ? connections.get(0) : null;
        if (target != null) {
            Networks.sendRequest(iface, target, REPORT_POWER,
                    RequestPayload.of(Map.of("power", DataKey.of(powerPublished))));
        }
    }
}
```

The public signatures are:

```java
static List<NetworkPortView> interfaces(MachineContext context);
static void sendRequest(NetworkPortView source, NodeView target,
                        Identifier requestId, RequestPayload body);
```

`List` comes from `java.util`, and `MachineContext` comes from `publicapi.behavior`. `Networks.interfaces` returns the port list; the current implementation does not return `null`, but this retains the builtin's defensive check. Ports are sorted by coordinates; this example takes the first one and does not broadcast.

`NetworkPortView.position()` is the port-block position; `connections()` returns `List<NodeView>`. `NodeView` is a read-only interface, not a user-constructed record, and provides `type()` and `hash()`. `RequestPayload.of(Map<String, DataKey>)` carries typed data values; the center reads from `body.get("power")`.

Sending is a queued operation: it does not synchronously call the center handler or wait for a response. The core handles queue scheduling and validation of connection, structure, and loaded state during processing; do not equate "queued" with "delivered". If the target is not in the source port's connection list, `sendRequest` synchronously throws `IllegalArgumentException`; this is not a post-queue `requestFailed` notification.

### 5. Screen and JADE

```java
boolean hasWater = storage.get("has_water").flatMap(value -> value.asBoolean()).orElse(false);
context.screenText().append(TextScope.OPERATION, PRODUCER_POWER,
        Component.literal("Computing Power: " + powerPublished + " tfps"));
context.screenText().append(TextScope.OPERATION, PRODUCER_WATER,
        Component.literal(hasWater ? "Water: OK"
                : "Water: DRY (overflow in " + Math.max(0, 30 - dryPublished) + " sec)"));
context.screenText().append(TextScope.OPERATION, PRODUCER_FE,
        Component.literal(feOk ? "Energy: OK" : "Energy: LOW"));
context.jadeText().append(PRODUCER_POWER, Component.literal(powerPublished + " tfps"));
context.jadeText().append(PRODUCER_WATER, Component.literal(hasWater ? "Water OK" : "Water DRY"));
```

The two text handles are independent; repeatedly appending a screen `lineId` in the same scope updates that line, while JADE updates by its own line ID. State remains between periods: computing power is not recalculated or reported every tick.

## Protocol and Identity Boundaries

The producer's saved `power` and the payload's `power` share a name by protocol convention in this example. The center stores buckets as `power_<peerHash>`, with subsequent reports from each producer replacing its own bucket.

The current [MachineReferenceHasher](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/network/MachineReferenceHasher.java) uses the dimension ID, machine type, and controller coordinates to compute a deterministic XXH64. The same inputs yield the same hash; changing dimension, type, or position must not be assumed to preserve the hash, and a 64-bit hash must not be treated as an absolutely collision-free global identity. Port position and controller identity are distinct concepts; connection persistence is maintained by the network-port block entity.

## Further Reading

- [Computing Network - Network Center](./compute-network-hub): request handling, connection collection, and stale-bucket cleanup.
- [Data Storage Test Machine](./data-store-test-machine): transaction writes and borrowed handles.
- [KubeJS communication model](../KubeJS/compute-network-example#network-communication-model-diagram) / [Java Public API Reference](../API/JavaAPI).
