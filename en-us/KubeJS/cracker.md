---
title: Cracker
order: 5
---

# Cracker - Controller Facing and Rotational Symmetry

This article demonstrates a cracker that supports **vertical facing** and **full rotational symmetry**. The code spans three files:

- `example/startup_scripts/A_Vertical_Machine.js`
- `example/server_scripts/structure/A_Vertical_Machine.js`
- `example/server_scripts/recipe/A_Vertical_Machine.js`

This is the **first** KubeJS example to introduce `allowVerticalFacing()` and `fullyRotationallySymmetric()`, and the first to explicitly constrain port counts and tiers using `portRequirements(...)` and `portTierRequirements(...)`.

## Overview

The key differences between the cracker and the [Blast Furnace](blast-furnace) are **the machine's physical placement** and **port count/tier constraints**:

- The blast furnace controller can only face horizontally.
- The cracker uses `.allowVerticalFacing()` + `.fullyRotationallySymmetric()` to allow vertical controller placement.

`portRequirements(...)` and `portTierRequirements(...)` are new tools for **constraining port counts and minimum tiers**.

## Files Used in This Tutorial

| File | Phase | Registered Object |
| --- | --- | --- |
| `example/startup_scripts/A_Vertical_Machine.js` | `MMCREvents.startup` | Machine definition |
| `example/server_scripts/structure/A_Vertical_Machine.js` | `MMCREvents.server` | Multiblock structure (port count/tier constraints) |
| `example/server_scripts/recipe/A_Vertical_Machine.js` | `ServerEvents.recipes` | Data-driven recipes |

## API Reference Links for This Tutorial

- Startup phase:  
[MMCRStartupEventJS](../API/KubeJS#mmcrstartupeventjs)[MachineBuilderJS](../API/KubeJS#machinebuilderjs)  
[MachineBuilderJS.allowVerticalFacing](../API/KubeJS#machinebuilderjs)  
[MachineBuilderJS.fullyRotationallySymmetric](../API/KubeJS#machinebuilderjs)  
[MachineBuilderJS.requireVerticalFacing](../API/KubeJS#machinebuilderjs)  
- Structure phase:  
[MMCRServerEventJS](../API/KubeJS#mmcrservereventjs)  
[MachineStructureBuilderJS](../API/KubeJS#machinestructurebuilderjs)  
[MachineStructureBuilderJS.portRequirements](../API/KubeJS#machinestructurebuilderjs)  
[MachineStructureBuilderJS.portTierRequirements](../API/KubeJS#machinestructurebuilderjs)  
- Structure predicates:  
[KubeJSApi.portRequirements](../API/KubeJS#port-requirements)\
[KubeJSApi.portTierRequirements](../API/KubeJS#port-requirements)\
[KubeJSApi.anyOfItemInput](../API/KubeJS#kubejsapi)  
[KubeJSApi.anyOfItemOutput](../API/KubeJS#kubejsapi)  
[KubeJSApi.anyOfFluidOutput](../API/KubeJS#kubejsapi)  
[KubeJSApi.anyOfEnergyInput](../API/KubeJS#kubejsapi)  
- Recipes:  
[MachineRecipeSchema](../API/KubeJS#machinerecipeschema)  

## Machine Definition

[A_Vertical_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/A_Vertical_Machine.js) in the `startup_scripts/` directory:

```js
// Configure machine facing and rotational symmetry.

MMCREvents.startup(event => {

    const builder = event
        .createMachine("mmcr_kubejs:kubejs_cracker") // Create the machine definition.
        .displayNameKey("machine.mmcr_kubejs.kubejs_cracker") // Translation key for the display name.
        .recipePool("mmcr_kubejs:kubejs_cracker") // Bind the recipe pool.
        .allowVerticalFacing() // Allow the controller to be placed vertically.
        .fullyRotationallySymmetric() // Allow full rotation when the structure is placed vertically.

    builder.register()

    // See server_scripts/structure/A_Vertical_Machine.js for the rotatable structure.
})
```

`event.createMachine(...)` returns a [MachineBuilderJS](../API/KubeJS#machinebuilderjs). The chained calls are:

- `.allowVerticalFacing()`: Declares that the controller **can be placed vertically**, facing up or down.  
    See [MachineBuilderJS.allowVerticalFacing](../API/KubeJS#machinebuilderjs) for details.  
    Defaults to `false`, allowing only horizontal facing.  
    When enabled, players can choose any of six directions when right-clicking to place it: up, down, south, north, east, or west.  
- `.fullyRotationallySymmetric()`: Declares that structure matching may try four horizontal roll directions when facing vertically.  
    See [MachineBuilderJS.fullyRotationallySymmetric](../API/KubeJS#machinebuilderjs) for details.  
    Defaults to `false`.  
    When disabled, matching uses the controller's `ROLL_FACING`; when enabled, it tries four candidate roll directions in sequence. This switch does not change the front / side / top / bottom texture IDs.  
- `.recipePool("mmcr_kubejs:kubejs_cracker")`: The recipe pool ID.

`builder.register()` finishes the builder and submits the machine during the startup registration window.

:::info Note
Unlike the [Distillation Tower](distillation-tower), this machine **does not call `.expandableStructure(true)`**. The cracker has only one fixed form and needs no groups, so the flat API is sufficient for its structure script.
:::

The startup window does not support hot reloading; you must restart the game after making changes.

## Multiblock Structure

[A_Vertical_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_Vertical_Machine.js) in the `server_scripts/structure/` directory:

```js
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_cracker")

    structure
        .pattern(['AAA', 'AAA', 'AAA'])
        .pattern(['XBX', 'B B', 'XBX'])
        .pattern(['XDX', 'D D', 'XDX'])
        .pattern(['XEX', 'ECE', 'XEX'])
        .set('X', api.block('minecraft:polished_diorite'))
        .set('A', api.block('minecraft:polished_andesite'))
        .set('D', api.block('minecraft:blue_ice'))
        .set('E', api.block('minecraft:mossy_cobblestone'))
        // Previous examples used fixed ports. A const structure also provides convenient port predicates.
        .set('B', api.anyOf(
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfFluidOutput(),
            api.anyOfEnergyInput()
        ))
        .controller('C')
        // Set the required port counts. The structure will not form when these requirements are not met.
        // 单个数字为最小数量；二元数组为最小与最大数量。
        .portRequirements(api.portRequirements({
            item_input_bus: 1,
            item_output_bus: 1,
            fluid_output_hatch: 1,
            energy_input_hatch: [1,3] // Allow one to three energy input hatches.
        }))
        // Set port tier requirements using a readable string format.
        .portTierRequirements(api.portTierRequirements([
            'item_input_bus>=normal',
            'item_output_bus>=normal',
            'energy_input_hatch>=normal'
        ]))

        .build()
})
```

In the `MMCREvents.server(event => {...})` callback, `event` is an [MMCRServerEventJS](../API/KubeJS#mmcrservereventjs).
`event.getAPI()` returns a [KubeJSApi](../API/KubeJS#kubejsapi).

Compared with the [Blast Furnace](blast-furnace), this machine's structure introduces two tools:

1. **`.portRequirements(...)`**: Port count requirements.
    See [MachineStructureBuilderJS.portRequirements](../API/KubeJS#machinestructurebuilderjs) and [KubeJSApi.portRequirements](../API/KubeJS#port-requirements) for details.
2. **`.portTierRequirements(...)`**: Minimum port tiers.
    See [MachineStructureBuilderJS.portTierRequirements](../API/KubeJS#machinestructurebuilderjs) and [KubeJSApi.portTierRequirements](../API/KubeJS#port-requirements) for details.

**If the port counts or tiers do not meet the requirements, the structure is immediately considered to have failed to form**.

### Writing `portRequirements`

See [KubeJSApi.portRequirements](../API/KubeJS#port-requirements):

```javascript
api.portRequirements({
    item_input_bus: 1,           // 至少 1 个物品输入总线
    item_output_bus: 1,          // 至少 1 个物品输出总线
    fluid_output_hatch: 1,       // 至少 1 个流体输出仓
    energy_input_hatch: [1,3]    // 至少 1、最多 3 个能量输入仓
})
```

- A single number → the minimum count; internally calls `PortRequirementSpec.Builder.min(...)`.
- A two-element array `[min, max]` → the inclusive range `[min, max]`.

For an exact count, use `[n, n]`; the number `0` does not constrain the count, so use `[0, 0]` to prohibit a port type. The official script comment describes a single number as an exact count, but that does not match the `KubeJSApi.portRequirements` implementation in this commit.

Map keys are **port-family counting aliases or specific port type IDs**, unrelated to the character `'B'`. Here, `item_input_bus` counts item input ports of all tiers, including composite, extension, and integration ports that declare the item input family; `item_input_bus_tiny` counts only that model. The ID of the standard `normal` model shares its name with the family alias, so `item_input_bus` cannot count only the `normal` model.

The blocks players may place at `'B'` positions are determined by `.set('B', ...)`; this example allows item input, item output, fluid output, and energy input ports. Count requirements only validate the ports actually placed at these positions; they do not automatically add installation positions.

### Writing `portTierRequirements`

See [KubeJSApi.portTierRequirements](../API/KubeJS#port-requirements):

```javascript
api.portTierRequirements([
    'item_input_bus>=normal',
    'item_output_bus>=normal',
    'energy_input_hatch>=normal'
])
```

Tiered port families use `port_family>=tier`, for example `item_input_bus>=normal`; the operator is not `=>`. Tier names are case-insensitive, but the port family must exactly match its lowercase name, and the entire entry must contain no spaces. Available tiers for each family are:

- Items: `tiny`, `small`, `normal`, `reinforced`, `big`, `huge`, `ludicrous`.
- Fluids: the above + `vacuum`.
- Energy: the above + `ultimate`.
- Mekanism regular chemicals: `basic`, `advanced`, `elite`, `ultimate`.

Mekanism radioactive chemical and heat ports have no tier parameter: write only the port family, without appending `>=any` or any other tier. Here are additional syntax examples:

```javascript
api.portTierRequirements([
    'chemical_input_hatch>=advanced',
    'chemical_output_hatch>=ultimate',
    'radioactive_chemical_input_hatch',
    'radioactive_chemical_output_hatch',
    'heat_input_hatch',
    'heat_output_hatch'
])
```

These requirements can also be created using `chemicalInputTier(String)` / `chemicalOutputTier(String)`, `radioactiveChemicalInputTier()` / `radioactiveChemicalOutputTier()`, and `heatInputTier()` / `heatOutputTier()`; the facade and all three builders provide these convenience factories. See [API: Port Tiers and Port Requirements](../API/KubeJS#port-requirements) for the complete rules. When applying them to a structure, you must also provide installation positions in the pattern and allow the corresponding ports through `.set(...)`; when Mekanism is not loaded, no corresponding ports can satisfy these requirements.

This example requires **at least one port of tier `normal` or higher for each of item input, item output, and energy input**; not every port in the same family needs to meet the threshold. The structure cannot form with only a `tiny` item input bus; if the structure has additional installation positions and also contains an item input port of tier `normal` or higher, lower-tier ports can coexist. Every tier requirement must be satisfied, but the same port can satisfy multiple compatible requirements; constraining counts still requires `portRequirements(...)`.

## Recipes

[A_Vertical_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_Vertical_Machine.js) in the `server_scripts/recipe/` directory; all inputs and outputs are preserved below:

```js
ServerEvents.recipes( event => {

    // This example focuses on fluid output rather than recipe complexity.
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_cracker',
        tick_time: 300,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:apple', count: 3 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:iron_ingot', count: 10 } },
            {
                type: 'minecraft:fluid', // Set the requirement type to fluid.
                io: 'output',
                stack: {
                    id: 'minecraft:water', // Fluid identifier.
                    amount: 1000 // Amount in mB.
                }
            },
            { type: 'minecraft:fluid', io: 'output', stack: { id: 'minecraft:lava', amount: 1000 } },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:gold_ingot', count: 10 } },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:diamond', count: 10 } },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:coal', count: 10 } },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:stick', count: 10 } },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:water_bucket', count: 1 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 20 }
        ]
    })
    // Recipe IDs are optional in KubeJS.
})
```

Points to note:

1. Fluid outputs use the form `type: 'minecraft:fluid'` + `stack: { id, amount }`, with amount measured in mB.
2. The energy input `fe_per_tick: 20` requires an actual input hatch, power supply, and transfer capacity; count and tier constraints do not guarantee power delivery.
3. There is no `.id(...)` call: KubeJS generates an ID automatically.

See [MachineRecipeSchema](../API/KubeJS#machinerecipeschema) for field meanings.

Data-driven recipes support hot reloading; run `/reload` after making changes.

:::warning Port Capacity for the Complete Official Recipe
The structure above has only 4 `B` positions. After satisfying the four minimum requirements for item input, item output, fluid output, and energy input, only one hatch position remains for fluid output; however, the complete recipe outputs both water and lava, and `allow_partial_outputs` is not enabled. A single fluid output hatch cannot accept two fluids simultaneously, so a formed structure does not guarantee that the complete recipe can run.

To retain the complete recipe, expand the structure's port positions and provide sufficient independent fluid output capacity; to retain the original structure, you can instead remove one fluid output. This is a design choice that must be made explicit when modifying the tutorial; you must not silently omit products and then claim that the original example works.
:::

## Special Mechanics: Facing / Rotation / Port Count Constraints


### `allowVerticalFacing` / `fullyRotationallySymmetric` / `requireVerticalFacing`

All three methods are defined in [MachineBuilderJS](../API/KubeJS#machinebuilderjs):

| Method | Default | Behavior |
| --- | --- | --- |
| [`allowVerticalFacing()`](../API/KubeJS#machinebuilderjs) | `false` | Allows the controller to face vertically, up or down. When enabled, players can build "tower" or "shaft" forms. |
| [`fullyRotationallySymmetric()`](../API/KubeJS#machinebuilderjs) | `false` | Tries four horizontal rolls for structure matching when facing vertically; it does not unify textures. |
| [`requireVerticalFacing()`](../API/KubeJS#machinebuilderjs) | `false` | Enforces vertical facing and automatically enables `allowVerticalFacing` when enabled. Players cannot place a horizontally facing controller. |

#### Differences

- **`allowVerticalFacing` is a permission switch**: When enabled, players can place the controller either horizontally or vertically.
- **`requireVerticalFacing` is an enforcement switch**: When enabled, players can **only** place it vertically. It automatically enables `allowVerticalFacing`, so you do not need to call both.
- **`fullyRotationallySymmetric` is a structure-matching switch**: It mainly affects candidate rolls for vertical facing; appearance is still determined by texture configuration.

#### Combinations

The cracker uses the combination `.allowVerticalFacing() + .fullyRotationallySymmetric()`:

- Players **can** place it horizontally or vertically.
- When placed vertically, MMCR can try four roll directions to match the structure; this does not mean every block state can rotate freely.

If your machine **must be placed vertically**, such as a gravity-driven centrifuge, use `.requireVerticalFacing()` instead so players cannot place it facing the wrong direction.

If you need a fixed roll direction for vertical placement, omit `.fullyRotationallySymmetric()`. Configure controller textures separately to determine whether to use a uniform appearance; this structure switch should not substitute for texture settings.

### `portRequirements` and `portTierRequirements`


See [KubeJSApi.portRequirements](../API/KubeJS#port-requirements):

```javascript
api.portRequirements({
    item_input_bus: 1,           // 最小数量
    item_output_bus: 1,
    fluid_output_hatch: 1,
    energy_input_hatch: [1,3]    // 区间 [min, max]
})
```

See [KubeJSApi.portTierRequirements](../API/KubeJS#port-requirements):

```javascript
api.portTierRequirements([
    'item_input_bus>=normal',
    'item_output_bus>=normal',
    'energy_input_hatch>=normal'
])
```

Count requirements count the total number of matching ports; each tier requirement checks whether at least one port of the same family and I/O direction meets the minimum tier. The two are validated independently.

#### Port IDs Versus Characters

In these requirements, `item_input_bus` represents the **item input port family**, not a pattern character. The block predicate bound to `'B'` determines which blocks are allowed at that position; port count and tier requirements then validate the ports actually placed there.

Count requirements can use family aliases or specific model IDs; tier lists accept only the prescribed port-family syntax, so specific model IDs such as `item_input_bus_tiny` cannot appear on the left of `>=`.

## Summary

1. **`allowVerticalFacing()` / `fullyRotationallySymmetric()` / `requireVerticalFacing()`**: Three independent settings to allow vertical facing, try rolls when facing vertically, and enforce vertical facing. All provide a no-argument enabling form and a `(boolean)` overload, default to false, and `requireVerticalFacing(true)` automatically enables vertical placement.
2. **`portRequirements(...)` + `portTierRequirements(...)`**: Hard structure constraints on port counts and minimum tiers.
See [MachineStructureBuilderJS](../API/KubeJS#machinestructurebuilderjs) and [KubeJSApi](../API/KubeJS#kubejsapi) for details.
3. Recipes can output both items and fluids: `type: 'minecraft:fluid'` + `stack: { id, amount }`.

## API and Implementation References

| Call | Actual Signature |
| --- | --- |
| Port counts | `api.portRequirements(Map<String, Object>)` → `PortRequirementSpec`, then passed to the structure method of the same name |
| Port tiers / presence | `api.portTierRequirements(List<String>)` → `PortTierRequirementSpec`, then passed to the structure method of the same name |
| Port families | `anyOfItemInput()` / `anyOfItemOutput()` / `anyOfFluidOutput()` / `anyOfEnergyInput()` → `BlockPredicate` |
| Structure union | `api.anyOf(BlockPredicate...)` |
| Recipe pools | Machine `recipePool(String...)`; JSON `recipe_pool` is a single pool ID |

- [MachineBuilderJS: Facing Configuration and Boolean Overloads](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBuilderJS.java)
- [KubeJSApi: Port Count / Tier Parsing](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/c2563c4110cd15bad0218dc4fa5a4f091fbccc87/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java)
- [PortTierRequirementSpec: Minimum Tier and Presence Validation](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/c2563c4110cd15bad0218dc4fa5a4f091fbccc87/src/main/java/cn/howxu/mmcr/api/machine/PortTierRequirementSpec.java)
- [candidatePatterns: Actual Roll Candidates](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/tile/MachineControllerBlockEntity.java#L2257-L2292)
- [JSON Parser](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/MachineRecipeJson.java) / [Fluid Requirement Codec](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/requirement/FluidRequirement.java)
