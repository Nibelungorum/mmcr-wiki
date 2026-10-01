---
title: 人造恒星
order: 9
---

# 人造恒星

人造恒星是超大型机器，同时有一个使用 Java 编写的渲染器。本例用 Java `publicapi` 定义机器与渲染器，用 KubeJS 贡献结构和配方，展示按机器 ID 与配方池绑定的混合实现。

巨型结构若直接写进单个 Java 方法，可能碰到字节码方法大小或常量池限制；这不意味着 Java 不能定义大型结构。本例选择脚本存放巨型 pattern，便于导出和维护。

## 概览

- **Java 端**：注册一个机器定义。
- **KubeJS 定义结构**：`example/server_scripts/structure/builtin_java/ArtificialStar.js` 巨型恒星装置外壳。
- **KubeJS 配方**：`example/server_scripts/recipe/builtIn_java/人造恒星.js` 为 Java 机器的配方池添加配方。
- **渲染器**：`ArtificialStarRenderer` 通过 `RegisterControllerRenderersEvent` 挂钩，渲染一个旋转的 OBJ 恒星模型。

## 涉及的文件

| 文件 | 端 | 作用 |
| --- | --- | --- |
| [`builtin/ARTIFICIAL_STAR.java`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/builtin/ARTIFICIAL_STAR.java) | Java 服务端 | 机器定义 |
| [`provider/BuiltInProvider.java`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/provider/BuiltInProvider.java) | Java 启动期 | 通过 `ServiceLoader` 调用 `registerDefinitions(...)` |
| [`client/ArtificialStarRenderer.java`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/org/nibelungorum/client/ArtificialStarRenderer.java) | Java 客户端 | 控制器渲染器 + 独立模型注册 |
| [`example/server_scripts/structure/builtin_java/ArtificialStar.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/structure/builtin_java/ArtificialStar.js) | KubeJS 服务端 | 结构 |
| [`example/server_scripts/recipe/builtIn_java/人造恒星.js`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/example/server_scripts/recipe/builtIn_java/人造恒星.js) | KubeJS 服务端 | 配方池内容 |
| `assets/mmcr_test/models/obj/star.json` / `.obj` / `.mtl` | 客户端资源 | 恒星的 OBJ 模型与材质 |
| `assets/mmcr_test/textures/block/obj/star_layer.png` | 客户端资源 | 恒星贴图 |

## API

| API | 参考 |
| --- | --- |
| `MachineDefinitionProvider` | [公共启动期提供者签名](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/registration/MachineDefinitionProvider.java) |
| `RegisterMachineDefinitionsEvent` | [机器定义注册事件](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/event/RegisterMachineDefinitionsEvent.java) |
| `Machines` / `MachineSpec` | [声明入口](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/Machines.java)，`build()` 得到机器 spec |
| `RegisterControllerRenderersEvent` | [客户端渲染器事件](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/event/RegisterControllerRenderersEvent.java) |
| `ControllerRenderer` | [render 与默认方法](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderer.java) |
| `ControllerRenderContext` | [只读发布状态](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderContext.java) |

KubeJS：

| 用到的 API | API 参考 |
| --- | --- |
| `MMCREvents.server` | [链接](../API/KubeJS#mmcrevents) |
| `MMCRServerEventJS.createStructure` | [链接](../API/KubeJS#mmcrservereventjs) |
| `MachineStructureBuilderJS` | [链接](../API/KubeJS#machinestructurebuilderjs) |
| `KubeJSApi.block` / `state` | [链接](../API/KubeJS#kubejsapi) |

## 机器定义

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

## 结构

**Java 端只贡献机器定义与同名配方池**，结构由 KubeJS 文件 `example/server_scripts/structure/builtin_java/ArtificialStar.js` 贡献。下面是省略巨型 pattern 和多数字符绑定的节选，不是完整可搭建结构；完整布局以固定提交的脚本为准。

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

### 生命周期

`event.createStructure("mmcr:artificial_star")` 传入的 ID 是 Java 端 `id("artificial_star")` 注册的那个。当前 `createStructure(String id)` 创建结构 builder，并不要求机器由 KubeJS 定义；后面的 `controller('C')` 会通过该 ID 查找对应控制器方块，因此机器定义必须在启动期已注册。各自的阶段如下，客户端注册与服务端 reload 不应理解为同一线程上的连续执行：

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

这些代码形态指向同一个机器 ID。结构 reload 的校验与提交由 KubeJS 联动核心管理；应保证 `createStructure` 的 ID 与 Java 定义一致，不要把它改成其他示例的 `mmcr_kubejs:*` ID。

### 字符绑定

KubeJS 侧的 `set(...)` 接受方块 ID 字符串、`Block`、`BlockState` 或内部谓词。这份脚本用了 `api.block(...)` 与 `api.state(...)` 两种：

```javascript
.set('X', api.block('minecraft:magma_block'))
.set('J', api.state('minecraft:stone_button[face=floor,facing=south,powered=false]'))
```

语义与 Java 公共层 `BlockConditions.block(...)` / `state(...)` 对应。KubeJS 的 `event.getAPI()` 返回脚本联动 API，不需要将这些脚本调用改写成 Java `publicapi` 调用。

字符表用满了 `0-9`、`A-Z`、`a-z`（去掉未用到的几个），还溢出到中文字符 `一` 与 `七`：

```javascript
.set('一', api.state('minecraft:iron_trapdoor[facing=south,half=top,open=false,powered=false,waterlogged=false]'))
.set('七', api.state('minecraft:stone_button[face=floor,facing=north,powered=false]'))
```

:::warning
当前 `set(String symbol, Object value)` 要求 `symbol.length() == 1` 且不是空格，再取 `charAt(0)`；标记还必须已出现在 pattern 中。这是单个 UTF-16 `char` 的约束，不是任意 UTF-8 字符串。脚本中的 `一` 与 `七` 满足约束，常见需代理对表示的 emoji 则不满足。导出结构时保留工具给出的标记与绑定即可。
:::

### 配方池绑定

当前配方脚本也必须与 Java 定义一起使用：

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

这是数据配方形式，使用当前 `recipe_pool`、`tick_time` 与 `requirements` 字段。机器的 `.recipePool(ARTIFICIAL_STAR)` 与这里的 `mmcr:artificial_star` 对应。苹果是数量 1、消耗概率 0 的输入条件，配方时长 300 tick，运行时输出 200 FE/t。结构的 `w` 允许物品输入与能量输出接口，为该配方提供 IO；不是 Java 渲染器在产生能量。

## 控制器渲染器

`ArtificialStarRenderer` 让控制器上方悬浮一个持续旋转的恒星模型。

整个流程分四步：模型注册、渲染器注册、每帧渲染、性能开关。

### 类声明与单例


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

**`@EventBusSubscriber(value = Dist.CLIENT)`** 把这个类的 `@SubscribeEvent` 方法限定在客户端注册。这个限定是必需的，渲染器引用了 `Minecraft.getInstance()`，在专用服务器上加载这个类会直接崩。

**私有构造和 `INSTANCE` 单例**: [`ControllerRenderer`](../API/JavaAPI#controllerrenderer) 是 `@FunctionalInterface`，本可以用 lambda 一行写完。这里用完整类是因为需要覆盖 `shouldRenderOffScreen()` 与 `getViewDistance()` 两个默认方法，而 lambda 只能实现 `render(...)`。

**`StandaloneModelKey`** 是 NeoForge 的"独立模型"句柄。

独立模型指不绑定到任何方块或物品的模型，用于纯渲染目的，这里指向 `mmcr_test:obj/star`，实际加载的是 `assets/mmcr_test/models/obj/star.json`，即一个 `neoforge:obj` loader 的模型描述，指向 `star.obj` 与贴图 `mmcr_test:block/obj/star_layer`。

### 注册独立模型

```java
@SubscribeEvent
public static void registerModel(ModelEvent.RegisterStandalone event) {
    event.register(STAR_MODEL, SimpleUnbakedStandaloneModel.simpleModelWrapper(STAR_MODEL_ID));
}
```

这是 NeoForge 的事件。`ModelEvent.RegisterStandalone` 在资源包加载模型阶段发布，把 `STAR_MODEL` 键与实际模型资源关联起来。

`SimpleUnbakedStandaloneModel.simpleModelWrapper(...)` 是把普通模型 JSON 包装成独立模型的快捷方法。

 MMCR 只负责"什么时候调用你的渲染器"，模型资源的加载不由 MMCR 负责。

### 挂钩 `RegisterControllerRenderersEvent`

```java
@SubscribeEvent
public static void registerRenderer(RegisterControllerRenderersEvent event) {
    event.register(ARTIFICIAL_STAR.ARTIFICIAL_STAR, INSTANCE);
}
```

`RegisterControllerRenderersEvent` 是客户端 Java 渲染器注册窗口，发布在 `NeoForge.EVENT_BUS`。`void register(Identifier machineId, ControllerRenderer renderer)` 把公共渲染器绑到机器 ID；`event.registrar()` 返回公共 `RendererRegistrar`。

- **一机一渲染器**：同一机器 ID 重复注册会被拒绝；公共适配层抛 `cn.howxu.mmcr.publicapi.registration.RegistrationException`。
- **ID 必须在事件的白名单里**：事件构造时传入允许注册的机器 ID 集合，未知 ID 同样由公共层以 `RegistrationException` 拒绝。所以机器定义必须先注册成功，渲染器才挂得上。
- **窗口冻结**：注册窗口结束后不能再注册。公共事件没有供附属调用的 `freeze()`，冻结由核心管理，不能保留事件句柄用于之后的热加载注册。

`event.renderers()` 返回当前已注册渲染器的不可变快照，可以用来做幂等检查。

### `render(...)`

```java
@Override
public void render(ControllerRenderContext context, PoseStack poseStack,
                   SubmitNodeCollector nodeCollector, CameraRenderState camera) {
```

`ControllerRenderContext` 是 MMCR 在 Java 渲染回调中提供的只读发布状态接口，不是自行构造的 record，也不是服务端 `MachineContext`。`PoseStack` 是变换栈，`SubmitNodeCollector` 是渲染节点收集器，`CameraRenderState` 是摄像机状态。

**1. 前置检查**

```java
if (!context.structure().formed() || Minecraft.getInstance().level == null) return;
```

`context.structure()` 返回 `StructureView`，`formed()` 表示结构是否成型，没成型就不渲染。

`Minecraft.getInstance().level == null` 是防御性检查，世界卸载过程中渲染回调可能仍被触发一次。

`StructureView` 另有 `structureAreaLoaded()`（结构区域是否已加载）与 `matchedStage()`（当前匹配到哪个阶段）两个字段可用，这里没用到。

**2. 按朝向计算基准位置**

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

坐标是**相对于控制器方块**的。`PoseStack` 进入 `render(...)` 时已经平移到控制器所在方块的原点，所以 `0.5, 42.5, 0.5` 意思是控制器上方 42 格，水平居中。

`context.facing()` 是控制器朝向，可能为 `null`（未成型时）。这里的 `switch` 在补偿一件事：结构的球心不在控制器正上方，而在控制器水平方向约 39 格处。控制器位于球形外壳的边缘，朝向决定了球心在哪一侧。

- 朝北 → 球心在南边 39.5 格，`z = 39.5`
- 朝南 → 球心在北边 38.5 格，`z = -38.5`
- 朝西 / 朝东 → 同理在 x 轴上偏移

`default -> { }` 空分支处理其他朝向，保留初始偏移。这里是 switch 语句，不能据此推论语言要求所有语句式 switch 都必须穷尽枚举。

39.5 与 -38.5 这组不对称的数字来自方块中心与结构中心的半格偏移：正方向要 `+0.5` 落在方块中心，负方向要 `-0.5`。

**3. 取模型，失败就退出**

```java
BlockStateModelPart model = Minecraft.getInstance().getModelManager().getStandaloneModel(STAR_MODEL);
if (model == null) return;
```

从模型管理器取第一步注册的独立模型。资源包加载失败或资源重载中途，这里可能返回 `null`。MMCR 会记录渲染器抛出的异常但不会让它传播到渲染流程外，不过每帧刷日志同样不可接受。

**4. 计算旋转角**

```java
float tick = Minecraft.getInstance().level.getGameTime() + context.partialTick();
```

`getGameTime()` 是当前游戏 tick（整数），`context.partialTick()` 是当前帧在两个 tick 之间的插值系数（0.0 到 1.0）。两者相加得到"带小数的连续时间"，用它驱动旋转能得到平滑动画，只用整数 tick 的话旋转会以 20 Hz 跳变。

:::warning
`partialTick` 只该用于插值，不要用它做逻辑判断。
:::

**5. 变换与提交**

```java
poseStack.pushPose();
poseStack.translate(x, y, z);
poseStack.scale(0.45F, 0.45F, 0.45F);
poseStack.mulPose(new Quaternionf().fromAxisAngleDeg(0F, 1F, 1F, tick % 360F));
nodeCollector.submitBlockModel(poseStack, RenderTypes.translucentMovingBlock(), List.of(model), new int[0],
        LightCoordsUtil.FULL_BRIGHT, OverlayTexture.NO_OVERLAY, 0);
poseStack.popPose();
```

逐个来：

- `pushPose()` / `popPose()` 成对出现，保存并恢复变换栈。**不配对会污染后续所有渲染**。
- `translate(x, y, z)` 平移到第 2 步算出的位置。
- `scale(0.45F, 0.45F, 0.45F)` 三轴等比缩放到 45%。OBJ 模型本身的尺寸由建模决定，这个值调大一些恒星会大很多。
- `mulPose(new Quaternionf().fromAxisAngleDeg(0F, 1F, 1F, tick % 360F))` 绕轴 `(0, 1, 1)` 旋转 `tick % 360` 度。轴向是 y 与 z 的对角线，旋转看起来是斜着翻滚。取模限制传入角度范围，但这里先将游戏时间转换为 `float`，不能声称它消除了长期运行时所有浮点精度损失。
- `submitBlockModel(...)` 把模型提交给收集器。七个参数：变换栈、渲染类型、模型部件列表、纹理索引数组、光照坐标、覆盖层纹理、附加数据。
- `RenderTypes.translucentMovingBlock()` 是半透明渲染类型，恒星贴图带透明通道，用不透明类型会出黑边。
- `LightCoordsUtil.FULL_BRIGHT` 让模型**忽略环境光照恒定全亮**。
- `OverlayTexture.NO_OVERLAY` 不加受伤 / 闪白覆盖层。
- `new int[0]` 空纹理索引数组，模型自带材质映射。

### 性能

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

**`shouldRenderOffScreen()` 返回 `true`**：即使控制器方块本身不在视锥内也执行渲染。

Minecraft 的方块实体渲染默认按方块实体自身的包围盒做视锥剔除。恒星在控制器上方 42 格、水平 39 格处，玩家抬头看恒星时，脚下的控制器方块早就出了视野。不开这个开关，恒星会在玩家靠近时突然消失，这里返回`true`就可以常显示了。

**`getViewDistance()` 返回 `512`**：默认值是 64。这个装置直径约 80 格，玩家会从很远处欣赏它，64 格显然不够。

## 延伸阅读

- [RegisterControllerRenderersEvent 源码](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/event/RegisterControllerRenderersEvent.java) — 公共注册窗口。
- [ControllerRenderer 源码](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderer.java) — `render` 签名与两个默认方法。
- [ControllerRenderContext 源码](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/f234477b/src/main/java/cn/howxu/mmcr/publicapi/client/render/ControllerRenderContext.java) — 嵌套 `StructureView` / `CraftingView` 与 `Map<String, DataKey> dataStorageValues()`。客户端读到的是发布状态，不能从这里取得实时 `DataStore` 或写服务端数据。
- [Java 公共 API 参考](../API/JavaAPI)。
