---
title: Alloy Furnace
order: 7
---

# Alloy Furnace — Modifier System

This article demonstrates MMCR's **Modifier system**: packaging a category of "recipe modification rules" into reusable modifiers, then using special block positions in the structure as modifier "use sites". The code corresponds to the [Java-side Alloy Furnace](../JavaAPI/alloy-furnace).


## Machine Introduction

The `Alloy Furnace` consists of three files:

- `example/startup_scripts/A_Modifier_Machine.js`
- `example/server_scripts/structure/A_Modifier_Machine.js`
- `example/server_scripts/recipe/A_Modifier_Machine.js`

The modifier system decouples "the recipe itself" from "the blocks in the machine". Recipes only concern themselves with inputs and outputs; the blocks in the structure determine how a recipe should be modified.

The same recipe has different effects in different machines because their modifier blocks differ.

## Files Involved

| File | Phase | Role |
| --- | --- | --- |
| `example/startup_scripts/A_Modifier_Machine.js` | `MMCREvents.startup` | Registers the machine + modifiers + modifier trigger items |
| `example/server_scripts/structure/A_Modifier_Machine.js` | `MMCREvents.server` | Binds modifier use sites to structure characters |
| `example/server_scripts/recipe/A_Modifier_Machine.js` | `ServerEvents.recipes` | Data-driven recipes |

## API Navigation

| KubeJS API (Actual Calls) | Documentation Location |
| --- | --- |
| `MachineBuilderJS.allowModifiers()` | [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) |
| `modifier(String, String, double, String, boolean)` / `modifierDefinition(List<MachineModifier>)` / `modifierUse(String, BlockPredicate)` / `anyOfUpgradeBus()` | [API/KubeJS#kubejsapi](../API/KubeJS#kubejsapi) |
| `registerModifier(String, ModifierDefinition)` / `registerModifierItem(String, String)` | [API/KubeJS#mmcrstartupeventjs](../API/KubeJS#mmcrstartupeventjs) |
| `MachineStructureBuilderJS.modifier(String, ModifierUse)` | [API/KubeJS#machinestructurebuilderjs](../API/KubeJS#machinestructurebuilderjs) |
| `MachineRecipeSchema` data-driven recipe fields | [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) |
| `MachineRecipeBuilderJS` | [API/KubeJS#machinerecipebuilderjs](../API/KubeJS#machinerecipebuilderjs) |

## Machine Definition

[A_Modifier_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/neo/26.1.2/example/startup_scripts/A_Modifier_Machine.js) in the `startup_scripts/` directory:

```js
// Use MMCR's machine modifier system.

MMCREvents.startup(event => {

    const api = event.getAPI()

    const builder = event
        .createMachine("mmcr_kubejs:kubejs_alloy_furnace")
        .displayNameKey("machine.mmcr_kubejs.kubejs_alloy_furnace")
        .recipePool("mmcr_kubejs:kubejs_alloy_furnace")
        .appearance('minecraft:bricks')
        .allowModifiers()// ← 关键：开启修饰器系统

    builder.register()

    // 注册第一个修饰器：绿宝石块加速
    event.registerModifier(
        "mmcr_kubejs:alloy_furnace_emerald_speedup",
        api.modifierDefinition([
            api.modifier("duration", "input", 0.5, "multiply", false)
        ])
    )

    event.registerModifierItem(
        "minecraft:emerald_block",
        "mmcr_kubejs:alloy_furnace_emerald_speedup"
    )

    // 注册第二个修饰器：青金石块加倍
    event.registerModifier(
        "mmcr_kubejs:alloy_furnace_lapis_doubling",
        api.modifierDefinition([
            api.modifier("output", "output", 2, "multiply", false)
        ])
    )

    event.registerModifierItem(
        "minecraft:lapis_block",
        "mmcr_kubejs:alloy_furnace_lapis_doubling"
    )
})
```

### `.allowModifiers()` on the Machine Definition

```js
.allowModifiers()
```

`.allowModifiers()` is equivalent to `.allowModifiers(true)` and controls whether machine modifiers are applied at runtime. Do not infer from this that the `.modifier('M', ...)` call itself will be rejected immediately: the structure builder records declarations, and the machine's switch is read at runtime. This example explicitly enables it.

### Modifier Registration

```js
event.registerModifier(
    "mmcr_kubejs:alloy_furnace_emerald_speedup",
    api.modifierDefinition([
        api.modifier("duration", "input", 0.5, "multiply", false)
    ])
)
```

`registerModifier(id, definition)` registers a `ModifierDefinition` (an immutable set of modifier rules) in the current machine structure registration window. Parameters:

- `id`: The modifier ID, referenced by both recipes and structures.
- `definition`: Created through `KubeJSApi.modifierDefinition([...])`; internally, it contains a list of `MachineModifier` objects.

### A Single Modifier Rule: `api.modifier(...)`

```js
api.modifier("duration", "input", 0.5, "multiply", false)
```

Five parameters: `target` (the target), `scope` (the scope), a finite number `value`, `operation` (`add` / `multiply` / `subtract` / `divide`), and `chance` (whether to modify probability). Valid numeric target / scope combinations are `duration/input`, `energy/input`, `chemical/input`, `heat/input`, `output/output`, `parallelism/machine`, `factory_threads/machine`, and `recipe_threads/recipe`. Probability modification applies only to targets that support probability (`chemical` and `output`). There is also a boolean overload, `api.modifier('parallelized', 'recipe', true)`, without operation / chance parameters.

Emerald speedup = recipe duration × 0.5. The lapis rule targets `output`, not just a particular item ID: in this example, the iron ingot count is multiplied by 2. Numeric rules from multiple distinct modifiers first aggregate addition and subtraction, then apply multiplication and division.

### Modifier Trigger Items: `registerModifierItem(...)`

```js
event.registerModifierItem(
    "minecraft:emerald_block",
    "mmcr_kubejs:alloy_furnace_emerald_speedup"
)
```

`registerModifierItem(itemId, modifierId)` binds an item ID string to a modifier ID, which must be registered before the window freezes.

Startup stores IDs only; they resolve to count-1 stacks after item default data components are bound. `ItemStack` is no longer accepted, so do not call `Item.of(...)` here. Both ordinary items and block items are supported; unknown items and duplicate bindings fail.

This binding lets upgrade buses recognize the items inside them; structure replacement blocks are declared independently through `.modifier(...)`. An upgrade bus item binding alone does not automatically make the structure's `M` accept emerald blocks. A structure replacement declaration alone also does not need an item binding to recognize emerald blocks in the world.

### The Startup Phase Does Not Support Hot Reload

Machines, modifiers, and modifier trigger items are all managed centrally by the startup window.

See the notes in [API/KubeJS#mmcrstartupeventjs](../API/KubeJS#mmcrstartupeventjs) for details. Although `registerModifier` and `registerModifierItem` are part of the startup callback API, they are ultimately validated together by the machine structure registration snapshot.

## Structure

[A_Modifier_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_Modifier_Machine.js) in the `server_scripts/structure/` directory:

```js
MMCREvents.server(event => {
    const api = event.getAPI()

    const structure = event.createStructure("mmcr_kubejs:kubejs_alloy_furnace")

    structure
        .pattern(['DXD', 'XIX', 'XXX'])
        .pattern(['XMX', 'I I', 'XMX'])
        .pattern(['DXD', 'XCX', 'XXX'])
        .set('X', api.block('minecraft:bricks'))
        .set('D', api.anyOf(
            api.block('minecraft:bricks'),
            api.anyOfUpgradeBus()// ← 允许在角落放升级总线
        ))
        .set('M', api.block('minecraft:blast_furnace'))
        // 把 'M' 字符提升为修饰器使用位：
        .modifier('M', api.modifierUse(
            'mmcr_kubejs:alloy_furnace_emerald_speedup',
            api.block('minecraft:emerald_block')    // 替换方块必须是绿宝石块
        ))
        .modifier('M', api.modifierUse(
            'mmcr_kubejs:alloy_furnace_lapis_doubling',
            api.block('minecraft:lapis_block')      // 替换方块必须是青金石块
        ))
        .set('I', api.anyOf(api.block('mmcr:item_input_bus'), api.block('mmcr:item_output_bus'), api.block('mmcr:energy_input_hatch')))
        .controller('C')
        .build()
})
```

### `.modifier(symbol, use)` Promotes a Character to a Modifier Use Site

```js
.modifier('M', api.modifierUse(
    'mmcr_kubejs:alloy_furnace_emerald_speedup',
    api.block('minecraft:emerald_block')
))
```

This is the modifier system's "use site" declaration.

`api.modifierUse(modifierId, replacement)` returns a [`ModifierUse`](../API/KubeJS#kubejsapi). Parameters:

- `modifierId`: Must already have been registered using `event.registerModifier(...)`.
- `replacement`: When a player places the corresponding block (an emerald block here) at this position in the structure, MMCR "activates" the corresponding modifier.

`.modifier('M', ...)` promotes the character `M` to a modifier use site.

For the same character `M`, multiple `.modifier(...)` calls can be chained; all these `ModifierUse` objects share the positions of `M`.

### Default Block + Modifier Replacement Blocks

```js
.set('M', api.block('minecraft:blast_furnace'))
.modifier('M', api.modifierUse('...', api.block('minecraft:emerald_block')))
```

The default block for `M` is `minecraft:blast_furnace` (a blast furnace).

When a player replaces this position with an emerald block, the modifier is activated.

**Note: The replacement block must be either an emerald block or a lapis block**. Placing other blocks here, such as diamond blocks, neither triggers a modifier nor allows the structure to form.

:::warning Note
For a modifier's `modifierUse`, the [API/KubeJS](../API/KubeJS#kubejsapi) explicitly prohibits passing `any()` as the "replacement block"; it must be a specific block predicate.
:::

### Corner Upgrade Hatches

```js
.set('D', api.anyOf(
    api.block('minecraft:bricks'),
    api.anyOfUpgradeBus()
))
```

`api.anyOfUpgradeBus()` is a union predicate for upgrade buses provided by [KubeJSApi](../API/KubeJS#kubejsapi), allowing players to place upgrade hatches at structure corners without breaking the structure.

### Ports and Controller

`I` is the union of item input / output / energy input, and `C` is the controller. This is handled the same way as in the blast furnace.

## Recipes

[A_Modifier_Machine.js](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_Modifier_Machine.js) in the `server_scripts/recipe/` directory:

```js
ServerEvents.recipes( event => {

    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_alloy_furnace',
        tick_time: 300,
        parallelized: true,
        requirements: [
            {
                type: 'minecraft:item',
                io: 'input',
                item: '#minecraft:swords',
                components: {
                    'minecraft:enchantments': {
                        'minecraft:sharpness': 2
                    }
                },
                count: 1,
                // consume_chance: 0.5  ← 输入物品消耗概率，默认 1
            },
            {
                type: 'minecraft:item',
                io: 'output',
                stack: {
                    id: 'minecraft:iron_ingot',
                    count: 2,
                    components: {
                        'minecraft:custom_name': {
                            text: 'What an amazing design!'
                        },
                        'minecraft:enchantments': {
                            'minecraft:sharpness': 3
                        }
                    }
                },
                // chance: 0.5  ← 输出概率，默认 1
            },
            {
                type: 'neoforge:energy',
                io: 'input',
                fe_per_tick: 10
            }
        ]
    })
})
```

### The Recipe Itself Has No Modifier Effects

This recipe takes "one sword with Sharpness II" and outputs "two iron ingots with a custom name + Sharpness III", taking 300 ticks at 10 FE/tick. **This is independent of modifiers**.

Modifier effects are dynamically applied while the recipe runs, based on the emerald blocks / lapis blocks actually placed in the structure.

If both `M` positions contain emerald blocks, the same-named modifier declared by this structure is counted only once, so duration is still multiplied by 0.5. During collection, the controller deduplicates by modifier name using `putIfAbsent`, rather than multiplying repeatedly for each position.

Modifiers with different IDs can stack; for example, one emerald block plus one lapis block can both speed up processing and increase output. If a design requires repeated stacking, explicitly create distinct modifier identities rather than assuming that placing more blocks with the same modifier name will automatically apply it repeatedly.

### Data-Driven Recipe Fields

The meanings of this recipe's fields are explained in detail in [Blast Furnace](blast-furnace).

This tutorial adds the use of `components` for data component matching on both input / output: any sword from `#minecraft:swords` + `sharpness: 2`, output with `custom_name` + `sharpness: 3`, and the two optional probability fields `consume_chance` / `chance`.

See [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) for the complete field table.

Recipes support hot reload.

## Special Mechanism: Modifier System

### The Roles of `allowModifiers` / `ModifierDefinition` / `ModifierUse` / `OutputPolicy`

The modifier system has four types of objects, each with its own responsibility:

| Object | Role | Phase |
| --- | --- | --- |
| `MachineBuilderJS.allowModifiers()` | **Switch**: Declares that this machine allows modifier positions in its structure | Startup phase |
| `ModifierDefinition` | **Definition**: An immutable set of modification rules (`duration` × 0.5, etc.) | Startup phase |
| `ModifierUse` | **Use site**: Declares on a structure character "which block placed here triggers which modifier" | Server phase (structure) |
| `OutputPolicy` | **Output policy**: Determines whether all output must be accepted (`REQUIRE_FULL`) or partial acceptance is allowed (`ALLOW_PARTIAL`) | Recipe runtime |

Relationships:

1. Startup phase: `.allowModifiers()` enables the machine's modifier support → `registerModifier(id, def)` registers the definition → `registerModifierItem(itemId, id)` registers the trigger item ID.
2. Server phase: `.modifier(symbol, modifierUse(id, replacement))` "attaches" the definition to the structure character `M`.
3. Runtime: The player places the corresponding block at an `M` position. MMCR recognizes that "a modifier is being used" and applies the definition's rules to the running recipe.
4. Output: When the recipe finishes and outputs its results, `OutputPolicy` determines "full acceptance" or "partial acceptance". This tutorial's recipe does not explicitly set it, so it uses the default `REQUIRE_FULL`.

### Multiple Modifiers Share the Same Character

```js
.set('M', api.block('minecraft:blast_furnace'))
.modifier('M', api.modifierUse('...emerald_speedup', api.block('minecraft:emerald_block')))
.modifier('M', api.modifierUse('...lapis_doubling', api.block('minecraft:lapis_block')))
```

The character `M` supports two types of modifier use sites simultaneously.

Placing an emerald block at an `M` position speeds up processing; placing a lapis block doubles output.

To obtain both speedup and doubling, use two `M` positions: place an emerald block in one and a lapis block in the other. The structure's middle layer has only two `M` positions, not four.

### The Relationship Between Modifiers and Recipes

Modifier effects are applied at recipe **runtime**, rather than being written into the recipe data itself. This means:

- The same modifier definition can be reused by multiple machine structures: `alloy_furnace_emerald_speedup` can be attached to `M` positions in alloy furnaces, distillation towers, and other machines.
- Different recipes in the same machine share modifier effects: the speedup modifier applies to all recipes rather than being configured per recipe.
- The blocks placed by the player determine the effect: placing the default blast furnace at `M` gives no modifier, while emerald blocks or lapis blocks can also be placed there; leaving it empty causes a structure mismatch.

This example's machine declares the `mmcr_kubejs:kubejs_alloy_furnace` recipe pool, and the recipe's `recipe_pool` is used for lookup in that pool. Although the JSON specifies `parallelized: true`, the machine does not enable `allowParallelism()`, so this field alone does not allow this example to use parallel controllers. Input `components` match component values, while output `stack.components` are actually written to the resulting items. Input consumption probability and output probability are specified by `consume_chance` and `chance`, respectively, both defaulting to 1; an input probability of 0 means the item must still be present but is not consumed.

## Implementation References

- [KubeJSApi: Modifier Values, Definitions, and Replacement Predicate Conversion](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java)
- [MMCRStartupEventJS: Startup Registration Entry Points](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MMCRStartupEventJS.java)
- [MachineModifier: Targets, Probability, and Combined Operations](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/modifier/MachineModifier.java)
- [MachineControllerBlockEntity: Same-Name Deduplication in collectFoundModifiers](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/tile/MachineControllerBlockEntity.java#L2914-L2934)
- [JSON Parser](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/MachineRecipeJson.java) / [Item Requirement Codec](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/requirement/ItemRequirement.java)

## Further Reading

- [API/KubeJS#machinebuilderjs](../API/KubeJS#machinebuilderjs) — Machine-level switches such as `.allowModifiers()`.
- [KubeJS API Modifiers and Tiers](../API/KubeJS#kubejsapi) — `MachineModifier` parameters and `ModifierDefinition` construction methods.
- [Java `Modifiers`](../API/JavaAPI#modifiers) — Modifier collections and target definitions.
- [API/KubeJS#modifierusestring-modifierid-blockpredicate-replacement--modifieruse](../API/KubeJS#kubejsapi) — Declaring "use sites" in structures.
- [API/KubeJS#registermodifierstring-id-modifierdefinition-definition--void](../API/KubeJS#mmcrstartupeventjs) — Registering modifiers during startup.
- [API/KubeJS#registermodifieritemitemstack-stack-string-modifierid--void](../API/KubeJS#mmcrstartupeventjs) — Binding trigger items during startup.
- [API/KubeJS#machinestructurebuilderjs](../API/KubeJS#machinestructurebuilderjs) — Structure-layer `.modifier(symbol, use)`.
- [API/KubeJS#machinerecipeschema](../API/KubeJS#machinerecipeschema) — The complete set of data-driven recipe fields.
