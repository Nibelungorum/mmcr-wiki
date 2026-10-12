---
title: Alloy Furnace
order: 2
---

# Alloy Furnace

The Alloy Furnace demonstrates **structure modifiers**: replacing vanilla blast furnaces in the structure with diamond blocks reduces recipe time, while replacing them with gold blocks increases output.

## Entry Points and Type Signatures

| Type / Method | Signature and Responsibility | API Reference |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)` → draft; `build()` → `MachineSpec` | [Reference](../API/JavaAPI#machinedraft) |
| `Structures` / `StructureDraft` | `structure()` → draft; `build(Identifier)` → `StructureSpec` | [Reference](../API/JavaAPI#structuredraft-and-structurespec) |
| `Recipes` / `RecipeDraft` | `recipe(Identifier)` → draft; `build()` → `RecipeSpec` | [Reference](../API/JavaAPI#recipedraft) |
| `AppearanceOptions` | `appearance(Consumer<AppearanceOptions>)` | [Reference](../API/JavaAPI#appearanceoptions) |
| `Modifiers` | `numeric(String, ModifierScope, double, ModifierOperation, boolean)` → `NumericModifierSpec` | [Reference](../API/JavaAPI#modifiers) |
| `ModifierBundle` | `Modifiers.bundle(ModifierSpec...)` returns a registrable rule set | [Reference](../API/JavaAPI#modifier-views-and-enumerations) |
| `StructureConstraints.Builder` | `modifier(char, Identifier, BlockCondition)` declares a replacement position | [Reference](../API/JavaAPI#structureconstraints) |
| `BlockConditions` / `PatternDraft` | `where(char, BlockCondition)` binds a character | [Conditions](../API/JavaAPI#blockconditions-and-blockcondition), [Pattern](../API/JavaAPI#patterndraft-and-patternspec) |
| Registration events | `RegisterMachineDefinitionsEvent`, `RegisterMachineStructuresEvent`, `RegisterMachineRecipesEvent` | [Definitions](../API/JavaAPI#registermachinedefinitionsevent-and-machineregistrar), [Structures](../API/JavaAPI#registermachinestructuresevent-and-structureregistrar), [Recipes](../API/JavaAPI#registermachinerecipesevent-and-reciperegistrar) |

## Machine Definition

```java
private static final Identifier ALLOY_FURNACE = id("alloy_furnace");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(ALLOY_FURNACE)) {
        MachineSpec machine = Machines
                .machine(ALLOY_FURNACE)
                .recipePool(ALLOY_FURNACE)
                .allowModifiers()
                .displayNameKey("machine.mmcr.alloy_furnace")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:bricks")))
                .build();
        event.registerMachine(machine);
    }
}
```

`allowModifiers()` enables the machine to apply modifiers; it does not replace modifier definitions, item bindings, or structure replacement positions. `recipePool(ALLOY_FURNACE)` selects the Alloy Furnace recipe pool. `appearance(...)` accepts `Consumer<AppearanceOptions>` and configures bricks as the unformed theme block. `build()` returns `MachineSpec`.

## Multiblock Structure and Modifier Registration

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    event.registerModifier(
            id("alloy_furnace_diamond_speedup"),
            Modifiers.bundle(Modifiers.numeric(
                    "duration", ModifierScope.INPUT, 0.5F,
                    ModifierOperation.MULTIPLY, false
            )));
    event.registerModifierItem(
            new ItemStack(Items.DIAMOND_BLOCK), id("alloy_furnace_diamond_speedup"));

    event.registerModifier(
            id("alloy_furnace_gold_doubling"),
            Modifiers.bundle(Modifiers.numeric(
                    "output", ModifierScope.OUTPUT, 2.0F,
                    ModifierOperation.MULTIPLY, false
            )));
    event.registerModifierItem(
            new ItemStack(Items.GOLD_BLOCK), id("alloy_furnace_gold_doubling"));

    if (!event.structures().containsKey(ALLOY_FURNACE)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("XXX", "XIX", "XXX")
                                .layer("XMX", "I I", "XMX")
                                .layer("XXX", "XCX", "XXX")
                                .where('X', block(Blocks.BRICKS))
                                .where('I', any(
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput()
                                ))
                                .where('M', block(Blocks.BLAST_FURNACE))
                                .controller('C'))
                        .requirements(r -> r
                                .modifier('M', id("alloy_furnace_diamond_speedup"), block(Blocks.DIAMOND_BLOCK))
                                .modifier('M', id("alloy_furnace_gold_doubling"), block(Blocks.GOLD_BLOCK))
                        ))
                .build(ALLOY_FURNACE);
        event.registerStructure(structure);
    }
}
```

### Responsibilities of the Three Declaration Layers

1. `event.registerModifier(id, bundle)` registers the rule itself. `Modifiers.numeric(...)` returns a numeric rule, and `Modifiers.bundle(...)` wraps rules in a `ModifierBundle`.
2. `event.registerModifierItem(stack, id)` binds the modifier's representative item; register the rule before binding the item.
3. `requirements(r -> r.modifier('M', id, replacement))` determines which characters in the structure can be replaced by the corresponding block. Here, pass the ID and `BlockCondition` directly; no separate wrapper record is needed.

| Modifier ID (namespace omitted) | Representative Item | target | scope | value | operation | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| `alloy_furnace_diamond_speedup` | Diamond Block | `duration` | `INPUT` | 0.5 | `MULTIPLY` | Duration multiplied by 0.5 |
| `alloy_furnace_gold_doubling` | Gold Block | `output` | `OUTPUT` | 2.0 | `MULTIPLY` | Output count multiplied by 2 |

The final `false` is `affectsChance`; this example changes quantity or time, not probability. The gold block rule's target is, according to the source code, `"output"`, not `"item"`.

### Replacement Positions Are Not Mandatory Upgrades

The pattern is 3x3x3: `X` is bricks, `I` is an item input / output or energy input, and `C` is the controller. The middle slice contains **two `M` positions**, which hold vanilla blast furnaces by default. Each `M` can be a blast furnace, diamond block, or gold block. A position cannot contain both upgrade blocks at once, but the two positions can separately hold a diamond block and a gold block to apply both modifiers.

Spaces have no bound condition and are ignored; they do not require air. Pattern coordinates are transformed according to controller orientation; neither `M` is the center cell of the hollow interior.

Multiple replacement rules can be declared for the same character, and structure matching checks the block actually placed at the corresponding position. All callbacks (`fullStructure`, `pattern`, `requirements`) are immediately configured `Consumer`s, and the final `build(ALLOY_FURNACE)` returns `StructureSpec`.

:::info
The structure ID `containsKey(...)` check protects only structure registration; the source's two modifier and item registrations occur before the check. Do not interpret the entire method as an idempotent operation that can be called arbitrarily often within the same registration window.
:::

## Recipes

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(ALLOY_FURNACE.withSuffix("_recipe_1"))
            .recipePool(ALLOY_FURNACE)
            .inputItem(Ingredient.of(Items.GOLD_INGOT), 1)
            .outputItem(Items.GOLD_NUGGET, 10)
            .inputEnergy(20)
            .duration(200)
            .build();
    event.registerRecipe(recipe);
}
```

The base recipe is 1 gold ingot → 10 gold nuggets, at 20 FE/t for 200 ticks (10 seconds). With the diamond upgrade installed, the duration is modified; with the gold block upgrade installed, the output count is modified. Actual operation also requires input, output space, and an energy supply.

This recipe has no `.modifier(...)`, yet modifiers found by the structure can still apply. On the recipe side, `RecipeDraft.modifier(Identifier)` references a registered rule and turns its recipe adjustment into a modifier inherent to this recipe; it is not a matching requirement that the modifier block must be placed in the structure. Referencing an unknown modifier ID fails during registration conversion.

## Summary

Keep three concepts separate: **the machine allows modifiers**, **modifier rules and representative items are registered**, and **the structure declares replacement positions**. Add requirements on the recipe side as needed. External implementations need only [Modifiers](../API/JavaAPI#modifiers), [StructureConstraints](../API/JavaAPI#structureconstraints), and [RecipeDraft](../API/JavaAPI#recipedraft), without importing underlying implementation types.
