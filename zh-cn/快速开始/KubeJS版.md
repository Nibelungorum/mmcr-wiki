---
title: KubeJS版
order: 3
---

<div align=center>
	<img width = "1920" height = "1080" src="/kubejs/14.png"/>
</div>

## 一些准备

在本教程开始前，我假设你已有能力编写简单的 KubeJS 脚本。

本教程以 Minecraft **26.1.2**、Java **25**、NeoForge **26.1.2.84**、KubeJS **26.1.2-8.0.6** 和 MMCR 源码提交 [`f234477b`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/gradle.properties) 为基准。文中图片用于说明操作过程，当前 API 和代码以文字示例及文末固定提交的源码链接为准。

安装 Minecraft 26.1.2 对应的 MMCR、KubeJS 及其必需依赖，并启动一次游戏，确保游戏实例目录（例如 `.minecraft`）下生成了 `kubejs` 文件夹：

![](/kubejs/1.png)

接下来，你可以使用任何文本编辑器，使用任何你喜欢的形式编写KubeJS代码。

本教程会依次完成机器定义、结构、接口、配方。目录职责如下：

| 目录 | 本教程放置的内容 | 修改后如何生效 |
| --- | --- | --- |
| `kubejs/startup_scripts/` | `MMCREvents.startup` 机器定义、配方池绑定，生成控制器 | 重启游戏；专用服务端也需重启 |
| `kubejs/server_scripts/` | `MMCREvents.server` 结构，以及 `ServerEvents.recipes` 数据配方 | 进入世界后加载，可用 `/reload` 重载 |
| `kubejs/client_scripts/` | 客户端展示脚本，例如 JEI 配方说明 | 不用于本教程的机器、结构或配方注册 |
| `kubejs/assets/<命名空间>/lang/` | 翻译等客户端资源 | 重载客户端资源，例如 `F3+T` |

在单人游戏中，`server_scripts` 仍然属于逻辑服务端脚本。子目录 `structure/`、`recipe/` 只是便于整理，不改变脚本阶段。

## startup 阶段 - 注册机器定义

本阶段的代码全部在`startup_scripts`目录下。

首先创建 `kubejs/startup_scripts/my_first_machine.js`（文件名可以自行修改）。

之后，我们假设你的机器名称定为`my_first_machine`，你的命名空间定位`my_mod`。

随后，在该脚本的顶级定义域中编写以下内容:

```js
MMCREvents.startup(event => {
    event
        .createMachine("my_mod:my_first_machine")
        .recipePool("my_mod:my_first_machine")
        .displayNameKey("machine.my_mod.my_first_machine")
        .register()
})
```

这是一个最简单的机器注册示例，更多的API使用可以跳转到左侧栏的`全部示例`中查看，完整的API列表可以到左侧栏的`API 参考`。

简单解释一下出现的字段和函数:

- `MMCREvents`: 这是 MMCR 定义的 KubeJS 事件。
- `MMCREvents.startup`: 这是 MMCR 定义的 KubeJS 事件阶段。
- `event.createMachine`: 以 `命名空间:注册名` 创建机器构建器，返回 `cn.howxu.mmcr.compat.kubejs.MachineBuilderJS`，供 JS 链式配置。它不是 Java 公共 API 的 `MachineDraft`，也不是底层 `MachineBuilder`。
- `builder.recipePool`: 声明机器使用的配方池。本例让池 ID 与机器 ID 相同，便于入门；它们是两个独立概念，多个机器可以绑定同一配方池。
- `builder.displayNameKey`: 设置该结构的本地化键名。对于i18n的设置是相当宽松的，我建议使用`machine.命名空间ID.机器注册名称`，当然你也可以直接使用任何i18n可译名称。
- `builder.register`: 提交机器定义，返回当前 `MachineBuilderJS`。MMCR 会生成控制器；此时尚未绑定结构或添加配方。

这是最简单的机器注册示例。如果只想快速搭建一台机械、不需要国际化键名和其它任何东西，可以把它简化为：

```js
MMCREvents.startup(event => {
    event
        .createMachine("my_mod:my_first_machine")
        .register()
})
```

省略 `.recipePool(...)` 时默认使用与机器 ID 同名的池。后文仍采用显式声明版本，方便看清机器与配方池的关系。两段 startup 示例是替代写法，**只保留一段**，不要重复注册同一个 ID。修改 startup 脚本后必须重启，`/reload` 不会新增或修改控制器注册。

## server阶段 - 绑定机器结构

本阶段的代码全部在`server_scripts`目录下。

沿用上一章节导出的**机器结构**和上一阶段使用的**机器注册名**`"my_mod:my_first_machine"`。

如果上一章节导出了结构，可以直接把导出文件移到 `server_scripts/structure/` 目录下，它的命名一定为"导出时间+js后缀"。

接下来在你的编辑器中打开它。为了使教程更容易理解，我这里换了一个更小和更简单的结构，专门用来进行解释:

```js
.pattern(['XXX', 'XHX', 'XXX'])
.pattern(['XHX', 'HCH', 'XHX'])
.pattern(['XXX', 'XHX', 'XXX'])
.set('X', api.block('minecraft:purpur_pillar'))
.set('H', api.block('minecraft:purpur_pillar'))
.controller('C')
```

`.pattern(...)` 与 `.set(...)` 都返回当前 `MachineStructureBuilderJS`，可以继续链式调用。每次 `.pattern([...])` 添加一个二维切片；先声明所有切片，再绑定出现的字符。

导出工具自动生成了整个完整的JS事件，因此，我们只需要修改结构对应的机器id就可以了(是的，就改这么一行):
```js
    event.createStructure("my_mod:my_first_machine")
```

改完之后就是这个样子:

![](/kubejs/6.png)

- `MMCREvents.server`：在服务端资源加载/重载时收集结构声明。
- `event.getAPI()`：返回 `KubeJSApi`，提供方块条件、接口族条件等帮助方法。
- `event.createStructure(String)`：返回 `MachineStructureBuilderJS`，参数是 **startup 已注册的机器 ID**，不是配方池 ID。
- `.pattern([...])`：追加二维切片。每层行数、每行宽度应一致；本例中 `X` 为固定外壳，`H` 为下一步的接口预留位。空格表示不校验该位置，要校验空气请绑定 `api.air()`。
- `.set(字符, 条件)`：给模式中已出现的单个字符绑定匹配条件；`api.block(...)` 匹配指定方块。
- `.controller('C')`：绑定目标机器的控制器，不需要手写控制器方块 ID。
- `.build()`：完成并提交结构声明。本教程使用顶层 `.pattern/.set` 写法，不与阶段回调写法混用。

以下是开始时导出建筑的示例代码，同样只需要修改一行id就可以直接使用:

![](/kubejs/7.png)

注意：**不要**让 `.set('C', xxxx)` 和 `.controller('C')` 同时存在。

随后，你可以在启动游戏之前先在`kubejs`目录的`assets`的任意命名空间内新建一个i18n翻译键文件，然后为你的机械创建一些翻译键。

当前生成的控制器实际注册在 MMCR 的命名空间中，本例的方块/物品 ID 为 `mmcr:my_first_machine_controller`。对应键为 `item.mmcr.my_first_machine_controller` 和 `block.mmcr.my_first_machine_controller`；机器与配方池的翻译键则使用 `my_mod`。

(位于.minecraft/kubejs/assets/kubejs/lang/zh_cn.json):
```json
{
    "machine.my_mod.my_first_machine": "我的第一台MMCR机械",
    "recipe_pool.my_mod.my_first_machine": "我的第一台MMCR机械",
    "item.mmcr.my_first_machine_controller": "我的第一台MMCR机械 控制器",
    "block.mmcr.my_first_machine_controller": "我的第一台MMCR机械 控制器"
}
```

随后启动游戏，就可以在 MMCR 的创造物品栏中看到你的控制器方块了:

![](/kubejs/8.png)

如果你安装了 JEI , 可以直接预览结构是否创建成功:

![](/kubejs/9.png)

使用 `/mmcr build my_mod:my_first_machine` 可以直接快速修建机器：

![](/kubejs/10.png)

![](/kubejs/11.png)

## server阶段 - 设置可替换接口

在创建配方之前，你需要先让你的结构拥有`接口`，否则即使创建了配方也无法向多方块机器输入材料和能量。

这一阶段只修改 `server_scripts` 的结构条件，可以用 `/reload` 生效，无需重启。若同时修改了 startup 的机器定义，仍需重启。

打开之前**注册结构**的 JS 脚本，寻找一个合适的预留位置，本例选择紫珀柱绑定的 `H`：

```js
.set('H', api.block('minecraft:purpur_pillar'))
```

把它修改为:

```js
.set('H', api.anyOf(
    api.block('minecraft:purpur_pillar'),
    api.anyOfItemInput(),
    api.anyOfItemOutput(),
    api.anyOfEnergyInput()
))
```

`api.anyOf(...)` 表示任意一个条件满足即可；三个 `anyOf...` 方法分别匹配内置物品输入、物品输出和能量输入接口族。保留紫珀柱条件后，不需要接口的位置仍可填紫珀柱。至少将三个 `H` 位置换成物品输入、物品输出和能量输入接口，才能运行后面的配方。

注意括号和缩进。随后在游戏中输入 `/reload` 命令重载服务端脚本，确认日志无错误后，对应位置的方块就可以换成接口了：

![](/kubejs/12.png)


## server阶段 - 创建配方

在`开始`章节有提到， MMCR 的配方是数据驱动的，因此，我们既可以通过原版的数据包添加配方，也可以通过KubeJS提供的`ServerEvents.recipes`创建配方。

新建 `kubejs/server_scripts/recipe/my_first_machine.js`，在顶级作用域写入以下内容：

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

如果你有使用KubeJS的经验，不难看出，这就是符合原版策略的有一点点特殊的数据格式。其中各字段为:

- `type`: 必须为'mmcr:machine_recipe'。
- `recipe_pool`：**配方池 ID**，不是 `machine` 字段。本例为 `my_mod:my_first_machine`，与 startup 中 `.recipePool(...)` 的绑定一致；它不必与 `createMachine(...)` 的机器 ID 同名。MMCR 让绑定此池的机器使用该池的配方。
- `tick_time`：配方运行总耗时，以 tick 为单位，必须大于 0；200 tick 在正常 20 TPS 下为 10 秒。
- `requirements`: MMCR 的配方系统，在此处只是创建简单配方，无需深入了解。你只需要知道它声明了输入和输出。
- `.id(...)`：KubeJS 为这条数据配方设置唯一 ID。本例为 `my_mod:my_first_machine_recipe_1`，它与机器 ID、配方池 ID 都是不同用途的标识。

每条 requirement 的 `type` 决定类型，`io` 决定输入或输出。物品输入使用 `item` 与 `count`；物品输出使用 `stack: { id, count }`；能量输入使用 `fe_per_tick`。不要把物品输出改成输入的 `item` 格式。

随后通过`type`，`io`等`requirement`字段，我们创建了一个耗时10秒，输入为1铁锭，输出为10铁粒，每tick耗能10FE的配方。

运行`/reload`命令，在无ERROR的情况下，你就可以在 JEI 合成表里看到它了:

![](/kubejs/13.png)

为你的多方块机械放上输入输出接口，输入能源与材料，你的第一台 MMCR 多方块结构机械即可投入使用：

![](/kubejs/14.png)

![](/kubejs/15.png)

## 源码与示例对照

本教程沿用以下入门示例的注册流程，仅简化机器能力与结构，并使用 200 tick、10 FE/tick 的铁锭转铁粒配方：

- [startup 机器与配方池绑定示例](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/startup_scripts/A_Simple_Machine.js)。
- [server 结构示例](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/A_Simple_Machine.js)。
- [server 数据配方示例](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/A_Simple_Machine.js)。
- [真实 startup API](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MMCRStartupEventJS.java)、[机器 JS 构建器](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBuilderJS.java)。
- [真实 server API](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MMCRServerEventJS.java)、[结构 JS 构建器](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/MachineStructureBuilderJS.java)、[条件帮助 API](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java)。
