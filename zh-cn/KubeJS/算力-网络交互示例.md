---
title: A_Network_Machine
order: 11
---

# A_Network_Machine — KubeJS 网络通信机器

本文是 KubeJS 进阶示例的第二篇。我们逐段拆解 [`A_Network_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Network_Machine.js) 与 [对应的结构脚本](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Network_Machine.js)。与 [A_Data_Storage_Machine](./A_Data_Storage_Machine) 不同，本教程**同时注册两台机器**——一台 PRODUCER（生产者）和一台 CENTER（中心），演示 KubeJS 端的网络通信：每 tick 上报 + 周期性聚合。

它对应 Java 端的 [NETWORK_PRODUCER_MACHINE](../JavaAPI/NETWORK_PRODUCER_MACHINE) + [NETWORK_CENTER_MACHINE](../JavaAPI/NETWORK_CENTER_MACHINE) 两台机器，但在脚本端合二为一。本教程会从三方面展开：网络拓扑图、KubeJS 端的 [`networkInterface`](../API/KubeJS#networkinterfaceint-maxcount-int-maxconnections--machinebuilderjs) / [`allowNetworkMachine`](../API/KubeJS#allownetworkmachinestring-machineid--machinebuilderjs) / [`requestProcess`](../API/KubeJS#requestprocessstring-requestid-requestprocess-process--machinebuilderjs) 三件套，以及 [`api.sendRequest`](../API/KubeJS#sendrequestnetworkinterfacereference-source-machinereference-target-string-requestid-object-body--void) 的推消息机制。

## 机器简介

A_Network_Machine 一次注册两台机器：

1. **PRODUCER（生产者，`kubejs_network_producer_machine`）**：白羊毛外壳，中心是控制器。
   - 每 tick 检查是否有 FE 输入；
   - 每 20 tick 检查是否有水输入；
   - 根据输入状态计算"算力"（power，单位 `tfps`）；
   - **每 20 tick 把算力推到 CENTER**——通过 [`api.sendRequest`](../API/KubeJS#sendrequestnetworkinterfacereference-source-machinereference-target-string-requestid-object-body--void)；
   - 控制器屏幕显示算力、水源状态、FE 状态；
   - 如果连续 30 秒无水，会**爆炸**——演示"机器内部状态与世界交互"。

2. **CENTER（中心，`kubejs_network_center_machine`）**：黑羊毛外壳，中心是控制器。
   - 注册 [`requestProcess(REPORT_POWER, ...)`](../API/KubeJS#requestprocessstring-requestid-requestprocess-process--machinebuilderjs) 回调——接收 PRODUCER 的算力上报，写到自己的 `DataStorage`，键名 `power_<peerHash>`（按节点哈希分桶，避免互相覆盖）；
   - 每 tick 跑 `serverTick`：吸 200 FE、收集连接信息、清理孤儿键、求和、写屏幕 + JADE。

两台机器通过 [`networkInterface(maxCount, maxConnections)`](../API/KubeJS#networkinterfaceint-maxcount-int-maxconnections--machinebuilderjs) 声明网络能力，通过 [`allowNetworkMachine(...)`](../API/KubeJS#allownetworkmachinestring-machineid--machinebuilderjs) 互相加白名单。MMCR 在两端都校验白名单，缺一不可。

## 本教程涉及的文件

源码位置（启动期 + 结构期，没有配方期）：

- [`startup_scripts/advance/A_Network_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Network_Machine.js) — 两台机器的定义、网络声明、tick 行为、请求处理。
- [`server_scripts/structure/advance/A_Network_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Network_Machine.js) — 两台机器的多方块结构。

Java 对照：[NETWORK_PRODUCER_MACHINE](../JavaAPI/NETWORK_PRODUCER_MACHINE) + [NETWORK_CENTER_MACHINE](../JavaAPI/NETWORK_CENTER_MACHINE)。

## 本教程涉及的 API 跳转表

| 用到的 KubeJS API | API 参考 |
| --- | --- |
| `MMCR.getAPI()` | [链接](../API/KubeJS#getapi--kubejsapi) |
| `event.createMachine(...)` × 2 | [链接](../API/KubeJS#createmachinestring-id--machinebuilderjs) |
| `MachineBuilderJS.displayNameKey(...)` | [链接](../API/KubeJS#displaynamekeystring-key--machinebuilderjs) |
| `MachineBuilderJS.appearance(...)` | [链接](../API/KubeJS#appearancestring-machinebasicblock--machinebuilderjs) |
| `MachineBuilderJS.networkInterface(...)` | [链接](../API/KubeJS#networkinterfaceint-maxcount-int-maxconnections--machinebuilderjs) |
| `MachineBuilderJS.allowNetworkMachine(...)` | [链接](../API/KubeJS#allownetworkmachinestring-machineid--machinebuilderjs) |
| `MachineBuilderJS.requestProcess(...)` | [链接](../API/KubeJS#requestprocessstring-requestid-requestprocess-process--machinebuilderjs) |
| `MachineBuilderJS.tickBehavior(...)` | [链接](../API/KubeJS#tickbehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs) |
| `MachineBehaviorBuilderJS.serverTick(...)` | [链接](../API/KubeJS#servertickconsumer-tickbehaviorcontext-callback--machinebehaviorbuilderjs) |
| `KubeJSApi.networkInterfaces(ctx)` | [链接](../API/KubeJS#networkinterfacesmachinebehaviorcontext-context--listnetworkinterfacereference) |
| `KubeJSApi.sendRequest(...)` | [链接](../API/KubeJS#sendrequestnetworkinterfacereference-source-machinereference-target-string-requestid-object-body--void) |
| `KubeJSApi.dataValue(...)` | [链接](../API/KubeJS#datavalueobject-value--datavalue) |
| `KubeJSApi.energyRequirement(...)` | [链接](../API/KubeJS#energyrequirementrecipeio-io-int-feperopertick--machinerequirement) |
| `KubeJSApi.fluidInputRequirement(...)` | [链接](../API/KubeJS#fluidinputrequirementstring-fluidid-int-amount--machinerequirement) |
| `KubeJSApi.recipeIO()` | [链接](../API/KubeJS#recipeio--recipeiovalues) |
| `KubeJSApi.id(...)` | [链接](../API/KubeJS#idstring-id--identifier) |
| `KubeJSApi.screenScope()` | [链接](../API/KubeJS#screenscope--screenscopevalues) |
| `KubeJSApi.block(...)` / `anyOf(...)` | [链接](../API/KubeJS#blockstring-blockid--blockpredicate) / [链接](../API/KubeJS#anyofblockpredicate-children--blockpredicate) |
| `KubeJSApi.anyOfEnergyInput()` / `anyOfFluidInput()` | [链接](../API/KubeJS#anyofenergyinput--blockpredicate) / [链接](../API/KubeJS#anyoffluidinput--blockpredicate) |
| `KubeJSApi.networkInterface()` | [链接](../API/KubeJS#networkinterface--blockpredicate) |
| `KubeJSApi.dataStorage()` | [链接](../API/KubeJS#datastorage--blockpredicate) |
| `MachineStructureBuilderJS.pattern(...)` / `set(...)` / `controller(...)` / `build()` | [链接](../API/KubeJS#patternstring-rows--machinestructurebuilderjs) / [链接](../API/KubeJS#setstring-symbol-object-value--machinestructurebuilderjs) / [链接](../API/KubeJS#controllerstring-symbol--machinestructurebuilderjs) / [链接](../API/KubeJS#build--void) |

源码里直接通过 `Java.loadClass` 拿一个 Java 类：

| Java 类 | 用途 |
| --- | --- |
| `net.minecraft.world.level.Level$ExplosionInteraction` | PRODUCER 干燥超时后 `level.explode(...)` 调用的破坏方式枚举 |

## 网络通信模型图解

MMCR 的网络通信走"**请求-响应**"模型。三种角色：

```
        (主动发送)              (接收并处理)
PRODUCER  ────sendRequest──►  CENTER
   ▲                            │
   │                            │
   └────────(每 tick 反向读取)───┘
        connections() 列表
```

本教程演示的是 `producer → center` 单向推消息（`consumer` 在 [Java 端 NETWORK_CONSUMER_MACHINE](../JavaAPI/NETWORK_CENTER_MACHINE) 等教程里出现，本 KubeJS 示例不涉及）。下面是完整数据流：

```
  ┌──────────────────────────────────────────────────┐
  │                  PRODUCER                        │
  │                                                  │
  │  Tick:                                            │
  │    1. 尝试吸收 100 FE                             │
  │    2. 每 20 tick 尝试吸 100 mB 水                 │
  │    3. 更新 power/dry_sec/has_water 到 DataStorage │
  │    4. 每 20 tick 通过 KubeJSApi.sendRequest     │
  │       → REPORT_POWER                              │
  │       → body: { "power": <当前算力> }             │
  │       → target: iface.connections().get(0)       │
  └──────────────────────────────────────────────────┘
                       │
                       ▼ RequestBody("power" → 20.0)
  ┌──────────────────────────────────────────────────┐
  │                   CENTER                         │
  │                                                  │
  │  requestProcess(REPORT_POWER, (body, request,    │
  │      senderStorage, receiverStorage) => {        │
  │    receiverStorage.set(                          │
  │      "power_" + request.peer().hash(),           │
  │      api.dataValue(body.get("power")             │
  │        .flatMap(v => v.asDouble())               │
  │        .orElse(0))                               │
  │    );                                            │
  │  });                                             │
  │                                                  │
  │  serverTick:                                      │
  │    1. 吸收 200 FE                                 │
  │    2. 统计 liveCount = iface.connections().size()│
  │    3. 收集 connectedHashes                       │
  │    4. 删除 DataStorage 中已断连的 power_* 键      │
  │    5. 求和剩余的 power_*                          │
  │    6. 写屏幕 + JADE                               │
  └──────────────────────────────────────────────────┘
```

要点：

- **生产者从来不需要知道中心在哪**——它只调用 `iface.connections().get(0)` 拿到第一个连接，由 MMCR 内部根据网络接口的拓扑把请求转过去。
- **请求体是键值映射**，值都是 [`api.dataValue(...)`](../API/KubeJS#datavalueobject-value--datavalue) 支持的类型——保持类型安全。源码里 body 用普通 JS 对象 `{ power: powerPublished }`，MMCR 会把它自动包装成 `DataValue`。
- 中心收到后通过 [`requestProcess`](../API/KubeJS#requestprocessstring-requestid-requestprocess-process--machinebuilderjs) 回调处理；处理逻辑完全由中心机器定义，生产者不关心。
- **失败时不会传播异常**——`sendRequest` 找不到目标走"沉默丢失"，不会回调 `requestFailed`（KubeJS 端 `sendRequest` 同样遵循此规则）。

## 机器定义详解

打开启动期脚本 [`A_Network_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/startup_scripts/advance/A_Network_Machine.js)，先看常量声明：

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

- `RecipeIO`、`api` 都是为减少重复代码提取的常用别名。
- `ExplosionInteraction` 是 Mojang 的内部枚举——`level.explode(...)` 用 `BLOCK` / `MOB` / `NONE` 区分爆炸的破坏方式。KubeJS 端用 `Java.loadClass` 拿。
- 三个字符串常量：`PRODUCER_ID` / `CENTER_ID` 是机器注册 ID，`REPORT_POWER` 是网络请求 ID。
- `waterRequirement` 提前构造一次"100 mB 水输入"需求——避免在 tick 回调里反复创建。

### PRODUCER 的机器定义

```javascript
const machine_producer = event
    .createMachine(PRODUCER_ID)
    .displayNameKey("machine.mmcr_kubejs.kubejs_network_producer_machine")
    .appearance("minecraft:white_wool")
    .networkInterface(1, 1) // allow 1 network port and max 1 connections
    .allowNetworkMachine(CENTER_ID) // allow connect to network center machine
```

四个声明 + 两个网络能力：

- `.displayNameKey(...)`：本地化键，标准命名。
- `.appearance("minecraft:white_wool")`：未成型时白羊毛。
- [`.networkInterface(1, 1)`](../API/KubeJS#networkinterfaceint-maxcount-int-maxconnections--machinebuilderjs)：声明这台机器**最多拥有 1 个网络接口**、**每个接口最多连接 1 个邻居**。两个 `1` 都是有意为之——PRODUCER 端只放 1 块 `networkInterface()` 方块，也只连 1 个 CENTER。
- [`.allowNetworkMachine(CENTER_ID)`](../API/KubeJS#allownetworkmachinestring-machineid--machinebuilderjs)：白名单——只允许与 `CENTER_ID` 通信。**双向校验**：另一端 CENTER 也必须把 `PRODUCER_ID` 写进自己的白名单。

### CENTER 的机器定义

```javascript
const machine_center = event
    .createMachine(CENTER_ID)
    .displayNameKey("machine.mmcr_kubejs.kubejs_network_center_machine")
    .appearance("minecraft:black_wool")
    .networkInterface(1, 16) // one interface but 16 connections
    .allowNetworkMachine(PRODUCER_ID)
    // register a request process for REPORT_POWER id
    .requestProcess(REPORT_POWER, (body, request, senderStorage, receiverStorage) => {
        if (receiverStorage == null) return
        // the power value that producer produced(what a sentence)
        let reported = Number(body.get("power").flatMap(v => v.asDouble()).orElse(0))
        // set it's unique name, here you can use hash
        let key = "power_" + request.peer().hash()
        receiverStorage.set(key, api.dataValue(reported))
    })
```

CENTER 端几个关键点：

- [`.networkInterface(1, 16)`](../API/KubeJS#networkinterfaceint-maxcount-int-maxconnections--machinebuilderjs)：最多 1 个接口，但每个接口最多连 16 个邻居——可以聚合 16 个 PRODUCER。
- [`.allowNetworkMachine(PRODUCER_ID)`](../API/KubeJS#allownetworkmachinestring-machineid--machinebuilderjs)：白名单对应——CENTER 也必须把 PRODUCER 加进来。
- [`.requestProcess(REPORT_POWER, ...)`](../API/KubeJS#requestprocessstring-requestid-requestprocess-process--machinebuilderjs)：注册请求处理器。`REPORT_POWER` 是与 PRODUCER 端约定的请求 ID；第二个参数是四参数回调 `(body, request, senderStorage, receiverStorage)`，对应 Java 端的 [`RequestProcess`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/cn/howxu/mmcr/api/network/RequestProcess.java) 函数式接口。

处理器内部逻辑（4 步）：

1. `if (receiverStorage == null) return`——CENTER 没成型或没放 `dataStorage()` 方块时 `receiverStorage` 为 `null`，直接放弃。
2. `body.get("power").flatMap(v => v.asDouble()).orElse(0)` 从 `RequestBody` 取 `power` 字段（`Optional<DataValue>`），用 `asDouble()` 安全转换成 `Optional<Double>`，再 `Number(...)` 转回 JS 数字默认 `0`。
3. `request.peer().hash()` 拿到 PRODUCER 的稳定实例哈希（成型后生成，跨重启不变）——用来做"按节点分桶"。
4. `receiverStorage.set(key, api.dataValue(reported))` 把这个 PRODUCER 的算力写到 CENTER 的 `DataStorage`，键名 `power_<hash>`。

> **`request.peer()` 的语义**：`peer()` 返回 `MachineReference`（record `(Identifier type, long hash)`），`type` 是 PRODUCER 的机器 ID，`hash` 是该机器实例的稳定哈希。`peer().hash()` 就是用做"按节点分桶"的 key。

最后两台机器各自 `.register()` 提交到当前注册窗口。

## 结构详解

打开 [`structure/advance/A_Network_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/example/server_scripts/structure/advance/A_Network_Machine.js)：

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

两个结构都是 4×4×4，外壳分别用白羊毛（PRODUCER）和黑羊毛（CENTER）。A 槽位用 [`api.anyOf(...)`](../API/KubeJS#anyofblockpredicate-children--blockpredicate) 把多种方块谓词并集——一个位置可以放多种方块。

PRODUCER 的 A 槽位包含 5 类：

| 谓词 | 用途 |
| --- | --- |
| [`api.anyOfFluidInput()`](../API/KubeJS#anyoffluidinput--blockpredicate) | 流体输入口（进水） |
| [`api.anyOfEnergyInput()`](../API/KubeJS#anyofenergyinput--blockpredicate) | FE 输入口 |
| [`api.networkInterface()`](../API/KubeJS#networkinterface--blockpredicate) | **网络接口方块**——能通信的关键 |
| [`api.dataStorage()`](../API/KubeJS#datastorage--blockpredicate) | **数据存储方块**——`tickBehavior` 用它保存 `power` / `dry_sec` / `has_water` |
| `api.block('minecraft:red_terracotta')` | 装饰 |

CENTER 的 A 槽位只有 4 类（无 `anyOfFluidInput()`），结构外壳是黑羊毛——这是从 [NETWORK_CENTER_MACHINE](../JavaAPI/NETWORK_CENTER_MACHINE) 的 Java 结构照搬过来的设计。

## 网络请求详解（PRODUCER tick 行为）

完整 tick 行为有 5 段：能量吸收 → 水吸收 + 算力计算 → 干燥超限爆炸 → 网络上报 → 屏幕文本。

### 1. 能量吸收（每 tick）

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
// Skip downstream updates while the structure is unpowered so the UI shows the
// last computed power and the dry countdown keeps its persisted value.
let powerPublished = power
let dryPublished = dry_sec
let shouldReport = false
```

每 tick 尝试吸 100 FE。这里没用二分查找（因为输入固定 100），直接 `simulate()` + `commit()` 两步走。如果失败，`feOk = false`，下游会降级。

`storage.get("power").flatMap(v => v.asDouble()).orElse(0)` 是 MMCR 数据层最常见的读法——从 `DataValue` 取出 `double`，类型不对时退到 `0`。`Number(...)` 是把 JS 自动转换出来的数值再变回 JS `number` 类型，方便后面加法运算。

### 2. 水吸收 + 算力计算（每 20 tick）

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

    storage.set("has_water", api.dataValue(hasWater))
    storage.set("power", api.dataValue(power))
    storage.set("dry_sec", api.dataValue(dry_sec))
    powerPublished = power
    dryPublished = dry_sec

    if (dry_sec >= 30) {
        // ... 爆炸，见下节
    }

    shouldReport = feOk
}
```

`waterRequirement` 是在脚本顶层 `api.fluidInputRequirement("minecraft:water", 100)` 构造的"100 mB 水输入需求"——这一行很重要：在 tick 回调里**复用同一个需求对象**比每 tick 重新构造更省事，且语义不变。

成功取水 → `power = 20`、干燥秒数清零；失败 → `power = 10`、干燥秒数 +1。三个状态都通过 [`api.dataValue(...)`](../API/KubeJS#datavalueobject-value--datavalue) 包成 `DataValue` 后持久化到 `DataStorage`。

### 3. 干燥超限爆炸

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

`ctx.controllerPos()` 返回控制器方块位置；`ctx.level()` 是服务端世界。30 秒没水直接 `level.explode(...)` 半径 4、破坏方块。这一步的意图很明确——演示"机器如何根据内部状态直接操作世界"。

### 4. 网络上报

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

[`api.networkInterfaces(ctx)`](../API/KubeJS#networkinterfacesmachinebehaviorcontext-context--listnetworkinterfacereference) 是网络通信的入口，返回当前机器所有活跃网络接口的 `NetworkInterfaceReference` 列表（按位置排序）。每一步安全检查：

1. `interfaces` 不空 → 取第一个接口 `iface`；
2. `iface.connections()` 返回**已建立的物理连接**对应的 `MachineReference` 列表——`MachineReference` 是 record `(Identifier type, long hash)`，稳定标识一台已成型机器；
3. 取第一个连接 `target`，调用 [`api.sendRequest(iface, target, REPORT_POWER, body)`](../API/KubeJS#sendrequestnetworkinterfacereference-source-machinereference-target-string-requestid-object-body--void)：
   - `iface` 是源接口；
   - `target` 是目标机器（**不是**目标接口，MMCR 内部会查 `iface.endpointFor(target)` 找到目标接口）；
   - `REPORT_POWER` 是请求 ID，字符串 `mmcr_kubejs:report_power`；
   - `body` 是 JS 普通对象 `{ power: powerPublished }`——MMCR 会自动用 [`api.dataValue(...)`](../API/KubeJS#datavalueobject-value--datavalue) 把每个值包成 `DataValue`。

`sendRequest` 内部把请求入队到当前 tick 的网络处理队列，目标机器的 [`requestProcess(REPORT_POWER, ...)`](../API/KubeJS#requestprocessstring-requestid-requestprocess-process--machinebuilderjs) 会在**下一个 tick** 处理。**生产者不需要阻塞等待响应**——典型的"推消息"模型。

### 5. 屏幕文本与 JADE

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

`screenText()` 与 `jadeText()` 都是写"按 `lineId` 幂等覆盖"的句柄。同 `lineId` 反复 `append` 会替换上一帧内容。

`storage.get("has_water").flatMap(v => v.asBoolean()).orElse(false)` 是从 `DataValue` 取布尔值的写法；`asBoolean()` 是 `asDouble` 之外的另一类取值方法。

## 请求处理详解（CENTER tick 行为）

完整 tick 行为：

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

整段拆成 4 步：

1. **吸能量**：每 tick 吸 200 FE，比 PRODUCER（100）高一倍，因为承担聚合职责。
2. **收集连接信息**：`liveCount` 是当前在线的 PRODUCER 数；`connectedHashes` 是它们 `hash()` 字符串的集合。
3. **清理过期键**：遍历 `DataStorage` 所有键，找出以 `power_` 开头、但对应 `<hash>` 已经不在 `connectedHashes` 中的——这些是孤儿键（CENTER 已经断开的 PRODUCER 留下的）。先收集到 `staleKeys`，再统一 `remove`——因为 Java `Map.entrySet()` 不允许在迭代中调用 `remove`，延迟删除是标准做法。
4. **求和 + 写屏幕**：把所有 `power_*` 键的 `DataValue` 用 `asDouble()` 转回数字求和；`total` 是总算力，`count` 是当前连接数。

## 特殊机制

### 白名单双向校验

[`networkInterface(maxCount, maxConnections)`](../API/KubeJS#networkinterfaceint-maxcount-int-maxconnections--machinebuilderjs) 只描述"我能做接口"；真正决定"我能和谁通信"的是 [`allowNetworkMachine(machineId)`](../API/KubeJS#allownetworkmachinestring-machineid--machinebuilderjs)。MMCR 在两端都校验：

- PRODUCER 端 `allowNetworkMachine(CENTER_ID)` → 允许它主动连中心；
- CENTER 端 `allowNetworkMachine(PRODUCER_ID)` → 允许它被动接生产者。

任意一方缺失，物理连接都不会建立。

### `DataStorage` 作为网络协议的暂存

`power` / `dry_sec` / `has_water` 三个键存的是"机器内部状态"，但它们同时是**网络协议的字段名**——`RequestBody` 也用 `power` 这个键携带数据。换句话说，`DataStorage` 充当了"机器状态 ↔ 网络协议"之间的桥：

- tick 行为把 `power` 写到 `DataStorage`；
- 同一 tick 再用相同的 key 把 `power` 通过 `RequestBody` 发出去；
- CENTER 机器收到后写到自己的 `DataStorage`，用 `power_<peerHash>` 做命名空间避免覆盖。

这种"复用键名"的写法使网络协议与机器状态一一对应，不需要单独的 schema 文件。

### 接口位置稳定性

`NetworkInterfaceReference` 的 `position()` 返回当前接口方块的世界坐标。MMCR 通过这个位置查"接口方块的连接表"——连接表存在网络接口方块实体的 NBT 里，跨区块跨维度都稳定。

### `shouldReport = feOk` 的语义

只有能量吸收成功时才上报算力——避免在"机器还没启动"时把 `power = 0` 推到中心造成误聚合。这是一种常见的"健康检查 + 业务上报合一"的模式。

### 按哈希分桶

为什么用 `power_<peerHash>` 而不是 `power_0`、`power_1` 这种自增 ID？因为机器实例的 `hash()` 是 MMCR 内部稳定的——成型时生成，跨重启不变，跨维度不变。这样**断电/重启/拆装不会改变 PRODUCER 的 hash**，CENTER 的统计键名也不会变。

### `requestProcess` 的事务边界

`requestProcess.process(...)` 不接收 `TransactionContext`。这意味着：

- 调用 `receiverStorage.set(...)` 是**立即生效**的普通 `set`（不走事务）。
- 如果你同时还在做 IO（比如 `plan.commit(transaction => { storage.set(...); })`），那么 IO 失败回滚不会撤销 `requestProcess` 里直接写的 `DataStorage`。

本教程的 `requestProcess` 只写 `DataStorage` 不做 IO，规避了这个问题。如果想让"接收 + IO"原子化，应该让 `requestProcess` 只写 `DataStorage`，把 IO 留给 `serverTick`。

### 延迟删除 vs 立即删除

CENTER tick 中 `storage.remove(key)` 是 `DataStorage` 的非事务版本，立即生效，**不可回滚**。这是因为 `serverTick` 不在事务上下文内。如果在 `plan.commit(transaction => ...)` 内调用，应该用事务版本。

## 与其他教程的对比

- vs [A_Data_Storage_Machine](./A_Data_Storage_Machine)：DATA_STORAGE 完全没有网络通信，所有读写都在自己机器的 `DataStorage` 里。A_Network_Machine 把 `DataStorage` 的字段当网络协议字段用，引入了 [`api.networkInterfaces(...)`](../API/KubeJS#networkinterfacesmachinebehaviorcontext-context--listnetworkinterfacereference) / [`api.sendRequest(...)`](../API/KubeJS#sendrequestnetworkinterfacereference-source-machinereference-target-string-requestid-object-body--void) / [`api.dataValue(...)`](../API/KubeJS#datavalueobject-value--datavalue) 等新概念。
- vs [A_Simple_Machine](./A_Simple_Machine)：A_Simple_Machine 演示了配方驱动的标准三阶段模型，A_Network_Machine 完全不走配方，只用 [`networkInterface`](../API/KubeJS#networkinterfaceint-maxcount-int-maxconnections--machinebuilderjs) + [`tickBehavior`](../API/KubeJS#tickbehaviorconsumer-machinebehaviorbuilderjs-builder--machinebuilderjs)。
- vs Java 端 [NETWORK_PRODUCER_MACHINE](../JavaAPI/NETWORK_PRODUCER_MACHINE) / [NETWORK_CENTER_MACHINE](../JavaAPI/NETWORK_CENTER_MACHINE)：**逻辑等价**，但 KubeJS 把 Java 类型、`MachineBuilder` 调用全部换成了脚本 API：

  | Java 端 | KubeJS 端 |
  | --- | --- |
  | `MachineBuilder.machine(...).networkInterface(1, 1).allowNetworkMachine(NETWORK_CENTER_MACHINE)` | `event.createMachine(...).networkInterface(1, 1).allowNetworkMachine(CENTER_ID)` |
  | `.requestProcess(REPORT_POWER, (body, req, sStorage, rStorage) -> {...})` | `.requestProcess(REPORT_POWER, (body, request, senderStorage, receiverStorage) => {...})` |
  | `NetworkApi.interfaces(context)` | `api.networkInterfaces(ctx)` |
  | `iface.connections()` | `iface.connections()`（一致） |
  | `NetworkApi.sendRequest(iface, target, REPORT_POWER, RequestBody.of(Map.of("power", DataValue.of(powerPublished))))` | `api.sendRequest(iface, target, REPORT_POWER, { power: powerPublished })` |
  | `DataValue.of(reported)` | `api.dataValue(reported)` |
  | `Component.literal("Total Power: " + total + " tfps")` | `Text.literal("Total Power: " + total + " tfps")` |

  KubeJS 端的 `body` 用普通 JS 对象就够了——MMCR 会自动调用 [`api.dataValue(...)`](../API/KubeJS#datavalueobject-value--datavalue) 包成 `DataValue`；Java 端必须显式 `RequestBody.of(Map.of(...))` + `DataValue.of(...)`。

## 延伸阅读

- [A_Data_Storage_Machine](./A_Data_Storage_Machine) — 同一 `DataStorage` API，但不走网络。
- [A_Simple_Machine](./A_Simple_Machine) — 配方驱动的最简样本。
- [A_Pure_Tick_Machine](./A_Pure_Tick_Machine) — 同样用 `tickBehavior`，但没有网络。
- [NETWORK_PRODUCER_MACHINE](../JavaAPI/NETWORK_PRODUCER_MACHINE) — 本教程 PRODUCER 的 Java 端实现。
- [NETWORK_CENTER_MACHINE](../JavaAPI/NETWORK_CENTER_MACHINE) — 本教程 CENTER 的 Java 端实现。
- [DATA_STORAGE_MACHINE](../JavaAPI/DATA_STORAGE_MACHINE) — `DataStorage` 的最简样本。
- [KubeJS API](../API/KubeJS) — 本教程引用 API 的集中参考。
- [KubeJS API#networkInterfaces](../API/KubeJS#networkinterfacesmachinebehaviorcontext-context--listnetworkinterfacereference) — 网络接口查询入口。
- [KubeJS API#sendRequest](../API/KubeJS#sendrequestnetworkinterfacereference-source-machinereference-target-string-requestid-object-body--void) — 推消息机制。
- [KubeJS API#networkInterface()](../API/KubeJS#networkinterface--blockpredicate) — 结构上的网络接口方块谓词。
- [KubeJS API#requestProcess](../API/KubeJS#requestprocessstring-requestid-requestprocess-process--machinebuilderjs) — 接收侧处理器注册。

## 未在 KubeJS.md 中覆盖的 API

本教程用到了 KubeJS 端没有单独列出的 API：

- **`cn.howxu.mmcr.api.network.NetworkApi`**（Java 端静态门面）— KubeJS 端用 [`api.networkInterfaces(ctx)`](../API/KubeJS#networkinterfacesmachinebehaviorcontext-context--listnetworkinterfacereference) 与 [`api.sendRequest(...)`](../API/KubeJS#sendrequestnetworkinterfacereference-source-machinereference-target-string-requestid-object-body--void) 替代。
- **`cn.howxu.mmcr.api.network.RequestBody`**（Java 端不可变请求体）— KubeJS 端用普通 JS 对象 + [`api.dataValue(...)`](../API/KubeJS#datavalueobject-value--datavalue) 替代。
- **`cn.howxu.mmcr.api.network.NetworkInterfaceReference`**（活跃网络接口的服务端引用）— 接口在 KubeJS.md 中没单独列出，但通过 `networkInterfaces(ctx)` 间接暴露，方法 `position()` / `connections()`（返回 `MachineReference` 列表）都可用。
- **`cn.howxu.mmcr.api.network.MachineReference`**（record `(Identifier type, long hash)`）— KubeJS 端通过 `target.hash()` / `request.peer().hash()` 访问，文档中没单独条目。
- **`cn.howxu.mmcr.api.network.RequestProcess`**（Java 函数式接口）— KubeJS 端通过 [`requestProcess(...)`](../API/KubeJS#requestprocessstring-requestid-requestprocess-process--machinebuilderjs) 注册，签名一致。
- **`cn.howxu.mmcr.api.data.DataStorage`** / **`DataValue`** — 详见 [A_Data_Storage_Machine](./A_Data_Storage_Machine) 的对应章节。
- **`net.minecraft.world.level.Level$ExplosionInteraction`** — Mojang 内部枚举，KubeJS 端通过 `Java.loadClass` 拿。
