---
title: Compute-Network Interaction Example
order: 11
---

# Compute-Network Interaction Example — KubeJS Network Communication Machines

This is the second article in the advanced KubeJS examples.

Behavior callbacks use the underlying `api.machine.definition.TickBehaviorContext` / `MachineIoPlan`, while network entry points use reference and request types from `api.network`. `ctx.dataStorage()` returns `api.data.view.DataStorage`; the storage parameters of request-handling callbacks are the underlying `api.data.DataStorage`. Do not replace them with Java `publicapi` types.

This article adapts the signatures of three PRODUCER storage writes in the official script: pass booleans / numbers directly instead of `api.dataValue(...)`. The latter creates underlying data values that the tick storage view's `Object` overload does not accept. The CENTER request handler receives underlying storage and continues to use `api.dataValue(reported)`.

Unlike the [Data Storage Test Machine](./data-store-test-machine), this tutorial **registers two machines together**: a PRODUCER and a CENTER, demonstrating FE checks every tick, conditional reporting every 20 ticks, and aggregation by the center every tick.

## Machines

The compute-network interaction example registers two machines at once:

1. **PRODUCER (`kubejs_network_producer_machine`)**:
   - Checks for FE input every tick.
   - Checks for water input every 20 ticks.
   - Calculates "computing power" (power, in `tfps`) from the input state.
   - **Pushes computing power to CENTER every 20 ticks when conditions such as a successful FE commit are met**, using [`api.sendRequest`](../API/KubeJS#sendrequest-networkinterfacereference-source-machinereference-target-string-requestid-object-body-→-void).
   - Displays computing power, water status, and FE status on the controller screen.
   - With FE available, each 20-tick check that fails to draw water increments the dry counter by 1; reaching 30 causes an **explosion**. This advances by game ticks and does not guarantee 30 seconds of real time.

2. **CENTER (`kubejs_network_center_machine`)**:
   - Registers a [`requestProcess(REPORT_POWER, ...)`](../API/KubeJS#requestprocess-string-requestid-requestprocess-process-→-machinebuilderjs) callback to receive computing power reports from PRODUCER and write them to its own `DataStorage` under `power_<peerHash>` (bucketed by node hash to avoid overwriting one another).
   - Runs `serverTick` every tick: attempts to consume 200 FE, collects connection records, removes orphaned keys, sums the values, and writes controller UI text and Jade text. Insufficient FE only changes the message; it does not prevent aggregation.

Both machines declare network capabilities through [`networkInterface(maxCount, maxConnections)`](../API/KubeJS#networkinterface-int-maxcount-int-maxconnections-→-machinebuilderjs) and whitelist each other through [`allowNetworkMachine(...)`](../API/KubeJS#allownetworkmachine-string-machineid-→-machinebuilderjs).

MMCR validates the whitelist at both ends; neither can be omitted.

## Files Involved

Source locations:

- [`startup_scripts/advance/A_Network_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/advance/A_Network_Machine.js)
Definitions, network declarations, tick behavior, and request handling for both machines.
- [`server_scripts/structure/advance/A_Network_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Network_Machine.js)
Multiblock structures for both machines.


## API Navigation Table

| KubeJS API Used | API Reference |
| --- | --- |
| `MMCR.getAPI()` | [Link](../API/KubeJS#getapi-→-kubejsapi) |
| `event.createMachine(...)` × 2 | [Link](../API/KubeJS#createmachine-string-id-→-machinebuilderjs) |
| `MachineBuilderJS.displayNameKey(...)` | [Link](../API/KubeJS#displaynamekey-string-key-→-machinebuilderjs) |
| `MachineBuilderJS.recipePool(...)` | [Link](../API/KubeJS#machinebuilderjs) |
| `MachineBuilderJS.appearance(...)` | [Link](../API/KubeJS#appearance-string-machinebasicblock-→-machinebuilderjs) |
| `MachineBuilderJS.networkInterface(...)` | [Link](../API/KubeJS#networkinterface-int-maxcount-int-maxconnections-→-machinebuilderjs) |
| `MachineBuilderJS.allowNetworkMachine(...)` | [Link](../API/KubeJS#allownetworkmachine-string-machineid-→-machinebuilderjs) |
| `MachineBuilderJS.requestProcess(...)` | [Link](../API/KubeJS#requestprocess-string-requestid-requestprocess-process-→-machinebuilderjs) |
| `MachineBuilderJS.tickBehavior(...)` | [Link](../API/KubeJS#tickbehavior-consumer-machinebehaviorbuilderjs-builder-→-machinebuilderjs) |
| `MachineBehaviorBuilderJS.serverTick(...)` | [Link](../API/KubeJS#servertick-consumer-tickbehaviorcontext-callback-→-machinebehaviorbuilderjs) |
| `KubeJSApi.networkInterfaces(ctx)` | [Link](../API/KubeJS#networkinterfaces-machinebehaviorcontext-context-→-list-networkinterfacereference) |
| `KubeJSApi.sendRequest(...)` | [Link](../API/KubeJS#sendrequest-networkinterfacereference-source-machinereference-target-string-requestid-object-body-→-void) |
| `KubeJSApi.dataValue(...)` | [Link](../API/KubeJS#datavalue-object-value-→-datavalue) |
| `KubeJSApi.energyRequirement(...)` | [Link](../API/KubeJS#energyrequirement-recipemodifier-iotype-io-long-fepertick-→-machinerequirement) |
| `KubeJSApi.fluidInputRequirement(...)` | [Link](../API/KubeJS#fluidinputrequirement-string-fluidid-long-amount-→-machinerequirement) |
| `KubeJSApi.recipeIO()` | [Link](../API/KubeJS#recipeio-→-recipeiovalues) |
| `KubeJSApi.id(...)` | [Link](../API/KubeJS#id-string-id-→-identifier) |
| `KubeJSApi.screenScope()` | [Link](../API/KubeJS#screenscope-→-screenscopevalues) |
| `KubeJSApi.block(...)` / `anyOf(...)` | [Link](../API/KubeJS#block-string-blockid-→-blockpredicate) / [Link](../API/KubeJS#anyof-blockpredicate-children-→-blockpredicate) |
| `KubeJSApi.anyOfEnergyInput()` / `anyOfFluidInput()` | [Link](../API/KubeJS#anyofenergyinput-→-blockpredicate) / [Link](../API/KubeJS#anyoffluidinput-→-blockpredicate) |
| `KubeJSApi.networkInterface()` | [Link](../API/KubeJS#networkinterface-→-blockpredicate) |
| `KubeJSApi.dataStorage()` | [Link](../API/KubeJS#datastorage-→-blockpredicate) |
| `MachineStructureBuilderJS.pattern(...)` / `set(...)` / `controller(...)` / `build()` | [Link](../API/KubeJS#pattern-string-rows-→-machinestructurebuilderjs) / [Link](../API/KubeJS#set-string-symbol-object-value-→-machinestructurebuilderjs) / [Link](../API/KubeJS#controller-string-symbol-→-machinestructurebuilderjs) / [Link](../API/KubeJS#build-→-void) |

Java classes:

| Java Class | Purpose |
| --- | --- |
| `net.minecraft.world.level.Level$ExplosionInteraction` | Destruction-mode enum for the `level.explode(...)` call when PRODUCER exceeds the dry timeout |

## Network Communication Model Diagram

MMCR provides queued sending and dispatch to target handlers; this example uses **one-way reporting**, with no response messages or success acknowledgment callbacks:

```
PRODUCER → sendRequest → 服务端队列 → CENTER.requestProcess
                       校验失败 → PRODUCER.requestFailed（需另行注册）
```

The example demonstrates one-way message pushing from `producer → center`. The complete data flow is shown below:

```
  ┌─────────────────────────────────────────────────
  │                  PRODUCER                       
  │                                                 
  │  Tick:                                          
  │    1. try to consume FE                         
  │    2. every 20 ticks consume wster              
  │    3. upodate data to DataStorage               
  │    4. 20 tick -> KubeJSApi.sendRequest          
  │       → REPORT_POWER                            
  │       → body: { "power": <Recent Power> }       
  │       → target: iface.connections().get(0)      
  └─────────────────────────────────────────────────
                       │
                       │  RequestBody("power" → 20.0)
                       │
                       ▼ 
  ┌─────────────────────────────────────────────────
  │                   CENTER                        
  │                                                 
  │  requestProcess(REPORT_POWER, (body, request,   
  │      senderStorage, receiverStorage) => {       
  │    receiverStorage.set(                         
  │      "power_" + request.peer().hash(),          
  │      api.dataValue(body.get("power")            
  │        .flatMap(v => v.asDouble())              
  │        .orElse(0))                              
  │    );                                           
  │  });                                            
  │                                                 
  │  serverTick:                                    
  │    1. FE consume                                
  │    2. liveCount = iface.connections().size()    
  │    3. collect connectedHashes                   
  │    4. delete offline connections                
  │    5. summary power_*                           
  │    6. UI update                                 
  └─────────────────────────────────────────────────
```

Key points:

- **The producer does not directly encode the center's coordinates**
    It only calls `iface.connections().get(0)` to obtain the first connection; MMCR internally routes the request according to the network interface topology.
- **The request body is a key-value map**, with values of types supported by [`api.dataValue(...)`](../API/KubeJS#datavalue-object-value-→-datavalue) to maintain type safety.
    The source uses a plain JS object `{ power: powerPublished }` for body, which MMCR automatically wraps as `DataValue`.
- Upon receipt, the center processes it through the [`requestProcess`](../API/KubeJS#requestprocess-string-requestid-requestprocess-process-→-machinebuilderjs) callback. The handling logic is entirely defined by the center machine; the producer does not need to know it.
- **Enqueuing does not mean successful processing**: if the target is absent from the source interface's connection table, `sendRequest` throws `IllegalArgumentException` directly; a non-map body or unconvertible values can also fail before enqueuing. Failed whitelist, chunk, structure, connection, or handler validation during dispatch invokes an available `requestFailed(...)` handler. This example registers no failure handler and performs no automatic retries.
- If the target handler throws `RuntimeException`, the dispatcher logs it; the current implementation neither invokes `requestFailed` for this nor rolls back ordinary data writes already performed by the handler.

## Machine Definitions in Detail

Constant declarations in [`A_Network_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/advance/A_Network_Machine.js):

```javascript
MMCREvents.startup(event => {
    const api = MMCR.getAPI()
    const RecipeIO = api.recipeIO()

    const ExplosionInteraction = Java.loadClass("net.minecraft.world.level.Level$ExplosionInteraction")

    const PRODUCER_ID = "mmcr_kubejs:kubejs_network_producer_machine"
    const CENTER_ID = "mmcr_kubejs:kubejs_network_center_machine"
    const REPORT_POWER = "mmcr_kubejs:report_power"

    const waterRequirement = api.fluidInputRequirement("minecraft:water", 100)
    // ...
})
```

- `RecipeIO` and `api` are aliases.
- `ExplosionInteraction` is Mojang's internal enum; `level.explode(...)` uses `BLOCK` / `MOB` / `NONE` to distinguish explosion destruction modes.
- String constants: `PRODUCER_ID` / `CENTER_ID` are machine registration IDs, and `REPORT_POWER` is the network request ID.
- `waterRequirement` constructs a "100 mB water input" requirement once in advance to avoid repeatedly creating it in the tick callback.

### PRODUCER Machine Definition

```javascript
const machine_producer = event
    .createMachine(PRODUCER_ID)
    .recipePool(PRODUCER_ID)
    .displayNameKey("machine.mmcr_kubejs.kubejs_network_producer_machine")
    .appearance("minecraft:white_wool")
    .networkInterface(1, 1) // allow 1 network port and max 1 connections
    .allowNetworkMachine(CENTER_ID) // allow connect to network center machine
```

Four declarations + two network capabilities:

- `.displayNameKey(...)`: localization key.
- `.appearance("minecraft:white_wool")`: no further explanation needed.
- [`.networkInterface(1, 1)`](../API/KubeJS#networkinterface-int-maxcount-int-maxconnections-→-machinebuilderjs): declares at most 1 network interface for this machine, with at most 1 connection record in total across active interfaces.
- [`.allowNetworkMachine(CENTER_ID)`](../API/KubeJS#allownetworkmachine-string-machineid-→-machinebuilderjs): whitelist allowing communication only with `CENTER_ID`.
**Bidirectional validation**: CENTER at the other end must also add `PRODUCER_ID` to its own whitelist.

### CENTER Machine Definition

```javascript
const machine_center = event
    .createMachine(CENTER_ID)
    .recipePool(CENTER_ID)
    .displayNameKey("machine.mmcr_kubejs.kubejs_network_center_machine")
    .appearance("minecraft:black_wool")
    .networkInterface(1, 16) // one interface but 16 connections
    .allowNetworkMachine(PRODUCER_ID)
    // register a request process for REPORT_POWER id
    .requestProcess(REPORT_POWER, (body, request, senderStorage, receiverStorage) => {
        if (receiverStorage == null) return
        // the power value that producer produced(what a sentence)
        let reported = Number(body.get("power").flatMap(v => v.asDouble()).orElse(0))
        // 按来源哈希分桶；哈希不保证无碰撞
        let key = "power_" + request.peer().hash()
        receiverStorage.set(key, api.dataValue(reported))
    })
```

Key points:

- [`.networkInterface(1, 16)`](../API/KubeJS#networkinterface-int-maxcount-int-maxconnections-→-machinebuilderjs): at most 1 interface, with at most 16 connection records in total across the machine's active interfaces.
- [`.allowNetworkMachine(PRODUCER_ID)`](../API/KubeJS#allownetworkmachine-string-machineid-→-machinebuilderjs): matching whitelist entry.
- [`.requestProcess(REPORT_POWER, ...)`](../API/KubeJS#requestprocess-string-requestid-requestprocess-process-→-machinebuilderjs): registers a request handler.
`REPORT_POWER` is the request ID agreed upon with PRODUCER.
The second argument is a four-parameter callback `(body, request, senderStorage, receiverStorage)`.

Internal handler logic:

1. `if (receiverStorage == null) return` exits immediately if CENTER has no associated data storage; an unformed target structure fails during dispatch validation and never enters the handler.
2. `body.get("power").flatMap(v => v.asDouble()).orElse(0)` retrieves the `power` field from `RequestBody`, safely converts it to `Optional<Double>` using `asDouble()`, then converts it back to a JS number with `Number(...)`, defaulting to `0`.
3. `request.peer().hash()` obtains the hash of the PRODUCER reference for bucketing in this example; it is not a globally unique UUID.
4. `receiverStorage.set(key, api.dataValue(reported))` writes this PRODUCER's computing power to CENTER's `DataStorage` under `power_<hash>`.

:::info Related Information
**Semantics of `request.peer()`**: the target's request handler receives the sender's `MachineReference(Identifier type, long hash)`; peer in the source-side failure callback is instead the target reference. The hash is computed from the dimension ID, machine type ID, and controller coordinates, and is reproducible only when these inputs and the algorithm remain unchanged. Bucketing by `power_<hash>` does not prevent theoretical hash collisions.
:::

Finally, each machine calls `.register()` to submit to the current registration window.

## Structures

Open [`structure/advance/A_Network_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Network_Machine.js):

```javascript
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure_1 = event.createStructure("mmcr_kubejs:kubejs_network_producer_machine")

    structure_1
        .pattern("XXXX", "XAAX", "XXXX")
        .pattern("XXXX", "A  A", "XXXX")
        .pattern("XXXX", "A  A", "XXXX")
        .pattern("XXXX", "XCAX", "XXXX")
        .set('X', api.block('minecraft:white_wool'))
        .set('A', api.anyOf(
            api.anyOfFluidInput(),
            api.anyOfEnergyInput(),
            api.networkInterface(),
            api.dataStorage(),
            api.block('minecraft:red_terracotta')
        ))
        .controller('C')
        .build()

    const structure_2 = event.createStructure("mmcr_kubejs:kubejs_network_center_machine")

    structure_2
        .pattern("XXXX", "XAAX", "XXXX")
        .pattern("XXXX", "A  A", "XXXX")
        .pattern("XXXX", "A  A", "XXXX")
        .pattern("XXXX", "XCAX", "XXXX")
        .set('X', api.block('minecraft:black_wool'))
        .set('A', api.anyOf(
            api.anyOfEnergyInput(),
            api.networkInterface(),
            api.dataStorage(),
            api.block('minecraft:red_terracotta')
        ))
        .controller('C')
        .build()
})
```

PRODUCER's A slots include 5 categories:

| Predicate | Purpose |
| --- | --- |
| [`api.anyOfFluidInput()`](../API/KubeJS#anyoffluidinput-→-blockpredicate) | Fluid input port |
| [`api.anyOfEnergyInput()`](../API/KubeJS#anyofenergyinput-→-blockpredicate) | FE input port |
| [`api.networkInterface()`](../API/KubeJS#networkinterface-→-blockpredicate) | **Network interface block**, the key to communication |
| [`api.dataStorage()`](../API/KubeJS#datastorage-→-blockpredicate) | **Data storage block**, used by `tickBehavior` to store `power` / `dry_sec` / `has_water` |
| `api.block('minecraft:red_terracotta')` | Decoration |

CENTER's A slots include only 4 categories.

## Network Requests

The complete tick behavior has 5 stages: energy → water + computing power calculation → explosion at the dry limit → network reporting → screen text.

### 1. Energy

```javascript
let storage = ctx.dataStorage()
if (storage == null) return

let power = Number(storage.get("power").flatMap(v => v.asDouble()).orElse(0))
let dry_sec = Number(storage.get("dry_sec").flatMap(v => v.asDouble()).orElse(0))
let feOk = true

let energyPlan = ctx.ioPlan()
energyPlan.addInput(api.energyRequirement(RecipeIO.INPUT, 100))
let energySim = energyPlan.simulate()
if (!energySim.energySatisfied() || !energyPlan.commit().successful()) {
    feOk = false
}
// 非检查帧保留已存状态；检查帧缺电时不取水、不增加干燥计数、不上报
let powerPublished = power
let dryPublished = dry_sec
let shouldReport = false
```

Attempts to consume 100 FE every tick. `simulate()` caches the plan, and `commit()` executes that plan and consumes the plan object. Committing does not automatically simulate, and simulation does not reserve resources; actual success still depends on `successful()`. For this energy-only plan, `energySatisfied()` can be used to check the energy plan.

On failure, `feOk = false`. Ticks outside the 20-tick check retain the stored state; the check tick still simulates water and writes state, but does not commit water extraction, increment the dry counter, or report. The script comment "skip all downstream updates when power is insufficient" is stronger than the actual implementation and must not be taken as its behavior.

`storage.get("power").flatMap(v => v.asDouble()).orElse(0)` is the most common read pattern in MMCR's data layer: extract a `double` from `DataValue`, falling back to `0` if the type does not match.

`Number(...)` converts the automatically converted numeric value back to the JS `number` type.

### 2. Water Consumption + Computing Power Calculation

```javascript
if (ctx.isDue(20)) {
    let waterPlan = ctx.ioPlan()
    waterPlan.addInput(waterRequirement)
    let waterSim = waterPlan.simulate()
    let hasWater = waterSim.inputsSatisfied()

    if (feOk && hasWater && waterPlan.commit().successful()) {
        power = 20
        dry_sec = 0
    } else {
        power = 10
        if (feOk) {
            dry_sec = dry_sec + 1
            hasWater = false
        }
    }

    storage.set("has_water", hasWater)
    storage.set("power", power)
    storage.set("dry_sec", dry_sec)
    powerPublished = power
    dryPublished = dry_sec

    if (dry_sec >= 30) {
        // ... 爆炸，见下节
    }

    shouldReport = feOk
}
```

`waterRequirement` is constructed once in the startup callback and represents 100 mB of water input. Each cycle only creates a new plan; `addInput` copies the requirement, so reusing a requirement declaration does not mean reusing a consumed plan.

FE available and water extraction succeeds → `power = 20`, dry counter reset to zero. FE available but water simulation or commit fails → `power = 10`, dry counter +1, `hasWater = false`. Insufficient FE → `power = 10`, dry counter unchanged, and `hasWater` remains the water simulation result (water is not consumed even if available). The three keys are written using ordinary `set` and do not share a transaction with FE / water IO.

### 3. Explosion at the Dry Limit

```javascript
if (dry_sec >= 30) {
    let level = ctx.level()
    let pos = ctx.controllerPos()
    level.explode(
        null,
        pos.getX() + 0.5,
        pos.getY() + 0.5,
        pos.getZ() + 0.5,
        4.0,
        false,
        ExplosionInteraction.BLOCK
    )
    return
}
```

`ctx.controllerPos()` returns the controller block position, and `ctx.level()` is the server-side world. When `dry_sec >= 30`, the check tick calls `level.explode(...)` with an explosion strength parameter of `4.0`, which does not guarantee a fixed radius of 4. `BLOCK` selects the block interaction mode; actual destruction depends on game mechanics. The explosion check itself has no `feOk` condition, so a persisted counter already at the threshold triggers it even without power. The explosion is outside the IO transaction; execution then returns immediately without reporting or refreshing this tick's text.

### 4. Network Reporting

```javascript
if (shouldReport) {
    let interfaces = api.networkInterfaces(ctx)
    let iface = interfaces != null && !interfaces.isEmpty() ? interfaces.get(0) : null
    if (iface != null) {
        let connections = iface.connections()
        let target = connections != null && !connections.isEmpty() ? connections.get(0) : null
        if (target != null) {
            api.sendRequest(iface, target, REPORT_POWER, {
                power: powerPublished
            })
        }
    }
}
```

[`api.networkInterfaces(ctx)`](../API/KubeJS#networkinterfaces-machinebehaviorcontext-context-→-list-networkinterfacereference) is the entry point for network communication, returning a list of `NetworkInterfaceReference` for all active network interfaces on the current machine (sorted by position). Safety checks at each step:

1. `interfaces` is nonempty → take the first interface, `iface`
2. `iface.connections()` returns a list of `MachineReference` corresponding to the interface's stored connection records; it does not guarantee that every target is currently loaded, formed, or able to handle requests
3. Take the first connection, `target`, and call [`api.sendRequest(iface, target, REPORT_POWER, body)`](../API/KubeJS#sendrequest-networkinterfacereference-source-machinereference-target-string-requestid-object-body-→-void):
- `iface` is the source interface.
- `target` is the target machine (**not** the target interface).
- `REPORT_POWER` is the request ID, the string `mmcr_kubejs:report_power`.
- `body` is a plain JS object `{ power: powerPublished }`; MMCR automatically wraps each value as `DataValue` using [`api.dataValue(...)`](../API/KubeJS#datavalue-object-value-→-datavalue).

`sendRequest` enqueues the request; [SharedIoEvents](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/event/SharedIoEvents.java) calls [`NetworkServerState.dispatch(...)`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/network/NetworkServerState.java) during `ServerTickEvent.Post`, dequeuing requests according to the per-tick request budget. A request enqueued before dispatch in the same tick may be processed at that tick's end; a backlog can delay it, and validation may fail, so arrival on exactly the "next tick" cannot be promised.

**The producer does not need to block waiting for a response**.

### 5. Controller Text and Jade

```javascript
let powerId = api.id("mmcr_kubejs:producer_power")
let waterId = api.id("mmcr_kubejs:producer_water")
let feId = api.id("mmcr_kubejs:producer_fe")
let hasWater = storage.get("has_water").flatMap(v => v.asBoolean()).orElse(false)

ctx.screenText().append(api.screenScope().OPERATION, powerId, Text.literal("Computing Power: " + powerPublished + " tfps"))
ctx.screenText().append(api.screenScope().OPERATION, waterId, Text.literal(
    hasWater
        ? "Water: OK"
        : "Water: DRY (overflow in " + Math.max(0, 30 - dryPublished) + " sec)"
))
ctx.screenText().append(api.screenScope().OPERATION, feId, Text.literal(
    feOk ? "Energy: OK" : "Energy: LOW"
))

ctx.jadeText().append(powerId, Text.literal(powerPublished + " tfps"))
ctx.jadeText().append(waterId, Text.literal(
    hasWater ? "Water OK" : "Water DRY"
))
```

Both `screenText()` and `jadeText()` are handles for writes that "idempotently overwrite by `lineId`."

Repeated `append` calls with the same `lineId` replace the previous tick's content.

`storage.get("has_water").flatMap(v => v.asBoolean()).orElse(false)` retrieves a boolean from `DataValue`; `asBoolean()` is another kind of value accessor besides `asDouble`.

## Request Handling in Detail (CENTER Tick Behavior)

Complete tick behavior:

```javascript
machine_center.tickBehavior(behavior => behavior
    .serverTick(ctx => {
        let storage = ctx.dataStorage()
        if (storage == null) return

        let feId = api.id("mmcr_kubejs:center_fe")

        let energyPlan = ctx.ioPlan()
        energyPlan.addInput(api.energyRequirement(RecipeIO.INPUT, 200))
        let energySim = energyPlan.simulate()
        let energyOk = energySim.energySatisfied() && energyPlan.commit().successful()
        // consume FE

        // Re-derive the live producer count every tick so the UI reflects the actual
        // network connections even when storage has not been refreshed recently.
        let liveCount = 0
        let connectedHashes = new Set()
        let interfaces = api.networkInterfaces(ctx)
        let iface = interfaces != null && !interfaces.isEmpty() ? interfaces.get(0) : null
        if (iface != null) {
            for (let target of iface.connections()) {
                liveCount = liveCount + 1
                connectedHashes.add(String(target.hash()))
            }
        }
        // Remove reports whose producer is no longer connected. Collect keys first
        // because removing while iterating the Java map is unsafe.
        let staleKeys = []
        if (iface != null) {
            for (let key of storage.values().keySet()) {
                let keyString = key.toString()
                if (keyString.startsWith("power_")
                        && !connectedHashes.has(keyString.substring("power_".length))) {
                    staleKeys.push(key)
                }
            }
        }
        for (let key of staleKeys) storage.remove(key)

        // compute all the powers
        let total = 0
        let valueIter = storage.values().entrySet().iterator()
        while (valueIter.hasNext()) {
            let entry = valueIter.next()
            let key = entry.getKey()
            let value = entry.getValue()
            if (key.toString().startsWith("power_")) {
                total = total + value.asDouble().orElse(0)
            }
        }

        // some information display
        let count = liveCount

        let powerId = api.id("mmcr_kubejs:center_power")
        let countId = api.id("mmcr_kubejs:center_count")

        ctx.screenText().append(api.screenScope().OPERATION, powerId, Text.literal("Total Power: " + total + " tfps"))
        ctx.screenText().append(api.screenScope().OPERATION, countId, Text.literal("Connected Devices: " + count))
        ctx.screenText().append(api.screenScope().OPERATION, feId, Text.literal(
            energyOk ? "Energy: OK" : "Energy: LOW"
        ))

        ctx.jadeText().append(powerId, Text.literal("Total Power: " + total + " tfps"))
        ctx.jadeText().append(countId, Text.literal("Connected Devices: " + count + " producers"))
    })
)
```

4 steps:

1. **Consume energy**: attempts to consume 200 FE every tick; cleanup, summation, and display continue even on failure.
2. **Collect connection information**: `liveCount` is the number of connection records on the first interface, not a reliable count of online producers; `connectedHashes` is the set of `hash()` strings from these records.
3. **Remove stale keys**: iterates over all keys in `DataStorage`, finding those starting with `power_` whose corresponding `<hash>` is no longer in `connectedHashes`.
These orphaned keys are collected in `staleKeys`, then removed together using `remove`.
4. **Sum + write to the screen**: converts all `power_*` values to double and sums them; without an interface, old keys are not removed and their values still contribute to the total. Connected producers without power stop reporting, and the center has no timeout eviction logic, so the display totals the latest reports rather than guaranteeing real-time effective computing power.

`ctx.dataStorage().values()` returns an unmodifiable snapshot, not a live Java Map; collecting keys before deleting them can be retained, but the official comment "removing while iterating is always unsafe" must not be treated as this view's actual semantics. Ordinary `remove` takes effect immediately.

## Special Mechanisms

The view's `asDouble()` only reads values that are actually `Double`; it is not a general numeric converter. If the protocol switches to another numeric type, the read method must be adjusted accordingly.

The underlying implementation validates `maxConnections` against the total connection records across this machine's active interfaces, rather than granting each interface its own quota; both machines in this example have only one interface. Both connection establishment and dispatch perform bidirectional whitelist validation; see [NetworkInterfaceBindingCoordinator](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/multiblock/NetworkInterfaceBindingCoordinator.java).

### Bidirectional Whitelist Validation

[`networkInterface(maxCount, maxConnections)`](../API/KubeJS#networkinterface-int-maxcount-int-maxconnections-→-machinebuilderjs) only describes "I can have interfaces"; [`allowNetworkMachine(machineId)`](../API/KubeJS#allownetworkmachine-string-machineid-→-machinebuilderjs) determines "who I can communicate with."

MMCR validates both ends:

- PRODUCER's `allowNetworkMachine(CENTER_ID)` → allows it to initiate a connection to the center.
- CENTER's `allowNetworkMachine(PRODUCER_ID)` → allows it to accept a connection from the producer.

If either side is missing, the physical connection will not be established.

### `DataStorage` as Temporary Storage for the Network Protocol

`power` / `dry_sec` / `has_water` store internal machine state; this example sends only `power` as a request body field, while the other two keys are not part of the network protocol.

`DataStorage` acts as a bridge between "machine state ↔ network protocol":

- Tick behavior writes `power` to `DataStorage`
- When reporting conditions are met, the latest `power` is sent through `RequestBody`
- Upon receipt, the CENTER machine writes it to its own `DataStorage`, using `power_<peerHash>` as a namespace to avoid overwriting

This "key-name reuse" creates a one-to-one correspondence between the network protocol and machine state, without a separate schema file.

### Interface Position Stability

`position()` on `NetworkInterfaceReference` returns the current interface block's world coordinates. MMCR uses this position to look up the "interface block's connection table."

[`NetworkInterfaceBlockEntity`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/tile/NetworkInterfaceBlockEntity.java) saves the owner, connection endpoint dimensions / coordinates, machine types / hashes, and sequence numbers. Restoring records from a save does not mean the targets are always reachable; releasing the owner clears connections, and dispatch does not force-load target chunks.

### Semantics of `shouldReport = feOk`

Reporting occurs only on a 20-tick check when energy consumption succeeds and execution has not already returned due to an explosion. Insufficient power only prevents new reports; it does not notify the center to delete old ones, so this condition is not a complete health-check protocol.

If real-time effective computing power is required, design timestamps, expiration periods, or offline notifications separately; this example does not implement these protocols.

### Hash Bucketing

[`MachineControllerBlockEntity.machineReference()`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/tile/MachineControllerBlockEntity.java) calls [`MachineReferenceHasher`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/network/MachineReferenceHasher.java) to compute a hash from the dimension ID, machine type ID, and controller coordinates. Reforming with the same version, dimension, position, and type can produce the same result; do not assume it remains the same after changing dimensions, moving, or changing type. A 64-bit hash is not guaranteed collision-free either, so it cannot be described as "always unchanged across dismantling / reassembly or dimensions."

### `requestProcess` Transaction Boundaries

`requestProcess.process(...)` does not receive `TransactionContext`. This means:

- Calling `receiverStorage.set(...)` is an ordinary `set` that **takes effect immediately** (outside a transaction).
- If you are also performing IO (such as `plan.commit(transaction => { storage.set(...); })`), rollback after IO failure will not undo direct `DataStorage` writes in `requestProcess`.

`requestProcess` only writes to `DataStorage` and performs no IO, avoiding this issue.

Leaving IO to `serverTick` only separates processing stages; it does not automatically make "receipt + IO" atomic. To commit IO and state changes together, create a new plan during the tick, simulate it, then use `commitData(tx => storage.set(..., tx))` to write transaction-aware state; ordinary writes already performed when receiving the request remain outside this transaction.

### Deferred Deletion

`storage.remove(key)` in the CENTER tick is the nontransactional version of `DataStorage`; it takes effect immediately and **cannot be rolled back**.

The current `api.data.view.DataStorage` only has `remove(String)`, with no transactional deletion overload. Calling ordinary `remove` inside a `commit` / `commitData` callback does not automatically add it to the journal; ordinary `set` and world operations likewise cannot be assumed to support atomic rollback on this basis.

### Entry Points for Checking Network Handling and Types

| Entry Point | Current Type / Semantics | Source |
| --- | --- | --- |
| `networkInterfaces(ctx)` | Accepts the underlying `MachineBehaviorContext` (inherited by the tick context), returns `List<api.network.NetworkInterfaceReference>` | [KubeJSApi](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java) |
| `sendRequest(source, target, id, body)` | Source interface + target machine reference + string request ID + map request body, returns `void` | [NetworkApi](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/network/NetworkApi.java) |
| `requestProcess(...)` | `(RequestBody, RequestInfo, @Nullable api.data.DataStorage, @Nullable api.data.DataStorage)`, with no transaction parameter | [RequestProcess](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/network/RequestProcess.java) |
| Dispatch validation | Source / target structures, chunks, reference hashes, bidirectional connections, bidirectional whitelists, handlers; handler exceptions are only logged | [NetworkRequestDispatcher](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/network/NetworkRequestDispatcher.java) |
| Tick storage view | Ordinary `set` / `remove` write immediately, `values()` is a snapshot, transactional `set` accepts the nested `DataStorage.Transaction` | [DataStorage view](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/data/view/DataStorage.java) |

## Further Reading

- [Data Storage Test Machine](./data-store-test-machine) — The same `DataStorage` API, without networking.
- [Pure Tick Machine Example](./pure-tick-machine-example) — Also uses `tickBehavior`, but without networking.
- [Computing Power Producer](../JavaAPI/compute-network-producer) — Java implementation of this tutorial's PRODUCER.
- [Network Center](../JavaAPI/compute-network-hub) — Java implementation of this tutorial's CENTER.
- [Data Storage Test Machine](../JavaAPI/data-store-test-machine) — The simplest `DataStorage` sample.
- [KubeJS API](../API/KubeJS) — Central reference for the APIs cited in this tutorial.
- [KubeJS API#networkInterfaces](../API/KubeJS#networkinterfaces-machinebehaviorcontext-context-→-list-networkinterfacereference) — Network interface query entry point.
- [KubeJS API#sendRequest](../API/KubeJS#sendrequest-networkinterfacereference-source-machinereference-target-string-requestid-object-body-→-void) — Messaging mechanism.
- [KubeJS API#networkInterface()](../API/KubeJS#networkinterface-→-blockpredicate) — Network interface block predicate for structures.
- [KubeJS API#requestProcess](../API/KubeJS#requestprocess-string-requestid-requestprocess-process-→-machinebuilderjs) — Receiver-side handler registration.
