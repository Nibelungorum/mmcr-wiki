---
title: Purpur Furnace
order: 5
---

# Purpur Furnace

The purpur furnace uses **smart interfaces** as runtime regulators: the integer `mode` selects recipes, the float `conversation` adds recipe filtering conditions, and both adjust energy consumption and duration through value mappings. The interface name `conversation` follows the source spelling and must not be changed to another name.

This document is based on [PURPUR_FURNACE.java (f234477b)](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/builtin/PURPUR_FURNACE.java).

## Entry Points and Type Signatures

| Type / Method | Signatures and Results Used in This Example | API Reference |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)`; `build()` → `MachineSpec` | [Reference](../API/JavaAPI#machinedraft) |
| `SmartInterfaces` | `type(String, float min, float max, int priority, ValueType)` → `SmartInterfaceSpec`; defaults to floating-point values when the value type is omitted | [Reference](../API/JavaAPI#smartinterfaces-and-smartinterfacespec) |
| `Modifiers` | `smartEnergy(...)` / `smartDuration(...)` → `SmartModifierSpec` | [Reference](../API/JavaAPI#modifiers) |
| `MachineDraft` | `smartInterface(SmartInterfaceSpec)`; `smartInterfaceModifier(SmartModifierSpec)` | [Reference](../API/JavaAPI#smartinterfaces-and-smartinterfacespec) |
| `Structures` / `StructureDraft` | `fullStructure(Consumer<StructureStageDraft>)`; `build(Identifier)` → `StructureSpec` | [Reference](../API/JavaAPI#structuredraft-and-structurespec) |
| `PatternDraft` / `BlockConditions` | `where(char, BlockCondition)`; `state(String)`; `smartInterface()` | [Patterns](../API/JavaAPI#patterndraft-and-patternspec), [Conditions](../API/JavaAPI#blockconditions-and-blockcondition) |
| `Recipes` / `RecipeDraft` | `smartInterface(SmartInterfaceRequirementSpec)`; `build()` → `RecipeSpec` | [Reference](../API/JavaAPI#recipedraft) |
| `Requirements` | `smartInput(String, float)` / `smartInput(String, float, float)` | [Reference](../API/JavaAPI#requirements) |
| Registration events | `RegisterMachineDefinitionsEvent`, `RegisterMachineStructuresEvent`, `RegisterMachineRecipesEvent` | [Definitions](../API/JavaAPI#registermachinedefinitionsevent-and-machineregistrar), [Structures](../API/JavaAPI#registermachinestructuresevent-and-structureregistrar), [Recipes](../API/JavaAPI#registermachinerecipesevent-and-reciperegistrar) |

## Machine Definition

```java
private static final Identifier PURPUR_FURNACE = id("purpur_furnace");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(PURPUR_FURNACE)) {
        MachineSpec machine = Machines
                .machine(PURPUR_FURNACE)
                .recipePool(PURPUR_FURNACE)
                .displayNameKey("machine.mmcr.purpur_furnace")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("end_stone_bricks")))
                .maxParallelism(32).parallelizable(true)
                .smartInterface(SmartInterfaces.type("mode", 1F, 3F, 1, SmartInterfaces.ValueType.INTEGER))
                .smartInterface(SmartInterfaces.type("conversation", 0F, 1F, 0))
                .smartInterfaceModifier(Modifiers.smartEnergy("mode", 1F, 2F, 1F, 2F, ModifierOperation.MULTIPLY))
                .smartInterfaceModifier(Modifiers.smartEnergy("mode", 2F, 3F, 2F, 4F, ModifierOperation.MULTIPLY))
                .smartInterfaceModifier(Modifiers.smartDuration("conversation", 0F, .5F, 1F, 1.5F, ModifierOperation.MULTIPLY))
                .smartInterfaceModifier(Modifiers.smartDuration("conversation", .5F, 1F, 1.5F, 2.5F, ModifierOperation.MULTIPLY))
                .runningSound(Identifier.parse("minecraft:block.furnace.fire_crackle"))
                .finishSound(Identifier.parse("minecraft:entity.ender_dragon.growl"))
                .build();
        event.registerMachine(machine);
    }
}
```

`SmartInterfaces.type(...)` declares the interface value specifications: `mode` has a range of 1–3, a priority of 1, and an integer value type; `conversation` has a range of 0–1, a priority of 0, and the default floating-point value type. `maxParallelism(32).parallelizable(true)` declares the machine's parallel processing settings. The running and completion sounds are set to furnace crackling and the Ender Dragon's growl, respectively.

### Smart Mappings Interpolate and Then Stack Individually

The parameters for `Modifiers.smartEnergy` and `smartDuration` are the interface name, the range minimum, the range maximum, the mapped value at the minimum endpoint, the mapped value at the maximum endpoint, and the operation enum. Each mapping interpolates linearly within its own range and clamps to the endpoint values outside that range.

| Rule | Input Range | Mapped Values |
| --- | --- | --- |
| First energy rule | `mode` 1–2 | 1 → 2 |
| Second energy rule | `mode` 2–3 | 2 → 4 |
| First duration rule | `conversation` 0–0.5 | 1 → 1.5 |
| Second duration rule | `conversation` 0.5–1 | 1.5 → 2.5 |

:::warning
These four declarations do not mean that only the rule whose range contains the value applies. The current implementation generates a modifier for each rule for each smart interface it finds. Values outside a rule's range still map to an endpoint value, and all multiplication rules then stack.

With only one smart interface providing these values, the two energy rules produce combined multipliers of **2 / 4 / 8** for `mode=1/2/3`, respectively. The two duration rules produce combined multipliers of **1.5 / 2.25 / 3.75** for `conversation=0/0.5/1`, respectively. If the structure contains multiple smart interfaces providing the same values, the modifiers from each interface also stack, so the single-interface results no longer apply.
:::

Although the declared ranges appear to meet at their endpoints, they must not be described as mutually exclusive branches of a piecewise function. The mappings depend on the presence of an interface and its current values; these modifiers are not applied without the corresponding interface component.

## Complete Structure

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(PURPUR_FURNACE)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer(" ABBBD ", "       ", "       ", "       ", "  EEE  ", "       ", "       ", "       ")
                                .layer("AFXXXGD", "  HHH  ", "  III  ", "  JJJ  ", " EHHHE ", " KLLLM ", "       ", "       ")
                                .layer("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PXXXQ ", "  EHE  ", "   R   ")
                                .layer("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PX XQ ", "  H H  ", "  R R  ")
                                .layer("NXXXXXO", " H   H ", " I   I ", " J   J ", "EH   HE", " PXXXQ ", "  EHE  ", "   R   ")
                                .layer("STXXXUV", "  HCH  ", "  III  ", "  JJJ  ", " EHHHE ", " WYYYZ ", "       ", "       ")
                                .layer(" abbbV ", "       ", "       ", "       ", "  EEE  ", "       ", "       ", "       ")
                                .where('X', block("minecraft:end_stone_bricks"))
                                .where('A', state("minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('B', state("minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]"))
                                .where('D', state("minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('E', block("minecraft:end_stone_brick_slab"))
                                .where('F', state("minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=inner_right,waterlogged=false]"))
                                .where('G', state("minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=inner_right,waterlogged=false]"))
                                .where('H', any(
                                        block("minecraft:purpur_pillar"),
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput(),
                                        BlockConditions.parallelControllers(),
                                        BlockConditions.smartInterface()
                                ))
                                .where('I', block("minecraft:purple_terracotta"))
                                .where('J', block("minecraft:purpur_block"))
                                .where('K', state("minecraft:purpur_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('L', state("minecraft:purpur_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]"))
                                .where('M', state("minecraft:purpur_stairs[facing=west,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('N', state("minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]"))
                                .where('O', state("minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]"))
                                .where('P', state("minecraft:purpur_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]"))
                                .where('Q', state("minecraft:purpur_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]"))
                                .where('R', block("minecraft:purpur_slab"))
                                .where('S', state("minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=outer_right,waterlogged=false]"))
                                .where('T', state("minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=inner_right,waterlogged=false]"))
                                .where('U', state("minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=inner_left,waterlogged=false]"))
                                .where('V', state("minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=outer_right,waterlogged=false]"))
                                .where('W', state("minecraft:purpur_stairs[facing=east,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('Y', state("minecraft:purpur_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]"))
                                .where('Z', state("minecraft:purpur_stairs[facing=north,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('a', state("minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('b', state("minecraft:end_stone_brick_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]"))
                                .controller('C')
                        )
                )
                .build(PURPUR_FURNACE);
        event.registerStructure(structure);
    }
}
```

The structure has seven slices, each with 8 rows × 7 columns. Blank rows keep the dimensions consistent. Spaces have no assigned condition, so those positions are ignored. `H` accepts purpur pillars, item inputs and outputs, energy inputs, parallel controllers, and smart interfaces. The other characters are assigned to decorative blocks or stair states.

`BlockConditions.smartInterface()` allows actual smart interface blocks to be included in the structure's component set. The machine's `SmartInterfaces.type(...)` declaration only specifies configurable values; it does not replace a position where an interface can be installed. Players set the values through the smart interface's configuration screen, so this should not be described as a regulator that the controller always has built in.

Structures are state-insensitive by default, so the properties in the stairs' `state(...)` declarations specify their preview and building states; actual matching ignores state properties. This example does not call `stateSensitive()`. To enforce checks for properties such as facing, top or bottom half, and shape, see [Reactor](reactor).

## Three Recipes and Smart Requirements

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(PURPUR_FURNACE.withSuffix("_recipe_1"))
            .recipePool(PURPUR_FURNACE)
            .inputItem(Ingredient.of(Items.IRON_INGOT), 1)
            .outputItem(Items.IRON_NUGGET, 10)
            .inputEnergy(20)
            .smartInterface(smartInput("mode", 1))
            .duration(200)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(PURPUR_FURNACE.withSuffix("_recipe_2"))
            .recipePool(PURPUR_FURNACE)
            .inputItem(Ingredient.of(Items.IRON_INGOT), 1)
            .outputItem(Items.GOLD_NUGGET, 10)
            .inputEnergy(20)
            .smartInterface(smartInput("mode", 2))
            .duration(200)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(PURPUR_FURNACE.withSuffix("_recipe_3"))
            .recipePool(PURPUR_FURNACE)
            .inputItem(Ingredient.of(Items.APPLE), 1)
            .outputItem(Items.DIAMOND, 2)
            .inputEnergy(40)
            .smartInterface(smartInput("mode", 3))
            .smartInterface(smartInput("conversation", 0f, 0.31f))
            .duration(200)
            .build();
    event.registerRecipe(recipe);
}
```

`smartInput(...)` is statically imported from `publicapi.recipe.requirement.Requirements` and returns a `SmartInterfaceRequirementSpec`. The single-value overload requires `min == max == value`; the range overload requires the value to fall within the specified range.

| Recipe | Base Input → Output | Base Energy Consumption | Interface Conditions |
| --- | --- | --- | --- |
| `_recipe_1` | 1 iron ingot → 10 iron nuggets | 20 FE/t | `mode=1` |
| `_recipe_2` | 1 iron ingot → 10 gold nuggets | 20 FE/t | `mode=2` |
| `_recipe_3` | 1 apple → 2 diamonds | 40 FE/t | `mode=3` and `conversation ∈ [0, 0.31]` |

All three recipes have a base duration of 200 ticks. The third recipe still meets its inclusive range requirement at `conversation=0.31`, but not above that value. Its duration modifiers are still calculated using the mappings declared by the machine.

## Two Independent Runtime Steps

1. The player installs and configures smart interfaces, and the structure scan collects the interface components.
2. Recipe matching uses `smartInput(...)` to check the current values and select a recipe that meets the conditions, ingredient requirements, and port requirements.
3. The machine's declared smart mappings convert interface values into modifiers, applying energy and duration adjustments rule by rule.

Requirement matching and value mapping do not replace each other: each recipe declares its own interface conditions, while the machine declares the shared modifier rules. Stacking across multiple ranges or interfaces affects the actual values. Calculate the results first, then design modes that players can understand.

## Further Reading

- [SmartInterfaces](../API/JavaAPI#smartinterfaces-and-smartinterfacespec) / [SmartInterfaceSpec](../API/JavaAPI#smartinterfaces-and-smartinterfacespec): Interface specifications and value types.
- [Modifiers](../API/JavaAPI#modifiers) / [SmartModifierSpec](../API/JavaAPI#modifier-views-and-enumerations): Mapping rules and operation enums.
- [Requirements](../API/JavaAPI#requirements) / [SmartInterfaceRequirementSpec](../API/JavaAPI#requirementspec-and-built-in-requirement-views): Single-value and range requirements for recipes.
- [StructureDraft](../API/JavaAPI#structuredraft-and-structurespec): State-sensitive configuration and structure stages.
