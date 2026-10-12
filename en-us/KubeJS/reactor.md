---
title: Reactor
order: 2
---

# Reactor - A Machine with Block States

This article demonstrates a machine whose structure is precisely described using block states (Block State). The code corresponds to three files:

- `example/startup_scripts/A_BlockState_Machine.js`
- `example/server_scripts/structure/A_BlockState_Machine.js`
- `example/server_scripts/recipe/A_BlockState_Machine.js`

This is the **first** KubeJS example to introduce the `api.state(...)` predicate and a structure with precise block orientations.

## Overview

The key difference between the reactor and the [Blast Furnace](blast-furnace) is the **granularity of structure matching**:

- The blast furnace uses `api.block(...)` to describe its casing, so any state matches.
- The reactor uses `api.state(...)` to precisely specify **all property values** of a block, matching `facing`, `shape`, `waterlogged`, and other properties individually.

The reactor structure contains stained glass, emerald blocks, lapis blocks, stairs, and energy output ports. Most stairs use `api.state(...)`, while glass, casing, and other blocks whose properties need no restrictions still use `api.block(...)`. The two types of predicates can be mixed.

## Files Involved

| File | Phase | Registered Object |
| --- | --- | --- |
| `example/startup_scripts/A_BlockState_Machine.js` | `MMCREvents.startup` | Machine definition |
| `example/server_scripts/structure/A_BlockState_Machine.js` | `MMCREvents.server` | Multiblock structure (state-sensitive) |
| `example/server_scripts/recipe/A_BlockState_Machine.js` | `ServerEvents.recipes` | Data-driven recipes |

## API Navigation

- Startup phase:  
[MMCRStartupEventJS](../API/KubeJS#mmcrstartupeventjs)  
[MachineBuilderJS](../API/KubeJS#machinebuilderjs) 
- Structure phase:  
[MMCRServerEventJS](../API/KubeJS#mmcrservereventjs)  
[MachineStructureBuilderJS](../API/KubeJS#machinestructurebuilderjs)  
[MachineStructureBuilderJS.stateSensitive / stateInsensitive](../API/KubeJS#machinestructurebuilderjs)  
[MachineStructureStageBuilderJS](../API/KubeJS#machinestructurestagebuilderjs)  
- Structure predicates:  
[KubeJSApi.block](../API/KubeJS#kubejsapi)  
[KubeJSApi.state](../API/KubeJS#kubejsapi)  
[KubeJSApi.anyOf](../API/KubeJS#kubejsapi)  
[KubeJSApi.anyOfItemInput](../API/KubeJS#kubejsapi)  
[KubeJSApi.anyOfEnergyOutput](../API/KubeJS#kubejsapi)  
- Recipes:  
[MachineRecipeSchema](../API/KubeJS#machinerecipeschema)  

## Machine Definition

[A_BlockState_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/A_BlockState_Machine.js) in the `startup_scripts` directory:

```js
// Define a more complex machine that uses block states.
MMCREvents.startup(event => {

    const builder = event
        .createMachine("mmcr_kubejs:kubejs_reactor") // Create the machine definition.
        .displayNameKey("machine.mmcr_kubejs.kubejs_reactor") // Translation key for the display name.
        .recipePool("mmcr_kubejs:kubejs_reactor") // Bind the recipe pool.
        .appearance("minecraft:blue_ice") // Set the controller's appearance block.

    builder.register()
    // See server_scripts/structure/A_BlockState_Machine.js for the block-state structure.
})
```

`MMCREvents.startup(event => {...})` passes the event object into the callback.
`event` is an [MMCRStartupEventJS](../API/KubeJS#mmcrstartupeventjs).
`event.createMachine(...)` returns a [MachineBuilderJS](../API/KubeJS#machinebuilderjs).

Chained calls:

- `.createMachine()`: The registration ID.
- `.displayNameKey()`: The localization key. See [MachineBuilderJS.displayNameKey](../API/KubeJS#machinebuilderjs) for details.
- `.recipePool()`: The recipe pool ID.

    This is the **pool ID used for actual recipe lookup**. The `recipe_pool` in recipe JSON must belong to a pool declared by the machine. The machine ID and pool ID can differ; a machine can declare multiple pools, while a recipe selects only one. See [MachineBuilderJS.recipePool](../API/KubeJS#recipepool-string-recipepoolids-%E2%86%92-machinebuilderjs) for details.

    `recipePool` is the identifier used at the machine definition layer for recipe grouping and broadcasting. It determines how machine recipes are registered, retrieved, and synchronized with JEI and the reload pipeline.
- `.appearance()`: Sets the controller's appearance block to blue ice. See [MachineBuilderJS.appearance](../API/KubeJS#machinebuilderjs) for details. This step also automatically derives the controller's base texture and the base texture of formed ports.

`builder.register()` finishes the build and submits the machine to the startup registration window.

:::info Note
This machine does not call `.allowMultithreading()`, `.allowParallelism()`, or `.maxParallelAmount(...)`. MMCR disables both multithreading and parallelism by default, and the reactor does not need a parallel controller.
:::

The startup window does not support hot reload. You must restart the game after making changes.

## Multiblock Structure

[A_BlockState_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_BlockState_Machine.js) in the `server_scripts/structure/` directory; the following completes the structure and explicitly enables state sensitivity:

```js
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_reactor")

    structure
        .stateSensitive()
        .pattern("  ABBBD  ", "         ", "         ", "         ", "         ", "         ", "         ", "         ")
        .pattern(" AEXXXFD ", "   XXX   ", "         ", "         ", "         ", "         ", "         ", "         ")
        .pattern("AEXXXXXFD", "  GHHHG  ", "  GHHHG  ", "  GHHHG  ", "  IJJJK  ", "         ", "         ", "         ")
        .pattern("LXXXXXXXM", " XHNONHX ", "  HNONH  ", "  HNONH  ", "  PXXXQ  ", "   RRR   ", "         ", "         ")
        .pattern("LXXXXXXXM", " XHOXOHX ", "  HOXOH  ", "  HOXOH  ", "  PXXXQ  ", "   RSR   ", "    S    ", "    T    ")
        .pattern("LXXXXXXXM", " XHNONHX ", "  HNONH  ", "  HNONH  ", "  PXXXQ  ", "   RRR   ", "         ", "         ")
        .pattern("UVXXXXXWY", "  GHHHG  ", "  GHHHG  ", "  GHHHG  ", "  Zaaab  ", "         ", "         ", "         ")
        .pattern(" UVXXXWY ", "   XCX   ", "         ", "         ", "         ", "         ", "         ", "         ")
        .pattern("  UcccY  ", "         ", "         ", "         ", "         ", "         ", "         ", "         ")
        .set('X', api.anyOf(
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfFluidOutput(),
            api.anyOfFluidInput(),
            api.anyOfEnergyOutput(), // This reactor can output energy without requiring an energy input port.
            api.block('minecraft:blue_ice')
        ))
        .set('A', api.state('minecraft:deepslate_brick_stairs[facing=east,half=bottom,shape=outer_right,waterlogged=false]'))
        .set('B', api.state('minecraft:deepslate_brick_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]'))
        .set('D', api.state('minecraft:deepslate_brick_stairs[facing=south,half=bottom,shape=outer_right,waterlogged=false]'))
        .set('E', api.state('minecraft:deepslate_brick_stairs[facing=south,half=bottom,shape=inner_left,waterlogged=false]'))
        .set('F', api.state('minecraft:deepslate_brick_stairs[facing=west,half=bottom,shape=inner_left,waterlogged=false]'))
        .set('G', api.block('minecraft:polished_deepslate'))
        .set('H', api.block('minecraft:black_stained_glass'))
        .set('I', api.state('minecraft:polished_deepslate_stairs[facing=east,half=bottom,shape=outer_right,waterlogged=false]'))
        .set('J', api.state('minecraft:polished_deepslate_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]'))
        .set('K', api.state('minecraft:polished_deepslate_stairs[facing=west,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('L', api.state('minecraft:deepslate_brick_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]'))
        .set('M', api.state('minecraft:deepslate_brick_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]'))
        .set('N', api.block('minecraft:emerald_block'))
        .set('O', api.block('minecraft:lapis_block'))
        .set('P', api.state('minecraft:polished_deepslate_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]'))
        .set('Q', api.state('minecraft:polished_deepslate_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]'))
        .set('R', api.block('minecraft:deepslate_brick_slab'))
        .set('S', api.block('minecraft:deepslate_tiles'))
        .set('T', api.block('minecraft:oxidized_lightning_rod'))
        .set('U', api.state('minecraft:deepslate_brick_stairs[facing=east,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('V', api.state('minecraft:deepslate_brick_stairs[facing=north,half=bottom,shape=inner_right,waterlogged=false]'))
        .set('W', api.state('minecraft:deepslate_brick_stairs[facing=north,half=bottom,shape=inner_left,waterlogged=false]'))
        .set('Y', api.state('minecraft:deepslate_brick_stairs[facing=west,half=bottom,shape=outer_right,waterlogged=false]'))
        .set('Z', api.state('minecraft:polished_deepslate_stairs[facing=east,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('a', api.block('minecraft:polished_deepslate_stairs'))
        .set('b', api.state('minecraft:polished_deepslate_stairs[facing=north,half=bottom,shape=outer_left,waterlogged=false]'))
        .set('c', api.state('minecraft:deepslate_brick_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]'))
        .controller('C')
        .build()
})
```

Inside the `MMCREvents.server(event => {...})` callback, `event` is an [MMCRServerEventJS](../API/KubeJS#mmcrservereventjs).
`event.getAPI()` returns a [KubeJSApi](../API/KubeJS#kubejsapi), referred to as `api` throughout the following text.
`event.createStructure(...)` returns a [MachineStructureBuilderJS](../API/KubeJS#machinestructurebuilderjs).

Compared with the [Blast Furnace](blast-furnace), this machine's structure has two **key differences**:

1. The official script does not call `stateSensitive()`, so it is state-insensitive by default. Only after this article adds that call do the properties in `api.state(...)` participate in actual structure formation matching; `api.block(...)` still matches only the block and is not upgraded to default-state matching.
2. The union for the `X` character is broader, containing 5 port types and blue ice: `anyOfItemInput`, `anyOfItemOutput`, `anyOfFluidOutput`, `anyOfFluidInput`, `anyOfEnergyOutput`, plus `minecraft:blue_ice`. This is because the same casing position in the reactor allows either a port or decorative blue ice.

`.controller('C')` marks the C character (at z layer 8, y row 2, using 1-based indexing) as the controller position. `.build()` returns `void` and submits the structure to the current server script reload transaction.

:::info Note

The export tool provides a starting point for declarations; it does not guarantee that every directional block is exported as a state predicate. In the official script, `a` uses `api.block('minecraft:polished_deepslate_stairs')`, so any stair state is still allowed here. If orientation must be restricted, change it to `api.state(...)` according to the actual build. Standard directional properties can be handled during structure rotation, but automatic support cannot be assumed for nonstandard mod properties or vertical stairs that Minecraft cannot represent.
:::

## Recipes

[A_BlockState_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_BlockState_Machine.js) in the `server_scripts/recipe/` directory:

```js
ServerEvents.recipes(event => {
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_reactor',
        tick_time: 300,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:apple', count: 3 },
            { type: 'minecraft:fluid', io: 'input', fluid: 'minecraft:water', amount: 1 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:diamond', count: 10 } },
            { type: 'minecraft:fluid', io: 'output', stack: { id: 'minecraft:lava', amount: 250 } },
            { type: 'neoforge:energy', io: 'output', fe_per_tick: 200 }
        ]
    })

    // This recipe cannot run because the structure has no energy input port.
    // The requirement and recipe systems are intentionally independent.
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_reactor',
        tick_time: 200,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:golden_apple', count: 2 },
            { type: 'minecraft:fluid', io: 'input', fluid: 'minecraft:water', amount: 800 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:gold_ingot', count: 2 } },
            { type: 'minecraft:fluid', io: 'output', stack: { id: 'minecraft:lava', amount: 450 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 10 },
            { type: 'neoforge:energy', io: 'output', fe_per_tick: 200 }
        ]
    })
})
```

The two recipes demonstrate the **intentional separation** of the `requirements` system and the `recipe` system:

- The first declares only the **output** direction for `neoforge:energy`, consistent with the reactor's role of "outputting energy externally".
- The second declares both energy **input** and output. However, the structure has **no energy input ports**, so this recipe can still be loaded after the structure forms, but **can never run** (there is no matching input port).

See [MachineRecipeSchema](../API/KubeJS#machinerecipeschema) for detailed field meanings.

Data-driven recipes support hot reload; run `/reload` after making changes.

## Special Mechanism: The Difference Between `api.state(...)` and `api.block(...)`

This is the biggest difference between the reactor and all preceding examples.

### `api.block(...)`: Any Block State Matches

See [KubeJSApi.block](../API/KubeJS#kubejsapi):

```javascript
const casing = api.block("minecraft:iron_block")
```

The returned `BlockPredicate` compares only the **block ID**; the block matches regardless of its property values.

The example above uses the approach from the blast furnace. Players can place iron blocks in any state at the 4 corner positions (although there is actually only one state), without affecting structure formation.

### `api.state(...)`: The Block State Must Match Exactly

See [KubeJSApi.state](../API/KubeJS#kubejsapi):

```javascript
const log = api.state("minecraft:oak_log[axis=x]")
```

`api.state(String)` starts from the block's default state and then overrides the properties inside the brackets. Omitted properties therefore retain their default values rather than acting as wildcards. The returned `OfBlockState` predicate itself can compare all properties exactly; whether actual structure matching uses those properties is determined by `stateSensitive`. Unknown property names, invalid property values, and nonexistent block IDs are all rejected.

The reactor uses `api.state(...)` to restrict stairs with orientation and shape properties; the black stained glass here consists of full glass blocks and is still matched by `api.block(...)`.

These blocks can have different `facing`/`shape`/`waterlogged` properties when placed normally. To assemble the structure correctly, each character in the pattern must specify exact state values, for example:

```javascript
.set('A', api.state('minecraft:deepslate_brick_stairs[facing=east,half=bottom,shape=outer_right,waterlogged=false]'))
```

This line means: "Position A must contain an east-facing, bottom-half deepslate brick stair with the `outer_right` shape that is not waterlogged." Players must place stairs in the same state; **any other state will cause a structure mismatch**.

### `stateSensitive()` / `stateInsensitive()`

Two top-level methods of [MachineStructureBuilderJS](../API/KubeJS#machinestructurebuilderjs):

| Method | Behavior |
| --- | --- |
| [`stateSensitive()`](../API/KubeJS#machinestructurebuilderjs) | Uses the predicates' original matching rules: `api.state(...)` matches states exactly, while `api.block(...)` still matches only blocks. |
| [`stateInsensitive()`](../API/KubeJS#machinestructurebuilderjs) | Makes the entire structure state-insensitive, downgrading all characters bound with `api.state(...)` to block-ID-only comparisons. |

`MachineStructureBuilderJS` defaults to `stateSensitive = false`. Using `api.state(...)` alone is not enough to enable global state matching, so this article adds `.stateSensitive()` to the outer structure chain. Grouped structures should also configure this at the outer level, rather than calling it inside a stage callback.

Mixing the two approaches is valid. With state sensitivity enabled, stairs are checked against their explicit states and casing is checked by block; switching to `stateInsensitive()` downgrades state predicates to block checks. A space means the position is not checked; bind `api.air()` when a position must actually be air.

## Summary

1. Use `api.state(...)` with an outer `stateSensitive()` to precisely control the states of stairs and similar blocks; keep `api.block(...)` for blocks whose states need no restrictions.
2. `api.anyOf(BlockPredicate...)` combines multiple ports and casing into a union: `X` allows 5 port types and blue ice, including energy output but not energy input.
3. The recipe and port systems are intentionally decoupled: recipes can declare energy requirements in any direction. A missing matching port at runtime does not prevent a recipe from loading, but execution will fail.

## API and Implementation References

| Call | Actual Signature / Semantics |
| --- | --- |
| `event.createMachine(String)` / `recipePool(String...)` | Startup machine definitions and recipe pools available for runtime lookup |
| `event.createStructure(String)` | Returns `MachineStructureBuilderJS` |
| `pattern(String...)` / `set(String, Object)` / `controller(String)` | Slices, character bindings, and machine controller positioning |
| `stateSensitive()` / `stateInsensitive()` | Outer structure state-matching switches; both take no arguments |
| `api.block(String)` / `api.state(String)` | Return `BlockPredicate`; the former accepts any state, while the latter parses a specific state |
| Energy JSON | `type: 'neoforge:energy'`, `io: 'input'/'output'`, `fe_per_tick: long`; input or output per tick |

- [KubeJSApi: State Parsing](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java)
- [MachineStructureBuilderJS: Default State Sensitivity and build Transactions](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineStructureBuilderJS.java)
- [BlockPredicate.matches(state, stateSensitive): Actual Downgrade Rules](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/BlockPredicate.java#L35-L44)
- [JSON Parser](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/MachineRecipeJson.java) / [Energy Requirement Codec](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/requirement/EnergyRequirement.java)
