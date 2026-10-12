---
title: Space Elevator
order: 6
---

# Space Elevator - Host + Module

Inspired by GTL's space elevator.

This article demonstrates MMCR's **HOST + MODULE** mode: a small "module" machine is attached beside a large "host" machine, and the module's recipes run only when the host is present.

## Machine Overview

`A_Module_Machine` consists of three script files, defining one elevator and one reassembler:

- `example/startup_scripts/A_Module_Machine.js`
- `example/server_scripts/structure/A_Module_Machine.js`
- `example/server_scripts/recipe/A_Module_Machine.js`

The relationship between HOST and MODULE has three layers:

1. **Machine layer**: The host declares which modules it accepts through `.host(...)`. The module marks itself as eligible for acceptance by a host through `.module()`.
2. **Structure layer**: Both machines declare coupler positions with `api.coupler()` and share a coupler at the same world coordinates. Mere adjacency does not establish a connection; both structures must be formed, the host must accept the module, and interface positions must not overlap.
3. **Recipe layer**: The module must have a valid host connection to run; `required_host_ids` further restricts the connected host's machine ID.

Module recipes without `required_host_ids` still cannot run without a connection; omitting the list means only that "any validly connected host is acceptable". Normal machines and HOST machines do not require a module connection to run, so the list does not become an additional self-matching requirement for a normal host.

## Files Involved

| File | Phase | Role |
| --- | --- | --- |
| `example/startup_scripts/A_Module_Machine.js` | `MMCREvents.startup` | Register the HOST + MODULE machine definitions |
| `example/server_scripts/structure/A_Module_Machine.js` | `MMCREvents.server` | Elevator structure (with couplers) + reassembler structure (with a coupler) |
| `example/server_scripts/recipe/A_Module_Machine.js` | `ServerEvents.recipes` | Elevator recipes + reassembler recipes (with `required_host_ids`) |

## API Reference Links

| KubeJS API | Documentation Location |
| --- | --- |
| `MachineBuilderJS.host(String...)` / `module()` / `module(boolean)` / `role(String)` | [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) |
| `KubeJSApi.coupler()` | [API/KubeJS#kubejsapi](../API/KubeJS#kubejsapi) |
| `MachineStructureBuilderJS` | [API/KubeJS#machinestructurebuilderjs](../API/KubeJS#machinestructurebuilderjs) |
| `MachineRecipeSchema` data-driven recipe fields | [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) |
| `MachineRecipeBuilderJS.requiredHost(String)` / `requiredHosts(String...)`; RecipeSchema has a `requiredHost(String)` function | [API/KubeJS#machinerecipebuilderjs](../API/KubeJS#machinerecipebuilderjs) |
| `MMCR.getValues().INT_MAX` | Global numeric constant; see the high-energy-consumption recipe below |

## Machine Definitions

[A_Module_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/A_Module_Machine.js) in the `startup_scripts/` directory:

```js
// Register a host machine and a module machine.
// This example is based on GTL's space elevator.

MMCREvents.startup(event => {
    const space_elevator = event
        .createMachine("mmcr_kubejs:kubejs_space_elevator")
        .displayNameKey("machine.mmcr_kubejs.kubejs_space_elevator")
        .recipePool("mmcr_kubejs:kubejs_space_elevator")
        .appearance('minecraft:smooth_quartz')
        .controllerBaseTexture('minecraft:block/quartz_block_bottom') // Smooth quartz has no standard texture, so set the base texture manually.
        .formedPortBaseTexture('minecraft:block/quartz_block_bottom')
        .host("mmcr_kubejs:kubejs_space_reassembler")

    const space_reassembler = event
        .createMachine("mmcr_kubejs:kubejs_space_reassembler")
        .displayNameKey("machine.mmcr_kubejs.kubejs_space_reassembler")
        .recipePool(
            "mmcr_kubejs:kubejs_space_reassembler",
            "mmcr_kubejs:kubejs_space_miner",
            "mmcr_kubejs:kubejs_space_1",
            "mmcr_kubejs:kubejs_space_2",
            "mmcr_kubejs:kubejs_space_3"
        )
        .appearance('minecraft:quartz_pillar')
        .allowMultithreading()
        .module()


    space_elevator.register()
    space_reassembler.register()
})
```

This script registers two machines in the same `MMCREvents.startup` callback.

Scripts usually express roles with `.host(...)` and `.module()`, but can also use the available `.role('NORMAL'/'HOST'/'MODULE')` string entry point without loading a Java enum.

### HOST

```js
const space_elevator = event
    .createMachine("mmcr_kubejs:kubejs_space_elevator")
    .displayNameKey("machine.mmcr_kubejs.kubejs_space_elevator")
    .recipePool("mmcr_kubejs:kubejs_space_elevator")
    .appearance('minecraft:smooth_quartz')
    .controllerBaseTexture('minecraft:block/quartz_block_bottom')
    .formedPortBaseTexture('minecraft:block/quartz_block_bottom')
    .host("mmcr_kubejs:kubejs_space_reassembler")
```

- `.displayNameKey(...)`: Localization key.
- `.recipePool(...)`: Declare the ordered recipe pools the machine belongs to. A machine can join multiple recipe pools, while each recipe still selects only one pool.  
    See [API/KubeJS#recipePool](../API/KubeJS#recipepool-string-recipepoolids-%E2%86%92-machinebuilderjs) for details.
- `.appearance('minecraft:smooth_quartz')`: The controller's default appearance block.
- `.controllerBaseTexture(...)` / `.formedPortBaseTexture(...)`: smooth_quartz has no standard block texture, so the base texture must be specified manually.
- **`.host()`**: Declare that this elevator accepts `kubejs_space_reassembler` as a module machine.  
    The parameter is a variadic `String...`, allowing multiple modules to be declared at once.  
    See [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) for details.

### MODULE

```js
const space_reassembler = event
    .createMachine("mmcr_kubejs:kubejs_space_reassembler")
    .displayNameKey("machine.mmcr_kubejs.kubejs_space_reassembler")
    .recipePool(
        "mmcr_kubejs:kubejs_space_reassembler",
        "mmcr_kubejs:kubejs_space_miner",
        "mmcr_kubejs:kubejs_space_1",
        "mmcr_kubejs:kubejs_space_2",
        "mmcr_kubejs:kubejs_space_3"
    )
    .appearance('minecraft:quartz_pillar')
    .allowMultithreading()
    .module()
```

`.module()` is the no-argument version, equivalent to `.module(true)`.

`.module()` marks the machine as a module. Explicit roles and shortcut methods must not contradict each other: for example, `.role('NORMAL').module()` and `.role('HOST').module()` are rejected; an explicit HOST must also provide at least one accepted module ID through `host(...)`. A module does not automatically gain a host connection merely by calling `.module()`.

Besides setting the HOST role, `.host(...)` records accepted module IDs and cannot be replaced with `.role('HOST')` alone; `.module()` is a convenient entry point for marking a module.

:::info Note
There is no equivalent method named `.acceptedModule(...)` on the KubeJS side. Internally, `.host(...)` is an alias for `acceptedModule(...)`. See [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) for details.
:::

### Startup Definitions Cannot Be Hot-Reloaded

Machine definitions require a game restart to take effect.

## Structures

[A_Module_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_Module_Machine.js) in the `server_scripts/structure/` directory:

```js
MMCREvents.server(event => {
    const api = event.getAPI()

    const space_elevator = event.createStructure("mmcr_kubejs:kubejs_space_elevator")

    space_elevator
        .pattern(['        X        ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['       XXX       ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['      XXXXX      ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['     XXAAAXX     ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['    XXXAAAXXX    ','        B        ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['   XXXXAAAXXXX   ','                 ','                 ','                 ','                 ','        X        ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['  XXXXXXXXXXXXX  ','                 ','                 ','                 ','        X        ','       XXX       ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern([' XXAAAXXXXXAAAXX ','       XXX       ','       DDD       ','       XXX       ','       XXX       ','      XXXXX      ','       XXX       ','       X X       ','                 ','                 ','                 ','                 '])
        .pattern(['XXXAAAXXXXXAAAXXX','    B  X X  B    ','       D D       ','       X X       ','      XX XX      ','     XXX XXX     ','       XXX       ','        X        ','        X        ','        X        ','        X        ','        X        '])
        .pattern([' XXAAAXXXXXAAAXX ','       XXX       ','       DED       ','       XXX       ','       XXX       ','      XXXXX      ','       XXX       ','       X X       ','                 ','                 ','                 ','                 '])
        .pattern(['  XXXXXXXXXXXXX  ','                 ','                 ','                 ','        X        ','       XXX       ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['   XXXXXXXXXXX   ','                 ','                 ','                 ','                 ','        X        ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['    XXXXXXXXX    ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['     XXXXXXX     ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['      XXXXX      ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['       XXX       ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 '])
        .pattern(['        X        ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 ','                 '])
        .set('X' ,api.block('minecraft:smooth_quartz'))
        .set('A' ,api.block('minecraft:amethyst_block'))
        .set('B' ,api.coupler())                 // ← 电梯端的 coupler 槽位
        .set('D' ,api.anyOf(
            api.block('minecraft:smooth_quartz'),
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfEnergyInput()
        ))
        .controller('E')
        .build()

    const space_reassembler = event.createStructure("mmcr_kubejs:kubejs_space_reassembler")

    space_reassembler
        .pattern(['AAA','XBX','XBX','XDX'])
        .pattern(['AAA','BEB','B B','DDD'])
        .pattern(['AAA','XFX','XBX','XDX'])
        .set('X',api.block('minecraft:quartz_pillar'))
        .set('A',api.block('minecraft:amethyst_block'))
        .set('B',api.anyOf(
            api.block('minecraft:smooth_quartz'),
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfEnergyInput(),
            api.block('mmcr:factory_controller')
        ))
        .set('D', api.block('minecraft:glass'))
        .set('E',api.coupler())                  // ← 重组机端的 coupler 槽位
        .controller('F')
        .build()
})
```

### Couplers

The elevator structure contains three `B` symbols, with each `B` bound to `api.coupler()`:

```js
.set('B' ,api.coupler())
```

The reassembler structure contains one `E` symbol, also bound to `api.coupler()`:

```js
.set('E',api.coupler())
```

`api.coupler()` returns a [`BlockPredicate`](../API/KubeJS#coupler-→-blockpredicate) specifically representing a "machine coupler" block.

The two patterns first form independently, then connect through a **coupler at the same world coordinates**. Those coordinates require a unique connectable host and module; the host must accept the module ID, both patterns must still match, and port interfaces must not overlap. Sharing a coupler does not mean sharing item or energy interfaces.

The elevator can have multiple couplers (each `B` is a candidate position), while the reassembler has only one (`E`).

### Ports and Controllers

The elevator structure is similar to the Blast Furnace: `D` slots are a union of item input / output / energy input, making it convenient to attach ports in any direction around the tower.

## Recipes

[A_Module_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_Module_Machine.js) in the `server_scripts/recipe/` directory:

```js
ServerEvents.recipes(event => {
    // 重组机配方：带 required_host_ids
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_space_reassembler',
        tick_time: 100,
        parallelized: true,
        required_host_ids: [
            "mmcr_kubejs:kubejs_space_elevator"
        ],// ← 只有主机在场时才跑
        requirements: [
            {
                type: 'minecraft:item',
                io: 'input',
                item: 'minecraft:potion',
                components: {
                    'minecraft:potion_contents': {
                        potion: 'minecraft:water'
                    }
                },
                count: 1
            },
            {
                type: 'minecraft:item',
                io: 'output',
                stack: {
                    id: 'minecraft:potion',
                    count: 1,
                    components: {
                        'minecraft:potion_contents': {
                            potion: 'minecraft:healing'
                        }
                    }
                }
            },
            {
                type: 'neoforge:energy',
                io: 'input',
                fe_per_tick: 100
            }
        ]
    })

    // 电梯配方：普通配方，主机本身也能跑
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_space_elevator',
        tick_time: 1000,
        parallelized: true,
        required_host_ids: ['mmcr_kubejs:kubejs_space_elevator'],
        requirements: [
            { type: 'minecraft:item', io: 'input',  item: 'minecraft:apple', count: 1 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:golden_apple', count: 12 } },
            { type: 'neoforge:energy', io: 'input',  fe_per_tick: 100 }
        ]
    })

    // 重组机同时声明了 space_miner 池，因此也能检索以下两条配方。
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_space_miner',
        tick_time: 200,
        parallelized: true,
        required_host_ids: ['mmcr_kubejs:kubejs_space_elevator'],
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:apple', count: 1 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:iron_ingot', count: 12 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 100 }
        ]
    })
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_space_miner',
        tick_time: 100,
        required_host_ids: ['mmcr_kubejs:kubejs_space_elevator'],
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:iron_ingot', count: 1 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:gold_nugget', count: 10 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: MMCR.getValues().INT_MAX * 2 }
        ]
    })
})
```

### The `required_host_ids` Field in Data-Driven Recipes

```js
required_host_ids: [
    "mmcr_kubejs:kubejs_space_elevator"
]
```

This is a top-level field in data-driven recipes, corresponding to the `required_host_ids` key in [MachineRecipeSchema](../API/KubeJS#machinerecipeschema). It lists the current recipe's "host restrictions".

Module recipes check whether the **currently validly connected host ID** is in the list; they do not search the world for any formed host with the same ID. Without a connection, the recipe cannot run even if another formed elevator is nearby.

The field is an array of ID strings, defaulting to an empty collection; an empty collection does not restrict the host type for a connected module, but does not remove the module's connection requirement. Normal machines / HOST machines have a `ModuleConnectionStatus` of `notRequired`, so this field imposes no additional connection requirement on them; the official elevator recipe also lists its own ID, and this article retains that field.

> Equivalent to Java's `MachineRecipeBuilder.requiredHost(...)`. KubeJS data-driven recipes use the top-level field directly. The programmatic [`MachineRecipeBuilderJS`](../API/KubeJS#machinerecipebuilderjs) also provides `requiredHost(String)` / `requiredHosts(String...)` methods.

### Data Component Matching

```js
item: 'minecraft:potion',
components: {
    'minecraft:potion_contents': {
        potion: 'minecraft:water'
    }
}
```

Add `components` under the input item field, and MMCR will match data components precisely according to [ComponentConstraints](../API/JavaAPI#componentconstraints) rules.

You can also add `components` under the output item's `stack` as the output item's component values. This mechanism gives the KubeJS side full support for items with components, such as potions and enchanted books.

## Special Mechanism: HOST + MODULE

### What Is a Host, and What Is a Module?

- **host**: A "large machine" that declares which module machines it accepts through `.host(String...)`.  
    The host decides which modules can connect; its own formation and recipes do not require a module to exist.  
- **module**: A machine marked as a module through `.module()`.  
    Module structure matching and host connection are different states; forming independently does not mean it can run, since running requires a valid host connection.  

The HOST in this article accepts the reassembler through `.host("mmcr_kubejs:kubejs_space_reassembler")`. The reassembler declares itself a module through `.module()`. The IDs on both sides must match exactly: `host(...)` accepts the module's registered ID, which is specified by `createMachine(...)`.

### The Relationship Between `expandableStructure` and Couplers

The KubeJS side provides [`MachineBuilderJS.expandableStructure()`](../API/KubeJS#machinebuilderjs), which allows the structure to enter an "expanded form" when enabled.

The elevator and reassembler in this tutorial do not explicitly call `.expandableStructure()`, because they are **two independent multiblock structures** joined through `coupler()`, rather than the two "main structure + expanded structure" stages of a single machine.

If you want to express "an expanded structure of one machine", such as a refinery's distillation tower framework, consider `.expandableStructure()`.

If you want to express "two machines sharing world space", namely HOST/MODULE, use `.host(...)` + `.module()` + `api.coupler()`.

### Recipe `required_host_ids`

The reassembler already requires a host connection, and the recipe list further restricts the host type:

- Without `required_host_ids`: Any validly connected host that accepts the module can satisfy the connection requirement.
- With `required_host_ids`: The currently connected host must also be in the list; after the connection becomes invalid, the running requirement is no longer met. Recipe pausing / failure behavior is handled by the runtime and failure policy, and stopping "at the exact instant of dismantling" is not guaranteed.

The Space Elevator chooses the latter, meaning "this must take place on the elevator".

### Recipe Pools, Parallelism, and Large Energy Values

The reassembler defines five ordered pools; the recipes in this example actually use `kubejs_space_reassembler` and `kubejs_space_miner`, while `space_1/2/3` currently have no example recipes. Multiple pools expand the actual recipe search scope, rather than merely providing JEI categories. Each JSON still has only one `recipe_pool`.

The fourth recipe's `MMCR.getValues().INT_MAX * 2` equals `4294967294`; the energy codec uses `long` and does not truncate it to `int`. It still requires actual port transfer and power-supply capacity. The machine does not enable `allowParallelism()`, so although the first three JSON recipes specify `parallelized: true`, that alone does not enable machine parallelism. The reassembler's `allowMultithreading()`, combined with the structure's `factory_controller`, allows factory scheduling; the definition-side thread limit defaults to 1 and can be configured through `factoryThreads(int)`. JSON `max_threads` also defaults to 1 when omitted.

## Implementation References

- [MachineBuilderJS: host, module, role, and mutually exclusive role validation](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBuilderJS.java)
- [ModuleConnectionCoordinator: shared world coordinates, formation, and interface overlap checks](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/multiblock/ModuleConnectionCoordinator.java)
- [ModuleConnectionStatus.canRunRecipe: connection and host-list requirements](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/multiblock/ModuleConnectionStatus.java)
- [RecipeSchema: requiredHost function](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeSchema.java) / [JSON parser: required_host_ids](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/MachineRecipeJson.java)
- [MMCRValues: INT_MAX / LONG_MAX and other constants](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MMCRValues.java)


## Further Reading

- [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) — The complete machine definition builder.
- [API/KubeJS#machinestructurebuilderjs](../API/KubeJS#machinestructurebuilderjs) — The structure builder's `coupler` predicate and `modifier` calls.
- [API/KubeJS#machinerecipebuilderjs](../API/KubeJS#machinerecipebuilderjs) — The programmatic recipe builder's `requiredHost(...)` / `requiredHosts(...)`.
- [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) — All keys in the data-driven recipe schema.
- [JavaAPI/SPACE](../JavaAPI/space-elevator) — The Java implementation of the same elevator + reassembler pair.
- [JavaAPI#machinedraft](../API/JavaAPI#machinedraft) — The Java-side host/module API.
