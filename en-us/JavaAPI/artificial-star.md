---
title: Artificial Star
order: 9
---

# Artificial Star

The artificial star is a huge machine with a Java renderer. This example defines the machine and renderer with Java `publicapi`, contributes the structure and recipes with KubeJS, and demonstrates a hybrid implementation bound by machine ID and recipe pool.

Writing a giant structure directly in one Java method may hit bytecode method-size or constant-pool limits; that does not mean Java cannot define large structures. This example keeps the giant pattern in a script for easier export and maintenance.

## Overview

- **Java side**: registers a machine definition.
- **KubeJS structure definition**: `example/server_scripts/structure/builtin_java/ArtificialStar.js`, the giant star installation shell.
- **KubeJS recipe**: `example/server_scripts/recipe/builtIn_java/人造恒星.js` adds recipes to the Java machine's recipe pool.
- **Renderer**: `ArtificialStarRenderer` hooks into `RegisterControllerRenderersEvent` and renders a rotating OBJ star model.

## Files Involved

| File | Side | Purpose |
| --- | --- | --- |
| [`builtin/ARTIFICIAL_STAR.java`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/builtin/ARTIFICIAL_STAR.java) | Java server | Machine definition |
| [`provider/BuiltInProvider.java`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/provider/BuiltInProvider.java) | Java startup | Calls `registerDefinitions(...)` through `ServiceLoader` |
| [`client/ArtificialStarRenderer.java`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/client/ArtificialStarRenderer.java) | Java client | Controller renderer + standalone-model registration |
| [`example/server_scripts/structure/builtin_java/ArtificialStar.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/builtin_java/ArtificialStar.js) | KubeJS server | Structure |
| [`example/server_scripts/recipe/builtIn_java/人造恒星.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/builtIn_java/人造恒星.js) | KubeJS server | Recipe-pool contents |
| `assets/mmcr_test/models/obj/star.json` / `.obj` / `.mtl` | Client resources | OBJ model and materials for the star |
| `assets/mmcr_test/textures/block/obj/star_layer.png` | Client resources | Star texture |

## APIs

| API | Reference |
| --- | --- |
| `MachineDefinitionProvider` | [Public startup-provider signature](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/registration/MachineDefinitionProvider.java) |
| `RegisterMachineDefinitionsEvent` | [Machine-definition registration event](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/event/RegisterMachineDefinitionsEvent.java) |
| `Machines` / `MachineSpec` | [Declaration entry point](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Machines.java); `build()` produces the machine spec |
| `RegisterControllerRenderersEvent` | [Client renderer event](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/event/RegisterControllerRenderersEvent.java) |
| `ControllerRenderer` | [render and default methods](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderer.java) |
| `ControllerRenderContext` | [Read-only published state](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderContext.java) |

KubeJS:

| API used | API reference |
| --- | --- |
| `MMCREvents.server` | [Link](../API/KubeJS#mmcrevents) |
| `MMCRServerEventJS.createStructure` | [Link](../API/KubeJS#mmcrservereventjs) |
| `MachineStructureBuilderJS` | [Link](../API/KubeJS#machinestructurebuilderjs) |
| `KubeJSApi.block` / `state` | [Link](../API/KubeJS#kubejsapi) |

## Machine Definition

```java

@EventBusSubscriber
public class ARTIFICIAL_STAR {
    public static final Identifier ARTIFICIAL_STAR = id("artificial_star");

    public static void registerDefinitions(RegisterMachineDefinitionsEvent event) {
        if (!event.definitions().containsKey(ARTIFICIAL_STAR)) {
            MachineSpec machine = Machines
                    .machine(ARTIFICIAL_STAR)
                    .recipePool(ARTIFICIAL_STAR)
                    .displayNameKey("machine.mmcr.artificial_star")
                    .build();
            event.registerMachine(machine);
        }
    }
}
```

## Structure

**The Java side contributes only the machine definition and same-named recipe pool**; the structure is contributed by the KubeJS file `example/server_scripts/structure/builtin_java/ArtificialStar.js`. The following is an excerpt omitting the giant pattern and most symbol bindings, not a complete buildable structure; see the pinned-commit script for the full layout.

```javascript
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr:artificial_star")
    structure
        // 此处放入原脚本完整的 .pattern(...) 层列表
        .set('X', api.block('minecraft:magma_block'))
        .set('A', api.block('minecraft:iron_block'))
        .set('B', api.state('minecraft:iron_bars[east=true,north=false,south=true,waterlogged=false,west=true]'))
        // 其余字符绑定见完整脚本
        .set('w', api.anyOf(
            api.block('minecraft:red_concrete'),
            api.anyOfEnergyOutput(),
            api.anyOfItemInput()
        ))
        .controller('C')
        .build()
})
```

### Lifecycle

The ID passed to `event.createStructure("mmcr:artificial_star")` is the one registered by Java's `id("artificial_star")`. The current `createStructure(String id)` creates a structure builder and does not require the machine to be defined by KubeJS; the later `controller('C')` looks up the matching controller block through that ID, so the machine definition must already be registered during startup. The stages are as follows; client registration and server reload must not be understood as consecutive execution on one thread:

```text
启动期
  → ServiceLoader 加载 BuiltInProvider
  → ARTIFICIAL_STAR.registerDefinitions(event) 注册 mmcr:artificial_star
  → 机器定义冻结
服务期（KubeJS 服务端重载事务）
  → ArtificialStar.js 执行 createStructure("mmcr:artificial_star")
  → 结构提交，与 Java 注册的机器定义绑定
客户端（渲染器加载阶段）
  → RegisterControllerRenderersEvent 发布（客户端 NeoForge.EVENT_BUS）
  → ArtificialStarRenderer.registerRenderer(event) 绑定渲染器
```

These code forms refer to the same machine ID. Validation and commit during structure reload are managed by the KubeJS integration core; ensure that the ID passed to `createStructure` matches the Java definition and do not change it to another example's `mmcr_kubejs:*` ID.

### Symbol Bindings

KubeJS `set(...)` accepts a block-ID string, `Block`, `BlockState`, or internal predicate. This script uses both `api.block(...)` and `api.state(...)`:

```javascript
.set('X', api.block('minecraft:magma_block'))
.set('J', api.state('minecraft:stone_button[face=floor,facing=south,powered=false]'))
```

The semantics correspond to `BlockConditions.block(...)` / `state(...)` in the Java public layer. KubeJS `event.getAPI()` returns the script integration API; these script calls do not need to be rewritten as Java `publicapi` calls.

The symbol table uses `0-9`, `A-Z`, and `a-z` (excluding several unused symbols), and also spills over into the Chinese characters `一` and `七`:

```javascript
.set('一', api.state('minecraft:iron_trapdoor[facing=south,half=top,open=false,powered=false,waterlogged=false]'))
.set('七', api.state('minecraft:stone_button[face=floor,facing=north,powered=false]'))
```

:::warning
The current `set(String symbol, Object value)` requires `symbol.length() == 1`, requires that it is not a space, then takes `charAt(0)`; the symbol must also already appear in the pattern. This is a constraint of one UTF-16 `char`, not an arbitrary UTF-8 string. The script's `一` and `七` satisfy it, whereas emojis commonly represented by surrogate pairs do not. When exporting a structure, retain the markers and bindings produced by the tool.
:::

### Recipe-Pool Binding

The current recipe script must also be used with the Java definition:

```javascript
ServerEvents.recipes(event => {
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr:artificial_star',
        tick_time: 300,
        requirements: [
            {
                type: 'minecraft:item',
                io: 'input',
                item: 'minecraft:apple',
                count: 1,
                consume_chance: 0
            },
            {
                type: 'neoforge:energy',
                io: 'output',
                fe_per_tick: 200
            }
        ]
    })
})
```

This is the data-recipe form and uses the current `recipe_pool`, `tick_time`, and `requirements` fields. The machine's `.recipePool(ARTIFICIAL_STAR)` corresponds to `mmcr:artificial_star` here. The apple is an input with count 1 and consumption chance 0; the recipe lasts 300 ticks and outputs 200 FE/t while running. The structure's `w` permits item-input and energy-output ports to provide IO for this recipe; the Java renderer is not producing energy.

## Controller Renderer

`ArtificialStarRenderer` makes a continuously rotating star model float above the controller.

The complete flow has four steps: model registration, renderer registration, per-frame rendering, and performance switches.

### Class Declaration and Singleton

```java
@EventBusSubscriber(value = Dist.CLIENT)
public final class ArtificialStarRenderer implements ControllerRenderer {
    public static final ArtificialStarRenderer INSTANCE = new ArtificialStarRenderer();
    private static final Identifier STAR_MODEL_ID = Identifier.fromNamespaceAndPath("mmcr_test", "obj/star");
    private static final StandaloneModelKey<BlockStateModelPart> STAR_MODEL = new StandaloneModelKey<>(
            () -> STAR_MODEL_ID.toString());

    private ArtificialStarRenderer() {
    }
```

**`@EventBusSubscriber(value = Dist.CLIENT)`** restricts this class's `@SubscribeEvent` methods to client registration. This restriction is necessary: the renderer references `Minecraft.getInstance()`, and loading this class on a dedicated server would crash it directly.

**Private constructor and `INSTANCE` singleton**: [`ControllerRenderer`](../API/JavaAPI#controllerrenderer) is a `@FunctionalInterface` and could be written in one line with a lambda. A full class is used here because it must override the two default methods `shouldRenderOffScreen()` and `getViewDistance()`; a lambda can implement only `render(...)`.

**`StandaloneModelKey`** is NeoForge's standalone-model handle.

A standalone model is not bound to any block or item and is for pure rendering purposes. Here it points to `mmcr_test:obj/star`; the actual resource loaded is `assets/mmcr_test/models/obj/star.json`, a model descriptor with a `neoforge:obj` loader that points to `star.obj` and texture `mmcr_test:block/obj/star_layer`.

### Register the Standalone Model

```java
@SubscribeEvent
public static void registerModel(ModelEvent.RegisterStandalone event) {
    event.register(STAR_MODEL, SimpleUnbakedStandaloneModel.simpleModelWrapper(STAR_MODEL_ID));
}
```

This is a NeoForge event. `ModelEvent.RegisterStandalone` is published during resource-pack model loading and associates the `STAR_MODEL` key with the actual model resource.

`SimpleUnbakedStandaloneModel.simpleModelWrapper(...)` is a convenience method that wraps an ordinary model JSON as a standalone model.

MMCR is responsible only for "when to call your renderer"; it does not load model resources.

### Hook `RegisterControllerRenderersEvent`

```java
@SubscribeEvent
public static void registerRenderer(RegisterControllerRenderersEvent event) {
    event.register(ARTIFICIAL_STAR.ARTIFICIAL_STAR, INSTANCE);
}
```

`RegisterControllerRenderersEvent` is the client Java renderer-registration window, published on `NeoForge.EVENT_BUS`. `void register(Identifier machineId, ControllerRenderer renderer)` binds the public renderer to a machine ID; `event.registrar()` returns the public `RendererRegistrar`.

- **One renderer per machine**: duplicate registration for the same machine ID is rejected; the public adapter layer throws `cn.howxu.mmcr.publicapi.registration.RegistrationException`.
- **The ID must be in the event allowlist**: the event is constructed with a set of IDs permitted to register, and the public layer likewise rejects unknown IDs with `RegistrationException`. Therefore the machine definition must register successfully before the renderer can be attached.
- **Window freeze**: no more registration is allowed after the registration window ends. The public event has no `freeze()` for add-ons to call; freezing is core-managed, and event handles cannot be retained for later hot-reload registration.

`event.renderers()` returns an immutable snapshot of currently registered renderers and can be used for idempotence checks.

### `render(...)`

```java
@Override
public void render(ControllerRenderContext context, PoseStack poseStack,
                   SubmitNodeCollector nodeCollector, CameraRenderState camera) {
```

`ControllerRenderContext` is the read-only published-state interface MMCR provides to Java render callbacks, not a self-constructed record or the server's `MachineContext`. `PoseStack` is the transform stack, `SubmitNodeCollector` is the render-node collector, and `CameraRenderState` is the camera state.

**1. Preconditions**

```java
if (!context.structure().formed() || Minecraft.getInstance().level == null) return;
```

`context.structure()` returns `StructureView`; `formed()` indicates whether the structure is formed, so nothing is rendered while it is not.

`Minecraft.getInstance().level == null` is a defensive check, because a render callback may still fire once while the world unloads.

`StructureView` also provides `structureAreaLoaded()` (whether the structure area is loaded) and `matchedStage()` (which stage is currently matched), neither of which is used here.

**2. Calculate the base position by facing**

```java
double x = 0.5;
double y = 42.5;
double z = 0.5;
if (context.facing() != null) {
    switch (context.facing()) {
        case NORTH -> z = 39.5;
        case SOUTH -> z = -38.5;
        case WEST  -> x = 39.5;
        case EAST  -> x = -38.5;
        default -> { }
    }
}
```

The coordinates are **relative to the controller block**. When `PoseStack` enters `render(...)`, it has already been translated to the controller block's origin, so `0.5, 42.5, 0.5` means horizontally centered, 42 blocks above the controller.

`context.facing()` is the controller facing and can be `null` (when unformed). This `switch` compensates for the fact that the structure's sphere center is not directly above the controller but about 39 blocks horizontally from it. The controller sits at the edge of the spherical shell, and its facing determines which side contains the sphere center.

- North -> sphere center 39.5 blocks south, `z = 39.5`
- South -> sphere center 38.5 blocks north, `z = -38.5`
- West / east -> similarly offset on the x axis

`default -> { }` handles other facings by retaining the initial offset. This is a switch statement and does not imply that all statement-style switches must exhaust an enum.

The asymmetric `39.5` and `-38.5` come from the half-block offset between block centers and structure center: positive direction requires `+0.5` to land at a block center, negative direction requires `-0.5`.

**3. Get the model; exit on failure**

```java
BlockStateModelPart model = Minecraft.getInstance().getModelManager().getStandaloneModel(STAR_MODEL);
if (model == null) return;
```

This retrieves the standalone model registered in the first step from the model manager. It can return `null` after failed resource-pack loading or during resource reload. MMCR records exceptions thrown by renderers without letting them escape the rendering flow, but logging every frame is still unacceptable.

**4. Calculate rotation angle**

```java
float tick = Minecraft.getInstance().level.getGameTime() + context.partialTick();
```

`getGameTime()` is the current game tick (integer), and `context.partialTick()` is the interpolation factor between two ticks in the current frame (0.0 to 1.0). Their sum gives continuous fractional time; using it to drive rotation produces a smooth animation, whereas integer ticks alone would make it jump at 20 Hz.

:::warning
`partialTick` should be used only for interpolation, not logical decisions.
:::

**5. Transform and submit**

```java
poseStack.pushPose();
poseStack.translate(x, y, z);
poseStack.scale(0.45F, 0.45F, 0.45F);
poseStack.mulPose(new Quaternionf().fromAxisAngleDeg(0F, 1F, 1F, tick % 360F));
nodeCollector.submitBlockModel(poseStack, RenderTypes.translucentMovingBlock(), List.of(model), new int[0],
        LightCoordsUtil.FULL_BRIGHT, OverlayTexture.NO_OVERLAY, 0);
poseStack.popPose();
```

In order:

- `pushPose()` / `popPose()` are paired to save and restore the transform stack. **Failing to pair them corrupts all subsequent rendering**.
- `translate(x, y, z)` moves to the position calculated in step 2.
- `scale(0.45F, 0.45F, 0.45F)` scales uniformly to 45% on all axes. The OBJ model's own dimensions are determined during modeling; increasing this value makes the star much larger.
- `mulPose(new Quaternionf().fromAxisAngleDeg(0F, 1F, 1F, tick % 360F))` rotates `tick % 360` degrees about axis `(0, 1, 1)`. The axis is the y-z diagonal, making the rotation appear as diagonal tumbling. The modulo bounds the input angle, but game time is first converted to `float`, so it cannot be claimed to eliminate all floating-point precision loss during long runtimes.
- `submitBlockModel(...)` submits the model to the collector. Its seven parameters are the transform stack, render type, model-part list, texture-index array, light coordinates, overlay texture, and extra data.
- `RenderTypes.translucentMovingBlock()` is a translucent render type. The star texture has an alpha channel; an opaque type would create black edges.
- `LightCoordsUtil.FULL_BRIGHT` makes the model **ignore ambient light and remain constantly fully bright**.
- `OverlayTexture.NO_OVERLAY` applies no hurt / white-flash overlay.
- `new int[0]` is an empty texture-index array; the model supplies its own material mapping.

### Performance

```java
@Override
public boolean shouldRenderOffScreen() {
    return true;
}

@Override
public int getViewDistance() {
    return 512;
}
```

**`shouldRenderOffScreen()` returns `true`**: rendering runs even when the controller block itself is outside the view frustum.

Minecraft block-entity rendering normally performs frustum culling using the block entity's own bounding box. The star is 42 blocks above and 39 blocks horizontally from the controller; when a player looks up at it, the controller block beneath them has long since left the view. Without this switch, the star would suddenly disappear as the player approaches; returning `true` keeps it visible.

**`getViewDistance()` returns `512`**: the default is 64. This installation is about 80 blocks in diameter and is meant to be viewed from afar, so 64 blocks is clearly insufficient.

## Further Reading

- [RegisterControllerRenderersEvent source](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/event/RegisterControllerRenderersEvent.java) - public registration window.
- [ControllerRenderer source](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderer.java) - `render` signature and two default methods.
- [ControllerRenderContext source](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderContext.java) - nested `StructureView` / `CraftingView` and `Map<String, DataKey> dataStorageValues()`. The client reads published state and cannot obtain a live `DataStore` or write server data here.
- [Java Public API Reference](../API/JavaAPI).
