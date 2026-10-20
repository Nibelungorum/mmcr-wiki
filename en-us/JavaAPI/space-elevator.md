---
title: Space Elevator
order: 7
---

# Space Elevator

The space elevator and space reassembler demonstrate the **HOST / MODULE host-module relationship**, coupler connections, ordered recipe pools, and matching and outputting potion data components. This document is based on [SPACE.java (5912f92f)](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/5912f92f611da4a94d85f26644a3f9b99e534d27/src/main/java/org/nibelungorum/builtin/SPACE.java).

## Two Machines and Six IDs with Different Purposes

`SPACE.java` registers only two machines:

1. `SPACE_ELEVATOR` (`mmcr:space_elevator`): `MachineKind.HOST` host.
2. `SPACE_REASSEMBLER` (`mmcr:space_reassembler`): `MachineKind.MODULE` module.

`SPACE_MINER` (`mmcr:space_miner`) is a **recipe pool ID**, not a third machine, and has no separate machine controller or structure. `SPACE_POOL_1/2/3` are likewise merely additional recipe pools listed by the reassembler; this file registers no recipes to those three pools.

## Entry Points and Type Signatures

| Type / Method | Signature and Responsibility | API Reference |
| --- | --- | --- |
| `Machines` / `MachineDraft` | `machine(Identifier)`; `build()` → `MachineSpec` | [Reference](../API/JavaAPI#machinedraft) |
| `MachineKind` | `role(MachineKind)`; `NORMAL` / `HOST` / `MODULE` | [Reference](../API/JavaAPI#machinekind) |
| `MachineDraft` | `acceptedModule(Identifier)`; `recipePool(Identifier...)` | [Reference](../API/JavaAPI#machinedraft) |
| `AppearanceOptions` | `appearance(Consumer<AppearanceOptions>)` | [Reference](../API/JavaAPI#appearanceoptions) |
| `Structures` / `StructureDraft` | `fullStructure(Consumer<StructureStageDraft>)`; `build(Identifier)` → `StructureSpec` | [Reference](../API/JavaAPI#structuredraft-and-structurespec) |
| `BlockConditions` | `coupler()` → `BlockCondition`; port conditions | [Reference](../API/JavaAPI#blockconditions-and-blockcondition) |
| `Recipes` / `RecipeDraft` | `requiredHost(Identifier)`; `build()` → `RecipeSpec` | [Reference](../API/JavaAPI#recipedraft) |
| `ComponentConstraints` | `ofIds(Map<Identifier, ComponentCondition>)` | [Reference](../API/JavaAPI#componentconstraints) |
| `ComponentConditions` | `exact(JsonElement)` → `ExactCondition` | [Reference](../API/JavaAPI#componentconditions-and-conditional-view) |
| Registration events | `RegisterMachineDefinitionsEvent`, `RegisterMachineStructuresEvent`, `RegisterMachineRecipesEvent` | [Definitions](../API/JavaAPI#registermachinedefinitionsevent-and-machineregistrar), [Structures](../API/JavaAPI#registermachinestructuresevent-and-structureregistrar), [Recipes](../API/JavaAPI#registermachinerecipesevent-and-reciperegistrar) |

## Machine Definition

```java
private static final Identifier SPACE_ELEVATOR = id("space_elevator");
private static final Identifier SPACE_REASSEMBLER = id("space_reassembler");
private static final Identifier SPACE_MINER = id("space_miner");
private static final Identifier SPACE_POOL_1 = id("space_1");
private static final Identifier SPACE_POOL_2 = id("space_2");
private static final Identifier SPACE_POOL_3 = id("space_3");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(SPACE_ELEVATOR)
            && !event.definitions().containsKey(SPACE_REASSEMBLER)) {
        MachineSpec machine = Machines
                .machine(SPACE_ELEVATOR)
                .recipePool(SPACE_ELEVATOR)
                .displayNameKey("machine.mmcr.space_elevator")
                .appearance(a -> a
                        .machineBasicBlock(Identifier.parse("minecraft:smooth_quartz"))
                        .controllerBaseTexture(Identifier.parse("block/quartz_block_bottom"))
                        .formedPortBaseTexture(Identifier.parse("block/quartz_block_bottom"))
                )
                .role(MachineKind.HOST)
                .acceptedModule(SPACE_REASSEMBLER)
                .build();
        event.registerMachine(machine);

        machine = Machines
                .machine(SPACE_REASSEMBLER)
                .recipePool(SPACE_REASSEMBLER, SPACE_MINER, SPACE_POOL_1, SPACE_POOL_2, SPACE_POOL_3)
                .displayNameKey("machine.mmcr.space_reassembler")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:quartz_pillar")))
                .allowMultithreading()
                .role(MachineKind.MODULE)
                .build();
        event.registerMachine(machine);
    }
}
```

### Host Acceptance Relationship and Appearance

The elevator uses smooth quartz as its theme block. `controllerBaseTexture` and `formedPortBaseTexture` specify the base textures for the controller and formed ports; they do not simply replace the bottom face in a particular world orientation. Texture IDs default to the `minecraft` namespace.

`role(MachineKind.HOST)` together with `acceptedModule(SPACE_REASSEMBLER)` declares the ID of an accepted module machine. Hosts must declare which modules they accept, and non-host machines cannot declare accepted modules. These are constraints on machine declarations. They do not mean that `build()` returns only after both machines have been registered: the source explicitly builds and registers the elevator first, then builds and registers the reassembler.

### Module and Ordered Recipe Pools

The reassembler has the `MODULE` role and lists five recipe pools in order. Recipe pools are where machines look up processing rules. A module machine can access multiple pools, and each recipe selects its pool through its own `recipePool(...)` call. The reassembler can therefore use the `SPACE_MINER` pool without requiring a machine called a space miner to exist.

The source combines the existence checks for the two IDs with `&&`: registration occurs only when neither machine exists. If either one already exists, the entire block is skipped; this logic does not automatically register the missing machine. Structure registration uses the same paired checks.

## Complete Structures for Both Machines

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(SPACE_ELEVATOR)
            && !event.structures().containsKey(SPACE_REASSEMBLER)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer()
                                // ...省略
                                .where('X', block(Identifier.parse("minecraft:smooth_quartz")))
                                .where('A', block(Identifier.parse("minecraft:amethyst_block")))
                                .where('B', coupler())
                                .where('D', any(
                                        block(Identifier.parse("minecraft:smooth_quartz")),
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput(),
                                        BlockConditions.factoryController()
                                ))
                                .controller('E')
                        )
                )
                .build(SPACE_ELEVATOR);
        event.registerStructure(structure);

        structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("AAA", "XBX", "XBX", "XDX")
                                .layer("AAA", "BEB", "B B", "DDD")
                                .layer("AAA", "XFX", "XBX", "XDX")
                                .where('X', block(Identifier.parse("minecraft:quartz_pillar")))
                                .where('A', block(Identifier.parse("minecraft:amethyst_block")))
                                .where('B', any(
                                        block(Identifier.parse("minecraft:smooth_quartz")),
                                        BlockConditions.itemInput(),
                                        BlockConditions.itemOutput(),
                                        BlockConditions.energyInput()
                                ))
                                .where('D', block(Identifier.parse("minecraft:glass")))
                                .where('E', coupler())
                                .controller('F')
                        )
                )
                .build(SPACE_REASSEMBLER);
        event.registerStructure(structure);
    }
}
```

### Couplers and Port Installation Points

The elevator has 17 layers, each with 12 rows that are 17 characters wide. The reassembler has 3 layers, each with 4 rows that are 3 characters wide. Blank positions have no conditions and are ignored. Each pattern binds exactly one character to its controller.

- The elevator's `B` uses `BlockConditions.coupler()`, and the module's `E` also uses `coupler()`, providing physical connection points between the host and module.
- The elevator's `D` allows smooth quartz, item inputs and outputs, energy inputs, and **factory controllers**. The module's `B` allows smooth quartz, item inputs and outputs, and energy inputs.
- Coupler conditions only declare installation points. They do not replace the acceptance relationship declared by `acceptedModule(...)` or a recipe's `requiredHost(...)` requirement.

`fullStructure(...)` and `pattern(...)` use `Consumer` callbacks to configure drafts provided by the library. The two final `build(machineId)` calls each produce a `StructureSpec`.

## Potion Component Helper Method

```java
private static ComponentConstraints potion(String potionId) {
    JsonObject contents = new JsonObject();
    contents.addProperty("potion", potionId);

    return ComponentConstraints.ofIds(Map.of(
            Identifier.parse("minecraft:potion_contents"),
            ComponentConditions.exact(contents)));
}
```

This helper constructs an exact constraint for the vanilla `potion_contents` data component; it does not register a new potion. `ComponentConditions.exact(...)` describes the entire JSON value, and `ComponentConstraints.ofIds(...)` combines constraints by component ID. On inputs, these constraints are used for matching; on outputs, they generate exact component values. Non-exact conditions cannot be used as output data.

## Three Complete Recipes

```java
@SubscribeEvent
public static void register(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(SPACE_REASSEMBLER.withSuffix("_space_reassembler_1"))
            .recipePool(SPACE_REASSEMBLER)
            .inputItem(Ingredient.of(Items.POTION), 1, potion("minecraft:water"), 1F)
            .outputItem(new ItemStack(Items.POTION), potion("minecraft:healing"))
            .inputEnergy(100)
            .parallelized(true)
            .duration(100)
            .requiredHost(SPACE_ELEVATOR)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(SPACE_REASSEMBLER.withSuffix("_space_miner_1"))
            .recipePool(SPACE_MINER)
            .inputItem(Items.APPLE, 1)
            .outputItem(Items.IRON_INGOT, 12)
            .inputEnergy(100)
            .parallelized(true)
            .duration(200)
            .build();
    event.registerRecipe(recipe);

    recipe = Recipes
            .recipe(SPACE_ELEVATOR.withSuffix("_recipe_1"))
            .recipePool(SPACE_ELEVATOR)
            .inputItem(Items.APPLE, 1)
            .outputItem(Items.GOLDEN_APPLE, 3)
            .inputEnergy(100)
            .parallelized(true)
            .duration(1000)
            .build();
    event.registerRecipe(recipe);
}
```

| Recipe ID (namespace omitted) | Recipe Pool | Base Input → Output | Duration | Host Requirement |
| --- | --- | --- | --- | --- |
| `space_reassembler_space_reassembler_1` | `space_reassembler` | 1 Water Bottle → 1 Potion of Healing | 100 ticks (5 seconds) | `space_elevator` |
| `space_reassembler_space_miner_1` | `space_miner` | 1 Apple → 12 Iron Ingots | 200 ticks (10 seconds) | Not explicitly declared |
| `space_elevator_recipe_1` | `space_elevator` | 1 Apple → 3 Golden Apples | 1000 ticks (50 seconds) | Not explicitly declared |

All three recipes have a base energy cost of 100 FE/t and declare `parallelized(true)`. This only makes the recipes eligible for parallel processing; it does not replace the machine's capabilities or controller configuration. The source does not explicitly enable `parallelizable(true)` for either machine.

The final `1F` argument for the Water Bottle input is `consumeChance`, meaning the input is consumed with a 100% probability. The output uses a new `Items.POTION` stack with a healing potion component attached, rather than modifying the original input stack in place.

`requiredHost(SPACE_ELEVATOR)` is a host restriction specific to this potion recipe. The mining pool recipe does not make the same call, so the potion recipe's restriction cannot be applied to all recipes across the pools. Whether the module can operate is still governed by the module connection mechanism.

## From Declaration to Operation

1. **Startup**: The elevator declares the `HOST` role and accepts the reassembler's ID. The reassembler declares the `MODULE` role and an ordered list of recipe pools.
2. **Structure registration**: Two complete patterns are registered separately, with couplers providing installation points for connections in the world.
3. **Construction**: The host and module each form their own structures and connect through couplers. Declaring an acceptance relationship does not mean a module already exists in the world.
4. **Operation**: The reassembler searches its list of pools for recipes and processes them after checking input components, materials, energy, host requirements, and other conditions.

## Further Reading

- [MachineKind](../API/JavaAPI#machinekind) / [MachineDraft](../API/JavaAPI#machinedraft): Hosts, modules, and acceptance relationships.
- [BlockConditions](../API/JavaAPI#blockconditions-and-blockcondition): Couplers and port conditions.
- [RecipeDraft](../API/JavaAPI#recipedraft): Recipe pools and host requirements.
- [ComponentConstraints](../API/JavaAPI#componentconstraints) / [ComponentConditions](../API/JavaAPI#componentconditions-and-conditional-view): Exact matching and output of vanilla data components.
