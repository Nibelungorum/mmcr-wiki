---
title: Java API Edition
order: 4
---

<div align=center style="background: #fff; padding: 24px; border-radius: 8px;">
    <h1 style="color: black;">Oh My IDEA</h1>
</div>

## Preparation

This section is for readers with NeoForge mod-development experience and has a **higher entry barrier**.

Before reading, make sure you are familiar with:

- The NeoForge mod-development workflow.
- The `ServiceLoader` mechanism (no deep knowledge required) and writing files under `META-INF`.
- NeoForge event buses, `@SubscribeEvent`, and `@EventBusSubscriber`.
- Basic Java annotations, functional interfaces, and fluent APIs, especially `Consumer`.

### Project Requirements

An addon mod needs the public API at compile time and the full MMCR mod at runtime. The target project should meet these conditions:

- Its `modid` is determined and fixed. This example assumes `my_mod`.
- It uses the Java 25 toolchain and declares MMCR as a required dependency in `src/main/resources/META-INF/neoforge.mods.toml`.
- MMCR has been added to the build script as a Maven dependency.

### Add the Dependency

First, specify the toolchain in the addon's `build.gradle`:

```groovy
java.toolchain.languageVersion = JavaLanguageVersion.of(25)
```

MMCR's publishing repository is hosted on [HowXu's Maven](https://maven.howxu.cn/). Declare it in `build.gradle` first:

```groovy
repositories {
    maven {
        name = 'HowXu'
        url = 'https://maven.howxu.cn/'
    }
}
```

Then declare MMCR dependencies as needed. MMCR is published in two variants:

- `cn.howxu:<artifactId>:<发布版本>`: the full mod JAR, including runtime implementation, Mixins, resources, and more.
- `cn.howxu:<artifactId>:<发布版本>:api`: a slim JAR containing only `cn/howxu/mmcr/publicapi/**/*.class`. It excludes underlying `api`, `internal`, and KubeJS implementations and cannot be used as a runtime mod alone.

Normally, use the API with `compileOnly` and the full mod with `runtimeOnly`. First add these **replacement variables** to the addon's `gradle.properties`:

```properties
# 必须从 Maven 实际发布记录填写，以下内容不是可解析的发布坐标
mmcr_maven_artifact=REPLACE_WITH_PUBLISHED_ARTIFACT_ID
mmcr_maven_version=REPLACE_WITH_PUBLISHED_26_1_2_VERSION
mmcr_mod_version_range=REPLACE_WITH_COMPATIBLE_MOD_VERSION_RANGE
```

Then reference the two Maven variables:

```groovy
dependencies {
    compileOnly "cn.howxu:${mmcr_maven_artifact}:${mmcr_maven_version}:api"
    runtimeOnly "cn.howxu:${mmcr_maven_artifact}:${mmcr_maven_version}"
}
```

If the full mod is needed at compile time, replace those lines with:

```groovy
dependencies {
    implementation "cn.howxu:${mmcr_maven_artifact}:${mmcr_maven_version}"
}
```

Verify the version and artifactId in the [Maven repository](https://maven.howxu.cn/). Select a Minecraft 26.1.2 release that provides both the full mod and the `api` variant. The current [`publishing.gradle`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/gradle/scripts/publishing.gradle) forms the Maven version as `${minecraft_version}-${mod_version}` and does not explicitly set `artifactId`, so it defaults to Gradle's `project.name`; the local source-directory name is not evidence of a published artifactId.

`mod_version=0.0.0` in the source is only a placeholder. The [standard release workflow](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/.github/workflows/standard-release.yml) replaces it with input `X.Y.Z`; the [development release workflow](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/.github/workflows/dev-release.yml) uses `X.Y.Z+dev-<short commit ID>`. Their Maven version forms are `26.1.2-X.Y.Z` and `26.1.2-X.Y.Z+dev-<short commit ID>`. These describe formats, not necessarily released versions.

Add the dependency to the addon's `neoforge.mods.toml` (replace `my_mod` with your modid):

```toml
[[dependencies.my_mod]]
modId="mmcr"
type="required"
versionRange="${mmcr_mod_version_range}"
ordering="AFTER"
side="BOTH"
```

`mmcr_mod_version_range` must be a compatible **mod metadata version range**, not the Maven version prefixed with Minecraft's version. Add this variable to the project's existing resource-expansion configuration, then verify the generated TOML; alternatively, write a verified range directly in `versionRange`. `ordering="AFTER"` makes the addon load after MMCR. A dependency declaration constrains loading and does not replace event-listener registration.

### Provider and Definition Events: Two Entry Points

This tutorial uses a Provider: implement `cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider`, then declare it through `ServiceLoader` for MMCR to discover. This keeps an addon's startup definitions in a dedicated entry point:

- **Dependency inversion**: MMCR does not need and cannot know each mod's entry class. Any class implementing `MachineDefinitionProvider` can be a definition entry point.
- **Mod isolation**: every mod provides its own Provider independently; MMCR iterates all declared Providers during startup.
- **Lifecycle correctness**: MMCR iterates and calls Providers during the machine-definition registration window.

**ServiceLoader is not the only required entry point.** The production flow [`StartupContentRegistration`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/registration/StartupContentRegistration.java) invokes Providers first, then posts `RegisterMachineDefinitionsEvent` on **`NeoForge.EVENT_BUS`**. You can instead subscribe directly to that event to submit machine definitions, without a Provider or SPI file. The two paths share a registration window; do not submit the same machine ID twice.

Structures and static recipes are posted through the same NeoForge game event bus. None of these three events are addon-mod lifecycle events.

### Order and Relationship of the Three Events

Registration proceeds strictly in this order:

1. **Machine definitions** (`cn.howxu.mmcr.publicapi.event.RegisterMachineDefinitionsEvent`): Providers are called first, then the definition event is posted; `MachineSpec` instances are collected and controllers registered.
2. **Structures** (`cn.howxu.mmcr.publicapi.event.RegisterMachineStructuresEvent`): posted after controllers exist, submitting `StructureSpec` for defined machines.
3. **Static recipes** (`cn.howxu.mmcr.publicapi.event.RegisterMachineRecipesEvent`): posted after item components are bound, collecting `RecipeSpec`.

All three Java registration phases are startup declarations and are not reposted by `/reload`. After declarations are collected, their windows freeze; do not retain an event and register after its window closes. Recompile and restart after code changes.

Duplicate IDs, unknown target machines, and submissions to frozen windows are rejected by the public registration layer and reported as `cn.howxu.mmcr.publicapi.registration.RegistrationException`. When troubleshooting, first check the machine ID, recipe-pool ID, registration stage, and whether the same registration code is enabled through both a Provider and the definition event.

The public API uses a **draft/spec** model: `Machines.machine(...)`, `Structures.structure()`, and `Recipes.recipe(...)` return configurable `MachineDraft`, `StructureDraft`, and `RecipeDraft`; `build(...)` produces `MachineSpec`, `StructureSpec`, and `RecipeSpec`, which are then submitted through events. `build()` itself does not register anything. Nested configuration uses `Consumer`; callers need not implement draft interfaces or access underlying builders.

## Machine Definition Stage

Machine definitions create a draft through `Machines` and submit it to MMCR's registration window through a Provider or definition event.

### 1. Implement the Provider Class

Create `MyFirstMachineProvider.java` at:

```
src/main/java/com/example/myfirstmachine/MyFirstMachineProvider.java
```

Its main contents are:

```java
package com.example.myfirstmachine;

public final class MyFirstMachineProvider implements MachineDefinitionProvider {

    private static final Identifier MY_FIRST_MACHINE =
            Identifier.fromNamespaceAndPath("my_mod", "my_first_machine");

    @Override
    public void register(RegisterMachineDefinitionsEvent event) {
        MachineSpec definition = Machines
                .machine(MY_FIRST_MACHINE)
                .recipePool(MY_FIRST_MACHINE)
                .displayNameKey("machine.my_mod.my_first_machine")
                .appearance(a -> a.machineBasicBlock("minecraft:purpur_block"))
                .build();
        event.registerMachine(definition);
    }
}
```

### 2. Declare the ServiceLoader File

Create `META-INF/services/` in the resources directory, then create:

```
src/main/resources/META-INF/services/cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider
```

The filename must be `cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider`.

Write the Provider class's fully qualified name, one per line:

```
com.example.myfirstmachine.MyFirstMachineProvider
```

At startup, MMCR iterates declared Providers and calls `register` on each. A Provider must be a public class that ServiceLoader can instantiate and have a public no-argument constructor; the class above uses the implicit public no-argument constructor. Confirm that the resource file is packaged in the addon JAR.

Listeners must be registered before MMCR posts the definition event.

### Field Reference

The interfaces used in the example mean:

- `MachineDefinitionProvider.register(RegisterMachineDefinitionsEvent)`: the Provider's startup registration callback.
- `RegisterMachineDefinitionsEvent.registerMachine(MachineSpec)`: submits a machine declaration. `registerMachine(Identifier, Consumer<MachineDraft>)` can also configure one directly within the event.
- `Machines.machine(Identifier)`: creates a `MachineDraft` from a namespaced ID.
- `MachineDraft.recipePool(Identifier...)`: declares the recipe pools used by the machine. This tutorial uses the same ID for the pool and machine, but they are separate concepts and several machines may share a pool.
- `MachineDraft.displayNameKey(String)`: sets a localization key; `machine.<namespace>.<machine registry name>` is recommended.
- `MachineDraft.appearance(Consumer<AppearanceOptions>)`: configures basic appearance; `AppearanceOptions.machineBasicBlock(String)` sets the appearance block ID.
- `MachineDraft.build()`: creates an immutable `MachineSpec` declaration.

When behavior is not explicitly set, a machine is recipe-driven by default. The public Java API's `build()` plus event submission corresponds to KubeJS's `createMachine(...).register()`.

## Structure Stage

After machine-definition registration finishes and a controller exists, submit structures by subscribing to `RegisterMachineStructuresEvent`.

### 1. Create a Subscriber Class

Create `MyFirstMachineRegistrar.java` at:

```
src/main/java/com/example/myfirstmachine/MyFirstMachineRegistrar.java
```

Its contents are:

```java
package com.example.myfirstmachine;

@EventBusSubscriber(modid = "my_mod")
public final class MyFirstMachineRegistrar {

    private static final Identifier MY_FIRST_MACHINE =
            Identifier.fromNamespaceAndPath("my_mod", "my_first_machine");

    @SubscribeEvent
    public static void registerStructures(RegisterMachineStructuresEvent event) {
        StructureSpec structure = Structures
                .structure()
                .fullStructure(s -> s
                        .pattern(p -> p
                                .layer("XXX", "XHX", "XXX")
                                .layer("XHX", "HCH", "XHX")
                                .layer("XXX", "XHX", "XXX")
                                .where('X', BlockConditions.block(Blocks.PURPUR_PILLAR))
                                .where('H', BlockConditions.block(Blocks.PURPUR_PILLAR))
                                .controller('C')
                        )
                )
                .build(MY_FIRST_MACHINE);
        event.registerStructure(structure);
    }
}
```

### 2. Field Reference

The interfaces used in the example mean:

- `@EventBusSubscriber(modid = "my_mod")`: automatically registers the class's static subscriber methods. This tutorial's events are posted on `NeoForge.EVENT_BUS`; do not attach them to the mod lifecycle bus. The 26.1.2 annotation requires no legacy `bus` parameter.
- `RegisterMachineStructuresEvent.structures()`: returns a read-only snapshot of currently collected structures.
- `RegisterMachineStructuresEvent.registerStructure(StructureSpec)`: submits a structure; the target machine must already be defined. `registerStructure(Identifier, Consumer<StructureDraft>)` is also supported.
- `Structures.structure()`: creates a `StructureDraft`.
- `StructureDraft.fullStructure(Consumer<StructureStageDraft>)`: configures a complete structure stage; this example needs only one.
- `StructureStageDraft.pattern(Consumer<PatternDraft>)`: configures a stage pattern. Single-stage structures may use `StructureDraft.singlePattern(...)` shorthand.
- `StructureDraft.build(Identifier)`: creates a `StructureSpec` bound to the target machine ID.
- `PatternDraft.layer(String... rows)`: declares one z layer. Strings in one call are y rows from bottom to top, and characters in each row are x columns. A space `' '` means that position is not checked.
- `PatternDraft.where(char, BlockCondition)`: binds a character to a matching condition.
- `PatternDraft.controller(char)`: specifies the controller character; the entire pattern must contain exactly one controller.
- `PatternDraft.build()`: may independently create a `PatternSpec`; the nested configuration above builds it while building the structure.
- `BlockConditions.block(Block)`: creates a condition that directly matches a block.

All `layer(...)` strings must have equal widths, and all z layers must have equal numbers of y rows. The example is a 3x3x3 structure, `C` appears only once, and `H` is reserved for ports in the next step.

## Replaceable Ports

Once the machine is built, it must reserve replaceable port positions in its structure to receive items and energy. The public API's `BlockConditions` provides matching conditions for built-in port families.

### 1. Change the Pattern Binding

Change `.where('H', BlockConditions.block(Blocks.PURPUR_PILLAR))` to:

```java
.where('H', BlockConditions.any(
        BlockConditions.block(Blocks.PURPUR_PILLAR),
        BlockConditions.itemInput(),
        BlockConditions.itemOutput(),
        BlockConditions.energyInput()
))
```

After making the change, recompile and restart the game.

### 2. Field Reference

The interfaces used in the example mean:

- `BlockConditions.any(BlockCondition...)`: matches any subcondition.
- `BlockConditions.itemInput()`: matches the built-in item-input port family.
- `BlockConditions.itemOutput()`: matches the built-in item-output port family.
- `BlockConditions.energyInput()`: matches the built-in energy-input port family.

After retaining the purpur pillar condition, unused `H` positions can still be filled with purpur pillars. Replace at least three positions with item input, item output, and energy input ports to run the example recipe below.

The Java API does not support runtime hot reload of port bindings. Recompile and restart after changing predicates.

## Recipe Stage

Static recipes are registered by subscribing to `RegisterMachineRecipesEvent`. A recipe pool can contain multiple recipes, but recipe IDs must be globally unique. This example continues using the pool declared by the machine definition, `my_mod:my_first_machine`.

### 1. Extend the Subscriber Class

Add a subscriber method to the same `MyFirstMachineRegistrar.java` class.

First add these imports:

```java
import cn.howxu.mmcr.publicapi.Recipes;
import cn.howxu.mmcr.publicapi.event.RegisterMachineRecipesEvent;
import cn.howxu.mmcr.publicapi.recipe.RecipeSpec;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.crafting.Ingredient;
```

```java
@SubscribeEvent
public static void registerRecipes(RegisterMachineRecipesEvent event) {
    RecipeSpec recipe = Recipes
            .recipe(Identifier.fromNamespaceAndPath("my_mod", "my_first_machine_recipe_1"))
            .recipePool(MY_FIRST_MACHINE)
            .inputItem(Ingredient.of(Items.IRON_INGOT), 1)
            .outputItem(Items.IRON_NUGGET, 10)
            .inputEnergy(10)
            .duration(200)
            .build();
    event.registerRecipe(recipe);
}
```

### Field Reference

The interfaces used in this example mean:

- `RegisterMachineRecipesEvent.registerRecipe(RecipeSpec)`: submits a recipe; `registerRecipe(Identifier, Consumer<RecipeDraft>)` is also available. Avoid duplicate IDs.
- `Recipes.recipe(Identifier)`: creates a `RecipeDraft`.
- `RecipeDraft.recipePool(Identifier)`: specifies the recipe pool. The machine definition's `.recipePool(...)` must contain this pool before it can use its recipes.
- `RecipeDraft.inputItem(Ingredient, int)`: declares an item input.
- `RecipeDraft.outputItem(Item, int)`: declares an item output.
- `RecipeDraft.inputEnergy(long)`: declares FE consumed per tick; `iFEt(long)` is an equivalent shorthand.
- `RecipeDraft.duration(int)`: declares total recipe time in ticks; it must be positive.
- `RecipeDraft.build()`: creates a `RecipeSpec`.

### 2. Recipe Field Reference

| Field | Value | Meaning |
| --- | --- | --- |
| `id` | `my_mod:my_first_machine_recipe_1` | Recipe registry ID |
| `recipePoolId` | `my_mod:my_first_machine` | Recipe pool ID |
| `inputItem` | `IRON_INGOT × 1` | Consumes 1 iron ingot |
| `outputItem` | `IRON_NUGGET × 10` | Produces 10 iron nuggets |
| `inputEnergy` | `10 FE/tick` | Consumes 10 FE per tick |
| `duration` | `200 tick` | Total recipe time: 10 seconds |

## Next Steps

Before compiling and launching, add translations to the addon's `src/main/resources/assets/my_mod/lang/zh_cn.json`:

```json
{
    "machine.my_mod.my_first_machine": "我的第一台 MMCR 机械",
    "recipe_pool.my_mod.my_first_machine": "我的第一台 MMCR 机械",
    "item.mmcr.my_first_machine_controller": "我的第一台 MMCR 机械控制器",
    "block.mmcr.my_first_machine_controller": "我的第一台 MMCR 机械控制器"
}
```

Machine names and recipe-pool names are two translation-key sets. MMCR registers the currently generated controller, whose actual block/item ID is `mmcr:my_first_machine_controller`; do not confuse it with the machine ID `my_mod:my_first_machine`.

After compiling and launching the game:

- Use `/mmcr build my_mod:my_first_machine` in-game to build the machine quickly.
- With JEI installed, view the recipe in the recipe display.
- Place input and output ports on the multiblock machine, connect energy and materials, and it runs according to the recipe.
