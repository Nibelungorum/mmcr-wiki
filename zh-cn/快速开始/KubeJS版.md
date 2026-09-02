---
title: KubeJS版
order: 3
---

<div align=center>
	<img width = "1920" height = "1080" src="/kubejs/14.png"/>
</div>

## 一些准备

在本教程开始前，我假设你已有能力编写简单的 KubeJS 脚本。

你需要安装 KubeJS 模组，并启动一次游戏，确保`.minecraft`目录下正确生成了`kubejs`文件夹:

![](/kubejs/1.png)

接下来，你可以使用任何文本编辑器，使用任何你喜欢的形式编写KubeJS代码。

## start up阶段 - 注册机器定义

本阶段的代码全部在`startup_scripts`目录下。

首先，按照你的喜好创建一个KubeJS脚本文件，以任何你喜欢的命名。

之后，我们假设你的机器名称定为`my_first_machine`，你的命名空间定位`my_mod`。

随后，在该脚本的顶级定义域中编写以下内容:

```js
MMCREvents.startup(event => {
        event
        .createMachine("my_mod:my_first_machine")
        .displayNameKey("machine.my_mod.my_first_machine")
        .recipeFamily("my_mod:my_first_machine")
        .register()
})
```

这是一个最简单的机器注册示例，更多的API使用可以跳转到左侧栏的`全部示例`中查看，完整的API列表可以到左侧栏的`API 参考`。

简单解释一下出现的字段和函数:

- `MMCREvents`: 这是 MMCR 定义的KubeJS事件。
- `MMCREvents.startup`: 这是 MMCR 定义的KubeJS事件阶段。
- `event.createMachine`: 以`命名空间:注册名`为注册键创建一个多方块机器，其返回一个`MachineBuilder`对象，并可以据此进行链式调用注册。
- `builder.displayNameKey`: 设置该结构的本地化键名。对于i18n的设置是相当宽松的，我建议使用`machine.命名空间ID.机器注册名称`，当然你也可以直接使用任何i18n可译名称。
- `builder.recipeFamily`: 绑定一种配方系列，表示该机器使用该类配方。你可以让多种机器共享一种配方系列，这个阶段不涉及注册，并不会引起运行时问题。
- `builder.register`: 提交注册。

这是最最简单的一个示例，实际上，如果你只是想修个机器出来看看，不需要国际化键名，也不需要配方，可以把它简化为:

```js
MMCREvents.startup(event => {
        event
        .createMachine("my_mod:my_first_machine")
        .register()
})
```

## server阶段 - 绑定机器结构

本阶段的代码全部在`server_scripts`目录下。

首先，按照你的喜好创建一个KubeJS脚本文件，以任何你喜欢的命名。

接下来沿用上一章节导出的**机器结构**和上一阶段使用的**机器注册名**`"my_mod:my_first_machine"`。

这里提供一种非常简便的方法，可以跳过低性能的文本复制粘贴: 直接把导出的结构文件代码移动到`server_scripts`目录下，然后将其后缀由`.txt`修改为`.js`:

![](/kubejs/2.png)

修改其名称后:

![](/kubejs/3.png)

接下来在你的编辑器中打开它。为了使教程更容易理解，我这里换了一个更小和更简单的结构:

![](/kubejs/4.png)

其中`.pattern`返回一个可以链式调用的对象，`.set`也返回一个可以连续调用的对象。无论你修建的结构大小与复杂程度，它们的格式都类似于:

```js
.pattern(xxx)
.pattern(xxx)
.pattern(xxx)
...
.set(xxx)
.set(xxx)
.set(xxx)
```

因此，我们只需要做出一些很小的修改就可以完成结构的注册:

首先，在第一个`.pattern(xxx)`前插入以下内容:

```js
MMCREvents.server(event => {
    const api = event.getAPI()
    event.createStructure("my_mod:my_first_machine")
```

可以看到这是一个不全的js脚本语段，其作用是: **监听 `MMCREvents.server` 事件，创建api对象，向事件注册`my_mod:my_first_machine`这台机器的结构**。通俗地来说，这是一个模版开头，你只需要修改其中出现的机器注册名。

随后，在脚本末尾加入以下内容:

```js
        .build()
})
```

这也是一个不全的js脚本语段，但是和前者放到一起用就是一个完整的js脚本了。

以下是添加模版开头和模版结尾之后的示例代码:

![](/kubejs/5.png)

接下来，把原有的`.set('C',xxxx)`修改为`.controller('C')`，在正常情况下，导出时声明为控制器的方块，所占的一定是字符C，所以无脑改就可以了:

![](/kubejs/6.png)

无论你的导出结果是什么样的，最终的代码一定是类似以下格式:

```js
MMCREvents.server(event => {
    const api = event.getAPI()
    event.createStructure("my_mod:my_first_machine")
.pattern(xxx)
.pattern(xxx)
.pattern(xxx)
...
.set(xxx)
.set(xxx)
.set(xxx)
...
.controller('C')
.build()
})
```

以下是开始时导出建筑的示例代码，你可以发现也是以上的格式:

![](/kubejs/7.png)

注意，**千万不可以**让`.set('C',xxxx)`和`.controller('C')`同时存在。

随后，你可以在启动游戏之前先在`kubejs`目录的`assets`的任意命名空间内新建一个i18n翻译键文件，然后为你的机械创建一些翻译键。其中，控制器方块的物品翻译键和方块翻译键都固定为`item/block.mmcr.xxxxx_controller`的格式。

(位于.minecraft/kubejs/assets/kubejs/lang/zh_cn.json):
```json
{
    "machine.my_mod.my_first_machine": "我的第一台MMCR机械",
    "item.mmcr.my_first_machine_controller": "我的第一台MMCR机械 控制器",
    "block.mmcr.my_first_machine_controller": "我的第一台MMCR机械 控制器"
}
```

随后启动游戏，就可以在 MMCR 的创造物品栏中看到你的控制器方块了:

![](/kubejs/8.png)

如果你安装了 JEI , 可以直接预览结构是否创建成功:

![](/kubejs/9.png)

使用`/mmcr build 机器注册名`可以直接快速修建机器:

![](/kubejs/10.png)

![](/kubejs/11.png)

## server阶段 - 设置可替换接口

在创建配方之前，你需要先让你的结构拥有`接口`，否则即使创建了配方也无法向多方块机器输入材料和能量。

提前声明，因为这个教程使用KubeJS，所以你无需重启游戏。

打开之前**注册结构**的JS脚本，寻找一个合适的方块，在上面的例子中，我选择了紫珀块，也就是:

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

注意括号和缩进，以及`api.block`修改为`api.anyOf`。随后在游戏中输入`reload`命令热重载JS脚本，在提示无ERROR的情况下，对应位置的方块就可以换成接口了:

![](/kubejs/12.png)


## server阶段 - 创建配方

在`开始`章节有提到， MMCR 的配方是数据驱动的，因此，我们既可以通过原版的数据包添加配方，也可以通过KubeJS提供的`ServerEvents.recipes`创建配方。

新建一个脚本文件，在顶级作用域向其中写入以下内容:

```js
ServerEvents.recipes(event => {
    event.custom({
        type: 'mmcr:machine_recipe',
        machine: 'my_mod:my_first_machine',
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
    })
})
```

如果你有使用KubeJS的经验，不难看出，这就是符合原版策略的有一点点特殊的数据格式。其中各字段为:

- `type`: 必须为'mmcr:machine_recipe'。
- `machine`：你的机器注册名（机器 ID）。MMCR 会用它去查找对应的机器定义，必须和 `MMCREvents.startup` 里 `createMachine()` 的字符串保持一致。注意：它跟 `builder.recipeFamily` 设置的 `recipeFamily` 并不是同一个东西，后者为机器自身的一个标签，只在 `MachineRegistration` 里用来给机器分类，并不会用来匹配配方文件。
- `tick_time`: 配方运行总耗时，以tick为单位。
- `requirements`: MMCR 的配方系统，在此处只是创建简单配方，无需深入了解。你只需要知道它声明了输入和输出。

随后通过`type`，`io`等`requirement`字段，我们创建了一个耗时10秒，输入为1铁锭，输出为10铁粒，每tick耗能10FE的配方。

运行`/reload`，在无ERROR的情况下，你就可以在 JEI 合成表里看到它了:

![](/kubejs/13.png)

为你的多方块机械放上输入输出接口，输入能源与材料，你的第一台 MMCR 多方块结构机械就大功告成了:

![](/kubejs/14.png)

![](/kubejs/15.png)