---
title: Reactor
order: 8
---

# Reactor

The reactor demonstrates a **state-sensitive structure** and item, fluid, and energy IO. It also has a noteworthy structure/recipe mismatch: the second recipe requires energy input, while the structure provides no energy-input port condition.

## Entry Points and Type Signatures

| Type / method | Signature and purpose | API reference |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)`; `build()` → `MachineSpec` | [Reference](../API/JavaAPI#machinedraft) |
| `AppearanceOptions` | `appearance(Consumer<AppearanceOptions>)` | [Reference](../API/JavaAPI#appearanceoptions) |
| `Structures` / `StructureDraft` | `stateSensitive()`; `fullStructure(Consumer<StructureStageDraft>)`; `build(Identifier)` → `StructureSpec` | [Reference](../API/JavaAPI#structuredraft-and-structurespec) |
| `PatternDraft` / `BlockConditions` | `where(char, BlockCondition)`; `state(String)` | [Patterns](../API/JavaAPI#patterndraft-and-patternspec), [conditions](../API/JavaAPI#blockconditions-and-blockcondition) |
| `Recipes` / `RecipeDraft` | `inputFluid(Fluid, int)`, `outputFluid(Fluid, int)`, `inputEnergy(long)`, `outputEnergy(long)` | [Reference](../API/JavaAPI#recipedraft) |
| `FluidRequirementSpec` / `EnergyRequirementSpec` | Inputs and outputs are stored as separate requirement entries; `build()` produces `RecipeSpec` | [Fluids](../API/JavaAPI#requirementspec-and-built-in-requirement-views), [energy](../API/JavaAPI#requirementspec-and-built-in-requirement-views) |
| Registration events | `RegisterMachineDefinitionsEvent`, `RegisterMachineStructuresEvent`, `RegisterMachineRecipesEvent` | [Definitions](../API/JavaAPI#registermachinedefinitionsevent-and-machineregistrar), [structures](../API/JavaAPI#registermachinestructuresevent-and-structureregistrar), [recipes](../API/JavaAPI#registermachinerecipesevent-and-reciperegistrar) |

## Machine Definition

```java
private static final Identifier REACTOR = id("reactor");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(REACTOR)) {
        MachineSpec machine = Machines
                .machine(REACTOR)
                .recipePool(REACTOR)
                .displayNameKey("machine.mmcr.reactor")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:blue_ice")))
                .build();
        event.registerMachine(machine);
    }
}
```

Blue ice is the unformed theme block. `recipePool(REACTOR)` explicitly declares the recipe pool; the machine definition does not additionally enable parallelism, multithreading, or modifiers.

## Complete State-Sensitive Structure

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(REACTOR)) {
        StructureSpec structure = Structures
                .structure()
                .stateSensitive()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer()
                                // ...省略
                                .where()
                                // ...省略
                                .controller('C')
                        )
                )
                .build(REACTOR);
        event.registerStructure(structure);
    }
}
```

### State Sensitivity Does Not Fix Every Character's State

The pattern has 9 slices, each 8 rows by 9 columns; spaces are unbound and ignore their corresponding world positions.

Structure state matching is disabled by default. This example calls `stateSensitive()` on `StructureDraft`, making properties declared with `state(...)` participate in matching. Stair `facing`, `half`, `shape`, and `waterlogged` therefore have real constraints rather than being preview decorations only.

The source has 19 `state(...)` bindings; character `a` still uses `block(Blocks.POLISHED_DEEPSLATE_STAIRS)`, constraining only the block type. Enabling state sensitivity does not automatically turn every `block(...)` into default-state matching.

Compare [Amethyst Furnace](purpur-furnace): it also writes stair states, but does not call `stateSensitive()`, so matching does not enforce those state properties.

### Port Set

The union condition for `X` allows item input/output, fluid input/output, energy **output**, or blue ice. Its public calls are `BlockConditions.itemInput()`, `itemOutput()`, `fluidInput()`, `fluidOutput()`, and `energyOutput()`; no internal port-condition aliases are needed.

`N` is an emerald block and `O` is a lapis lazuli block; other non-stair decorations include polished deepslate, black stained glass, deepslate brick slabs, deepslate tiles, and lightning rods. Decoration conditions and port conditions do not substitute for each other.

## Two Recipes

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(REACTOR.withSuffix("_recipe_1"))
            .recipePool(REACTOR)
            .inputItem(Items.APPLE, 3)
            .inputFluid(Fluids.WATER, 1)
            .outputItem(Items.DIAMOND, 10)
            .outputFluid(Fluids.LAVA, 250)
            .outputEnergy(200)
            .duration(300)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(REACTOR.withSuffix("_recipe_2"))
            .recipePool(REACTOR)
            .inputItem(Items.GOLDEN_APPLE, 2)
            .inputFluid(Fluids.WATER, 800)
            .outputItem(Items.GOLD_INGOT, 2)
            .outputFluid(Fluids.LAVA, 450)
            .inputEnergy(10)
            .outputEnergy(200)
            .duration(200)
            .build();
    event.registerRecipe(recipe);
}
```

### Basic Parameters

| Item | Recipe 1 | Recipe 2 |
| --- | --- | --- |
| Item input | 3 apples | 2 golden apples |
| Fluid input | 1 mB water | 800 mB water |
| Item output | 10 diamonds | 2 gold ingots |
| Fluid output | **250 mB lava** | **450 mB lava** |
| Energy input | None | 10 FE/t |
| Energy output | 200 FE/t | 200 FE/t |
| Duration | 300 ticks (15 seconds) | 200 ticks (10 seconds) |

Fluid inputs and outputs are separate entries. This example consumes water and outputs lava, not the same fluid in and out. One bucket equals 1000 mB; energy declarations are per tick, not the total for the whole recipe.

### Coexisting Energy Input and Output

`inputEnergy(long)` and `outputEnergy(long)` each create an `EnergyRequirementSpec`, and may legally appear in the same recipe. The second recipe nominally has a net output of 190 FE/t, but its input and output are still checked and performed separately; the two declarations cannot be simplified to `outputEnergy(190)`, because the net value does not remove the input-supply requirement.

Although `RecipeDraft` parameters are `long`, current ordinary energy declarations require positive values and are limited to the `Integer.MAX_VALUE` range; fluid amounts use positive integer mB values. `Recipes.recipe(...)`'s `build()` returns `RecipeSpec`, and the event can register multiple rules under different recipe IDs.

## Runtime Limitation in the Source

:::warning
The second recipe calls `inputEnergy(10)`, but the `X` union in the structure has no `BlockConditions.energyInput()`. Under this builtin structure declaration, no energy-input port can be installed at a valid port position, so recipe 2 lacks the ordinary energy input source it requires.

This tutorial retains this source fact. If copying it as your own runnable example, design energy-input installation positions as well. Viewing only its "net generation of 190 FE/t" cannot ignore the 10 FE/t input condition.
:::

## Further Reading

- [StructureDraft](../API/JavaAPI#structuredraft-and-structurespec): state-sensitive options.
- [BlockConditions](../API/JavaAPI#blockconditions-and-blockcondition): the difference between `state(...)` and `block(...)`.
- [RecipeDraft](../API/JavaAPI#recipedraft): item, fluid, energy declarations, and behavior options.
- [FluidRequirementSpec](../API/JavaAPI#requirementspec-and-built-in-requirement-views) / [EnergyRequirementSpec](../API/JavaAPI#requirementspec-and-built-in-requirement-views): directional IO requirements.
