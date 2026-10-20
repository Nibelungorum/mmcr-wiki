---
title: Thermal Smelting Furnace
order: 4
---

# Thermal Smelting Furnace

The thermal smelting furnace models the "coil blocks" in its structure as **level types and level instances**, allowing levels to adjust duration, energy consumption, output, parallelism, and thread limits. The third recipe also demonstrates output with a custom name and enchantment data components.

## Entry Points and Type Signatures

| Type / method | Signature and purpose | API reference |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)`; `build()` → `MachineSpec` | [Reference](../API/JavaAPI#machinedraft) |
| `Structures` / `StructureDraft` | `fullStructure(Consumer<StructureStageDraft>)`; `build(Identifier)` → `StructureSpec` | [Reference](../API/JavaAPI#structuredraft-and-structurespec) |
| `PatternDraft` / `BlockConditions` | `where(char, BlockCondition)`; `blockState(BlockState)` | [Pattern](../API/JavaAPI#patterndraft-and-patternspec), [conditions](../API/JavaAPI#blockconditions-and-blockcondition) |
| `Levels` | `type(Identifier, Component)` → `LevelTypeSpec` | [Reference](../API/JavaAPI#levels-leveltypespec-and-machinelevelspec) |
| `Levels` | `level(Identifier, Identifier, int, BlockCondition, ModifierBundle)` → `MachineLevelSpec` | [Reference](../API/JavaAPI#levels-leveltypespec-and-machinelevelspec) |
| `Modifiers` | `numeric(String, ModifierScope, double, ModifierOperation, boolean)`; `bundle(ModifierSpec...)` | [Reference](../API/JavaAPI#modifiers) |
| `StructureConstraints.Builder` | `levelSlot(char, Identifier)` | [Reference](../API/JavaAPI#structureconstraints) |
| `Recipes` / `RecipeDraft` | `levelRequirement(Identifier, Identifier)`; `build()` → `RecipeSpec` | [Reference](../API/JavaAPI#recipedraft) |
| `ComponentConstraints` | `ofIds(Map<Identifier, ComponentCondition>)` | [Reference](../API/JavaAPI#componentconstraints) |
| `ComponentConditions` | `exact(JsonElement)` → `ExactCondition` | [Reference](../API/JavaAPI#componentconditions-and-conditional-view) |
| Registration events | `RegisterMachineDefinitionsEvent`, `RegisterMachineStructuresEvent`, `RegisterMachineRecipesEvent` | [Definitions](../API/JavaAPI#registermachinedefinitionsevent-and-machineregistrar), [structures](../API/JavaAPI#registermachinestructuresevent-and-structureregistrar), [recipes](../API/JavaAPI#registermachinerecipesevent-and-reciperegistrar) |

Level instances here are created by factory methods without a representative stack argument; rule scopes and operations use enums rather than strings. For startup references to another mod's blocks, prefer `BlockConditions.state("mod:block")` to retain the ID until the structure window freezes instead of obtaining registry objects early.

## IDs and Machine Definition

```java
private static final Identifier THERMAL_SMELTING_FURNACE = id("thermal_smelting_furnace");
public static final Identifier THERMAL_SMELTING_COIL_TYPE = id("thermal_smelting_coil");
public static final Identifier IRON_COIL = id("thermal_smelting_coil_iron");
public static final Identifier GOLD_COIL = id("thermal_smelting_coil_gold");
public static final Identifier DIAMOND_COIL = id("thermal_smelting_coil_diamond");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(THERMAL_SMELTING_FURNACE)) {
        MachineSpec machine = Machines
                .machine(THERMAL_SMELTING_FURNACE)
                .recipePool(THERMAL_SMELTING_FURNACE)
                .displayNameKey("machine.mmcr.thermal_smelting_furnace")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:smooth_basalt")))
                .allowModifiers()
                .parallelizable(true)
                .maxParallelism(4)
                .allowMultithreading()
                .build();
        event.registerMachine(machine);
    }
}
```

- `allowModifiers()` allows application of modifiers carried by levels.
- `parallelizable(true).maxParallelism(4)` declares baseline parallel-processing capability and its baseline limit; level rules also add `parallelism`, so 4 cannot be interpreted as a final limit that never changes at any level.
- `allowMultithreading()` allows multithreading, but actual scheduling still requires a factory controller. `BlockConditions.ports()` in the source structure is the resource-IO port set and **does not include factory or parallel controllers**; this example also does not separately add either condition, so do not interpret the switch and level scheduling bonuses as proof that the structure already has installation positions for those controllers.
- `appearance(...)` is a `Consumer<AppearanceOptions>` configuration callback, with smooth basalt as its theme block.

## Registering Levels and Binding the Structure

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    event.registerLevelType(Levels.type(
            THERMAL_SMELTING_COIL_TYPE,
            Component.translatable("level.mmcr.thermal_smelting_coil")));

    event.registerLevel(Levels.level(
            IRON_COIL,
            THERMAL_SMELTING_COIL_TYPE,
            1,
            BlockConditions.blockState(Blocks.IRON_BLOCK.defaultBlockState()),
            Modifiers.bundle(Modifiers.numeric(
                    "duration", ModifierScope.INPUT, 0.9D, ModifierOperation.MULTIPLY, false)))
    );

    event.registerLevel(Levels.level(
            DIAMOND_COIL,
            THERMAL_SMELTING_COIL_TYPE,
            3,
            BlockConditions.blockState(Blocks.DIAMOND_BLOCK.defaultBlockState()),
            Modifiers.bundle(
                    Modifiers.numeric("duration", ModifierScope.INPUT, 0.7D, ModifierOperation.MULTIPLY, false),
                    Modifiers.numeric("energy", ModifierScope.INPUT, 0.8D, ModifierOperation.MULTIPLY, false),
                    Modifiers.numeric("parallelism", ModifierScope.MACHINE, 4D, ModifierOperation.ADD, false),
                    Modifiers.numeric("factory_threads", ModifierScope.MACHINE, 1D, ModifierOperation.ADD, false)))
    );

    event.registerLevel(Levels.level(
            GOLD_COIL,
            THERMAL_SMELTING_COIL_TYPE,
            2,
            BlockConditions.blockState(Blocks.GOLD_BLOCK.defaultBlockState()),
            Modifiers.bundle(
                    Modifiers.numeric("duration", ModifierScope.INPUT, 0.6D, ModifierOperation.MULTIPLY, false),
                    Modifiers.numeric("energy", ModifierScope.INPUT, 0.7D, ModifierOperation.MULTIPLY, false),
                    Modifiers.numeric("output", ModifierScope.OUTPUT, 2D, ModifierOperation.MULTIPLY, false),
                    Modifiers.numeric("parallelism", ModifierScope.MACHINE, 6D, ModifierOperation.ADD, false),
                    Modifiers.numeric("factory_threads", ModifierScope.MACHINE, 2D, ModifierOperation.ADD, false)))
    );

    if (!event.structures().containsKey(THERMAL_SMELTING_FURNACE)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("AAA", "XXX", "XXX", "AAA")
                                .layer("AAA", "X X", "X X", "ADA")
                                .layer("ABA", "XXX", "XXX", "AAA")
                                .where('X', any(
                                        block(Blocks.IRON_BLOCK),
                                        block(Blocks.GOLD_BLOCK),
                                        block(Blocks.DIAMOND_BLOCK)
                                ))
                                .where('A', any(
                                        block(Blocks.SMOOTH_BASALT),
                                        BlockConditions.ports()
                                ))
                                .where('D', block(Blocks.REINFORCED_DEEPSLATE))
                                .controller('B')
                        )
                        .requirements(r -> r.levelSlot('X', THERMAL_SMELTING_COIL_TYPE))
                        .portTiers(t -> t
                                .anyItemInput()
                                .anyItemOutput()
                                .anyEnergyInput()
                        ))
                .build(THERMAL_SMELTING_FURNACE);
        event.registerStructure(structure);
    }
}
```

### Three Concepts in the Level System

1. **Level type**: `Levels.type(typeId, displayName)` creates a `LevelTypeSpec`, defining the "coil level" dimension. Register the type before its instances.
2. **Level instance**: `Levels.level(...)` creates a `MachineLevelSpec`; its five parameters are, in order, instance ID, type ID, priority, block condition, and modifier bundle. Factory declarations use an empty display stack; the `representative()` accessor remains.
3. **Level slot**: `StructureConstraints.Builder.levelSlot('X', typeId)` associates a structure character with a level dimension, making placed coils participate in level detection.

| Level | Priority | Block | Duration multiplier | Energy multiplier | Output multiplier | Parallelism bonus | Thread bonus |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `IRON_COIL` | 1 | Iron Block | 0.9 | 1.0 | 1.0 | 0 | 0 |
| `GOLD_COIL` | 2 | Gold Block | 0.6 | 0.7 | 2.0 | +6 | +2 |
| `DIAMOND_COIL` | 3 | Diamond Block | 0.7 | 0.8 | 1.0 | +4 | +1 |

Priority is used for level detection and level-requirement comparison; it does not mean numeric bonuses increase progressively. For example, gold coils are faster and yield more output than diamond coils, but have lower priority. `ModifierScope.MACHINE` with `ADD` adjusts scheduling properties; `INPUT` / `OUTPUT` with `MULTIPLY` adjust processing properties.

All slots of the same level type must resolve to **the same level instance**. All `X` positions in this example are bound to the coil type, so you cannot mix iron, gold, and diamond then select the one with the highest priority; mixing them reports a level inconsistency and prevents normal structure formation. With uniform coils, that level's modifier bundle takes effect rather than rules for every material stacking together.

Levels and types are registered before checking whether the structure exists; that check does not protect the preceding level registrations from duplication.

### Structure Requirements and Ports

The structure has three slices, each 4 rows x 3 columns. `X` permits three coil blocks and is bound to the coil level type; `A` is smooth basalt or the MMCR resource-IO port set; `D` is fixed as reinforced deepslate; `B` is the controller. Spaces are unbound and ignore that position.

`requirements(...)` accepts a `Consumer<StructureConstraints.Builder>`, while `portTiers(...)` accepts a `Consumer<PortTierLimits.Builder>`. They configure level slots and port requirements respectively, and cannot replace one another.

## Three Recipes

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(THERMAL_SMELTING_FURNACE.withSuffix("_recipe_1"))
            .recipePool(THERMAL_SMELTING_FURNACE)
            .inputItem(Items.RAW_IRON, 8)
            .inputItem(Items.COAL, 1)
            .outputItem(Items.IRON_INGOT, 9)
            .inputEnergy(40)
            .parallelized(true)
            .duration(200)
            .levelRequirement(THERMAL_SMELTING_COIL_TYPE, IRON_COIL)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(THERMAL_SMELTING_FURNACE.withSuffix("_recipe_2"))
            .recipePool(THERMAL_SMELTING_FURNACE)
            .inputItem(Items.RAW_GOLD, 8)
            .inputItem(Items.COAL, 1)
            .outputItem(Items.GOLD_INGOT, 9)
            .inputEnergy(40)
            .parallelized(true)
            .duration(200)
            .levelRequirement(THERMAL_SMELTING_COIL_TYPE, GOLD_COIL)
            .build();
    event.registerRecipe(recipe);

    ItemStack output = new ItemStack(Items.DIAMOND, 9);
    output.set(DataComponents.CUSTOM_NAME, Component.literal("What a magic recipe"));

    JsonObject enchantments_data = new JsonObject();
    enchantments_data.addProperty("minecraft:sharpness", 4);
    ComponentConstraints data_extra = ComponentConstraints.ofIds(Map.of(
            Identifier.parse("minecraft:enchantments"),
            ComponentConditions.exact(enchantments_data)));

    recipe = Recipes
            .recipe(THERMAL_SMELTING_FURNACE.withSuffix("_recipe_3"))
            .recipePool(THERMAL_SMELTING_FURNACE)
            .inputItem(Items.GOLD_INGOT, 8)
            .inputItem(Items.COAL, 1)
            .outputItem(output, data_extra)
            .inputEnergy(40)
            .parallelized(true)
            .duration(200)
            .levelRequirement(THERMAL_SMELTING_COIL_TYPE, DIAMOND_COIL)
            .build();
    event.registerRecipe(recipe);
}
```

### Standard Recipes and Minimum Levels

| Recipe suffix | Base input | Base output | Minimum coil |
| --- | --- | --- | --- |
| `_recipe_1` | 8 Raw Iron + 1 Coal | 9 Iron Ingots | Iron |
| `_recipe_2` | 8 Raw Gold + 1 Coal | 9 Gold Ingots | Gold |
| `_recipe_3` | 8 Gold Ingots + 1 Coal | 9 diamonds with a name and Sharpness IV data | Diamond |

All three recipes have a base duration of 200 ticks and base energy consumption of 40 FE/t; the actual processing parameters are obtained after level modifiers are applied.

`levelRequirement(typeId, levelId)` declares the minimum level requirement for that dimension, with the returned requirement type [LevelRequirementSpec](../API/JavaAPI#requirementspec-and-built-in-requirement-views). `parallelized(true)` is a recipe-level switch that works with machine-level `parallelizable(true)`; actual parallel processing still needs a controller, sufficient resources, and support from the modified limit.

### Data Component Output

`ItemStack.set(DataComponents.CUSTOM_NAME, ...)` directly writes a component value of an existing type. This example expresses the enchantment value as JSON, then uses `ComponentConditions.exact(...)` to create an exact condition and `ComponentConstraints.ofIds(...)` to combine the component ID with the condition. Finally, it calls `outputItem(ItemStack, ComponentConstraints)`, retaining both the name on the stack and the declared enchantments.

This is a component-declaration approach for registry data; it does not mean all enchantment operations must use JSON. With an appropriate registry context, vanilla can also construct the corresponding component value. The example's text, JSON structure, and quantities retain their source values.

:::info
`ComponentConditions` provides `exact`, `map`, `list`, `range`, and `text` factories, producing their corresponding `*Condition` types. Fuzzy conditions are for input matching; outputs must provide exact values, and a range or fuzzy text condition cannot be treated as generatable output data.
:::

## Summary

Level declarations use [Levels](../API/JavaAPI#levels-leveltypespec-and-machinelevelspec), numeric rules use [Modifiers](../API/JavaAPI#modifiers), structure binding uses [StructureConstraints](../API/JavaAPI#structureconstraints), and data components use [ComponentConstraints](../API/JavaAPI#componentconstraints) / [ComponentConditions](../API/JavaAPI#componentconditions-and-conditional-view). Retain the complete flow of "register levels → structure detects levels → recipes check levels → modifiers apply" to explain this machine's processing and scheduling behavior.
