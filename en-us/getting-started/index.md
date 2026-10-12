---
title: Getting Started
order: 1
---
<div align=center>
	<img width = "320" height = "180" src="/mmcr.png"/>
</div>

## Before You Begin

This wiki is based on MMCR for Minecraft **`26.1.2`**. Examples and API references correspond to source commit [`f234477b`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/tree/f234477b). The Java development environment uses **Java 25**; KubeJS examples target **`26.1.2-8.0.6`**. When developing an addon mod, use the public interfaces under `cn.howxu.mmcr.publicapi`; scripts access the KubeJS integration layer through `MMCR` and `MMCREvents`, whose underlying types differ.

## Preparation

Before you begin, you need to understand one fact: recent versions of Minecraft use an approach called `data-driven` design. You can look up its details yourself; its core principle is **to externalize all "changeable things" as data, while source code provides only the mechanism, not specific content**.

This indirectly invalidated MMCE's approach of loading multiblock machines directly from JSON files. Because MMCR uses a strategy where **each machine has an independent controller block**, organizing machines in JSON would require **scanning MMCR-related JSON files and generating blocks from them before Minecraft begins scanning data files**. This involves lifecycle issues and is quite complex.

Another approach considered was to extract a separate JSON scanning strategy that actively scans JSON files in an MMCR-defined directory. This would solve the lifecycle issue, but would require implementing JSON parsing, finding another suitable scan point, organizing structures, serialization, synchronization, and more. The workload could exceed that of investigating the lifecycle issue.

Therefore, MMCR now provides **both a `Java API` and `KubeJS integration`**. The **Java API** is available in all situations and is the most feature-complete API. **KubeJS integration** is aimed at more modpack authors and regular players.

## 1. Choose Your API

- **Java API**: Use MMCR's public API and subscribe to MMCR events, writing Java code to add machines, structures, recipes, custom ticks, custom rendering, and more to the game.
- **KubeJS integration**: MMCR provides complete KubeJS integration. You can use KubeJS scripts to call MMCR functions and events at the appropriate time, adding machines, structures, recipes, custom ticks, and more to the game.

## 2. Which API Should I Use?

Each API has advantages and disadvantages:

For `KubeJS integration`:

- It has a lower barrier to entry; basic KubeJS experience is enough to get started quickly.
- It provides **hot reload** for `structures and recipes`, allowing them to be debugged quickly in-game.

- The KubeJS mod must be installed.
- KubeJS uses a non-standard JavaScript language, meaning most IDEs provide no code completion and debugging code is more difficult.
- MMCR's custom rendering feature is unavailable; it is exclusive to the Java API.
- Custom ticks can use script callbacks, but world operations or underlying Java types require familiarity with the corresponding Minecraft APIs and Rhino type conversions, which is generally more trouble than it is worth.

For the `Java API`:

- It has the most complete API architecture and native support; only MMCR needs to be installed.
- It can be integrated directly into mod development, enabling IDEA code completion and debugging.
- It supports custom rendering and more powerful custom ticks.

- It has a higher barrier to entry and requires some mod development experience.
- Recipes and structures cannot be hot reloaded, so the game must be restarted to see changes.

In fact, you can use KubeJS integration and the Java API together: define machines, custom ticks, and rendering with the Java API, and hot reload structures and recipes with KubeJS.

Completely eliminating the disadvantages of both involves complex synchronization and lifecycle issues and is nearly impossible. The current design is therefore the best compromise among competing concerns.

## 3. Understand the Lifecycle

Next, you need to understand MMCR's lifecycle for external APIs. Machine definitions must be collected before controllers are registered; structures are collected after controllers become available; Java static recipes are collected after item components are bound. These Java registration events are all part of startup. Although they are posted to `NeoForge.EVENT_BUS`, they are not server-runtime events.

The content declaration flow can be summarized as:

> **Mod startup → machine definitions → structures and recipes → commit**

KubeJS uses `startup_scripts` to declare machine definitions, and `server_scripts` to declare reloadable structures and recipes. Startup declarations require a game restart; server declarations can be reloaded through `/reload`.

The two stages that matter here are **machine definitions** and **structures and recipes**. The two most important actions occur in these stages: **registering machine definitions** and **loading structures and recipes**.

It is at these stages that content which **cannot change at runtime** diverges from content which **can change**.

## 4. Content That Cannot Change at Runtime

Put simply, this is content that cannot be removed or changed without restarting the game.

Because every machine has a controller block registered at startup, **machine definitions** cannot be changed through normal `/reload`. Here, definitions mean machine identity, controller, and behavior configuration, not the block layout of a structure; structure layouts declared through KubeJS can be reloaded. The following also cannot be changed:

- Custom ticks: bound to machine definitions during startup.
- Basic machine appearance: involves complex synchronization issues.
- Operating sounds: involve registration.
- Recipe pools: involve registration and synchronization.
- Modifier definitions: involve registration.
- Level definitions: involve registration.

In fact, anything declared or registered by MMCR during KubeJS's `startup` stage cannot be changed.

For the Java API, all content must be recompiled before changes take effect.

## 5. Content That Can Change at Runtime

This is content KubeJS supports hot reloading. Thanks to the data-driven approach in recent Minecraft versions, MMCR only needs sound serialization and synchronization strategies to hot reload structures and recipes. Put simply, anything MMCR declares or registers during KubeJS's `server` stage can change at runtime.

For the Java API, all content must be recompiled before changes take effect.

## 6. Why Understand the Lifecycle?

The lifecycle clarifies what each stage `should do` and `should not do`, encouraging developers to write comprehensible, clear code. It also standardizes registration and loading flows at runtime, avoiding unpredictable **ERROR**s caused by lifecycle confusion. This is part of MMCR's pursuit of modern API design.

In short, it prevents developers from registering a **machine definition** during **structures and recipes**, then having the game crash, the controller block go missing, structures and recipes fail to appear in JEI, and the logs become impossible to understand.

# Create Your First Multiblock Machine

After choosing your API and briefly reviewing the lifecycle, you can proceed to the next section.
