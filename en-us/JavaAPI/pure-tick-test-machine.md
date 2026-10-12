---
title: Pure Tick Test Machine
order: 14
---

# Pure Tick Test Machine

This machine uses no recipes and is driven directly by `serverTick`. Every 40 ticks, it first attempts to consume 10 FE; after succeeding, it finds players around the controller and summons lightning, then attempts to convert one iron ingot into one gold nugget.

## Files and APIs Involved

- [PURE_TICK_MACHINE.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/builtin/PURE_TICK_MACHINE.java)
- [KubeJS structure comparison](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Pure_Tick_Machine.js): its ID is `mmcr_kubejs:kubejs_pure_tick_machine`, not this page's Java ID.

| API | Purpose and signature reference |
| --- | --- |
| `Machines` / `Structures` | Declare `MachineSpec` / `StructureSpec` |
| `RegisterMachineDefinitionsEvent` / `RegisterMachineStructuresEvent` | Definition and structure registration events |
| `TickHooks` / `TickContext` | [Callback configuration](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/TickHooks.java) / [direct tick context](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/TickContext.java) |
| `MachineContext` | [World, position, text, and IO views](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/behavior/MachineContext.java) |
| `IoTransaction` / `IoSnapshot` | [Single-use plans](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/runtime/IoTransaction.java) / [capability collection view](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/runtime/IoSnapshot.java) |
| `Requirements` / `IoValues` / `IoDirection` | [Requirement factory](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/requirement/Requirements.java) / [item and fluid IO value factories](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/IoValues.java) / input-output direction |
| `OutputMode` | Require full acceptance or allow partial output acceptance |
| `BlockConditions` | Block and port conditions |
| `ControllerTexts` / `ControllerText` / `TextScope` | [Initialization registration](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/presentation/ControllerTexts.java) / [live screen handle](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/presentation/ControllerText.java) / line scope |

## Machine Definition and Text Initialization

```java
private static final Identifier PURE_TICK_MACHINE = id("pure_tick_machine");
private static final Identifier FE_STATUS = id("fe_status");
private static final Identifier PURE_TICK_STATUS = id("pure_tick_status");

public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
    ControllerTexts.register(PURE_TICK_MACHINE, (ControllerTextContext context) -> {
        context.screenText().append(TextScope.CONTROLLER, FE_STATUS,
                Component.literal("FE is needed!"));
        context.screenText().append(TextScope.CONTROLLER, PURE_TICK_STATUS,
                Component.literal("No Ingot input"));
    });
    if (!event.definitions().containsKey(PURE_TICK_MACHINE)) {
        MachineSpec machine = Machines.machine(PURE_TICK_MACHINE)
                .recipePool(PURE_TICK_MACHINE)
                .displayNameKey("machine.mmcr.pure_tick_machine")
                .appearance(a -> a.machineBasicBlock(Identifier.parse("minecraft:green_terracotta")))
                .allowMultithreading()
                .maxParallelism(Integer.MAX_VALUE)
                .tickBehavior(behavior -> behavior.serverTick((TickContext context) -> {
                    // 将下文 serverTick 的三段代码按顺序放入这里。
                }))
                .build();
        event.registerMachine(machine);
    }
}
```

`ControllerTexts.register` binds a text callback and returns a registration handle that can be `unregister()`ed. It registers two `CONTROLLER` text lines here, then the runtime callback updates them with `replace`. The registration callback's `ControllerTextContext` and the machine tick callback's `TickContext` are different interfaces.

The public configuration entry point `tickBehavior` accepts `TickHooks`; the signature of `serverTick` is `TickHooks serverTick(Consumer<TickContext> callback)`. It **does not** require an addon to implement a low-level `MachineBehavior.TickCallback`, nor does it call a public `TickBehavior.Builder.build()`.

This example calls `allowMultithreading()` and sets a `maxParallelism` limit, but does not call `parallelizable(true)`; setting a limit does not enable parallel processing. The single item conversion in the callback is still explicitly written as 1 iron ingot and 1 gold nugget, and does not automatically become an arbitrary quantity because of `maxParallelism`.

## serverTick Callback

### 1. Throttling and Energy Commit

```java
if (!context.isDue(40)) return;
IoTransaction planFe = context.ioPlan();
planFe.addInput(Requirements.energy(IoDirection.INPUT, 10));
var feSimulation = planFe.simulate();
if (!feSimulation.energySatisfied()) {
    context.screenText().replace(FE_STATUS, Component.literal("FE is needed!"));
    return;
}
if (!planFe.commit().successful()) {
    context.screenText().replace(FE_STATUS, Component.literal("FE consume error!"));
    return;
}
context.screenText().replace(FE_STATUS, Component.literal("Machine do a run!"));
```

`isDue(40)` triggers aligned to a game-time interval, rather than recording when this machine last ran 40 ticks ago. `simulate()` returns `IoSimulation`; satisfying the energy requirement does not mean the energy was already consumed. `commit()` returns `IoCommitResult`, whose `successful()` result must be checked.

Each `ioPlan()` creates an independent, single-use `IoTransaction`. A committed plan cannot be reused; the later item conversion needs a separate plan. Requirements are constructed with `Requirements.energy`, so there is no need to reference a low-level direction enum or construct an energy record directly.

### 2. World Side Effects: Player Range and Lightning

```java
var level = context.level();
var pos = context.controllerPos();
var area = new AABB(pos.getX() - 1, level.getMinY(), pos.getZ() - 1,
        pos.getX() + 2, level.getMaxY() + 1, pos.getZ() + 2);
var players = level.getEntitiesOfClass(Player.class, area);
for (var player : players) {
    LightningBolt bolt = EntityType.LIGHTNING_BOLT.create(level, EntitySpawnReason.EVENT);
    if (bolt != null) {
        bolt.setPos(player.getX(), player.getY(), player.getZ());
        bolt.setVisualOnly(false);
        level.addFreshEntity(bolt);
    }
}
```

The horizontal range covers the 3x3 area around the controller, while the vertical range spans the world's full height. `setVisualOnly(false)` means the lightning is not merely visual.

This occurs after the energy commit and before the item commit: **having no iron ingot or nowhere to place the output does not undo the FE already consumed or lightning already generated**. Entity spawning does not participate in the IO transaction, so the whole callback cannot be treated as an automatically rolled-back "single recipe."

### 3. Iron Ingot Input and Gold Nugget Output

```java
IoTransaction plan = context.ioPlan();
plan.addInput(Requirements.itemInput(IoValues.itemInput(Ingredient.of(Items.IRON_INGOT), 1)));
plan.add(Requirements.itemOutput(IoValues.itemOutput(new ItemStack(Items.GOLD_NUGGET, 1))));
var simulation = plan.simulate();
if (!simulation.inputsSatisfied()) return;
boolean outputAvailable = true;
for (var output : simulation.outputs()) {
    if (output.accepted() < output.requested()) {
        outputAvailable = false;
        break;
    }
}
if (!outputAvailable) return;
context.screenText().replace(PURE_TICK_STATUS, Component.literal("Iron Ingot inputed"));
plan.commit();
```

`IoValues.itemInput` / `itemOutput` first construct public IO values, which `Requirements` then converts into requirements. `add` routes by direction, and output uses `OutputMode.REQUIRE_FULL` by default; to allow partial acceptance, explicitly call `addOutput(requirement, OutputMode.ALLOW_PARTIAL)`.

Elements of `simulation.outputs()` are `OutputAcceptance`: `requested()` is the requested amount, and `accepted()` is the amount that can be accepted in the simulation, not the amount actually output. This continues only if the output can be placed in full.

:::info
The final line in the current builtin directly calls `plan.commit()` without checking its result, and the screen is updated before the commit. This preserves the original example order; the on-screen "inputed" text cannot guarantee that the actual commit succeeded. When writing your own machine, check the result as required by the business logic and update the display after success.
:::

## Context and IO View Signatures

The following are excerpts of public interface methods used on this page; their types come respectively from `publicapi.behavior`, `publicapi.runtime`, and `publicapi.presentation`, while the world types come from Minecraft.

```java
// TickContext extends MachineContext
int factoryThreadCount();
long parallelism();
Optional<Float> smartInterfaceValue(String name);
Map<String, Float> smartInterfaceValues();
IoTransaction ioPlan();

// MachineContext
ServerLevel level();
BlockPos controllerPos();
@Nullable Identifier machineId();
long gameTime();
boolean isDue(long period);
ControllerText screenText();
@Nullable DataStore dataStorage();
IoSnapshot ioView();
JadeText jadeText();
```

`Optional` and `Map` come from `java.util`, `Nullable` comes from `org.jetbrains.annotations`, and `DataStore` comes from `publicapi.data`. These are interface signature excerpts, not code that can be placed directly in a builtin method body. `TickContext` adds the five accessors above and no longer exposes the low-level `capabilityTickContext`.

`IoSnapshot` is a capability collection view whose quantity queries read live storage; Snapshot in its name **does not mean all values are frozen**. Common queries include `itemAmount(Ingredient)`, `itemOutputCapacity(ItemStack)`, and `energyInput()`; these queries do not replace commit validation.

## Multiblock Structure

```java
@SubscribeEvent
public static void registerStructures(RegisterMachineStructuresEvent event) {
    if (!event.structures().containsKey(PURE_TICK_MACHINE)) {
        StructureSpec structure = Structures.structure()
                .fullStructure(s -> s.pattern(p -> p
                        .layer("XXX", "AAA", "XXX")
                        .layer("XXX", "A A", "X X")
                        .layer("XXX", "ACA", "XXX")
                        .where('X', block(Blocks.GREEN_TERRACOTTA))
                        .where('A', any(BlockConditions.itemInput(), BlockConditions.itemOutput(),
                                BlockConditions.energyInput(), BlockConditions.parallelControllers(),
                                BlockConditions.factoryController(), block(Blocks.GREEN_WOOL)))
                        .controller('C')))
                .build(PURE_TICK_MACHINE);
        event.registerStructure(structure);
    }
}
```

## Screen Text Scopes and Refreshing

| Method | Current public semantics |
| --- | --- |
| `append(scope, lineId, text)` | Updates the same ID within the same scope |
| `appendAfter(scope, lineId, afterLineId, text)` | Inserts after the reference line in the same scope; does nothing for a missing or cross-scope reference line |
| `replace(lineId, text)` | Queues a replacement; the controller refreshes after processing, and the current text snapshot does not change immediately |
| `remove(scope, lineId)` / `clear(scope)` | Removes by scope |

This example initializes lines in `CONTROLLER` and updates them with `replace` at runtime; it does not write JADE text. `CONTROLLER` lines are managed by the caller, while `OPERATION` lines are reset with the operation lifecycle, so same-named lines in the two scopes should not be considered the same line.

## PURE_TICK and RECIPE_TICK

| Scenario | Recommended public entry point | Reason |
| --- | --- | --- |
| Continuous passive effects, range entity search, fully custom IO | `tickBehavior` / `TickHooks.serverTick` | Manually control throttling and single-use IO plans |
| Change recipe quantities, duration, or output before start | `recipeBehavior` / `RecipeHooks.beforeStart` | Modifies the candidate recipe being run |
| Display progress or apply effects while a recipe runs | `RecipeHooks.recipeTick` | Can read tick, parallelism, and IO views, but has no edit or cancellation setter |
| Adjust output before completion | `RecipeHooks.beforeFinish` | Output has not been finally committed |
| Global per-tick logic in recipe mode | `RecipeHooks.preServerTick` / `postServerTick` | Not limited to times when a recipe is running |

`TickHooks` has only `serverTick`; the public interface itself does not provide pre/post hooks for recipe mode. A pure tick machine has no recipe registration, and all conversion requirements come from `IoTransaction` inside the callback.

## Further Reading

- [Recipe Tick Test Machine](./recipe-tick-test-machine): recipe lifecycle and safe requirement replacement.
- [Data Storage Test Machine](./data-store-test-machine): transactional writes and borrowed handles.
- [Java Public API Reference](../API/JavaAPI).
