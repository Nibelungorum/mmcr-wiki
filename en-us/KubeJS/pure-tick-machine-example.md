---
title: Pure Tick Test Machine
order: 12
---

# Pure Tick Machine Example

This is the third article in the advanced KubeJS examples.

Script callbacks directly use the underlying contexts in `cn.howxu.mmcr.api.machine.definition`, rather than Java `publicapi` behavior interfaces. `serverTick` receives `TickBehaviorContext`; its `ioPlan()` returns `MachineIoPlan` from the same package, and `screenText()` returns `api.controller.ControllerScreenText`.

This machine has no recipes and runs entirely through [`tickBehavior`](../API/KubeJS#tickbehavior-consumer-machinebehaviorbuilderjs-builder-→-machinebuilderjs) + [`serverTick`](../API/KubeJS#servertick-consumer-tickbehaviorcontext-callback-→-machinebehaviorbuilderjs). It is the KubeJS implementation of the [Pure Tick Test Machine](../JavaAPI/pure-tick-test-machine).

It forms a comparison pair with the [Recipe Tick Example](./recipe-tick-example): both offer "per-tick customization," but this machine **has no recipes at all**, with all logic concentrated in `serverTick`. The Recipe Tick Example uses [`recipeBehavior`](../API/KubeJS#recipebehavior-consumer-machinebehaviorbuilderjs-builder-→-machinebuilderjs), inserting callbacks at 5 recipe lifecycle hooks. This tutorial focuses on chained calls to [`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) + the availability of hooks such as `idleStart` / `idleEnd` / `preServerTick` / `postServerTick` / `serverTick`, and distinguishes PURE_TICK from RECIPE_TICK.

## Files Involved

Source:

- [`startup_scripts/advance/A_Pure_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/advance/A_Pure_Tick_Machine.js) — Machine definition and tick behavior.
- [`server_scripts/structure/advance/A_Pure_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Pure_Tick_Machine.js) — Multiblock structure.

## API Navigation Table

| KubeJS API Used | API Reference |
| --- | --- |
| `MMCR.getAPI()` | [Link](../API/KubeJS#getapi-→-kubejsapi) |
| `event.createMachine(...)` | [Link](../API/KubeJS#createmachine-string-id-→-machinebuilderjs) |
| `MachineBuilderJS.displayNameKey(...)` | [Link](../API/KubeJS#displaynamekey-string-key-→-machinebuilderjs) |
| `MachineBuilderJS.recipePool(...)` | [Link](../API/KubeJS#recipepool-string-recipepoolids-→-machinebuilderjs) |
| `MachineBuilderJS.appearance(...)` | [Link](../API/KubeJS#appearance-string-machinebasicblock-→-machinebuilderjs) |
| `MachineBuilderJS.allowMultithreading()` | [Link](../API/KubeJS#allowmultithreading-→-machinebuilderjs) |
| `MachineBuilderJS.allowParallelism()` | [Link](../API/KubeJS#allowparallelism-→-machinebuilderjs) |
| `MachineBuilderJS.maxParallelAmount(...)` | [Link](../API/KubeJS#maxparallelamount-long-amount-→-machinebuilderjs) |
| `MachineBuilderJS.tickBehavior(...)` | [Link](../API/KubeJS#tickbehavior-consumer-machinebehaviorbuilderjs-builder-→-machinebuilderjs) |
| `MachineBehaviorBuilderJS.serverTick(...)` | [Link](../API/KubeJS#servertick-consumer-tickbehaviorcontext-callback-→-machinebehaviorbuilderjs) |
| `TickBehaviorContext.ioPlan()` | [Link](../API/KubeJS#machineioplan) |
| `MachineIoPlan.addInput(...)` / `addOutput(...)` / `add(...)` / `simulate()` / `commit()` | [Link](../API/KubeJS#machineioplan) |
| `KubeJSApi.recipeIO()` | [Link](../API/KubeJS#recipeio-→-recipeiovalues) |
| `KubeJSApi.id(...)` | [Link](../API/KubeJS#id-string-id-→-identifier) |
| `KubeJSApi.screenScope()` | [Link](../API/KubeJS#screenscope-→-screenscopevalues) |
| `KubeJSApi.energyRequirement(...)` | [Link](../API/KubeJS#energyrequirement-recipemodifier-iotype-io-long-fepertick-→-machinerequirement) |
| `KubeJSApi.itemInputRequirement(...)` | [Link](../API/KubeJS#iteminputrequirement-string-itemid-long-count-→-machinerequirement) |
| `KubeJSApi.itemOutputRequirement(...)` | [Link](../API/KubeJS#itemoutputrequirement-string-itemid-long-count-float-chance-→-machinerequirement) |
| `event.registerControllerScreenText(...)` | [Link](../API/KubeJS#registercontrollerscreentext-string-machineid-consumer-controllerscreentexteventjs-handler-→-void) |
| `ControllerScreenTextEventJS.append(...)` | [Link](../API/KubeJS#append-string-scope-string-lineid-component-text-→-void) |
| `KubeJSApi.block(...)` / `anyOf(...)` | [Link](../API/KubeJS#block-string-blockid-→-blockpredicate) / [Link](../API/KubeJS#anyof-blockpredicate-children-→-blockpredicate) |
| `KubeJSApi.anyOfItemInput()` / `anyOfItemOutput()` / `anyOfEnergyInput()` | [Link](../API/KubeJS#anyofiteminput-→-blockpredicate) / [Link](../API/KubeJS#anyofitemoutput-→-blockpredicate) / [Link](../API/KubeJS#anyofenergyinput-→-blockpredicate) |
| `KubeJSApi.parallelControllers()` / `factoryController()` | [Link](../API/KubeJS#parallelcontrollers-→-blockpredicate) / [Link](../API/KubeJS#factorycontroller-→-blockpredicate) |
| `MachineStructureBuilderJS.pattern(...)` / `set(...)` / `controller(...)` / `build()` | [Link](../API/KubeJS#pattern-string-rows-→-machinestructurebuilderjs) / [Link](../API/KubeJS#set-string-symbol-object-value-→-machinestructurebuilderjs) / [Link](../API/KubeJS#controller-string-symbol-→-machinestructurebuilderjs) / [Link](../API/KubeJS#build-→-void) |

The source directly obtains a Java class through `Java.loadClass`:

| Java Class | Purpose |
| --- | --- |
| `net.minecraft.world.entity.player.Player` | Searches for players within an area and attacks them with lightning |

## Machine Definition

[`A_Pure_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/advance/A_Pure_Tick_Machine.js)：

```javascript
MMCREvents.startup(event => {
    const machine = event
        .createMachine("mmcr_kubejs:kubejs_pure_tick_machine")
        .displayNameKey("machine.mmcr_kubejs.kubejs_pure_tick_machine")
        .recipePool("mmcr_kubejs:kubejs_pure_tick_machine") // This will set the JEI recipe page type
        .appearance("minecraft:green_terracotta");

    const api = MMCR.getAPI()
    const Player = Java.loadClass("net.minecraft.world.entity.player.Player")
    // ...
})
```

Chained calls:

- `.displayNameKey(...)`: localization key.
- `.recipePool(...)`: recipe pool ID.
- `.appearance("minecraft:green_terracotta")`: appearance.

Capability switches:

```javascript
machine
    // Here pure tick machine also allowed to use multi thread block and parallelism controller
    // But they do not have any actual usage, only become one type of numbers you can use in your code
    .allowMultithreading()
    .allowParallelism()
    .maxParallelAmount(2147483647)
    // Use tickBehavior will make the machine become a pure tick machine
    .tickBehavior(behavior => behavior
        .serverTick(ctx => {
            // ... 见下文
        })
    )

machine.register()
```

The key is [`.tickBehavior(behavior => behavior.serverTick(ctx => { ... }))`](../API/KubeJS#tickbehavior-consumer-machinebehaviorbuilderjs-builder-→-machinebuilderjs). It switches the machine behavior from the default `RecipeBehavior.defaults()` to `TickBehavior`. **The machine now has no recipes**, `MachineBehavior.kind() == TICK`, and all runtime behavior is defined by the script.

## Structure in Detail

[`structure/advance/A_Pure_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Pure_Tick_Machine.js)：

```javascript
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_pure_tick_machine")

    // superise! it's the same to recipe ticker...yeah I do not have any structure avalaible...
    structure
        .pattern("XXX", "AAA", "XXX")
        .pattern("XXX", "A A", "X X")
        .pattern("XXX", "ACA", "XXX")
        .set('X', api.block('minecraft:green_terracotta'))
        .set('A', api.anyOf(
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfEnergyInput(),
            api.parallelControllers(),
            api.factoryController(),
            api.block('minecraft:green_wool')
        ))
        .controller('C')
        .build()
})
```

Symbol meanings:

- `'X'` → [`api.block('minecraft:green_terracotta')`](../API/KubeJS#block-string-blockid-→-blockpredicate): casing, green terracotta.
- `'A'` → [`api.anyOf(...)`](../API/KubeJS#anyof-blockpredicate-children-→-blockpredicate) wraps 6 block categories: item input/output, energy input, parallel controllers, factory controllers, and decoration.
- `'C'` → controller.

## The `serverTick` Callback in Detail

All behavior of the entire machine is encapsulated in the `serverTick` callback.

### 1. Throttling: `isDue(40)`

```javascript
if (!ctx.isDue(40)) return
```

`ctx.isDue(40)` checks `Math.floorMod(gameTime(), 40) == 0`, aligned to world time rather than counting 40 ticks from machine formation; the period must be greater than 0.

### 2. FE Validation and commit

```javascript
let plan_fe = ctx.ioPlan()

// need 10 FE to start this tick
plan_fe.addInput(api.energyRequirement(api.recipeIO().INPUT, 10))

const feSimulation = plan_fe.simulate()

if (!feSimulation.energySatisfied()) {
    // if fe not enough
    ctx.screenText().replace(
        api.id("mmcr_kubejs:fe_status"),
        Text.literal("FE is needed!")
    )
    // direct return
    return
}

// consume 10 FE
if (!plan_fe.commit().successful()) {
    ctx.screenText().replace(
        api.id("mmcr_kubejs:fe_status"),
        Text.literal("FE consume error!")
    )
    return
}
```

`ctx.ioPlan()` returns a brand-new [`MachineIoPlan`](../API/KubeJS#machineioplan):

- `simulate()` returns `MachineIoPlan.Simulation` and caches this plan. Since there is only energy input here, `energySatisfied()` can check whether the 10 FE input is satisfied; mixed plans should also check `inputsSatisfied()`, output simulation, and `failure()`.
- `commit()` executes the cached plan and returns `CommitResult`. It does not automatically call `simulate()`: if not simulated, planning failed, or the plan has been consumed, it returns `successful() == false`.
- Simulation neither commits resource changes nor reserves resources. Successful planning does not mean a successful actual commit; the commit result must still be checked.

[`api.energyRequirement(api.recipeIO().INPUT, 10)`](../API/KubeJS#energyrequirement-recipemodifier-iotype-io-long-fepertick-→-machinerequirement) constructs a "10 FE input" requirement.

Screen text uses `ctx.screenText().replace(lineId, text)` to replace content with the same ID. This is a method of the underlying [`ControllerScreenText`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/controller/ControllerScreenText.java); only `text` in the startup text registration callback is `ControllerScreenTextEventJS`.

:::warning Note
`ioPlan()` returns a **new** `MachineIoPlan` each time, with no shared state between calls. The following step must call `ctx.ioPlan()` again to add items.
:::

### 3. Search for Players in an Area → Summon Lightning

```javascript
// if fe is enough
ctx.screenText().replace(
    api.id("mmcr_kubejs:fe_status"),
    Text.literal("Machine do a run!")
    // 运行期替换会受后续注册文本刷新与同步影响，不是持久化状态
)

// some tricks...summon lighting bolt?
const level = ctx.level()
const pos = ctx.controllerPos()
const area = AABB.of(
    pos.getX() - 1,
    level.getMinY(),
    pos.getZ() - 1,
    pos.getX() + 2,
    level.getMaxY() + 1,
    pos.getZ() + 2
)
const players = level.getEntitiesOfClass(Player, area)
players.forEach(player => {
    level.spawnLightning(
        player.getX(),
        player.getY(),
        player.getZ(),
        false
    )
})
```

This step demonstrates that `TickBehavior` can call world and entity logic. Lightning is generated after the FE commit succeeds and before the item plan; subsequent item IO failure neither refunds consumed FE nor undoes the lightning. Separate plans and world operations do not form an atomic transaction.

`ctx.level()` gets the server-side world, and `ctx.controllerPos()` gets the controller block position. Use KubeJS's `AABB.of(minX, minY, minZ, maxX, maxY, maxZ)` to construct a 3×full-height×3 AABB area; `level.getEntitiesOfClass(Player, area)` gets player instances within it, and `level.spawnLightning(x, y, z, isCosmetic)` summons a lightning bolt.

### 4. Item Input and Output: A Second Use of `MachineIoPlan`

> See the [`MachineIoPlan`](../API/KubeJS#machineioplan) entry for details about `MachineIoPlan`; the following section focuses on chained usage of `addInput` / `addOutput` / `add` / `simulate()` / `outputs()` / `commit()`.

```javascript
// Do some io if you like
const plan = ctx.ioPlan()

plan.add(
    api.itemInputRequirement(
        "minecraft:iron_ingot",
        1
    )
)

plan.add(
    api.itemOutputRequirement(
        "minecraft:gold_nugget",
        1,
        1.0
    )
)

// if you want to process some special recipe
// make a simulate before the actual process start
const simulation = plan.simulate()

if (!simulation.inputsSatisfied()) return
let outputAvailable = true

simulation.outputs().forEach(output => {
    if (output.accepted() < output.requested()) {
        outputAvailable = false
    }
})

if (!outputAvailable) return

// 官方脚本省略了提交结果检查；这里先确认成功，再显示状态
if (!plan.commit().successful()) return

ctx.screenText().replace(
    api.id("mmcr_kubejs:pure_tick_status"),
    Text.literal("Iron Ingot inputed")
    // 后续文本刷新可能覆盖这一提示
)
```

Call `ctx.ioPlan()` a **second time**, adding 1 iron ingot input + 1 gold nugget output:

- `api.itemInputRequirement(itemId, count)` constructs an "item input" requirement.
- `api.itemOutputRequirement(itemId, count, chance)` constructs an item output requirement; `chance = 1.0` means output is always attempted.
- Note the distinction between `plan.add(...)` and `plan.addInput(...)` / `plan.addOutput(...)`: `add(...)` automatically routes to `addInput` or `addOutput` based on `requirement.io()`, making it more general.

After simulation, validate inputs with `simulation.inputsSatisfied()`, then iterate over `simulation.outputs()` to check `accepted() >= requested()` for each output, requiring that **all outputs fit**; otherwise, `return`.

Finally, `plan.commit()` attempts to consume inputs and produce outputs. The official example omits the result check and displays a success message before committing; this article's snippet instead checks `plan.commit().successful()` before updating the success text. The default output policy is `REQUIRE_FULL`; the simulation check is only a planning check before commit.

## Static Controller Screen Text

```javascript
// register a static text line
// NOTICE:
// use static lines and ctx.screenText().replace() always depend on the actual situation
// 服务端应用注册文本后再刷新 replace 请求；不是客户端直接执行脚本
// If you want to make some differences, please use data storage and networks
// Which will showed in 数据存储测试机器
event.registerControllerScreenText(
    "mmcr_kubejs:kubejs_pure_tick_machine",
    text => {
        text.append(
            "controller",
            "mmcr_kubejs:fe_status",
            Text.literal("FE is needed!")
        )

        text.append(
            "controller",
            "mmcr_kubejs:pure_tick_status",
            Text.literal("No Ingot input")
        )
    }
)
```

[`event.registerControllerScreenText(machineId, handler)`](../API/KubeJS#registercontrollerscreentext-string-machineid-consumer-controllerscreentexteventjs-handler-→-void) registers screen text initialization logic. `text` in the callback is a [`ControllerScreenTextEventJS`](../API/KubeJS#controllerscreentexteventjs) instance; calling [`text.append(scope, lineId, component)`](../API/KubeJS#append-string-scope-string-lineid-component-text-→-void) adds two static messages:

- `fe_status` → `"FE is needed!"`.
- `pure_tick_status` → `"No Ingot input"`.

## Special Mechanisms

### Hook Differences Between `TickBehavior` and `RecipeBehavior`

The callbacks available in [`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) are **completely different** for the two machine behaviors:

> `MachineBuilderJS` places [`preServerTick`](../API/KubeJS#preservertick-consumer-machinebehaviorcontext-callback-→-machinebuilderjs) and [`postServerTick`](../API/KubeJS#postservertick-consumer-machinebehaviorcontext-callback-→-machinebuilderjs) separately on `MachineBuilderJS`, rather than `MachineBehaviorBuilderJS`. They are "machine-level global tick hooks" for recipe machines and can only be used with `recipeBehavior`. The equivalent for `tickBehavior` is `serverTick`.

Available hooks (see [`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) and [`MachineBuilderJS`](../API/KubeJS#machinebuilderjs) for details):

| Hook | Location | Applicable Machine | Trigger Timing |
| --- | --- | --- | --- |
| [`idleStart`](../API/KubeJS#idlestart-consumer-machinebehaviorcontext-callback-→-machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `recipeBehavior` | Entering the idle state |
| [`idleEnd`](../API/KubeJS#idleend-consumer-machinebehaviorcontext-callback-→-machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `recipeBehavior` | Leaving the idle state |
| [`beforeStart`](../API/KubeJS#beforestart-consumer-recipestartcontext-callback-→-machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `recipeBehavior` | Before recipe start; requirements / outputs can be changed |
| [`recipeTick`](../API/KubeJS#recipetick-consumer-recipetickcontext-callback-→-machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `recipeBehavior` | Every tick during recipe execution |
| [`beforeFinish`](../API/KubeJS#beforefinish-consumer-recipefinishcontext-callback-→-machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `recipeBehavior` | Before recipe outputs are committed |
| [`serverTick`](../API/KubeJS#servertick-consumer-tickbehaviorcontext-callback-→-machinebehaviorbuilderjs) | `MachineBehaviorBuilderJS` | `tickBehavior` | Once per server tick (no recipes) |
| [`preServerTick`](../API/KubeJS#preservertick-consumer-machinebehaviorcontext-callback-→-machinebuilderjs) | `MachineBuilderJS` | `recipeBehavior` | Before each server tick of a recipe machine |
| [`postServerTick`](../API/KubeJS#postservertick-consumer-machinebehaviorcontext-callback-→-machinebuilderjs) | `MachineBuilderJS` | `recipeBehavior` | After each server tick of a recipe machine |

> Important rule: calling `preServerTick` / `postServerTick` after `tickBehavior(...)` throws `IllegalStateException`. Likewise, calling `serverTick` after `recipeBehavior(...)` throws `IllegalStateException`. The two paths are mutually exclusive.

This machine only uses [`serverTick`](../API/KubeJS#servertick-consumer-tickbehaviorcontext-callback-→-machinebehaviorbuilderjs); [`idleStart`](../API/KubeJS#idlestart-consumer-machinebehaviorcontext-callback-→-machinebehaviorbuilderjs) / [`idleEnd`](../API/KubeJS#idleend-consumer-machinebehaviorcontext-callback-→-machinebehaviorbuilderjs) / [`preServerTick`](../API/KubeJS#preservertick-consumer-machinebehaviorcontext-callback-→-machinebuilderjs) / [`postServerTick`](../API/KubeJS#postservertick-consumer-machinebehaviorcontext-callback-→-machinebuilderjs) are unavailable (attempting to call them throws `IllegalStateException`), because `MachineBehavior.kind() == TICK`.

### The Single-Use Rule for `MachineIoPlan`

The example uses `MachineIoPlan` twice: once for FE input, and once for item input and output. Each group creates its own new plan. Any `commit()` attempt consumes that plan, including failed commits; subsequent `commit()` calls return failure, while further `add` or `simulate` calls throw `IllegalStateException`. Retrying after failure requires a new plan and a new simulation.

See [`MachineIoPlan`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/MachineIoPlan.java) and [`CraftingPlan`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/capability/plan/CraftingPlan.java) for the underlying implementation: commits use a NeoForge root transaction, and rollback only covers journal state participating in that transaction; ordinary data writes, screen changes, and world operations are not automatically rolled back.

The two uses are written as follows:

```javascript
let plan_fe = ctx.ioPlan()
// ...
plan_fe.addInput(api.energyRequirement(...))
plan_fe.simulate()
plan_fe.commit()

// 这里要重新 ctx.ioPlan()：
const plan = ctx.ioPlan()
plan.add(api.itemInputRequirement(...))
plan.add(api.itemOutputRequirement(...))
plan.simulate()
plan.commit()
```

### Screen Text: `replace(...)` vs `append(...)`

Startup [`ControllerScreenTextEventJS`](../API/KubeJS#controllerscreentexteventjs) uses string scopes / IDs; runtime `ControllerScreenText` uses `ControllerScreenTextScope` / `Identifier`. This machine writes the initial two lines with `append(...)` during registration (`controller` scope), then constructs IDs through `api.id(...)` in `serverTick` and calls the underlying `replace(lineId, text)`.

Key differences (detailed in [`KubeJS.md`](../API/KubeJS#controllerscreentexteventjs)):

| Method | Requires scope | Behavior |
| --- | --- | --- |
| `append(scope, lineId, text)` | Yes | Replaces the same `lineId` within the same scope, without affecting other scopes |
| `replace(lineId, text)` | No | Caches a replacement request; on refresh, replaces one matching line, preferring `CONTROLLER` over `OPERATION` |

More precisely, `replace` first caches a replacement request. On refresh, it searches for a line with the same ID in `CONTROLLER` first, then `OPERATION`, replacing only the line it finds; if none exists, it ignores the request rather than creating a line or replacing same-named lines across all scopes. `appendAfter` only searches for an anchor within the same scope and does not append if the anchor is missing. See [ControllerScreenTextState](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/runtime/ControllerScreenTextState.java) for the source.

`replace(...)` is more suitable because rewriting the two `lineId` values `fe_status` and `pure_tick_status` does not require considering whether they belong to `controller` or `operation`.

### Effects of `allowMultithreading()` / `allowParallelism()` on Pure Tick Machines

`serverTick` does not automatically repeat according to parallelism or the factory thread count. The pure tick context still provides data such as `parallelism()`, `factoryThreadCount()`, and `smartInterfaceValue(name)`, allowing scripts to scale request amounts or define execution timing themselves; `ioPlan()` itself plans with parallelism 1. Choose `recipeBehavior` only when a recipe lifecycle is needed.

## PURE_TICK and RECIPE_TICK

| Scenario | Recommendation | Reason |
| --- | --- | --- |
| Generators, reactors, production lines (continuous passive effects) | `tickBehavior` | No clear "input → output" mapping; only per-tick advancement is needed |
| Searching for entities in an area, applying effects, calling other game mechanics | `tickBehavior` | These side effects cannot be expressed as recipes and must be called directly during ticks |
| Modifying requirements / outputs (adding or removing conditions, adjusting by player distance) | `recipeBehavior.beforeStart` / `beforeFinish` | These two hooks provide `setRequirements(...)` / `setOutputs(...)` |
| Recipes exist, but the specific actions each tick are fully customized | `recipeBehavior.recipeTick` | The recipe lifecycle is already managed, and current tick / total ticks are available |
| Custom timing for complex crafting (multiple stages, shared requirement modifications across recipes) | `recipeBehavior` | Recipe data is still needed to define "what to do," but each stage needs custom callbacks |

This machine covers **throttling, energy validation, side effects (lightning), and item IO** together.

## Further Reading

- [Data Storage Test Machine](./data-store-test-machine) — Also uses `tickBehavior`, but with `DataStorage`.
- [Compute-Network Interaction Example](./compute-network-example) — Also uses `tickBehavior`, but with network communication.
- [Recipe Tick Example](./recipe-tick-example) — The comparison example, demonstrating the 5 hooks of `recipeBehavior`.
- [Pure Tick Test Machine](../JavaAPI/pure-tick-test-machine) — Java implementation of this machine.
- [Recipe Tick Test Machine](../JavaAPI/recipe-tick-test-machine) — Complete Java demonstration of `recipeBehavior`.
- [KubeJS API](../API/KubeJS) — Central reference for the APIs cited in this tutorial.
- [KubeJS API#tickBehavior](../API/KubeJS#tickbehavior-consumer-machinebehaviorbuilderjs-builder-→-machinebuilderjs) — Direct tick mode entry point.
- [KubeJS API#serverTick](../API/KubeJS#servertick-consumer-tickbehaviorcontext-callback-→-machinebehaviorbuilderjs) — Callback invoked once per tick.
- [KubeJS API#MachineIoPlan](../API/KubeJS#machineioplan) — Entry point for the IO plan returned by `ctx.ioPlan()`.
- [KubeJS API#MachineBehaviorBuilderJS](../API/KubeJS#machinebehaviorbuilderjs) — Behavior builder hook list.
