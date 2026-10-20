---
title: JavaAPI
---

# Java Public API Reference

This page lists the Java public layer's entry points, declarations, runtime views, and extension contracts.

## Package paths and boundaries

The public API root package is **`cn.howxu.mmcr.publicapi`**. Each section below specifies its package; combine that package with a simple type name to obtain the fully qualified class name. Nested types are referenced as `OuterType.InnerType`. Signature blocks omit imports and implementation bodies; interface methods are implicitly `public`, factory methods are marked `static`, and nullable values are marked `@Nullable`.

| Packages (all prefixed with `cn.howxu.mmcr.publicapi`) | Contents |
| --- | --- |
| root | `Machines`, `Structures`, `Recipes`, `ApiIds`, `ReadableNumber` |
| `registration` `event` | Registration window, registrars, definition provider, registration exception |
| `machine` | Machine declaration, controller/appearance/factory options, smart interface |
| `structure` `structure.level` | Patterns, stages, port constraints, levels and slots |
| `recipe` `recipe.requirement` | Recipes, IO values, requirements, output extensions |
| `recipe.component` `recipe.modifier` | Data component conditions, modifiers |
| `recipe.extension` | Planning, capability access, reservations, transaction operations, synchronization Codecs |
| `behavior` `runtime` | Behavior hooks, context, IO snapshots and transactions, running status |
| `data` `network` | Data values, storage and repository contracts, queued requests |
| `presentation` | Controller text, Jade text, IO display |
| `ui` | Controller UI snapshot, typed protocol, server request and status provider |
| `client.ui` | Complete screen factory, open context, session, slot visibility and subscriptions |
| `client.render` `client.jei` | Client rendering and JEI registration |

The [`apiJar` inclusion rules](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/gradle/scripts/publishing.gradle) include only `cn/howxu/mmcr/publicapi/**/*.class`. Dependencies used in signatures, such as Minecraft, NeoForge, Gson, and Mojang Codec, must still be provided by the caller's development environment.

`cn.howxu.mmcr.api` is the underlying capability, registration and execution implementation, and `cn.howxu.mmcr.internal.api.facade` is the adaptation layer, neither of which belongs to this public jar. The public layer does not expose underlying controller block entities, capability registries, facet registries, `bridgeValue()`, or internal transformation portals. KubeJS uses the underlying API directly.

### Object ownership and extension rules

- Interfaces marked `@ApiStatus.NonExtendable`, such as `Draft`, `Options`, `Spec`, `View`, and registrars, are created by MMCR. Obtain them through factories or callbacks; **do not implement or extend them yourself, or cast them to underlying types**.
- `Draft` is a mutable configuration handle, and fluent methods return the current handle. `build()` produces a declaration view; it does not register it. MMCR automatically builds drafts configured by registration callbacks; callbacks do not need to return the builder.
- `Spec` is the declaration view; running recipes use `RecipeView` and machines use `MachineView`. They are not public records constructible with `new`.
- SPIs that add-on mods can implement include `MachineDefinitionProvider`, behavior/network/text/rendering callbacks, `Repository`, `Reservation`, `RequirementExtension`, `RequirementExecution`, `OutputExtension`, `RecipeOperation`, `OperationPlanner`, `ReservationPlanner`, `SyncPayloadCodec`, `ControllerUiFactory`, `UiRequestHandler`, and `UiStateProvider`.
- Public records serve as explicit data carriers, such as `RepositoryContext`, `RepositoryRequest`, `ResourceAmount`, `HeatState`, and extension planning results.

## 1. Registration events and Provider

`cn.howxu.mmcr.publicapi.registration` and `cn.howxu.mmcr.publicapi.event`

Startup collects content in the order **machine definitions → structures → recipes**. Java and KubeJS structure registration share the underlying collector; do not submit the same machine structure through both. MMCR closes the registration window. Public registrars and events do not expose `freeze()`, `prepare()`, `current()`, or `resetCollector()`.

### `MachineDefinitionProvider`

Full class name: `cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider`.

```java
public interface MachineDefinitionProvider {
    void register(RegisterMachineDefinitionsEvent event);
}
```

Definition registration requires implementing `MachineDefinitionProvider`. Production startup first invokes the providers discovered by `ServiceLoader.load(MachineDefinitionProvider)`, then registers dynamic controllers and freezes the window. Do not submit the same ID through both paths.

Provider example:

```java
public final class MyMachinesProvider implements MachineDefinitionProvider {
    public static final Identifier MACHINE =
            Identifier.fromNamespaceAndPath("my_mod", "my_machine");

    @Override
    public void register(RegisterMachineDefinitionsEvent event) {
        event.registerMachine(MACHINE, machine -> machine
                .displayNameKey("machine.my_mod.my_machine")
                .recipePool(Identifier.fromNamespaceAndPath("my_mod", "shared_pool")));
    }
}
```

In the resource file `META-INF/services/cn.howxu.mmcr.publicapi.registration.MachineDefinitionProvider`, list one fully qualified implementation class name per line:

```text
com.example.MyMachinesProvider
```

The provider only collects definitions; structures and recipes are still registered in their respective events. Changes to startup declarations require a game restart.

Source code: [Provider](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/registration/MachineDefinitionProvider.java), [production startup order](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/registration/StartupContentRegistration.java).

### `RegisterMachineDefinitionsEvent` and `MachineRegistrar`

```java
// event.RegisterMachineDefinitionsEvent extends net.neoforged.bus.api.Event
public RegisterMachineDefinitionsEvent();
public RegisterMachineDefinitionsEvent(MachineRegistrar registrar);
public MachineRegistrar registrar();
public void registerMachine(Identifier id, Consumer<MachineDraft> configuration);
public void registerMachine(MachineSpec definition);
public Map<Identifier, MachineSpec> definitions();

// registration.MachineRegistrar
void registerMachine(Identifier id, Consumer<MachineDraft> configuration);
void registerMachine(MachineSpec definition);
Map<Identifier, MachineSpec> definitions();
```

The callback method automatically executes the construction; the direct method accepts `MachineSpec` generated by `Machines.machine(id)...build()`. `definitions()` returns an immutable map snapshot, which can be used to check existing IDs, but should not be used to silently overwrite the declarations of other Mods. The event's public constructor does not mean that you can create the window yourself and have it adopted by the production registration system.

### `RegisterMachineStructuresEvent` and `StructureRegistrar`

```java
// event.RegisterMachineStructuresEvent extends Event
public RegisterMachineStructuresEvent(Collection<Identifier> machineIds);
public RegisterMachineStructuresEvent(StructureRegistrar registrar);
public StructureRegistrar registrar();
public void registerStructure(Identifier id, Consumer<StructureDraft> configuration);
public void registerStructure(StructureSpec structure);
public void registerLevelType(LevelTypeSpec type);
public void registerLevel(MachineLevelSpec level);
public void registerModifier(Identifier id, ModifierBundle modifier);
public void registerModifierItem(Identifier itemId, Identifier modifierId);
public Map<Identifier, StructureSpec> structures();
public Map<Identifier, LevelTypeSpec> levelTypes();
public Map<Identifier, MachineLevelSpec> levels();
public Map<Identifier, ModifierBundle> modifiers();
public Map<Identifier, List<ItemStack>> modifierItems();
public Map<Identifier, Identifier> modifierItemIds();

// registration.StructureRegistrar：与事件的注册/查询方法同名同签名
void registerStructure(Identifier machineId, Consumer<StructureDraft> configuration);
void registerStructure(StructureSpec structure);
void registerLevelType(LevelTypeSpec type);
void registerLevel(MachineLevelSpec level);
void registerModifier(Identifier id, ModifierBundle modifier);
void registerModifierItem(Identifier itemId, Identifier modifierId);
Map<Identifier, StructureSpec> structures();
Map<Identifier, LevelTypeSpec> levelTypes();
Map<Identifier, MachineLevelSpec> levels();
Map<Identifier, ModifierBundle> modifiers();
Map<Identifier, List<ItemStack>> modifierItems();
Map<Identifier, Identifier> modifierItemIds();
```

The machine ID must be declared during the definition phase, and only one structure can be submitted per machine. Register the level type before registering the level. Level declarations are retained until the structure window freezes, when block states are resolved. `levels()` also exposes pending declarations before then; do not read their `statePredicate().blockState()` early during startup.

Modifier item bindings now take item IDs rather than `ItemStack`. MMCR resolves IDs and constructs count-1 stacks only after item default data components are bound; both ordinary items and block items are supported. `modifierItemIds()` returns a read-only **item ID → modifier ID** snapshot. `modifierItems()` returns only stack bindings already held by the collector; it does not resolve or merge pending IDs, so it cannot indicate whether an ID binding exists.

Duplicate item IDs are rejected. Freezing validates level-slot, modifier-replacement, and item-binding references; later item resolution rejects unknown or empty items. Duplicate final stack bindings also fail. Startup declaration changes require a restart.

Sources: [Structure registrar](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/c5a48a934bc9de3f10c794bf582175cba6ffbe61/src/main/java/cn/howxu/mmcr/publicapi/registration/StructureRegistrar.java), [deferred resolution and validation](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/c5a48a934bc9de3f10c794bf582175cba6ffbe61/src/main/java/cn/howxu/mmcr/api/registration/StructureRegistration.java).

### `RegisterMachineRecipesEvent` and `RecipeRegistrar`

```java
// event.RegisterMachineRecipesEvent extends Event
public RegisterMachineRecipesEvent();
public RegisterMachineRecipesEvent(RecipeRegistrar registrar);
public RecipeRegistrar registrar();
public void registerRecipe(RecipeSpec recipe);
public void registerRecipe(Identifier id, Consumer<RecipeDraft> configuration);
public Map<Identifier, RecipeSpec> recipes();

// registration.RecipeRegistrar
void registerRecipe(RecipeSpec recipe);
void registerRecipe(Identifier id, Consumer<RecipeDraft> configuration);
Map<Identifier, RecipeSpec> recipes();
```

Recipe IDs are globally unique; recipes must declare a recipe pool. `recipes()` is an immutable declaration snapshot, not a list of currently running recipes. Registration events for client-side rendering, JEI, and full controller UI are described below.

### `RegistrationException`

```java
public final class RegistrationException extends IllegalStateException {
    public RegistrationException(String message);
    public RegistrationException(String message, Throwable cause);
}
```

The public adaptation layer converts underlying `IllegalStateException` errors, such as registration window rejections and duplicate declarations, into this exception; existing `RegistrationException` errors are preserved. Null arguments may still throw `NullPointerException`, and invalid declaration arguments may still throw `IllegalArgumentException`; do not describe all errors as the same exception. If a build or validation fails, fix the declaration rather than retrying after the window has closed.

## 2. Top-level entry points

`cn.howxu.mmcr.publicapi`

### `Machines`

```java
public static boolean isRegistrationOpen();
public static MachineDraft machine(Identifier id);
```

Create a draft machine declaration; `id` cannot be `null`. `isRegistrationOpen()` queries the definition registration status and is not responsible for opening the window.

### `Structures`

```java
public static StructureDraft structure();
public static PatternDraft pattern();
public static StructureStageDraft stage();
```

Factory entry points for structures, patterns, and individual stages. **The pattern entry point is `Structures.pattern()`**; there is no separate `Patterns` type at this commit.

### `Recipes`

```java
public static boolean isRegistrationOpen();
public static RecipeDraft recipe(Identifier id);
```

Query the recipe declaration window, or create a draft. `recipe(null)` throws `IllegalArgumentException`. Creating a draft and submitting it to the registrar are two different things.

### `ApiIds`

```java
public static Identifier id(String path);
```

Generates an ID in the **`mmcr` namespace**. Add-on mods should use `Identifier.fromNamespaceAndPath("my_mod", "...")` for their own IDs rather than this factory.

### `ReadableNumber`

```java
public static String format(int value);
public static String format(long value);
public static String format(BigInteger value);
public static String format(BigDecimal value);
public static String formatExact(long value);
public static String formatCompact(int value);
public static String formatCompact(long value);
public static String formatCompact(BigInteger value);
public static String formatCompact(BigDecimal value);
public static String formatForSlot(long value, int scale, String unit);
```

Used for readable numbers and slot display. `formatForSlot` accepts scaling precision and unit; it returns a display string and cannot be used as a stored value or reverse parsing protocol. Large integers/decimals should be passed directly to `BigInteger`/`BigDecimal` to avoid converting to `double` first and losing precision.

## 3. Machine declaration

`cn.howxu.mmcr.publicapi.machine`

### `MachineDraft`

Provided by `Machines.machine(id)` or a machine definition event callback.

```java
MachineDraft displayNameKey(String key);
MachineDraft recipePool(Identifier... ids);
MachineDraft controller(Consumer<ControllerOptions> configure);
MachineDraft appearance(Consumer<AppearanceOptions> configure);
MachineDraft factory(Consumer<FactoryOptions> configure);
MachineDraft recipeBehavior(Consumer<RecipeHooks> configure);
MachineDraft tickBehavior(Consumer<TickHooks> configure);
MachineDraft preServerTick(Consumer<MachineContext> callback);
MachineDraft postServerTick(Consumer<MachineContext> callback);
MachineDraft role(MachineKind kind);
MachineDraft acceptedModule(Identifier id);
MachineDraft networkInterface(int maxCount, int maxConnections);
MachineDraft allowNetworkMachine(Identifier id);
MachineDraft maxParallelism(long amount);
MachineDraft parallelizable(boolean enabled);
MachineDraft allowModifiers();
MachineDraft allowModifiers(boolean enabled);
MachineDraft allowMultithreading();
MachineDraft allowMultithreading(boolean enabled);
MachineDraft maxParallelAmount(int amount);
MachineDraft smartInterface(SmartInterfaceSpec type);
MachineDraft shareSmartInterfaces();
MachineDraft shareSmartInterfaces(boolean enabled);
MachineDraft smartInterfaceModifier(SmartModifierSpec modifier);
MachineDraft runningSound(Identifier id);
MachineDraft finishSound(Identifier id);
MachineDraft failureAction(RecipeFailureMode mode);
MachineDraft requestProcess(Identifier id, RequestHandler handler);
MachineDraft requestFailed(Identifier id, FailureHandler handler);
MachineSpec build();
```

| Configuration | Semantics and Constraints |
| --- | --- |
| `displayNameKey` | Localization key; `machine.<namespace>.<path>` is used when not set. |
| `recipePool` | An ordered, non-empty, non-duplicate list of recipe pools; only machine ID is used when not set. Each recipe still belongs to only one pool. |
| `controller` / `appearance` / `factory` | Each time a new option builder is passed in and built automatically, repeated calls will replace the corresponding specifications. |
| `recipeBehavior` / `tickBehavior` | Select the current behavior mode; the latter mode configuration can replace the previous one. Top-level pre/post tick hooks only work in recipe mode. |
| `maxParallelism` / `maxParallelAmount` | Both must be positive; the former is validated when the final declaration is built, and the latter when set. |
| `parallelizable` | Recipe parallelism is not the same concept as multiple worker threads in a factory. |
| `allowMultithreading` / `factory` | Declares multithreaded scheduling capabilities and factory thread specifications; add-on mods do not need to start Java threads themselves. |
| `allowModifiers` | Allow machine modifiers. |
| `smartInterface` | Duplicate type name throws `IllegalArgumentException`. |
| `shareSmartInterfaces` | Allows multiple identical machine controllers to bind and share the value of the same smart interface block, not a factory thread sharing switch. |
| `requestProcess` / `requestFailed` | Duplicate request IDs in the corresponding mapping throw `IllegalArgumentException`; later registrations do not overwrite earlier ones. |
| `runningSound` / `finishSound` | Optional sound resource ID. |

Defaults: machine role `NORMAL`; maximum parallelism `1L`, parallel count `1`; parallelism, modifiers, multithreading, interface sharing, and networking disabled; default recipe behavior; failure mode `STILL`; no sounds set. `HOST` must declare at least one accepted module, and other roles cannot declare accepted modules; otherwise, building throws `IllegalStateException`. Do not share drafts between threads.

Configuring tick mode will fail when the top-level pre/post hook already exists; adding a top-level pre/post hook will also fail when the current tick mode is in place. This restriction cannot be extended to "the configuration methods of the two modes will throw errors in each other in any calling order."

Source code: [public signatures](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/machine/MachineDraft.java), [underlying builder and defaults](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/MachineBuilder.java).

### `MachineSpec`

Returned by `build()` or read from `definitions()`. Declaration collections are read-only; behavior fields are exposed as views indicating which hooks are configured.

```java
Identifier id();
List<Identifier> recipePoolIds();
Identifier recipePoolId();
String displayNameKey();
ControllerOptions.View controller();
AppearanceOptions.View appearance();
FactoryOptions.View factory();
MachineKind role();
Set<Identifier> acceptedModuleIds();
NetworkSettings networkInterface();
long maxParallelism();
int maxParallelAmount();
boolean parallelizable();
boolean allowModifiers();
boolean allowMultithreading();
boolean shareSmartInterfaces();
RecipeFailureMode failureAction();
Map<String, SmartInterfaceSpec> smartInterfaceTypes();
List<SmartModifierSpec> smartInterfaceModifiers();
@Nullable Identifier runningSoundId();
@Nullable Identifier finishSoundId();
Optional<RecipeHooksView> recipeHooks();
Optional<TickHooksView> tickHooks();
Set<Identifier> requestProcessorIds();
Set<Identifier> requestFailureIds();
Map<Identifier, RequestHandler> requestProcessors();
Map<Identifier, FailureHandler> requestFailures();

// MachineSpec.RecipeHooksView
boolean hasIdleStart();
boolean hasIdleEnd();
boolean hasBeforeStart();
boolean hasRecipeTick();
boolean hasBeforeFinish();
boolean hasPreServerTick();
boolean hasPostServerTick();

// MachineSpec.TickHooksView
boolean hasServerTick();
```

`recipePoolId()` returns the first ID in the ordered pool list. `recipeHooks()` and `tickHooks()` distinguish the actual behavior mode; presence flags indicate whether callbacks are configured, and an explicitly empty callback also counts as configured. Structures are declared separately via `StructureSpec`; there are no legacy pattern array fields here.

### `MachineKind`

```java
public enum MachineKind { NORMAL, HOST, MODULE }
```

`NORMAL` is an ordinary machine, `HOST` is a module host, and `MODULE` is a module machine. Module recipes can restrict their hosts via `requiredHost(...)`.

### `ControllerOptions`

```java
ControllerOptions id(Identifier id);
ControllerOptions textures(Identifier front, Identifier otherFaces);
ControllerOptions textures(Identifier front, Identifier side, Identifier top, Identifier bottom);
ControllerOptions frontTexture(Identifier id);
ControllerOptions sideTexture(Identifier id);
ControllerOptions topTexture(Identifier id);
ControllerOptions bottomTexture(Identifier id);
ControllerOptions allowVerticalFacing();
ControllerOptions allowVerticalFacing(boolean enabled);
ControllerOptions fullyRotationallySymmetric();
ControllerOptions fullyRotationallySymmetric(boolean enabled);
ControllerOptions requireVerticalFacing();
ControllerOptions requireVerticalFacing(boolean enabled);
ControllerOptions tooltip(String... translationKeys);
ControllerOptions.View build();

// ControllerOptions.View
@Nullable Identifier id();
@Nullable Identifier frontTexture();
@Nullable Identifier sideTexture();
@Nullable Identifier topTexture();
@Nullable Identifier bottomTexture();
boolean allowVerticalFacing();
boolean fullyRotationallySymmetric();
boolean requireVerticalFacing();
List<String> tooltip();
```

The two-argument `textures` overload sets all remaining faces to the same texture; the four-argument overload sets the front, side, top, and bottom respectively. Facing options are disabled by default, and no-argument versions are equivalent to passing `true`; `requireVerticalFacing(true)` also enables `allowVerticalFacing`. Tooltip arguments are translation keys, and repeated calls append valid non-blank keys. The view may return `null` when an ID or texture is not set; explicitly supplied arguments must not be null. The final controller resource is resolved by the machine registration implementation.

### `AppearanceOptions`

```java
AppearanceOptions appearance(Identifier id);
AppearanceOptions machineBasicBlock(Identifier id);
AppearanceOptions controllerBaseTexture(Identifier id);
AppearanceOptions formedPortBaseTexture(Identifier id);
AppearanceOptions controllerIdleOverlayTexture(Identifier id);
AppearanceOptions controllerActiveOverlayTexture(Identifier id);
AppearanceOptions.View build();

// AppearanceOptions.View：以下五项都可为 null
@Nullable Identifier machineBasicBlock();
@Nullable Identifier controllerBaseTexture();
@Nullable Identifier formedPortBaseTexture();
@Nullable Identifier controllerIdleOverlayTexture();
@Nullable Identifier controllerActiveOverlayTexture();
```

`appearance` is an alias for `machineBasicBlock`. The base block, controller base texture, formed-port base texture, and idle/running overlay textures are all optional. ID parameters now consistently use `Identifier`; `appearance(String)` / `machineBasicBlock(String)` are no longer available. For example, use `a.machineBasicBlock(Identifier.parse("minecraft:iron_block"))`. A valid resource ID does not guarantee that the corresponding resource exists.

Source: [AppearanceOptions](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/5912f92f611da4a94d85f26644a3f9b99e534d27/src/main/java/cn/howxu/mmcr/publicapi/machine/AppearanceOptions.java).

### `FactoryOptions`

```java
FactoryOptions hasFactory(boolean enabled);
FactoryOptions threadLimit(int limit);
FactoryOptions thread(String name, Identifier... recipeIds);
FactoryOptions.View build();

// FactoryOptions.View
boolean hasFactory();
int threadLimit();
List<FactoryOptions.ThreadView> threads();

// FactoryOptions.ThreadView
String name();
List<Identifier> recipeIds();
```

The thread upper limit defaults to 1. It must be a positive number; the thread name cannot be blank. A non-null thread declaration enables the factory. `recipeIds` declares a thread's recipe collection and should not be described as only affecting displayed labels. Multiple worker threads in the factory process independent recipes, while recipe parallelism is multiple processing of the same execution.

## 4. Structure and Patterns

`cn.howxu.mmcr.publicapi.structure`

### `StructureDraft` and `StructureSpec`

```java
// StructureDraft
StructureDraft stateSensitive();
StructureDraft stateInsensitive();
StructureDraft fullStructure(Consumer<StructureStageDraft> configure);
StructureDraft expandStructure(Consumer<StructureStageDraft> configure);
StructureDraft extension(Consumer<StructureStageDraft> configure);
StructureDraft singlePattern(Consumer<PatternDraft> configure);
StructureSpec build(Identifier machineId);

// StructureSpec
Identifier machineId();
List<StructureStageSpec> stages();
boolean stateSensitive();
```

Structures are state-insensitive by default. There must be exactly one `FULL` stage; `expandStructure` requires the full structure to be configured first, with `FULL` as the first stage. `singlePattern` is a convenience method for `fullStructure(stage -> stage.pattern(...))`; it does not merge a second pattern into an existing full stage. `build(machineId)` binds the automatic controller condition to the target machine.

### `StructureStageDraft` and `StructureStageSpec`

```java
// StructureStageDraft
StructureStageDraft full();
StructureStageDraft expansion();
StructureStageDraft extension();
StructureStageDraft pattern(Consumer<PatternDraft> configure);
StructureStageDraft ports(Consumer<PortLimits.Builder> configure);
StructureStageDraft portTiers(Consumer<PortTierLimits.Builder> configure);
StructureStageDraft requirements(Consumer<StructureConstraints.Builder> configure);
StructureStageDraft modifier(char symbol, Identifier modifierId, BlockCondition replacement);
StructureStageSpec build();

// StructureStageSpec
enum Kind { FULL, EXPANSION, EXTENSION }
Kind kind();
PatternSpec pattern();
PortLimits portRequirements();
PortTierLimits portTiers();
StructureConstraints requirements();
```

The standalone `Structures.stage()` defaults to a full stage; the structure draft's three stage entry points preset the corresponding kind. Each stage must have a pattern. Port counts, minimum tiers, and character replacements are separate constraints and cannot substitute for one another.

### `PatternDraft` and `PatternSpec`

```java
// PatternDraft
PatternDraft layer(String... rows);
PatternDraft pattern(String... rows);
PatternDraft where(char symbol, BlockCondition condition);
PatternDraft controller(char symbol);
PatternSpec build();

// PatternSpec
List<List<String>> layers();
Map<Character, BlockCondition> predicates();
char controllerSymbol();
int width();
int height();
int depth();
```

`pattern(rows)` is the same as `layer(rows)`: each call adds a z layer, the parameter order corresponds to the y rows of the layer from bottom to top, and the string character position corresponds to the x column. All layers must be the same width and height, and rows cannot be empty. A space means **do not verify the cell**, not "must be air"; `where` or `controller` cannot be called on a space.

`controller(symbol)` can only be set once, and the character must appear exactly once in the entire pattern; without an explicit binding, the target machine controller condition is automatically used. Other non-space characters must be bound. Calling `where` again for the same character will **replace** the previous binding instead of throwing a duplicate error.

Example:

```java
static void structures(RegisterMachineStructuresEvent event) {
    event.registerStructure(MACHINE, structure -> structure
            .fullStructure(stage -> stage
                    .pattern(pattern -> pattern
                            .layer("XXX", "XCX", "XIX")
                            .where('X', BlockConditions.block(Blocks.IRON_BLOCK))
                            .where('I', BlockConditions.itemInput())
                            .controller('C'))
                    .ports(ports -> ports.min("item_input_bus", 1))
                    .portTiers(tiers -> tiers.minItemInput(PortTierLimits.ItemTier.NORMAL))));
}
```

The three rows above are at y=0, 1, and 2 respectively and declare only one z layer. The event automatically calls `build(MACHINE)`, so the callback does not need to call `build()`. When a standalone `Structures.pattern().build()` has not yet been bound to a machine through a structure, do not treat its automatic controller condition as a registered controller block ID.

Source code: [PatternDraft](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/structure/PatternDraft.java), [pattern validation](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/PatternBuilder.java).

### `BlockConditions` and `BlockCondition`

All `BlockConditions` factory methods are static:

```java
public static BlockCondition block(Block block);
public static BlockCondition block(Identifier id);
public static BlockCondition state(String state);
public static BlockCondition state(Identifier id);
public static BlockCondition blockState(BlockState state);
public static BlockCondition deferredBlock(Supplier<? extends Block> supplier);
public static BlockCondition tag(TagKey<Block> tag);
public static BlockCondition coupler();
public static BlockCondition any(BlockCondition... conditions);
public static BlockCondition anyOf(Collection<BlockCondition> conditions);
public static BlockCondition itemInput();
public static BlockCondition itemOutput();
public static BlockCondition fluidInput();
public static BlockCondition fluidOutput();
public static BlockCondition energyInput();
public static BlockCondition energyOutput();
public static BlockCondition chemicalInput();
public static BlockCondition chemicalOutput();
public static BlockCondition radioactiveChemicalInput();
public static BlockCondition radioactiveChemicalOutput();
public static BlockCondition heatInput();
public static BlockCondition heatOutput();
public static BlockCondition itemPorts();
public static BlockCondition fluidPorts();
public static BlockCondition energyPorts();
public static BlockCondition chemicalPorts();
public static BlockCondition radioactiveChemicalPorts();
public static BlockCondition heatPorts();
public static BlockCondition upgradeBus();
public static BlockCondition ports();
public static BlockCondition ports(Identifier... ids);
public static BlockCondition port(Identifier id);
public static BlockCondition parallelControllers();
public static BlockCondition factoryController();
public static BlockCondition smartInterface();
public static BlockCondition dataStorage();
public static BlockCondition networkInterface();
```

```java
// BlockCondition（只读描述，不是用户自定义 Predicate SPI）
boolean isMachineCoupler();
boolean isAny();
boolean isAir();
boolean isNetworkInterface();
Optional<Block> block();
Optional<BlockState> blockState();
Optional<Supplier<? extends Block>> blockSupplier();
Optional<TagKey<Block>> tag();
List<BlockCondition> alternatives();
```

`block` matches a block, while `blockState` describes an exact state; `state(String)` accepts values such as `minecraft:oak_log[axis=y]`. Unknown properties and invalid property values are validated. `deferredBlock` defers block lookup; `tag` matches tags; `any`/`anyOf` combines alternative conditions and is **not a no-argument wildcard**. The view's `isAny`/`isAir` methods describe conditions and do not imply that a public `air()` factory exists.

For startup references to another mod's blocks, prefer `block(Identifier)` or `state(String/Identifier)` instead of obtaining block objects early. `block`, `port`, and `ports` overloads with arguments no longer accept string IDs; `state(String)` remains available for state expressions such as `minecraft:oak_log[axis=y]`. Creating a `state(...)` declaration validates only the resource ID and bracket form; block existence, property names, and property values are checked when `blockState()` is read or the declaration is converted to a runtime predicate. Unknown blocks fail instead of silently falling back to air. This applies to Java public declarations, not to KubeJS `api.state(...)`, which still queries the registry immediately.

Port family factories collect blocks from the corresponding registered family; no-argument `ports()` returns the port collection, while overloads with arguments match only the specified ports. `parallelControllers`, `factoryController`, `smartInterface`, `dataStorage`, and `networkInterface` correspond to their respective built-in blocks. Whether Mekanism family shortcuts have available blocks depends on whether the integration is loaded; public signatures do not depend on Mekanism classes.

Source: [BlockConditions](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/5912f92f611da4a94d85f26644a3f9b99e534d27/src/main/java/cn/howxu/mmcr/publicapi/structure/BlockConditions.java).

### `PortLimits`

```java
static PortLimits none();
static PortLimits.Builder builder();
Map<String, PortLimits.CountRangeView> requirements();

// PortLimits.CountRangeView
int min();
OptionalInt max();

// PortLimits.Builder
Builder min(String portId, int min);
Builder range(String portId, int min, int max);
PortLimits build();
```

Quantity limited by port ID. `min` only sets the lower limit, while `range` sets both the upper and lower limits; the quantity cannot be negative, and the upper limit cannot be lower than the lower limit. Use `none()` when there is no requirement. This does not limit the capacity of each port, see `PortTierLimits` for minimum capacity requirements.

`portId` uses the port family statistical alias or specific port type ID, matches exactly by string, is case-sensitive, does not remove spaces, and does not add the `mmcr:` namespace. The complete built-in family alias is:

| port family | input alias | output alias |
| --- | --- | --- |
| Items | `item_input_bus` | `item_output_bus` |
| Fluid | `fluid_input_hatch` | `fluid_output_hatch` |
| Energy | `energy_input_hatch` | `energy_output_hatch` |
| Mekanism General Chemicals | `chemical_input_hatch` | `chemical_output_hatch` |
| Mekanism Radioactive Chemicals | `radioactive_chemical_input_hatch` | `radioactive_chemical_output_hatch` |
| Mekanism Heat | `heat_input_hatch` | `heat_output_hatch` |

A family alias counts all tiers in the same family and direction, including extension/composite/integration ports with the corresponding family declaration. A specific ID counts only that model. See [KubeJS API: port tiers and port requirements](./KubeJS#port-requirements) for the complete model list and rules. Java and KubeJS use the same counting keys. The `normal` model IDs for ordinary item, fluid, and energy ports have no `_normal` suffix and coincide with the family aliases, so these keys cannot count `normal` models separately.

The builder rejects blank keys but does not verify that other keys are registered; unknown keys have an actual count of 0. `min(id, 0)` imposes no count restriction. Use `range(id, 0, 0)` to prohibit that port type; `range(id, n, n)` requires exactly `n` ports. Repeated declarations of the same key overwrite the previous declaration.

### `PortTierLimits`

```java
enum PortCategory { ITEM, FLUID, ENERGY, CHEMICAL, RADIOACTIVE_CHEMICAL, HEAT }
enum ItemTier {
    TINY, SMALL, NORMAL, REINFORCED, BIG, HUGE, LUDICROUS;
    public String id();
}
enum FluidTier {
    TINY, SMALL, NORMAL, REINFORCED, BIG, HUGE, LUDICROUS, VACUUM;
    public String id();
}
enum EnergyTier {
    TINY, SMALL, NORMAL, REINFORCED, BIG, HUGE, LUDICROUS, ULTIMATE;
    public String id();
}
enum ChemicalTier {
    BASIC, ADVANCED, ELITE, ULTIMATE;
    public String id();
}

static PortTierLimits none();
static Builder builder();
static PortTierLimits combine(PortTierLimits... declarations);
static PortTierLimits item(String id);
static PortTierLimits item(ItemTier tier);
static PortTierLimits item(ItemTier tier, IoDirection io);
static PortTierLimits fluid(String id);
static PortTierLimits fluid(FluidTier tier);
static PortTierLimits fluid(FluidTier tier, IoDirection io);
static PortTierLimits energy(String id);
static PortTierLimits energy(EnergyTier tier);
static PortTierLimits energy(EnergyTier tier, IoDirection io);
static PortTierLimits itemInput(String id);
static PortTierLimits itemInput(ItemTier tier);
static PortTierLimits itemOutput(String id);
static PortTierLimits itemOutput(ItemTier tier);
static PortTierLimits fluidInput(String id);
static PortTierLimits fluidInput(FluidTier tier);
static PortTierLimits fluidOutput(String id);
static PortTierLimits fluidOutput(FluidTier tier);
static PortTierLimits energyInput(String id);
static PortTierLimits energyInput(EnergyTier tier);
static PortTierLimits energyOutput(String id);
static PortTierLimits energyOutput(EnergyTier tier);
static PortTierLimits chemical(String id);
static PortTierLimits chemical(ChemicalTier tier);
static PortTierLimits chemical(ChemicalTier tier, IoDirection io);
static PortTierLimits chemicalInput(String id);
static PortTierLimits chemicalInput(ChemicalTier tier);
static PortTierLimits chemicalOutput(String id);
static PortTierLimits chemicalOutput(ChemicalTier tier);
static PortTierLimits radioactiveChemical();
static PortTierLimits radioactiveChemical(IoDirection io);
static PortTierLimits radioactiveChemicalInput();
static PortTierLimits radioactiveChemicalOutput();
static PortTierLimits heat();
static PortTierLimits heat(IoDirection io);
static PortTierLimits heatInput();
static PortTierLimits heatOutput();
List<RequirementView> requirements();

// PortTierLimits.RequirementView
PortCategory category();
IoDirection ioType();
int minTier();
String minTierId();

// PortTierLimits.Builder
Builder anyItemInput();
Builder anyItemOutput();
Builder anyFluidInput();
Builder anyFluidOutput();
Builder anyEnergyInput();
Builder anyEnergyOutput();
Builder anyChemicalInput();
Builder anyChemicalOutput();
Builder anyRadioactiveChemicalInput();
Builder anyRadioactiveChemicalOutput();
Builder anyHeatInput();
Builder anyHeatOutput();
Builder minItemInput(ItemTier tier);
Builder minItemOutput(ItemTier tier);
Builder minFluidInput(FluidTier tier);
Builder minFluidOutput(FluidTier tier);
Builder minEnergyInput(EnergyTier tier);
Builder minEnergyOutput(EnergyTier tier);
Builder minChemicalInput(ChemicalTier tier);
Builder minChemicalOutput(ChemicalTier tier);
PortTierLimits build();
```

**All accepted string tier values** (each row lists tiers from lowest to highest; `...Input(String)` and `...Output(String)` use the same family's list):

| Port family / factory | Accepted `String id` values | Corresponding enum |
| --- | --- | --- |
| `item` / `itemInput` / `itemOutput` | `tiny`, `small`, `normal`, `reinforced`, `big`, `huge`, `ludicrous` | `ItemTier` |
| `fluid` / `fluidInput` / `fluidOutput` | `tiny`, `small`, `normal`, `reinforced`, `big`, `huge`, `ludicrous`, `vacuum` | `FluidTier` |
| `energy` / `energyInput` / `energyOutput` | `tiny`, `small`, `normal`, `reinforced`, `big`, `huge`, `ludicrous`, `ultimate` | `EnergyTier` |
| `chemical` / `chemicalInput` / `chemicalOutput` | `basic`, `advanced`, `elite`, `ultimate` | `ChemicalTier` |
| `radioactiveChemical` / `radioactiveChemicalInput` / `radioactiveChemicalOutput` | No string tier overload; use the no-argument factory or direction overload. | No tier enum. |
| `heat` / `heatInput` / `heatOutput` | No string tier overload; use the no-argument factory or direction overload. | No tier enum. |

String tier names are case-insensitive, but whitespace is not trimmed; `null`, blank strings, or names outside the family throw `IllegalArgumentException`. For example, `chemicalInput("ADVANCED")` is valid, while `chemicalInput("normal")` and `chemicalInput(" advanced ")` are invalid. `id()` returns lowercase names. The string overload only accepts existing tier names; it does not register new tiers or accept KubeJS list syntax such as `chemical_input_hatch>=advanced`.

Tiers can only be compared within the same family; do not compare ordinals across families. Item, fluid, and energy detection tiers start at 0; the chemical detection tiers `basic`, `advanced`, `elite`, and `ultimate` are 2, 3, 4, and 5 respectively, so `ChemicalTier.ordinal()` cannot substitute for them. `anyItem...` / `anyFluid...` / `anyEnergy...` is equivalent to the lowest tier, `TINY`, in that direction; `anyChemical...` is equivalent to `BASIC`. Radioactive chemicals and heat only check that a port of the corresponding family and direction exists. Their `RequirementView` reports `0` / `"any"` for `minTier()` / `minTierId()`; `"any"` is not a tier name accepted by the string factory.

Each declaration requires at least one port in the structure of the same family and direction that meets the minimum tier. Not every port needs to meet that tier; configure quantity constraints separately through `PortLimits`. Ordinary and radioactive chemicals are separate families. `combine` merges declarations, and a single port may satisfy multiple compatible requirements. Use `none()` when there is no requirement. Without an explicit direction, `item` / `fluid` / `energy` / `chemical` / `radioactiveChemical` / `heat` constrain both input and output; specify a direction or use an Input/Output factory to constrain only one side. Declarations can still be constructed without Mekanism loaded, but no corresponding ports will be available to satisfy formation checks.

```java
stage.ports(ports -> ports.range("chemical_input_hatch", 1, 2)
                .min("heat_output_hatch", 1))
        .portTiers(tiers -> tiers.minChemicalInput(PortTierLimits.ChemicalTier.ADVANCED)
                .anyHeatOutput());
```

This snippet configures stage constraints; the pattern must also allow these ports through `BlockConditions`. Source code: [public tier factories and enums](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/c2563c4110cd15bad0218dc4fa5a4f091fbccc87/src/main/java/cn/howxu/mmcr/publicapi/structure/PortTierLimits.java), [string tier parsing](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/c2563c4110cd15bad0218dc4fa5a4f091fbccc87/src/main/java/cn/howxu/mmcr/api/machine/definition/InterfaceTiers.java).

### `StructureConstraints`

```java
static StructureConstraints empty();
static Builder builder();
Map<Character, List<ModifierPlacementView>> modifierReplacements();
Map<Character, Identifier> levelSlots();

// StructureConstraints.ModifierPlacementView
Identifier modifierId();
BlockCondition replacement();

// StructureConstraints.Builder
Builder modifier(char symbol, Identifier modifierId);
Builder modifier(char symbol, Identifier modifierId, BlockCondition replacement);
Builder levelSlot(char symbol, Identifier typeId);
StructureConstraints build();
```

Level slots associate pattern characters to level types. Modifier substitution associates characters to modifiers and replacement block conditions; the `modifier(symbol, id)` overload without an explicit condition uses **AIR BLOCK** as the replacement condition. There can be multiple modifier candidates per character; binding another type to the same level slot will throw `IllegalArgumentException`. The referenced type/modifier must be registered in the structure window.

## 5. Level system

`cn.howxu.mmcr.publicapi.structure.level`

### `Levels`, `LevelTypeSpec`, and `MachineLevelSpec`

```java
// Levels
public static LevelTypeSpec type(Identifier id, Component displayName);
public static MachineLevelSpec level(Identifier id, Identifier typeId, int priority,
        BlockCondition condition, ModifierBundle modifier);

// LevelTypeSpec
Identifier id();
Component displayName();

// MachineLevelSpec
Identifier id();
Identifier typeId();
int priority();
BlockCondition statePredicate();
ItemStack representative();
ModifierBundle modifier();
```

Types group levels; individual levels describe matching conditions, priorities, and modifiers. `Levels.level(...)` now takes five parameters and no longer accepts a representative item stack. Factory-created declarations use an empty display stack; the `representative()` accessor remains and returns a copy. Level slots use type IDs, and recipe requirements use a type ID plus a level ID.

```java
Identifier typeId = Identifier.fromNamespaceAndPath("my_mod", "casing");
Identifier levelId = Identifier.fromNamespaceAndPath("my_mod", "steel");
event.registerLevelType(Levels.type(typeId, Component.translatable("level.my_mod.casing")));
event.registerLevel(Levels.level(levelId, typeId, 1,
        BlockConditions.state("minecraft:iron_block"),
        Modifiers.bundle()));
```

`event` above is a structure registration event; subsequently use `requirements(r -> r.levelSlot('X', typeId))` in the stage configuration. Levels are not just another name for "port size".

## 6. Recipe declaration

`cn.howxu.mmcr.publicapi.recipe`

### `RecipeDraft`

```java
RecipeDraft recipePool(Identifier id);
RecipeDraft duration(int ticks);
RecipeDraft priority(int priority);
RecipeDraft maxThreads(int threads);
RecipeDraft cancelIfPerTickFails(boolean value);
RecipeDraft parallelized(boolean value);
RecipeDraft allowPartialOutputs(boolean value);
RecipeDraft inputItem(Item item, int count);
RecipeDraft inputItem(Ingredient item, int count);
RecipeDraft inputItem(TagKey<Item> tag, int count);
RecipeDraft inputItemTag(TagKey<Item> tag, int count);
RecipeDraft inputItem(Ingredient item, int count, ComponentConstraints components, float consumeChance);
RecipeDraft inputFluid(Fluid fluid, int amount);
RecipeDraft inputFluid(Fluid fluid, int amount, float consumeChance);
RecipeDraft outputFluid(Fluid fluid, int amount);
RecipeDraft inputEnergy(long fePerTick);
RecipeDraft outputEnergy(long fePerTick);
RecipeDraft iFEt(long fePerTick);
RecipeDraft oFEt(long fePerTick);
RecipeDraft lightningInput(LightningTier tier, long amount);
RecipeDraft lightningOutput(LightningTier tier, long amount);
RecipeDraft lightningOutput(LightningTier tier, long amount, float chance);
RecipeDraft outputItem(Item item, int count);
RecipeDraft outputItem(ItemStack stack);
RecipeDraft outputItem(ItemStack stack, ComponentConstraints components);
RecipeDraft outputChance(ItemStack stack, float chance);
RecipeDraft outputChance(ItemStack stack, float chance, ComponentConstraints components);
RecipeDraft levelRequirement(Identifier typeId, Identifier levelId);
RecipeDraft stageRequirement(int minStage);
RecipeDraft requiredHost(Identifier id);
RecipeDraft modifier(Identifier id);
RecipeDraft requirement(RequirementSpec value);
RecipeDraft smartInterface(SmartInterfaceRequirementSpec value);
RecipeDraft custom(CustomIoSpec value);
RecipeDraft inputChemical(Identifier id, long amount);
RecipeDraft inputChemical(Identifier id, long amount, float consumeChance);
RecipeDraft inputChemicalTag(Identifier id, long amount);
RecipeDraft inputChemicalTag(Identifier id, long amount, float consumeChance);
RecipeDraft outputChemical(Identifier id, long amount, float chance);
RecipeDraft inputHeatTemperature(double temperature);
RecipeDraft outputHeat(double heat);
RecipeSpec build();
```

The default duration is 1 tick, priority is 0, maximum thread count is 1, and the three boolean switches default to `false`. Duration and maximum thread count must be positive, and priority must not be negative. **The recipe pool has no default value**; when no pool is set, `build()` throws `IllegalStateException`. Input, output, and requirement declarations are appended; repeated calls do not overwrite the entire list.

Item and fluid amounts use `int`, energy uses `long` **FE/t** (not the recipe's total energy consumption), and chemical amounts use `long`. `iFEt`/`oFEt` are energy input/output aliases. `consumeChance` is the input consumption probability; 0 means the input must still match but is not consumed. Output `chance` is the production probability; do not confuse the two. Ordinary probability parameters must be finite and within `[0,1]`; lightning outputs use the normalization described in the next section.

`requiredHost` constrains the hosts acceptable to the module recipe, `modifier` references the registered modifier ID, and `stageRequirement` constrains the lowest structural stage. Partial output switching allows the planner to accept outputs that can be accommodated, but does not mean that all outputs ignore capacity.

```java
static void recipes(RegisterMachineRecipesEvent event) {
    event.registerRecipe(Identifier.fromNamespaceAndPath("my_mod", "iron_block"), recipe -> recipe
            .recipePool(Identifier.fromNamespaceAndPath("my_mod", "shared_pool"))
            .duration(100)
            .inputItem(Items.IRON_INGOT, 9)
            .inputEnergy(40L)
            .outputItem(Items.IRON_BLOCK, 1));
}
```

Source code: [RecipeDraft](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/fbb3198c/src/main/java/cn/howxu/mmcr/publicapi/recipe/RecipeDraft.java), [validation and defaults](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/fbb3198c/src/main/java/cn/howxu/mmcr/api/recipe/MachineRecipeBuilder.java).

### `LightningTier` and Lightning Recipe IO {#lightning-tier}

Fully qualified name: `cn.howxu.mmcr.publicapi.recipe.LightningTier`.

```java
public enum LightningTier {
    HIGH_VOLTAGE,
    EXTREME_HIGH_VOLTAGE
}
```

`RecipeDraft.lightningInput(tier, amount)` appends a one-shot input. `lightningOutput(tier, amount)` appends a guaranteed output; the three-argument version sets the production chance explicitly. All three methods return the current draft. There is no input chance overload or public `lightningOutputChance` alias.

A `null` tier throws `NullPointerException`; `amount <= 0` throws `IllegalArgumentException`, and positive amounts above `2147483647` are capped at that limit. Output chance is clamped to `[0,1]`, with `NaN` becoming `1`. Amounts are one-shot totals per parallel recipe, not FE/t, and do not summon lightning in the world. Inputs are consumed at start, outputs are produced at completion, and actual amounts scale with parallelism. High and extreme-high voltage match separately without automatic conversion. Multiple requirements for the same resource and direction also share the amount limit above.

Both AE2 (`ae2`) and AE2LT (`ae2lt`) must be loaded at runtime; the current metadata declares minimum versions of `26.1.10-beta` and `1.0.1alpha`, respectively. Lightning uses MMCR's ME Input, Stocking, Output, Async Output, and Pattern Interfaces, not ordinary energy hatches or automatic adjacent-block transfer. If either dependency is absent, lightning requirements block; depending only on the public API jar does not provide execution support.

Outputs still check capacity. `allowPartialOutputs` may accept partial outputs but does not provide unlimited storage. Once one-shot inputs have been successfully paid, later blocked outputs do not charge them again. See [KubeJS Lightning Recipe IO](KubeJS#lightning-schema) for resource IDs, JSON, and schema syntax.

Place the imports at the top of the file and the method in an existing registration class. Call `lightningRecipes(event)` from a `RegisterMachineRecipesEvent` listener already subscribed to `NeoForge.EVENT_BUS`; merely adding the method does not register a recipe. The machine definition must already declare `my_mod:lightning_pool`. Each recipe consumes 100 units of high-voltage lightning and has a 25% chance to produce 10 units of extreme-high-voltage lightning at completion. This does not establish a general conversion ratio between the resources.

```java
import cn.howxu.mmcr.publicapi.event.RegisterMachineRecipesEvent;
import cn.howxu.mmcr.publicapi.recipe.LightningTier;
import net.minecraft.resources.Identifier;

static void lightningRecipes(RegisterMachineRecipesEvent event) {
    event.registerRecipe(Identifier.fromNamespaceAndPath("my_mod", "lightning_recipe"), recipe -> recipe
            .recipePool(Identifier.fromNamespaceAndPath("my_mod", "lightning_pool"))
            .duration(100)
            .lightningInput(LightningTier.HIGH_VOLTAGE, 100L)
            .lightningOutput(LightningTier.EXTREME_HIGH_VOLTAGE, 10L, 0.25F));
}
```

Addons should use this public enum, not the underlying `cn.howxu.mmcr.api.compat.ae2lt.LightningTier` used by KubeJS or the native `LightningKey`. The public enum does not provide the underlying enum's `fromId` / `requirementId` methods.

Source: [public enum](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/fbb3198c/src/main/java/cn/howxu/mmcr/publicapi/recipe/LightningTier.java), [public facade](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/fbb3198c/src/main/java/cn/howxu/mmcr/internal/api/facade/recipe/RecipeDraftFacade.java).

### `RecipeSpec`

```java
Identifier id();
Identifier recipePoolId();
int tickTime();
int priority();
int maxThreads();
boolean cancelRecipeOnPerTickFailure();
boolean parallelized();
boolean allowPartialOutputs();
List<ItemInputSpec> itemInputs();
List<FluidInputSpec> fluidInputs();
List<EnergyRateSpec> energyInputs();
List<ItemOutputSpec> itemOutputs();
List<FluidOutputSpec> fluidOutputs();
List<EnergyRateSpec> energyOutputs();
List<RequirementSpec> requirements();
List<CustomIoSpec> customOutputs();
List<Identifier> modifierIds();
Set<HostConstraint> requiredHosts();
Set<Identifier> requiredHostIds();
```

This is the built declaration; IO lists are projected views of the corresponding kinds. `requirements()` retains requirement declarations, and `customOutputs()` retains custom outputs of registered output types. Query the runtime `RecipeView` for requirements and outputs after runtime modifiers are applied; `RecipeSpec` cannot be used directly as an execution recipe.

### `IoDirection`, IO value type and `IoValues`

```java
public enum IoDirection { INPUT, OUTPUT }

// ItemInputSpec
Ingredient ingredient();
int count();
ComponentConstraints components();
float consumeChance();
// ItemOutputSpec
ItemStack stack();
float chance();
ComponentConstraints components();
// FluidInputSpec
FluidIngredient ingredient();
int amount();
float consumeChance();
// FluidOutputSpec
FluidStack stack();
float chance();
// EnergyRateSpec
long fePerTick();
// HostConstraint
Identifier id();
// CustomIoSpec
Identifier typeId();
IoDirection io();
default IoDirection ioType(); // 返回 io()
JsonElement payload();
```

These are factory-generated declarative views. Item/fluid stack and JSON payload getters return copies. `FluidIngredient`, `FluidStack` are from NeoForge.

`IoValues` static factory:

```java
public static ItemInputSpec itemInput(Item item, int count);
public static ItemInputSpec itemInput(Ingredient item, int count);
public static ItemInputSpec itemInput(Ingredient item, int count, ComponentConstraints components, float consumeChance);
public static ItemOutputSpec itemOutput(Item item, int count);
public static ItemOutputSpec itemOutput(ItemStack stack);
public static ItemOutputSpec itemOutput(ItemStack stack, float chance);
public static ItemOutputSpec itemOutput(ItemStack stack, ComponentConstraints components);
public static ItemOutputSpec itemOutput(ItemStack stack, float chance, ComponentConstraints components);
public static FluidInputSpec fluidInput(Fluid fluid, int amount);
public static FluidInputSpec fluidInput(FluidIngredient fluid, int amount);
public static FluidInputSpec fluidInput(FluidIngredient fluid, int amount, float consumeChance);
public static FluidOutputSpec fluidOutput(Fluid fluid, int amount);
public static FluidOutputSpec fluidOutput(FluidStack stack);
public static FluidOutputSpec fluidOutput(FluidStack stack, float chance);
public static EnergyRateSpec energyRate(long fePerTick);
public static HostConstraint requiredHost(Identifier id);
public static CustomIoSpec customIo(Identifier typeId, IoDirection io, JsonElement payload);
```

Overloads without a probability argument default to 1; overloads without a component argument use an empty condition set. `customIo` requires a registered type and an object payload that its Codec can parse; arbitrary JSON alone does not make it executable. Register extension types before building, decoding, or synchronizing recipes, and keep client and server registrations consistent. Requirement/output extension registration itself does not check whether a registration window has closed.

### `MekanismIo`

```java
public static JsonObject chemicalInputPayload(Identifier id, long amount);
public static JsonObject chemicalInputPayload(Identifier id, long amount, float consumeChance);
public static JsonObject chemicalTagInputPayload(Identifier id, long amount);
public static JsonObject chemicalTagInputPayload(Identifier id, long amount, float consumeChance);
public static JsonObject chemicalOutputPayload(Identifier id, long amount, float chance);
public static JsonObject heatInputPayload(double value);
public static JsonObject heatOutputPayload(double value);
```

Neutral JSON constructor for the public layer. The chemical input specifies an exact ID or tag, the heat input represents the minimum temperature, and the heat output represents the heat generated. Actual implementation is still provided by MMCR's Mekanism linkage capabilities; simply having the public API jar does not install or register the chemical/thermal ports. Usually just use `RecipeDraft.inputChemical` and other convenient methods.

## 7. Recipe requirements

`cn.howxu.mmcr.publicapi.recipe.requirement`

### `RequirementSpec` and built-in requirement views

```java
// RequirementSpec
Identifier kindId();
IoDirection io();
List<String> tags();
RequirementSpec copy();

// ItemRequirementSpec extends RequirementSpec
@Nullable Ingredient item();
@Nullable Ingredient ingredient();
int count();
ItemStack stack();
float chance();
ComponentConstraints components();
float consumeChance();
ItemStack resolvedStack();
ItemStack stack(DynamicOps<?> ops);

// FluidRequirementSpec extends RequirementSpec
@Nullable FluidIngredient fluid();
@Nullable FluidIngredient ingredient();
int amount();
FluidStack stack();
float chance();
float consumeChance();

// EnergyRequirementSpec extends RequirementSpec
long fePerTick();
// LevelRequirementSpec extends RequirementSpec
Identifier typeId();
Identifier levelId();
// StageRequirementSpec extends RequirementSpec
int minStage();
// SmartInterfaceRequirementSpec extends RequirementSpec
String interfaceType();
float minValue();
float maxValue();
```

`kindId()` is the requirement type ID, `io()` is the flow direction, and `tags()` filters the capability tags that can participate in execution. Input requirements usually use ingredient; output uses the actual stack, so the ingredient getter might be `null`. Don't assume that any requirement can be forced into an item/fluid requirement. `resolvedStack`/`stack` with ops is used to obtain the item stack after component resolution.

The requirement interface is not an extension point directly implemented externally; custom requirements are registered using `RequirementExtension` below, obtain the `RequirementKind` generated by the library, and then call `Requirements.extension`.

### `Requirements`

The complete static factory signature is as follows:

```java
public static <R> RequirementSpec extension(RequirementKind<R> kind, R payload);
public static ItemRequirementSpec item(IoDirection io, Ingredient item, int count, ItemStack stack);
public static ItemRequirementSpec item(IoDirection io, Ingredient item, int count, ItemStack stack, List<String> tags);
public static ItemRequirementSpec item(IoDirection io, Ingredient item, int count, ItemStack stack, float chance, List<String> tags);
public static ItemRequirementSpec item(IoDirection io, Ingredient item, int count, ItemStack stack,
        float chance, List<String> tags, ComponentConstraints components, float consumeChance);
public static ItemRequirementSpec item(IoDirection io, Ingredient item, int count, ItemStack stack,
        float chance, ComponentConstraints components, float consumeChance);
public static ItemRequirementSpec itemInput(ItemInputSpec input);
public static ItemRequirementSpec itemOutput(ItemOutputSpec output);
public static ItemRequirementSpec itemInput(Item item, int count);
public static ItemRequirementSpec itemInput(Ingredient item, int count);
public static ItemRequirementSpec itemOutput(ItemStack stack);
public static ItemRequirementSpec itemOutput(ItemStack stack, float chance);
public static FluidRequirementSpec fluid(IoDirection io, FluidIngredient fluid, int amount, FluidStack stack);
public static FluidRequirementSpec fluid(IoDirection io, FluidIngredient fluid, int amount, FluidStack stack, List<String> tags);
public static FluidRequirementSpec fluid(IoDirection io, FluidIngredient fluid, int amount, FluidStack stack, float chance, List<String> tags);
public static FluidRequirementSpec fluid(IoDirection io, FluidIngredient fluid, int amount, FluidStack stack,
        float chance, List<String> tags, float consumeChance);
public static FluidRequirementSpec fluid(IoDirection io, FluidIngredient fluid, int amount, FluidStack stack,
        float chance, float consumeChance);
public static FluidRequirementSpec fluidInput(FluidInputSpec input);
public static FluidRequirementSpec fluidOutput(FluidOutputSpec output);
public static FluidRequirementSpec fluidInput(Fluid fluid, int amount);
public static FluidRequirementSpec fluidOutput(FluidStack stack);
public static FluidRequirementSpec fluidOutput(FluidStack stack, float chance);
public static EnergyRequirementSpec energy(long rate);
public static EnergyRequirementSpec energy(long rate, List<String> tags);
public static EnergyRequirementSpec energy(IoDirection io, long rate);
public static EnergyRequirementSpec energy(IoDirection io, long rate, List<String> tags);
public static LevelRequirementSpec level(Identifier typeId, Identifier levelId);
public static LevelRequirementSpec level(IoDirection io, Identifier typeId, Identifier levelId);
public static StageRequirementSpec stage(int minStage);
public static StageRequirementSpec stage(IoDirection io, int minStage);
public static SmartInterfaceRequirementSpec smartInterface(IoDirection io, String type, float min, float max);
public static SmartInterfaceRequirementSpec smartInput(String type, float value);
public static SmartInterfaceRequirementSpec smartInput(String type, float min, float max);
public static SmartInterfaceRequirementSpec smartOutput(String type, float value);
```

Use `itemInput`/`itemOutput` and `fluidInput`/`fluidOutput` first to avoid mixing flow and stack fields. `energy`, `level`, and `stage` that omit the direction are input directions; the level/stage is a logical check and does not consume a physical resource slot. Stage range is 1–64. `smartInput(type, value)` represents an exact value, and range overloading represents an interval; `smartOutput` declares an output value.

Example:

```java
RecipeSpec spec = Recipes.recipe(Identifier.fromNamespaceAndPath("my_mod", "catalyst"))
        .recipePool(MACHINE)
        .duration(20)
        .requirement(Requirements.itemInput(IoValues.itemInput(
                Ingredient.of(Items.DIAMOND), 1, ComponentConstraints.EMPTY, 0F)))
        .requirement(Requirements.itemOutput(new ItemStack(Items.COAL), 0.5F))
        .build();
```

Diamonds are still a matching condition, but the consumption probability is 0; the output probability of coal is 0.5. `event.registerRecipe(spec)` is still required after `build()`.

## 8. Data component conditions

`cn.howxu.mmcr.publicapi.recipe.component`

### `ComponentConditions` and conditional view

```java
// ComponentConditions
public static ExactCondition exact(JsonElement value);
public static ExactCondition exact(Dynamic<?> value);
public static MapCondition map(Map<String, ComponentCondition> values);
public static ListCondition list(List<ComponentCondition> values);
public static RangeCondition range(double min, double max);
public static TextCondition text(String value, TextMatchMode mode);
public static TextCondition text(Component value, TextMatchMode mode);

// ComponentCondition
boolean isExact();
boolean matches(Dynamic<?> candidate);
// ExactCondition extends ComponentCondition
Dynamic<?> value();
// MapCondition extends ComponentCondition
Map<String, ComponentCondition> values();
// ListCondition extends ComponentCondition
List<ComponentCondition> values();
// RangeCondition extends ComponentCondition
double min();
double max();
// TextCondition extends ComponentCondition
Component value();
TextMatchMode mode();
public enum TextMatchMode { PLAIN, FULL }
```

Exact conditions compare encoded values. Map conditions require the listed keys to match but allow additional keys in the candidate. List conditions use unordered containment: each required element must match a distinct candidate element, and additional candidate elements are allowed; this is not exact equality by index. Range conditions match numeric values in a closed interval. Text mode `PLAIN` compares plain text, while `FULL` compares complete text components. Do not treat component predicates as legacy NBT string matching.

### `ComponentConstraints`

```java
ComponentConstraints EMPTY;
static ComponentConstraints ofTypes(Map<DataComponentType<?>, ComponentCondition> values);
static ComponentConstraints ofIds(Map<Identifier, ComponentCondition> values);
Map<DataComponentType<?>, ComponentCondition> values();
boolean isEmpty();
boolean hasNonExactValues();
boolean matches(ItemStack stack);
boolean matches(ItemStack stack, DynamicOps<?> ops);
ItemStack displayStack(Item item, int count);
ItemStack displayStack(Item item, int count, DynamicOps<?> ops);
void applyTo(ItemStack stack);
void applyTo(ItemStack stack, DynamicOps<?> ops);
Optional<DataComponentPatch> exactPatch();
```

`ofIds` looks up the data component registry; unknown IDs throw `IllegalArgumentException`. `matches` requires each declared component to satisfy its condition; `displayStack` creates a display stack, and `applyTo` modifies the supplied stack. Non-exact conditions such as range/map/list cannot directly define a concrete output; `exactPatch` returns an empty Optional if values are non-exact or cannot be decoded. Supply suitable `DynamicOps` for components that require registry context. Default display writes skip undecodable values; custom-name text has dedicated handling, so do not claim that all text conditions are impossible to display.

```java
ComponentConstraints named = ComponentConstraints.ofTypes(Map.of(
        DataComponents.CUSTOM_NAME,
        ComponentConditions.text(Component.literal("Catalyst"), TextMatchMode.PLAIN)));
// 将 named 传给 inputItem(..., named, consumeChance)，只匹配指定名称的输入
```

Source code: [public condition set](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/component/ComponentConstraints.java), [matching and display implementation](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/recipe/component/DataComponentPredicateSet.java).

## 9. Modifiers and smart interfaces

`cn.howxu.mmcr.publicapi.recipe.modifier`, the smart interface is declared in `.machine`

### `Modifiers`

```java
public static NumericModifierSpec numeric(String target, ModifierScope scope, double value,
        ModifierOperation operation, boolean affectsChance);
public static ParallelizationModifierSpec parallelized(boolean value);
public static ModifierBundle bundle(List<ModifierSpec> values);
public static ModifierBundle bundle(ModifierSpec... values);
public static ModifierBundle combine(ModifierBundle... values);
public static RecipeAdjustmentSpec recipe(String target, IoDirection io, float value,
        ModifierOperation operation, boolean affectsChance);
public static float apply(Collection<RecipeAdjustmentSpec> modifiers, String target,
        IoDirection io, float value, boolean chance);
public static double apply(Collection<RecipeAdjustmentSpec> modifiers, String target,
        IoDirection io, double value, boolean chance);
public static List<RecipeAdjustmentSpec> recipeModifiers(Collection<ModifierSpec> modifiers);
public static SmartModifierSpec smart(String type, String target, ModifierScope scope, boolean chance,
        float min, float max, float atMin, float atMax, ModifierOperation operation);
public static SmartModifierSpec smart(String type, String target, IoDirection io, boolean chance,
        float min, float max, float atMin, float atMax, ModifierOperation operation);
public static SmartModifierSpec smartDuration(String type, float min, float max,
        float atMin, float atMax, ModifierOperation op);
public static SmartModifierSpec smartEnergy(String type, float min, float max,
        float atMin, float atMax, ModifierOperation op);
public static SmartModifierSpec smartItem(String type, IoDirection io, boolean chance,
        float min, float max, float atMin, float atMax, ModifierOperation op);
public static SmartModifierSpec smartFluid(String type, IoDirection io, boolean chance,
        float min, float max, float atMin, float atMax, ModifierOperation op);
public static SmartModifierSpec smartChemical(String type, IoDirection io, boolean chance,
        float min, float max, float atMin, float atMax, ModifierOperation op);
public static SmartModifierSpec smartHeat(String type, IoDirection io, float min, float max,
        float atMin, float atMax, ModifierOperation op);
```

### Modifier views and enumerations

```java
public enum ModifierOperation { ADD, MULTIPLY, SUBTRACT, DIVIDE }
public enum ModifierScope { INPUT, OUTPUT, MACHINE, RECIPE }
// ModifierSpec：库生成的标记接口，无方法
// NumericModifierSpec extends ModifierSpec
String target();
ModifierScope scope();
double value();
ModifierOperation operation();
boolean affectsChance();
// ParallelizationModifierSpec extends ModifierSpec
boolean value();
// ModifierBundle
List<ModifierSpec> modifiers();
// RecipeAdjustmentSpec（运行时配方修饰值，不继承 ModifierSpec）
String target();
IoDirection io();
float value();
ModifierOperation operation();
boolean affectsChance();
RecipeAdjustmentSpec multiply(float value);
RecipeAdjustmentSpec add(float value);
// SmartModifierSpec
String interfaceType();
String target();
ModifierScope scope();
boolean affectsChance();
float minValue();
float maxValue();
float atMin();
float atMax();
ModifierOperation operation();
IoDirection io();
float mappedValue(float value);
NumericModifierSpec toModifier(float value);
```

Declare numeric modifiers with `NumericModifierSpec`, package multiple declarations in a `ModifierBundle`, and register the bundle through `registerModifier` during the structure window. Structure block replacements, levels, and upgrade items may reference it. `RecipeAdjustmentSpec` is used for runtime modifier calculations. `multiply`/`add` change the modifier value and return a new view; they do not immediately modify machine resources.

The underlying implementation validates the target/scope combination of `numeric`, and the value must be finite; arbitrary strings are not accepted:

| target | scope | support affectsChance |
| --- | --- | --- |
| `duration`, `energy`, `heat` | INPUT | No |
| `chemical` | INPUT | YES |
| `output` | OUTPUT | YES |
| `parallelism`, `factory_threads` | MACHINE | NO |
| `recipe_threads` | RECIPE | NO |

`parallelized` is a Boolean modification, using specialized factories. The smart modifier `toModifier` is also bound by a numeric target/scope; the existence of a mapping factory such as `smartItem` does not mean that it can be arbitrarily converted to an unsupported machine numeric modification target.

`apply` filters by target, direction, and the probability/quantity flag. It sums the additive terms and combines the multiplicative terms, then calculates `(original value + additive total) × multiplicative factor`; it does not simply apply each modifier in list order. Division by 0 is ignored in the underlying calculation. `smartDuration` defaults to target `duration` with input scope; `smartEnergy` uses `energy` with input scope. Smart modifiers map interface values to modifier values in the `atMin`–`atMax` range.

```java
event.registerModifier(Identifier.fromNamespaceAndPath("my_mod", "fast"),
        Modifiers.bundle(Modifiers.numeric("duration", ModifierScope.INPUT,
                0.5D, ModifierOperation.MULTIPLY, false)));
```

### `SmartInterfaces` and `SmartInterfaceSpec`

```java
// machine.SmartInterfaces
public enum ValueType {
    FLOAT, INTEGER;
    public static ValueType byName(String name);
}
public static SmartInterfaceSpec type(String type, float defaultValue, int priority);
public static SmartInterfaceSpec type(String type, float defaultValue, int priority, ValueType valueType);
public static SmartInterfaceSpec type(String type, float min, float max, int priority);
public static SmartInterfaceSpec type(String type, float min, float max, int priority, ValueType valueType);
public static SmartInterfaceSpec type(String type, float defaultValue, float min, float max,
        int priority, ValueType valueType);

// machine.SmartInterfaceSpec
String type();
float defaultValue();
float minValue();
float maxValue();
int priority();
SmartInterfaces.ValueType valueType();
String translationKey();
String descriptionKey();
boolean accepts(float value);
float validatedValue(float value);
```

The type name cannot be blank; values must be finite, with `min ≤ default ≤ max`. The overload that accepts only a default value also uses it as the minimum, with an upper limit of `Float.MAX_VALUE`; when only min/max are supplied, the default is min. INTEGER requires integer default values and bounds, but the public numeric type remains `float`. `validatedValue` returns **minValue** for invalid values, rather than throwing an exception or returning defaultValue.

`ValueType.byName` accepts `float`, `int`, and `integer`, ignoring case; blank/null returns FLOAT, and unknown names throw `IllegalArgumentException`. The translation key is `mmcr.smart_interface.type.<type>`; append `.description` for the description key.

```java
machine.smartInterface(SmartInterfaces.type("speed", 1F, 1F, 4F, 0,
                SmartInterfaces.ValueType.INTEGER))
        .smartInterfaceModifier(Modifiers.smartDuration("speed", 1F, 4F,
                1F, 0.25F, ModifierOperation.MULTIPLY));
```

## 10. Behavior hooks and context

`cn.howxu.mmcr.publicapi.behavior`

### `RecipeHooks` and `TickHooks`

```java
// RecipeHooks
RecipeHooks idleStart(Consumer<MachineContext> callback);
RecipeHooks idleEnd(Consumer<MachineContext> callback);
RecipeHooks beforeStart(Consumer<RecipeStartContext> callback);
RecipeHooks recipeTick(Consumer<RecipeTickContext> callback);
RecipeHooks beforeFinish(Consumer<RecipeFinishContext> callback);
RecipeHooks preServerTick(Consumer<MachineContext> callback);
RecipeHooks postServerTick(Consumer<MachineContext> callback);
// TickHooks
TickHooks serverTick(Consumer<TickContext> callback);
```

The configuration handle is provided by `Consumer` of `MachineDraft.recipeBehavior`/`tickBehavior` and is not implemented by itself. Recipe hooks are executed around idle search, startup consumption, recipe tick, and completion output; direct tick mode is driven by `serverTick`. Callbacks should be short and not blocked waiting for external tasks.

```java
machine.recipeBehavior(hooks -> hooks
        .beforeStart(start -> {
            if (start.duration() > 20) start.setDuration(20);
        })
        .recipeTick(tick -> {
            MachineContext context = tick.machineContext();
            if (context.isDue(20)) {
                context.jadeText().append(Identifier.fromNamespaceAndPath("my_mod", "progress"),
                        Component.translatable("jade.my_mod.progress", tick.currentTick(), tick.totalTick()));
            }
        }));
```

### `MachineContext`

```java
@Nullable MachineView controller();
ServerLevel level();
BlockPos controllerPos();
@Nullable Identifier machineId();
long gameTime();
boolean isDue(long period);
ControllerText screenText();
@Nullable DataStore dataStorage();
IoSnapshot ioView();
List<ItemStack> upgradeItems();
JadeText jadeText();
long countStructureBlocks(Block block);
long countStructureBlocks(Identifier blockId);
```

This is the authoritative server context. The controller getter returns a read-only `MachineView`, not a block entity. Data storage may be absent; check for null before using it. Upgrade items are returned as copied stacks. `isDue(period)` uses gameTime modulo a positive period to determine whether a tick is due; non-positive periods throw `IllegalArgumentException`. Structure counts cover the currently formed structure and return 0 when it is unformed. The ID overload now takes `Identifier`: `null` throws `NullPointerException`, and an unknown block throws `IllegalArgumentException`. These methods do not scan arbitrary world regions. Do not use the runtime context as a long-term cache or client-side data source.

Neither `MachineContext` nor `MachineView` provides `countStructureBlocks(String)` anymore. Use `context.countStructureBlocks(Identifier.parse("minecraft:iron_block"))`. The underlying `MachineBehaviorContext` used by KubeJS retains its string entry point; script signatures do not apply to the public interfaces.

Source: [MachineContext](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/5912f92f611da4a94d85f26644a3f9b99e534d27/src/main/java/cn/howxu/mmcr/publicapi/behavior/MachineContext.java), [MachineView](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/5912f92f611da4a94d85f26644a3f9b99e534d27/src/main/java/cn/howxu/mmcr/publicapi/runtime/MachineView.java).

### `RecipeStartContext`

```java
RecipeView recipe();
MachineContext machineContext();
Identifier recipeId();
long requestedParallelism();
long effectiveParallelism();
int duration();
void setDuration(int ticks);
boolean replaceExactItemInputCount(Item item, int expectedCount, int replacementCount);
List<RequirementSpec> requirements();
void setRequirements(List<RequirementSpec> requirements);
List<OutputView> outputs();
void setOutputs(List<OutputView> outputs);
RecipeExecutionView snapshot();
void cancel();
boolean cancelled();
```

The current execution can be adjusted before inputs are consumed; registered recipes are not changed. Duration must be positive. Exact input replacement changes only the first input whose quantity equals expected and whose ingredient resolves exclusively to the specified item. It does not replace tag inputs that include multiple items.

`setRequirements` re-derives built-in item/fluid outputs, but throws `IllegalStateException` if a registered custom output is currently present; do not assume it automatically rebuilds all extension outputs. `setOutputs` converts outputs into corresponding OUTPUT requirements through their registered output types and preserves the corresponding template tags. Output extensions must support that conversion correctly. Modifying a copied list does not automatically write changes back; use a setter. `snapshot()` returns this execution's duration, requirements, and outputs.

### `RecipeTickContext`

```java
MachineContext machineContext();
RecipeView recipe();
int currentTick();
int totalTick();
long parallelism();
List<RequirementSpec> requirements();
List<OutputView> outputs();
IoSnapshot ioSnapshot();
```

Reads the current execution progress and capabilities snapshot; this interface has no setter or cancellation methods and should not be added to the reference.

### `RecipeFinishContext`

```java
RecipeView recipe();
MachineContext machineContext();
Identifier recipeId();
long requestedParallelism();
long effectiveParallelism();
List<OutputView> outputs();
void setOutputs(List<OutputView> outputs);
void discardOutputs();
boolean outputsDiscarded();
void cancel();
boolean cancelled();
```

Adjust this execution's outputs before they are committed. `setOutputs` copies the list and its outputs and rejects empty built-in item/fluid outputs. `discardOutputs` explicitly marks the outputs as discarded and clears them; `cancel` marks this completion as cancelled. These are different actions.

### `TickContext`

```java
public interface TickContext extends MachineContext {
    int factoryThreadCount();
    long parallelism();
    Optional<Float> smartInterfaceValue(String name);
    Map<String, Float> smartInterfaceValues();
    IoTransaction ioPlan();
}
```

In direct tick mode, you can create a new IO transaction through `ioPlan()`; first add requirements and simulate them, and then submit them. `parallelism()` is context metadata; the direct IO plan itself is planned for one execution. If the business requires a larger quantity, the corresponding demand should be explicitly constructed, and do not assume that the value is automatically multiplied.

Source code: [behavior adaptation](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/api/facade/behavior/BehaviorAdapters.java), [start-context semantics](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeStartContext.java).

## 11. Runtime views, IO snapshots and transactions

`cn.howxu.mmcr.publicapi.runtime`

### `MachineView`, `RecipeView`, and `RecipeExecutionView`

```java
// MachineView
@Nullable Identifier machineId();
BlockPos controllerPos();
boolean formed();
long countStructureBlocks(Block block);
long countStructureBlocks(Identifier blockId);

// RecipeView
Identifier id();
Identifier recipePoolId();
int tickTime();
int priority();
int maxThreads();
boolean cancelRecipeOnPerTickFailure();
boolean parallelized();
boolean allowPartialOutputs();
List<RequirementSpec> requirements();
List<OutputView> outputs();
List<RecipeAdjustmentSpec> modifiers();
Set<Identifier> requiredHostIds();
List<RequirementSpec> runtimeRequirements();
List<RequirementSpec> runtimeRequirements(List<RecipeAdjustmentSpec> extraModifiers);
List<RequirementSpec> runtimeRequirements(List<RecipeAdjustmentSpec> extraModifiers,
        double energyMultiplier, double outputMultiplier);
List<OutputView> runtimeMachineOutputs();
List<OutputView> runtimeMachineOutputs(List<RecipeAdjustmentSpec> extraModifiers);

// RecipeExecutionView
int duration();
List<RequirementSpec> requirements();
List<OutputView> outputs();
```

`runtimeRequirements` and `runtimeMachineOutputs` generate execution values with modifiers applied; do not confuse them with the original declaration lists. `RecipeExecutionView` comes from the recipe start context snapshot and contains the results of adjustments made by that callback.

### `IoSnapshot`

```java
IoSnapshot forTags(Set<String> requiredTags);
List<IoDisplay> displays();
List<ResourceAmount<ItemResource>> itemInputs();
List<ResourceAmount<FluidResource>> fluidInputs();
List<ResourceAmount<Identifier>> chemicalInputs();
long chemicalAmount(Identifier chemicalId);
long chemicalTagAmount(Identifier tagId);
long chemicalOutputCapacity(Identifier chemicalId);
List<HeatState> heatInputs();
List<HeatState> heatOutputs();
long energyInput();
long itemAmount(Ingredient ingredient);
long fluidAmount(FluidIngredient ingredient);
long itemOutputCapacity(ItemStack stack);
long fluidOutputCapacity(FluidStack stack);
long energyOutputCapacity();
Optional<Float> smartInterfaceValue(String name);
Map<String, Float> smartInterfaceValues();

public record ResourceAmount<R>(R resource, long amount) {}
public record HeatState(double heat, double temperature, double heatCapacity) {}
```

An IO snapshot is a read-only aggregate view of a capability set, **not a deep copy that guarantees frozen resource amounts**. Queries still read capability storage and cannot replace transaction reservations. `forTags` retains only capabilities containing all specified tags; an empty tag set applies no filtering.

`ItemResource`/`FluidResource` comes from the NeoForge transfer package and the quantity is `long`; the output capacity query calculates the acceptable amount based on the given resource, which is not equal to the total vacancies of all output slots. The chemical view uses `Identifier` without relying on Mekanism types in the public calling code. The temperature is read in Kelvin, and `heatCapacity` is the heat capacity, not the maximum amount of heat that can be stored.

### `IoTransaction`

```java
IoSnapshot view();
IoTransaction addInput(RequirementSpec requirement);
IoTransaction addOutput(RequirementSpec requirement, OutputMode mode);
IoTransaction add(RequirementSpec requirement);
List<RequirementSpec> requirements();
IoSimulation simulate();
IoCommitResult commit();
IoCommitResult commit(Consumer<DataStore.Transaction> writes);
IoCommitResult commitData(Consumer<DataStore.Transaction> writes);
List<OutputAcceptance> outputSimulations();
boolean inputsSatisfied();
boolean energySatisfied();
```

`addInput` requires INPUT; `addOutput` requires OUTPUT and defaults to REQUIRE_FULL when the mode is null. `add` dispatches by IO direction; outputs require full capacity by default. New inputs are placed before outputs, and adding requirements invalidates previous simulations.

**Committing does not automatically simulate.** Call `simulate()` first, or call `outputSimulations`/`inputsSatisfied`/`energySatisfied`, which trigger simulation if none exists. Input and energy satisfaction alone do not prove that all outputs can be committed; also check `failure()` and output acceptance.

The plan can only be committed once: the first attempt consumes it, even if it has not been simulated or the commit fails. Subsequent commits return an unsuccessful result, and add/simulate calls throw `IllegalStateException` after consumption. Successful simulation does not guarantee a successful commit; committing still revalidates the plan, and the underlying transaction handles rollback.

Both `commit(writes)` and `commitData(writes)` lend the public `DataStore.Transaction` to the callback, allowing storage writes to be included in the same IO commit. Callbacks are only executed on the commit path; do not retain transaction handles. Ordinary `DataStore.set` will not automatically join this transaction, and must use the overload with transaction.

```java
machine.tickBehavior(hooks -> hooks.serverTick(context -> {
    DataStore storage = context.dataStorage();
    if (storage == null || !context.isDue(20)) return;

    IoTransaction plan = context.ioPlan()
            .addInput(Requirements.itemInput(Items.IRON_INGOT, 1))
            .addOutput(Requirements.itemOutput(new ItemStack(Items.IRON_NUGGET, 9)),
                    OutputMode.REQUIRE_FULL);
    IoSimulation simulation = plan.simulate();
    if (simulation.failure() != null || !simulation.inputsSatisfied()
            || !simulation.energySatisfied()) return;

    long completed = storage.get("completed").flatMap(DataKey::asLong).orElse(0L);
    IoCommitResult result = plan.commit(transaction ->
            storage.set("completed", DataKey.of(completed + 1L), transaction));
    if (!result.successful()) {
        // 本次 IO 与事务存储写入没有成功提交；下次 tick 创建新计划
    }
}));
```

Source code: [public transactions](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/runtime/IoTransaction.java), [simulation and single-use commit implementation](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/MachineIoPlan.java).

### IO results and failure diagnosis

```java
// IoSimulation
boolean inputsSatisfied();
boolean energySatisfied();
List<OutputAcceptance> outputs();
@Nullable RuntimeFailure failure();
// IoCommitResult
boolean successful();
@Nullable RuntimeFailure failure();
// OutputAcceptance
long requested();
long accepted();
OutputFit fit();
public enum OutputFit { FULL, PARTIAL, NONE }
public enum OutputMode { REQUIRE_FULL, ALLOW_PARTIAL }
public enum RecipeFailureMode { RESET, STILL, DECREASE }
public enum FailureSeverity { INFO, BLOCKED, FAILURE }
public enum FailurePhase {
    CAPABILITY_PREPARE, CAPABILITY_COMMIT, REQUIREMENT_PLAN, LEVEL_CHECK, RECIPE_SEARCH,
    RECIPE_LOAD, RECIPE_START, PER_TICK, FINISH, RUNTIME, UNKNOWN
}

// RuntimeFailure
Identifier id();
FailureSeverity severity();
Identifier source();
Map<String, String> details();
@Nullable Identifier reasonId();
@Nullable String reasonTranslationKey();
@Nullable Integer reasonPriority();
List<FailureFrame> trace();
// FailureFrame
Identifier source();
FailurePhase phase();
@Nullable Identifier recipeId();
@Nullable Integer requirementIndex();
```

A failed result might have no diagnostic object (such as a commit without simulation or a duplicate commit), so `failure()==null` does not equal successful. `reasonTranslationKey` is the localization key. Failure mode RESET/STILL/DECREASE declares the progress reset, hold or rollback strategy respectively; the default is STILL.

### `OutputView`, `ItemOutputView`, and `FluidOutputView`

```java
// OutputView
Identifier kindId();
String serializedId();
float chance();
long amount();
OutputView copy();
OutputView withChance(float chance);
OutputView applyModifiers(List<RecipeAdjustmentSpec> modifiers);
// ItemOutputView extends OutputView
ItemStack stack();
// FluidOutputView extends OutputView
FluidStack stack();
```

Stack getters return copies. `withChance`/`applyModifiers` return new output values. Extension outputs may appear only as generic `OutputView` instances; read their typed payloads through the corresponding `OutputKind.payload` method.

## 12. Output factory and output conversion

`cn.howxu.mmcr.publicapi.recipe`

### `Outputs`

```java
public static <O> OutputView extension(OutputKind<O> kind, O payload);
public static ItemOutputView item(ItemStack stack, float chance);
public static ItemOutputView item(ItemStack stack);
public static FluidOutputView fluid(FluidStack stack, float chance);
public static FluidOutputView fluid(FluidStack stack);
public static RequirementSpec toRequirement(OutputView output, List<String> tags);
public static Optional<RequirementSpec> tryToRequirement(OutputView output, List<String> tags);
public static Optional<OutputView> fromRequirement(RequirementSpec requirement);
public static boolean matchesOutputRequirement(RequirementSpec requirement);
public static boolean matchesOutputRequirement(OutputView output, RequirementSpec requirement);
```

The probability defaults to 1 when omitted. Output conversion is used for actual execution, not just JEI display. `toRequirement` requires the registered type to produce output requirements; use the Optional version when unsure whether conversion is available. Not all OUTPUT requirements can be reconstructed as display outputs, especially logical value requirements.

## 13. Requirements and output extension contract

Package: `cn.howxu.mmcr.publicapi.recipe.requirement`, `.recipe`, `.recipe.extension`.

### `RequirementKinds`, `RequirementKind` and `RequirementExtension`

```java
// RequirementKinds
public static <R> RequirementKind<R> register(RequirementExtension<R> extension);
// RequirementKind<R>：库生成的类型句柄
Identifier id();
TypePresentation presentation();
Optional<R> payload(RequirementSpec requirement);

// RequirementExtension<R>：用户 SPI
Identifier id();
MapCodec<R> codec();
IoDirection io(R value);
List<String> tags(R value);
R copy(R value);
RequirementExecution<R> execution();
default Set<Identifier> capabilityIds(); // Set.of(id())
default SyncPayloadCodec<R> syncCodec(); // null
default TypePresentation presentation();
```

Register the extension and save the returned kind before using the requirement type; `Requirements.extension(kind, payload)` then generates the requirement. Complete registration during startup initialization and keep types and Codecs consistent on both client and server. Requirement and output extension adapters call their respective registries directly, with no lifecycle window checks. `payload` returns values only for requirements owned by the same type and copies them through `copy`. The handle must still be the canonical instance in the registry; duplicate IDs, reserved built-in IDs, and stale handles cannot be used as alternative registration paths.

`codec()` describes the payload fields; **do not include the reserved `type` discriminant field**. `copy` must snapshot mutable payloads. `capabilityIds` declares the **existing capability family IDs** that participate in planning and is snapshotted during registration; by default, it contains only the requirement's own ID. The underlying layer also filters directions and tags. This declaration is not a capability registrar: registering a requirement ID without an actual port capability does not create storage.

### `RequirementExecution`

```java
RequirementPlanSpec plan(R value, PlanningView context);
default R applyModifiers(R value, List<RecipeAdjustmentSpec> modifiers); // 返回 value
default R applyLevelModifiers(R value, double energyMultiplier, double outputMultiplier); // 返回 value
default boolean overlaps(R value, RequirementSpec other); // false
default List<ResourceWakeupSpec<?>> resourceWakeups(R value); // List.of()
```

`plan` only plans; it does not directly modify actual resources. If extension quantities are affected by modifiers or level multipliers, override the corresponding methods; the defaults do not automatically interpret the payload. `overlaps` declares overlap relationships, and `resourceWakeups` declares conditions for retrying after resource changes.

### `OutputKinds`, `OutputKind` and `OutputExtension`

```java
// OutputKinds
public static <O> OutputKind<O> register(OutputExtension<O> extension);
// OutputKind<O>：库生成的类型句柄
Identifier id();
String serializedId();
TypePresentation presentation();
Optional<O> payload(OutputView output);

// OutputExtension<O>：用户 SPI
Identifier id();
default String serializedId(); // id().toString()
MapCodec<O> codec();
O copy(O value);
float chance(O value);
default long amount(O value); // 0
O withChance(O value, float chance);
O applyModifiers(O value, List<RecipeAdjustmentSpec> modifiers);
RequirementSpec toRequirement(O value, List<String> tags);
boolean matchesRequirement(RequirementSpec requirement);
default Optional<O> fromRequirement(RequirementSpec requirement); // Optional.empty()
default SyncPayloadCodec<O> syncCodec(); // null
default TypePresentation presentation();
```

`Outputs.extension(kind, payload)` constructs a runtime output. A recipe declaration can submit the corresponding requirement through `Outputs.toRequirement` and `RecipeDraft.requirement`, or use the registered type's `CustomIoSpec` path. The extension must convert the output into an executable OUTPUT requirement, and `matchesRequirement` must only match requirements it supports; implement `fromRequirement` when reverse reconstruction is needed. Providing only a Codec or JEI description is insufficient to commit the output.

### `SyncPayloadCodec` and `TypePresentation`

```java
// SyncPayloadCodec<T>（用户 SPI）
void encode(RegistryFriendlyByteBuf buffer, T value);
T decode(RegistryFriendlyByteBuf buffer);
int maxPayloadSize();
void validate(T value);

public record TypePresentation(String translationKey, String descriptionKey) {}
```

When `syncCodec()==null`, the underlying bounded JSON synchronization Codec is used. Custom binary synchronization must specify a valid payload size limit and validate payloads; unbounded payload declarations are not allowed. Default requirement presentation keys are `requirement.<id>` / `requirement.<id>.description`, and output keys are `output.<id>` / `output.<id>.description`. Both client and server must register consistent types and synchronization formats.

Source code: [requirement extensions](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/requirement/RequirementExtension.java), [output extensions](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/recipe/OutputExtension.java).

### `PlanningView` and `RequirementPlanSpec`

```java
// PlanningView：库生成的规划上下文
long requestedParallelism();
int requirementIndex();
boolean allowPartialOutputs();
OutputMode outputMode();
List<CapabilityAccess> capabilities();
ReservationsView reservations();
RequirementPlanSpec plan(RequirementSpec requirement);
RequirementPlanSpec prepared(long maxParallelism, List<RecipeOperation> operations);
RequirementPlanSpec deferred(long maxParallelism, OperationPlanner operations, ReservationPlanner reservations);
RequirementPlanSpec blocked(PlanStatus failure);
PlanStatus failure(Identifier id, Identifier source, Map<String, String> details);
OutputSimulationView outputSimulation(long requested, long accepted);

// RequirementPlanSpec
int requirementIndex();
long maxParallelism();
boolean successful();
Optional<PlanStatus> failure();
// PlanStatus
Identifier id();
Identifier source();
Map<String, String> details();
// OutputSimulationView
long requested();
long accepted();
Fit fit();
enum Fit { NONE, PARTIAL, FULL }
```

`plan(requirement)` can delegate to an existing registered requirement handler. `prepared` supplies prepared transaction operations, `deferred` creates operations and reservations after the final parallelism is determined, and `blocked` returns a failure. Planning results include the original requirement index to help trace failures.

### `CapabilityAccess`, `ResourceStore` and `LongStore`

```java
// CapabilityAccess：已有能力的只读元数据/操作准备句柄
Identifier kindId();
Set<IoDirection> directions();
int outputPriority();
<R> Optional<ResourceStore<R>> resources(Class<R> type);
Optional<LongStore> longValues();
boolean supportsLargeStacks();
<R> RecipeOperation prepareResources(IoDirection io, long parallelism, List<ResourceAction<R>> actions);
RecipeOperation prepareValue(IoDirection io, long parallelism, long amount, boolean insert);
RecipeOperation prepareSmartValue(IoDirection io, long parallelism, String interfaceType, float value);

// ResourceStore<R>：只读存储视图
Class<R> resourceType();
int size();
@Nullable R resource(int slot);
long amount(int slot);
long capacity(int slot, @Nullable R resource);
boolean isValid(int slot, R resource);
// LongStore
long amount();
long capacity();
long transferLimit();

public record ResourceAction<R>(int slot, R resource, long amount, boolean insert) {}
```

`ResourceStore`/`LongStore` are not public SPIs that you can implement to register ports. The amount passed to `prepareValue` is the **total already scaled by parallelism**; do not multiply by parallelism again. A resource action describes insertion into or extraction from a specified slot. The resource type comes from the capability declaration; first use Optional to check that it matches.

### `ReservationsView`

```java
<R> @Nullable R resource(ResourceStore<R> storage, int slot);
long amount(ResourceStore<?> storage, int slot);
<R> boolean reserveExtract(ResourceStore<R> storage, int slot, R resource, long amount);
<R> boolean reserveInsert(ResourceStore<R> storage, int slot, R resource, long amount);
<R> long outputAvailable(ResourceStore<R> storage, R key, long capacity);
<R> boolean reserveOutput(ResourceStore<R> storage, R key, long amount);
long valueAvailable(LongStore storage, boolean insert);
boolean reserveValue(LongStore storage, long amount, boolean insert);
boolean reserveValueTotal(LongStore storage, long amount, boolean insert);
```

Read and reserve logical inventory within the same planning process to prevent multiple requirements from reusing the same resource or output space. A successful reservation does not mean that the real storage has been modified; the actual changes must be committed by a transaction operation.

- `reserveOutput` **does not check the output capacity**, only accumulates positive reserves and prevents `long` addition overflow. The caller must first check for sufficient space with `outputAvailable(storage, key, capacity)` before registering the reservation; `capacity` is the non-negative available capacity baseline calculated by the caller, not the slot capacity read by this method. The same storage reservation identity and key share accounts.
- `insert=true` represents insertion into storage (output) and `false` represents extraction from storage (input). `valueAvailable` returns the capacity space or inventory after deducting existing reservations, excluding `transferLimit` restrictions.
- `reserveValue` checks the available amount and this `amount <= transferLimit()`; `reserveValueTotal` still checks the available amount and accounting overflow, but **skips the single transmission upper limit check**. When used with parallel sums, the caller must constrain `amount <= transferLimit() × parallelism` itself and safely compute the scaled sums without circumventing the transfer limits of the actual operation.

Minimum reservation example (can be put into extension classes; view of storage and reservation in parameters is provided by MMCR):

```java
import cn.howxu.mmcr.publicapi.recipe.extension.LongStore;
import cn.howxu.mmcr.publicapi.recipe.extension.ReservationsView;
import cn.howxu.mmcr.publicapi.recipe.extension.ResourceStore;

static <R> boolean reserveOutputSpace(ReservationsView reservations,
        ResourceStore<R> storage, R key, long capacity, long amount) {
    return amount > 0L
            && reservations.outputAvailable(storage, key, capacity) >= amount
            && reservations.reserveOutput(storage, key, amount);
}

static boolean reserveParallelValue(ReservationsView reservations,
        LongStore storage, long perBatch, long parallelism, boolean insert) {
    if (perBatch <= 0L || parallelism <= 0L) return false;
    long total = Math.multiplyExact(perBatch, parallelism);
    long scaledLimit = Math.multiplyExact(storage.transferLimit(), parallelism);
    return total <= scaledLimit
            && reservations.reserveValueTotal(storage, total, insert);
}
```

In the example, `Math.multiplyExact` throws `ArithmeticException` when the multiplication overflows, and the overflow quantity will not be registered. The output key must be non-null and use the same resource key as other output reservations; `capacity` must be non-negative. These methods only complete planning and accounting; subsequent transaction operations still need to be prepared and submitted, and do not multiply the parallelism when passing `total` to `prepareValue`.

### Transaction operations and deferred planning SPIs

```java
// RecipeOperation
OperationResult commit(TransactionContext transaction);
default RecipeOperation forParallelism(long parallelism); // null
// OperationPlanner
OperationBatch create(long parallelism, ReservationsView reservations);
// ReservationPlanner
ReservationCheck reserve(long parallelism, ReservationsView reservations);

public record OperationResult(boolean success, PlanStatus failure) {
    public static OperationResult successful();
    public static OperationResult failure(PlanStatus failure);
}
public record OperationBatch(List<RecipeOperation> operations,
        @Nullable PlanStatus failure, @Nullable OutputSimulationView outputSimulation) {
    public OperationBatch(List<RecipeOperation> operations, @Nullable PlanStatus failure);
}
public record ReservationCheck(@Nullable PlanStatus failure,
        @Nullable OutputSimulationView outputSimulation) {}
```

`TransactionContext` is `net.neoforged.neoforge.transfer.transaction.TransactionContext`. External resource operations must participate in MMCR's transaction so that failures can be rolled back. By default, `forParallelism` returns null, indicating that a prepared lambda **does not support rescaling**. Either implement rescaling explicitly or use `deferred` to create operations at the final parallelism; do not reuse a fixed-quantity operation as if it supported arbitrary parallelism.

### Resource wake-up contract

```java
public record ResourceWakeupSpec<T>(Set<Identifier> failureReasonIds, Reason reason,
        Class<T> resourceType, Predicate<ResourceChangeView<T>> matcher) {
    public enum Reason { INPUT_AVAILABLE, ENERGY_AVAILABLE, OUTPUT_CAPACITY }
}
// ResourceChangeView<T>
T resource();
ResourceWakeupSpec.Reason reason();
```

Wake-up rules match the failure reason, change kind, and resource type; resources of a different class are not passed to the matcher. Scalar signals such as energy use the capability family's `Identifier` as their resource type; items and fluids retain their platform resource types. No extension resource wake-up rules are provided unless declared. This contract observes existing resource changes; it does not replace the underlying capability implementation.

## 14. Data and repositories

`cn.howxu.mmcr.publicapi.data`

### `DataKind` and `DataKey`

```java
public enum DataKind {
    BOOLEAN, STRING, BYTE, SHORT, INT, LONG, FLOAT, DOUBLE, BIG_INTEGER, BIG_DECIMAL, LIST, MAP
}

// DataKey 静态工厂
static DataKey of(boolean value);
static DataKey of(String value);
static DataKey of(byte value);
static DataKey of(short value);
static DataKey of(int value);
static DataKey of(long value);
static DataKey of(float value);
static DataKey of(double value);
static DataKey of(BigInteger value);
static DataKey of(BigDecimal value);
static DataKey list(List<DataKey> values);
static DataKey map(Map<String, DataKey> values);
// DataKey 访问器
DataKind type();
Optional<Boolean> asBoolean();
Optional<String> asString();
Optional<Byte> asByte();
Optional<Short> asShort();
Optional<Integer> asInt();
Optional<Long> asLong();
Optional<Float> asFloat();
Optional<Double> asDouble();
Optional<BigInteger> asBigInteger();
Optional<BigDecimal> asBigDecimal();
Optional<List<DataKey>> asList();
Optional<Map<String, DataKey>> asMap();
boolean booleanValue();
String stringValue();
byte byteValue();
short shortValue();
int intValue();
long longValue();
float floatValue();
double doubleValue();
BigInteger bigIntegerValue();
BigDecimal bigDecimalValue();
```

Although named `DataKey`, it wraps a **value**; storage keys remain `String`. Numeric types are distinguished exactly: `of(1)` is INT and `of(1L)` is LONG. Optional getters return empty on a type mismatch without coercing numbers. Use direct getters only after checking the type; a mismatch throws `IllegalStateException`. Floating-point values must be finite; strings, large numbers, and collection elements must not be null, and map keys must not be blank. Collection factories produce read-only values; modifying the original map/list does not change stored values.

### `DataStore` and `DataStore.Transaction`

```java
Optional<DataKey> get(String key);
boolean contains(String key);
Map<String, DataKey> values();
void set(String key, DataKey value);
boolean set(String key, DataKey value, DataStore.Transaction transaction);
Optional<DataKey> remove(String key);

// DataStore.Transaction
TransactionContext context();
```

MMCR provides active runtime storage. `values()` returns a map snapshot. Ordinary set/remove operations **execute immediately**, do not register transaction snapshots, and provide no transactional consistency guarantee. The transactional set overload joins the supplied IO transaction and can be rolled back. The underlying snapshot saves the entire Map, so restoring it may also overwrite ordinary writes/deletions made after the snapshot was registered; do not assume per-key rollback boundaries. A return value of `false` means the value did not change, not that the transaction failed. The public interface has no transactional remove overload.

`Transaction` is only valid within the commit callback. `context()` exposes a shared NeoForge transaction to external reserved operations; do not save it, close it, or open a new root transaction in its place.

```java
DataStore store = context.dataStorage();
if (store != null) {
    long count = store.get("completed").flatMap(DataKey::asLong).orElse(0L);
    store.set("completed", DataKey.of(count + 1L)); // 即时写入，非 IO 事务
}
```

### `Repository`, `Reservation`, `RepositoryContext`, and `RepositoryRequest`

```java
// Repository（用户 SPI）
Identifier id();
RepositoryRequest request(RepositoryContext context);
// Reservation（用户 SPI）
boolean commit(DataStore.Transaction transaction);
void cancel();

public record RepositoryContext(Identifier machineId, BlockPos controllerPos,
        String key, DataKind requestedType) {}
public record RepositoryRequest(Identifier repositoryId, BlockPos controllerPos, String key,
        DataKind requestedType, DataKey requestedValue, Optional<Reservation> reservation) {
    public RepositoryRequest(Identifier id, BlockPos pos, String key, DataKind kind, DataKey value);
    public static RepositoryRequest available(Identifier id, BlockPos pos, String key,
            DataKind kind, DataKey value, Reservation reservation);
    public static RepositoryRequest unavailable(Identifier id, BlockPos pos, String key,
            DataKind kind, DataKey value);
}
```

Records provide accessors named after their fields. Contexts and results require non-null IDs, positions, and types; keys must not be blank, and positions are normalized to immutable values. A result's `requestedValue.type()` must equal `requestedType`. `available` includes a reservation; `unavailable` retains the requested value but has no reservation. The five-argument constructor also has no reservation.

The repository contract allows external implementations to read and reserve resources, but the current public package has no separate global repository registration entry point. Do not assume that `Repositories.register` exists. External reservations must be committed using the shared transaction and released on failure or abandonment.

Source code: [data storage contract](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/data/DataStore.java), [repository result validation](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/data/RepositoryRequest.java).

## 15. Queued network requests

`cn.howxu.mmcr.publicapi.network`

### `NetworkSettings`

```java
static NetworkSettings of(int maxCount, int maxConnections, Set<Identifier> allowedMachineIds);
static NetworkSettings disabled();
int maxCount();
int maxConnections();
Set<Identifier> allowedMachineIds();
NetworkSettings withAllowedMachine(Identifier machineId);
```

`disabled()` specifies 0 interfaces, 0 connections, and an empty allowlist; count limits cannot be negative. Configure the machine with `networkInterface` and `allowNetworkMachine`, and read the settings through `MachineSpec.networkInterface()`.

### `NodeView`, `NetworkPortView`, `RequestPayload`, and `RequestDetails`

```java
// NodeView
static NodeView of(Identifier type, long hash);
Identifier type();
long hash();
// NetworkPortView
BlockPos position();
List<NodeView> connections();
// RequestPayload
static RequestPayload of(Map<String, DataKey> values);
Map<String, DataKey> values();
Optional<DataKey> get(String key);
// RequestDetails
Identifier requestId();
NodeView peer();
```

Nodes are located using machine type ID and instance identity hashes. Don't think of hash as a coordinate or a topological address that can be inferred by yourself. Ports can only be obtained from runtime context enumeration; `NodeView.of` can construct known identities, but cannot bypass connection verification.

The request body is an immutable string key→DataKey value map. The key must not be blank and the value must not be null. `RequestDetails.peer()` identifies the sender in receive processing and indicates the peer target of the request in failure processing.

### `Networks`

```java
public static List<NetworkPortView> interfaces(MachineContext context);
public static void sendRequest(NetworkPortView source, NodeView target,
        Identifier requestId, RequestPayload body);
```

Enumerates available network interfaces of currently formed machines; missing controllers/structures or unloaded interfaces do not yield usable handles. Sending enqueues the request on the server; it does not synchronously return a processing result. The target must be in the source's connection table. An unconnected target throws `IllegalArgumentException` directly without invoking the dispatch failure callback. Structure, hash, allowlist, chunk, and handler checks after enqueueing may cause the request to fail.

```java
if (context.isDue(20)) {
    for (NetworkPortView port : Networks.interfaces(context)) {
        for (NodeView target : port.connections()) {
            Networks.sendRequest(port, target,
                    Identifier.fromNamespaceAndPath("my_mod", "report_power"),
                    RequestPayload.of(Map.of("power", DataKey.of(20.0D))));
        }
    }
}
```

### `RequestHandler`, `FailureHandler`, and `RequestFailure`

```java
// RequestHandler（用户函数式接口）
void process(RequestPayload body, RequestDetails request,
        @Nullable DataStore senderStorage, @Nullable DataStore receiverStorage);
// FailureHandler（用户函数式接口）
void fail(RequestPayload body, RequestDetails request,
        @Nullable DataStore senderStorage, RequestFailure reason);

public enum RequestFailure {
    SOURCE_INTERFACE_MISSING, TARGET_INTERFACE_MISSING, TARGET_CHUNK_UNLOADED, CONNECTION_MISSING,
    SOURCE_STRUCTURE_INVALID, TARGET_STRUCTURE_INVALID, HASH_MISMATCH, ALLOWLIST_REJECTED,
    TARGET_HANDLER_MISSING, UNREACHABLE
}
```

Both storage parameters may be null; check them before use. Handlers are registered through `MachineDraft.requestProcess`/`requestFailed`, and duplicate IDs are rejected. Callback writes are **not implicitly transactional**; if processing throws an exception, do not assume that earlier ordinary storage writes are automatically rolled back.

```java
Identifier report = Identifier.fromNamespaceAndPath("my_mod", "report_power");
machine.networkInterface(1, 4)
        .allowNetworkMachine(Identifier.fromNamespaceAndPath("my_mod", "producer"))
        .requestProcess(report, (body, request, sender, receiver) -> {
            if (receiver == null) return;
            double power = body.get("power").flatMap(DataKey::asDouble).orElse(0D);
            receiver.set("power_" + request.peer().hash(), DataKey.of(power));
        })
        .requestFailed(report, (body, request, sender, reason) -> {
            if (sender != null) sender.set("last_failure", DataKey.of(reason.name()));
        });
```

Source/destination interface missing, chunk not loaded, connection missing, structure failure, identity mismatch, whitelist rejection, target processor missing and unreachable respectively correspond to enumeration values. The whitelist and network interface capabilities are different configurations. The machine types allowed by the actual communication parties should be configured.

Source code: [public network entry points](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/network/Networks.java), [network adaptation](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/internal/api/facade/network/NetworkAdapters.java).

## 16. Presentation: controller text and Jade

`cn.howxu.mmcr.publicapi.presentation`

### `ControllerText` and `TextScope`

```java
public enum TextScope { CONTROLLER, OPERATION }
void append(TextScope scope, Identifier lineId, Component text);
void appendAfter(TextScope scope, Identifier lineId, Identifier afterLineId, Component text);
void replace(Identifier lineId, Component text);
void remove(TextScope scope, Identifier lineId);
void clear(TextScope scope);
```

Text is managed using stable, namespaced lineIds; CONTROLLER is controller-level text, and OPERATION is operation text. `appendAfter` only inserts relative to existing rows in the same scope. Missing or cross-scope references are no-op. `replace` has no scope parameter and is queued to wait for the flush after the controller processor ends. It does not change the current snapshot immediately; do not write `replace(scope, ...)` that does not exist. Preserve localization via `Component.translatable`.

### `ControllerTexts`, `ControllerTextHandler`, and `ControllerTextContext`

```java
// ControllerTexts
public static ControllerTexts.Registration register(Identifier machineId, ControllerTextHandler handler);
// ControllerTexts.Registration
void unregister();
// ControllerTextHandler（用户 SPI）
void apply(ControllerTextContext context);
// ControllerTextContext
Identifier machineId();
BlockPos controllerPos();
ControllerText screenText();
```

Registers a text handler for a specific machine and returns a handle that can unregister it. This context provides only the machine ID, position, and text-writing interface, with no server world, data store, or mutable controller entities. When runtime data is needed, update text from the behavior context.

```java
ControllerTexts.Registration registration = ControllerTexts.register(MACHINE, context ->
        context.screenText().append(TextScope.CONTROLLER,
                Identifier.fromNamespaceAndPath("my_mod", "hint"),
                Component.translatable("screen.my_mod.hint")));
// 需要撤销时 registration.unregister()
```

### `JadeText`

```java
void append(Identifier lineId, Component text);
void appendAfter(Identifier lineId, Identifier afterLineId, Component text);
void replace(Identifier lineId, Component text);
void remove(Identifier lineId);
void clear();
```

Obtained from `MachineContext.jadeText()`, the row ID is used for update/removal instead of repeatedly appending the string every tick without identification. Jade text has no scope parameter.

### `IoDisplay` and `DisplayStackView`

```java
// IoDisplay
String label();
String value();
String unit();
Optional<DisplayStackView> icon();
// DisplayStackView
ItemStack stack();
```

Read capability display entries from `IoSnapshot.displays()`. The icon may be absent; display stacks are copies. label/value/unit are display data, not execution requirements or resource handles.

## 17. Client rendering

`cn.howxu.mmcr.publicapi.client.render`, event in `.event`

### `RegisterControllerRenderersEvent` and `RendererRegistrar`

```java
// RegisterControllerRenderersEvent extends Event
public RegisterControllerRenderersEvent(Collection<Identifier> machineIds);
public RendererRegistrar registrar();
public void register(Identifier machineId, ControllerRenderer renderer);
public Map<Identifier, ControllerRenderer> renderers();
// RendererRegistrar
void register(Identifier machineId, ControllerRenderer renderer);
Map<Identifier, ControllerRenderer> renderers();
```

The client registration window accepts per-machine renderers; machine IDs must exist, and duplicate registrations or registrations after the window closes are rejected. Subscribe to this event only during client initialization to avoid loading rendering classes on a dedicated server. Renderer registration does not replace the machine's base controller definition.

### `ControllerRenderer`

```java
void render(ControllerRenderContext context, PoseStack poses,
        SubmitNodeCollector nodes, CameraRenderState camera);
default boolean shouldRenderOffScreen(); // false
default int getViewDistance(); // 64
```

Minecraft 26.1.2 uses a submit-node rendering path. `PoseStack` comes from `com.mojang.blaze3d.vertex`, `SubmitNodeCollector` from `net.minecraft.client.renderer`, and `CameraRenderState` from `net.minecraft.client.renderer.state.level`. Do not use older examples with MultiBufferSource parameters. By default, rendering is limited to the field of view with a view distance of 64.

### `ControllerRenderContext`

```java
BlockPos controllerPos();
Identifier machineId();
@Nullable Direction facing();
ControllerRenderContext.StructureView structure();
ControllerRenderContext.CraftingView crafting();
Map<String, DataKey> dataStorageValues();
int lightCoords();
float partialTick();

// ControllerRenderContext.StructureView
boolean formed();
boolean structureAreaLoaded();
int matchedStage();
// ControllerRenderContext.CraftingView
@Nullable Identifier recipeId();
ControllerRenderContext.Status status();
String statusMessage();
@Nullable RuntimeFailure failure();
int tick();
int totalTick();
long parallelism();
long maxParallelism();
enum Status { IDLE, CRAFTING, MISSING_STRUCTURE, CHUNK_UNLOADED, NO_RECIPE, PAUSED }
```

Render callbacks receive only MMCR's published, render-safe read-only state, with no server world or mutable storage. `statusMessage` is a translation key; `recipeId`/`failure`/`facing` may be absent. During rendering, data storage access is limited to reading `dataStorageValues()`; it cannot be used to modify server data.

```java
event.register(MACHINE, new ControllerRenderer() {
    @Override
    public void render(ControllerRenderContext context, PoseStack poses,
            SubmitNodeCollector nodes, CameraRenderState camera) {
        if (!context.structure().formed()) return;
        poses.pushPose();
        try {
            // 根据 crafting() / dataStorageValues() 计算动画并提交渲染节点
        } finally {
            poses.popPose();
        }
    }
});
```

Source code: [rendering signatures](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderer.java), [published state view](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderContext.java).

## 18. JEI workstations and recipe information

`cn.howxu.mmcr.publicapi.client.jei`, event in `.event`

### `RegisterJeiWorkstationsEvent` and `WorkstationRegistrar`

```java
// RegisterJeiWorkstationsEvent extends Event
public RegisterJeiWorkstationsEvent();
public WorkstationRegistrar registrar();
public void addRecipePoolWorkstation(Identifier poolId, Identifier itemId);
public void addRecipePoolWorkstation(Identifier poolId, ItemLike workstation);
public void addRecipePoolWorkstation(Identifier poolId, ItemStack workstation);
public void addMachineWorkstation(Identifier machineId, Identifier recipeTypeId);
public List<Workstation> entries();
// WorkstationRegistrar
void addRecipePoolWorkstation(Identifier poolId, Identifier itemId);
void addRecipePoolWorkstation(Identifier poolId, ItemLike workstation);
void addRecipePoolWorkstation(Identifier poolId, ItemStack workstation);
void addMachineWorkstation(Identifier machineId, Identifier recipeTypeId);
List<Workstation> entries();
```

A recipe pool workstation is bound to an item ID or an item stack with components; a machine workstation associates a machine controller with a specified JEI recipe type ID. The second ID is not a machine ID and cannot be assumed to match a recipe pool ID without checking. `ItemLike` comes from Minecraft.

### `Workstation`

```java
// Workstation：库生成的基础接口，无方法
// Workstation.RecipePoolItem extends Workstation
Identifier recipePoolId();
Identifier itemId();
// Workstation.RecipePoolStack extends Workstation
Identifier recipePoolId();
ItemStack workstation();
// Workstation.Machine extends Workstation
Identifier machineId();
Identifier recipeTypeId();
```

The association is read based on the specific subinterface; the stack getter returns a copy, which cannot be changed to adjust the registered workbench.

### `RegisterJeiRecipeInformationEvent` and `RecipeInformationRegistrar`

```java
// RegisterJeiRecipeInformationEvent extends Event
public RegisterJeiRecipeInformationEvent();
public RecipeInformationRegistrar registrar();
public void registerRecipePool(Identifier id, String translationKey, Object... arguments);
public void registerRecipe(Identifier id, String translationKey, Object... arguments);
public List<RecipeInformation> entries();
// RecipeInformationRegistrar
void registerRecipePool(Identifier id, String translationKey, Object... arguments);
void registerRecipe(Identifier id, String translationKey, Object... arguments);
List<RecipeInformation> entries();
```

Register information for an entire pool or an individual recipe. Supply arguments as localization parameters rather than constructing Java-formatted strings. Entries cannot be added after the client JEI registration window closes.

### `RecipeInformation`

```java
enum Target { RECIPE_POOL, RECIPE }
Target target();
Identifier targetId();
String translationKey();
List<Object> arguments();
Component component();
```

Returns the information target and localization data; components and mutable arguments are copied according to the implementation at the public boundary.

```java
static void workstations(RegisterJeiWorkstationsEvent event) {
    event.addRecipePoolWorkstation(Identifier.fromNamespaceAndPath("my_mod", "shared_pool"),
            Items.IRON_BLOCK);
}
static void information(RegisterJeiRecipeInformationEvent event) {
    event.registerRecipePool(Identifier.fromNamespaceAndPath("my_mod", "shared_pool"),
            "jei.my_mod.shared_pool.info", 40);
}
```

These events are published during the JEI integration collection phase and are not additional methods of the generic machine definition provider. The registration return list is only used to view entries and does not mean that JEI has completed parsing and rendering.

## 19. Complete controller UI {#controller-ui}

Protocols and snapshots are located at `cn.howxu.mmcr.publicapi.ui`, client access is located at `cn.howxu.mmcr.publicapi.client.ui`, and registered events are located at `.event`.

This extension allows a complete controller screen to be registered for a machine. MMCR manages the original menu, session identity, state synchronization, and request transport; the add-on mod provides screens, data-only Codecs, and server-side logic callbacks. Native Minecraft UI, Modern UI, and other frameworks can be used; the public interface does not depend on Modern UI widget types. For an integration example, see [UI test machine](../JavaAPI/ui-test-machine).

### Registration events and windows

```java
// event.RegisterControllerUiProtocolsEvent extends Event implements IModBusEvent
public RegisterControllerUiProtocolsEvent(Collection<Identifier> machineIds);
public UiProtocolRegistrar registrar();

// ui.UiProtocolRegistrar
<Q, R> void request(Identifier machineId, UiRequestType<Q, R> type,
        UiRequestHandler<Q, R> handler);
<T> void state(Identifier machineId, UiStateType<T> type, UiStateProvider<T> provider);

// event.RegisterControllerUisEvent extends Event implements IModBusEvent
public RegisterControllerUisEvent(Collection<Identifier> machineIds);
public RegisterControllerUisEvent.Registrar registrar();
public void register(Identifier machineId, ControllerUiFactory factory);

// event.RegisterControllerUisEvent.Registrar
void register(Identifier machineId, ControllerUiFactory factory);
```

Both events are published via the **Mod event bus**:

| Event | Dispatch phase and side | Registered content |
| --- | --- | --- |
| `RegisterControllerUiProtocolsEvent` | Network payload registration phase, collected by both client and server. | Request handlers and state providers for each machine ID. |
| `RegisterControllerUisEvent` | Client menu screen registration phase, client only. | A complete screen factory for every known physical machine ID. |

Machine definitions must be registered first. Registrars freeze after event dispatch, and the window closes even if a listener throws; retaining an event or registrar does not allow later registrations. The public layer throws `RegistrationException` for unknown machines, duplicate registrations, and writes after the window closes. Public constructors do not allow an add-on mod to publish its own event to replace production registration results.

Requests and state share a machine's protocol ID space, with a maximum of 64 entries per machine. Multiple machines may use the same protocol ID, but must reuse the same version and Codec instances. The same ID cannot serve as both a request and a state protocol, and different Codecs cannot silently overwrite existing declarations. Define type descriptors and Codecs as shared static constants and register consistent definitions on both client and server.

Client screen factories are routed by physical machine ID, rather than recipe pool or execution lane. The default screen is used when no factory is registered. If the factory throws `RuntimeException`, returns a screen that does not implement `MenuAccess`, or binds the wrong menu, the runtime logs an error, restores player inventory visibility, and falls back to the default screen.

### `UiRequestType<Q, R>` and `UiStateType<T>`

```java
// UiRequestType<Q, R>：Q 为请求体，R 为成功响应体
static <Q, R> UiRequestType<Q, R> of(Identifier id, int version,
        StreamCodec<RegistryFriendlyByteBuf, Q> requestCodec,
        StreamCodec<RegistryFriendlyByteBuf, R> responseCodec);
Identifier id();
int version();

// UiStateType<T>：T 为自定义状态快照
static <T> UiStateType<T> of(Identifier id, int version,
        StreamCodec<RegistryFriendlyByteBuf, T> codec);
Identifier id();
int version();
```

These descriptors are created by the MMCR factory and cannot be implemented yourself. `version` must be a positive number; ID and Codec must not be null. `StreamCodec` and `RegistryFriendlyByteBuf` come from Minecraft's `net.minecraft.network.codec` and `net.minecraft.network` respectively.

Codecs handle only protocol data and must not read Minecraft instances, players, worlds, or mutable menus. The client `request` encodes and freezes the request body before returning, so the Codec may run on the caller's UI thread; do not put server contexts or client widgets into payloads. Update the protocol version when making incompatible payload changes.

### `UiRequestHandler<Q, R>`, `UiServerContext` and `UiStateProvider<T>`

```java
// UiRequestHandler<Q, R>
UiResult<R> handle(UiServerContext context, Q request);

// UiServerContext
ServerPlayer player();
MachineContext machine();
Optional<String> laneId();

// UiStateProvider<T>
long revision(UiServerContext context);
T snapshot(UiServerContext context);
```

Request handlers run synchronously on the server thread. `machine()` is a public `MachineContext`, and `machine().dataStorage()` may still be null; `laneId()` identifies the request's optional execution lane. Do not retain the context for asynchronous world access. Ordinary storage writes take effect immediately; callback exceptions do not automatically roll back completed writes or world side effects.

The state provider publishes the latest value, rather than a response required for every request. `revision` must be non-negative and increase monotonically with state changes within the same session; `snapshot` is called on initial collection and when the revision changes. Changing state without updating the revision does not trigger a new snapshot; the client ignores stale revisions. Both callbacks should read the same authoritative state. Custom state and the base UI snapshot have separate revision numbers.

The server collects state within the currently active menu session. Provider or encoding failures log diagnostics and do not publish erroneous values as new state. A failed revision is not repeatedly retried; advance the revision after fixing the state.

### `UiResult<R>`

```java
enum Status {
    SUCCESS, REJECTED, UNSUPPORTED, VERSION_MISMATCH, INVALID_REQUEST,
    CLOSED, TIMEOUT, BUSY, HANDLER_FAILED
}
static <R> UiResult<R> success(R value);
static <R> UiResult<R> reject(Component reason);
Status status();
Optional<R> value();
Optional<Component> message();
```

Handlers use `success` to return a non-null successful response, or `reject` to return a non-null rejection reason; other statuses are generated by the runtime. Only `SUCCESS` has a populated `value()`; other statuses return an empty Optional. Rejection messages are copied at the public boundary; use `Component.translatable` to preserve localization.

| Status | Meaning |
| --- | --- |
| `SUCCESS` | Server-side processing is successful, with response body. |
| `REJECTED` | The server-side handler explicitly rejects the request, usually with a reason. |
| `UNSUPPORTED` | The current machine/session does not support this protocol. |
| `VERSION_MISMATCH` | The requested version is inconsistent with the server protocol version. |
| `INVALID_REQUEST` | The request data is invalid, encoding/decoding failed, snapshot is not ready, or the channel is invalid. |
| `CLOSED` | The menu session to which the request belongs has been closed or expired. |
| `TIMEOUT` | Timed out waiting for response. |
| `BUSY` | The runtime limit has been reached for pending requests. |
| `HANDLER_FAILED` | Processing, response encoding, or transmission path failure. |

A successful response is request feedback and does not replace the base snapshot or custom state stream. Display current machine values from server-synchronized state; submitted input alone is not synchronized state.

### `ControllerUiFactory` and `ControllerUiOpenContext`

```java
// client.ui.ControllerUiFactory（用户函数式接口）
Screen create(ControllerUiOpenContext context);

// client.ui.ControllerUiOpenContext
AbstractContainerMenu menu();
Inventory inventory();
Component title();
ControllerUiSession session();
```

The factory runs on the client main thread. Its returned `Screen` must implement Minecraft's `MenuAccess`, and `getMenu()` must return **the same `context.menu()` instance**. You may extend a container screen that satisfies this contract. Do not create a separate menu, return a plain screen without a menu binding, or cast `menu()` to an internal MMCR menu type.

`menu` / `inventory` are native objects provided when the screen opens and must be used only on the client main thread; `title` is a copied component. UI frameworks read published data and send requests through `session`; they must not directly read native menus, player inventories, or worlds across threads.

### `ControllerUiSession`

```java
UUID id();
boolean isOpen();
ControllerUiSnapshot snapshot();
ControllerUiSlots slots();
boolean supports(UiRequestType<?, ?> type);
boolean supports(UiStateType<?> type);
<Q, R> CompletionStage<UiResult<R>> request(UiRequestType<Q, R> type, Q body);
<Q, R> CompletionStage<UiResult<R>> request(UiRequestType<Q, R> type, String laneId, Q body);
UiSubscription subscribe(Executor executor, Consumer<ControllerUiSnapshot> listener);
<T> UiSubscription subscribe(UiStateType<T> type, Executor executor, Consumer<T> listener);
<T> Optional<T> state(UiStateType<T> type);
UiSubscription onClosed(Executor executor, Runnable listener);
void close();
```

One menu open corresponds to one session UUID. `snapshot`, `state`, `supports`, request and subscription entries can be used in the UI thread; the bottom layer dispatches transmission and menu life cycle operations back to the client's main thread. Slot operations also require the main thread, see the next section.

- `snapshot()` initially returns opening information with `ready()` false; it becomes true only after the first complete server snapshot arrives. You may initially display the opening title, but requests should wait until the session is ready.
- `supports(...)` checks whether the protocol capabilities in the server's opening information match the locally registered type, version and Codec; the same ID does not mean automatic compatibility.
- Requests without `laneId` target the controller. Overloads with a lane must use a valid execution lane ID from the current snapshot; blank values are rejected. The ordinary recipe lane is `base`; pure Tick machines have no recipe lane, and factory idle-display placeholder lanes cannot be used as request targets.
- `request(...)` returns `CompletionStage` without blocking and waiting. The request results are completed on the client's main thread; to update controls in a framework such as Modern UI, use `thenAcceptAsync` / `whenCompleteAsync` and explicitly pass in the framework's UI executor.
- Base snapshot subscriptions deliver the current value. Custom state subscriptions deliver the current value if one exists, otherwise they wait for the first state. `state(type)` returns an empty Optional if the type is unsupported, no value has arrived, or the session is closed.
- Callbacks run on the supplied executor and are delivered serially within each subscription. Backlogged updates may be coalesced to the latest value, so subscriptions are not event logs. Custom state values are decoded independently on read/delivery and do not share mutable payloads.
- `onClosed` listens for session closure; registering on an already closed session also schedules a closure notification through the executor. Release subscriptions when the UI is destroyed to prevent queued callbacks from accessing old widgets.
- `close()` schedules the closing of the current session and the menus still matching it. Changing menus, logging out, or invalidating the binding will also end the old session; the old session cannot close the menu that was opened later, and the unfinished request ends with `CLOSED`.

### `ControllerUiSlots` and `UiSubscription`

```java
// client.ui.ControllerUiSlots
boolean isPlayerInventoryVisible();
void setPlayerInventoryVisible(boolean visible);

// client.ui.UiSubscription extends AutoCloseable
void close();
```

The slot handle controls player inventory slot visibility in the original menu; it does not create, delete, or renumber slots. Both reads and writes require the client main thread, and writes also require a valid, matching menu session. Visibility can be set during screen factory execution or native screen initialization, but cannot be toggled directly on Modern UI's UI thread.

`UiSubscription.close()` cancels subsequent deliveries, including callbacks that have been queued but have not yet started; callbacks that are already executing cannot be interrupted. Closing a subscription does not close the entire menu session.

### `ControllerUiSnapshot`

```java
enum Kind { NORMAL, TICK, FACTORY }
enum Role { NORMAL, HOST, MODULE }
UUID sessionId();
long revision();
boolean ready();
ResourceKey<Level> dimension();
BlockPos controllerPos();
Identifier machineId();
Kind kind();
Role role();
Component machineName();
boolean formed();
boolean active();
boolean redstonePaused();
int installedModuleCount();
Optional<Identifier> connectedHostId();
int matchedStage();
int stageCount();
List<Identifier> foundLevelIds();
int parallelSlots();
long maxParallelism();
int threadLimit();
int activeThreadCount();
List<Identifier> recipePoolIds();
Optional<Identifier> currentRecipePoolId();
Optional<RuntimeFailure> failure();
boolean hasDataStorage();
Map<String, DataKey> dataStorageValues();
List<TextLine> lines();
List<Lane> lanes();
```

This is a read-only presentation view published by the runtime, with no server world, mutable controller entities, or real-time `DataStore`. `dimension()` is a dimension key, not a `Level` object. `dataStorageValues()` is a synchronized data value. Modifying the local value will not be written back to the server; to modify the storage, you need to declare the request and process it on the server.

`Kind` distinguishes ordinary recipe, pure Tick, and factory execution modes; `Role` distinguishes normal, host, and module roles. Do not confuse the two. `ready()` only means that the first authoritative snapshot has arrived, not that the structure is formed or a recipe is running; check `formed()`, `active()`, and the other relevant fields separately. Base snapshot revisions distinguish versions within the current session and cannot be compared with custom state revisions.

### `ControllerUiSnapshot.Lane` and recipe display

```java
// ControllerUiSnapshot.Lane
String id();
int index();
boolean base();
boolean core();
boolean active();
Optional<Identifier> recipeId();
int tick();
int totalTick();
long parallelism();
Optional<RuntimeFailure> failure();
List<TextLine> lines();
RecipePresentation recipe();

// ControllerUiSnapshot.RecipePresentation
List<Output> outputs();
long energyInputPerTick();
long energyOutputPerTick();
double heatOutputPerTick();
int durationTicks();
long parallelism();

// ControllerUiSnapshot.Output
OutputView resource();
long amount();

// ControllerUiSnapshot.TextLine
enum Scope { CONTROLLER, OPERATION }
Identifier id();
Scope scope();
Component text();
```

`Lane.id()` is the stable lane ID used for requests, while `index()` is a display index; do not construct lane IDs from indices. Ordinary recipes use the base lane. Factories may contain multiple execution lanes and idle-display placeholders; pure Tick machines provide no recipe execution lanes. Recipes and failures may be absent. Check `totalTick()` before drawing progress to avoid division by zero.

`RecipePresentation` provides expected outputs and per-tick energy/heat display values already scaled by parallelism; do not multiply by `parallelism()` again. `Output.resource()` is a public `runtime.OutputView`; `amount()` separately gives the expected total. Do not infer output quantities from icon stack counts. These are display values and do not prove that outputs have been committed.

Global `lines()` and lane `lines()` retain external text from controller/operation logic; component getters such as `TextLine.text()` and `machineName()` return copies. `TextLine.Scope` is a UI snapshot enum and is a different type from `presentation.TextScope`, which is used by text-writing entry points.

## 20. Usage and migration checklist

- Select imports from `cn.howxu.mmcr.publicapi` and the subpackages listed on this page; Java public API examples do not import MMCR's underlying `api` or internal adapter types.
- The machine, structure, and recipe are declared through the `Machines`, `Structures`, and `Recipes` factories respectively and submitted in the corresponding event window. `Consumer<Draft>` is built by MMCR after configuration.
- Declaration views, runtime views, and custom payload SPIs have different ownership rules: implement only explicitly extensible SPIs. Modifying copied stacks or payloads does not automatically write changes back.
- Direct tick IO is simulated first and then submitted in one go; `DataStore.set` with transactions is used to synchronize data changes, and network callback normal writes are not implicitly rolled back.
- Client rendering reads published state; the 26.1.2 rendering signatures use submit nodes. JEI workstation and recipe information registration have separate windows.
- Register complete UI protocols on both client and server, and screen factories only on the client. Retain the original menu, read snapshots and send requests through the session, and release subscriptions when the UI is destroyed.
- Extended requirements/output also provide serialization, copying, planning and output requirement conversion contracts; the underlying port capability implementation is not included in the public API jar.
