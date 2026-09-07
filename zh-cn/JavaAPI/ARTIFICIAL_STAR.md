---
title: ARTIFICIAL_STAR
order: 9
---

# ARTIFICIAL_STAR — 人造恒星

本文拆解 [ARTIFICIAL_STAR.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/builtin/ARTIFICIAL_STAR.java) 与它的渲染器 [ArtificialStarRenderer.java](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/client/ArtificialStarRenderer.java)。这是内置示例里唯一的**混合示例**：机器定义在 Java 端，结构在 KubeJS 端，渲染器在 Java 客户端。

## 概览

人造恒星（ARTIFICIAL_STAR）演示的是"Java 与 KubeJS 分工"以及"自定义控制器渲染"这两件事：

- **Java 端只做一件事**：注册一个空壳机器定义。11 行代码，没有结构、没有配方、没有任何机器属性。
- **结构交给 KubeJS**：`example/server_scripts/structure/builtin_java/ArtificialStar.js` 用 109 个 z 层 × 112 行 × 121 列拼出一座 GT 风格的巨型恒星装置外壳。这个规模的模式写在 Java 里会是一个几千行的源文件——脚本更适合承载它。
- **渲染器回到 Java 客户端**：`ArtificialStarRenderer` 通过 [`MMCRMachineRendersEvent`](../API/JavaAPI#mmcrmachinerendersevent) 挂钩，在控制器上方 42 格处渲染一个旋转的 OBJ 恒星模型。渲染这件事 KubeJS 侧没有对应能力，必须走 Java。

为什么这个组合值得单独讲：MMCR 的注册窗口是**跨语言共享**的。Java 端注册的机器 ID，KubeJS 脚本可以直接 `event.createStructure("mmcr:artificial_star")` 往上挂结构。反过来也成立。理解这一点后，"哪部分用 Java、哪部分用脚本"就变成一个纯粹的工程选择。

## 本教程涉及的文件

| 文件 | 端 | 作用 |
| --- | --- | --- |
| [`builtin/ARTIFICIAL_STAR.java`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/builtin/ARTIFICIAL_STAR.java) | Java 服务端 | 机器定义（仅 ID + 显示名） |
| [`provider/BuiltInProvider.java`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/provider/BuiltInProvider.java) | Java 启动期 | 通过 `ServiceLoader` 调用 `registerDefinitions(...)` |
| [`client/ArtificialStarRenderer.java`](https://github.com/Nibelungorum/ModularMachinery-Community-Refoxed/blob/main/src/main/java/org/nibelungorum/client/ArtificialStarRenderer.java) | Java 客户端 | 控制器渲染器 + 独立模型注册 |
| `example/server_scripts/structure/builtin_java/ArtificialStar.js` | KubeJS 服务端 | 全部结构模式（109 层、63 个字符绑定） |
| `assets/mmcr_test/models/obj/star.json` / `.obj` / `.mtl` | 客户端资源 | 恒星的 OBJ 模型与材质 |
| `assets/mmcr_test/textures/block/obj/star_layer.png` | 客户端资源 | 恒星贴图 |

## 本教程涉及的 API

| 用到的 API | API 参考 |
| --- | --- |
| `MachineDefinitionProvider` | [链接](../API/JavaAPI#machinedefinitionprovider) |
| `MMCRMachineDefinationsEvent` | [链接](../API/JavaAPI#mmcrmachinedefinationsevent) |
| `MachineBuilder` | [链接](../API/JavaAPI#machinebuilder) |
| `MMCRMachineRendersEvent` | [链接](../API/JavaAPI#mmcrmachinerendersevent) |
| `ControllerRenderer` | [链接](../API/JavaAPI#controllerrenderer) |
| `ControllerRenderContext` | [链接](../API/JavaAPI#controllerrendercontext) |

KubeJS 侧：

| 用到的 API | API 参考 |
| --- | --- |
| `MMCREvents.server` | [链接](../API/KubeJS#mmcrevents) |
| `MMCRServerEventJS.createStructure` | [链接](../API/KubeJS#mmcrservereventjs) |
| `MachineStructureBuilderJS` | [链接](../API/KubeJS#machinestructurebuilderjs) |
| `KubeJSApi.block` / `state` | [链接](../API/KubeJS#kubejsapi) |

## 机器定义详解

Java 端的全部内容：

```java
@EventBusSubscriber
public class ARTIFICIAL_STAR {
    public static final Identifier ARTIFICIAL_STAR = id("artificial_star");

    public static void registerDefinitions(MMCRMachineDefinationsEvent event) {
        if (!event.definitions().containsKey(ARTIFICIAL_STAR)) {
            var machine = MachineBuilder
                    .machine(ARTIFICIAL_STAR)
                    .displayNameKey("machine.mmcr.artificial_star")
                    .build();
            event.registerMachine(machine);
        }
    }
}
```

三个细节值得说：

**ID 字段是 `public`。** 其他内置示例（[MONSTER_FARM](MONSTER_FARM)、[REACTOR](REACTOR)）都把 ID 声明为 `private static final`，这里是 `public static final`。原因很实际：渲染器在另一个包（`org.nibelungorum.client`）里，需要引用这个 ID 来注册渲染器。写自己的 mod 时，如果渲染器与机器定义分文件，ID 必须可见。

`ARTIFICIAL_STAR.ARTIFICIAL_STAR` 这个"类名.字段名"看起来别扭，但类与字段同名是这套内置示例的统一风格。

**`MachineBuilder` 只调了 `displayNameKey`。** 没有 `controller(...)`、没有 `appearance(...)`、没有并行、没有工厂。控制器方块 ID 走默认（`mmcr:artificial_star_controller`），纹理走 MMCR 内置回退。这台机器的全部视觉重点都在渲染器上，控制器本身长什么样无关紧要。

**结构与配方方法都不存在。** 这个类里没有 `@SubscribeEvent public static void registerStructures(...)`，也没有配方方法。结构由 KubeJS 提供，配方压根没有——这台机器成型后不会加工任何东西，它就是一个"会发光的巨型摆件"。

`import cn.howxu.mmcr.api.publicapi.event.MMCRMachineRendersEvent;` 这一行在源码里是未使用的导入（渲染器注册发生在 `ArtificialStarRenderer` 里），不影响运行。

## 结构详解：Java 端不管，KubeJS 端接手

**Java 端只创建了 `MachineBuilder`。** 这是本教程最需要强调的一点：结构完全由 KubeJS 文件 `example/server_scripts/structure/builtin_java/ArtificialStar.js` 贡献。脚本所在目录名 `builtin_java` 就是在标注"这个结构服务于一台 Java 注册的机器"。

脚本的骨架：

```javascript
MMCREvents.server(event => {
    const api = event.getAPI()
    const structure = event.createStructure("mmcr:artificial_star")
    structure
        .pattern(/* 121 字符 × 112 行 */)
        // ... 共 109 个 .pattern(...) 调用
        .set('X', api.block('minecraft:magma_block'))
        .set('A', api.block('minecraft:iron_block'))
        .set('B', api.state('minecraft:iron_bars[east=true,north=false,south=true,waterlogged=false,west=true]'))
        // ... 共 63 个 .set(...) 调用
        .controller('C')
        .build()
})
```

### 跨语言注册是怎么成立的

`event.createStructure("mmcr:artificial_star")` 传入的 ID 是 Java 端 `id("artificial_star")` 注册的那个。KubeJS 侧的 [`MMCRServerEventJS.createStructure`](../API/KubeJS#mmcrservereventjs) 不要求机器"必须由 KubeJS 注册"——它只要求这个 ID 在启动期已经存在。所以：

```text
启动期
  → ServiceLoader 加载 BuiltInProvider
  → ARTIFICIAL_STAR.registerDefinitions(event) 注册 mmcr:artificial_star
  → 机器定义冻结
服务期（KubeJS 服务端重载事务）
  → ArtificialStar.js 执行 createStructure("mmcr:artificial_star")
  → 结构提交，与 Java 注册的机器定义绑定
客户端（渲染器加载阶段）
  → MMCRMachineRendersEvent 发布
  → ArtificialStarRenderer.registerRenderer(event) 绑定渲染器
```

三个阶段分属三种代码形态（Java 启动期 / KubeJS 脚本 / Java 客户端），指向同一个机器 ID。

如果 ID 写错或机器不存在，`build()` 时抛运行时异常，该轮 KubeJS 事务整体不提交。

### 规模数据

| 指标 | 值 |
| --- | --- |
| z 层数（`.pattern(...)` 调用数） | 109 |
| 每层行数（y 高度） | 112 |
| 每行列数（x 宽度） | 121 |
| 单元格总数 | 109 × 112 × 121 ≈ 1477 万 |
| 字符绑定数（`.set(...)`） | 63（另有 2 行被注释掉） |
| 控制器位置 | 第 94 层、第 24 行、第 63 列 |

绝大多数单元格是空格（不校验）。包围盒是 121(x) × 112(y) × 109(z)，实际实体部分是一座球形装置外壳——铁块骨架、浅灰混凝土蒙皮、大量铁栏杆桁架、海晶灯核心，外围还有四组支撑塔。

### 字符绑定的两种方式

KubeJS 侧的 `set(...)` 接受方块 ID 字符串、`Block`、`BlockState` 或内部谓词。这份脚本用了 `api.block(...)` 与 `api.state(...)` 两种：

```javascript
.set('X', api.block('minecraft:magma_block'))       // 任意状态
.set('J', api.state('minecraft:stone_button[face=floor,facing=south,powered=false]'))  // 精确状态
```

语义与 Java 侧的 [`BlockPredicate.block(...)`](../API/JavaAPI#blockpredicate) / `state(...)` 对应。这份脚本**没有**调 `stateSensitive()`，所以带状态的绑定实际上不参与状态比对——`api.state(...)` 在状态不敏感模式下退化为按方块类型匹配。对照 [REACTOR](REACTOR)，那台机器显式开了 `stateSensitive()`。

字符表用满了 `0-9`、`A-Z`、`a-z`（去掉未用到的几个），还溢出到中文字符 `一` 与 `七`：

```javascript
.set('一', api.state('minecraft:iron_trapdoor[facing=south,half=top,open=false,powered=false,waterlogged=false]'))
.set('七', api.state('minecraft:stone_button[face=floor,facing=north,powered=false]'))
```

62 个 ASCII 字母数字不够用时，任何非空格单字符都能当符号——KubeJS 侧的 `set(String symbol, ...)` 只要求"单个非空格字符"。用汉字当符号在可读性上是个折中方案，但确实能工作。

`.controller('C')` 声明控制器字符，`C` 在脚本里没有对应的 `set(...)`，走自动控制器绑定。

### KubeJS 端的完整讲解

结构脚本的逐行拆解不在本文范围内——那是 KubeJS 端教程的内容。参见 KubeJS 端：[人造恒星](../KubeJS/人造恒星)。

## 特殊机制：控制器渲染器

这是本教程的核心。`ArtificialStarRenderer` 让控制器上方悬浮一个持续旋转的恒星模型。整个流程分四步：模型注册、渲染器注册、每帧渲染、性能开关。

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

**`@EventBusSubscriber(value = Dist.CLIENT)`** 把这个类的 `@SubscribeEvent` 方法限定在客户端注册。这个限定是必需的：渲染器引用了 `Minecraft.getInstance()`，在专用服务器上加载这个类会直接崩。

**私有构造 + `INSTANCE` 单例。** [`ControllerRenderer`](../API/JavaAPI#controllerrenderer) 是 `@FunctionalInterface`，本可以用 lambda 一行写完。这里用完整类是因为需要覆盖 `shouldRenderOffScreen()` 与 `getViewDistance()` 两个默认方法——lambda 只能实现 `render(...)`。

**`StandaloneModelKey`** 是 NeoForge 的"独立模型"句柄。独立模型指不绑定到任何方块或物品的模型，用于纯渲染目的。这里指向 `mmcr_test:obj/star`，实际加载的是 `assets/mmcr_test/models/obj/star.json`——一个 `neoforge:obj` loader 的模型描述，指向 `star.obj` 与贴图 `mmcr_test:block/obj/star_layer`。

### 第一步：注册独立模型

```java
@SubscribeEvent
public static void registerModel(ModelEvent.RegisterStandalone event) {
    event.register(STAR_MODEL, SimpleUnbakedStandaloneModel.simpleModelWrapper(STAR_MODEL_ID));
}
```

这是 NeoForge 的事件，不是 MMCR 的。`ModelEvent.RegisterStandalone` 在资源包加载模型阶段发布，把 `STAR_MODEL` 键与实际模型资源关联起来。`SimpleUnbakedStandaloneModel.simpleModelWrapper(...)` 是把普通模型 JSON 包装成独立模型的快捷方法。

**为什么需要这一步**：MMCR 只负责"什么时候调用你的渲染器"，模型资源的加载完全是原版 / NeoForge 的事。渲染器要用什么模型，自己去注册。

### 第二步：挂钩 `MMCRMachineRendersEvent`

```java
@SubscribeEvent
public static void registerRenderer(MMCRMachineRendersEvent event) {
    event.register(ARTIFICIAL_STAR.ARTIFICIAL_STAR, INSTANCE);
}
```

一行完成挂钩。[`MMCRMachineRendersEvent`](../API/JavaAPI#mmcrmachinerendersevent) 是 MMCR 的渲染器注册窗口，`register(Identifier machineId, ControllerRenderer renderer)` 把渲染器绑到机器 ID。

几个约束值得记住：

- **一机一渲染器**：同一机器 ID 重复注册抛 `ApiRegistrationException`。
- **ID 必须在事件的白名单里**：事件构造时传入了允许注册的机器 ID 集合，注册不在集合中的 ID 同样抛 `ApiRegistrationException`。所以机器定义必须先注册成功，渲染器才挂得上。
- **窗口会冻结**：MMCR 收集完所有订阅者后调用 `freeze()`，之后 `register(...)` 抛 `IllegalStateException`。生产构建中渲染器不可热加载。

`event.renderers()` 返回当前已注册渲染器的不可变快照，可以用来做幂等检查——这里没做，因为 `@EventBusSubscriber` 保证方法只被调一次。

### 第三步：`render(...)` 逐步拆解

```java
@Override
public void render(ControllerRenderContext context, PoseStack poseStack,
                   SubmitNodeCollector nodeCollector, CameraRenderState camera) {
```

四个参数：[`ControllerRenderContext`](../API/JavaAPI#controllerrendercontext) 是当前帧的不可变快照，`PoseStack` 是变换栈，`SubmitNodeCollector` 是渲染节点收集器，`CameraRenderState` 是摄像机状态（这个渲染器没用到）。

**① 前置检查**

```java
if (!context.structure().formed() || Minecraft.getInstance().level == null) return;
```

`context.structure()` 返回 `StructureView`，`formed()` 表示结构是否成型。没成型就不渲染——玩家还在搭建时不该有恒星悬空。

`Minecraft.getInstance().level == null` 是防御性检查：世界卸载过程中渲染回调可能仍被触发一次。

`StructureView` 另有 `structureAreaLoaded()`（结构区域是否已加载）与 `matchedStage()`（当前匹配到哪个阶段）两个字段可用，这里没用到。

**② 按朝向计算基准位置**

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

坐标是**相对于控制器方块**的。`PoseStack` 进入 `render(...)` 时已经平移到控制器所在方块的原点，所以 `0.5, 42.5, 0.5` 意思是"控制器上方 42 格，水平居中"。

`context.facing()` 是控制器朝向，可能为 `null`（未成型时）。这里的 `switch` 在补偿一件事：结构的球心不在控制器正上方，而在控制器水平方向约 39 格处。控制器位于球形外壳的边缘，朝向决定了球心在哪一侧。

- 朝北 → 球心在南边 39.5 格（`z = 39.5`）
- 朝南 → 球心在北边 38.5 格（`z = -38.5`）
- 朝西 / 朝东 → 同理在 x 轴上偏移

`default -> { }` 空分支处理 `UP` / `DOWN`——这台机器的控制器不允许竖直朝向，理论上不会走到，但 `Direction` 是六值枚举，switch 需要覆盖完整。

39.5 与 -38.5 这组不对称的数字来自方块中心与结构中心的半格偏移：正方向要 `+0.5` 落在方块中心，负方向要 `-0.5`。

**③ 取模型，失败就退出**

```java
BlockStateModelPart model = Minecraft.getInstance().getModelManager().getStandaloneModel(STAR_MODEL);
if (model == null) return;
```

从模型管理器取第一步注册的独立模型。资源包加载失败或资源重载中途，这里可能返回 `null`——直接返回比抛异常好。MMCR 会记录渲染器抛出的异常但不会让它传播到渲染流程外，不过每帧刷日志同样不可接受。

**④ 计算旋转角**

```java
float tick = Minecraft.getInstance().level.getGameTime() + context.partialTick();
```

`getGameTime()` 是当前游戏 tick（整数），`context.partialTick()` 是当前帧在两个 tick 之间的插值系数（0.0 到 1.0）。两者相加得到"带小数的连续时间"，用它驱动旋转能得到平滑动画——只用整数 tick 的话旋转会以 20 Hz 跳变。

`partialTick` 只该用于插值，不要用它做逻辑判断（比如"是否该触发某个效果"）。

**⑤ 变换与提交**

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

- `pushPose()` / `popPose()` 成对出现，保存并恢复变换栈。**不配对会污染后续所有渲染**，这是自定义渲染最常见的 bug。
- `translate(x, y, z)` 平移到第 ② 步算出的位置。
- `scale(0.45F, 0.45F, 0.45F)` 三轴等比缩放到 45%。OBJ 模型本身的尺寸由建模决定，缩放系数靠试出来。
- `mulPose(new Quaternionf().fromAxisAngleDeg(0F, 1F, 1F, tick % 360F))` 绕轴 `(0, 1, 1)` 旋转 `tick % 360` 度。轴向 `(0,1,1)` 是 y 与 z 的对角线（未归一化，JOML 的 `fromAxisAngleDeg` 会处理），旋转看起来是斜着翻滚而不是单纯自转。`% 360F` 让角度循环，避免浮点数随游戏时间无限增长而丢精度。
- `submitBlockModel(...)` 把模型提交给收集器。七个参数：变换栈、渲染类型、模型部件列表、纹理索引数组、光照坐标、覆盖层纹理、附加数据。
  - `RenderTypes.translucentMovingBlock()` 是半透明渲染类型——恒星贴图带透明通道，用不透明类型会出黑边。
  - `LightCoordsUtil.FULL_BRIGHT` 让模型**忽略环境光照恒定全亮**。恒星应该自己发光，而不是被周围火把照亮。
  - `OverlayTexture.NO_OVERLAY` 不加受伤 / 闪白覆盖层。
  - `new int[0]` 空纹理索引数组，模型自带材质映射。

### 第四步：两个性能开关

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

**这是什么**：Minecraft 的方块实体渲染默认按方块实体自身的包围盒做视锥剔除。

**为什么这里必须开**：恒星在控制器上方 42 格、水平 39 格处——玩家抬头看恒星时，脚下的控制器方块早就出了视野。不开这个开关，恒星会在玩家靠近时突然消失。凡是"渲染内容远离控制器方块"的渲染器都需要它。

**`getViewDistance()` 返回 `512`**：默认值是 64。这个装置直径约 80 格，玩家会从很远处欣赏它，64 格显然不够。

两个开关都是性能与效果的取舍：`shouldRenderOffScreen()` 让渲染器跳过剔除，`getViewDistance()` 512 让远处实例也参与渲染。给小机器无脑抄这两个值会白烧帧率。

## 与 KubeJS 端"人造恒星"教程的对比

KubeJS 端另有一台**独立的**人造恒星机器：`kubejs:artificial_star_video`，定义在 `example/startup_scripts/video/人造恒星.js`，结构在 `example/server_scripts/structure/video/人造恒星.js`。两者不是同一台机器：

| 维度 | 本文（`mmcr:artificial_star`） | KubeJS 端（`kubejs:artificial_star_video`） |
| --- | --- | --- |
| 机器定义位置 | Java `ARTIFICIAL_STAR.java` | KubeJS `startup_scripts/video/人造恒星.js` |
| 结构位置 | KubeJS `server_scripts/structure/builtin_java/ArtificialStar.js` | KubeJS `server_scripts/structure/video/人造恒星.js` |
| 渲染器 | Java `ArtificialStarRenderer` | 无 |
| 结构层数 | 109 | 109 |
| 字符绑定数 | 63 | 63 |
| 注册路径 | `ServiceLoader` + KubeJS 事务 | 纯 KubeJS 事务 |

两份结构脚本几乎逐字相同——除了 `createStructure(...)` 的 ID，只差 4 个字符绑定：本文版本的 `P` / `Q` / `q` / `y` 是不同朝向的铁砧，video 版本统一替换成深板岩。差别在于**机器定义走哪条路**、**有没有渲染器**。

对照着看这两台机器，能得出一条实用结论：

- 结构、配方、机器定义这三样，Java 与 KubeJS 都能做，选哪个看团队习惯与热重载需求（KubeJS 结构支持重载，Java 不支持）。
- **渲染器只能走 Java**。想给机器加自定义渲染，机器定义放哪都行，但渲染器必须是 Java 客户端代码。

参见 KubeJS 端：[人造恒星](../KubeJS/人造恒星)。

## 与 BLAST_FURNACE 的对比

| 维度 | BLAST_FURNACE | ARTIFICIAL_STAR |
| --- | --- | --- |
| Java 端行数 | 94 | 31（+ 渲染器 90） |
| 注册阶段 | 定义 + 结构 + 配方（全在 Java） | 定义（Java）+ 结构（KubeJS）+ 渲染器（Java 客户端） |
| `MachineBuilder` 配置项 | 5 项（并行、多线程、工厂等） | 1 项（`displayNameKey`） |
| 结构大小 | 3×3×3 | 121(x)×112(y)×109(z) |
| 配方 | 1 条 | 0 条 |
| 渲染器 | 无 | 有（OBJ 模型 + 旋转动画） |
| ID 字段可见性 | `private` | `public`（渲染器需要引用） |

BLAST_FURNACE 演示"一台机器的三阶段都在 Java 里怎么写"，ARTIFICIAL_STAR 演示"三阶段可以拆到不同语言与不同端"。前者是入门样板，后者是工程组织样板。

## 延伸阅读

- [BLAST_FURNACE](BLAST_FURNACE) — 三阶段全 Java 实现的基础样板。
- [MONSTER_FARM](MONSTER_FARM) — 控制器朝向配置，影响 `context.facing()` 的取值范围。
- [REACTOR](REACTOR) — 状态敏感结构，与本文结构的状态不敏感形成对照。
- [`MMCRMachineRendersEvent`](../API/JavaAPI#mmcrmachinerendersevent) — 渲染器注册窗口的完整约束与异常。
- [`ControllerRenderer`](../API/JavaAPI#controllerrenderer) — `render` 签名与两个默认方法的语义。
- [`ControllerRenderContext`](../API/JavaAPI#controllerrendercontext) — `StructureView` / `CraftingView` / `dataStorageValues` 全部字段，可用于做进度条之类的动态渲染。
- KubeJS 端：[人造恒星](../KubeJS/人造恒星) — 纯 KubeJS 版本的同一座装置。
- [`MachineStructureBuilderJS`](../API/KubeJS#machinestructurebuilderjs) — KubeJS 结构构建器的完整方法表。
