---
title: Thermal Smelter
order: 8
---

# Thermal Smelter — Level System

This article demonstrates MMCR's **Level system**: the machine structure contains a "level slot", and the representative block placed in that slot determines the current machine level. Different levels apply different recipe modifiers.

## Machine Introduction

The `Thermal Smelter` consists of three files:

- `example/startup_scripts/A_Level_Machine.js`  

- `example/server_scripts/structure/A_Level_Machine.js`  

- `example/server_scripts/recipe/A_Level_Machine.js`  

Modifiers are determined dynamically by blocks in the structure. The level is determined by the block in a **designated slot** in the structure and affects which recipes the machine can run.

## Files Used

| File | Phase | Role |
| --- | --- | --- |
| `example/startup_scripts/A_Level_Machine.js` | `MMCREvents.startup` | Registers the machine + the level type + three levels |
| `example/server_scripts/structure/A_Level_Machine.js` | `MMCREvents.server` | Binds `levelSlot` to a structure character |
| `example/server_scripts/recipe/A_Level_Machine.js` | `ServerEvents.recipes` | Three data-driven recipes, each with `requirements` declaring `mmcr:level` |

## API Reference Links

| KubeJS API | Documentation Location |
| --- | --- |
| `createLevelType(String)` / `createLevel(String)` | [API/KubeJS#mmcrstartupeventjs](../API/KubeJS#mmcrstartupeventjs) |
| `LevelTypeBuilderJS` | [API/KubeJS#leveltypebuilderjs](../API/KubeJS#leveltypebuilderjs) |
| `MachineLevelBuilderJS` | [API/KubeJS#machinelevelbuilderjs](../API/KubeJS#machinelevelbuilderjs) |
| `levelSlot(String)` / `levelRequirement(String, String)` / `modifier(String, String, double, String, boolean)` | [API/KubeJS#kubejsapi](../API/KubeJS#kubejsapi) |
| `MachineRecipeBuilderJS.requiresLevel(String, String)`; RecipeSchema also provides a function of the same name taking two strings | [API/KubeJS#machinerecipebuilderjs](../API/KubeJS#machinerecipebuilderjs) |
| `MachineRecipeSchema`: `requirements` / `mmcr:level` | [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) |

## Machine Definition

[A_Level_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/A_Level_Machine.js) in the `startup_scripts/` directory:

```js
// Use the level system and a shared structure.

MMCREvents.startup(event => {

    const api = event.getAPI()

    // Register the machine that uses levels.
    const builder = event
        .createMachine("mmcr_kubejs:kubejs_thermal_smelting_furnace")
        .displayNameKey("machine.mmcr_kubejs.kubejs_thermal_smelting_furnace")
        .recipePool("mmcr_kubejs:kubejs_thermal_smelting_furnace")
        .allowModifiers()
        .allowParallelism()
        .allowMultithreading()
        .maxParallelAmount(32)
        .appearance("minecraft:smooth_basalt")

    builder.register()

    // Register the level type before registering individual levels.
    event
        .createLevelType("mmcr_kubejs:thermal_smelting_coil")
        .displayNameKey('level.mmcr_kubejs.thermal_smelting_coil')
        .register()

    // Register three levels under that type.
    event.createLevel("mmcr_kubejs:thermal_smelting_coil_iron")
        .type("mmcr_kubejs:thermal_smelting_coil")
        .priority(0)
        .state('minecraft:iron_block')
        .modifier(api.modifierDefinition([
            api.modifier("duration", "input", 0.95, "multiply", false),
            api.modifier("energy", "input", 0.95, "multiply", false),
            api.modifier("parallelism", "machine", 4, "add", false)
        ]))
        .register()

    event.createLevel("mmcr_kubejs:thermal_smelting_coil_gold")
        .type("mmcr_kubejs:thermal_smelting_coil")
        .priority(1)
        .state('minecraft:gold_block')
        .modifier(api.modifierDefinition([
            api.modifier("duration", "input", 0.85, "multiply", false),
            api.modifier("energy", "input", 0.85, "multiply", false),
            api.modifier("parallelism", "machine", 6, "add", false)
        ]))
        .register()

    event.createLevel("mmcr_kubejs:thermal_smelting_coil_diamond")
        .type("mmcr_kubejs:thermal_smelting_coil")
        .priority(2)
        .state('minecraft:diamond_block')
        .modifier(api.modifierDefinition([
            api.modifier("duration", "input", 0.75, "multiply", false),
            api.modifier("energy", "input", 0.75, "multiply", false),
            api.modifier("parallelism", "machine", 6, "add", false)
        ]))
        .register()
})
```

### The Machine Definition Itself Has No `.allowLevels(...)`

There is no machine-level switch to "enable the level system". Using [`api.levelSlot(...)`](../API/KubeJS#kubejsapi) in the structure definition automatically enables the machine's level system.

`.allowMultithreading()` allows the factory to schedule multiple recipe instances; `.allowParallelism()` and `.maxParallelAmount(long)` control the parallel multiplier and its cap for each instance, not the thread count. A level's `parallelism/machine` modifier contributes to parallel capacity calculations. Use `.factoryThreads(int)` to set the factory thread cap in the definition; this example does not set it.

### Level Type: `createLevelType(...)`

```js
event
    .createLevelType("mmcr_kubejs:thermal_smelting_coil")
    .displayNameKey('level.mmcr_kubejs.thermal_smelting_coil')
    .register()
```

A level type (`LevelType`) is a "level category" representing an upgradable "dimension". For example, the "coil" in this tutorial is one such dimension.

The machine structure has a position specifically for coils; iron / gold / diamond coils all belong to this dimension.

Chained calls:

- `.displayNameKey(...)`: The localization key.
- `.register()`: Submits the level type to the current registration collector. **Must be called before `.register()` for individual levels**; `.type(String)` only records the ID without looking up the type immediately. The actual type existence check occurs during registration.
See the "Notes" in [API/KubeJS#leveltypebuilderjs](../API/KubeJS#leveltypebuilderjs) for details.

### Individual Levels: `createLevel(...)`

```js
MMCREvents.startup(event => {
    const api = event.getAPI()
    event.createLevel("mmcr_kubejs:thermal_smelting_coil_iron")
        .type("mmcr_kubejs:thermal_smelting_coil")
        .priority(0)
        .state('minecraft:iron_block')
        .modifier(api.modifierDefinition([
            api.modifier("duration", "input", 0.95, "multiply", false),
            api.modifier("energy", "input", 0.95, "multiply", false),
            api.modifier("parallelism", "machine", 4, "add", false)
        ]))
        .register()
})
```

Each individual level belongs to a level type, is identified by a `state` block, and comes with a set of modifier parameters. Chained calls:

- `.type(typeId)`: Required; specifies the parent level type.
- `.priority(int)`: Optional; the level ordering, defaulting to 0. Larger values mean higher levels. Both priority and representative state must be unique within a type, so you cannot leave all three levels at the default 0.
- `.state(Object)`: Required; the block representing this level. `Object` can be a string (a block ID, using its default state) or a `BlockState`.
- `.modifier(ModifierDefinition)`: Optional; defines the set of modifiers supplied by this level. Create it through `api.modifierDefinition([...])`.

`api.modifier(target, scope, value, operation, chance)` creates a numeric modifier entry. The level examples adjust duration, energy consumption, and machine parallelism.

The `ModifierDefinition` for iron / gold / diamond coils multiplies duration and energy consumption by `0.95` / `0.85` / `0.75`, respectively, and adds `4` / `6` / `6` points of machine parallelism.

Level modifiers and dynamic structure modifiers now share the `ModifierDefinition` and `MachineModifier` models; the difference is that level modifiers are determined by slot blocks, while structure modifiers are determined by modifier usage positions.

### The Startup Phase Does Not Support Hot Reloading

Machines, level types, and levels are all managed through the startup window. Restart the game for changes to take effect.
See [API/KubeJS#mmcrstartupeventjs](../API/KubeJS#mmcrstartupeventjs) for details.

## Structure

[A_Level_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_Level_Machine.js) in the `server_scripts/structure/` directory:

```js
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_thermal_smelting_furnace")

    structure
        .pattern(['AAA','XXX','XXX','AAA'])
        .pattern(['AAA','X X','X X','ADA'])
        .pattern(['ABA','XXX','XXX','AAA'])
        .set('X', api.levelSlot("mmcr_kubejs:thermal_smelting_coil"))  // ← 等级槽位
        .set('A', api.anyOf(
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfEnergyInput(),
            api.parallelControllers(),
            api.factoryController(),
            api.block('minecraft:smooth_basalt')
        ))
        .set('D', api.block('minecraft:reinforced_deepslate'))
        .controller('B')
        .build()
})
```

### `api.levelSlot(typeId)` Turns a Character into a Level Slot

```js
.set('X', api.levelSlot("mmcr_kubejs:thermal_smelting_coil"))
```

[`api.levelSlot(typeId)`](../API/KubeJS#kubejsapi) returns a [`LevelSlot`](../API/KubeJS#kubejsapi), matching **any state block** belonging to the level type typeId.

Unlike `api.block(...)`, which matches a single block, a slot matches "a set of blocks"; the exact set is determined dynamically by all `MachineLevel.state(...)` fields.

The example's `X` can match iron / gold / diamond blocks.

`X` occupies 16 positions in this pattern, all belonging to the same level type; it is not a single isolated block. Formation resolution requires slots of the same type to use the same level. Mixing iron / gold / diamond coils produces a level inconsistency error; level modifiers are applied according to the resolved level, not multiplied repeatedly for all 16 positions.

## Recipes

[A_Level_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_Level_Machine.js) in the `server_scripts/recipe/` directory:

```js
ServerEvents.recipes( event => {
    // 铁线圈：10000 煤 + 8 生铁 = 9 铁锭
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_thermal_smelting_furnace',
        tick_time: 300,
        parallelized: true,
        requirements: [
            {
                type: 'mmcr:level',
                io: 'input',
                level_type: 'mmcr_kubejs:thermal_smelting_coil',
                level: 'mmcr_kubejs:thermal_smelting_coil_iron'
            },
            { type: 'minecraft:item', io: 'input',  item: 'minecraft:coal',     count: 10000 },
            { type: 'minecraft:item', io: 'input',  item: 'minecraft:raw_iron', count: 8 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:iron_ingot', count: 9 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 10 }
        ]
    })

    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_thermal_smelting_furnace',
        tick_time: 300,
        parallelized: true,
        requirements: [
            { type: 'mmcr:level', io: 'input', level_type: 'mmcr_kubejs:thermal_smelting_coil', level: 'mmcr_kubejs:thermal_smelting_coil_gold' },
            { type: 'minecraft:item', io: 'input', item: 'minecraft:coal', count: 1 },
            { type: 'minecraft:item', io: 'input', item: 'minecraft:raw_gold', count: 8 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:gold_ingot', count: 9 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 12 }
        ]
    })
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_thermal_smelting_furnace',
        tick_time: 300,
        parallelized: true,
        max_threads: 4,
        requirements: [
            { type: 'mmcr:level', io: 'input', level_type: 'mmcr_kubejs:thermal_smelting_coil', level: 'mmcr_kubejs:thermal_smelting_coil_diamond' },
            { type: 'minecraft:item', io: 'input', item: 'minecraft:coal', count: 1 },
            { type: 'minecraft:item', io: 'input', item: 'minecraft:raw_copper', count: 8 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:copper_ingot', count: 9 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 10 }
        ]
    })
})
```

All three recipes include an `mmcr:level` entry in `requirements`, each using a different level ID and item requirements:

| Recipe | Minimum Level | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| Iron coil | `thermal_smelting_coil_iron` | 10000 coal + 8 raw iron | 9 iron ingots | 10 FE/tick |
| Gold coil | `thermal_smelting_coil_gold` | 1 coal + 8 raw gold | 9 gold ingots | 12 FE/tick |
| Diamond coil | `thermal_smelting_coil_diamond` | 1 coal + 8 raw copper | 9 copper ingots | 10 FE/tick, `max_threads: 4` |

### The `mmcr:level` Entry in `requirements`

```js
requirements: [
    {
        type: 'mmcr:level',
        io: 'input',
        level_type: 'mmcr_kubejs:thermal_smelting_coil',
        level: 'mmcr_kubejs:thermal_smelting_coil_iron'
    }
]
```

Level requirements are placed in the `requirements` array as ordinary requirement entries; you can also use `.requiresLevel(typeId, levelId)` in RecipeSchema chained calls.

An `mmcr:level` entry contains:

- `level_type`: The level type ID (matching startup `createLevelType(...)`).
- `level`: The individual level ID (matching startup `createLevel(...)`).  
    The level must belong to the specified type, or an exception is thrown during recipe registration.  

The semantics are **a minimum level within the same type**: the recipe is selected only when the current level's priority is at least that of the required level. Gold coils can run the iron coil recipe, and diamond coils can satisfy all three level requirements; this is not an equality match against the specified level ID. Other requirements, such as items and energy, must still be satisfied. The recipe's `recipe_pool` must match a pool declared by the machine.
The programmatic equivalents are [`MachineRecipeBuilderJS.requiresLevel(typeId, levelId)`](../API/KubeJS#machinerecipebuilderjs) and [`KubeJSApi.levelRequirement(typeId, levelId)`](../API/KubeJS#kubejsapi), both of which create a level requirement entry internally.

### The `max_threads` Field

```js
max_threads: 4
```

A top-level data-driven recipe field that limits how many factory threads the recipe may occupy.

The diamond coil recipe's `max_threads: 4` sets its thread cap; it does not guarantee that 4 instances actually run simultaneously. The actual count is also constrained by machine and factory scheduler capacity. The other two recipes omit this field, which defaults to 1; 0 means no recipe-side thread cap.

See [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) for details.

Data-driven recipes support hot reloading; run `/reload` after making changes.

## Special Mechanics: The Level System

### `MachineLevel.modifier` and `ModifierDefinition`

The differences between the two modifier entry points:

| System | Trigger | Application Timing | Fields |
| --- | --- | --- | --- |
| Modifier (Alloy Furnace) | Blocks at designated positions in the structure | Applied dynamically while recipes run | `target` / `scope` / `value` / `operation` / `chance` |
| Level | Blocks in level slots in the structure | Applied while recipes run | `MachineModifier` entries in `ModifierDefinition` |

Level and structure modifiers use the same target, scope, and operation format.

Levels are determined by level slots in the structure, while structure modifiers are determined by blocks that players place at modifier usage positions.

## Further Reading

- [Level Builder: Recording type and Validating register](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineLevelBuilderJS.java)
- [Level Registry: Unique priority and state Within a Type](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/level/MachineLevelRegistry.java)
- [Structure Matcher: Level Slot Consistency](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/StructureMatcher.java)
- [Recipe Search: Checking Minimum Levels by priority](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/RecipeSearchTask.java)
- [RecipeSchema](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeSchema.java) / [JSON Parser](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/MachineRecipeJson.java)

- [API/KubeJS#createleveltypestring-id--leveltypebuilderjs](../API/KubeJS#mmcrstartupeventjs) — Level type entry point.
- [API/KubeJS#leveltypebuilderjs](../API/KubeJS#leveltypebuilderjs) — Complete `LevelTypeBuilderJS` methods.
- [API/KubeJS#createlevelstring-id--machinelevelbuilderjs](../API/KubeJS#mmcrstartupeventjs) — Individual level entry point.
- [API/KubeJS#machinelevelbuilderjs](../API/KubeJS#machinelevelbuilderjs) — Complete `MachineLevelBuilderJS` methods (including the `.modifier(...)` field).
- [API/KubeJS#levelslotstring-typeid--levelslot](../API/KubeJS#kubejsapi) — Structure-level level slot predicate.
- [API/KubeJS#levelrequirementstring-typeid-string-levelid--levelrequirement](../API/KubeJS#kubejsapi) — Programmatic level requirement object.
- [API/KubeJS#machinerecipebuilderjs](../API/KubeJS#machinerecipebuilderjs) — `requiresLevel(...)` in the programmatic recipe builder.
- [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) — Complete data-driven recipe fields.
- [JavaAPI/Thermal Smelter](../JavaAPI/thermal-smelter) — Java implementation of the same thermal smelter.
