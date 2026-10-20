---
title: Distillation Tower
order: 6
---

# Distillation Tower

The distillation tower demonstrates **a base structure and two expanded forms**, and uses one recipe to demonstrate guaranteed outputs, chance outputs, and permitted output disposal.

## Entry Points and Type Signatures

| Type / Method | Signature and Purpose | API Reference |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)`; `build()` → `MachineSpec` | [Reference](../API/JavaAPI#machinedraft) |
| `Structures` / `StructureDraft` | `fullStructure(Consumer<StructureStageDraft>)`, `expandStructure(Consumer<StructureStageDraft>)` | [Reference](../API/JavaAPI#structuredraft-and-structurespec) |
| `StructureStageDraft` / `PatternDraft` | Each stage configures a pattern independently; `pattern(Consumer<PatternDraft>)` | [Stage](../API/JavaAPI#structurestagedraft-and-structurestagespec), [Pattern](../API/JavaAPI#patterndraft-and-patternspec) |
| `BlockConditions` | `block(Identifier)`, `any(BlockCondition...)`, port conditions | [Reference](../API/JavaAPI#blockconditions-and-blockcondition) |
| `Recipes` / `RecipeDraft` | `outputChance(ItemStack, float)`, `allowPartialOutputs(boolean)`; `build()` → `RecipeSpec` | [Reference](../API/JavaAPI#recipedraft) |
| Registration events | `RegisterMachineDefinitionsEvent`, `RegisterMachineStructuresEvent`, `RegisterMachineRecipesEvent` | [Definitions](../API/JavaAPI#registermachinedefinitionsevent-and-machineregistrar), [Structures](../API/JavaAPI#registermachinestructuresevent-and-structureregistrar), [Recipes](../API/JavaAPI#registermachinerecipesevent-and-reciperegistrar) |

## Machine Definition

```java
private static final Identifier DISTILLATION_TOWER = id("distillation_tower");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(DISTILLATION_TOWER)) {
        MachineSpec machine = Machines
                .machine(DISTILLATION_TOWER)
                .recipePool(DISTILLATION_TOWER)
                .displayNameKey("machine.mmcr.distillation_tower")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("polished_blackstone")))
                .maxParallelism(32)
                .parallelizable(true)
                .build();
        event.registerMachine(machine);
    }
}
```

The theme block is polished blackstone; `Identifier.parse("polished_blackstone")` without a namespace uses the vanilla namespace. The parallelism limit is 32, but this example pattern provides no parallel controller condition, so constructing it does not automatically provide 32-way parallelism. The recipe pool is explicitly bound to `DISTILLATION_TOWER`.

## Three Complete Structure Stages

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(DISTILLATION_TOWER)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("  XXX  ", "  AAA  ", "       ", "       ")
                                .layer(" XXXXX ", " B   B ", "  ACA  ", "       ")
                                .layer("XXXXXXX", "A     A", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", "  DDD  ")
                                .layer(" XXXXX ", " B   B ", "  BBB  ", "       ")
                                .layer("  XXX  ", "  BEB  ", "       ", "       ")
                                .where('C', any(
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput(),
                                        block(Identifier.parse("minecraft:deepslate_bricks"))
                                ))
                                .where('X', block(Identifier.parse("minecraft:polished_blackstone")))
                                .where('A', block(Identifier.parse("minecraft:deepslate_bricks")))
                                .where('B', block(Identifier.parse("minecraft:polished_blackstone_bricks")))
                                .where('D', block(Identifier.parse("minecraft:gilded_blackstone")))
                                .controller('E')
                        )
                )
                .expandStructure(s -> s
                        .pattern(p -> p
                                .layer("  XXX  ", "  AAA  ", "       ", "       ", "       ")
                                .layer(" XXXXX ", " B   B ", "  ACA  ", "  ACA  ", "       ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", "  DDD  ")
                                .layer(" XXXXX ", " B   B ", "  BBB  ", "  BBB  ", "       ")
                                .layer("  XXX  ", "  BEB  ", "       ", "       ", "       ")
                                .where('C', any(
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput(),
                                        block(Identifier.parse("minecraft:deepslate_bricks"))
                                ))
                                .where('X', block(Identifier.parse("minecraft:polished_blackstone")))
                                .where('A', block(Identifier.parse("minecraft:deepslate_bricks")))
                                .where('B', block(Identifier.parse("minecraft:polished_blackstone_bricks")))
                                .where('D', block(Identifier.parse("minecraft:gilded_blackstone")))
                                .controller('E')
                        )
                )
                .expandStructure(s -> s
                        .pattern(p -> p
                                .layer("  XXX  ", "  AAA  ", "       ", "       ", "       ", "       ")
                                .layer(" XXXXX ", " B   B ", "  ACA  ", "  ACA  ", "  ACA  ", "       ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", " B   B ", "  DDD  ")
                                .layer("XXXXXXX", "A     A", " B   B ", " B   B ", " B   B ", "  DDD  ")
                                .layer(" XXXXX ", " B   B ", "  BBB  ", "  BBB  ", "  BBB  ", "       ")
                                .layer("  XXX  ", "  BEB  ", "       ", "       ", "       ", "       ")
                                .where('C', any(
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput(),
                                        block(Identifier.parse("minecraft:deepslate_bricks"))
                                ))
                                .where('X', block(Identifier.parse("minecraft:polished_blackstone")))
                                .where('A', block(Identifier.parse("minecraft:deepslate_bricks")))
                                .where('B', block(Identifier.parse("minecraft:polished_blackstone_bricks")))
                                .where('D', block(Identifier.parse("minecraft:gilded_blackstone")))
                                .controller('E')
                        )
                )
                .build(DISTILLATION_TOWER);
        event.registerStructure(structure);
    }
}
```

### Expansion Does Not Append a Character Slice

Each `fullStructure(...)` / `expandStructure(...)` configures an independent `StructureStageDraft`; its internal `pattern(...)` accepts a `Consumer<PatternDraft>`. An expanded pattern describes the complete post-expansion form, rather than only the newly added portion.

| Form | Slice Count | Rows per Slice | Row Width | `C` Port Candidate Cells |
| --- | --- | --- | --- | --- |
| Base | 7 | 4 | 7 | 1 |
| First expansion | 7 | 5 | 7 | 2 |
| Second expansion | 7 | 6 | 7 | 3 |

The row count in the table is a pattern coordinate; do not describe “4 rows” as “4 z slices.” `X` is polished blackstone, `A` is deepslate bricks, `B` is polished blackstone bricks, and `D` is gilded blackstone. `E` is the controller; `C` can be an item input/output, energy input, or decorative deepslate bricks. Unbound spaces ignore that position.

Expansion increases the available positions for ports, but does not automatically change a recipe's output count, probability, or disposal option. To require a minimum stage for a recipe, use `stageRequirement(int)` on `RecipeDraft`; this example recipe does not call it.

## Multiple Outputs and Chance Outputs

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(DISTILLATION_TOWER.withSuffix("_recipe_1"))
            .recipePool(DISTILLATION_TOWER)
            .inputItem(ItemTags.LOGS, 1)
            .outputItem(Items.COAL, 4)
            .outputItem(Items.GUNPOWDER, 3)
            .outputChance(new ItemStack(Items.STICK, 2), 0.5f)
            .inputEnergy(20)
            .allowPartialOutputs(true)
            .duration(200)
            .build();
    event.registerRecipe(recipe);
}
```

The base recipe consumes one item in the `minecraft:logs` tag at 20 FE/t over 200 ticks (10 seconds); it guarantees 4 coal and 3 gunpowder, with a 50% chance to output one stack of 2 sticks.

| Call | Parameter Types | Semantics |
| --- | --- | --- |
| `inputItem(ItemTags.LOGS, 1)` | `TagKey<Item>, int` | Tag-matched input |
| `outputItem(Items.COAL, 4)` | `Item, int` | Guaranteed output; repeated calls append different products |
| `outputChance(new ItemStack(...), 0.5f)` | `ItemStack, float` | Probability of the output stack, not halving its count |
| `allowPartialOutputs(true)` | `boolean` | Permits discarding outputs that cannot fit when capacity is insufficient |

### Disposal Semantics and Capacity Planning

By default, recipes cannot directly discard products that do not fit; insufficient output capacity affects processing. `allowPartialOutputs(true)` explicitly accepts product loss: the output stage inserts what fits into the available space, while the remainder may be discarded rather than kept in an invisible queue for the player to retrieve.

Chance outputs are still inserted through their corresponding output ports; whether the random roll succeeds and whether capacity is available are separate concerns. A “50% chance” does not imply that no output capacity is required. With partial outputs disabled, output capacity must still be planned; with it enabled, disposal due to insufficient capacity is allowed.

The distillation tower is particularly useful for illustrating this tradeoff: the base form has only one `C` candidate cell, while the recipe simultaneously needs input, output, and energy supply. Expansions provide more independent port locations, and players should place ports according to the actual IO layout. The code has no fluid output, so this example should not be interpreted as a fluid-distillation recipe based only on the machine name.

## Further Reading

- [StructureDraft](../API/JavaAPI#structuredraft-and-structurespec): Base, expansion, and additional structure declarations.
- [StructureStageDraft](../API/JavaAPI#structurestagedraft-and-structurestagespec): Each stage's pattern and requirements.
- [RecipeDraft](../API/JavaAPI#recipedraft): `outputItem`, `outputChance`, `allowPartialOutputs`, and `stageRequirement`.
