---
title: Monster Farm
order: 10
---

# Monster Farm

The monster farm has only a machine definition and structure, **with no registered recipes or entity-processing behavior**. It uses a log-and-iron-bars cage to demonstrate controller vertical-placement policy, block-tag matching, and ignored positions.

## Overview

- `ControllerOptions` declares vertical placement, non-full rotational symmetry, and required vertical placement.
- `BlockConditions.tag(BlockTags.LOGS)` allows a set of blocks instead of one fixed wood type.
- Unbound spaces ignore their corresponding world positions, making them suitable for the cage's hollow area.
- A machine without recipes can be registered legally, but the name "monster farm" does not automatically make it spawn or kill monsters, or collect drops.

The monster farm is not the only builtin example that configures facing: [Cracker](cracker) also allows vertical placement and declares full rotational symmetry; this example additionally requires the controller to be vertical.

## Entry Points and Type Signatures

| Type / method | Signature and responsibility used by this example | API reference |
| --- | --- | --- |
| `MachineDefinitionProvider` | `register(RegisterMachineDefinitionsEvent)`, startup entry point | [Reference](../API/JavaAPI#machinedefinitionprovider) |
| `Machines` / `MachineDraft` | `machine(Identifier)`; `build()` → `MachineSpec` | [Reference](../API/JavaAPI#machinedraft) |
| `ControllerOptions` | `controller(Consumer<ControllerOptions>)` | [Reference](../API/JavaAPI#controlleroptions) |
| `Structures` / `StructureDraft` | `fullStructure(Consumer<StructureStageDraft>)`; `build(Identifier)` → `StructureSpec` | [Reference](../API/JavaAPI#structuredraft-and-structurespec) |
| `PatternDraft` | `layer(String...)`, `where(char, BlockCondition)`, `controller(char)` | [Reference](../API/JavaAPI#patterndraft-and-patternspec) |
| `BlockConditions` | `tag(TagKey<Block>)`, `block(Block)`, `any(BlockCondition...)` | [Reference](../API/JavaAPI#blockconditions-and-blockcondition) |
| `RegisterMachineDefinitionsEvent` | `registerMachine(MachineSpec)` | [Reference](../API/JavaAPI#registermachinedefinitionsevent-and-machineregistrar) |
| `RegisterMachineStructuresEvent` | `registerStructure(StructureSpec)` | [Reference](../API/JavaAPI#registermachinestructuresevent-and-structureregistrar) |

The definition is invoked by [BuiltInProvider](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/provider/BuiltInProvider.java). The following method and ID are in the `MONSTER_FARM` class annotated with `@EventBusSubscriber`.

## Machine Definition

```java
private static final Identifier MONSTER_FARM = id("monster_farm");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    if (!event.definitions().containsKey(MONSTER_FARM)) {
        MachineSpec machine = Machines
                .machine(MONSTER_FARM)
                .recipePool(MONSTER_FARM)
                .displayNameKey("machine.mmcr.monster_farm")
                .controller(c -> c
                        .id(MONSTER_FARM.withSuffix("_controller"))
                        .allowVerticalFacing(true)
                        .fullyRotationallySymmetric(false)
                        .requireVerticalFacing(true)
                )
                .build();
        event.registerMachine(machine);
    }
}
```

`id("monster_farm")` expands to `mmcr:monster_farm`. Addon mods should use their own namespace, such as `Identifier.fromNamespaceAndPath("my_mod", "monster_farm")`. `recipePool(MONSTER_FARM)` declares the machine's pool entry point, but does not generate recipes automatically; a pool may temporarily have no rules.

`definitions().containsKey(...)` prevents duplicate registration of the machine ID. `build()` returns `MachineSpec`, which the startup event submits. The controller ID is `mmcr:monster_farm_controller`, distinct from the machine ID.

### Three Facing Options

`controller(...)` has the signature `controller(Consumer<ControllerOptions>)`. The callback directly configures library-provided options; a block callback does not return the configured object.

| Option | Effect | Meaning in this example |
| --- | --- | --- |
| `allowVerticalFacing(true)` | Allows up/down in addition to the four horizontal directions | Explicitly enables vertical placement |
| `fullyRotationallySymmetric(false)` | Does not declare fully rotationally symmetric controller behavior | Retains directional controller behavior |
| `requireVerticalFacing(true)` | Requires vertical placement | Excludes the four horizontal directions |

`requireVerticalFacing(true)` also enables vertical facing, so the preceding `allowVerticalFacing(true)` is redundant but clear. `fullyRotationallySymmetric(false)` is the default and is explicitly written in the source.

Do not infer that a structure bypasses facing checks from texture options. Placement facing affects the pattern-to-world coordinate transformation; a vertical controller can also have horizontal roll direction, so `UP` and `DOWN` facing values do not mean there are only two complete world transformations.

## Complete Structure

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(MONSTER_FARM)) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("XXXXX", "XXXXX", "XXXXX", "XXXXX", "XXXXX")
                                .layer("ABBBA", "B   B", "B   B", "B   B", "ABBBA")
                                .layer("ABBBA", "B   B", "B   B", "B   B", "ABBBA")
                                .layer("ABBBA", "B   B", "B   B", "B   B", "ABBBA")
                                .layer("ABBBA", "B   B", "B   B", "B   B", "ABBBA")
                                .layer("XXXXX", "XXXXX", "XXDXX", "XXXXX", "XXXXX")
                                .where('X', any(tag(BlockTags.LOGS)))
                                .where('A', block(Blocks.OAK_LOG))
                                .where('B', block(Blocks.IRON_BARS))
                                .controller('D'))
                )
                .build(MONSTER_FARM);
        event.registerStructure(structure);
    }
}
```

`@EventBusSubscriber` and `@SubscribeEvent` automatically subscribe to `RegisterMachineStructuresEvent` on the game event bus; no manual `bus.register(...)` is needed.

### Slice Shape and Spaces

The six slices, each 5 rows by 5 columns, form a 5x5x6 cage:

```text
Slice 0         Slices 1..4     Slice 5
XXXXX          ABBBA          XXXXX
XXXXX          B   B          XXXXX
XXXXX          B   B          XXDXX
XXXXX          B   B          XXXXX
XXXXX          ABBBA          XXXXX
```

The ends are log covers. The four middle slices have oak-log corner posts, iron-bar edges, and a central 3x3 area. The 36 internal spaces have no bound condition, so they neither require air nor inspect contained blocks or entities. This ignored-position behavior alone is not a game-logic check that a "spawn space" is usable.

All slices must have equal row counts and row widths. Controller placement policy and pattern transformation determine world orientation; the diagram shows local coordinates.

### Block Conditions in Detail

**`where('X', any(tag(BlockTags.LOGS)))`**

`tag(...)` matches the vanilla log tag, allowing its woods and variants. With one subcondition, `any(...)` is equivalent to that condition; other candidate blocks could be added later, but this example has none.

**`where('A', block(Blocks.OAK_LOG))`**

Corner posts are fixed to oak logs; `block(...)` does not restrict `axis=x/y/z`. To require a particular state, use `state("minecraft:oak_log[axis=y]")` and enable `stateSensitive()` as needed; compare [Reactor](reactor).

**`where('B', block(Blocks.IRON_BARS))`**

Bars constrain only the block type, not a particular connection state.

**`controller('D')`**

There is no manually written `where('D', ...)`; the pattern build stage binds this machine's controller. The controller character must occur once in the pattern, and `build(MONSTER_FARM)` returns the `StructureSpec` bound to the machine ID.

### Why There Are No Ports

The source uses no item, fluid, or energy port conditions and has no `portTiers(...)`. It accepts no materials and produces no items, so it needs no processing IO; [Blast Furnace](blast-furnace) allows item input/output and energy input at `I` positions.

## What No Recipes Means

The source has neither a `RegisterMachineRecipesEvent` subscription method nor registered tick behavior. The machine can demonstrate a structure and controller, but cannot enter a monster-processing flow automatically based on cage shape alone.

To extend it into a working machine, choose an approach that matches the intended behavior:

1. **Processing recipe**: use `Recipes.recipe(...)` to create `RecipeDraft`, submit `RecipeSpec` in `RegisterMachineRecipesEvent`, and add the required ports to the structure. Random byproducts can use `outputChance(ItemStack, float)`; see [Distillation Tower](distillation-tower).
2. **World behavior**: configure entity-interaction callbacks with `MachineDraft.tickBehavior(Consumer<TickHooks>)` or `preServerTick(Consumer<MachineContext>)`; both behavior contexts and hooks come from `publicapi.behavior`. This file provides no such implementation.

These two paths solve different problems: adding recipes does not automatically scan entities, and adding behavior still needs explicit resources, drops, and runtime conditions.

## Comparison with Blast Furnace

| Dimension | Blast Furnace | Monster Farm |
| --- | --- | --- |
| Registration stages | Definition + structure + recipes, plus client JEI workstation | Definition + structure |
| Controller options | Uses defaults | Explicitly configures three facing options |
| Structure | 3x3x3 | 5x5x6 |
| Ignored spaces | 1 block | 36 blocks |
| Ports | Item input/output, energy input | None |
| Port tiers | Inputs at least `NORMAL` | None |
| Tag condition | None | `tag(BlockTags.LOGS)` |
| Parallelism / multithreading | Declared enabled | Not enabled |
| Builtin recipes | **2** | 0 |

## Further Reading

- [Blast Furnace](blast-furnace): three-stage registration and JEI workstations.
- [Cracker](cracker): controller configuration that permits, but does not require, vertical placement.
- [ControllerOptions](../API/JavaAPI#controlleroptions): ID, texture, and facing options.
- [BlockConditions](../API/JavaAPI#blockconditions-and-blockcondition) / [PatternDraft](../API/JavaAPI#patterndraft-and-patternspec): tags, states, characters, and spaces.
- [TickHooks](../API/JavaAPI#recipehooks-and-tickhooks) / [MachineContext](../API/JavaAPI#machinecontext): behavior extension points.
