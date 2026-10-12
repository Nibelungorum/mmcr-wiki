---
title: Recipe Tick Example
order: 13
---

# Recipe Tick Example — KubeJS Recipe Tick Machine

This is the fourth article in the advanced KubeJS examples.

The KubeJS behavior bridge passes contexts from `cn.howxu.mmcr.api.machine.definition` directly; all same-named types in this article refer to underlying types, so Java `publicapi` signatures or read-only constraints must not be applied to them.

This machine **has recipes**, but inserts custom callbacks at all 5 stages of the recipe lifecycle (`idleStart` / `idleEnd` / `beforeStart` / `recipeTick` / `beforeFinish`).

## Files Involved

Source locations:

- [`startup_scripts/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/advance/A_Recipe_Tick_Machine.js) — Machine definition, 5 hooks, and static screen text.
- [`server_scripts/structure/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js) — Multiblock structure.
- [`server_scripts/recipe/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/advance/A_Recipe_Tick_Machine.js) — Registers 3 recipes in `ServerEvents.recipes`.

## API Navigation Table

| KubeJS API Used | API Reference |
| --- | --- |
| `MMCR.getAPI()` | [Link](../API/KubeJS#getapi-→-kubejsapi) |
| `event.createMachine(...)` | [Link](../API/KubeJS#createmachine-string-id-→-machinebuilderjs) |
| `MachineBuilderJS.displayNameKey(...)` | [Link](../API/KubeJS#displaynamekey-string-key-→-machinebuilderjs) |
| `MachineBuilderJS.recipePool(...)` | [Link](../API/KubeJS#recipepool-string-recipepoolids-→-machinebuilderjs) |
| `MachineBuilderJS.appearance(...)` | [Link](../API/KubeJS#appearance-string-machinebasicblock-→-machinebuilderjs) |
| `MachineBuilderJS.recipeBehavior(...)` | [Link](../API/KubeJS#recipebehavior-consumer-machinebehaviorbuilderjs-builder-→-machinebuilderjs) |
| `MachineBehaviorBuilderJS.idleStart(...)` | [Link](../API/KubeJS#idlestart-consumer-machinebehaviorcontext-callback-→-machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.idleEnd(...)` | [Link](../API/KubeJS#idleend-consumer-machinebehaviorcontext-callback-→-machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.beforeStart(...)` | [Link](../API/KubeJS#beforestart-consumer-recipestartcontext-callback-→-machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.recipeTick(...)` | [Link](../API/KubeJS#recipetick-consumer-recipetickcontext-callback-→-machinebehaviorbuilderjs) |
| `MachineBehaviorBuilderJS.beforeFinish(...)` | [Link](../API/KubeJS#beforefinish-consumer-recipefinishcontext-callback-→-machinebehaviorbuilderjs) |
| `RecipeStartContext.requirements()` / `setRequirements(...)` / `replaceExactItemInputCount(...)` | [Underlying context source](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeStartContext.java) |
| `RecipeTickContext` / `RecipeFinishContext` | [tick source](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeTickContext.java) / [finish source](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeFinishContext.java) |
| `KubeJSApi.id(...)` | [Link](../API/KubeJS#id-string-id-→-identifier) |
| `KubeJSApi.screenScope()` | [Link](../API/KubeJS#screenscope-→-screenscopevalues) |
| `event.registerControllerScreenText(...)` | [Link](../API/KubeJS#registercontrollerscreentext-string-machineid-consumer-controllerscreentexteventjs-handler-→-void) |
| `ControllerScreenTextEventJS.append(...)` | [Link](../API/KubeJS#append-string-scope-string-lineid-component-text-→-void) |
| `ControllerScreenTextEventJS.appendAfter(...)` | [Link](../API/KubeJS#appendafter-string-scope-string-lineid-string-afterlineid-component-text-→-void) |
| `ControllerScreenTextEventJS.appendTranslatable(...)` | [Link](../API/KubeJS#appendtranslatable-string-scope-string-lineid-string-key-object-args-→-void) |
| `ControllerScreenTextEventJS.appendAfterTranslatable(...)` | [Link](../API/KubeJS#appendaftertranslatable-string-scope-string-lineid-string-afterlineid-string-key-object-args-→-void) |
| `ControllerScreenTextEventJS.remove(...)` | [Link](../API/KubeJS#remove-string-scope-string-lineid-→-void) |
| `KubeJSApi.block(...)` / `anyOf(...)` | [Link](../API/KubeJS#block-string-blockid-→-blockpredicate) / [Link](../API/KubeJS#anyof-blockpredicate-children-→-blockpredicate) |
| `KubeJSApi.anyOfItemInput()` / `anyOfItemOutput()` / `anyOfEnergyInput()` | [Link](../API/KubeJS#anyofiteminput-→-blockpredicate) / [Link](../API/KubeJS#anyofitemoutput-→-blockpredicate) / [Link](../API/KubeJS#anyofenergyinput-→-blockpredicate) |
| `KubeJSApi.parallelControllers()` | [Link](../API/KubeJS#parallelcontrollers-→-blockpredicate) |
| `MachineStructureBuilderJS.pattern(...)` / `set(...)` / `controller(...)` / `build()` | [Link](../API/KubeJS#pattern-string-rows-→-machinestructurebuilderjs) / [Link](../API/KubeJS#set-string-symbol-object-value-→-machinestructurebuilderjs) / [Link](../API/KubeJS#controller-string-symbol-→-machinestructurebuilderjs) / [Link](../API/KubeJS#build-→-void) |

Java classes obtained directly through `Java.loadClass` in the source:

| Java Class | Purpose |
| --- | --- |
| `net.minecraft.world.entity.LivingEntity` | Searches for living entities within an area to apply effects |
| `net.minecraft.world.effect.MobEffects` | `STRENGTH` / `NIGHT_VISION` effect constants |
| `cn.howxu.mmcr.api.recipe.requirement.ItemRequirement` | Reconstructs item input requirements |
| `java.util.ArrayList` | Collects the complete replacement requirement list |
| `net.minecraft.core.registries.BuiltInRegistries` | Compares item registry IDs |

## Machine Definition

Open the startup script [`A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/advance/A_Recipe_Tick_Machine.js):

```javascript
MMCREvents.startup(event => {

    const api = MMCR.getAPI() // I suggest use MMCR.getAPI() in start_up script
    // Some advanced KubeJS usage
    const LivingEntity = Java.loadClass("net.minecraft.world.entity.LivingEntity")
    const MobEffects = Java.loadClass("net.minecraft.world.effect.MobEffects")

    // Some Class
    const ItemRequirement = Java.loadClass("cn.howxu.mmcr.api.recipe.requirement.ItemRequirement")
    const ArrayList = Java.loadClass("java.util.ArrayList")
    const BuiltInRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries")

    const machine = event
        .createMachine("mmcr_kubejs:kubejs_recipe_ticker")
        .displayNameKey("machine.mmcr_kubejs.kubejs_recipe_ticker")
        .recipePool("mmcr_kubejs:kubejs_recipe_ticker")
        .appearance("minecraft:green_terracotta")
        // Here you can set some recipe tick hook
        .recipeBehavior(behavior => behavior
            .idleStart(ctx => { /* ... */ })
            .idleEnd(ctx => { /* ... */ })
            .beforeStart(ctx => { /* ... */ })
            .recipeTick(ctx => { /* ... */ })
            .beforeFinish(ctx => { /* ... */ })
        )
    // ...
    machine.register()
})
```

Chained calls:

- `.displayNameKey(...)`: localization key; `.recipePool(...)`: recipe pool ID; `.appearance("minecraft:green_terracotta")`: appearance block.
- [`.recipeBehavior(behavior => behavior.xxx(...))`](../API/KubeJS#recipebehavior-consumer-machinebehaviorbuilderjs-builder-→-machinebuilderjs) injection point

[`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs) provides 5 hooks:

| Hook | Context Received | Trigger Timing |
| --- | --- | --- |
| [`idleStart`](../API/KubeJS#idlestart-consumer-machinebehaviorcontext-callback-→-machinebehaviorbuilderjs) | `MachineBehaviorContext` | Entering the idle state |
| [`idleEnd`](../API/KubeJS#idleend-consumer-machinebehaviorcontext-callback-→-machinebehaviorbuilderjs) | `MachineBehaviorContext` | Leaving the idle state |
| [`beforeStart`](../API/KubeJS#beforestart-consumer-recipestartcontext-callback-→-machinebehaviorbuilderjs) | `RecipeStartContext` | Before recipe start; requirements / outputs can be changed |
| [`recipeTick`](../API/KubeJS#recipetick-consumer-recipetickcontext-callback-→-machinebehaviorbuilderjs) | `RecipeTickContext` | Every tick during recipe execution |
| [`beforeFinish`](../API/KubeJS#beforefinish-consumer-recipefinishcontext-callback-→-machinebehaviorbuilderjs) | `RecipeFinishContext` | Before recipe outputs are committed |

The startup script contains no recipe registration. Recipes have been moved to `server_scripts/recipe/advance`; see "Recipe Data" below.

## Structure

[`structure/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/advance/A_Recipe_Tick_Machine.js)：

```javascript
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr_kubejs:kubejs_recipe_ticker")

    structure
        .pattern("XXX", "AAA", "XXX")
        .pattern("XXX", "A A", "X X")
        .pattern("XXX", "ACA", "XXX")
        .set('X', api.block('minecraft:green_terracotta'))
        .set('A', api.anyOf(
            api.anyOfItemInput(),
            api.anyOfItemOutput(),
            api.anyOfEnergyInput(),
            api.parallelControllers(), // this is all parallel controller
            api.block('minecraft:green_wool')
        ))
        .controller('C')
        .build()
})
```

## Hooks

### `idleStart`: Entering Idle

```javascript
.idleStart(ctx => {
    // This add two lines to the controller UI
    const screen = ctx.screenText()
    screen.append(
        api.screenScope().OPERATION,
        api.id("mmcr_kubejs:display_when_idle_empty_line"),
        Text.literal(" ")
    )
    screen.append(
        api.screenScope().OPERATION,
        api.id("mmcr_kubejs:display_when_idle"),
        Text.translatable(
            "gui.mmcr_kubejs.display_when_idle",
        )
    )
})
```

Here, `ctx` is [`MachineBehaviorContext`](../API/KubeJS), without "recipe context" methods such as `currentTick()` / `recipe()`. Text is written to the [`api.screenScope().OPERATION`](../API/KubeJS#screenscope-→-screenscopevalues) scope. Key differences between `OPERATION` and `CONTROLLER`:

| scope | Content Source | Reset Timing |
| --- | --- | --- |
| `CONTROLLER` | Controller registered text or behavior writes | Managed by text state / structure / lane cleanup logic |
| `OPERATION` | Operation text written by behavior callbacks | Cleared by cleanup paths such as runtime operation completion or no active operation |

`idleStart` demonstrates idle messages, and `beforeStart` demonstrates removing lines by scope / ID. The runtime also clears operation text, and recipe lanes can use separate text states; these two snippets alone do not guarantee that these lines will appear or switch on the screen.

[`idleEnd`](../API/KubeJS#idleend-consumer-machinebehaviorcontext-callback-→-machinebehaviorbuilderjs) is an empty implementation: the example removes idle lines in `beforeStart`, and the runtime also clears `OPERATION` text according to operation state; do not assume the idle and recipe lane text handles are the same object.

The two idle text lines in the source:

- `display_when_idle_empty_line` → `Text.literal(" ")` (a placeholder line containing one space).
- `display_when_idle` → [`Text.translatable("gui.mmcr_kubejs.display_when_idle")`](https://kubejs.com/wiki/tutorials/text-component) lets the client display the translation in the player's language.

### `beforeStart`: Before Recipe Start

`beforeStart` is the core section, doing three things: clearing the screen, applying effects, and changing requirements.

```javascript
.beforeStart(ctx => {
    // This will clear the lines when it's not idle
    // NOTICE: here ctx is different from idleStart ctx, you should use ctx.machineContext().screenText() to get the text lines
    const screen = ctx.machineContext().screenText()
    screen.remove(
        api.screenScope().OPERATION,
        api.id("mmcr_kubejs:display_when_idle_empty_line")
    )
    screen.remove(
        api.screenScope().OPERATION,
        api.id("mmcr_kubejs:display_when_idle")
    )
    const machineContext = ctx.machineContext()
    const level = machineContext.level()
    const controllerPos = machineContext.controllerPos()
    const minX = controllerPos.getX() - 2
    const minZ = controllerPos.getZ() - 2
    const maxX = controllerPos.getX() + 3
    const maxZ = controllerPos.getZ() + 3
    const area = AABB.of(
        minX,
        level.getMinY(),
        minZ,
        maxX,
        level.getMaxY() + 1,
        maxZ
    )

    level.getEntitiesOfClass(LivingEntity, area).forEach(entity => {
        entity.potionEffects.add(MobEffects.STRENGTH, 10000, 1)
    })

    const nextRequirements = new ArrayList()
    let changed = false
    ctx.requirements().forEach(requirement => {
        if (!(requirement instanceof ItemRequirement)
                || String(requirement.io().getKey()) !== "input") {
            nextRequirements.add(requirement)
            return
        }
        const possibleItems = requirement.item().getStackArray()
        const isExactlyGold = requirement.count() === 32
            && possibleItems.length === 1
            && BuiltInRegistries.ITEM.getKey(possibleItems[0].getItem())
                .toString() === "minecraft:gold_ingot"
        if (isExactlyGold) {
            nextRequirements.add(new ItemRequirement(
                requirement.io(), requirement.item(), 1, requirement.stack(),
                requirement.chance(), requirement.tags(), requirement.components(),
                requirement.consumeChance()
            ))
            changed = true
        } else {
            nextRequirements.add(requirement)
        }
    })
    if (changed) ctx.setRequirements(nextRequirements)
})
```

`RecipeStartContext` provides two key capabilities:

- `ctx.machineContext()`: obtains [`MachineBehaviorContext`](../API/KubeJS), giving access to `level()` / `controllerPos()` / `screenText()`. This is the shared "return the machine context" path for `beforeStart` / `recipeTick` / `beforeFinish`.
- `ctx.requirements()` / `ctx.setRequirements(list)`: reads the copied requirement list, then submits a complete replacement list. The official script retains nonmatching entries, reconstructing only exactly matching gold ingot inputs while preserving their tags, component conditions, and consumption chance.

The core of the code above:

1. **Request idle line cleanup**: removes two scope / ID pairs from the current machine context's text handle; if the lines are not in that handle, removal has no effect.
2. **Apply effects**: applies Strength II for 10000 ticks to all `LivingEntity` within the area.
3. **Modify recipe requirements**: changes all item input requirements whose "only candidate item is a gold ingot, with a count of 32" to 1 gold ingot. This rewrites the recipe declaration rather than checking whether inventory already contains 32 gold ingots; actual input checks happen during subsequent IO planning.

The underlying [`RecipeStartContext.replaceExactItemInputCount(...)`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeStartContext.java) still exists and can serve as a simplified form:

```javascript
const Items = Java.loadClass("net.minecraft.world.item.Items")
const changed = ctx.replaceExactItemInputCount(Items.GOLD_INGOT, 32, 1)
```

It replaces only the **first** matching built-in item input and returns `false` if none matches; it is not fully equivalent to the official manual iteration, which may replace multiple entries. Both count arguments must be positive. It also applies changes through `setRequirements(...)` and cannot bypass that method's restrictions on custom outputs.

`requirements()` uses `MachineRequirement.copyList(...)` to return an unmodifiable list copied according to registered requirement types; after changing the container, you must call `setRequirements(...)`. That method re-derives built-in item / fluid outputs from the requirements; if current outputs contain registered custom output types, it throws `IllegalStateException`, so it cannot be generalized into a reconstruction tool for arbitrary outputs.

### `recipeTick`: Triggered Every Recipe Tick

```javascript
.recipeTick(ctx => {
    // When recipe is running, append some infomation to the machine controller
    // it's too difficult to implement grid layout, which would be complex to accelete the actual pixels with characters
    const screen = ctx.machineContext().screenText()

    screen.appendAfter(
        api.screenScope().OPERATION,
        api.id("mmcr_kubejs:display_when_start_recipe"),
        api.id("mmcr_kubejs:in_line"),
        // Just Text.literal is allowed
        // For this fully custom usage, I even provide sprintf
        Text.literal("正在使用雷霆大猪咪暴力执行配方")
    )
})
```

Key differences between [`RecipeTickContext`](../API/KubeJS#recipetickcontext) and `RecipeStartContext` (explicitly listed in the "Notes" at the end of [`KubeJS.md`](../API/KubeJS#machinebehaviorbuilderjs)):

| Capability | `RecipeStartContext` | `RecipeTickContext` |
| --- | --- | --- |
| `ctx.machineContext()` | ✓ | ✓ |
| `ctx.currentTick()` / `ctx.totalTick()` | ✗ | ✓ |
| `ctx.parallelism()` | ✗ | ✓ |
| `ctx.replaceExactItemInputCount(...)` | ✓ | ✗ |
| `ctx.setRequirements(...)` / `setOutputs(...)` | ✓ | ✗ (read-only copies) |
| `ctx.cancel()` | ✓ | ✗ |

The underlying `RecipeTickContext` is a record whose requirement / output containers consist of copied lists, with no `setRequirements` / `setOutputs` / `cancel`. Change requirements in `beforeStart` and completion outputs in `beforeFinish`; it also provides read accessors such as `recipe()` and `capabilitySnapshot()`. It triggers before the recipe's per-tick input plan, so callback execution does not mean inputs such as FE necessarily commit successfully in that tick.

The underlying `ControllerScreenText.appendAfter(...)` requires an anchor in the same scope. The script intends to display information after `in_line`, but uses `OPERATION` here while the static line uses `CONTROLLER`; lookup does not cross scopes. See "Static Screen Text" below for details.

### `beforeFinish`: Hook Before Recipe Outputs Are Committed

```javascript
.beforeFinish(ctx => {
    // before finish and output the recipe
    // you can also change the result if you want
    // here we just add one potion effect
    const machineContext = ctx.machineContext()
    const level = machineContext.level()
    const controllerPos = machineContext.controllerPos()
    const minX = controllerPos.getX() - 2
    const minZ = controllerPos.getZ() - 2
    const maxX = controllerPos.getX() + 3
    const maxZ = controllerPos.getZ() + 3
    const area = AABB.of(
        minX,
        level.getMinY(),
        minZ,
        maxX,
        level.getMaxY() + 1,
        maxZ
    )

    level.getEntitiesOfClass(LivingEntity, area).forEach(entity => {
        entity.potionEffects.add(MobEffects.NIGHT_VISION, 10000, 1)
    })
})
```

[`RecipeFinishContext`](../API/KubeJS#recipefinishcontext) provides `ctx.machineContext()` / `ctx.setOutputs(...)` / `ctx.discardOutputs()` / `ctx.cancel()`; `discardOutputs` takes no arguments.

## Static Screen Text

```javascript
// Register Controller UI lines
// You are allowed to use an event registry to add your custom lines to controller UI
// MMCR will automatically organize them and display
event.registerControllerScreenText("mmcr_kubejs:kubejs_recipe_ticker", text => {
    text.appendTranslatable(
        "controller", // means it's a static text line
        "mmcr_kubejs:before_line",
        "gui.mmcr_kubejs.before_line"
    )

    text.appendAfterTranslatable(
        "controller",
        "mmcr_kubejs:in_line",       // the new line id
        "mmcr_kubejs:sp_line_1",     // then you can set it must be after which line
        "gui.mmcr_kubejs.in_line"
    )

    text.appendTranslatable(
        "controller",
        "mmcr_kubejs:after_line",
        "gui.mmcr_kubejs.after_line"
    )
})
```

[`event.registerControllerScreenText(...)`](../API/KubeJS#registercontrollerscreentext-string-machineid-consumer-controllerscreentexteventjs-handler-→-void) registers 3 static text lines:

- [`appendTranslatable("controller", "mmcr_kubejs:before_line", "gui.mmcr_kubejs.before_line")`](../API/KubeJS#appendtranslatable-string-scope-string-lineid-string-key-object-args-→-void) — The `before_line` line.
- [`appendAfterTranslatable("controller", "mmcr_kubejs:in_line", "mmcr_kubejs:sp_line_1", "gui.mmcr_kubejs.in_line")`](../API/KubeJS#appendaftertranslatable-string-scope-string-lineid-string-afterlineid-string-key-object-args-→-void) — Inserts `in_line` after `sp_line_1` only if it already exists in `CONTROLLER`; this script does not create the anchor.
- [`appendTranslatable("controller", "mmcr_kubejs:after_line", "gui.mmcr_kubejs.after_line")`](../API/KubeJS#appendtranslatable-string-scope-string-lineid-string-key-object-args-→-void) — The `after_line` line.

`appendAfter` expresses an intent to order lines relative to one another and does not append if the anchor is absent. `sp_line_1` is an ID specified by the example; this does not guarantee that it always exists or that the complete screen always follows a fixed sequence.

The server-side controller applies the registration callback, then refreshes `replace` requests and synchronizes text state; the client does not directly execute the KubeJS callback every tick.

The underlying `appendAfter` appends only if `afterLineId` already exists in the same scope. Here, static `in_line` belongs to `CONTROLLER`, while `recipeTick` writes to `OPERATION` with `in_line` as the anchor; the static line alone cannot satisfy that lookup, so the example text is not guaranteed to appear. For reliable display, use `screen.append(OPERATION, id, text)` instead, or create an anchor in `OPERATION` first. Static `sp_line_1` is also not a line registered by this script.

## Special Mechanisms

### Context Hierarchy of the 5 Hooks

The 5 hooks of `MachineBehaviorBuilderJS` **receive different context types**, leading to different paths for "returning the machine context":

| Hook | Context Type | How to Access `screenText()` |
| --- | --- | --- |
| `idleStart` | `MachineBehaviorContext` | `ctx.screenText()` (direct) |
| `idleEnd` | `MachineBehaviorContext` | `ctx.screenText()` (direct) |
| `beforeStart` | `RecipeStartContext` | `ctx.machineContext().screenText()` (indirect) |
| `recipeTick` | `RecipeTickContext` | `ctx.machineContext().screenText()` (indirect) |
| `beforeFinish` | `RecipeFinishContext` | `ctx.machineContext().screenText()` (indirect) |

From the "Notes" at the end of [`MachineBehaviorBuilderJS`](../API/KubeJS#machinebehaviorbuilderjs):

> In recipe callbacks, `ctx.machineContext()` returns `MachineBehaviorContext`, giving access to runtime state such as `dataStorage`, `screenText`, `jadeText`, `level`, and `controllerPos()`.

The source uses `ctx.screenText()` in `idleStart` and `ctx.machineContext().screenText()` in `beforeStart` because their context methods differ. Reversing them calls a nonexistent method and should not be described as the behavior builder invariably throwing `IllegalStateException`. Runtime calls return the underlying `ControllerScreenText`; only startup registration callbacks use `ControllerScreenTextEventJS`.

### Immutable Copy Semantics of `ctx.requirements()`

The official script takes the manual `ctx.requirements()` + `ctx.setRequirements(...)` route; the convenience method changes only the first match and is an additional option. Both use underlying contexts:

`ctx.requirements()` returns an **immutable copy** that can only be read, not modified with `add()` / `remove()`. To change requirements, construct an `ArrayList`, put the requirements you want to retain / replace into it, then submit it with `ctx.setRequirements(list)`:

```javascript
const nextRequirements = new ArrayList()
// ... 修改 nextRequirements ...
if (changed) ctx.setRequirements(nextRequirements)
```

There is no need to call `setRequirements` when nothing changes. Passing an empty list removes all requirements rather than "leaving them unchanged"; it also re-derives outputs.

### Recipe Data + Runtime Adjustments

Requirement rewriting in `beforeStart` is this tutorial's most important capability: **recipe data + runtime adjustments, kept separate**.

- Recipe data remains stable, facilitating JEI display and datapack distribution.
- `beforeStart` adjusts it according to current world state (player count, inventory, variables).
- Actual recipe execution uses the adjusted requirements for IO.

### Respect Constructor Constraints When Modifying Requirements

When reconstructing requirements, follow the underlying `ItemRequirement` constructor constraints and preserve the original entry's component conditions, tags, output chance, and consumption chance. The convenience method explicitly requires `expectedCount >= 1` and `replacementCount >= 1`; replacing 32 gold ingots with 0 throws `IllegalArgumentException`, so it cannot express a material-free recipe.

### Mutable Outputs and Side-Effect Boundaries

The underlying `RecipeStartContext.outputs()` returns its current output list, while `RecipeFinishContext.outputs()` returns the internal mutable `ArrayList`; the `publicapi` read-only view description does not apply. For tutorials, explicit replacement through `setOutputs(List<MachineOutput>)` is recommended: the start stage synchronizes output entries in the requirements, while the finish stage copies and validates that built-in outputs are nonempty. Start also has `duration()` / `setDuration(int)`, and both start / finish have `requestedParallelism()` / `effectiveParallelism()`.

The Strength effect in `beforeStart` and Night Vision effect in `beforeFinish` are world side effects. Subsequent planning / commit failure or calling `cancel()` does not automatically undo these effects; lifecycle hooks are not atomic transactions wrapping all script operations.

## Recipe Data

Three recipes are registered in `ServerEvents.recipes` in [`server_scripts/recipe/advance/A_Recipe_Tick_Machine.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/advance/A_Recipe_Tick_Machine.js):

| Duration in Ticks | Item Input | Item Output | FE per Tick |
| --- | --- | --- | --- |
| 500 | 10000 coal + 8 diamonds | 9 gold ingots | 20 |
| 300 | 114514 diamonds + 8 iron ingots | 18 coal | 20 |
| 300 | 32 gold ingots + 8 sticks | 3 diamonds | 20 |

The third recipe lets you observe `beforeStart` changing 32 gold ingots to 1. The original recipe data retains 32; this execution context does not modify JEI or the datapack declaration.

```javascript
ServerEvents.recipes(event => {
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'mmcr_kubejs:kubejs_recipe_ticker',
        tick_time: 300,
        requirements: [
            { type: 'minecraft:item', io: 'input', item: 'minecraft:gold_ingot', count: 32 },
            { type: 'minecraft:item', io: 'input', item: 'minecraft:stick', count: 8 },
            { type: 'minecraft:item', io: 'output', stack: { id: 'minecraft:diamond', count: 3 } },
            { type: 'neoforge:energy', io: 'input', fe_per_tick: 20 }
        ]
    })
})
```

### Capability Differences Between the 5 Hooks (Overview)

| Capability | `idleStart` / `idleEnd` | `beforeStart` | `recipeTick` | `beforeFinish` |
| --- | --- | --- | --- | --- |
| Context received | `MachineBehaviorContext` | `RecipeStartContext` | `RecipeTickContext` | `RecipeFinishContext` |
| Write static text in the `controller` scope | ✓ | ✓ | ✓ | ✓ |
| Write text in the `OPERATION` scope | ✓ | ✓ | ✓ | ✓ |
| Change requirements | ✗ | ✓ (`replaceExactItemInputCount(...)` / `setRequirements(...)`) | ✗ | ✗ (outputs only) |
| Change outputs | ✗ | ✓ (`setOutputs(...)`) | ✗ | ✓ (`setOutputs(...)` / `discardOutputs()`) |
| `currentTick()` / `totalTick()` | ✗ | ✗ | ✓ | ✗ |
| `cancel()` | ✗ | ✓ | ✗ | ✓ |
| `potionEffects.add(...)` / side effects | ✓ | ✓ | ✓ | ✓ |

## RECIPE_TICK vs PURE_TICK

| Scenario | Recommendation | Reason |
| --- | --- | --- |
| Generators, reactors, production lines (continuous passive effects) | `tickBehavior` | No clear "input → output" mapping; only per-tick advancement is needed |
| Searching for entities in an area, applying effects, calling other game mechanics | `tickBehavior` | These side effects cannot be expressed as recipes and must be called directly during ticks |
| Modifying requirements / outputs (adding or removing conditions, adjusting by player distance) | `recipeBehavior.beforeStart` / `beforeFinish` | These two hooks provide `setRequirements(...)` / `setOutputs(...)` |
| Recipes exist, but the specific actions each tick are fully customized | `recipeBehavior.recipeTick` | The recipe lifecycle is already managed, and current tick / total ticks are available |
| "Unconditional per-tick side effects" for recipe machines (whether or not a recipe is running: screen, `dataStorage`, network probing) | `MachineBuilderJS.preServerTick` / `MachineBuilderJS.postServerTick` | `recipeTick` only triggers while a recipe is running; put global logic that must "run every tick even before a recipe starts" in these two `MachineBuilderJS` hooks |
| Custom timing for complex crafting (multiple stages, shared requirement modifications across recipes) | `recipeBehavior` | Recipe data is still needed to define "what to do," but each stage needs custom callbacks |

This machine is a complete sample "using all 5 `recipeBehavior` hooks," which can be read alongside the recipe-free approach of the [Pure Tick Test Machine](../JavaAPI/pure-tick-test-machine).

## Further Reading

- [Pure Tick Machine Example](./pure-tick-machine-example) — The comparison example, using recipe-free `tickBehavior`.
- [Data Storage Test Machine](./data-store-test-machine) — The simplest `DataStorage` sample.
- [Compute-Network Interaction Example](./compute-network-example) — `tickBehavior` + network communication.
- [Recipe Tick Test Machine](../JavaAPI/recipe-tick-test-machine) — Java implementation of this machine.
- [Blast Furnace](../JavaAPI/blast-furnace) — Standard recipe machine (empty hooks).
- [Pure Tick Test Machine](../JavaAPI/pure-tick-test-machine) — Complete Java demonstration of `tickBehavior`.
- [KubeJS API](../API/KubeJS) — Central reference for the APIs cited in this tutorial.
- [KubeJS API#MachineBehaviorBuilderJS](../API/KubeJS#machinebehaviorbuilderjs) — Signatures and trigger timing of the 5 hooks.
- [KubeJS API#recipeBehavior](../API/KubeJS#recipebehavior-consumer-machinebehaviorbuilderjs-builder-→-machinebuilderjs) — `recipeBehavior` entry point.
- [KubeJS API#ControllerScreenTextEventJS](../API/KubeJS#controllerscreentexteventjs) — All screen text registration methods.
- [KubeJS API#preServerTick](../API/KubeJS#preservertick-consumer-machinebehaviorcontext-callback-→-machinebuilderjs) / [postServerTick](../API/KubeJS#postservertick-consumer-machinebehaviorcontext-callback-→-machinebuilderjs) — "Global per-tick injection" for recipe machines.
- [Underlying RecipeStartContext](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/api/machine/definition/RecipeStartContext.java) — The `beforeStart` context and implementation of `replaceExactItemInputCount(...)`.

## APIs Not Covered in KubeJS.md

This tutorial uses Java classes not listed separately on the KubeJS side:

- **`net.minecraft.world.entity.LivingEntity`** — Vanilla Minecraft's "living entity" base class; obtained through `Java.loadClass` in KubeJS and used as the filter type for `level.getEntitiesOfClass(LivingEntity, area)`.
- **`net.minecraft.world.effect.MobEffects`** — Vanilla potion effect constants (`STRENGTH` / `NIGHT_VISION`), obtained through `Java.loadClass`.
- **`net.minecraft.world.phys.AABB`** — KubeJS provides the `AABB.of(...)` factory, but AABB's internal fields and methods have no separate entry in [KubeJS.md](../API/KubeJS).
- **`net.minecraft.world.item.Items`** — Vanilla item constants (`GOLD_INGOT`) used in the supplementary convenience form; the official script's manual form uses `BuiltInRegistries` to compare registry IDs.
