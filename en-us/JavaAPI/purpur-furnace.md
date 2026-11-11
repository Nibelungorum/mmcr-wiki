---
title: Purpur Furnace
order: 5
---

# Purpur Furnace

The purpur furnace uses **smart interfaces** as runtime regulators: the integer `mode` selects recipes, the float `conversation` adds recipe filtering conditions, and both adjust energy consumption and duration through value mappings. The interface name `conversation` follows the source spelling and must not be changed to another name.

This document is based on [PURPUR_FURNACE.java (0b4e5f32)](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/0b4e5f32265a19314bfca1134b74450f7d2e9018/src/main/java/org/nibelungorum/builtin/PURPUR_FURNACE.java).

## Entry Points and Type Signatures

| Type / Method | Signatures and Results Used in This Example | API Reference |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)`; `build()` → `MachineSpec` | [Reference](../API/JavaAPI#machinedraft) |
| `SmartInterfaces` | `type(String, float min, float max, int priority, ValueType)` → `SmartInterfaceSpec`; defaults to floating-point values when the value type is omitted | [Reference](../API/JavaAPI#smartinterfaces-and-smartinterfacespec) |
| `Modifiers` | `smartEnergy(String, DoubleUnaryOperator, ModifierOperation)` / `smartDuration(String, DoubleUnaryOperator, ModifierOperation)` → `SmartModifierSpec` | [Reference](../API/JavaAPI#modifiers) |
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
                .smartInterfaceModifier(Modifiers.smartEnergy("mode",
                        value -> Math.pow(2D, value - 1D), ModifierOperation.MULTIPLY))
                .smartInterfaceModifier(Modifiers.smartDuration("conversation",
                        value -> value <= 0.5D ? 1D + value : 0.5D + 2D * value,
                        ModifierOperation.MULTIPLY))
                .runningSound(Identifier.parse("minecraft:block.furnace.fire_crackle"))
                .finishSound(Identifier.parse("minecraft:entity.ender_dragon.growl"))
                .build();
        event.registerMachine(machine);
    }
}
```

`SmartInterfaces.type(...)` declares the interface value specifications: `mode` has a range of 1–3, a priority of 1, and an integer value type; `conversation` has a range of 0–1, a priority of 0, and the default floating-point value type. `maxParallelism(32).parallelizable(true)` declares the machine's parallel processing settings. The running and completion sounds are set to furnace crackling and the Ender Dragon's growl, respectively.

### Calculate Modifier Values Explicitly with Functions

`Modifiers.smartEnergy` and `smartDuration` now each take an interface name, a `DoubleUnaryOperator` function, and an operation enum. The function receives the actual interface value and returns an operand. This example uses `MULTIPLY`, so the result is a multiplier, not the final energy consumption or duration. The library no longer interpolates or clamps automatically; the function itself defines any piecewise logic.

| Rule | Function | Example Input → Multiplier |
| --- | --- | --- |
| Energy | `Math.pow(2D, value - 1D)` | `mode=1/2/3` → `1/2/4` |
| Duration | `value <= 0.5D ? 1D + value : 0.5D + 2D * value` | `conversation=0/0.5/1` → `1/1.5/2.5` |

With one smart interface providing these values, a base duration of 200 ticks becomes 200 / 300 / 500 ticks, respectively. `conversation=1` only illustrates the function's result; it does not mean that the third recipe's `[0, 0.31]` filter permits that value.

:::warning Migration and Evaluation
The old six-parameter endpoint overloads have been removed. The new energy and duration rules each use a single declaration, so they no longer produce the old example's stacked multipliers of `2/4/8` and `1.5/2.25/3.75`. A single function can have mutually exclusive branches, but additional function declarations and modifiers from other interface blocks still stack.

Functions must depend only on the input value and return a finite number. They are not executed during registration; the controller evaluates them when refreshing modifiers, not necessarily every tick. If an individual function returns a nonfinite value or throws `RuntimeException`, the controller logs an error, skips that rule, and continues with the others. No modifier is generated without an interface component providing a value of the corresponding type.
:::

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
                                .where('X', block(Identifier.parse("minecraft:end_stone_bricks")))
                                .where('A', state("minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('B', state("minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]"))
                                .where('D', state("minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('E', block(Identifier.parse("minecraft:end_stone_brick_slab")))
                                .where('F', state("minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=inner_right,waterlogged=false]"))
                                .where('G', state("minecraft:end_stone_brick_stairs[facing=south,half=bottom,shape=inner_right,waterlogged=false]"))
                                .where('H', any(
                                        block(Identifier.parse("minecraft:purpur_pillar")),
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput(),
                                        BlockConditions.parallelControllers(),
                                        BlockConditions.smartInterface()
                                ))
                                .where('I', block(Identifier.parse("minecraft:purple_terracotta")))
                                .where('J', block(Identifier.parse("minecraft:purpur_block")))
                                .where('K', state("minecraft:purpur_stairs[facing=south,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('L', state("minecraft:purpur_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]"))
                                .where('M', state("minecraft:purpur_stairs[facing=west,half=bottom,shape=outer_left,waterlogged=false]"))
                                .where('N', state("minecraft:end_stone_brick_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]"))
                                .where('O', state("minecraft:end_stone_brick_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]"))
                                .where('P', state("minecraft:purpur_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]"))
                                .where('Q', state("minecraft:purpur_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]"))
                                .where('R', block(Identifier.parse("minecraft:purpur_slab")))
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

Requirement matching and value mapping do not replace each other: each recipe declares its own interface conditions, while the machine declares shared function-based modifier rules. A piecewise function selects only its own branch; it does not prevent modifiers from other functions or interfaces from stacking. Calculate the results first, then design modes that players can understand.

## Further Reading

- [SmartInterfaces](../API/JavaAPI#smartinterfaces-and-smartinterfacespec) / [SmartInterfaceSpec](../API/JavaAPI#smartinterfaces-and-smartinterfacespec): Interface specifications and value types.
- [Modifiers](../API/JavaAPI#modifiers) / [SmartModifierSpec](../API/JavaAPI#modifier-views-and-enumerations): Mapping rules and operation enums.
- [Requirements](../API/JavaAPI#requirements) / [SmartInterfaceRequirementSpec](../API/JavaAPI#requirementspec-and-built-in-requirement-views): Single-value and range requirements for recipes.
- [StructureDraft](../API/JavaAPI#structuredraft-and-structurespec): State-sensitive configuration and structure stages.
