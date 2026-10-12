---
title: Purpur Furnace
order: 9
---

# Purpur Furnace — Smart Interface System

This article demonstrates MMCR's **Smart Interface system**: bind certain machine parameters (duration, energy consumption, parallelism limit, etc.) to an "externally adjustable interface value", which players dynamically set through specific block positions in the structure.

## Machine Overview

The `Purpur Furnace` consists of three files:

- `example/startup_scripts/A_Smart_Machine.js`  
- `example/server_scripts/structure/A_Smart_Machine.js`  
- `example/server_scripts/recipe/A_Smart_Machine.js`  

Differences between Smart Interface, Modifier, and Level:

| System | Adjustment Method | Adjusted By | Adjustment Granularity |
| --- | --- | --- | --- |
| Modifier | Blocks | Players (manually) | Stacked during recipe execution |
| Level | Coil blocks | Players (constrained by level slots) | Stacked during recipe execution |
| Smart Interface | Set interface values | Players / automation / network messages | Recipe selection + runtime |

Smart Interface affects both "whether a recipe is selected" (filtered by `min_value`/`max_value`) and "how a recipe is modified at runtime" (through mapping functions such as `durationByInterface(...)`).

## Files Involved

| File | Phase | Role |
| --- | --- | --- |
| `example/startup_scripts/A_Smart_Machine.js` | `MMCREvents.startup` | Register the machine + define smart interfaces + bind interface values to machine parameters |
| `example/server_scripts/structure/A_Smart_Machine.js` | `MMCREvents.server` | Identify smart interface blocks through structure symbols |
| `example/server_scripts/recipe/A_Smart_Machine.js` | `ServerEvents.recipes` | Three data-driven recipes selected by interface value ranges |

## API Reference Links

| KubeJS API | Documentation Location |
| --- | --- |
| `smartInterface(String, float)` / `(String, float, float)`, `shareSmartInterface()` / `(boolean)`, and the 5 / 6-parameter versions of `energyByInterface` / `durationByInterface` | [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) |
| `SmartInterfaceTypeBuilderJS` | [API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs) |
| `smartInterface()`, `smartInterfaceInput(String, float, float)`, `smartInterfaceOutput(String, float)` | [API/KubeJS#kubejsapi](../API/KubeJS#kubejsapi) |
| `MachineRecipeBuilderJS.smartInterfaceInput(String, float)` / `(String, float, float)`, `smartInterfaceOutput(String, float)` | [API/KubeJS#machinerecipebuilderjs](../API/KubeJS#machinerecipebuilderjs) |
| `MachineRecipeSchema` field `type: 'mmcr:smart_interface'` | [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) |

## Machine Definition

[A_Smart_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/A_Smart_Machine.js) in the `startup_scripts/` directory:

```js
// Use the smart interface system to control machine parameters.

MMCREvents.startup(event => {

    const builder = event
        .createMachine("mmcr_kubejs:kubejs_purpur_furnace")
        .displayNameKey("machine.mmcr_kubejs.kubejs_purpur_furnace")
        .recipePool("mmcr_kubejs:kubejs_purpur_furnace")
        .allowParallelism()
        .maxParallelAmount(32)
        .appearance('minecraft:end_stone_bricks')
        .runningSound('minecraft:block.furnace.fire_crackle')
        .finishSound('minecraft:entity.ender_dragon.growl')
        // Register a smart interface.
        .smartInterface('kubejs_mode', 1, 3).priority(1).valueType('integer').end()
        .smartInterface('kubejs_conversation', 0, 1).priority(0).valueType('float').end()
        // After end(), machine parameters can be modified according to the interface value.
        .energyByInterface('kubejs_mode', 1, 2, 1.0, 2.0)
        .energyByInterface('kubejs_mode', 2, 3, 2.0, 4.0)
        .durationByInterface('kubejs_conversation', 0, 0.5, 1.0, 1.5)
        .durationByInterface('kubejs_conversation', 0.5, 1, 1.5, 2.5)

    builder.register()
})
```

### `.smartInterface(type, min, max)` Registers a Smart Interface

```js
.smartInterface('kubejs_mode', 1, 3)
```

The entry point for chained calls returns [`SmartInterfaceTypeBuilderJS`](../API/KubeJS#smartinterfacetypebuilderjs), a temporary internal builder; you must use `.end()` to return to the parent `MachineBuilderJS`.

Parameters:

| Parameter | Meaning |
| --- | --- |
| `type` | Interface type name. Unique throughout the machine definition. Duplicate names throw an exception during `register()`. |
| `min` / `max` | Legal range of interface values. Integer types also require the extrema and default value to be integers. |

The `smartInterface(type, default)` overload specifies only one value (as both the default and minimum), with a maximum of `Float.MAX_VALUE`.

### Chained Calls on `SmartInterfaceTypeBuilderJS`

```js
.smartInterface('kubejs_mode', 1, 3).priority(1).valueType('integer').end()
```

Three methods on the temporary builder ([API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs)):

| Method | Default | Purpose |
| --- | --- | --- |
| `.priority(int)` | `0` | Sorting priority of the interface type, not a rule for choosing a "winner" among interface blocks of the same type. |
| `.valueType(String)` | `'float'` | Interface value type. Accepts `'float'` / `'int'` / `'integer'` (case-insensitive). `null` or blank falls back to `FLOAT`. |
| `.end()` | — | Close the current interface definition and return to the parent `MachineBuilderJS`. **Must be called**. |

The order is arbitrary; for repeated calls, the last call takes precedence.

In this tutorial, `kubejs_mode` has priority = 1 and type integer, while `kubejs_conversation` has priority = 0 and type float. Both types can be stored on the same interface block simultaneously, with their mappings taking effect separately.

### Chaining Two Smart Interfaces

```js
.smartInterface('kubejs_mode', 1, 3).priority(1).valueType('integer').end()
.smartInterface('kubejs_conversation', 0, 1).priority(0).valueType('float').end()
```

Each `.smartInterface(...)` must end with `.end()`. The next `.smartInterface(...)` opens a new definition.

The two interface definitions can coexist.

### `.energyByInterface(type, min, max, atMin, atMax)` Maps Interface Values to Energy Consumption

```js
.energyByInterface('kubejs_mode', 1, 2, 1.0, 2.0)
.energyByInterface('kubejs_mode', 2, 3, 2.0, 4.0)
```

Five parameters: `type` (the registered smart interface type name), `min` / `max` (range endpoints), and `atMin` / `atMax` (modifier values corresponding to the range endpoints).

The first mapping linearly maps `[1, 2]` to `[1.0, 2.0]`, and the second maps `[2, 3]` to `[2.0, 4.0]`.

Values outside the range are explicitly clamped to the nearest endpoint. **Both mappings are applied every time, rather than selected mutually exclusively by range**: with one interface block, mode = 1 / 2 / 3 produces total energy multipliers of `1×2=2`, `2×2=4`, and `2×4=8`, respectively. These are the actual results of the official script at this commit, not merely 1 / 2 / 4 times.

The default operation is `MULTIPLY`; the sixth parameter is a `RecipeModifier.Operation`, passed through `api.modifierOperation().ADD` / `.MULTIPLY` / `.SUBTRACT` / `.DIVIDE`, rather than an arbitrary string. Here, `api` can come from `MMCR.getAPI()` or the event's `getAPI()`.

See [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) for details.

### `.durationByInterface(type, ...)` Maps Interface Values to Duration

```js
.durationByInterface('kubejs_conversation', 0, 0.5, 1.0, 1.5)
.durationByInterface('kubejs_conversation', 0.5, 1, 1.5, 2.5)
```

It has the same form as `energyByInterface`, but applies to duration.

The two duration mappings are likewise applied individually and multiplied: conversation = 0 / 0.5 / 1 produces total duration multipliers of `1×1.5=1.5`, `1.5×1.5=2.25`, and `1.5×2.5=3.75`. If the machine has multiple smart interface blocks, the controller iterates over each block and then each mapping; you cannot assume it takes only one value with the highest priority.

Do not assume an `XxxByInterface` method is usable based on its name alone. For example, although this commit declares helpers for item / fluid input amounts and chances, constructing a mapping invokes `ModifierTarget` validation, and `item/input` and `fluid/input` are not valid targets. Here, only `duration/input` and `energy/input`, verified to be constructible, are used; other targets require individual verification and cannot be generalized as "all usable with the same form".

See [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) for details.

### `.shareSmartInterface()`

```js
.shareSmartInterface()
```

Allow the same smart interface block to bind to multiple controllers of the same machine, so these controllers read the same interface values.

By default, a smart interface block can bind to only one controller. Once enabled, another controller using the same machine ID can also bind to this block. The interface block stores one set of values internally, and notifies all bound controllers when they change.

What is shared here is the **binding relationship between the smart interface block and controllers, along with the interface values**, not multithreaded instances or structure templates. In other words, multiple multiblock structures of the same machine can jointly use a smart interface block in an overlapping area, but each controller still performs structure matching and recipe processing independently.

The example does not enable this.

### Sounds and Multithreading

The four sound and parallelism configuration lines each define a type of machine behavior:

- `.runningSound('minecraft:block.furnace.fire_crackle')`
    Register the sound ID played in a loop while the machine runs. The format is a normal Minecraft sound ID (`namespace:path`), and is not restricted to vanilla MC sounds.
- `.finishSound('minecraft:entity.ender_dragon.growl')`
    Register the sound ID played once when each recipe completes. The ID format is the same as `runningSound`; it is emitted only at runtime and does not affect structure formation or recipe validation.
- `.allowParallelism()` enables parallel controllers, allowing players to install parallel controller blocks on the same multiblock to increase output per unit time.
    Disabled by default; when not enabled, placing a parallel controller in the structure will not make it take effect.
- `.maxParallelAmount(32)` sets the parallelism limit to `32`. The limit only determines how high parallel controllers can stack the parallel amount, and does not increase CPU scheduling costs.

Parallel controllers and factory schedulers are two different things. Multithreading (`.allowMultithreading()`) allows a factory to schedule multiple recipe instances, and does not mean allocating Java Worker threads; parallelism allows one recipe instance to use a multiplier. This example enables only parallelism, not factory scheduling of multiple recipes.

Machine definitions cannot be hot-reloaded, so changing parameters such as `runningSound` / `maxParallelAmount` requires a game restart.

See [API/KubeJS#mmcrstartupeventjs](../API/KubeJS#mmcrstartupeventjs) for details.

## Structure

[A_Smart_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_Smart_Machine.js) in the `server_scripts/structure/` directory. The following completes all symbols and adds `stateSensitive()` so that stair states actually participate in matching; the official script does not call it, and by default state predicates match only by block:

```js
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_purpur_furnace")

    structure
        .stateSensitive()
        .pattern(" ABBBD ", "       ", "       ", "       ", "  EEE  ", "       ", "       ", "       ")
        .pattern("AFXXXGD", "  HHH  ", "  III  ", "  JJJ  ", " EHHHE ", " KLLLM ", "       ", "       ")
        .pattern("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PXXXQ ", "  EHE  ", "   R   ")
        .pattern("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PX XQ ", "  H H  ", "  R R  ")
        .pattern("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PXXXQ ", "  EHE  ", "   R   ")
        .pattern("STXXXUV", "  HCH  ", "  III  ", "  JJJ  ", " EHHHE ", " WYYYZ ", "       ", "       ")
        .pattern(" abbbV ", "       ", "       ", "       ", "  EEE  ", "       ", "       ", "       ")
        .set('X', api.block('minecraft:end_stone_bricks'))
        .set('A', api.state('minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('B', api.state('minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]'))
        .set('D', api.state('minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('E', api.block('minecraft:end_stone_brick_slab'))
        .set('F', api.state('minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=inner_right,waterlogged=false]'))
        .set('G', api.state('minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=inner_right,waterlogged=false]'))
        .set('H', api.anyOf(
            api.block('minecraft:purpur_pillar'),
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfEnergyInput(),
            api.parallelControllers(),
            api.smartInterface()                              // ← 智能接口方块位
        ))
        .set('I', api.block('minecraft:purple_terracotta'))
        .set('J', api.block('minecraft:purpur_block'))
        .set('K', api.state('minecraft:purpur_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('L', api.state('minecraft:purpur_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]'))
        .set('M', api.state('minecraft:purpur_stairs[facing=west,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('N', api.state('minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]'))
        .set('O', api.state('minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]'))
        .set('P', api.state('minecraft:purpur_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]'))
        .set('Q', api.state('minecraft:purpur_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]'))
        .set('R', api.block('minecraft:purpur_slab'))
        .set('S', api.state('minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=outer_right,waterlogged=false]'))
        .set('T', api.state('minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=inner_right,waterlogged=false]'))
        .set('U', api.state('minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=inner_left,waterlogged=false]'))
        .set('V', api.state('minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=outer_right,waterlogged=false]'))
        .set('W', api.state('minecraft:purpur_stairs[facing=east,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('Y', api.state('minecraft:purpur_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]'))
        .set('Z', api.state('minecraft:purpur_stairs[facing=north,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('a', api.state('minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('b', api.state('minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]'))
        .controller('C')
        .build()
})
```

### `api.smartInterface()`

```js
.set('H', api.anyOf(
    api.block('minecraft:purpur_pillar'),
    api.anyOfItemInput(),
    api.anyOfItemOutput(),
    api.anyOfEnergyInput(),
    api.parallelControllers(),
    api.smartInterface()
))
```

[`api.smartInterface()`](../API/KubeJS#kubejsapi) returns a [`BlockPredicate`](../API/KubeJS#kubejsapi) specifically representing a "smart interface block".

The smart interface block is a built-in MMCR block; after placing it in the world, players set interface values by right-clicking or programmatically.

Each smart interface block can store all interface types declared by the machine and their respective values. In this example, it can store both `kubejs_mode` and `kubejs_conversation` simultaneously, without placing a separate block for each type.

### Ports and Decoration

`H` slots allow item input / output, energy input, parallel controllers, smart interfaces, or purpur pillars, but do not include fluid ports.

`X` is the appearance block (end_stone_bricks); the other symbols are decorative blocks, down to stairs with each specific facing (using [`api.state(...)`](../API/KubeJS#kubejsapi) to match block states precisely).

`C` is the controller.

## Recipes

[A_Smart_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_Smart_Machine.js) in the `server_scripts/recipe/` directory:

```js
ServerEvents.recipes(event => {
    // 配方 1：kubejs_mode ∈ [1, 1]
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_purpur_furnace',
        tick_time: 100,
        parallelized: true,
        requirements: [
            { type: 'minecraft:item', io: 'input',  item: 'minecraft:stick', count: 4 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:iron_ingot', count: 10 } },
            { type: 'neoforge:energy', io: 'input',  fe_per_tick: 10 },
            {
                type: 'mmcr:smart_interface',
                io: 'input',
                interface_type: 'kubejs_mode',
                min_value: 1,
                max_value: 1
            }
        ]
    })

    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_purpur_furnace',
        tick_time: 100,
        parallelized: true,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:stick', count: 4 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:diamond', count: 10 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 1 },
            { type: 'mmcr:smart_interface', io: 'input', interface_type: 'kubejs_mode', min_value: 2, max_value: 3 }
        ]
    })
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_purpur_furnace',
        tick_time: 100,
        parallelized: true,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:stick', count: 4 },
            { type: 'minecraft:item', io: 'output', stack: {
                id: 'minecraft:gold_ingot', count: 10,
                components: {
                    'minecraft:custom_name': { text: 'Too low Conversation!' },
                    'minecraft:enchantments': { 'minecraft:sharpness': 2 }
                }
            } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 10 },
            { type: 'mmcr:smart_interface', io: 'input', interface_type: 'kubejs_conversation', min_value: 0, max_value: 0.5 }
        ]
    })
})
```

Comparison of the three recipes:

| Recipe | Input | Output | `kubejs_mode` | `kubejs_conversation` |
| --- | --- | --- | --- | --- |
| Recipe 1 | 4 sticks | 10 iron ingots | Must == 1 | (Unrestricted) |
| Recipe 2 | 4 sticks | 10 diamonds | Must ∈ [2, 3] | (Unrestricted) |
| Recipe 3 | 4 sticks | 10 gold ingots (with a custom name + Sharpness II) | (Unrestricted) | Must ∈ [0, 0.5] |

### Entries of Type `mmcr:smart_interface` in Data-Driven Recipes

```js
{
    type: 'mmcr:smart_interface',
    io: 'input',
    interface_type: 'kubejs_mode',
    min_value: 1,
    max_value: 1
}
```

This is a "special type" entry in a data-driven recipe's [`requirements`](../API/KubeJS#machinerecipeschema) array, corresponding to MMCR's smart interface requirement. Fields:

| Field | Meaning |
| --- | --- |
| `type` | Must be `'mmcr:smart_interface'`. |
| `io` | `'input'` checks whether the current interface value is within `[min_value, max_value]`. `'output'` changes the interface value to a fixed value when the recipe finishes (see below). |
| `interface_type` | Smart interface type name; must match `smartInterface(...)` in the machine definition. |
| `min_value` / `max_value` | Range endpoints. `min_value == max_value` requires the interface value to equal this value exactly. |

`io: 'input'` is one of the conditions for a recipe to be **selected**. The recipe can be selected to run only when the current interface value falls within `[min_value, max_value]`.

`io: 'output'` writes back a fixed value when the recipe finishes. The JSON still requires `min_value` and `max_value`; set both equal for a fixed value. This corresponds to `MachineRecipeBuilderJS.smartInterfaceOutput(type, value)`.

The interface ranges restricted by each of the three recipes:

| Recipe | Output | `kubejs_mode` | `kubejs_conversation` |
| --- | --- | --- | --- |
| Recipe 1 | 10 iron ingots | Must == 1 | (Unrestricted) |
| Recipe 2 | 10 diamonds | Must ∈ [2, 3] | (Unrestricted) |
| Recipe 3 | 10 gold ingots | (Unrestricted) | Must ∈ [0, 0.5] |

Each recipe explicitly restricts only one interface's value range; the other interface may still affect actual recipe planning through energy / duration modifiers, so it cannot be said to have no effect on execution.

The programmatic counterparts of data-driven recipes are the three [`MachineRecipeBuilderJS`](../API/KubeJS#machinerecipebuilderjs) methods `smartInterfaceInput(type, value)` / `smartInterfaceInput(type, min, max)` / `smartInterfaceOutput(type, value)`.

[`KubeJSApi`](../API/KubeJS#kubejsapi) provides `smartInterfaceInput(type, min, max)` and `smartInterfaceOutput(type, value)`, which return requirement objects that can be passed to `MachineRecipeBuilderJS.requirements(List<MachineRequirement>)`. **The API helper object has no two-parameter input overload**; for an exact value, use `(type, value, value)`. RecipeSchema instead uses `smartInterfaceInput(type, value)`, `smartInterfaceInputRange(type, min, max)`, and `smartInterfaceOutput(type, value)`, with a different name for the range function.

All three recipes belong to the machine's declared `kubejs_purpur_furnace` recipe pool, with a base duration of 100 ticks and base energy consumption of 10 / 1 / 10 FE/tick, respectively. Leaving the other interface unrestricted does not make the recipes mutually exclusive: when mode = 1 and conversation = 0, both the first and third may satisfy the requirements; the final choice depends on recipe search and other input/output conditions.

Recipes support hot reloading.

## Special Mechanism: Smart Interface System

### The Complete `SmartInterfaceTypeBuilderJS` Call Chain

An overview of all methods in [API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs):

```js
machine
    .smartInterface(type, min, max)        // 入口（也可以 (type, default)）
        .priority(1)                       // 可选：类型排序优先级，默认 0
        .valueType('integer')              // 可选：float / int / integer，默认 float
        .end()                              // 必填：回到 MachineBuilderJS
```

Notes:

- `end()` must be called to add the interface definition to the parent builder. Omitting it leaves out that definition, but the builder has no "unclosed interface" check, so an exception at machine registration cannot be guaranteed.
- `priority` / `valueType` can appear in any order.
- Repeated `.smartInterface(type, ...)` calls on the same `MachineBuilderJS` with duplicate type names are rejected during machine registration.
- The range must use finite numbers; the `INTEGER` type also requires the extrema and default value to be integers.

### `shareSmartInterface` and Structure Binding

```js
.shareSmartInterface()
```

`MachineBuilderJS.shareSmartInterface()` enables "binding the same smart interface block to multiple controllers of the same machine".

It affects only the smart interface block's binding scope: by default, a smart interface block can serve only one controller. Once enabled, the same block can record multiple controller positions with the same machine ID simultaneously, and all controllers read the same interface values.

It does not merge structures, share structure-matching results, or change whether the machine allows multithreading.

See [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) for details.

### Comparison with Modifier and Level

| Aspect | Modifier (Alloy Furnace) | Level (Thermal Smelter) | Smart Interface (Purpur Furnace) |
| --- | --- | --- | --- |
| Adjustment source | Place blocks | Place blocks in level slots | Set interface values |
| Adjusted by | Players | Players | Players / automation / network messages |
| Affected phase | Stacked during recipe execution | Stacked during recipe execution | Recipe selection (value filtering) + runtime |
| Adjustment granularity | Apply structure modifiers after deduplicating identical names | Resolve a consistent level from slots of the same type | Each interface block stores values for multiple types; mappings are applied individually |
| Recipe restriction | None (shared by all recipes) | `mmcr:level` entries in `requirements` | Entries of type `mmcr:smart_interface` |

All three systems read signals from structures / slots / interface values, but Smart Interface affects both "whether a recipe is selected" and "recipe runtime parameters", making it the most programmatic option.


## Further Reading

- [MachineBuilderJS: temporary builders, mapping signatures, and submission with end](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBuilderJS.java)
- [SmartInterfaceModifier: range clamping and linear mapping](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/SmartInterfaceModifier.java)
- [Controller: collecting modifiers for each block and each mapping](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/tile/MachineControllerBlockEntity.java#L3076-L3101)
- [SmartInterfaceBlockEntity: multiple value types and shared bindings](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/tile/SmartInterfaceBlockEntity.java)
- [SmartInterfaceRequirement codec](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/requirement/SmartInterfaceRequirement.java) / [RecipeSchema function names](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeSchema.java)

- [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) — All `smartInterface(...)` / `shareSmartInterface()` / `XxxByInterface(...)` methods.
- [API/KubeJS#smartinterfacetypebuilderjs](../API/KubeJS#smartinterfacetypebuilderjs) — The temporary builder's `priority` / `valueType` / `end`.
- [API/KubeJS#smartinterface--blockpredicate](../API/KubeJS#kubejsapi) — The structure-layer smart interface block predicate.
- [API/KubeJS#smartinterfaceinputstring-type-float-min-float-max--smartinterfacerequirement](../API/KubeJS#kubejsapi) — Programmatic smart interface requirement objects.
- [API/KubeJS#machinerecipebuilderjs](../API/KubeJS#machinerecipebuilderjs) — Programmatic `smartInterfaceInput(...)` / `smartInterfaceOutput(...)`.
- [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) — Fields of data-driven `mmcr:smart_interface` entries.
- [JavaAPI/Purpur Furnace](../JavaAPI/purpur-furnace) — The Java implementation of the same Purpur Furnace.
