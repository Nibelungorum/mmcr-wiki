---
title: Cracker
order: 3
---

# Cracker

The Cracker demonstrates **custom controller options**, a four-slice structure, and **mixed item / fluid outputs**.

## Entry Points and Type Signatures

| Type / Method | Signature Used in This Example | API Reference |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)`; `build()` → `MachineSpec` | [Reference](../API/JavaAPI#machinedraft) |
| `ControllerOptions` | `controller(Consumer<ControllerOptions>)` configures the ID and facing | [Reference](../API/JavaAPI#controlleroptions) |
| `Structures` / `StructureDraft` | `structure()`; `build(Identifier)` → `StructureSpec` | [Reference](../API/JavaAPI#structuredraft-and-structurespec) |
| `StructureStageDraft` / `PatternDraft` | `pattern(Consumer<PatternDraft>)`; `layer(String...)` | [Stage](../API/JavaAPI#structurestagedraft-and-structurestagespec), [Pattern](../API/JavaAPI#patterndraft-and-patternspec) |
| `BlockConditions` | `any(BlockCondition...)`, plus item / fluid / energy port conditions | [Reference](../API/JavaAPI#blockconditions-and-blockcondition) |
| `PortTierLimits` | `portTiers(Consumer<PortTierLimits.Builder>)` | [Reference](../API/JavaAPI#porttierlimits) |
| `Recipes` / `RecipeDraft` | `outputFluid(Fluid, int)`; `inputFluid(Fluid, int)`; `build()` → `RecipeSpec` | [Reference](../API/JavaAPI#recipedraft) |
| Registration events | `RegisterMachineDefinitionsEvent`, `RegisterMachineStructuresEvent`, `RegisterMachineRecipesEvent` | [Definitions](../API/JavaAPI#registermachinedefinitionsevent-and-machineregistrar), [Structures](../API/JavaAPI#registermachinestructuresevent-and-structureregistrar), [Recipes](../API/JavaAPI#registermachinerecipesevent-and-reciperegistrar) |

## Machine Definition and Controller

```java
private static final Identifier CRACKER = id("cracker");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(CRACKER)) {
        MachineSpec machine = Machines
                .machine(CRACKER)
                .recipePool(CRACKER)
                .displayNameKey("machine.mmcr.cracker")
                .controller(c -> c
                        .id(CRACKER.withSuffix("_controller"))
                        .allowVerticalFacing(true)
                        .fullyRotationallySymmetric(true)
                )
                .build();
        event.registerMachine(machine);
    }
}
```

- `id(...)` explicitly sets the controller block ID to `mmcr:cracker_controller`; it and the machine ID `mmcr:cracker` are two distinct identifiers.
- `allowVerticalFacing(true)` allows upward / downward facing in addition to the default horizontal facing; it does not force vertical placement.
- `fullyRotationallySymmetric(true)` declares a fully rotationally symmetric controller appearance. Do not infer from “the same texture” that the structure can bypass facing matching; structure coordinates are still transformed according to placement orientation.
- `recipePool(CRACKER)` binds the machine to the Cracker recipe pool.

`controller(...)` accepts `Consumer<ControllerOptions>`; configure the library-provided object in the callback, without creating or returning a builder. The machine's `build()` returns `MachineSpec`. For a contrast that forces vertical placement, see [Monster Farm](mob-farm).

## Multiblock Structure

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(CRACKER)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("AAA", "AAA", "AAA")
                                .layer("XBX", "B B", "XBX")
                                .layer("XDX", "D D", "XDX")
                                .layer("XEX", "ECE", "XEX")
                                .where('X', block(Blocks.POLISHED_DIORITE))
                                .where('A', block(Blocks.POLISHED_ANDESITE))
                                .where('B', any(
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.fluidOutput(),
                                        BlockConditions.energyInput(),
                                        block(Blocks.BONE_BLOCK)
                                ))
                                .where('D', block(Blocks.BLUE_ICE))
                                .where('E', block(Blocks.LAPIS_BLOCK))
                                .controller('C')
                        )
                        .portTiers(t -> t
                                .minEnergyInput(PortTierLimits.EnergyTier.NORMAL)
                                .minItemInput(PortTierLimits.ItemTier.NORMAL)
                                .anyItemOutput()
                        )
                )
                .build(CRACKER);
        event.registerStructure(structure);
    }
}
```

All four slices are 3x3. `A` is polished andesite, `X` is polished diorite, `D` is blue ice, and `E` is a lapis block. The `B` positions in the second slice are bone blocks or port mounting positions: they can hold item input, item output, fluid output, and energy input ports. `C` binds this machine's controller, and spaces are ignored positions.

The row count and row width of all `layer(...)` calls must be consistent; adding a row directly cannot make one slice taller. For more complex appearances, pad with blank rows of the uniform size; see [Purpur Furnace](purpur-furnace).

### Port Tiers and Port Types

`portTiers(...)` declares that energy input and item input are at least `NORMAL`, while item output has no tier limit. Item tiers are `TINY → SMALL → NORMAL → REINFORCED → BIG → HUGE → LUDICROUS`; fluid tiers additionally include `VACUUM`, and energy tiers additionally include `ULTIMATE`.

Tier requirements do not change the set of blocks allowed by the pattern. Even if a lower-tier port matches its corresponding position, it must not be considered to meet the machine's operating requirements. Conversely, adding a tier declaration such as `anyFluidInput()` does not create a fluid input mounting position out of thin air.

This example permits fluid **output**, but the `B` condition does not permit fluid **input**. When modifying the recipe to add fluid input, also add `BlockConditions.fluidInput()` to the structure; writing only the recipe method is insufficient to let this structure accept water.

## Mixed Item and Fluid Outputs

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(CRACKER.withSuffix("_recipe_1"))
            .recipePool(CRACKER)
            .inputItem(Ingredient.of(Items.LAPIS_LAZULI), 8)
            .inputItem(Items.COAL, 1)
            .outputFluid(Fluids.WATER, 500)
            .outputItem(Items.DIAMOND, 2)
            .inputEnergy(20)
            .duration(240)
            .build();
    event.registerRecipe(recipe);
}
```

Base processing: 8 lapis lazuli + 1 coal → 500 mB water + 2 diamonds, at 20 FE/t for 240 ticks (12 seconds).

- `Ingredient.of(...)` is a vanilla item condition that can be extended with multiple candidate items; simple inputs can also use `inputItem(Item, int)`.
- The quantity unit for `outputFluid(Fluid, int)` is mB; 1 bucket = 1000 mB.
- Repeated calls to input / output methods append their respective requirements and do not overwrite the previous output.
- `inputFluid(Fluids.WATER, amount)` can declare fluid input and requires matching structure mounting positions and available resources.
- `build()` returns `RecipeSpec` and submits it in `RegisterMachineRecipesEvent`. Duplicate checks apply to the recipe ID, not the machine ID.

## Summary

The Cracker declares controller options, block conditions, tier requirements, and processing IO separately: the controller is configured by [ControllerOptions](../API/JavaAPI#controlleroptions); the pattern by [PatternDraft](../API/JavaAPI#patterndraft-and-patternspec); port conditions come from [BlockConditions](../API/JavaAPI#blockconditions-and-blockcondition); and recipe IO comes from [RecipeDraft](../API/JavaAPI#recipedraft). When extending either side, verify that the other side actually provides the corresponding port.
