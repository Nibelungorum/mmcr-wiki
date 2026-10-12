---
title: Blast Furnace
order: 1
---

# Blast Furnace

The blast furnace (`BLAST_FURNACE`) is an introductory MMCR Java API example: it registers a machine definition, structure, and recipes in stages, while demonstrating parallelism, multithreaded factories, and JEI workstation associations.

## Entry Points and Type Signatures

| Entry point / type | Signature and purpose used by this example | API reference |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)` returns a machine draft; `build()` returns `MachineSpec` | [Machines](../API/JavaAPI#machines), [MachineDraft](../API/JavaAPI#machinedraft) |
| `Structures` / `StructureDraft` | `structure()` returns a structure draft; `build(Identifier)` returns `StructureSpec` | [Structures](../API/JavaAPI#structures), [StructureDraft](../API/JavaAPI#structuredraft-and-structurespec) |
| `Recipes` / `RecipeDraft` | `recipe(Identifier)` returns a recipe draft; `build()` returns `RecipeSpec` | [Recipes](../API/JavaAPI#recipes), [RecipeDraft](../API/JavaAPI#recipedraft) |
| `MachineDefinitionProvider` | `register(RegisterMachineDefinitionsEvent)`, startup ServiceLoader entry point | [Reference](../API/JavaAPI#machinedefinitionprovider) |
| `RegisterMachineDefinitionsEvent` | `registerMachine(MachineSpec)` | [Reference](../API/JavaAPI#registermachinedefinitionsevent-and-machineregistrar) |
| `RegisterMachineStructuresEvent` | `registerStructure(StructureSpec)` | [Reference](../API/JavaAPI#registermachinestructuresevent-and-structureregistrar) |
| `RegisterMachineRecipesEvent` | `registerRecipe(RecipeSpec)` | [Reference](../API/JavaAPI#registermachinerecipesevent-and-reciperegistrar) |
| `StructureStageDraft` / `PatternDraft` | `pattern(Consumer<PatternDraft>)`; `where(char, BlockCondition)` | [Stages](../API/JavaAPI#structurestagedraft-and-structurestagespec), [patterns](../API/JavaAPI#patterndraft-and-patternspec) |
| `BlockConditions` | Block, port, and union condition factories that return `BlockCondition` | [Reference](../API/JavaAPI#blockconditions-and-blockcondition) |
| `PortTierLimits` | Tier declarations for `portTiers(Consumer<PortTierLimits.Builder>)` | [Reference](../API/JavaAPI#porttierlimits) |
| `FactoryOptions` | `factory(Consumer<FactoryOptions>)` configures factory threads | [Reference](../API/JavaAPI#factoryoptions) |
| `RegisterJeiWorkstationsEvent` | Associates a workstation with a recipe pool or any JEI recipe type | [Reference](../API/JavaAPI#registerjeiworkstationsevent-and-workstationregistrar) |

Callbacks such as `controller(...)`, `factory(...)`, `fullStructure(...)`, and `pattern(...)` accept a `Consumer` to immediately configure an existing draft; they do not require another builder to be returned. The expression lambdas below can be used directly; do not write `return` when changing them to `{ ... }` blocks.

## Machine Definition

```java
private static final Identifier BLAST_FURNACE = id("blast_furnace");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(BLAST_FURNACE)) {
        MachineSpec machine = Machines
                .machine(BLAST_FURNACE)
                .recipePool(BLAST_FURNACE)
                .displayNameKey("machine.mmcr.blast_furnace")
                .allowMultithreading()
                .maxParallelism(Integer.MAX_VALUE)
                .parallelizable(true)
                .factory(factory -> factory.hasFactory(true).threadLimit(4))
                .build();
        event.registerMachine(machine);
    }
}
```

- `id("blast_furnace")` comes from `publicapi.ApiIds` and expands to `mmcr:blast_furnace`. Addon mods should use their own namespace, such as `Identifier.fromNamespaceAndPath("my_mod", "blast_furnace")`.
- `recipePool(BLAST_FURNACE)` explicitly binds the machine to the blast-furnace recipe pool. Machine IDs, pool IDs, and recipe IDs identify different things, even though the first two are the same here.
- `displayNameKey(...)` declares a localization key.
- `parallelizable(true)` permits parallel processing, while `maxParallelism(Integer.MAX_VALUE)` declares the machine-side limit; actual parallelism also depends on recipes, parallel controllers, and available resources.
- `allowMultithreading()` together with `factory(...hasFactory(true).threadLimit(4))` enables factory multithreading with a limit of 4 threads. Parallelism processes multiple batches of one recipe; multithreading schedules independent recipe tasks.

`build()` returns `MachineSpec`, which is submitted with `event.registerMachine(...)`. `definitions().containsKey(...)` prevents the same machine ID from being registered twice.

The builtin [BuiltInProvider](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/provider/BuiltInProvider.java) implements `publicapi.registration.MachineDefinitionProvider`; it is discovered by the startup ServiceLoader and invokes this method. An addon provider's service file is `META-INF/services/cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider`, containing the provider's fully qualified class name. Startup definitions must complete before controller block registration, so this must not be moved into the later startup structure-event window.

## Multiblock Structure

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(BLAST_FURNACE)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("AXA", "XIX", "XXX")
                                .layer("XXX", "I I", "XBX")
                                .layer("AXA", "XCX", "XXX")
                                .where('X', block("mmcr:casing"))
                                .where('A', any(
                                        block(Blocks.IRON_BLOCK),
                                        BlockConditions.parallelControllers()
                                ))
                                .where('B', block(Blocks.FURNACE))
                                .where('I', any(
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput()
                                ))
                                .controller('C'))
                        .portTiers(t -> t
                                .minEnergyInput(PortTierLimits.EnergyTier.NORMAL)
                                .minItemInput(PortTierLimits.ItemTier.NORMAL)
                                .anyItemOutput())
                )
                .build(BLAST_FURNACE);
        event.registerStructure(structure);
    }
}
```

`@EventBusSubscriber` together with `@SubscribeEvent` subscribes to registration events on the NeoForge game event bus; it does not subscribe MMCR structure events to the mod lifecycle bus.

The three `layer(...)` calls form three pattern slices, each with 3 rows and 3 columns. Layers, rows, and columns are pattern-local coordinates; placement in the world is transformed according to controller facing, so code-line order alone cannot determine which row is the top world layer.

| Character | Condition | Purpose |
| --- | --- | --- |
| `X` | `block("mmcr:casing")` | Casing, referenced by registered ID, so the tutorial need not import internal `ModBlocks` |
| `A` | Iron block or `parallelControllers()` | Four replaceable positions for parallel-controller installation |
| `B` | Vanilla furnace | Fixed furnace core |
| `I` | `itemInput()` / `itemOutput()` / `energyInput()` | Port installation positions; conditions only decide which blocks may be placed |
| `C` | `controller('C')` | Binds this machine's controller and appears only once in the pattern |
| Space | No bound condition | Ignores the position; it does not require air |

`portTiers(...)` additionally declares at least `NORMAL` item-input and energy-input tiers, with no item-output tier restriction. Allowed block conditions and port-tier requirements are separate levels: allowing a kind of port does not mean a low-tier port satisfies runtime requirements. `anyItemOutput()` does not turn additional positions into port slots.

Every layer must have the same row count and every row the same width; see [BlockConditions](../API/JavaAPI#blockconditions-and-blockcondition) for character conditions. `build(BLAST_FURNACE)` returns the `StructureSpec` bound to the blast furnace.

## Two Recipes

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(BLAST_FURNACE.withSuffix("_recipe_1"))
            .recipePool(BLAST_FURNACE)
            .inputItem(Ingredient.of(Items.IRON_INGOT), 9)
            .outputItem(Items.IRON_NUGGET, 10)
            .inputEnergy(20)
            .duration(240)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(BLAST_FURNACE.withSuffix("_recipe_2"))
            .recipePool(BLAST_FURNACE)
            .inputItem(Ingredient.of(Items.GOLD_INGOT), 9)
            .outputItem(Items.GOLD_NUGGET, 10)
            .inputEnergy(20)
            .duration(240)
            .build();
    event.registerRecipe(recipe);
}
```

| Recipe ID | Input | Output | Energy use | Base duration |
| --- | --- | --- | --- | --- |
| `mmcr:blast_furnace_recipe_1` | 9 iron ingots | 10 iron nuggets | 20 FE/t | 240 ticks (12 seconds) |
| `mmcr:blast_furnace_recipe_2` | 9 gold ingots | 10 gold nuggets | 20 FE/t | 240 ticks (12 seconds) |

`Recipes.recipe(...)` accepts a recipe ID, `recipePool(...)` determines its pool, and `build()` returns `RecipeSpec`. Do not use `event.recipes().containsKey(BLAST_FURNACE)` to check whether a machine already has recipes: one pool can contain multiple recipes, so duplicate checks must target the complete recipe ID.

## JEI Workstations

The blast furnace also demonstrates two differently directed workstation associations:

```java
@SubscribeEvent
public static void registerWorkstations(RegisterJeiWorkstationsEvent event) {
    event.addRecipePoolWorkstation(BLAST_FURNACE, Blocks.BLAST_FURNACE);
    event.addMachineWorkstation(
            BLAST_FURNACE,
            Identifier.parse("minecraft:smelting")
    );
}
```

1. `addRecipePoolWorkstation(poolId, item)`: makes the vanilla blast furnace a workstation for the `mmcr:blast_furnace` recipe-pool page.
2. `addMachineWorkstation(machineId, recipeTypeId)`: makes the MMCR blast furnace controller a workstation for the `minecraft:smelting` JEI recipe type.

This is only a client-side JEI page association. It neither automatically registers vanilla smelting recipes in the blast-furnace recipe pool nor changes machine processing logic.

## How the Three Registration Stages Work Together

```text
Startup: definition window
  → ServiceLoader invokes MachineDefinitionProvider
  → RegisterMachineDefinitionsEvent receives MachineSpec
  → Definitions are frozen for controller block registration
Startup: later structure and recipe windows
  → RegisterMachineStructuresEvent receives StructureSpec
  → RegisterMachineRecipesEvent receives RecipeSpec
Client JEI registration
  → RegisterJeiWorkstationsEvent associates workstations
```

Machine definitions also have a startup event-subscription extension point; this example chooses a provider to call `registerDefinitions(...)`. Definitions, structures, and Java recipes are all collected during startup, and all three events are published to `NeoForge.EVENT_BUS`; structures and recipes must be submitted to their own windows rather than registered across stages. Java registration declarations are not script hot-reload entry points.

## Summary

- Machine properties use [Machines / MachineDraft](../API/JavaAPI#machinedraft), producing `MachineSpec`.
- Patterns and requirements use [Structures / StructureDraft](../API/JavaAPI#structuredraft-and-structurespec), producing `StructureSpec`.
- The two processing rules use [Recipes / RecipeDraft](../API/JavaAPI#recipedraft), producing `RecipeSpec`.
- Port conditions use `BlockConditions`, tier requirements use `PortTierLimits`, and factory configuration uses `FactoryOptions`.
- JEI workstation associations are independent of machine recipe registration.
