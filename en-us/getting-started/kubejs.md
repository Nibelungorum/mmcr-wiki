---
title: KubeJS Edition
order: 3
---

<div align=center>
	<img width = "1920" height = "1080" src="/kubejs/14.png"/>
</div>

## Preparation

Before starting this tutorial, I assume you can write simple KubeJS scripts.

This tutorial is based on Minecraft **26.1.2**, Java **25**, NeoForge **26.1.2.84**, KubeJS **26.1.2-8.0.6**, and MMCR source commit [`f234477b`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/gradle.properties). Images illustrate the process; the current API and code are defined by the textual examples and source links to the fixed commit at the end.

Install MMCR for Minecraft 26.1.2, KubeJS, and their required dependencies, then launch the game once. Confirm that a `kubejs` folder has been generated in the game instance directory (for example, `.minecraft`):

![](/kubejs/1.png)

Next, use any text editor and write KubeJS code in whatever way you prefer.

This tutorial creates a machine definition, structure, ports, and recipes in order. Directory responsibilities are as follows:

| Directory | Content placed in this tutorial | How changes take effect |
| --- | --- | --- |
| `kubejs/startup_scripts/` | `MMCREvents.startup` machine definitions and recipe-pool bindings; generates controllers | Restart the game; dedicated servers must also restart |
| `kubejs/server_scripts/` | `MMCREvents.server` structures and `ServerEvents.recipes` data recipes | Loads upon entering a world; can be reloaded with `/reload` |
| `kubejs/client_scripts/` | Client-side presentation scripts, such as JEI recipe descriptions | Not used to register machines, structures, or recipes in this tutorial |
| `kubejs/assets/<namespace>/lang/` | Client resources such as translations | Reload client resources, for example with `F3+T` |

In single-player, `server_scripts` still belong to the logical server. The `structure/` and `recipe/` subdirectories are only for organization and do not change the script stage.

## Startup Stage - Register a Machine Definition

All code in this stage is in the `startup_scripts` directory.

First, create `kubejs/startup_scripts/my_first_machine.js` (you may change the filename).

Next, assume that your machine is named `my_first_machine` and your namespace is `my_mod`.

Then write the following at the script's top level:

```js
MMCREvents.startup(event => {
    event
        .createMachine("my_mod:my_first_machine")
        .recipePool("my_mod:my_first_machine")
        .displayNameKey("machine.my_mod.my_first_machine")
        .register()
})
```

This is the simplest machine registration example. For more API usage, jump to `All Examples` in the sidebar; for the complete API list, see `API Reference` in the sidebar.

Here is a brief explanation of the fields and functions used:

- `MMCREvents`: KubeJS events defined by MMCR.
- `MMCREvents.startup`: the KubeJS event stage defined by MMCR.
- `event.createMachine`: creates a machine builder with `namespace:registry_name`, returning `cn.howxu.mmcr.compat.kubejs.MachineBuilderJS` for chained JS configuration. It is neither the Java public API's `MachineDraft` nor the underlying `MachineBuilder`.
- `builder.recipePool`: declares the recipe pool used by the machine. This example uses the same pool ID and machine ID for simplicity; they are separate concepts, and multiple machines can bind the same recipe pool.
- `builder.displayNameKey`: sets the structure's localization key. i18n configuration is quite flexible; I recommend `machine.namespace_ID.machine_registry_name`, but you may use any translatable i18n name.
- `builder.register`: submits the machine definition and returns the current `MachineBuilderJS`. MMCR generates the controller; no structure or recipe is bound yet.

This is the simplest machine registration example. If you only want to build a machine quickly and do not need localization keys or anything else, it can be simplified to:

```js
MMCREvents.startup(event => {
    event
        .createMachine("my_mod:my_first_machine")
        .register()
})
```

When `.recipePool(...)` is omitted, a pool with the same ID as the machine is used by default. The explicit version is retained below to make the relationship between machines and recipe pools clear. The two startup examples are alternatives: **keep only one** and do not register the same ID twice. Changes to startup scripts require a restart; `/reload` will not add or modify controller registrations.

## Server Stage - Bind the Machine Structure

All code in this stage is in the `server_scripts` directory.

Continue with the **machine structure** exported in the previous section and the **machine registry name** from the previous stage, `"my_mod:my_first_machine"`.

If you exported a structure in the previous section, move the exported file directly to `server_scripts/structure/`. Its name is always "export time + js extension".

![alt text](/kubejs/16.png)

![alt text](/kubejs/17.png)

![alt text](/kubejs/18.png)

Next, open it in your editor. The export tool automatically generated the complete JS script, so you only need to change the structure's machine ID (yes, just this one line):

```js
    // 这是原本的
    const structure = event.createStructure("mmcr_kubejs:exported_structure")
    // 换成下面这一行
    const structure = event.createStructure("my_mod:my_first_machine")
```

After changing it, it looks like this:

![](/kubejs/6.png)

Details follow:

- `MMCREvents.server`: collects structure declarations when server resources load or reload.
- `event.getAPI()`: returns `KubeJSApi`, which provides helper methods for block conditions, port-family conditions, and more.
- `event.createStructure(String)`: returns `MachineStructureBuilderJS`; its argument is the **machine ID registered at startup**, not a recipe-pool ID.
- `.pattern([...])`: appends a two-dimensional slice. Each layer must have the same number of rows, and every row the same width. In this example, `X` is the fixed casing and `H` is a reserved port position for the next step. A space means the position is not checked; bind `api.air()` to check for air.
- `.set(character, condition)`: binds a matching condition to one character already used in the pattern; `api.block(...)` matches a specified block.
- `.controller('C')`: binds the target machine's controller; you do not need to write its block ID yourself.
- `.build()`: completes and submits the structure declaration. This tutorial uses top-level `.pattern/.set` syntax and does not mix it with stage callback syntax.

Note: **do not** have both `.set('C', xxxx)` and `.controller('C')`.

Before starting the game, create an i18n translation-key file in any namespace under the `assets` directory of `kubejs`, then create translation keys for your machine.

The generated controller is actually registered in MMCR's namespace. The block/item ID in this example is `mmcr:my_first_machine_controller`. Its keys are `item.mmcr.my_first_machine_controller` and `block.mmcr.my_first_machine_controller`; machine and recipe-pool translation keys use `my_mod`.

At .minecraft/kubejs/assets/kubejs/lang/zh_cn.json:
```json
{
    "machine.my_mod.my_first_machine": "我的第一台MMCR机械",
    "recipe_pool.my_mod.my_first_machine": "我的第一台MMCR机械",
    "item.mmcr.my_first_machine_controller": "我的第一台MMCR机械 控制器",
    "block.mmcr.my_first_machine_controller": "我的第一台MMCR机械 控制器"
}
```

Start the game and you can see your controller block in MMCR's Creative tab:

![](/kubejs/8.png)

If JEI is installed, you can preview whether the structure was created successfully:

![](/kubejs/9.png)

Use `/mmcr build my_mod:my_first_machine` to build the machine quickly:

![](/kubejs/10.png)

![](/kubejs/11.png)

## Server Stage - Configure Replaceable Ports

Before creating recipes, your structure needs `ports`; otherwise, even if recipes are created, materials and energy cannot enter the multiblock machine.

This stage only changes structure conditions in `server_scripts`, so it can take effect through `/reload` without restarting. If you also change the startup machine definition, a restart is still required.

Open the JS script that **registered the structure**, find an appropriate reserved position, and use the `H` bound to a purpur pillar in this example:

```js
.set('H', api.state('minecraft:purpur_pillar[axis=y]'))
```

Change it to:

```js
.set('H', api.anyOf(
    api.state('minecraft:purpur_pillar[axis=y]'),
    api.anyOfItemInput(),
    api.anyOfItemOutput(),
    api.anyOfEnergyInput()
))
```

`api.anyOf(...)` means any one condition may match. The three `anyOf...` methods respectively match the built-in item input, item output, and energy input port families. After retaining the purpur pillar condition, unused positions can still contain purpur pillars. Replace at least three `H` positions with item input, item output, and energy input ports to run the recipe below.

Pay attention to parentheses and indentation. Then enter `/reload` in-game to reload server scripts. After confirming there are no errors in the log, blocks at the corresponding positions can be replaced with ports:

![](/kubejs/12.png)


## Server Stage - Create Recipes

As mentioned in the `Getting Started` section, MMCR recipes are data-driven. Therefore, you can add recipes through either vanilla data packs or KubeJS's `ServerEvents.recipes`.

Create `kubejs/server_scripts/recipe/my_first_machine.js` and write the following at the top level:

```js
ServerEvents.recipes(event => {
    event.custom({
        type: 'mmcr:machine_recipe',
        recipe_pool: 'my_mod:my_first_machine',
        tick_time: 200,
        requirements: [
            {
                type: 'minecraft:item',
                io: 'input',
                item: 'minecraft:iron_ingot',
                count: 1
            },
            {
                type: 'minecraft:item',
                io: 'output',
                stack: {
                    id: 'minecraft:iron_nugget',
                    count: 10
                }
            },
            {
                type: 'neoforge:energy',
                io: 'input',
                fe_per_tick: 10
            }
        ]
    }).id('my_mod:my_first_machine_recipe_1')
})
```

If you have KubeJS experience, it should be easy to see that this is a slightly specialized data format following vanilla conventions. Its fields are:

- `type`: must be `'mmcr:machine_recipe'`.
- `recipe_pool`: the **recipe pool ID**, not a `machine` field. This example uses `my_mod:my_first_machine`, matching the `.recipePool(...)` binding at startup; it does not have to share a name with the machine ID in `createMachine(...)`. MMCR makes machines bound to this pool use its recipes.
- `tick_time`: total recipe duration in ticks; it must be greater than 0. At a normal 20 TPS, 200 ticks is 10 seconds.
- `requirements`: MMCR's recipe system. Only simple recipes are created here, so no deeper understanding is needed; you only need to know that it declares inputs and outputs.
- `.id(...)`: assigns a unique ID to this data recipe through KubeJS. This example uses `my_mod:my_first_machine_recipe_1`; it serves a different purpose from both the machine ID and recipe-pool ID.

Each requirement's `type` determines its type, while `io` determines input or output. Item input uses `item` and `count`; item output uses `stack: { id, count }`; energy input uses `fe_per_tick`. Do not change an item output to the input `item` format.

Using `type`, `io`, and other `requirement` fields, we have created a recipe that takes 10 seconds, consumes 1 iron ingot, produces 10 iron nuggets, and uses 10 FE each tick.

Run `/reload`. With no ERROR, it appears in JEI's recipe display:

![](/kubejs/13.png)

Place input and output ports on your multiblock machine, supply energy and materials, and your first MMCR multiblock machine is ready to use:

![](/kubejs/14.png)

![](/kubejs/15.png)

## Source and Example Cross-Reference

This tutorial follows the registration flow of the following introductory example, simplifying its machine capabilities and structure while using a 200-tick, 10-FE/tick iron-ingot-to-iron-nugget recipe:

- [Startup machine and recipe-pool binding example](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/A_Simple_Machine.js).
- [Server structure example](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_Simple_Machine.js).
- [Server data-recipe example](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_Simple_Machine.js).
- [Actual startup API](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MMCRStartupEventJS.java), [machine JS builder](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBuilderJS.java).
- [Actual server API](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MMCRServerEventJS.java), [structure JS builder](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineStructureBuilderJS.java), [condition helper API](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java).
