---
title: Distillation Tower
order: 3
---

# Distillation Tower - A Machine with Grouped, Expandable Structures

This article demonstrates a distillation tower with **grouped, expandable structures**. The tower's "section count" can be assembled dynamically according to recipe requirements; towers with 1, 2, or 3 sections are all the same machine.

This article was checked against commit `f234477b` of 26.1.2. The machine is registered once during startup, the structure is submitted in the server reload transaction, and recipes are registered through `ServerEvents.recipes`. The latter two support `/reload`; changes to the machine's appearance, recipe pools, or expandable structure switch require a restart.

The code spans three files:

- `example/startup_scripts/A_Group_Machine.js`
- `example/server_scripts/structure/A_Group_Machine.js`
- `example/server_scripts/recipe/A_Group_Machine.js`

## Overview

The key difference between the distillation tower and the [Blast Furnace](blast-furnace) is **the structure's form**:

- The blast furnace uses the flat `.pattern(...).set(...).controller(...).build()` API and has a **single** structure.
- The distillation tower uses the staged `.mainStructure(...).expandStructure(...).expandStructure(...)` API and has **a group** of structures.

Players can choose to build 1, 2, or 3 sections, corresponding to structure stages 1, 2, and 3. These are stages, not the level types and coil levels of the [Thermal Smelter](thermal-smelter).

A distillation tower is a classic use case for grouped structures: each distillation section needs its own ports and casing. With only 1 section, the player has a "small distillation tower"; with 3 sections, it is a "large distillation tower".

MMCR uses **port-family unions + structure stage enumeration** to let a single machine ID cover multiple forms.

`expandableStructure(true)` is this machine's key startup switch; it tells MMCR that "this machine's structure is a group of stages rather than a single structure".

See [MachineBuilderJS.expandableStructure](../API/KubeJS#machinebuilderjs) for details.

## Files Used

| File | Phase | Registered Object |
| --- | --- | --- |
| `example/startup_scripts/A_Group_Machine.js` | `MMCREvents.startup` | Machine definition |
| `example/server_scripts/structure/A_Group_Machine.js` | `MMCREvents.server` | Multiblock structures (grouped) |
| `example/server_scripts/recipe/A_Group_Machine.js` | `ServerEvents.recipes` | Data-driven recipes |

## API Reference Links

- Startup phase:  
[MMCRStartupEventJS](../API/KubeJS#mmcrstartupeventjs)  
[MachineBuilderJS](../API/KubeJS#machinebuilderjs)  
[MachineBuilderJS.expandableStructure](../API/KubeJS#machinebuilderjs)  
[MachineBuilderJS.recipePool](../API/KubeJS#recipepool-string-recipepoolids-%E2%86%92-machinebuilderjs)
[MachineBuilderJS.appearance](../API/KubeJS#machinebuilderjs)  
- Structure phase:  
[MMCRServerEventJS](../API/KubeJS#mmcrservereventjs)  
[MachineStructureBuilderJS](../API/KubeJS#machinestructurebuilderjs)  
[MachineStructureBuilderJS.mainStructure](../API/KubeJS#machinestructurebuilderjs)  
[MachineStructureBuilderJS.expandStructure](../API/KubeJS#machinestructurebuilderjs)  
[MachineStructureStageBuilderJS](../API/KubeJS#machinestructurestagebuilderjs)  
- Structure predicates:  
[KubeJSApi.anyOf](../API/KubeJS#kubejsapi)  
[KubeJSApi.block](../API/KubeJS#kubejsapi)  
[KubeJSApi.anyOfItemInput](../API/KubeJS#kubejsapi)  
[KubeJSApi.anyOfEnergyInput](../API/KubeJS#kubejsapi)  
- Recipes:  
[MachineRecipeSchema](../API/KubeJS#machinerecipeschema)  
[MachineRecipeSchema.allowPartialOutputs](../API/KubeJS#machinerecipeschema)  
[KubeJSApi.stageRequirement / MachineRecipeBuilderJS.requiresStage](../API/KubeJS#kubejsapi)

## Machine Definition

[A_Group_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/A_Group_Machine.js) in the `startup_scripts` directory:

```js
// Register a machine with an expandable structure.

MMCREvents.startup(event => {

    const distillation_tower = event
        .createMachine("mmcr_kubejs:kubejs_distillation_tower")
        .displayNameKey("machine.mmcr_kubejs.kubejs_distillation_tower")
        .recipePool("mmcr_kubejs:kubejs_distillation_tower")
        .appearance("minecraft:polished_blackstone")
        .expandableStructure(true) // Enable the expandable structure.

    distillation_tower.register()

    // See server_scripts/structure/A_Group_Machine.js for the grouped structure.
})
```

`event.createMachine(...)` returns a [MachineBuilderJS](../API/KubeJS#machinebuilderjs). The chained calls are:

- `.createMachine()`: Registers the ID `mmcr_kubejs:kubejs_distillation_tower`.
- `.displayNameKey(...)`: The localization key.
- `.recipePool(...)`: The recipe pool ID. See [MachineBuilderJS.recipePool](../API/KubeJS#recipepool-string-recipepoolids-%E2%86%92-machinebuilderjs) for details.
- `.appearance()`: Sets the controller's appearance to polished blackstone. See [MachineBuilderJS.appearance](../API/KubeJS#machinebuilderjs) for details.
- **`.expandableStructure(true)`**: Declares that this machine has grouped, expandable structures. See [MachineBuilderJS.expandableStructure](../API/KubeJS#machinebuilderjs) for details.
    This example uses `.mainStructure(...)` + `.expandStructure(...)` to declare three complete forms; this is not the only declaration method allowed by the switch.

The startup window does not support hot reloading; you must restart the game after making changes.

## Multiblock Structures

[A_Group_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_Group_Machine.js) in the `server_scripts/structure` directory:

```js
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_distillation_tower")

    // Define the main structure of the distillation tower.
    structure
        // Use mainStructure to define the main section.
        .mainStructure(stage =>
            stage
                .pattern(['  XXX  ','  AAA  ','       ','       '])
                .pattern([' XXXXX ',' B   B ','  ACA  ','       '])
                .pattern(['XXXXXXX','A     A',' B   B ','  DDD  '])
                .pattern(['XXXXXXX','A     A',' B   B ','  DDD  '])
                .pattern(['XXXXXXX','A     A',' B   B ','  DDD  '])
                .pattern([' XXXXX ',' B   B ','  BBB  ','       '])
                .pattern(['  XXX  ','  BEB  ','       ','       '])
                .set('C', api.anyOf(
                    api.anyOfItemInput(),
                    api.anyOfItemOutput(),
                    api.anyOfEnergyInput(),
                    api.block('minecraft:deepslate_bricks')
                ))
                .set('X', api.block('minecraft:polished_blackstone'))
                .set('A', api.block('minecraft:deepslate_bricks'))
                .set('B', api.block('minecraft:polished_blackstone_bricks'))
                .set('D', api.block('minecraft:gilded_blackstone'))
                .controller('E')
        )
        // Use expandStructure to define an additional section.
        .expandStructure(stage => stage
            .pattern(['  XXX  ','  AAA  ','       ','       ','       '])
            .pattern([' XXXXX ',' B   B ','  ACA  ','  ACA  ','       '])
            .pattern(['XXXXXXX','A     A',' B   B ',' B   B ','  DDD  '])
            .pattern(['XXXXXXX','A     A',' B   B ',' B   B ','  DDD  '])
            .pattern(['XXXXXXX','A     A',' B   B ',' B   B ','  DDD  '])
            .pattern([' XXXXX ',' B   B ','  BBB  ','  BBB  ','       '])
            .pattern(['  XXX  ','  BEB  ','       ','       ','       '])
            .set('C', api.anyOf(api.anyOfItemInput(), api.anyOfItemOutput(), api.anyOfEnergyInput(), api.block('minecraft:deepslate_bricks')))
            .set('X', api.block('minecraft:polished_blackstone'))
            .set('A', api.block('minecraft:deepslate_bricks'))
            .set('B', api.block('minecraft:polished_blackstone_bricks'))
            .set('D', api.block('minecraft:gilded_blackstone'))
            .controller('E')
        )

        .expandStructure(stage => stage
            .pattern(['  XXX  ','  AAA  ','       ','       ','       ','       '])
            .pattern([' XXXXX ',' B   B ','  ACA  ','  ACA  ','  ACA  ','       '])
            .pattern(['XXXXXXX','A     A',' B   B ',' B   B ',' B   B ','  DDD  '])
            .pattern(['XXXXXXX','A     A',' B   B ',' B   B ',' B   B ','  DDD  '])
            .pattern(['XXXXXXX','A     A',' B   B ',' B   B ',' B   B ','  DDD  '])
            .pattern([' XXXXX ',' B   B ','  BBB  ','  BBB  ','  BBB  ','       '])
            .pattern(['  XXX  ','  BEB  ','       ','       ','       ','       '])
            .set('C', api.anyOf(api.anyOfItemInput(), api.anyOfItemOutput(), api.anyOfEnergyInput(), api.block('minecraft:deepslate_bricks')))
            .set('X', api.block('minecraft:polished_blackstone'))
            .set('A', api.block('minecraft:deepslate_bricks'))
            .set('B', api.block('minecraft:polished_blackstone_bricks'))
            .set('D', api.block('minecraft:gilded_blackstone'))
            .controller('E')
        )

        // Build the grouped structure.
        structure.build()
})
```

In the `MMCREvents.server(event => {...})` callback, `event` is an [MMCRServerEventJS](../API/KubeJS#mmcrservereventjs).

`event.getAPI()` returns a [KubeJSApi](../API/KubeJS#kubejsapi).

The structure has three stages:

1. **`.mainStructure(stage => ...)`**: The base section.
See [MachineStructureBuilderJS.mainStructure](../API/KubeJS#machinestructurebuilderjs) for details.
The `stage` received by each stage callback is a [MachineStructureStageBuilderJS](../API/KubeJS#machinestructurestagebuilderjs).
2. **The first `.expandStructure(stage => ...)`**: The complete form of the two-section tower.
See [MachineStructureBuilderJS.expandStructure](../API/KubeJS#machinestructurebuilderjs) for details.
3. **The second `.expandStructure(stage => ...)`**: The complete form of the three-section tower.

:::warning Note
`structure.build()` is called **outside** the structure's chained stage calls.

After configuring the three stages with `structure.mainStructure(...).expandStructure(...).expandStructure(...)`, return to `structure` and finish with `.build()`.

At runtime, complete pattern matching determines the stage, trying higher stages before lower ones rather than merely counting blocks.
:::

The character definitions are identical in every section:

- `'X'` → Polished blackstone
- `'A'` → Deepslate bricks
- `'B'` → Polished blackstone bricks
- `'D'` → Gilded blackstone
- `'E'` → Controller
- `'C'` → An `api.anyOf(...)` union predicate: item input ports ∪ item output ports ∪ energy input ports ∪ deepslate bricks. In other words, players may place ports or decorative blocks in the middle of each section.

The staged API and flat API cannot be mixed. Once `.mainStructure(...)` has been called, calling the flat `.pattern(...)` / `.set(...)` throws an `IllegalStateException`.

See the notes for [MachineStructureBuilderJS](../API/KubeJS#machinestructurebuilderjs) for details.

`.build()` finishes construction and submits the structure.

## Recipes

[A_Group_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_Group_Machine.js) in the `server_scripts/recipe` directory:

```js
ServerEvents.recipes( event => {
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_distillation_tower',
        tick_time: 300,
        allow_partial_outputs: true, // 允许部分接收输出，未接收的部分丢弃。
        requirements: [
            { type: 'minecraft:item', io: 'input', item: '#minecraft:logs', count: 1 },
            {
                type: 'minecraft:item',
                io: 'output',
                stack: { id: 'minecraft:coal', count: 3 }
            },
            {
                type: 'minecraft:item',
                io: 'output',
                stack: { id: 'minecraft:charcoal', count: 4 }
            },
            {
                type: 'minecraft:item',
                io: 'output',
                stack: { id: 'minecraft:gunpowder', count: 3 },
                chance: 0.2
            },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 20 },
            { type: 'mmcr:stage', min_stage: 2 }
        ]
    })
})
```

With `allow_partial_outputs: true`, when the structure's ports cannot hold all outputs, **excess outputs are discarded instead of causing the recipe to fail**. See [MachineRecipeSchema](../API/KubeJS#machinerecipeschema) for details.

This recipe has 3 item outputs (coal, charcoal, and gunpowder with a 20% chance) and also requires `min_stage: 2`, so a one-section structure cannot start it. Whether products can be accepted depends on the output bus's slots, capacity, filters, and planning results; a multi-slot bus may hold multiple products, so the "number of output entries" cannot be directly equated with the "number of output ports".

The `io` of an `mmcr:stage` requirement defaults to input and accepts only input; `min_stage` is an integer from 1 to 64 requiring the current stage to be at least that value. The programmatic equivalents are `api.stageRequirement(int)` and `MachineRecipeBuilderJS.requiresStage(int)`. RecipeSchema in this commit has no chained function named `requiresStage`; simply write the JSON entry directly in `event.custom`.

See [MachineRecipeSchema](../API/KubeJS#machinerecipeschema) for the meanings of other fields.

Data-driven recipes support hot reloading; run `/reload` after making changes.

## Special Mechanics: Port-Family Unions and Grouped Structures

### Port-Family Unions

See [KubeJSApi.anyOfItemInput](../API/KubeJS#kubejsapi) / [KubeJSApi.anyOfEnergyInput](../API/KubeJS#kubejsapi) / [KubeJSApi.anyOf](../API/KubeJS#kubejsapi):

```javascript
.set('C', api.anyOf(
    api.anyOfItemInput(),
    api.anyOfItemOutput(),
    api.anyOfEnergyInput(),
    api.block('minecraft:deepslate_bricks')
))
```

The character C is bound to a union of 4 candidates: 3 port families plus a deepslate bricks block. This means players may place "item input ports, item output ports, or energy input ports of any tier / type, or decorative deepslate bricks" at C positions, and the structure can still form.

Union predicates are MMCR's most commonly used "port-family matching" tool. Their benefits are:

- **Decoupling**: The structure does not need to know the ID of a port from a particular tier or provider. `anyOfItemInput()` automatically includes **item input ports of all tiers in the current registry**.
- **Flexibility**: Players have ample freedom when placing ports.
- **Readability**: `api.anyOfItemInput()` is much shorter to write than enumerating individual port blocks with `api.block(...)`. The `KubeJSApi` here has no `port(String)` method.

### Why Use Groups (`mainStructure` + `expandStructure`)?

Returning to this machine's core question: players can build 1, 2, or 3 sections of the same "distillation tower" machine, and recipes can also provide different products based on the section count.

If you use only the flat API to define a fixed-size structure, players must build every section. This defeats the design goal of "expanding as needed".

How grouped structures work:

1. **`.mainStructure(stage => ...)`** declares the complete structure for stage 1.
2. **Each `.expandStructure(stage => ...)`** declares the **complete structure** for the next stage, each with its own pattern, characters, ports, and controller. The overall pattern height increases for stages 2 / 3 in this example; you cannot pass only the newly added layer.
3. **At runtime**: Complete forms are tried from higher stages to lower stages, and the matching stage is selected. The actual incremental declaration method is `.extension(stage => ...)`, whose `EXTENSION` pattern is merged into the previous stage; conflicting definitions at overlapping coordinates are rejected. This example does not use it.

See [MachineStructureBuilderJS](../API/KubeJS#machinestructurebuilderjs) for the complete staged API list.

`mainStructure` must be called first and can be called only once; `expandStructure` declares subsequent forms. Both have the JS signature `Consumer<MachineStructureStageBuilderJS>`: the callback modifies stage, and its return value is ignored, so either an expression chain or `{ stage.pattern(...); ... }` works. The outer `structure.build()` returns `void`. These cannot be mixed with top-level `.pattern(...)` / `.set(...)` / `.controller(...)`.

### How `allow_partial_outputs` Works with Grouped Structures

`allow_partial_outputs` defaults to false, with the output policy `REQUIRE_FULL`; enabling it changes the policy to `ALLOW_PARTIAL`, allowing partial product output when the actual capacity cannot accept everything, with unaccepted portions discarded. It does not relax item input, energy input, or stage thresholds.

The three complete stages in this example have 1 / 2 / 3 candidate `C` port positions, respectively, but each position may be used for input, output, energy input, or casing. Stage 1 cannot satisfy `min_stage: 2`; even if stage 2 meets the stage threshold, it may still be unable to run because it lacks enough input and energy ports. The stage number does not equal effective output capacity.

For an actual tutorial build, use the three `C` positions in stage 3 for item input, item output, and energy input, respectively, and choose an output bus with enough slots and capacity. To design "one fixed product per section", you must additionally establish port tags or filtering constraints; the current example has no such one-product-per-section routing definition.

RecipeSchema provides a no-argument `.allowPartialOutputs()` that writes true to JSON; the standalone `MachineRecipeBuilderJS` provides both `allowPartialOutputs()` and `allowPartialOutputs(boolean)`. Do not confuse these two sets of available calls.

## Summary

1. **`.expandableStructure(true)`** associates one machine ID with a group of forms rather than a single structure.
2. **`.mainStructure(...)` + `.expandStructure(...)` × N** lets players expand as needed.
3. **`mmcr:stage`** constrains the minimum structure stage, while **`allow_partial_outputs`** controls the policy when output capacity is insufficient; they have different responsibilities.

## Implementation References

- [Structure Builder: mainStructure / expandStructure Use FULL, extension Uses EXTENSION](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineStructureBuilderJS.java)
- [Stage Builder: pattern / set / controller in JS Callbacks](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineStructureStageBuilderJS.java)
- [Structure Family: Complete Form Replacement and Incremental Merging](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/MachineStructureFamily.java)
- [Stage Requirement Codec](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/requirement/StageRequirement.java)
- [RecipeSchema: allowPartialOutputs Function](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeSchema.java) / [JSON Parser](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/MachineRecipeJson.java)
