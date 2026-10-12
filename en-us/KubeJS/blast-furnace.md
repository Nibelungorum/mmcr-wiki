---
title: Blast Furnace
order: 1
---

# Blast Furnace

This first KubeJS example demonstrates how to register a blast furnace with a parallel controller and multiple ports using KubeJS.

## Overview

The blast furnace consists of three files:

- `example/startup_scripts/A_Simple_Machine.js` — Machine definition phase.
- `example/server_scripts/structure/A_Simple_Machine.js` — Multiblock structure phase.
- `example/server_scripts/recipe/A_Simple_Machine.js` — Recipe phase.

Each file corresponds to a specific KubeJS event phase:

| File | Event Phase | Registered Object |
| --- | --- | --- |
| `startup_scripts/A_Simple_Machine.js` | `MMCREvents.startup` | Machine definition |
| `server_scripts/structure/A_Simple_Machine.js` | `MMCREvents.server` | Multiblock structure |
| `server_scripts/recipe/A_Simple_Machine.js` | `ServerEvents.recipes` | Data-driven recipes |

Every KubeJS API used here has its own section in the [API Reference](../API/KubeJS).

## Machine Definition

[A_Simple_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/A_Simple_Machine.js) under `startup_scripts`:

```js
// Register a machine definition during the startup event.
// A controller block is generated automatically after registration.

// Listen for the MMCREvents.startup event.
MMCREvents.startup(event => {


    // Create the machine definition.
    const builder = event
        .createMachine("mmcr_kubejs:kubejs_blast_furnace") // Global machine identifier.
        .recipePool("mmcr_kubejs:kubejs_blast_furnace") // Bind the recipe pool.
        .displayNameKey("machine.mmcr_kubejs.kubejs_blast_furnace") // Translation key for the display name.


    // Configure the machine properties.
    builder
        .allowMultithreading() // Allow the machine to process recipes across multiple threads.
        .allowParallelism() // Allow the machine to process recipes in parallel.
        .maxParallelAmount(2147483647) // Set the maximum parallel amount; defaults to 1 when omitted.


    // Register the machine after configuration.
    builder.register()


    // See server_scripts/structure/A_Simple_Machine.js for the structure definition.
})
```

`MMCREvents.startup(event => {...})` is a KubeJS event fired by MMCR during startup. The `event` inside the callback is an instance of [`MMCRStartupEventJS`](../API/KubeJS#mmcrstartupeventjs).

`event.createMachine()` returns a [`MachineBuilderJS`](../API/KubeJS#machinebuilderjs) object.

Chained calls:

- `.displayNameKey(...)`: Declares a localization key. The recommended naming convention is `machine.<namespace>.<registered_name>`.
- `.allowMultithreading()`: Enables multithreading.
- `.allowParallelism()`: Enables parallel controllers.
- `.maxParallelAmount(2147483647)`: Sets the parallelism limit to the maximum `int` value.

`.register()` finishes the build and submits the machine definition to the current registration window.

The machine builder's `register()` returns the builder itself; the structure builder's `build()` returns `void` and submits the structure to the server script reload transaction. These are two distinct registration entry points, not a trailing-call convention of the scripting language.

:::info Note
`.allowMultithreading()` allows the factory scheduler to process multiple recipe instances; it does not start Java / CPU worker threads. Use `.factoryThreads(4)` when you need to configure the definition-side thread limit; this example does not call it, so the definition-side default is 1. `.allowParallelism()` allows a single recipe instance to use a parallel multiplier, and the recipe must also specify `parallelized: true`. The two switches are independent.
:::

The startup window does not support hot reload. You must restart the game after making changes.

## Multiblock Structure

[A_Simple_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_Simple_Machine.js) in the `server_scripts/structure` directory:

```js
// Machine structures support hot reload while the game is running.

// Listen for the MMCREvents.server event.
MMCREvents.server(event => {

    // Get the structure API to simplify the definitions below.
    const api = event.getAPI()

    // Create a structure using the same machine identifier as the startup script.
    event
        .createStructure("mmcr_kubejs:kubejs_blast_furnace") // Machine registered in startup_scripts/A_Simple_Machine.js.

        // 1. Define the structure slices. Each slice is a two-dimensional string array.
        // The output from the export tool can be pasted here directly.
        .pattern(['AXA', 'XIX', 'XXX'])
        .pattern(['XXX', 'I I', 'XBX'])
        .pattern(['AXA', 'XCX', 'XXX'])

        // 2. Assign a meaning to each character in the structure.
        .set('X',api.block('mmcr:basic_casing')) // Match the specified block with api.block().
        .set('A',api.anyOf(api.block('minecraft:iron_block'),api.block('minecraft:stone'),api.block('mmcr:parallel_controller_normal'),api.block('mmcr:factory_controller'))) // Combine predicates for a port position.
        // A accepts regular blocks, parallel controllers, and the multithreading controller.
        .set('I',api.anyOf(api.block('mmcr:item_input_bus'),api.block('mmcr:item_output_bus'),api.block('mmcr:energy_input_hatch'))) // Define the blocks allowed at fixed port positions.
        .set('B',api.tag('c:natural_logs')) // Match a block tag.
        .controller('C') // Assign C as the controller position.

        // 3. Build the structure.
        .build()
})
```

`MMCREvents.server(event => {...})` fires after server scripts load. The `event` inside the callback is an instance of [`MMCRServerEventJS`](../API/KubeJS#mmcrservereventjs), providing `getAPI()` and `createStructure(String)`. Place recipe JSON in a separate `ServerEvents.recipes` callback; do not re-register machines, tiers, or modifiers in the server event.

`event.getAPI()` returns a [`KubeJSApi`](../API/KubeJS#kubejsapi) instance that wraps KubeJS-side convenience methods for [`BlockPredicate`](../API/JavaAPI#blockconditions-and-blockcondition) and [`InterfacePredicates`](../API/JavaAPI#blockconditions-and-blockcondition). This object is referred to as `api` throughout the following text.

`event.createStructure()` returns a [`MachineStructureBuilderJS`](../API/KubeJS#machinestructurebuilderjs).

The following chained `.pattern([...])` calls declare the structure's 3 z layers. Each `pattern` call takes an array of strings representing the y rows of one z layer, from bottom to top. Characters within a string represent x positions in that row, from left to right. A space means the block at that position is not checked.

`.set(...)` binds a character to a block predicate. `.controller('C')` marks the C character as the controller position. `.build()` finishes the build.

Character-to-block mappings:

- `'X'` → `api.block('mmcr:basic_casing')`: Basic casing.
- `'A'` → The union of four candidates: iron blocks, stone, normal parallel controllers, and factory controllers.
- `'B'` → `api.tag('c:natural_logs')`: Matches a block tag. This block tag can be reused by multiple structures; it is not a structure occupancy or port-sharing rule. The tag must actually contain usable blocks.
- `'I'` → The union of item input / output / energy input ports.
- `'C'` → The controller.

`.pattern(String... rows)` is the overload exposed to JS; Rhino adapts the example array to the varargs parameter. `pattern(List<String>)` is marked `@HideFromJS`. You can also pass strings row by row, or use `patternAll(List<List<String>>)` to submit all slices at once. The character supplied to `set(String, Object)` must already appear in the pattern, and `controller(String)` automatically binds the machine's controller. Internally, `BlockArray.Builder` generates the pattern, and `MachineStructureBuilderJS` submits the declaration.

Structures support hot reload through the in-game `/reload` command.

## Recipes

[A_Simple_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_Simple_Machine.js) in the `server_scripts/recipe` directory:

```js
// Define a recipe for the blast furnace machine.
// ServerEvents.recipes is data-driven and supports hot reload.

ServerEvents.recipes( event => {
    // Register a standard recipe object with event.custom().
    event.custom({
        type: 'mmcr:machine_recipe', // Required recipe type.
        recipe_pool: 'mmcr_kubejs:kubejs_blast_furnace', // Required recipe pool identifier.
        tick_time: 100, // Processing time in ticks; must be greater than 0.
        parallelized: true, // Allow this recipe to use parallel controllers.
        requirements: [
            {
                type: 'minecraft:item', // Requirement type; fluid is also supported.
                io: 'input', // Input or output direction.
                item: 'minecraft:iron_ingot', // An item identifier or ingredient can be used.
                count: 1
            },
            {
                type: 'minecraft:item',
                io: 'output',
                    stack: { // Outputs must use a stack object for items and fluids.
                    id: 'minecraft:iron_nugget',
                    count: 10
                }
            },
            {
                type: 'neoforge:energy',
                io: 'input', // This can also be set to output.
                fe_per_tick: 1 // Consume 1 FE per tick.
            }
        ]
    }).id('mmcr_kubejs:blast_furnace_1') // Optional recipe ID provided by KubeJS.

    // 第二条配方未声明 parallelized，默认不允许配方并行。
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_blast_furnace',
        tick_time: 100,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:gold_ingot', count: 1 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:gold_nugget', count: 10 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 1 }
        ]
    })
})
```

`ServerEvents.recipes(...)` is KubeJS's built-in vanilla recipe event. MMCR registers its recipe type through the custom `type: 'mmcr:machine_recipe'`.

KubeJS's `MachineRecipeSchema` provides keys and chained functions, while `MachineRecipeJson` and the requirement / output codecs ultimately parse the JSON. Treat the actual parser as authoritative; not all fields can be inferred from the schema's key table alone.

Field meanings:

- `type`: The recipe type; must be `'mmcr:machine_recipe'`.
- `recipe_pool`: The single pool ID to which the recipe belongs; the pool must have been declared by at least one machine definition. A machine's `.recipePool(String... ids)` can declare multiple pools. Recipe pools participate directly in runtime lookup, rather than only serving JEI display. If not explicitly specified, a machine uses its own ID as the pool by default; this example binds it explicitly.
- `tick_time`: The recipe's total processing time, in ticks.
- `parallelized`: Whether the recipe is allowed to run in parallel.
- `requirements`: The required array of requirements. Item, fluid, and energy inputs / outputs can all be written here. The specific fields depend on the entry type:
  - `type`: `'minecraft:item'` / `'minecraft:fluid'` / `'neoforge:energy'`, etc.
  - `io`: The direction, either `'input'` or `'output'`.
  - Item input: `item` (an item ID or ingredient expression) + `count`.
  - Item output: `stack.id` + `stack.count`.
  - Fluid input: `fluid` + `amount`.
  - Fluid output: `stack.id` + `stack.amount`.
  - Energy input: `fe_per_tick`.

`event.custom(...).id(...)` sets the recipe ID and returns a KubeJS recipe object, not the event object. KubeJS automatically assigns an ID to the second recipe, which does not specify one.

Other top-level fields include `outputs` / `modifiers` (empty arrays by default), `priority` (default 0), `max_threads` (default 1; 0 is allowed), `cancelIfPerTickFails` (default false), `allow_partial_outputs` (default false), and `required_host_ids` (an empty set by default). `tick_time` must be an integer of at least 1. The parser rejects the legacy top-level fields `machine`, `inputs`, `fluid_outputs`, `energy_per_tick`, `machine_outputs`, and `level_requirements`. Item counts and fluid amounts are ultimately constrained by the `int` limit on stack quantities, while `fe_per_tick` is a `long`.

## API Calls and Source Code

| Call | Actual Signature / Responsibility |
| --- | --- |
| `MMCR.getAPI()` / `getValues()` | Global declaration helper API / numeric constants |
| `event.createMachine(String)` | startup: returns `MachineBuilderJS`; submit with `register()` |
| `recipePool(String...)` | Declares a nonempty, ordered list of recipe pools |
| `allowMultithreading()` / `(boolean)` | Allows the factory to schedule multiple recipe instances |
| `allowParallelism()` / `(boolean)` | Allows recipe parallel multipliers |
| `maxParallelAmount(long)` / `maxParallelism(long)` | Parallelism limit and its alias; not a thread count |
| `event.createStructure(String)` | server: returns `MachineStructureBuilderJS`; submit with `build()` |
| `block(String)` / `tag(String)` / `anyOf(BlockPredicate...)` | Blocks, block tags, and predicate unions |
| `ServerEvents.recipes(event => …)` | KubeJS recipe callback; `event.custom(Object)` submits JSON |

Implementation references: [Events and Global Bindings](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/Plugin.java), [Machine Builder](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBuilderJS.java), [Structure Builder](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineStructureBuilderJS.java), [Helper API](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java), [RecipeSchema](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeSchema.java), [JSON Parser](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/MachineRecipeJson.java).

Data-driven recipes support hot reload; run `/reload` after making changes.

## Summary

Every API has a corresponding section in the [API Reference](../API/KubeJS).
