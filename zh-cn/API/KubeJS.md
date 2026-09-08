---
title: KubeJS API
---

# KubeJS API

本页是 Modular Machinery Community Refoxed（MMCR）KubeJS 集成层的集中参考。内容以 `cn.howxu.mmcr.compat.kubejs` 当前源码为准，示例使用 KubeJS/Rhino 可接受的 JavaScript 写法。

MMCR 的 KubeJS API 分为三个时序窗口：启动脚本中的机器、等级、修饰符和屏幕文本注册；服务端脚本加载中的结构注册；`ServerEvents.recipes` 中的数据驱动配方注册。启动注册与服务端结构注册由 `/reload` 之外的生命周期管理，配方事务则可以随服务器资源重载一起替换。

本文中的 `String`、`List`、`Map`、`Consumer<T>` 等类型是 Java 签名中的类型名。Rhino 会把 JavaScript 字符串、数组、对象和回调转换为对应参数；如果某个重载标记为 `@HideFromJS`，它只保留给 Java 互操作或内部桥接使用，不是脚本调用入口。

## 1. 顶层全局绑定

MMCR 插件在 KubeJS 的 binding 阶段注入名为 `MMCR` 的 `MMCRKubeJS` 实例，并注册 `mmcr` 事件组。插件同时保留 `MMCREvents` 这个事件组别名，因此推荐使用 `MMCREvents.startup(...)` 与 `MMCREvents.server(...)`。

### `MMCR`

> `MMCR` 是 KubeJS 全局绑定名，实际对象类型为 `cn.howxu.mmcr.compat.kubejs.MMCRKubeJS`，提供 API 门面和常量门面。

**字段**

全局对象不直接暴露字段；两个门面通过方法取得。

**方法**

#### `getAPI() → KubeJSApi`

- **参数表**：无。
- **返回**：一个可在启动脚本、服务端脚本和行为回调中复用的 `KubeJSApi` 实例。
- **抛出**：源码中没有额外的参数异常。
- **默认值**：同一个 `MMCRKubeJS` 实例始终返回同一个 API 门面。
- **示例**：

```javascript
const api = MMCR.getAPI()
const stone = api.block("minecraft:stone")
```

#### `getValues() → MMCRValues`

- **参数表**：无。
- **返回**：包含整数边界常量的 `MMCRValues` 实例。
- **抛出**：源码中没有额外的参数异常。
- **默认值**：同一个全局对象始终返回同一个值门面。
- **示例**：

```javascript
const maxInt = MMCR.getValues().INT_MAX
const minInt = MMCR.getValues().INT_MIN
```

**注意事项**

- `MMCR.getAPI()` 与事件对象的 `event.getAPI()` 返回相同类型，但不要求每次脚本都重新创建。
- 启动脚本通常可以直接使用全局 `MMCR.getAPI()`；结构脚本使用 `event.getAPI()` 可让代码明确处于 `mmcr.server` 回调内。
- `MMCR` 不是机器注册器本身，机器仍需通过 `MMCREvents.startup` 创建并 `register()`。

#### `MMCRKubeJS` 实现类

`MMCRKubeJS` 的完整类名为 `cn.howxu.mmcr.compat.kubejs.MMCRKubeJS`。它只有两个公开方法 `getAPI()` 和 `getValues()`；类的两个门面字段为私有字段，不应通过字段名直接依赖。

### `MMCRValues`

> `cn.howxu.mmcr.compat.kubejs.MMCRValues` 提供脚本中常用的 Java 整数边界值。

**字段**

| 名称 | 类型 | 值与描述 |
|------|------|------|
| `INT_MAX` | `int` | `2147483647`，`Integer.MAX_VALUE`。 |
| `INT_MIN` | `int` | `-2147483648`，`Integer.MIN_VALUE`。 |

**方法**

该类没有声明公开方法。

**示例**

```javascript
const upper = MMCR.getValues().INT_MAX
const lower = MMCR.getValues().INT_MIN
```

**注意事项**

- 这些值是 Java `int` 边界，不是 `long` 或任意精度整数边界。
- 大于 `int` 的数值应在脚本中使用 Java `BigInteger` 或其他适合的数值类型，并通过 `dataValue` 时确认目标 API 是否支持该类型。

### `MMCREvents`

> `cn.howxu.mmcr.compat.kubejs.MMCREvents` 是 MMCR 声明脚本事件组，包含启动期和服务期两个事件。

**字段**

| 名称 | 类型 | 描述 |
|------|------|------|
| `STARTUP_ID` | `String` | `"mmcr.startup"`。 |
| `SERVER_ID` | `String` | `"mmcr.server"`。 |
| `GROUP` | `EventGroup` | 名为 `mmcr` 的 KubeJS 事件组。 |

**监听语法**

```javascript
MMCREvents.startup(event => {
    event.createMachine("example:machine").register()
})

MMCREvents.server(event => {
    event.createStructure("example:machine").pattern("C").set("C", "minecraft:iron_block").controller("C").build()
})
```

`mmcr` 事件组通过 `EventGroupWrapper` 暴露在 KubeJS 全局，键 `startup` 与 `server` 直接对应两个 `EventHandler`；`MMCREvents.startup(handler)` 与 `MMCREvents.server(handler)` 等价于调用对应 `EventHandler.call(cx, scope, thisObj, [handler])`。`KubeEvent` 子类会自动作为参数 `event` 传入。

#### `group() → EventGroup`

- **参数表**：无。
- **返回**：初始化并返回 `mmcr` 事件组。
- **抛出**：源码中没有脚本参数；事件组初始化失败时由 KubeJS 抛出运行时异常。
- **默认值**：返回静态事件组对象。
- **示例**：

```javascript
const group = MMCREvents.group()
```

#### `postStartup() → void`

- **参数表**：无。
- **返回**：无。
- **抛出**：不应由脚本手动调用；在错误生命周期调用可能造成注册窗口状态错误。
- **默认值**：由 `Plugin.afterScriptsLoaded` 在启动脚本结束后调用。
- **示例**：

```javascript
MMCREvents.startup(event => {
    event.createMachine("example:machine").register()
})
```

#### `postServer() → void`

- **参数表**：无。
- **返回**：无。
- **抛出**：不应由脚本手动调用；事务未激活时不能替代正常服务器脚本加载流程。
- **默认值**：由 `Plugin.afterScriptsLoaded` 在服务端脚本结束后调用。
- **示例**：

```javascript
MMCREvents.server(event => {
    event.createStructure("example:machine").pattern("C").set("C", "minecraft:iron_block").controller("C").build()
})
```

#### `events() → Map<String, String>`

- **参数表**：无。
- **返回**：包含 `mmcr.startup` 和 `mmcr.server` 两个事件 ID 的有序映射。
- **抛出**：无。
- **默认值**：每次调用创建新的 `LinkedHashMap`。
- **示例**：

```javascript
const ids = MMCREvents.events()
```

**注意事项**

- `MMCREvents.startup` 的回调运行在 `ScriptType.STARTUP`，机器定义、等级类型、等级、修饰符和控制器屏幕文本注册应放在这里。
- `MMCREvents.server` 的回调运行在 `ScriptType.SERVER` 的 KubeJS 内容事务内，结构的 `build()` 必须在这个窗口中执行。
- `postStartup()`、`postServer()` 和 `group()` 是 Java 侧事件组生命周期方法；普通脚本只应使用事件组的监听入口。
- 事件组同时以插件注册的 `mmcr` 名称存在；为了兼容和可读性，机器定义脚本优先使用 `MMCREvents` 别名。

## 2. 启动期回调

### `MMCRStartupEventJS`

> `cn.howxu.mmcr.compat.kubejs.MMCRStartupEventJS` 是 `MMCREvents.startup` 回调收到的事件对象，负责收集只能在启动窗口声明的内容。

**字段**

| 名称 | 类型 | 描述 |
|------|------|------|
| `api` | `KubeJSApi` | 私有 API 门面，通过 `getAPI()` 暴露。 |

**方法**

#### `getAPI() → KubeJSApi`

- **参数表**：无。
- **返回**：当前启动事件使用的 `KubeJSApi`。
- **抛出**：无额外参数异常。
- **默认值**：每个事件对象持有一个 API 实例。
- **示例**：

```javascript
MMCREvents.startup(event => {
    const api = event.getAPI()
    const id = api.id("example:machine")
})
```

#### `registerControllerScreenText(String machineId, Consumer<ControllerScreenTextEventJS> handler) → void`

- **参数表**：`machineId`（`String`）— 机器注册 ID，必须是带命名空间的合法 ID；`handler`（`Consumer<ControllerScreenTextEventJS>`）— 控制器屏幕文本回调。
- **返回**：无；处理器被登记到控制器屏幕文本注册表。
- **抛出**：`IllegalArgumentException`：机器 ID 为空、空白或不是合法命名空间 ID，或回调为 `null`；注册表的生命周期异常会继续向外传播。
- **默认值**：无默认处理器。
- **示例**：

```javascript
MMCREvents.startup(event => {
    event.registerControllerScreenText("example:machine", text => {
        text.appendTranslatable("controller", "example:status", "gui.example.status")
    })
})
```

#### `createMachine(String id) → MachineBuilderJS`

- **参数表**：`id`（`String`）— 机器注册 ID，格式通常为 `namespace:path`。
- **返回**：绑定该 ID 的 `MachineBuilderJS`。
- **抛出**：`IllegalArgumentException`：ID 不能被 `Identifier.parse` 解析；实际提交时可能因重复 ID 或生命周期关闭抛注册异常。
- **默认值**：构建器使用机器定义默认控制器、外观、配方行为和并行上限。
- **示例**：

```javascript
MMCREvents.startup(event => {
    event.createMachine("example:press").displayNameKey("machine.example.press").register()
})
```

#### `createLevelType(String id) → LevelTypeBuilderJS`

- **参数表**：`id`（`String`）— 等级类型注册 ID。
- **返回**：绑定该 ID 的 `LevelTypeBuilderJS`。
- **抛出**：`IllegalArgumentException`：ID 格式非法；注册窗口关闭或重复时由等级注册器抛异常。
- **默认值**：显示名称键默认为类型 ID 字符串。
- **示例**：

```javascript
MMCREvents.startup(event => {
    event.createLevelType("example:coil").displayNameKey("level.example.coil").register()
})
```

#### `createLevel(String id) → MachineLevelBuilderJS`

- **参数表**：`id`（`String`）— 具体机器等级注册 ID。
- **返回**：绑定该 ID 的 `MachineLevelBuilderJS`。
- **抛出**：`IllegalArgumentException`：ID 格式非法；缺少 `type()` 或 `state()` 会在构建/注册时抛 `IllegalStateException`。
- **默认值**：优先级为 `0`，修饰器为恒等修饰器。
- **示例**：

```javascript
MMCREvents.startup(event => {
    event.createLevel("example:coil_iron")
        .type("example:coil")
        .state("minecraft:iron_block")
        .register()
})
```

#### `levelSlot(String typeId) → LevelSlot`

- **参数表**：`typeId`（`String`）— 已注册的机器等级类型 ID。
- **返回**：引用该等级类型的 `LevelSlot`，可传给结构构建器的 `set(symbol, value)`。
- **抛出**：`IllegalArgumentException`：类型 ID 非法、未注册或当前等级注册表不可用。
- **默认值**：无；类型必须显式提供。
- **示例**：

```javascript
MMCREvents.startup(event => {
    const slot = event.levelSlot("example:coil")
})
```

#### `registerModifier(String id, ModifierDefinition definition) → void`

- **参数表**：`id`（`String`）— 修饰器 ID；`definition`（`ModifierDefinition`）— Java 公共 API 的修饰器定义对象，通常由 `event.getAPI().modifierDefinition(...)` 创建。
- **返回**：无；把修饰器加入当前机器结构注册窗口。
- **抛出**：`IllegalArgumentException`：ID 无法解析；注册器可能因重复 ID、空定义或生命周期状态抛异常。
- **默认值**：无。
- **示例**：

```javascript
MMCREvents.startup(event => {
    const api = event.getAPI()
    const modifier = api.modifier("duration", "input", 0.5, "multiply", false)
    event.registerModifier("example:speed", api.modifierDefinition([modifier]))
})
```

#### `registerModifierItem(ItemStack stack, String modifierId) → void`

- **参数表**：`stack`（`ItemStack`）— 绑定到修饰器的物品栈；`modifierId`（`String`）— 已注册修饰器 ID。
- **返回**：无；物品会被注册为该修饰器的触发物品，注册器会把数量归一化为 1。
- **抛出**：`IllegalArgumentException`：修饰器 ID 非法；注册器可能因修饰器不存在、物品为空或生命周期错误抛异常。
- **默认值**：无。
- **示例**：

```javascript
MMCREvents.startup(event => {
    event.registerModifierItem(Item.of("minecraft:diamond"), "example:speed")
})
```

**注意事项**

- 启动窗口由插件在 `beforeScriptsLoaded` 中打开，在 `afterScriptsLoaded` 中发布事件并完成提交；脚本结束后不能通过 `/reload` 重新打开机器注册窗口。
- 等级类型应先于具体等级注册；结构脚本只能引用已经存在的等级类型。
- `registerControllerScreenText` 只能在启动事件上调用，服务期事件没有该方法。
- `registerModifier` 和 `registerModifierItem` 虽然位于启动回调 API 中，最终由机器结构注册快照统一校验。

## 3. 服务期回调

### `MMCRServerEventJS`

> `cn.howxu.mmcr.compat.kubejs.MMCRServerEventJS` 是 `MMCREvents.server` 回调收到的事件对象，负责在服务端资源重载事务中收集机器结构。

**字段**

| 名称 | 类型 | 描述 |
|------|------|------|
| `api` | `KubeJSApi` | 私有 API 门面，通过 `getAPI()` 暴露。 |

**方法**

#### `getAPI() → KubeJSApi`

- **参数表**：无。
- **返回**：当前服务期事件使用的 `KubeJSApi`。
- **抛出**：无。
- **默认值**：每个事件对象持有一个 API 实例。
- **示例**：

```javascript
MMCREvents.server(event => {
    const api = event.getAPI()
    const casing = api.block("minecraft:iron_block")
})
```

#### `createStructure(String id) → MachineStructureBuilderJS`

- **参数表**：`id`（`String`）— 已在启动期注册的机器 ID。
- **返回**：绑定该 ID 的 `MachineStructureBuilderJS`。
- **抛出**：`IllegalArgumentException`：ID 格式非法；结构提交时，机器不存在、结构重复或事务未激活会抛运行时异常。
- **默认值**：结构默认状态不敏感，端口和动态模式需求为空。
- **示例**：

```javascript
MMCREvents.server(event => {
    event.createStructure("example:press")
        .pattern("C")
        .set("C", "minecraft:iron_block")
        .controller("C")
        .build()
})
```

**注意事项**

- `build()` 必须在 `MMCREvents.server` 脚本加载期间调用；离开该回调后调用会抛 `IllegalStateException`。
- 服务端重载事务会同时收集结构和编程式配方；脚本出现错误时，插件不会提交这一轮事务。
- 机器定义、等级类型和修饰器不应在此事件重复注册。

## 4. KubeJSApi 完整方法

### `KubeJSApi`

> `cn.howxu.mmcr.compat.kubejs.KubeJSApi` 是由全局 `MMCR.getAPI()` 或事件 `getAPI()` 返回的脚本安全工厂门面。

`KubeJSApi` 返回的结构谓词类型是 `cn.howxu.mmcr.api.machine.BlockPredicate`，与 Java 公共 API 包中的同名 `BlockPredicate` 不是同一个类。结构构建器接受前者；`modifierUse` 会把前者转换为公共 API 的替换谓词。

**字段**

类自身只有三个私有缓存字段：`screenScope`、`recipeIO`、`outputPolicy`。脚本通过下列方法取得它们。

**方法**

#### 常量对象

##### `screenScope() → ScreenScopeValues`

- **参数表**：无。
- **返回**：屏幕文本作用域常量对象。
- **抛出**：无。
- **默认值**：缓存的 `ScreenScopeValues`。
- **示例**：

```javascript
const scope = MMCR.getAPI().screenScope()
const operation = scope.OPERATION
```

##### `recipeIO() → RecipeIoValues`

- **参数表**：无。
- **返回**：配方输入/输出方向常量对象。
- **抛出**：无。
- **默认值**：缓存的 `RecipeIoValues`。
- **示例**：

```javascript
const io = MMCR.getAPI().recipeIO()
const input = io.INPUT
```

##### `outputPolicy() → OutputPolicyValues`

- **参数表**：无。
- **返回**：计划输出策略常量对象。
- **抛出**：无。
- **默认值**：缓存的 `OutputPolicyValues`。
- **示例**：

```javascript
const policy = MMCR.getAPI().outputPolicy().ALLOW_PARTIAL
```

#### `ScreenScopeValues`

| 名称 | 类型 | 值 |
|------|------|------|
| `CONTROLLER` | `ControllerScreenTextScope` | 控制器静态文本作用域。 |
| `OPERATION` | `ControllerScreenTextScope` | 运行中/操作文本作用域。 |

#### `RecipeIoValues`

| 名称 | 类型 | 值 |
|------|------|------|
| `INPUT` | `RecipeIo` | 配方输入方向。 |
| `OUTPUT` | `RecipeIo` | 配方输出方向。 |

#### `OutputPolicyValues`

| 名称 | 类型 | 值 |
|------|------|------|
| `REQUIRE_FULL` | `OutputPolicy` | 要求输出全部接受。 |
| `ALLOW_PARTIAL` | `OutputPolicy` | 允许输出计划部分接受。 |

#### 字符串与数字

##### `readableNumber(long value) → String`

- **参数表**：`value`（`long`）— 要格式化的整数。
- **返回**：紧凑可读格式，例如 `1000` 格式化为 `1k`。对应 Java 端 `ReadableNumber.formatCompact(long)`。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
const text = MMCR.getAPI().readableNumber(1000000)
```

##### `readableNumberBigInt(BigInteger value) → String`

- **参数表**：`value`（`BigInteger`）— 要格式化的任意精度整数。
- **返回**：紧凑可读格式，例如 `1_000_000` 格式化为 `1M`。对应 Java 端 `ReadableNumber.formatCompact(BigInteger)`，**没有 long 重载的精度上限**。
- **抛出**：`IllegalArgumentException`（负数）。
- **示例**：

```javascript
const BigInteger = Java.loadClass("java.math.BigInteger")
const stored = new BigInteger("123456789012345678901234567890")
const text = MMCR.getAPI().readableNumberBigInt(stored) // "123.46E"
```

##### `readableNumberBigDecimal(BigDecimal value) → String`

- **参数表**：`value`（`BigDecimal`）— 要格式化的任意精度小数。
- **返回**：紧凑可读格式，例如 `12345.678` 格式化为 `12.35k`。对应 Java 端 `ReadableNumber.formatCompact(BigDecimal)`。
- **抛出**：`IllegalArgumentException`（负数）。
- **示例**：

```javascript
const BigDecimal = Java.loadClass("java.math.BigDecimal")
const text = MMCR.getAPI().readableNumberBigDecimal(new BigDecimal("12345.678"))
```

##### `readableNumberExact(long value) → String`

- **参数表**：`value`（`long`）— 要格式化的整数。
- **返回**：带分组分隔符的精确格式，例如 `1000000` 格式化为 `1,000,000`。对应 Java 端 `ReadableNumber.formatExact(long)`——`1_000` 以下也加千分位（`"999"` → `"999"`，`"1000"` → `"1,000"`）。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
const text = MMCR.getAPI().readableNumberExact(1000000)
```

##### `readableNumberFull(long value) → String`

- **参数表**：`value`（`long`）— 要格式化的整数。
- **返回**：完整 SI 前缀可读格式——`999_999` 以下直接输出整数（`"999"`），`1_000_000` 起使用 SI 前缀（`"1M"`、`"1.23G"`）。对应 Java 端 `ReadableNumber.format(long)`。
- **抛出**：`IllegalArgumentException`（负数）。
- **示例**：

```javascript
const text = MMCR.getAPI().readableNumberFull(1234567890) // "1.23G"
```

##### `readableNumberFullBigInt(BigInteger value) → String`

- **参数表**：`value`（`BigInteger`）— 要格式化的任意精度整数。
- **返回**：完整 SI 前缀可读格式，无 long 精度上限。对应 Java 端 `ReadableNumber.format(BigInteger)`。
- **抛出**：`IllegalArgumentException`（负数）。
- **示例**：

```javascript
const BigInteger = Java.loadClass("java.math.BigInteger")
const stored = new BigInteger("999999999999999999999999999999")
const text = MMCR.getAPI().readableNumberFullBigInt(stored) // "1Z"
```

##### `readableNumberFullBigDecimal(BigDecimal value) → String`

- **参数表**：`value`（`BigDecimal`）— 要格式化的任意精度小数。
- **返回**：完整 SI 前缀可读格式。对应 Java 端 `ReadableNumber.format(BigDecimal)`。
- **抛出**：`IllegalArgumentException`（负数）。
- **示例**：

```javascript
const BigDecimal = Java.loadClass("java.math.BigDecimal")
const text = MMCR.getAPI().readableNumberFullBigDecimal(new BigDecimal("1234567.89")) // "1.23M"
```

##### `readableNumberForSlot(long value, int scale, String unit) → String`

- **参数表**：`value`（`long`）— 原始整数值；`scale`（`int`，`0..18`）— 小数点偏移；`unit`（`String`）— 单位后缀（如 `"B"`、`"FE"`）。
- **返回**：紧凑 5 字符槽位字符串——按 `value / 10^scale` 在所给 `unit` 下渲染，使用**大写** SI 前缀（`""`、`"K"`、`"M"`、`"G"`、`"T"`、`"P"`、`"E"`），多余位数截断而非四舍五入。例如 `formatForSlot(1_001, 3, "B")` 返回 `"1.00B"`。对应 Java 端 `ReadableNumber.formatForSlot(long, int, String)`。
- **抛出**：`IllegalArgumentException`（负数 / `scale` 越界 / `unit` 过长导致槽位放不下）。
- **示例**：

```javascript
const text = MMCR.getAPI().readableNumberForSlot(1_001, 3, "B") // "1.00B"
```

##### `id(String id) → Identifier`

- **参数表**：`id`（`String`）— `namespace:path` 格式的资源 ID。
- **返回**：解析后的 Minecraft `Identifier`。
- **抛出**：`IllegalArgumentException`：字符串不符合资源 ID 语法。
- **默认值**：无。
- **示例**：

```javascript
const recipeId = MMCR.getAPI().id("example:iron_press")
```

#### 方块谓词

##### `air() → BlockPredicate`

- **参数表**：无。
- **返回**：匹配空气的谓词。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
builder.set("A", api.air())
```

##### `any() → BlockPredicate`

- **参数表**：无。
- **返回**：匹配任意方块的谓词。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
builder.set("X", api.any())
```

##### `coupler() → BlockPredicate`

- **参数表**：无。
- **返回**：匹配 MMCR 机器耦合器的谓词。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
builder.set("X", api.coupler())
```

##### `block(String blockId) → BlockPredicate`

- **参数表**：`blockId`（`String`）— 已注册方块的资源 ID。
- **返回**：匹配该方块任意状态的谓词。
- **抛出**：`IllegalArgumentException`：方块 ID 非法或未在方块注册表中存在。
- **默认值**：无。
- **示例**：

```javascript
const casing = api.block("minecraft:iron_block")
```

##### `state(String blockStateId) → BlockPredicate`

- **参数表**：`blockStateId`（`String`）— `namespace:block[property=value,...]`；不含方括号时使用方块默认状态。
- **返回**：精确匹配方块状态及其属性值的谓词。
- **抛出**：`IllegalArgumentException`：方块不存在、方括号不闭合、属性为空、属性名未知或属性值无效。
- **默认值**：不写属性时为默认方块状态。
- **示例**：

```javascript
const log = api.state("minecraft:oak_log[axis=x]")
```

##### `tag(String tagId) → BlockPredicate`

- **参数表**：`tagId`（`String`）— 方块标签 ID。
- **返回**：匹配属于该标签的方块的谓词。
- **抛出**：`IllegalArgumentException`：标签 ID 无法解析。
- **默认值**：无；标签是否在资源加载后包含成员由标签系统决定。
- **示例**：

```javascript
builder.set("B", api.tag("c:natural_logs"))
```

##### `anyOf(BlockPredicate... children) → BlockPredicate`

- **参数表**：`children`（`BlockPredicate...`）— 至少一个子谓词；JavaScript 数组和多个参数都可转换为可变参数。
- **返回**：匹配任一子谓词的并集谓词。
- **抛出**：`IllegalArgumentException`：数组为 `null` 或没有子谓词。
- **默认值**：无。
- **示例**：

```javascript
const portOrStone = api.anyOf(api.block("minecraft:stone"), api.anyOfItemInput())
```

##### `anyOfItemInput() → BlockPredicate`

- **参数表**：无。
- **返回**：所有已注册物品输入端口的并集谓词。
- **抛出**：无。
- **默认值**：自动包含当前端口注册表中的匹配端口。
- **示例**：

```javascript
structure.set("I", api.anyOfItemInput())
```

##### `anyOfItemOutput() → BlockPredicate`

- **参数表**：无。
- **返回**：所有已注册物品输出端口的并集谓词。
- **抛出**：无。
- **默认值**：自动包含当前端口注册表中的匹配端口。
- **示例**：

```javascript
structure.set("O", api.anyOfItemOutput())
```

##### `anyOfFluidInput() → BlockPredicate`

- **参数表**：无。
- **返回**：所有已注册流体输入端口的并集谓词。
- **抛出**：无。
- **默认值**：自动包含当前端口注册表中的匹配端口。
- **示例**：

```javascript
structure.set("F", api.anyOfFluidInput())
```

##### `anyOfFluidOutput() → BlockPredicate`

- **参数表**：无。
- **返回**：所有已注册流体输出端口的并集谓词。
- **抛出**：无。
- **默认值**：自动包含当前端口注册表中的匹配端口。
- **示例**：

```javascript
structure.set("F", api.anyOfFluidOutput())
```

##### `anyOfEnergyInput() → BlockPredicate`

- **参数表**：无。
- **返回**：所有已注册能量输入端口的并集谓词。
- **抛出**：无。
- **默认值**：自动包含当前端口注册表中的匹配端口。
- **示例**：

```javascript
structure.set("E", api.anyOfEnergyInput())
```

##### `anyOfEnergyOutput() → BlockPredicate`

- **参数表**：无。
- **返回**：所有已注册能量输出端口的并集谓词。
- **抛出**：无。
- **默认值**：自动包含当前端口注册表中的匹配端口。
- **示例**：

```javascript
structure.set("E", api.anyOfEnergyOutput())
```

##### `anyOfUpgradeBus() → BlockPredicate`

- **参数表**：无。
- **返回**：所有已注册升级总线的并集谓词。
- **抛出**：无。
- **默认值**：自动包含当前升级总线注册表中的成员。
- **示例**：

```javascript
structure.set("U", api.anyOfUpgradeBus())
```

##### `parallelControllers() → BlockPredicate`

- **参数表**：无。
- **返回**：所有等级的并行控制器并集谓词。
- **抛出**：无。
- **默认值**：包含当前注册的所有并行控制器等级。
- **示例**：

```javascript
structure.set("P", api.parallelControllers())
```

##### `smartInterface() → BlockPredicate`

- **参数表**：无。
- **返回**：匹配内置智能接口方块的谓词。
- **抛出**：无。
- **默认值**：通过延迟方块引用取得实际方块。
- **示例**：

```javascript
structure.set("S", api.smartInterface())
```

##### `dataStorage() → BlockPredicate`

- **参数表**：无。
- **返回**：匹配内置数据存储方块的谓词。
- **抛出**：无。
- **默认值**：通过延迟方块引用取得实际方块。
- **示例**：

```javascript
structure.set("D", api.dataStorage())
```

##### `factoryController() → BlockPredicate`

- **参数表**：无。
- **返回**：匹配内置工厂控制器方块的谓词。
- **抛出**：无。
- **默认值**：通过延迟方块引用取得实际方块。
- **示例**：

```javascript
structure.set("T", api.factoryController())
```

##### `networkInterface() → BlockPredicate`

- **参数表**：无。
- **返回**：匹配内置网络接口方块的谓词。
- **抛出**：无。
- **默认值**：通过延迟方块引用取得实际方块。
- **示例**：

```javascript
structure.set("N", api.networkInterface())
```

#### 端口等级与端口需求

##### `portRequirements(Map<String, Object> ranges) → PortRequirementSpec`

- **参数表**：`ranges`（`Map<String,Object>`）— 键为端口 ID；值为单个数字表示最低数量，或 `[min, max]` 表示闭区间。
- **返回**：不可变端口数量需求对象。
- **抛出**：`IllegalArgumentException`：值不是数字或二元数字数组、数字不是有限整数、超出 `int` 范围、数量为负或最大值小于最小值。
- **默认值**：空映射产生无端口数量要求的 `PortRequirementSpec.none()`。
- **示例**：

```javascript
const ports = api.portRequirements({
    item_input_bus: [1, 2],
    energy_input_hatch: 1
})
```

##### `portTierRequirements(List<String> minimums) → PortTierRequirementSpec`

- **参数表**：`minimums`（`List<String>`）— 每项格式为 `item_input_bus>=normal`、`fluid_output_hatch>=big` 或 `energy_input_hatch>=ultimate`。
- **返回**：不可变端口最低等级需求对象。
- **抛出**：`IllegalArgumentException`：格式不是三段、类别未知、输入输出方向未知、端口族错误或等级名称不在允许列表中。
- **默认值**：空列表返回 `PortTierRequirementSpec.none()`。
- **示例**：

```javascript
const tiers = api.portTierRequirements([
    "item_input_bus>=normal",
    "energy_input_hatch>=small"
])
```

端口等级名称按类别分别为：物品 `tiny`、`small`、`normal`、`reinforced`、`big`、`huge`、`ludicrous`；流体额外有 `vacuum`；能量额外有 `ultimate`。

#### 配方输入输出

##### `itemInput(String itemId, int count, float consumeChance) → MachineIngredient`

- **参数表**：`itemId`（`String`）— 物品 ID；`count`（`int`）— 输入数量；`consumeChance`（`float`）— 每次消耗该输入的概率。
- **返回**：物品 `MachineIngredient`；输入方向固定为 `INPUT`。
- **抛出**：`IllegalArgumentException`：物品未知；物品 ID 无效。负数量会在配方构建校验时被拒绝，概率最终限制在 `0` 到 `1`。
- **默认值**：无；组件谓词为空。
- **示例**：

```javascript
const ingredient = api.itemInput("minecraft:iron_ingot", 1, 1.0)
```

##### `tagInput(String tagId, int count, float consumeChance) → MachineIngredient`

- **参数表**：`tagId`（`String`）— 物品标签 ID；`count`（`int`）— 数量；`consumeChance`（`float`）— 消耗概率。
- **返回**：由物品标签构造的物品输入。
- **抛出**：`IllegalArgumentException`：标签 ID 无效、标签不存在或数量最终非法；`IllegalStateException`：当前物品注册表不可用。
- **默认值**：组件谓词为空。
- **示例**：

```javascript
const ingredient = api.tagInput("c:ingots/iron", 1, 1.0)
```

##### `fluidInput(String fluidId, int amount) → MachineIngredient`

- **参数表**：`fluidId`（`String`）— 流体 ID；`amount`（`int`）— 流体数量。
- **返回**：流体输入 `MachineIngredient`。
- **抛出**：`IllegalArgumentException`：流体 ID 无效或未注册。
- **默认值**：无。
- **示例**：

```javascript
const water = api.fluidInput("minecraft:water", 1000)
```

##### `fluidStack(String fluidId, int amount) → FluidStack`

- **参数表**：`fluidId`（`String`）— 流体 ID；`amount`（`int`）— 栈数量。
- **返回**：NeoForge `FluidStack`，可传给编程式配方构建器的流体输出列表。
- **抛出**：`IllegalArgumentException`：流体 ID 无效或未注册。
- **默认值**：无。
- **示例**：

```javascript
const output = api.fluidStack("minecraft:lava", 250)
```

##### `energyInput(int fePerTick) → MachineIngredient`

- **参数表**：`fePerTick`（`int`）— 每 tick 输入的 FE 数量。
- **返回**：能量输入 `MachineIngredient`。
- **抛出**：负数会在配方构建校验时被拒绝。
- **默认值**：无。
- **示例**：

```javascript
const energy = api.energyInput(32)
```

##### `energyOutput(int fePerTick) → MachineIngredient`

- **参数表**：`fePerTick`（`int`）— 每 tick 输出的 FE 数量。
- **返回**：方向为 `OUTPUT` 的能量 `MachineIngredient`。
- **抛出**：负数会在配方构建校验时被拒绝。
- **默认值**：无。
- **示例**：

```javascript
const energy = api.energyOutput(8)
```

##### `energyRequirement(RecipeIo io, int fePerTick) → MachineRequirement`

- **参数表**：`io`（`RecipeIo`）— 使用 `api.recipeIO().INPUT` 或 `OUTPUT`；`fePerTick`（`int`）— 每 tick FE 数量。
- **返回**：可加入 `MachineIoPlan` 或编程式配方 `requirements` 的能量需求。
- **抛出**：下游需求构造器可能因负数量抛异常；`io` 不是 `OUTPUT` 时源码按输入处理。
- **默认值**：`io == null` 时也会按输入方向处理，这是源码分支的结果，不建议依赖。
- **示例**：

```javascript
const requirement = api.energyRequirement(api.recipeIO().INPUT, 32)
```

##### `customRecipeIo(String typeId, RecipeIo io, JsonElement payload) → CustomRecipeIo`

- **参数表**：`typeId`（`String`）— 已注册的需求/输出类型 ID；`io`（`RecipeIo`）— 输入或输出方向；`payload`（`JsonElement`）— 该类型 codec 接受的 JSON 数据。
- **返回**：经过注册表和 codec 校验的 `CustomRecipeIo`。
- **抛出**：`IllegalArgumentException`：类型未注册、方向或 payload 不符合类型 codec。
- **默认值**：无。
- **示例**：

```javascript
const payload = { type: "neoforge:energy", io: "input", fe_per_tick: 12 }
const custom = api.customRecipeIo("neoforge:energy", api.recipeIO().INPUT, payload)
```

##### `itemOutputRequirement(String itemId, int count, float chance) → MachineRequirement`

- **参数表**：`itemId`（`String`）— 物品 ID；`count`（`int`）— 输出数量；`chance`（`float`）— 输出概率。
- **返回**：方向为输出的物品需求。
- **抛出**：`IllegalArgumentException`：物品未知；负数量由需求/配方校验拒绝。
- **默认值**：无；数据组件谓词为空。
- **示例**：

```javascript
const output = api.itemOutputRequirement("minecraft:iron_nugget", 10, 1.0)
```

##### `itemOutputRequirementWithComponents(String itemId, int count, JsonElement components, float chance) → MachineRequirement`

- **参数表**：`itemId`（`String`）— 物品 ID；`count`（`int`）— 输出数量；`components`（`JsonElement`）— `DataComponentPredicateSet` codec 的 JSON；`chance`（`float`）— 输出概率。
- **返回**：带数据组件匹配条件的物品输出需求。
- **抛出**：`IllegalArgumentException` 或 codec 异常：物品未知、组件 JSON 无法解析或数量非法。
- **默认值**：组件必须显式传入；概率由输出模型规范化。
- **示例**：

```javascript
const output = api.itemOutputRequirementWithComponents(
    "minecraft:diamond_sword",
    1,
    { "minecraft:custom_name": { text: "Marked" } },
    1.0
)
```

##### `itemInputRequirement(String itemId, int count) → MachineRequirement`

- **参数表**：`itemId`（`String`）— 物品 ID；`count`（`int`）— 输入数量。
- **返回**：方向为输入的物品需求，消耗概率为 `1`。
- **抛出**：`IllegalArgumentException`：物品未知或数量在后续配方校验中非法。
- **默认值**：无组件谓词，完全消耗。
- **示例**：

```javascript
const input = api.itemInputRequirement("minecraft:iron_ingot", 1)
```

##### `fluidInputRequirement(String fluidId, int amount) → MachineRequirement`

- **参数表**：`fluidId`（`String`）— 流体 ID；`amount`（`int`）— 输入量。
- **返回**：方向为输入的流体需求。
- **抛出**：`IllegalArgumentException`：流体未知；负数量会在配方校验中拒绝。
- **默认值**：无。
- **示例**：

```javascript
const input = api.fluidInputRequirement("minecraft:water", 1000)
```

##### `fluidOutputRequirement(String fluidId, int amount, float chance) → MachineRequirement`

- **参数表**：`fluidId`（`String`）— 流体 ID；`amount`（`int`）— 输出量；`chance`（`float`）— 输出概率。
- **返回**：方向为输出的流体需求。
- **抛出**：`IllegalArgumentException`：流体未知；数量和概率由流体需求/配方校验处理。
- **默认值**：无。
- **示例**：

```javascript
const output = api.fluidOutputRequirement("minecraft:lava", 250, 0.5)
```

#### 修饰符与等级

##### `modifier(String target, String io, float value, String operation, boolean chance) → RecipeModifier`

- **参数表**：`target`（`String`）— 目标字段，如 `duration`、`energy` 或 `item`；`io`（`String`）— `input` 或 `output`；`value`（`float`）— 修饰数值；`operation`（`String`）— `add`、`multiply`、`subtract` 或 `divide`；`chance`（`boolean`）— 是否作用于输出概率。
- **返回**：配方修饰器。
- **抛出**：`IllegalArgumentException`：IO 或操作字符串不是允许值。
- **默认值**：没有隐式默认；`target` 可为空字符串表示不限定目标。
- **示例**：

```javascript
const modifier = api.modifier("duration", "input", 0.5, "multiply", false)
```

##### `modifierDefinition(List<RecipeModifier> modifiers) → ModifierDefinition`

- **参数表**：`modifiers`（`List<RecipeModifier>`）— 修饰器列表。
- **返回**：可传给 `registerModifier` 的不可变 `ModifierDefinition`。
- **抛出**：列表元素为无效修饰器时由记录构造器抛异常。
- **默认值**：`null` 列表在公共记录中按空列表处理；脚本应显式传数组。
- **示例**：

```javascript
const definition = api.modifierDefinition([
    api.modifier("duration", "input", 0.75, "multiply", false)
])
```

##### `modifierUse(String modifierId, BlockPredicate replacement) → ModifierUse`

- **参数表**：`modifierId`（`String`）— 已注册修饰器 ID；`replacement`（内部 `BlockPredicate`）— 使用修饰器时允许替换的方块谓词。
- **返回**：结构要求中的 `ModifierUse`。
- **抛出**：`IllegalArgumentException`：ID 无效；传入的 `any()` 不能作为修饰器替换谓词；替换对象为空或结构形态无法转换。
- **默认值**：无。
- **示例**：

```javascript
const use = api.modifierUse("example:speed", api.block("minecraft:diamond_block"))
structure.modifier("M", use)
```

##### `levelRequirement(String typeId, String levelId) → LevelRequirement`

- **参数表**：`typeId`（`String`）— 等级类型 ID；`levelId`（`String`）— 具体等级 ID。
- **返回**：绑定类型和等级的配方等级要求。
- **抛出**：`IllegalArgumentException`：类型未注册、等级未注册或等级属于另一个类型。
- **默认值**：无。
- **示例**：

```javascript
const requirement = api.levelRequirement("example:coil", "example:coil_iron")
```

##### `levelSlot(String typeId) → LevelSlot`

- **参数表**：`typeId`（`String`）— 已注册的等级类型 ID。
- **返回**：可在结构字符上使用的等级槽位。
- **抛出**：`IllegalArgumentException`：等级类型未注册。
- **默认值**：无。
- **示例**：

```javascript
structure.set("L", api.levelSlot("example:coil"))
```

#### 智能接口

##### `smartInterfaceInput(String type, float min, float max) → SmartInterfaceRequirement`

- **参数表**：`type`（`String`）— 机器定义中的智能接口类型；`min`（`float`）— 最低输入值；`max`（`float`）— 最高输入值。
- **返回**：范围输入需求。
- **抛出**：智能接口需求构造器会在范围无效或类型为空时抛异常。
- **默认值**：无。
- **示例**：

```javascript
const requirement = api.smartInterfaceInput("temperature", 10, 50)
```

##### `smartInterfaceOutput(String type, float value) → SmartInterfaceRequirement`

- **参数表**：`type`（`String`）— 智能接口类型；`value`（`float`）— 要求的输出值。
- **返回**：固定值输出需求。
- **抛出**：智能接口需求构造器会在类型或数值无效时抛异常。
- **默认值**：无。
- **示例**：

```javascript
const requirement = api.smartInterfaceOutput("mode", 2)
```

#### 自定义与网络

##### `networkInterfaces(MachineBehaviorContext context) → List<NetworkInterfaceReference>`

- **参数表**：`context`（`MachineBehaviorContext`）— 当前机器行为回调上下文。
- **返回**：当前成型机器可见的网络接口引用列表。
- **抛出**：`NullPointerException` 或网络 API 运行时异常：上下文为空或上下文不再对应有效机器。
- **默认值**：没有接口时返回空列表。
- **示例**：

```javascript
machine.tickBehavior(behavior => behavior.serverTick(ctx => {
    const interfaces = api.networkInterfaces(ctx)
}))
```

##### `sendRequest(NetworkInterfaceReference source, MachineReference target, String requestId, Object body) → void`

- **参数表**：`source`（`NetworkInterfaceReference`）— 发起请求的接口；`target`（`MachineReference`）— 目标机器引用；`requestId`（`String`）— 请求处理器 ID；`body`（`Object`）— 可转换为字符串键映射的脚本对象。
- **返回**：无；请求交给 MMCR 网络系统异步传递。
- **抛出**：`IllegalArgumentException`：body 不是映射、键为空/不是字符串、值含不支持类型或请求 ID 非法；目标不可达时由失败处理器处理，而不是由该方法保证成功。
- **默认值**：空映射可以作为请求体；推荐至少提供一个业务字段。
- **示例**：

```javascript
const iface = api.networkInterfaces(ctx).get(0)
const target = iface.connections().get(0)
api.sendRequest(iface, target, "example:report", { power: 20 })
```

##### `dataValue(Object value) → DataValue`

- **参数表**：`value`（`Object`）— `DataValue`、JavaScript 对象/映射、集合、数组、布尔、字符串、整数、浮点数、`BigInteger` 或 `BigDecimal`。
- **返回**：递归转换后的不可变 `DataValue`。
- **抛出**：`IllegalArgumentException`：值为 `null`、映射键不是非空字符串、浮点数非有限或对象类型不支持。
- **默认值**：已是 `DataValue` 时原样返回；集合和数组转换为列表。
- **示例**：

```javascript
const value = api.dataValue({ power: 20, labels: ["active", "safe"] })
ctx.dataStorage().set("state", value)
```

**注意事项**

- 方块谓词工厂会即时检查 `block` 的注册表项，但标签谓词允许标签在之后的资源绑定阶段解析。
- `state` 的属性名和值必须与对应方块的状态定义完全一致。
- `portRequirements` 的端口 ID 是端口注册名，不是方块标签；区间写成 JavaScript 二元数组。
- `customRecipeIo` 只接受已经注册 codec 的类型，任意 JSON 并不会自动成为自定义 IO。
- `dataValue` 的映射值也会递归转换；网络请求根对象必须是映射，不能直接发送单个数字或字符串。
- `smartInterfaceInput` 的 API 门面只有范围签名；固定值需求应使用相同的 `min` 和 `max`，或使用编程式配方构建器的固定值重载。

## 5. 机器定义构建器

### `MachineBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.MachineBuilderJS` 是启动脚本中的机器注册构建器，由 `MMCRStartupEventJS.createMachine` 创建。

**字段**

| 名称 | 类型 | 默认值 | 描述 |
|------|------|------|------|
| `displayNameKey` | `String` | `null` | 机器显示名称翻译键。 |
| `controllerFrontTexture` | `Identifier` | 自动默认 | 控制器前面纹理。 |
| `controllerSideTexture` | `Identifier` | 自动默认 | 控制器侧面纹理。 |
| `controllerTopTexture` | `Identifier` | 自动默认 | 控制器顶面纹理。 |
| `controllerBottomTexture` | `Identifier` | 自动默认 | 控制器底面纹理。 |
| `allowVerticalFacing` | `boolean` | `false` | 是否允许控制器竖直朝向。 |
| `fullyRotationallySymmetric` | `boolean` | `false` | 是否完全旋转对称。 |
| `requireVerticalFacing` | `boolean` | `false` | 是否强制竖直朝向。 |
| `allowModifiers` | `boolean` | `false` | 是否允许机器修饰器。 |
| `allowMultithreading` | `boolean` | `false` | 是否允许工厂多线程。 |
| `allowParallelism` | `boolean` | `false` | 是否允许并行控制器。 |
| `maxParallelAmount` | `long` | `1` | 最大并行数量。 |
| `machineBasicBlock` | `Identifier` | 外观默认 | 机器基础外观方块。 |
| `controllerBaseTexture` | `Identifier` | 外观默认 | 控制器底纹理。 |
| `formedPortBaseTexture` | `Identifier` | 外观默认 | 成型端口底纹理。 |
| `runningSoundId` | `Identifier` | `null` | 运行音效。 |
| `finishSoundId` | `Identifier` | `null` | 完成音效。 |

**创建**

公开构造器为 `MachineBuilderJS(Identifier id)` 和 `MachineBuilderJS(String id)`，均标记为 `@HideFromJS`。脚本通常不直接调用构造器，而使用 `event.createMachine(id)`。

**方法**

#### 基本属性与行为

##### `displayNameKey(String key) → MachineBuilderJS`

- **参数表**：`key`（`String`）— 翻译键；建议使用 `machine.namespace.path`。
- **返回**：当前构建器。
- **抛出**：源码不做非空检查；下游注册记录会处理无效显示名。
- **默认值**：未设置时由机器注册对象采用默认显示名回退。
- **示例**：

```javascript
const machine = event.createMachine("example:press").displayNameKey("machine.example.press")
```

##### `localizedName(String name) → MachineBuilderJS`

- **参数表**：`name`（`String`）— 旧版名称参数。
- **返回**：等价于 `displayNameKey(name)` 的当前构建器。
- **抛出**：同 `displayNameKey`。
- **默认值**：无。
- **示例**：

```javascript
const machine = event.createMachine("example:press").localizedName("machine.example.press")
```

该方法标记为 `@Deprecated(forRemoval = true)`，新脚本应使用 `displayNameKey`。

##### `recipeFamily(String recipeFamilyId) → MachineBuilderJS`

- **参数表**：`recipeFamilyId`（`String`）— 配方系列 ID；它是分类/显示用途的机器属性，不是配方匹配用的机器 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析。
- **默认值**：机器自身 ID。
- **示例**：

```javascript
machine.recipeFamily("example:press")
```

##### `expandableStructure() → MachineBuilderJS`

- **参数表**：无。
- **返回**：当前构建器，并把可扩展结构开关设为 `true`。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.expandableStructure()
```

##### `expandableStructure(boolean expandableStructure) → MachineBuilderJS`

- **参数表**：`expandableStructure`（`boolean`）— 是否允许结构扩展阶段。
- **返回**：当前构建器。
- **抛出**：无；结构阶段是否与该设置一致在运行时校验。
- **默认值**：`false`。
- **示例**：

```javascript
machine.expandableStructure(true)
```

##### `role(String role) → MachineBuilderJS`

- **参数表**：`role`（`String`）— `NORMAL`、`HOST` 或 `MODULE`，解析时不区分大小写。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：角色不是三个有效值之一；角色和 `host`/`module` 声明冲突时 `createObject()` 也会抛异常。
- **默认值**：`NORMAL`，且未显式设置角色。
- **示例**：

```javascript
machine.role("host").host("example:module")
```

##### `host(String... moduleIds) → MachineBuilderJS`

- **参数表**：`moduleIds`（`String...`）— 被该宿主接受的模块机器 ID；重复项会去重并保持插入顺序。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：非空 ID 无法解析；显式 `HOST` 角色没有任何模块时在构建时抛异常。
- **默认值**：空集合；`null` 数组或数组中的 `null` 项被忽略。
- **示例**：

```javascript
machine.role("HOST").host("example:module_a", "example:module_b")
```

##### `module() → MachineBuilderJS`

- **参数表**：无。
- **返回**：当前构建器，并把模块标志设为 `true`。
- **抛出**：与显式 `role` 冲突时在构建阶段抛异常。
- **默认值**：`false`。
- **示例**：

```javascript
machine.module()
```

##### `module(boolean module) → MachineBuilderJS`

- **参数表**：`module`（`boolean`）— 是否为模块机器。
- **返回**：当前构建器。
- **抛出**：与显式角色冲突时在 `createObject()` 或 `register()` 阶段抛 `IllegalArgumentException`。
- **默认值**：`false`。
- **示例**：

```javascript
machine.module(true)
```

##### `factoryThreads(int factoryThreads) → MachineBuilderJS`

- **参数表**：`factoryThreads`（`int`）— 工厂线程上限。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：小于 `1`。
- **默认值**：`1`。
- **示例**：

```javascript
machine.allowMultithreading().factoryThreads(4)
```

##### `allowMultithreading() → MachineBuilderJS`

- **参数表**：无。
- **返回**：当前构建器，并启用多线程。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.allowMultithreading()
```

##### `allowMultithreading(boolean allow) → MachineBuilderJS`

- **参数表**：`allow`（`boolean`）— 是否允许多线程。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.allowMultithreading(false)
```

##### `allowParallelism() → MachineBuilderJS`

- **参数表**：无。
- **返回**：当前构建器，并启用并行处理。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.allowParallelism()
```

##### `allowParallelism(boolean allow) → MachineBuilderJS`

- **参数表**：`allow`（`boolean`）— 是否允许并行控制器。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.allowParallelism(true)
```

##### `maxParallelAmount(long amount) → MachineBuilderJS`

- **参数表**：`amount`（`long`）— 最大并行数量，支持超过 `Integer.MAX_VALUE` 的长整数。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：最终机器注册校验发现数量小于 `1`。
- **默认值**：`1`。
- **示例**：

```javascript
machine.maxParallelAmount(32)
```

##### `maxParallelism(long maxParallelism) → MachineBuilderJS`

- **参数表**：`maxParallelism`（`long`）— `maxParallelAmount` 的别名参数。
- **返回**：等价于 `maxParallelAmount(maxParallelism)` 的当前构建器。
- **抛出**：同 `maxParallelAmount`。
- **默认值**：`1`。
- **示例**：

```javascript
machine.maxParallelism(32)
```

##### `allowModifiers() → MachineBuilderJS`

- **参数表**：无。
- **返回**：当前构建器，并允许机器修饰器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.allowModifiers()
```

##### `allowModifiers(boolean allow) → MachineBuilderJS`

- **参数表**：`allow`（`boolean`）— 是否允许机器修饰器。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.allowModifiers(true)
```

#### 控制器与外观

##### `controllerSpec(MachineControllerSpec controllerSpec) → MachineBuilderJS`

- **参数表**：`controllerSpec`（`MachineControllerSpec`）— 已构建的完整控制器规格。
- **返回**：当前构建器。
- **抛出**：源码不立即检查 `null`；传入 `null` 会回退到自动派生规格。
- **默认值**：由纹理、朝向和 tooltip 字段派生。
- **示例**：

```javascript
const spec = Java.loadClass("cn.howxu.mmcr.api.machine.MachineControllerSpec").defaultsFor(api.id("example:press"))
machine.controllerSpec(spec)
```

##### `controllerTooltip(String... lines) → MachineBuilderJS`

- **参数表**：`lines`（`String...`）— tooltip 翻译键或文本行；空白行和 `null` 项忽略。
- **返回**：当前构建器。
- **抛出**：无额外异常；数组为 `null` 时不添加内容。
- **默认值**：空列表。
- **示例**：

```javascript
machine.controllerTooltip("tooltip.example.press.0", "tooltip.example.press.1")
```

##### `controllerTextures(String front, String otherFive) → MachineBuilderJS`

- **参数表**：`front`（`String`）— 前面纹理 ID；`otherFive`（`String`）— 其余方向共用的纹理 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：任一 ID 无法解析。
- **默认值**：未调用时使用控制器默认纹理。
- **示例**：

```javascript
machine.controllerTextures("example:block/controller_front", "example:block/controller_side")
```

##### `controllerFrontTexture(String texture) → MachineBuilderJS`

- **参数表**：`texture`（`String`）— 前面纹理资源 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析。
- **默认值**：控制器规格的默认前面纹理。
- **示例**：

```javascript
machine.controllerFrontTexture("example:block/controller_front")
```

##### `controllerSideTexture(String texture) → MachineBuilderJS`

- **参数表**：`texture`（`String`）— 侧面纹理资源 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析。
- **默认值**：控制器规格的默认侧面纹理。
- **示例**：

```javascript
machine.controllerSideTexture("example:block/controller_side")
```

##### `controllerTopTexture(String texture) → MachineBuilderJS`

- **参数表**：`texture`（`String`）— 顶面纹理资源 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析。
- **默认值**：控制器规格的默认顶面纹理。
- **示例**：

```javascript
machine.controllerTopTexture("example:block/controller_top")
```

##### `controllerBottomTexture(String texture) → MachineBuilderJS`

- **参数表**：`texture`（`String`）— 底面纹理资源 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析。
- **默认值**：控制器规格的默认底面纹理。
- **示例**：

```javascript
machine.controllerBottomTexture("example:block/controller_bottom")
```

##### `allowVerticalFacing() → MachineBuilderJS`

- **参数表**：无。
- **返回**：启用竖直朝向并返回构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.allowVerticalFacing()
```

##### `allowVerticalFacing(boolean allow) → MachineBuilderJS`

- **参数表**：`allow`（`boolean`）— 是否允许竖直朝向。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.allowVerticalFacing(true)
```

##### `fullyRotationallySymmetric() → MachineBuilderJS`

- **参数表**：无。
- **返回**：启用完全旋转对称并返回构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.fullyRotationallySymmetric()
```

##### `fullyRotationallySymmetric(boolean symmetric) → MachineBuilderJS`

- **参数表**：`symmetric`（`boolean`）— 是否完全旋转对称。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.fullyRotationallySymmetric(true)
```

##### `requireVerticalFacing() → MachineBuilderJS`

- **参数表**：无。
- **返回**：启用强制竖直朝向并返回构建器，同时自动启用 `allowVerticalFacing`。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.requireVerticalFacing()
```

##### `requireVerticalFacing(boolean required) → MachineBuilderJS`

- **参数表**：`required`（`boolean`）— 是否强制竖直朝向；为 `true` 时会同步打开允许竖直朝向。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.requireVerticalFacing(true)
```

##### `machineBasicBlock(String blockId) → MachineBuilderJS`

- **参数表**：`blockId`（`String`）— 基础外观方块 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析；实际资源不存在时由外观系统处理。
- **默认值**：外观默认基础方块。
- **示例**：

```javascript
machine.machineBasicBlock("minecraft:smooth_basalt")
```

##### `controllerBaseTexture(String textureId) → MachineBuilderJS`

- **参数表**：`textureId`（`String`）— 控制器底纹理 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析。
- **默认值**：由基础外观方块派生。
- **示例**：

```javascript
machine.controllerBaseTexture("example:block/controller_base")
```

##### `formedPortBaseTexture(String textureId) → MachineBuilderJS`

- **参数表**：`textureId`（`String`）— 成型端口底纹理 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析。
- **默认值**：由基础外观方块派生。
- **示例**：

```javascript
machine.formedPortBaseTexture("example:block/formed_port_base")
```

##### `appearance(String machineBasicBlock) → MachineBuilderJS`

- **参数表**：`machineBasicBlock`（`String`）— 基础外观方块 ID。
- **返回**：等价于 `machineBasicBlock(machineBasicBlock)`。
- **抛出**：同 `machineBasicBlock(String)`。
- **默认值**：外观默认值。
- **示例**：

```javascript
machine.appearance("minecraft:green_terracotta")
```

#### 行为回调

##### `recipeBehavior(Consumer<MachineBehaviorBuilderJS> builder) → MachineBuilderJS`

- **参数表**：`builder`（`Consumer<MachineBehaviorBuilderJS>`）— 配方行为配置回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：已经选择 tick 行为；回调为空也会被拒绝。
- **默认值**：`RecipeBehavior.defaults()`。
- **示例**：

```javascript
machine.recipeBehavior(behavior => behavior.recipeTick(ctx => {
    ctx.machineContext().screenText().append("operation", "example:running", Text.literal("Running"))
}))
```

##### `tickBehavior(Consumer<MachineBehaviorBuilderJS> builder) → MachineBuilderJS`

- **参数表**：`builder`（`Consumer<MachineBehaviorBuilderJS>`）— 直接服务器 tick 行为配置回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：已经选择配方行为，或已经配置 `preServerTick`/`postServerTick`；回调为空也会被拒绝。
- **默认值**：不调用时使用默认配方行为。
- **示例**：

```javascript
machine.tickBehavior(behavior => behavior.serverTick(ctx => {
    if (!ctx.isDue(20)) return
    const plan = ctx.ioPlan()
}))
```

##### `preServerTick(Consumer<MachineBehaviorContext> callback) → MachineBuilderJS`

- **参数表**：`callback`（`Consumer<MachineBehaviorContext>`）— 配方机器每次服务器 tick 前执行的回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：已选择 tick 行为；`NullPointerException`：回调为空。
- **默认值**：沿用配方行为的默认 pre-tick 回调。
- **示例**：

```javascript
machine.preServerTick(ctx => {
    const storage = ctx.dataStorage()
})
```

##### `postServerTick(Consumer<MachineBehaviorContext> callback) → MachineBuilderJS`

- **参数表**：`callback`（`Consumer<MachineBehaviorContext>`）— 配方机器每次服务器 tick 后执行的回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：已选择 tick 行为；`NullPointerException`：回调为空。
- **默认值**：沿用配方行为的默认 post-tick 回调。
- **示例**：

```javascript
machine.postServerTick(ctx => {
    ctx.screenText().append("operation", "example:tick", Text.literal("Ticked"))
})
```

#### 网络

##### `networkInterface(int maxCount, int maxConnections) → MachineBuilderJS`

- **参数表**：`maxCount`（`int`）— 机器允许的网络接口数量；`maxConnections`（`int`）— 每个网络接口允许的连接数上限。
- **返回**：当前构建器。
- **抛出**：非法负值或超出注册器约束时在创建/注册机器时抛异常。
- **默认值**：两个值均为 `0`，表示未启用网络接口能力。
- **示例**：

```javascript
machine.networkInterface(1, 16)
```

##### `allowNetworkMachine(String machineId) → MachineBuilderJS`

- **参数表**：`machineId`（`String`）— 允许与本机器通信的目标机器 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析；网络注册器可能在最终构建时校验目标。
- **默认值**：白名单为空。
- **示例**：

```javascript
machine.allowNetworkMachine("example:network_center")
```

##### `requestProcess(String requestId, RequestProcess process) → MachineBuilderJS`

- **参数表**：`requestId`（`String`）— 请求 ID；`process`（`RequestProcess`）— 四参数回调 `(body, request, senderStorage, receiverStorage)`。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 非法或同一 ID 重复注册；`NullPointerException`：处理器为空。
- **默认值**：没有处理器。
- **示例**：

```javascript
machine.requestProcess("example:report", (body, request, senderStorage, receiverStorage) => {
    if (receiverStorage == null) return
    receiverStorage.set("power", body.get("power").orElse(null))
})
```

##### `requestFailed(String requestId, RequestFailed failure) → MachineBuilderJS`

- **参数表**：`requestId`（`String`）— 请求 ID；`failure`（`RequestFailed`）— 四参数失败回调 `(body, request, senderStorage, reason)`。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 非法或重复；`NullPointerException`：失败处理器为空。
- **默认值**：没有失败处理器。
- **示例**：

```javascript
machine.requestFailed("example:report", (body, request, senderStorage, reason) => {
    console.warn(String(reason))
})
```

#### 音效

##### `runningSound(String soundId) → MachineBuilderJS`

- **参数表**：`soundId`（`String`）— 已注册声音事件 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析；`ApiRegistrationException`：声音 ID 未通过 MMCR 声音校验。
- **默认值**：无运行音效。
- **示例**：

```javascript
machine.runningSound("minecraft:block.furnace.fire_crackle")
```

##### `finishSound(String soundId) → MachineBuilderJS`

- **参数表**：`soundId`（`String`）— 已注册声音事件 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析；`ApiRegistrationException`：声音 ID 未注册或不合法。
- **默认值**：无完成音效。
- **示例**：

```javascript
machine.finishSound("minecraft:entity.ender_dragon.growl")
```

#### 智能接口

##### `smartInterface(String type, float defaultValue) → SmartInterfaceTypeBuilderJS`

- **参数表**：`type`（`String`）— 智能接口类型名；`defaultValue`（`float`）— 默认值，同时作为该重载的最低值。
- **返回**：临时的 `SmartInterfaceTypeBuilderJS`，必须调用 `end()` 才会加入机器。
- **抛出**：类型为空或最终范围非法时在 `end()`/机器构建阶段抛 `IllegalArgumentException`。
- **默认值**：最大值为 `Float.MAX_VALUE`，优先级为 `0`，值类型为 `float`。
- **示例**：

```javascript
machine.smartInterface("speed", 1).end()
```

##### `smartInterface(String type, float minValue, float maxValue) → SmartInterfaceTypeBuilderJS`

- **参数表**：`type`（`String`）— 类型名；`minValue`（`float`）— 最小值；`maxValue`（`float`）— 最大值。
- **返回**：配置智能接口类型的临时构建器。
- **抛出**：`IllegalArgumentException`：范围不是有限数、最小值大于最大值或整数类型范围含小数。
- **默认值**：默认值为 `minValue`，优先级 `0`，值类型 `float`。
- **示例**：

```javascript
machine.smartInterface("temperature", 0, 100).priority(5).end()
```

##### `shareSmartInterface() → MachineBuilderJS`

- **参数表**：无。
- **返回**：启用多线程实例共享智能接口并返回构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.shareSmartInterface()
```

##### `shareSmartInterface(boolean share) → MachineBuilderJS`

- **参数表**：`share`（`boolean`）— 是否共享智能接口值。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
machine.shareSmartInterface(true)
```

##### `durationByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **参数表**：`type`（`String`）— 智能接口类型；`min`/`max`（`float`）— 生效区间；`atMin`/`atMax`（`float`）— 区间端点对应的时长修饰值。
- **返回**：当前构建器；默认操作为 `MULTIPLY`。
- **抛出**：范围和接口类型不合法时在机器定义构建阶段抛异常。
- **默认值**：操作为乘法。
- **示例**：

```javascript
machine.durationByInterface("temperature", 0, 100, 2, 0.5)
```

##### `durationByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **参数表**：前五个参数同上；`operation`（`RecipeModifier.Operation`）— `ADD`、`MULTIPLY`、`SUBTRACT` 或 `DIVIDE`。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：智能接口范围无效；`operation` 为空或不支持。
- **默认值**：无额外默认；不调用五参数重载时必须显式传操作。
- **示例**：

```javascript
const Operation = Java.loadClass("cn.howxu.mmcr.api.publicapi.recipe.modifier.RecipeModifier$Operation")
machine.durationByInterface("temperature", 0, 100, 2, 0.5, Operation.ADD)
```

##### `energyByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **参数表**：`type`、`min`、`max`、`atMin`、`atMax`— 同 `durationByInterface`，目标为能量消耗。
- **返回**：当前构建器，默认操作为乘法。
- **抛出**：范围或类型非法时在最终构建阶段抛异常。
- **默认值**：操作为 `MULTIPLY`。
- **示例**：

```javascript
machine.energyByInterface("mode", 1, 3, 1, 2)
```

##### `energyByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **参数表**：前五个参数同上；`operation`（`RecipeModifier.Operation`）— 运算方式。
- **返回**：当前构建器。
- **抛出**：操作或范围非法时抛异常。
- **默认值**：无额外默认。
- **示例**：

```javascript
const Operation = Java.loadClass("cn.howxu.mmcr.api.publicapi.recipe.modifier.RecipeModifier$Operation")
machine.energyByInterface("mode", 1, 3, 1, 2, Operation.MULTIPLY)
```

##### `itemInputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **参数表**：`type`、`min`、`max`、`atMin`、`atMax`— 智能接口区间及物品输入数量修饰值。
- **返回**：当前构建器；目标为物品输入数量，操作固定为乘法。
- **抛出**：范围或类型非法时在最终构建阶段抛异常。
- **默认值**：不影响输入概率。
- **示例**：

```javascript
machine.itemInputByInterface("batch", 1, 4, 1, 4)
```

##### `itemOutputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **参数表**：`type`、`min`、`max`、`atMin`、`atMax`— 物品输出数量修饰参数。
- **返回**：当前构建器；操作固定为乘法。
- **抛出**：范围或类型非法时抛异常。
- **默认值**：不影响输出概率。
- **示例**：

```javascript
machine.itemOutputByInterface("batch", 1, 4, 1, 4)
```

##### `itemInputChanceByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **参数表**：`type`、`min`、`max`、`atMin`、`atMax`— 物品输入概率修饰参数。
- **返回**：当前构建器；默认操作为乘法，且只作用于输入概率。
- **抛出**：范围或类型非法时抛异常。
- **默认值**：操作为 `MULTIPLY`。
- **示例**：

```javascript
machine.itemInputChanceByInterface("quality", 0, 1, 0.5, 1)
```

##### `itemInputChanceByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **参数表**：前五个参数同上；`operation`（`RecipeModifier.Operation`）— 概率运算方式。
- **返回**：当前构建器。
- **抛出**：操作、范围或类型非法时抛异常。
- **默认值**：无额外默认。
- **示例**：

```javascript
const Operation = Java.loadClass("cn.howxu.mmcr.api.publicapi.recipe.modifier.RecipeModifier$Operation")
machine.itemInputChanceByInterface("quality", 0, 1, 0.5, 1, Operation.ADD)
```

##### `itemOutputChanceByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **参数表**：`type`、`min`、`max`、`atMin`、`atMax`— 物品输出概率修饰参数。
- **返回**：当前构建器；默认操作为乘法，作用于输出概率。
- **抛出**：范围或类型非法时抛异常。
- **默认值**：操作为 `MULTIPLY`。
- **示例**：

```javascript
machine.itemOutputChanceByInterface("quality", 0, 1, 0.5, 1)
```

##### `itemOutputChanceByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **参数表**：前五个参数同上；`operation`（`RecipeModifier.Operation`）— 概率运算方式。
- **返回**：当前构建器。
- **抛出**：操作、范围或类型非法时抛异常。
- **默认值**：无额外默认。
- **示例**：

```javascript
const Operation = Java.loadClass("cn.howxu.mmcr.api.publicapi.recipe.modifier.RecipeModifier$Operation")
machine.itemOutputChanceByInterface("quality", 0, 1, 0.5, 1, Operation.MULTIPLY)
```

##### `fluidInputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **参数表**：`type`、`min`、`max`、`atMin`、`atMax`— 流体输入数量修饰参数。
- **返回**：当前构建器；操作固定为乘法。
- **抛出**：范围或类型非法时抛异常。
- **默认值**：不影响流体输入概率。
- **示例**：

```javascript
machine.fluidInputByInterface("pressure", 0, 100, 1, 2)
```

##### `fluidOutputByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **参数表**：`type`、`min`、`max`、`atMin`、`atMax`— 流体输出数量修饰参数。
- **返回**：当前构建器；操作固定为乘法。
- **抛出**：范围或类型非法时抛异常。
- **默认值**：不影响流体输出概率。
- **示例**：

```javascript
machine.fluidOutputByInterface("pressure", 0, 100, 1, 2)
```

##### `fluidInputChanceByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **参数表**：`type`、`min`、`max`、`atMin`、`atMax`— 流体输入概率修饰参数。
- **返回**：当前构建器；默认操作为乘法。
- **抛出**：范围或类型非法时抛异常。
- **默认值**：操作为 `MULTIPLY`。
- **示例**：

```javascript
machine.fluidInputChanceByInterface("quality", 0, 1, 0.5, 1)
```

##### `fluidInputChanceByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **参数表**：前五个参数同上；`operation`（`RecipeModifier.Operation`）— 概率运算方式。
- **返回**：当前构建器。
- **抛出**：操作或范围非法时抛异常。
- **默认值**：无额外默认。
- **示例**：

```javascript
const Operation = Java.loadClass("cn.howxu.mmcr.api.publicapi.recipe.modifier.RecipeModifier$Operation")
machine.fluidInputChanceByInterface("quality", 0, 1, 0.5, 1, Operation.MULTIPLY)
```

##### `fluidOutputChanceByInterface(String type, float min, float max, float atMin, float atMax) → MachineBuilderJS`

- **参数表**：`type`、`min`、`max`、`atMin`、`atMax`— 流体输出概率修饰参数。
- **返回**：当前构建器；默认操作为乘法。
- **抛出**：范围或类型非法时抛异常。
- **默认值**：操作为 `MULTIPLY`。
- **示例**：

```javascript
machine.fluidOutputChanceByInterface("quality", 0, 1, 0.5, 1)
```

##### `fluidOutputChanceByInterface(String type, float min, float max, float atMin, float atMax, RecipeModifier.Operation operation) → MachineBuilderJS`

- **参数表**：前五个参数同上；`operation`（`RecipeModifier.Operation`）— 概率运算方式。
- **返回**：当前构建器。
- **抛出**：操作或范围非法时抛异常。
- **默认值**：无额外默认。
- **示例**：

```javascript
const Operation = Java.loadClass("cn.howxu.mmcr.api.publicapi.recipe.modifier.RecipeModifier$Operation")
machine.fluidOutputChanceByInterface("quality", 0, 1, 0.5, 1, Operation.ADD)
```

#### 端口谓词与等级快捷

`MachineBuilderJS` 也提供了与 `MachineStructureBuilderJS` 同名的端口谓词和等级工厂方法，便于在 `set(symbol, value)` 中直接组合字符匹配。

| 方法 | 返回 | 描述 |
| --- | --- | --- |
| `anyOfItemInput()` | `BlockPredicate` | 所有物品输入端口并集。 |
| `anyOfItemOutput()` | `BlockPredicate` | 所有物品输出端口并集。 |
| `anyOfFluidInput()` | `BlockPredicate` | 所有流体输入端口并集。 |
| `anyOfFluidOutput()` | `BlockPredicate` | 所有流体输出端口并集。 |
| `anyOfEnergyInput()` | `BlockPredicate` | 所有能量输入端口并集。 |
| `anyOfEnergyOutput()` | `BlockPredicate` | 所有能量输出端口并集。 |
| `parallelControllers()` | `BlockPredicate` | 所有并行控制器并集。 |
| `smartInterfaceBlock()` | `BlockPredicate` | 内置智能接口。 |
| `anyOfPort(String...)` | `BlockPredicate` | 指定端口 ID 列表的并集。 |
| `anyOfPort(Identifier...)` | `BlockPredicate` | 同上，使用 `Identifier` 数组。 |
| `anyOfPort(publicapi.BlockPredicate...)` | `BlockPredicate` | 使用 Java 公共 API 谓词列表的并集。 |
| `smartInterface()` | `BlockPredicate` | 内置智能接口谓词。 |
| `dataStorage()` | `BlockPredicate` | 内置数据存储谓词。 |
| `itemInputTier(String)` | `PortTierRequirementSpec` | 物品输入端口的等级规格。 |
| `itemOutputTier(String)` | `PortTierRequirementSpec` | 物品输出端口的等级规格。 |
| `fluidInputTier(String)` | `PortTierRequirementSpec` | 流体输入端口的等级规格。 |
| `fluidOutputTier(String)` | `PortTierRequirementSpec` | 流体输出端口的等级规格。 |
| `energyInputTier(String)` | `PortTierRequirementSpec` | 能量输入端口的等级规格。 |
| `energyOutputTier(String)` | `PortTierRequirementSpec` | 能量输出端口的等级规格。 |

这些方法都不需要额外参数，等级/端口 ID 必须指向已注册端口；端口 ID 不存在时 `PortTierRequirementSpec.from` 会抛 `IllegalArgumentException`。

#### 终结

##### `createObject() → MachineRegistration`

- **参数表**：无。
- **返回**：不可变 `MachineRegistration`，包含已配置的全部机器属性。
- **抛出**：`IllegalArgumentException`/`IllegalStateException`：见上文角色/主机/模块互斥规则；`ApiRegistrationException`：声音 ID 非法或机器注册窗口已关闭。
- **默认值**：无显式默认；未设置字段使用构建器初始化值。
- **示例**：

```javascript
const registration = machine.createObject()
```

##### `registerObject() → void`

- **参数表**：无。
- **返回**：无；调用 `createObject()` 并将结果提交到当前机器注册窗口。
- **抛出**：同 `createObject()`；机器注册窗口已冻结时抛 `ApiRegistrationException`。
- **默认值**：无。
- **示例**：

```javascript
machine.registerObject()
```

##### `register() → MachineBuilderJS`

- **参数表**：无。
- **返回**：当前构建器，便于继续链式调用。
- **抛出**：同 `registerObject()`。
- **默认值**：无。
- **示例**：

```javascript
event.createMachine("example:press").displayNameKey("machine.example.press").register()
```

### `SmartInterfaceTypeBuilderJS`

> 内部类，定义在 `cn.howxu.mmcr.compat.kubejs.MachineBuilderJS.SmartInterfaceTypeBuilderJS`。由 `MachineBuilderJS.smartInterface(...)` 返回，必须调用 `end()` 回到父构建器。

**字段**

| 名称 | 类型 | 描述 |
|------|------|------|
| `type` | `String` | 智能接口类型名。 |
| `minValue` | `float` | 最小值。 |
| `maxValue` | `float` | 最大值。 |
| `priority` | `int` | 优先级，初始 `0`。 |
| `valueType` | `SmartInterfaceType.ValueType` | 值类型，初始 `FLOAT`。 |

**方法**

#### `priority(int priority) → SmartInterfaceTypeBuilderJS`

- **参数表**：`priority`（`int`）— 数值越大越优先。
- **返回**：当前内部构建器。
- **抛出**：无。
- **默认值**：`0`。
- **示例**：

```javascript
machine.smartInterface("speed", 0, 100).priority(5).end()
```

#### `valueType(String valueType) → SmartInterfaceTypeBuilderJS`

- **参数表**：`valueType`（`String`）— `float`（默认）、`int` 或 `integer`；不区分大小写。
- **返回**：当前内部构建器。
- **抛出**：`IllegalArgumentException`：字符串不是允许值；`null` 或空白字符串回退到 `FLOAT`。
- **默认值**：`FLOAT`。
- **示例**：

```javascript
machine.smartInterface("mode", 1, 3).valueType("integer").end()
```

#### `end() → MachineBuilderJS`

- **参数表**：无。
- **返回**：父 `MachineBuilderJS`。
- **抛出**：`IllegalArgumentException`：范围或类型非法时由机器定义阶段抛异常。
- **默认值**：无。
- **示例**：

```javascript
machine.smartInterface("mode", 1, 3).priority(1).valueType("integer").end()
```

**注意事项**

- 智能接口的最小值必须小于等于最大值；`INTEGER` 类型还要求最值和默认值是整数。
- `end()` 之前的 `priority`/`valueType` 顺序任意；多次调用同一方法以最后一次为准。
- 同一 `MachineBuilderJS` 上 `smartInterface(type, ...)` 可以调用多次，类型名重复时由机器注册阶段拒绝。

## 6. 结构构建器

### `MachineStructureBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.MachineStructureBuilderJS` 是 `MMCRServerEventJS.createStructure` 返回的服务器端结构注册构建器。

**字段**

| 名称 | 类型 | 默认值 | 描述 |
|------|------|------|------|
| `pattern` | `BlockArray` | 空 | 主结构模式，由 `pattern(...)` 累积。 |
| `portRequirements` | `PortRequirementSpec` | `PortRequirementSpec.none()` | 主结构端口数量需求。 |
| `portTierRequirements` | `PortTierRequirementSpec` | `PortTierRequirementSpec.none()` | 主结构端口最低等级。 |
| `dynamicPatterns` | `List<DynamicPatternSpec>` | 空 | 动态模式列表。 |
| `requirements` | `MachineStructureRequirements` | `EMPTY` | 累积的结构需求（等级槽位、修饰器等）。 |

**创建**

公开构造器为 `MachineStructureBuilderJS(Identifier id)` 和 `MachineStructureBuilderJS(String id)`。脚本通常通过 `event.createStructure(id)` 调用。

**方法**

#### 扁平式声明

##### `stateSensitive() → MachineStructureBuilderJS`

- **参数表**：无。
- **返回**：当前构建器；结构匹配变为状态敏感。
- **抛出**：无。
- **默认值**：`false`（状态不敏感）。
- **示例**：

```javascript
event.createStructure("example:press").stateSensitive()
```

##### `stateInsensitive() → MachineStructureBuilderJS`

- **参数表**：无。
- **返回**：当前构建器；显式关闭状态敏感。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
event.createStructure("example:press").stateInsensitive()
```

##### `pattern(String... rows) → MachineStructureBuilderJS`

- **参数表**：`rows`（`String...`）— 同一 z 层的多个 y 行；同一字符串内每个字符对应一行从左到右的不同 x 位置。空字符串作 0 字符处理。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：每行宽度不一致或行数与已有层不同。
- **默认值**：无；首次调用前 `pattern` 为空 `BlockArray`。
- **示例**：

```javascript
event.createStructure("example:press")
    .pattern("CCC", "CBC", "CCC")
```

##### `patternAll(List<List<String>> slices) → MachineStructureBuilderJS`

- **参数表**：`slices`（`List<List<String>>`）— 多个 z 层。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：列表为空或每层之间尺寸不一致。
- **默认值**：无。
- **示例**：

```javascript
structure.patternAll([
    ["CCC"],
    ["CBC"],
    ["CCC"]
])
```

##### `set(String symbol, Object value) → MachineStructureBuilderJS`

- **参数表**：`symbol`（`String`）— 单字符模式符号；`value`（`Object`）— `String`（方块 ID）、`Block`、`BlockState`、内部 `BlockPredicate` 或 `LevelSlot`。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：符号不是单个非空格字符；`IllegalStateException`：符号在当前模式中不存在。
- **默认值**：未绑定字符保持为 `air()`。
- **示例**：

```javascript
structure.set("C", "minecraft:iron_block")
structure.set("L", api.levelSlot("example:coil"))
```

##### `controller(String symbol) → MachineStructureBuilderJS`

- **参数表**：`symbol`（`String`）— 控制器的字符。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：符号不是单个非空格字符；`IllegalStateException`：符号未在 `pattern(...)` 中出现。
- **默认值**：未设置控制器时按模式自动派生。
- **示例**：

```javascript
structure.controller("C")
```

##### `modifier(String symbol, ModifierUse use) → MachineStructureBuilderJS`

- **参数表**：`symbol`（`String`）— 模式字符；`use`（`ModifierUse`）— 通过 `KubeJSApi.modifierUse(...)` 创建的修饰器使用规则。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：符号不是单个非空格字符；`NullPointerException`：`use` 为空。
- **默认值**：无。
- **示例**：

```javascript
const api = event.getAPI()
structure.modifier("M", api.modifierUse("example:speed", api.block("minecraft:diamond_block")))
```

##### `portRequirements(PortRequirementSpec requirements) → MachineStructureBuilderJS`

- **参数表**：`requirements`（`PortRequirementSpec`）— 通常由 `api.portRequirements(...)` 创建。
- **返回**：当前构建器。
- **抛出**：`NullPointerException`：`requirements` 为空。
- **默认值**：`PortRequirementSpec.none()`。
- **示例**：

```javascript
structure.portRequirements(api.portRequirements({ item_input_bus: 1 }))
```

##### `portTierRequirements(PortTierRequirementSpec requirements) → MachineStructureBuilderJS`

- **参数表**：`requirements`（`PortTierRequirementSpec`）— 通常由 `api.portTierRequirements(...)` 创建。
- **返回**：当前构建器。
- **抛出**：`NullPointerException`：`requirements` 为空。
- **默认值**：`PortTierRequirementSpec.none()`。
- **示例**：

```javascript
structure.portTierRequirements(api.portTierRequirements(["item_input_bus>=normal"]))
```

##### `dynamicPattern(DynamicPatternSpec pattern) → MachineStructureBuilderJS`

- **参数表**：`pattern`（`DynamicPatternSpec`）— 动态模式定义。
- **返回**：当前构建器。
- **抛出**：`NullPointerException`：`pattern` 为空。
- **默认值**：空列表。
- **示例**：

```javascript
structure.dynamicPattern(myDynamicPattern)
```

##### `build() → void`

- **参数表**：无。
- **返回**：无；把当前结构登记到服务端 KubeJS 内容事务。
- **抛出**：`IllegalStateException`：当前不在 KubeJS 服务器脚本加载事务中；其他结构校验失败由事务处理。
- **默认值**：无。
- **示例**：

```javascript
event.createStructure("example:press")
    .pattern("C")
    .set("C", "minecraft:iron_block")
    .controller("C")
    .build()
```

#### 阶段式声明（高级）

`MachineStructureBuilderJS` 同时支持阶段式声明，对应 Java 端的 `fullStructure`/`expandStructure`/`extension`；阶段式 API 与扁平式 API 不能混用。

##### `fullStructure(PortRequirementSpec ports, PortTierRequirementSpec tiers, List<DynamicPatternSpec> dynamicPatterns, MachineStructureRequirements requirements) → MachineStructureBuilderJS`

- **参数表**：`ports`/`tiers`/`dynamicPatterns`/`requirements`（对应 `MachineStructureBuilder` 的 `fullStructure(...)` 形参）— 都允许 `null`，表示该项无新增。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：已切换为回调式 API；事务或 `MachineStructureRequirements` 校验失败向上传递。
- **默认值**：把当前 `pattern/requirements` 与新增 `requirements` 合并。
- **示例**：

```javascript
structure.fullStructure(api.portRequirements({}), api.portTierRequirements([]), [], MachineStructureRequirements.EMPTY)
```

##### `fullStructure(BlockArray pattern) → MachineStructureBuilderJS`

- **参数表**：`pattern`（`BlockArray`）— 完整结构的方块数组。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：已切换为回调式 API；`NullPointerException`：`pattern` 为空。
- **默认值**：端口和动态模式需求为空。
- **示例**：

```javascript
structure.fullStructure(blockArray)
```

##### `fullStructure(BlockArray pattern, PortRequirementSpec ports, PortTierRequirementSpec tiers, List<DynamicPatternSpec> dynamicPatterns, MachineStructureRequirements requirements) → MachineStructureBuilderJS`

- **参数表**：见方法名；都允许 `null`。
- **返回**：当前构建器。
- **抛出**：同前两个重载。
- **默认值**：合并当前需求。
- **示例**：

```javascript
structure.fullStructure(alt, null, null, [], MachineStructureRequirements.EMPTY)
```

##### `mainStructure(Consumer<MachineStructureStageBuilderJS> consumer) → MachineStructureBuilderJS`

- **参数表**：`consumer`（`Consumer<MachineStructureStageBuilderJS>`）— 主结构配置回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：已经声明过主结构或混用了扁平式 API；`NullPointerException`：消费者为空。
- **默认值**：无。
- **示例**：

```javascript
structure.mainStructure(stage => stage
    .pattern("CCC", "CBC", "CCC")
    .set("C", "minecraft:iron_block")
    .controller("C")
)
```

##### `expandStructure(Consumer<MachineStructureStageBuilderJS> consumer) → MachineStructureBuilderJS`

- **参数表**：`consumer`（`Consumer<MachineStructureStageBuilderJS>`）— 扩展结构配置回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：未先调用 `mainStructure` 或混用了扁平式 API；`NullPointerException`：消费者为空。
- **默认值**：无。
- **示例**：

```javascript
structure.mainStructure(stage => stage.pattern("X").set("X", "minecraft:iron_block").controller("X"))
       .expandStructure(stage => stage.pattern("XX").set("X", "minecraft:iron_block"))
```

##### `extension(BlockArray pattern) → MachineStructureBuilderJS`

- **参数表**：`pattern`（`BlockArray`）— 附属结构方块数组。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：未先声明主结构或混用了回调式 API；`NullPointerException`：`pattern` 为空。
- **默认值**：端口和动态模式需求为空。
- **示例**：

```javascript
structure.extension(extensionBlockArray)
```

##### `extension(BlockArray pattern, PortRequirementSpec ports, PortTierRequirementSpec tiers, List<DynamicPatternSpec> dynamicPatterns, MachineStructureRequirements requirements) → MachineStructureBuilderJS`

- **参数表**：与 `fullStructure` 类似，标记为 `@HideFromJS`。
- **返回**：当前构建器。
- **抛出**：同其他 `extension` 重载。
- **默认值**：无。
- **示例**：

```javascript
structure.extension(ext, null, null, [], MachineStructureRequirements.EMPTY)
```

##### `extension(Consumer<MachineStructureStageBuilderJS> consumer) → MachineStructureBuilderJS`

- **参数表**：`consumer`（`Consumer<MachineStructureStageBuilderJS>`）— 附属结构配置回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：未先声明主结构或混用了扁平式 API；`NullPointerException`：消费者为空。
- **默认值**：无。
- **示例**：

```javascript
structure.extension(stage => stage.pattern("Y").set("Y", "minecraft:iron_block"))
```

#### 端口谓词与等级快捷

`MachineStructureBuilderJS` 同样暴露一组与 `KubeJSInterfaceHelpers` 同名的端口谓词与等级工厂方法：

| 方法 | 返回 | 描述 |
| --- | --- | --- |
| `anyOfItemInput()` | `BlockPredicate` | 所有物品输入端口并集。 |
| `anyOfItemOutput()` | `BlockPredicate` | 所有物品输出端口并集。 |
| `anyOfFluidInput()` | `BlockPredicate` | 所有流体输入端口并集。 |
| `anyOfFluidOutput()` | `BlockPredicate` | 所有流体输出端口并集。 |
| `anyOfEnergyInput()` | `BlockPredicate` | 所有能量输入端口并集。 |
| `anyOfEnergyOutput()` | `BlockPredicate` | 所有能量输出端口并集。 |
| `anyOfUpgradeBus()` | `BlockPredicate` | 所有升级总线并集。 |
| `anyOfPort(String...)` | `BlockPredicate` | 指定端口 ID 列表的并集。 |
| `anyOfPort(Identifier...)` | `BlockPredicate` | 同上，使用 `Identifier` 数组。 |
| `anyOfPort(publicapi.BlockPredicate...)` | `BlockPredicate` | 使用 Java 公共 API 谓词列表的并集。 |
| `factoryController()` | `BlockPredicate` | 内置工厂控制器。 |
| `parallelControllers()` | `BlockPredicate` | 所有并行控制器。 |
| `smartInterface()` | `BlockPredicate` | 内置智能接口。 |
| `dataStorage()` | `BlockPredicate` | 内置数据存储。 |
| `itemInputTier(String)` | `PortTierRequirementSpec` | 物品输入端口的等级规格。 |
| `itemOutputTier(String)` | `PortTierRequirementSpec` | 物品输出端口的等级规格。 |
| `fluidInputTier(String)` | `PortTierRequirementSpec` | 流体输入端口的等级规格。 |
| `fluidOutputTier(String)` | `PortTierRequirementSpec` | 流体输出端口的等级规格。 |
| `energyInputTier(String)` | `PortTierRequirementSpec` | 能量输入端口的等级规格。 |
| `energyOutputTier(String)` | `PortTierRequirementSpec` | 能量输出端口的等级规格。 |

#### 终结

##### `createObject() → MachineStructureDefinition`

- **参数表**：无。
- **返回**：不可变 `MachineStructureDefinition`；可在不调用 `build()` 的情况下使用，例如单元测试。
- **抛出**：`IllegalStateException`：声明顺序与 API 模式冲突；`NullPointerException`：必填字段为空。
- **默认值**：没有声明时退化为一个空模式声明。
- **示例**：

```javascript
const definition = builder.createObject()
```

#### `PatternEntry`

> 内部 record `cn.howxu.mmcr.compat.kubejs.MachineStructureBuilderJS.PatternEntry`，保留在 KubeJS 端供已绑定 `BlockPredicate` 的字符值在 `set(symbol, value)` 中复用。

**字段**

| 名称 | 类型 | 描述 |
|------|------|------|
| `base` | `BlockPredicate` | 字符对应的基础方块谓词。 |

**示例**

```javascript
const entry = new (Java.loadClass("cn.howxu.mmcr.compat.kubejs.MachineStructureBuilderJS$PatternEntry"))(api.block("minecraft:iron_block"))
structure.set("X", entry)
```

**注意事项**

- 模式字符必须是非空格单个字符；空格表示该位置不校验。
- 不同 `pattern(...)` 调用必须保持相同宽度与高度，否则抛 `IllegalArgumentException`。
- 阶段式 API 与扁平式 API 不能混用；一旦调用 `mainStructure` / `expandStructure` / `extension(Consumer)`，再调用 `pattern`/`set`/`controller`/`modifier` 也会抛 `IllegalStateException`。
- `fullStructure(BlockArray)`/`extension(BlockArray)` 系列只暴露 `BlockArray` / 公共 API 类型；纯 `BlockArray.Builder` 调用需要 Java 互操作。
- `PatternEntry` 不会修改需求（修饰器、等级槽位）；如果需要把同一字符绑定为多种替换，请多次调用 `modifier(symbol, use)`。

### `MachineStructureStageBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.MachineStructureStageBuilderJS` 是 `mainStructure` / `expandStructure` / `extension` 回调收到的临时构建器，只作用于当前阶段。

**字段**

| 名称 | 类型 | 默认值 | 描述 |
|------|------|------|------|
| `portRequirements` | `PortRequirementSpec` | `none` | 当前阶段端口数量需求。 |
| `portTierRequirements` | `PortTierRequirementSpec` | `none` | 当前阶段端口最低等级。 |
| `dynamicPatterns` | `List<DynamicPatternSpec>` | 空 | 当前阶段动态模式列表。 |

**方法**

#### `pattern(String... rows) → MachineStructureStageBuilderJS`

- **参数表**：`rows`（`String...`）— 同一 z 层的多个 y 行。
- **返回**：当前阶段构建器。
- **抛出**：`IllegalArgumentException`：行宽度或高度不一致。
- **默认值**：无。
- **示例**：

```javascript
mainStructure(stage => stage.pattern("CCC", "CBC", "CCC"))
```

#### `patternAll(List<List<String>> slices) → MachineStructureStageBuilderJS`

- **参数表**：`slices`（`List<List<String>>`）— 多个 z 层。
- **返回**：当前阶段构建器。
- **抛出**：`IllegalArgumentException`：列表为空或层之间尺寸不一致。
- **默认值**：无。
- **示例**：

```javascript
mainStructure(stage => stage.patternAll([
    ["CCC"],
    ["CBC"],
    ["CCC"]
]))
```

#### `set(String symbol, Object value) → MachineStructureStageBuilderJS`

- **参数表**：`symbol`（`String`）— 字符；`value`（`Object`）— `String`、`Block`、`BlockState`、内部 `BlockPredicate` 或 `LevelSlot`。
- **返回**：当前阶段构建器。
- **抛出**：`IllegalArgumentException`：字符非法；`IllegalStateException`：字符未在 `pattern(...)` 中出现。
- **默认值**：未绑定字符保持为 `air()`。
- **示例**：

```javascript
mainStructure(stage => stage.set("C", "minecraft:iron_block"))
```

#### `modifier(String symbol, ModifierUse use) → MachineStructureStageBuilderJS`

- **参数表**：`symbol`（`String`）— 字符；`use`（`ModifierUse`）— 通过 `KubeJSApi.modifierUse(...)` 创建。
- **返回**：当前阶段构建器。
- **抛出**：`IllegalArgumentException`：字符非法；`NullPointerException`：`use` 为空。
- **默认值**：无。
- **示例**：

```javascript
mainStructure(stage => stage.modifier("M", api.modifierUse("example:speed", api.block("minecraft:diamond_block"))))
```

#### `controller(String symbol) → MachineStructureStageBuilderJS`

- **参数表**：`symbol`（`String`）— 控制器字符。
- **返回**：当前阶段构建器。
- **抛出**：`IllegalArgumentException`：字符非法；`IllegalStateException`：字符未在 `pattern(...)` 中出现。
- **默认值**：未调用时按模式自动派生。
- **示例**：

```javascript
mainStructure(stage => stage.controller("C"))
```

#### `portRequirements(PortRequirementSpec requirements) → MachineStructureStageBuilderJS`

- **参数表**：`requirements`（`PortRequirementSpec`）— 当前阶段端口需求。
- **返回**：当前阶段构建器。
- **抛出**：`NullPointerException`：`requirements` 为空。
- **默认值**：`PortRequirementSpec.none()`。
- **示例**：

```javascript
mainStructure(stage => stage.portRequirements(api.portRequirements({ item_input_bus: 1 })))
```

#### `portTierRequirements(PortTierRequirementSpec requirements) → MachineStructureStageBuilderJS`

- **参数表**：`requirements`（`PortTierRequirementSpec`）— 当前阶段端口最低等级。
- **返回**：当前阶段构建器。
- **抛出**：`NullPointerException`：`requirements` 为空。
- **默认值**：`PortTierRequirementSpec.none()`。
- **示例**：

```javascript
mainStructure(stage => stage.portTierRequirements(api.portTierRequirements(["item_input_bus>=normal"])))
```

#### `dynamicPattern(DynamicPatternSpec pattern) → MachineStructureStageBuilderJS`

- **参数表**：`pattern`（`DynamicPatternSpec`）— 动态模式。
- **返回**：当前阶段构建器。
- **抛出**：`NullPointerException`：`pattern` 为空。
- **默认值**：空列表。
- **示例**：

```javascript
mainStructure(stage => stage.dynamicPattern(myDynamicPattern))
```

#### 端口谓词与等级快捷

阶段构建器同样暴露与顶层构建器同名的 14 个端口谓词与 6 个等级工厂方法；返回与 `MachineStructureBuilderJS` 中的同名方法一致。

#### `build() → MachineStructureDefinition.Declaration`

- **参数表**：无。
- **返回**：一个 `Declaration` 对象；父 `MachineStructureBuilderJS` 会把它封装为 `fullStructure` 或 `extension` 阶段。
- **抛出**：`IllegalStateException`：缺少数组尺寸校验或 `set` 不一致；`NullPointerException`：必要数据缺失。
- **默认值**：未绑定字符保持为 `air()`。
- **示例**：

```javascript
// 在 MachineStructureBuilderJS.mainStructure(...) 回调内
stage.pattern("X").set("X", "minecraft:iron_block").controller("X")
```

**注意事项**

- 阶段构建器在 `mainStructure` / `expandStructure` / `extension` 回调执行完后即失效。
- 同一个阶段内的字符必须通过 `pattern(...)` 声明，缺失字符不能 `set`。
- 等级槽位通过 `set(symbol, levelSlot)` 自动登记在当前阶段的 `requirements` 中。

## 7. 配方

### `MachineRecipeSchema`

> `cn.howxu.mmcr.compat.kubejs.MachineRecipeSchema` 是 KubeJS 端数据驱动配方的 RecipeSchema 定义。通过 `event.custom({ type: 'mmcr:machine_recipe', ... })` 触发。RecipeKey 与 `RecipeFunction` 在编译期注入到 `RecipeSchemaRegistry` 中，运行时通过 `MachineRecipeSchema.register(registry)` 注册。

**字段**

| 名称 | 类型 | 描述 |
|------|------|------|
| `JSON_ELEMENT` | `RecipeComponent<JsonElement>` | 通用 JSON 元素组件，作为 `requirements`/`outputs`/`modifiers`/`level_requirements` 的列表项类型。 |
| `MACHINE` | `RecipeKey<String>` | `machine` 字段，期望 `namespace:path` 格式。 |
| `TICK_TIME` | `RecipeKey<Integer>` | `tick_time` 字段，非负整数。 |
| `OUTPUTS` | `RecipeKey<List<JsonElement>>` | `outputs` 字段，列表项是 JSON 元素；与 `requirements` 共享同类型。 |
| `MODIFIERS` | `RecipeKey<List<JsonElement>>` | `modifiers` 字段，列表项是 JSON 元素；被 `exclude()` 标记为不在结果中包含。 |
| `REQUIREMENTS` | `RecipeKey<List<JsonElement>>` | `requirements` 字段，包含在结果中。 |
| `LEVEL_REQUIREMENTS` | `RecipeKey<List<JsonElement>>` | `level_requirements` 字段，被 `exclude()` 标记。 |
| `MAX_THREADS` | `RecipeKey<Integer>` | `max_threads` 字段，默认 `1`。 |
| `PARALLELIZED` | `RecipeKey<Boolean>` | `parallelized` 字段，默认 `false`。 |
| `CANCEL_IF_PER_TICK_FAILS` | `RecipeKey<Boolean>` | `cancelIfPerTickFails` 字段，默认 `false`。 |
| `ALLOW_PARTIAL_OUTPUTS` | `RecipeKey<Boolean>` | `allow_partial_outputs` 字段，默认 `false`。 |
| `SCHEMA` | `RecipeSchema` | KubeJS 端 `mmcr:machine_recipe` 配方类型的 `RecipeSchema` 实例。 |

**方法**

#### `register(RecipeSchemaRegistry registry) → void`

- **参数表**：`registry`（`RecipeSchemaRegistry`）— KubeJS 在 `registerRecipeSchemas` 阶段传入。
- **返回**：无；把 `SCHEMA` 注册到 `registry` 中。
- **抛出**：注册器内部异常。
- **默认值**：无。
- **示例**：仅在插件初始化阶段使用，脚本不需要直接调用。

#### `SCHEMA` 上注册的可调用函数

数据驱动配方的 `RecipeSchema` 上额外注册了以下函数，方法签名见下表：

| 名称 | 参数 | 行为 |
| --- | --- | --- |
| `allowPartialOutputs()` | 无 | 写入 JSON 字段 `allow_partial_outputs=true`。 |
| `smartInterfaceInput(type, value)` | `(String, float)` | 追加一条输入型智能接口需求到 `requirements`。 |
| `smartInterfaceInputRange(type, min, max)` | `(String, float, float)` | 追加一条范围型输入智能接口需求。 |
| `smartInterfaceOutput(type, value)` | `(String, float)` | 追加一条输出型智能接口需求。 |
| `custom(typeId, io, payload)` | `(String, String, JsonElement)` | 通过 `RecipeApi.custom(...)` 校验并把 codec 编码后的需求或输出追加到对应数组。`io` 取 `input` 或 `output`。 |
| `requiredHost(hostId)` | `(String)` | 把宿主机器 ID 追加到 `required_host_ids`。 |
| `requiresLevel(typeId, levelId)` | `(String, String)` | 校验等级与类型匹配，并把 `{type, level}` 追加到 `level_requirements`。 |

**注意事项**

- `allowPartialOutputs` 函数无参，作用与设置字段 `allow_partial_outputs: true` 等价；字段默认 `false`。
- `custom` 函数对 `input` 方向或未注册的输出类型使用 `MachineRecipeConverter.toRequirement`，对已注册的输出类型使用 `MachineRecipeConverter.toOutput`。
- `requiresLevel` 在等级类型不匹配时抛 `IllegalArgumentException`，由 KubeJS 捕获并写入配方控制台。

#### 数据驱动配方最小示例

```javascript
ServerEvents.recipes(event => {
    event.custom({
        type: "mmcr:machine_recipe",
        machine: "example:press",
        tick_time: 200,
        requirements: [
            { type: "minecraft:item", io: "input", item: "minecraft:iron_ingot", count: 1 },
            { type: "minecraft:item", io: "output", stack: { id: "minecraft:iron_nugget", count: 10 } },
            { type: "neoforge:energy", io: "input", fe_per_tick: 32 }
        ]
    }).id("example:press_recipe_1")
})
```

#### 数据驱动配方 + schema 函数

```javascript
ServerEvents.recipes(event => {
    event.custom({
        type: "mmcr:machine_recipe",
        machine: "example:press",
        tick_time: 200,
        requirements: [
            { type: "minecraft:item", io: "input", item: "minecraft:iron_ingot", count: 1 },
            { type: "minecraft:item", io: "output", stack: { id: "minecraft:iron_nugget", count: 10 } }
        ]
    })
    .allowPartialOutputs()
    .smartInterfaceInput("mode", 1)
    .requiredHost("example:host_machine")
    .id("example:press_recipe_with_smart_interface")
})
```

### `MachineRecipeBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.MachineRecipeBuilderJS` 是编程式配方构建器，由 `MachineRecipeBuilderJS(String/Identifier id)` 显式创建或通过测试代码使用。脚本中通常直接用数据驱动配方；该构建器用于需要在 `MMCREvents.server` 阶段按算法组装配方的场景。

**字段**

| 名称 | 类型 | 默认值 | 描述 |
|------|------|------|------|
| `machineId` | `Identifier` | `null` | 目标机器 ID，必须在注册后已存在。 |
| `tickTime` | `int` | `40` | 配方总耗时（tick）。 |
| `inputs` | `List<MachineIngredient>` | 空 | 编程式输入集合。 |
| `outputs` | `List<ItemStack>` | 空 | 编程式物品输出集合。 |
| `outputChances` | `List<Float>` | 空 | 与 `outputs` 一一对应的概率。 |
| `fluidOutputs` | `List<FluidStack>` | 空 | 编程式流体输出集合。 |
| `conditions` | `List<RecipeModifier>` | 空 | 配方修饰器。 |
| `priority` | `int` | `0` | 配方优先级。 |
| `maxThreads` | `int` | `1` | 最大线程数。 |
| `parallelized` | `boolean` | `false` | 是否可使用并行控制器。 |
| `deriveRequirements` | `boolean` | `true` | 是否根据 `inputs/outputs/fluidOutputs` 自动派生需求。 |
| `energyPerTick` | `int` | `0` | 每 tick 能量。 |
| `cancelIfPerTickFails` | `boolean` | `false` | 每 tick 失败时是否取消配方。 |
| `levelRequirements` | `List<LevelRequirement>` | 空 | 等级要求。 |
| `requiredHostIds` | `Set<Identifier>` | 空 | 宿主要求。 |
| `requirements` | `List<MachineRequirement>` | 空 | 编程式需求集合。 |
| `customOutputs` | `List<MachineOutput>` | 空 | 编程式自定义输出集合。 |
| `allowPartialOutputs` | `boolean` | `false` | 是否允许部分输出。 |
| `id` | `Identifier` | 构造时设置 | 配方 ID。 |

**创建**

公开构造器为 `MachineRecipeBuilderJS(String id)` 和 `MachineRecipeBuilderJS(Identifier id)`。

**方法**

#### 标识与机器

##### `id(String id) → MachineRecipeBuilderJS`

- **参数表**：`id`（`String`）— 配方 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 无法解析。
- **默认值**：构造时传入的 ID。
- **示例**：

```javascript
const builder = new MachineRecipeBuilderJS("example:press_recipe").id("example:press_recipe_2")
```

##### `machine(String id) → MachineRecipeBuilderJS`

- **参数表**：`id`（`String`）— 机器注册 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：机器未注册或 ID 解析失败。
- **默认值**：未设置时 `createObject()` 会抛 `IllegalStateException`。
- **示例**：

```javascript
builder.machine("example:press")
```

##### `tickTime(int tickTime) → MachineRecipeBuilderJS`

- **参数表**：`tickTime`（`int`）— 配方总耗时（tick）。
- **返回**：当前构建器。
- **抛出**：负数会在 `createObject()` 阶段抛 `IllegalArgumentException`。
- **默认值**：`40`。
- **示例**：

```javascript
builder.tickTime(200)
```

##### `priority(int priority) → MachineRecipeBuilderJS`

- **参数表**：`priority`（`int`）— 配方优先级。
- **返回**：当前构建器。
- **抛出**：负数会在 `createObject()` 阶段抛 `IllegalArgumentException`。
- **默认值**：`0`。
- **示例**：

```javascript
builder.priority(5)
```

##### `maxThreads(int maxThreads) → MachineRecipeBuilderJS`

- **参数表**：`maxThreads`（`int`）— 配方最大线程数。
- **返回**：当前构建器。
- **抛出**：负数会在 `createObject()` 阶段抛 `IllegalArgumentException`。
- **默认值**：`1`。
- **示例**：

```javascript
builder.maxThreads(2)
```

##### `parallelized() → MachineRecipeBuilderJS`

- **参数表**：无。
- **返回**：当前构建器，并启用并行处理。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
builder.parallelized()
```

##### `parallelized(boolean parallelized) → MachineRecipeBuilderJS`

- **参数表**：`parallelized`（`boolean`）— 是否可使用并行控制器。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
builder.parallelized(true)
```

##### `deriveRequirements(boolean deriveRequirements) → MachineRecipeBuilderJS`

- **参数表**：`deriveRequirements`（`boolean`）— 是否在 `createObject()` 中根据 `inputs/outputs/fluidOutputs` 派生 `MachineRequirement`。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`true`。
- **示例**：

```javascript
builder.deriveRequirements(false)
```

##### `conditions(List<RecipeModifier> conditions) → MachineRecipeBuilderJS`

- **参数表**：`conditions`（`List<RecipeModifier>`）— 配方修饰器列表。
- **返回**：当前构建器；替换已有条件。
- **抛出**：无额外异常。
- **默认值**：空列表。
- **示例**：

```javascript
const api = MMCR.getAPI()
builder.conditions([api.modifier("duration", "input", 0.5, "multiply", false)])
```

##### `energyPerTick(int energyPerTick) → MachineRecipeBuilderJS`

- **参数表**：`energyPerTick`（`int`）— 每 tick 消耗的 FE。
- **返回**：当前构建器；自动加一条能量输入需求到派生需求。
- **抛出**：负数会在 `createObject()` 阶段抛 `IllegalArgumentException`。
- **默认值**：`0`。
- **示例**：

```javascript
builder.energyPerTick(32)
```

##### `cancelIfPerTickFails(boolean cancelIfPerTickFails) → MachineRecipeBuilderJS`

- **参数表**：`cancelIfPerTickFails`（`boolean`）— 每 tick 失败时是否取消配方。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
builder.cancelIfPerTickFails(true)
```

##### `allowPartialOutputs() → MachineRecipeBuilderJS`

- **参数表**：无。
- **返回**：当前构建器，并允许部分输出。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
builder.allowPartialOutputs()
```

##### `allowPartialOutputs(boolean allowPartialOutputs) → MachineRecipeBuilderJS`

- **参数表**：`allowPartialOutputs`（`boolean`）— 是否允许部分输出。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`false`。
- **示例**：

```javascript
builder.allowPartialOutputs(true)
```

#### 输入

##### `inputs(List<MachineIngredient> inputs) → MachineRecipeBuilderJS`

- **参数表**：`inputs`（`List<MachineIngredient>`）— 输入集合。
- **返回**：当前构建器；替换已有输入。
- **抛出**：负数量在 `createObject()` 阶段抛 `IllegalArgumentException`。
- **默认值**：空列表。
- **示例**：

```javascript
builder.inputs([api.itemInput("minecraft:iron_ingot", 1, 1.0)])
```

##### `addInput(MachineIngredient input) → MachineRecipeBuilderJS`

- **参数表**：`input`（`MachineIngredient`）— 单条输入。
- **返回**：当前构建器。
- **抛出**：负数量在 `createObject()` 阶段抛 `IllegalArgumentException`。
- **默认值**：无。
- **示例**：

```javascript
builder.addInput(api.fluidInput("minecraft:water", 1000))
```

##### `itemInput(String itemId, int count) → MachineRecipeBuilderJS`

- **参数表**：`itemId`（`String`）— 物品 ID；`count`（`int`）— 数量。
- **返回**：当前构建器；消耗概率为 `1`，组件谓词为空。
- **抛出**：物品未知或 `count < 0` 时抛 `IllegalArgumentException`。
- **默认值**：无。
- **示例**：

```javascript
builder.itemInput("minecraft:iron_ingot", 1)
```

##### `tagInput(String tagId, int count) → MachineRecipeBuilderJS`

- **参数表**：`tagId`（`String`）— 物品标签 ID；`count`（`int`）— 数量。
- **返回**：当前构建器。
- **抛出**：标签 ID 非法或标签解析失败时抛 `IllegalArgumentException`。
- **默认值**：无。
- **示例**：

```javascript
builder.tagInput("c:ingots/iron", 1)
```

##### `itemInputWithComponents(String itemId, int count, JsonElement components) → MachineRecipeBuilderJS`

- **参数表**：`itemId`（`String`）— 物品 ID；`count`（`int`）— 数量；`components`（`JsonElement`）— 数据组件谓词 JSON。
- **返回**：当前构建器；消耗概率为 `1`。
- **抛出**：物品未知或 `components` 无法解析时抛异常。
- **默认值**：无。
- **示例**：

```javascript
builder.itemInputWithComponents("minecraft:diamond_sword", 1, { "minecraft:custom_name": { text: "Marked" } })
```

##### `itemInputWithComponents(String itemId, int count, JsonElement components, float consumeChance) → MachineRecipeBuilderJS`

- **参数表**：前三个参数同上；`consumeChance`（`float`）— 每次消耗概率。
- **返回**：当前构建器。
- **抛出**：与上同。
- **默认值**：无。
- **示例**：

```javascript
builder.itemInputWithComponents("minecraft:diamond_sword", 1, { "minecraft:enchantments": { "minecraft:sharpness": 4 } }, 0.75)
```

##### `tagInputWithComponents(String tagId, int count, JsonElement components, float consumeChance) → MachineRecipeBuilderJS`

- **参数表**：`tagId`（`String`）— 标签 ID；`count`（`int`）— 数量；`components`（`JsonElement`）— 数据组件谓词；`consumeChance`（`float`）— 消耗概率。
- **返回**：当前构建器。
- **抛出**：标签或组件 JSON 解析失败时抛异常。
- **默认值**：无。
- **示例**：

```javascript
builder.tagInputWithComponents("c:tools", 1, {}, 0.5)
```

##### `notConsumableItemInput(String itemId, int count) → MachineRecipeBuilderJS`

- **参数表**：`itemId`（`String`）— 物品 ID；`count`（`int`）— 数量。
- **返回**：当前构建器；消耗概率为 `0`。
- **抛出**：物品未知或数量非法。
- **默认值**：无。
- **示例**：

```javascript
builder.notConsumableItemInput("minecraft:iron_ingot", 1)
```

##### `chancedItemInput(String itemId, int count, float consumeChance) → MachineRecipeBuilderJS`

- **参数表**：`itemId`（`String`）— 物品 ID；`count`（`int`）— 数量；`consumeChance`（`float`）— 消耗概率。
- **返回**：当前构建器。
- **抛出**：物品未知或数量非法。
- **默认值**：无。
- **示例**：

```javascript
builder.chancedItemInput("minecraft:gravel", 1, 0.5)
```

#### 输出

##### `outputs(List<ItemStack> outputs) → MachineRecipeBuilderJS`

- **参数表**：`outputs`（`List<ItemStack>`）— 物品输出集合。
- **返回**：当前构建器；替换已有物品输出、概率与组件输出。`null` 项被忽略。
- **抛出**：负数量由 `createObject()` 校验。
- **默认值**：空列表。
- **示例**：

```javascript
builder.outputs([Item.of("minecraft:iron_nugget", 10)])
```

##### `addOutput(ItemStack output, float chance) → MachineRecipeBuilderJS`

- **参数表**：`output`（`ItemStack`）— 物品栈；`chance`（`float`）— 输出概率。
- **返回**：当前构建器。
- **抛出**：负概率在构造时被规范化为 `0`，`NaN` 规范化为 `1`。
- **默认值**：无。
- **示例**：

```javascript
builder.addOutput(Item.of("minecraft:iron_nugget", 10), 0.5)
```

##### `fluidOutputs(List<FluidStack> fluidOutputs) → MachineRecipeBuilderJS`

- **参数表**：`fluidOutputs`（`List<FluidStack>`）— 流体输出集合。
- **返回**：当前构建器；替换已有流体输出。
- **抛出**：负量在 `createObject()` 阶段抛 `IllegalArgumentException`。
- **默认值**：空列表。
- **示例**：

```javascript
builder.fluidOutputs([api.fluidStack("minecraft:water", 1000)])
```

##### `itemOutput(String itemId, int count) → MachineRecipeBuilderJS`

- **参数表**：`itemId`（`String`）— 物品 ID；`count`（`int`）— 数量。
- **返回**：当前构建器；概率为 `1`。
- **抛出**：物品未知或数量非法。
- **默认值**：无。
- **示例**：

```javascript
builder.itemOutput("minecraft:iron_nugget", 10)
```

##### `chancedItemOutput(String itemId, int count, float chance) → MachineRecipeBuilderJS`

- **参数表**：`itemId`（`String`）— 物品 ID；`count`（`int`）— 数量；`chance`（`float`）— 概率。
- **返回**：当前构建器。
- **抛出**：物品未知或数量非法。
- **默认值**：无。
- **示例**：

```javascript
builder.chancedItemOutput("minecraft:diamond", 1, 0.25)
```

##### `itemOutputWithComponents(String itemId, int count, JsonElement components) → MachineRecipeBuilderJS`

- **参数表**：`itemId`（`String`）— 物品 ID；`count`（`int`）— 数量；`components`（`JsonElement`）— 完整数据组件 JSON。
- **返回**：当前构建器；推迟到 `createObject()`/配方事件中再解码。
- **抛出**：`IllegalArgumentException`：`count < 0`；`IllegalStateException`：未在 `RecipesKubeEvent` 上下文中调用导致无法解码。
- **默认值**：无。
- **示例**：

```javascript
builder.itemOutputWithComponents("minecraft:diamond_sword", 1, { "minecraft:custom_name": { text: "Marked" } })
```

#### 需求与自定义

##### `requirements(List<MachineRequirement> requirements) → MachineRecipeBuilderJS`

- **参数表**：`requirements`（`List<MachineRequirement>`）— 显式需求列表。
- **返回**：当前构建器；替换已有需求。
- **抛出**：无额外异常。
- **默认值**：空列表。
- **示例**：

```javascript
builder.requirements([api.energyRequirement(api.recipeIO().INPUT, 32)])
```

##### `addRequirement(MachineRequirement requirement) → MachineRecipeBuilderJS`

- **参数表**：`requirement`（`MachineRequirement`）— 单条需求。
- **返回**：当前构建器。
- **抛出**：无额外异常。
- **默认值**：无。
- **示例**：

```javascript
builder.addRequirement(api.fluidInputRequirement("minecraft:water", 1000))
```

##### `custom(String typeId, RecipeIo io, JsonElement payload) → MachineRecipeBuilderJS`

- **参数表**：`typeId`（`String`）— 已注册类型 ID；`io`（`RecipeIo`）— `api.recipeIO().INPUT` 或 `OUTPUT`；`payload`（`JsonElement`）— 该类型 codec 的 JSON。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：类型未注册或 payload 不符合 codec。
- **默认值**：无。
- **示例**：

```javascript
const payload = { type: "mmcr:fuel", io: "input", burn_time: 200 }
builder.custom("mmcr:fuel", api.recipeIO().INPUT, payload)
```

#### 智能接口

##### `smartInterfaceInput(String type, float value) → MachineRecipeBuilderJS`

- **参数表**：`type`（`String`）— 智能接口类型；`value`（`float`）— 输入目标值。
- **返回**：当前构建器。
- **抛出**：智能接口需求构造器在类型或数值无效时抛异常。
- **默认值**：无。
- **示例**：

```javascript
builder.smartInterfaceInput("mode", 1)
```

##### `smartInterfaceInput(String type, float minValue, float maxValue) → MachineRecipeBuilderJS`

- **参数表**：前两个参数同上；`minValue`/`maxValue`（`float`）— 范围端点。
- **返回**：当前构建器。
- **抛出**：范围或类型非法时抛异常。
- **默认值**：无。
- **示例**：

```javascript
builder.smartInterfaceInput("temperature", 10, 50)
```

##### `smartInterfaceOutput(String type, float value) → MachineRecipeBuilderJS`

- **参数表**：`type`（`String`）— 智能接口类型；`value`（`float`）— 输出目标值。
- **返回**：当前构建器。
- **抛出**：类型或数值非法时抛异常。
- **默认值**：无。
- **示例**：

```javascript
builder.smartInterfaceOutput("mode", 2)
```

#### 等级与宿主

##### `requiresLevel(String typeId, String levelId) → MachineRecipeBuilderJS`

- **参数表**：`typeId`（`String`）— 等级类型 ID；`levelId`（`String`）— 具体等级 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：等级不存在或等级不属于该类型。
- **默认值**：空列表。
- **示例**：

```javascript
builder.requiresLevel("example:coil", "example:coil_iron")
```

##### `requiredHost(String hostId) → MachineRecipeBuilderJS`

- **参数表**：`hostId`（`String`）— 宿主机 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 非法。
- **默认值**：空集合。
- **示例**：

```javascript
builder.requiredHost("example:host_machine")
```

##### `requiredHosts(String... hostIds) → MachineRecipeBuilderJS`

- **参数表**：`hostIds`（`String...`）— 多条宿主机 ID。
- **返回**：当前构建器。
- **抛出**：非空 ID 非法时抛 `IllegalArgumentException`。
- **默认值**：空集合。
- **示例**：

```javascript
builder.requiredHosts("example:host_a", "example:host_b")
```

#### 终结

##### `createObject() → MachineRecipe`

- **参数表**：无。
- **返回**：不可变 `MachineRecipe`。
- **抛出**：`IllegalStateException`：未调用 `machine()`；`IllegalArgumentException`：`tickTime < 1`、`energyPerTick < 0`、物品/流体数量为负或物品输出数量为负；`IllegalStateException`：组件输出在 `RecipesKubeEvent` 上下文外调用。
- **默认值**：根据 `deriveRequirements` 派生 `MachineRequirement`。
- **示例**：

```javascript
const recipe = builder.createObject()
```

##### `build() → void`

- **参数表**：无。
- **返回**：无；把配方登记到当前服务端内容事务；事务外则通过 `RecipeRegistry.registerStatic` 静态注册。
- **抛出**：同 `createObject()`。
- **默认值**：无。
- **示例**：

```javascript
builder.build()
```

**注意事项**

- 数据驱动配方（`event.custom({...})`）与 `MachineRecipeBuilderJS` 都通过同一份 `MachineRecipe`；脚本通常优先使用前者。
- 编程式构建器只在 `MMCREvents.server` 回调内 `build()`，事务外调用会走静态注册路径。
- 同一 ID 在数据驱动配方、编程式配方、Java 公共 API 三条路径之间全局唯一。

## 8. 行为构建器

### `MachineBehaviorBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.MachineBehaviorBuilderJS` 是 `MachineBuilderJS.recipeBehavior(...)` 与 `tickBehavior(...)` 回调收到的行为收集器。

**字段**

| 名称 | 类型 | 描述 |
|------|------|------|
| `kind` | `MachineBehavior.Kind` | 决定可用的回调集合；构造时由 `MachineBuilderJS` 设置。 |

**方法**

#### `idleStart(Consumer<MachineBehaviorContext> callback) → MachineBehaviorBuilderJS`

- **参数表**：`callback`（`Consumer<MachineBehaviorContext>`）— 配方机器空闲期开始的回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：当前不是配方行为；`NullPointerException`：回调为空。
- **默认值**：配方行为默认为空。
- **示例**：

```javascript
machine.recipeBehavior(behavior => behavior.idleStart(ctx => {
    ctx.screenText().append("operation", "example:idle", Text.literal("Idle"))
}))
```

#### `idleEnd(Consumer<MachineBehaviorContext> callback) → MachineBehaviorBuilderJS`

- **参数表**：`callback`（`Consumer<MachineBehaviorContext>`）— 配方机器空闲期结束的回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：当前不是配方行为；`NullPointerException`：回调为空。
- **默认值**：配方行为默认为空。
- **示例**：

```javascript
behavior.idleEnd(ctx => {
    ctx.screenText().remove("operation", "example:idle")
})
```

#### `beforeStart(Consumer<RecipeStartContext> callback) → MachineBehaviorBuilderJS`

- **参数表**：`callback`（`Consumer<RecipeStartContext>`）— 配方启动前的回调，可读取或替换需求。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：当前不是配方行为；`NullPointerException`：回调为空。
- **默认值**：配方行为默认为空。
- **示例**：

```javascript
behavior.beforeStart(ctx => {
    if (ctx.requirements().isEmpty()) ctx.cancel()
})
```

#### `recipeTick(Consumer<RecipeTickContext> callback) → MachineBehaviorBuilderJS`

- **参数表**：`callback`（`Consumer<RecipeTickContext>`）— 配方执行中的每个 tick 回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：当前不是配方行为；`NullPointerException`：回调为空。
- **默认值**：配方行为默认为空。
- **示例**：

```javascript
behavior.recipeTick(ctx => {
    ctx.machineContext().screenText().append("operation", "example:tick", Text.literal("Working"))
})
```

#### `beforeFinish(Consumer<RecipeFinishContext> callback) → MachineBehaviorBuilderJS`

- **参数表**：`callback`（`Consumer<RecipeFinishContext>`）— 配方完成输出前的回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：当前不是配方行为；`NullPointerException`：回调为空。
- **默认值**：配方行为默认为空。
- **示例**：

```javascript
behavior.beforeFinish(ctx => {
    if (ctx.requestedParallelism() < 1) ctx.cancel()
})
```

#### `serverTick(Consumer<TickBehaviorContext> callback) → MachineBehaviorBuilderJS`

- **参数表**：`callback`（`Consumer<TickBehaviorContext>`）— 直接服务器 tick 回调。
- **返回**：当前构建器。
- **抛出**：`IllegalStateException`：当前不是 tick 行为；`NullPointerException`：回调为空。
- **默认值**：tick 行为默认为空。
- **示例**：

```javascript
machine.tickBehavior(behavior => behavior.serverTick(ctx => {
    if (ctx.isDue(40)) {
        const plan = ctx.ioPlan()
    }
}))
```

#### `build() → MachineBehavior`

- **参数表**：无。
- **返回**：配方或 tick 行为的不可变实例，供 `MachineBuilderJS.createObject()` 嵌入机器。
- **抛出**：`IllegalStateException`：调用方式不符合 `kind` 要求。
- **默认值**：无。
- **示例**：

```javascript
const behavior = behaviorBuilder.build()
```

**注意事项**

- `RecipeStartContext`、`RecipeTickContext`、`RecipeFinishContext`、`TickBehaviorContext` 等参数类型需要通过 `Java.loadClass` 或 KubeJS 自动解析传入。
- `RecipeTickContext` 不提供 `ioPlan`；只有 `TickBehaviorContext` 暴露 IO 计划。
- 配方回调中的 `ctx.machineContext()` 返回 `MachineBehaviorContext`，可访问 `dataStorage`、`screenText`、`jadeText`、`level`、`controllerPos()` 等运行时状态。

## 9. 等级与等级类型

### `LevelTypeBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.LevelTypeBuilderJS` 是 `MMCRStartupEventJS.createLevelType` 返回的等级类型构建器。

**字段**

| 名称 | 类型 | 默认值 | 描述 |
|------|------|------|------|
| `displayNameKey` | `String` | `null` | 等级类型显示名翻译键。 |

**方法**

#### `displayName(String displayName) → LevelTypeBuilderJS`

- **参数表**：`displayName`（`String`）— 翻译键或文本。
- **返回**：当前构建器；写入 `displayNameKey`。
- **抛出**：无。
- **默认值**：未设置时使用类型 ID 字符串作为翻译键。
- **示例**：

```javascript
event.createLevelType("example:coil").displayName("level.example.coil")
```

#### `displayNameKey(String key) → LevelTypeBuilderJS`

- **参数表**：`key`（`String`）— 翻译键。
- **返回**：当前构建器；`displayName` 的别名。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
event.createLevelType("example:coil").displayNameKey("level.example.coil")
```

#### `createObject() → LevelType`

- **参数表**：无。
- **返回**：不可变 `LevelType`。
- **抛出**：无额外异常。
- **默认值**：未设置显示名时回退到类型 ID 字符串。
- **示例**：

```javascript
const type = levelTypeBuilder.createObject()
```

#### `registerObject() → void`

- **参数表**：无。
- **返回**：无；把 `LevelType` 注册到当前结构注册窗口。
- **抛出**：重复或窗口已冻结时抛 `ApiRegistrationException`。
- **默认值**：无。
- **示例**：

```javascript
levelTypeBuilder.registerObject()
```

#### `register() → LevelTypeBuilderJS`

- **参数表**：无。
- **返回**：当前构建器。
- **抛出**：同 `registerObject()`。
- **默认值**：无。
- **示例**：

```javascript
event.createLevelType("example:coil").displayNameKey("level.example.coil").register()
```

### `MachineLevelBuilderJS`

> `cn.howxu.mmcr.compat.kubejs.MachineLevelBuilderJS` 是 `MMCRStartupEventJS.createLevel` 返回的具体等级构建器。

**字段**

| 名称 | 类型 | 默认值 | 描述 |
|------|------|------|------|
| `typeId` | `Identifier` | `null` | 父等级类型 ID。 |
| `priority` | `int` | `0` | 等级优先级。 |
| `state` | `BlockState` | `null` | 等级表示方块。 |
| `modifier` | `LevelModifier` | `IDENTITY` | 等级修饰器。 |

**方法**

#### `type(String typeId) → MachineLevelBuilderJS`

- **参数表**：`typeId`（`String`）— 已注册等级类型 ID。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：ID 非法。
- **默认值**：未设置时 `createObject()` 抛 `IllegalStateException`。
- **示例**：

```javascript
event.createLevel("example:coil_iron").type("example:coil")
```

#### `priority(int priority) → MachineLevelBuilderJS`

- **参数表**：`priority`（`int`）— 等级优先级，数值越大越优先。
- **返回**：当前构建器。
- **抛出**：无。
- **默认值**：`0`。
- **示例**：

```javascript
event.createLevel("example:coil_iron").type("example:coil").priority(0)
```

#### `state(Object state) → MachineLevelBuilderJS`

- **参数表**：`state`（`Object`）— `String`（方块 ID）或 `BlockState`。
- **返回**：当前构建器；字符串形式使用方块默认状态。
- **抛出**：`IllegalArgumentException`：方块未知或参数类型不是字符串/`BlockState`。
- **默认值**：未设置时 `createObject()` 抛 `IllegalStateException`。
- **示例**：

```javascript
event.createLevel("example:coil_iron").state("minecraft:iron_block")
```

#### `modifier(Map<String, Object> modifier) → MachineLevelBuilderJS`

- **参数表**：`modifier`（`Map<String,Object>`）— 修饰参数；支持 `durationMultiplier`、`energyMultiplier`、`outputMultiplier`、`parallelismBonus`、`factoryThreadBonus`。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：任何乘数字段 `<= 0`。
- **默认值**：`LevelModifier.IDENTITY`。
- **示例**：

```javascript
event.createLevel("example:coil_iron")
    .modifier({ durationMultiplier: 0.95, energyMultiplier: 0.95, parallelismBonus: 4 })
```

#### `createObject() → MachineLevel`

- **参数表**：无。
- **返回**：不可变 `MachineLevel`。
- **抛出**：`IllegalStateException`：`type` 或 `state` 未设置。
- **默认值**：`modifier` 为 `IDENTITY`。
- **示例**：

```javascript
const level = levelBuilder.createObject()
```

#### `registerObject() → void`

- **参数表**：无。
- **返回**：无；把 `MachineLevel` 注册到当前结构注册窗口。
- **抛出**：重复或窗口已冻结时抛 `ApiRegistrationException`；类型未注册时由注册表拒绝。
- **默认值**：无。
- **示例**：

```javascript
levelBuilder.registerObject()
```

#### `register() → MachineLevelBuilderJS`

- **参数表**：无。
- **返回**：当前构建器。
- **抛出**：同 `registerObject()`。
- **默认值**：无。
- **示例**：

```javascript
event.createLevel("example:coil_iron")
    .type("example:coil")
    .state("minecraft:iron_block")
    .register()
```

**注意事项**

- 等级类型应先于具体等级注册；先注册具体等级会因为找不到类型而被拒绝。
- 等级的 `priority` 不影响结构匹配合法性，只决定玩家放置多个等级时的优先级与连接方向。
- `modifier` 字段中的乘数必须严格大于 `0`；`parallelismBonus` 与 `factoryThreadBonus` 缺省按 `IDENTITY` 取值。

## 10. 控制器屏幕文本

### `ControllerScreenTextEventJS`

> `cn.howxu.mmcr.compat.kubejs.ControllerScreenTextEventJS` 是 `MMCRStartupEventJS.registerControllerScreenText` 回调收到的事件对象，提供在控制器屏幕上添加、修改或删除文本行的能力。

**字段**

| 名称 | 类型 | 描述 |
|------|------|------|
| `context` | `ControllerRuntimeContext` | 控制器运行时上下文，`MachineBehaviorBuilderJS` 不可见，仅内部桥接。 |

**方法**

#### `machineId() → Identifier`

- **参数表**：无。
- **返回**：当前屏幕所属机器的注册 ID。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
event.registerControllerScreenText("example:press", text => {
    const id = text.machineId()
})
```

#### `controllerPos() → BlockPos`

- **参数表**：无。
- **返回**：当前控制器方块位置。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
const pos = text.controllerPos()
```

#### `append(String scope, String lineId, Component text) → void`

- **参数表**：`scope`（`String`）— `controller` 或 `operation`；`lineId`（`String`）— 必须带命名空间，例如 `example:status`；`text`（`Component`）— 屏幕文本。
- **返回**：无。
- **抛出**：`IllegalArgumentException`：`scope` 为空或不在允许列表；`lineId` 为空、缺命名空间或缺路径；`text` 为 `null`。
- **默认值**：无。
- **示例**：

```javascript
text.append("controller", "example:status", Text.literal("Idle"))
```

#### `appendAfter(String scope, String lineId, String afterLineId, Component text) → void`

- **参数表**：`scope`（`String`）— `controller` 或 `operation`；`lineId`（`String`）— 新行 ID；`afterLineId`（`String`）— 已存在行的 ID；`text`（`Component`）— 文本。
- **返回**：无。
- **抛出**：`IllegalArgumentException`：任一 ID 不合法或 `text` 为 `null`。
- **默认值**：无。
- **示例**：

```javascript
text.appendAfter("operation", "example:new", "example:in", Text.literal("after"))
```

#### `replace(String lineId, Component text) → void`

- **参数表**：`lineId`（`String`）— 已存在行 ID；`text`（`Component`）— 新文本。
- **返回**：无。
- **抛出**：`IllegalArgumentException`：`lineId` 不合法或 `text` 为 `null`。
- **默认值**：无。
- **示例**：

```javascript
text.replace("example:status", Text.literal("Updated"))
```

#### `appendTranslatable(String scope, String lineId, String key, Object... args) → void`

- **参数表**：`scope`、`lineId` 同上；`key`（`String`）— 翻译键；`args`（`Object...`）— 翻译占位参数。
- **返回**：无。
- **抛出**：`IllegalArgumentException`：`scope`/`lineId`/`key` 非法或 `args` 为 `null`。
- **默认值**：无。
- **示例**：

```javascript
text.appendTranslatable("controller", "example:status", "gui.example.status", Text.literal("75%"), 4)
```

#### `appendAfterTranslatable(String scope, String lineId, String afterLineId, String key, Object... args) → void`

- **参数表**：参数与 `appendTranslatable` 类似，但额外指定 `afterLineId`。
- **返回**：无。
- **抛出**：`IllegalArgumentException`：任一 ID 非法、`key` 非法或 `args` 为 `null`。
- **默认值**：无。
- **示例**：

```javascript
text.appendAfterTranslatable("controller", "example:after", "example:in", "gui.example.after", Text.literal("arg"))
```

#### `replaceTranslatable(String lineId, String key, Object... args) → void`

- **参数表**：`lineId`（`String`）— 已存在行 ID；`key`（`String`）— 翻译键；`args`（`Object...`）— 翻译占位参数。
- **返回**：无。
- **抛出**：`IllegalArgumentException`：`lineId`/`key` 非法或 `args` 为 `null`。
- **默认值**：无。
- **示例**：

```javascript
text.replaceTranslatable("example:status", "gui.example.status")
```

#### `remove(String scope, String lineId) → void`

- **参数表**：`scope`（`String`）— `controller` 或 `operation`；`lineId`（`String`）— 已存在行 ID。
- **返回**：无。
- **抛出**：`IllegalArgumentException`：`scope` 不合法或 `lineId` 不合法。
- **默认值**：无。
- **示例**：

```javascript
text.remove("operation", "example:status")
```

#### 静态辅助（内部）

- `parseIdentifier(String value, String name)`：解析命名空间 ID，异常时抛出包含字段名的 `IllegalArgumentException`。
- `handler(Consumer<ControllerScreenTextEventJS> handler)`：把脚本回调包装为 `ControllerScreenTextHandler`。
- `parseScope(String value)`：把字符串映射到 `ControllerScreenTextScope`，非 `controller`/`operation` 抛 `IllegalArgumentException`。
- `parseNamespacedIdentifier(String value, String name)`：校验 `value` 含命名空间和路径后调用 `parseIdentifier`。

**注册入口**

控制器屏幕文本只能在启动期通过 `MMCRStartupEventJS.registerControllerScreenText(String machineId, Consumer<ControllerScreenTextEventJS> handler)` 注册；`MMCRServerEventJS` 没有该方法。

**示例**

```javascript
MMCREvents.startup(event => {
    event.registerControllerScreenText("example:press", text => {
        text.append("controller", "example:status", Text.literal("Idle"))
        text.appendTranslatable("operation", "example:progress", "gui.example.progress", 50)
    })
})
```

**注意事项**

- `lineId` 必须是带命名空间的合法 ID；推荐使用 `your_mod:line_name`。
- 静态文本行（`controller` 作用域）每次客户端 tick 都会重新执行；`replace` 是最后一次写入生效的语义。
- 翻译键占位参数支持 `Component` 与基础数值；不要传入无法序列化为 JSON 的对象。

## 11. 智能接口事件

### `SmartInterfaceEvents`

> `cn.howxu.mmcr.compat.kubejs.SmartInterfaceEvents` 是智能接口值/绑定变化的服务器端事件组。

**字段**

| 名称 | 类型 | 描述 |
|------|------|------|
| `UPDATED_ID` | `String` | `"mmcr.smart_interface.updated"`。 |
| `GROUP` | `EventGroup` | `mmcr.smart_interface` 事件组，标记为 `Registration.COMPLETE = true` 后才能 `post`。 |

**监听语法**

```javascript
MMCREvents.onEvent("mmcr.smart_interface.updated", event => {
    console.info("interface updated at", event.interfacePos(), "value", event.newValue())
})
```

实际入口依赖插件注册的事件组：KubeJS 把 `GROUP` 中名为 `updated` 的 `EventHandler` 注册到 `EventGroupRegistry`；KubeJS 端可通过 `MMCREvents["mmcr.smart_interface"].updated(handler)` 调用（`EventGroupWrapper` 把键查询转发到 `EventHandler`）。

#### `group() → EventGroup`

- **参数表**：无。
- **返回**：初始化事件组。
- **抛出**：无。
- **默认值**：返回静态事件组。
- **示例**：

```javascript
const group = SmartInterfaceEvents.group()
```

#### `post(SmartInterfaceUpdateEventJS event) → void`

- **参数表**：`event`（`SmartInterfaceUpdateEventJS`）— 事件载荷。
- **返回**：无；在注册已完成且存在监听者时把事件分发到脚本。
- **抛出**：无。
- **默认值**：仅当 `Registration.COMPLETE` 为 `true` 且 `Holder.UPDATED.hasListeners()` 为 `true` 时真正触发。
- **示例**：内部使用，普通脚本不应手动调用。

#### `Holder` 与 `Registration`

`SmartInterfaceEvents.Holder.UPDATED` 是 `EventGroup.server("updated", ...)` 注册的 `EventHandler`；`SmartInterfaceEvents.Registration.COMPLETE` 在第一次调用 `group()` 时被置为 `true`。这两个内部类不暴露给脚本。

### `SmartInterfaceUpdateEventJS`

> `cn.howxu.mmcr.compat.kubejs.SmartInterfaceUpdateEventJS` 是 `SmartInterfaceEvents.UPDATED_ID` 监听到的事件负载。

**记录签名**

```java
public record SmartInterfaceUpdateEventJS(
        BlockPos interfacePos,
        Identifier machineId,
        String type,
        @Nullable Float oldValue,
        @Nullable Float newValue,
        List<BlockPos> controllerPositions) implements KubeEvent
```

**字段**

| 名称 | 类型 | 描述 |
|------|------|------|
| `interfacePos` | `BlockPos` | 智能接口方块位置，不可变。 |
| `machineId` | `Identifier` | 接口所属机器的注册 ID。 |
| `type` | `String` | 智能接口类型名，对应 `MachineBuilderJS.smartInterface(type, ...)`。 |
| `oldValue` | `Float` 或 `null` | 旧值；`null` 表示新建绑定。 |
| `newValue` | `Float` 或 `null` | 新值；`null` 表示解除绑定。 |
| `controllerPositions` | `List<BlockPos>` | 该接口所在或关联的控制器方块列表，已排序为不可变副本。 |

**方法**

#### `controllerCount() → int`

- **参数表**：无。
- **返回**：`controllerPositions` 列表长度。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
MMCREvents["mmcr.smart_interface"].updated(event => {
    if (event.controllerCount() === 0) return
})
```

#### `controllerPos() → BlockPos | null`

- **参数表**：无。
- **返回**：第一个控制器位置；列表为空时返回 `null`。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
const first = event.controllerPos()
if (first != null) {
    ctx.level().getBlockEntity(first)
}
```

#### `interfacePos() → BlockPos`

- **参数表**：无。
- **返回**：事件负载中的智能接口位置。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
const pos = event.interfacePos()
```

#### `machineId() → Identifier`

- **参数表**：无。
- **返回**：事件负载中的机器 ID。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
const id = event.machineId()
```

#### `type() → String`

- **参数表**：无。
- **返回**：智能接口类型字符串。
- **抛出**：无。
- **默认值**：无。
- **示例**：

```javascript
const t = event.type()
```

#### `controllerPositions() → List<BlockPos>`

- **参数表**：无。
- **返回**：不可变、已排序的控制器位置列表。
- **抛出**：无。
- **默认值**：构造时 `null` 被替换为空列表。
- **示例**：

```javascript
event.controllerPositions().forEach(p => {
    // ...
})
```

**注意事项**

- 事件仅在 `mmcr.smart_interface.updated` 上发送；目前 `MMCRStartupEventJS.registerControllerScreenText` 与 `SmartInterfaceUpdateEventJS` 是独立的两套 API。
- `oldValue`/`newValue` 在创建/删除绑定时其中之一为 `null`。
- 控制器位置以不可变 `BlockPos` 形式给出；直接共享给其他方块实体即可。

## 12. 内部辅助

> 本节列出的是 KubeJS 集成层内部使用的辅助类，**不暴露给脚本**。它们的作用是支撑上面的 API，不要在用户脚本里直接引用。

### `KubeJSInterfaceHelpers`

> `cn.howxu.mmcr.compat.kubejs.KubeJSInterfaceHelpers` 是 KubeJS 端方块谓词、端口等级与智能接口需求的内部工厂。所有 `KubeJSApi` 中的同名方法、`MachineBuilderJS`/`MachineStructureBuilderJS`/`MachineStructureStageBuilderJS` 的端口谓词和等级工厂都委托到这里；普通业务脚本不需要直接调用。

内部方法覆盖以下几类：方块谓词工厂（`anyOfItemInput` 等 12 个）、`anyOfPort(...)` 的三重重载、`factoryController`、`parallelControllers`、`smartInterface`、`dataStorage`、`networkInterface`、`port(String)`/`port(Identifier)` 工厂；端口等级工厂（`itemInputTier` 等 6 个）；智能接口需求工厂（`smartInterfaceInput` 三重重载和 `smartInterfaceOutput` 单重载）；以及公共 API 谓词到内部 `BlockPredicate` 的 `convert(...)` 转换。

### `MachineRecipeFactory`

> `cn.howxu.mmcr.compat.kubejs.MachineRecipeFactory` 是 KubeJS 端配方类型 `mmcr:machine_recipe` 的 `KubeRecipeFactory`。它只暴露两个静态常量：

- `TYPE`（`Identifier`）— 配方类型 ID `mmcr:machine_recipe`。
- `INSTANCE`（`KubeRecipeFactory`）— KubeJS 端 `RecipeFactoryRegistry` 使用的工厂实例。

以及三个供 `MachineRecipeSchema` 调用的内部方法 `allowPartialOutputs(KubeRecipe)`、`smartInterfaceInput(String, float)` 与 `smartInterfaceInput(String, float, float)`、`smartInterfaceOutput(String, float)`。脚本不直接调用这些方法。

### `MachineRecipeSchema`

> `cn.howxu.mmcr.compat.kubejs.MachineRecipeSchema` 是 `mmcr:machine_recipe` 配方的 `RecipeSchema` 定义（详见第 7 节）。类内部维护 `MACHINE`/`TICK_TIME`/`OUTPUTS`/`MODIFIERS`/`REQUIREMENTS`/`LEVEL_REQUIREMENTS`/`MAX_THREADS`/`PARALLELIZED`/`CANCEL_IF_PER_TICK_FAILS`/`ALLOW_PARTIAL_OUTPUTS` 十个 `RecipeKey`，`JSON_ELEMENT` 通用 JSON 组件，以及静态 `SCHEMA` 实例。

`register(RecipeSchemaRegistry)` 在插件 `registerRecipeSchemas` 阶段被调用，类内部的 `JsonElementComponent` 提供了 JSON 元素与 KubeJS 类型系统之间的桥接。脚本不应直接构造 `MachineRecipeSchema`，只需通过 `event.custom({ type: "mmcr:machine_recipe", ... })` 使用其注册的字段与函数。

### `Plugin`

> `cn.howxu.mmcr.compat.kubejs.Plugin` 是 MMCR 提供的 `KubeJSPlugin` 实现，类路径为 `cn.howxu.mmcr.compat.kubejs.Plugin`。它在 `registerBindings` 中注入 `MMCR` 与 `MMCREvents` 绑定，在 `registerEvents` 中注册 `MMCREvents.GROUP` 与 `SmartInterfaceEvents.GROUP`，在 `registerRecipeFactories`、`registerRecipeComponents`、`registerRecipeSchemas` 中分别注册 `MachineRecipeFactory.INSTANCE`、`JSON_ELEMENT` 与 `MachineRecipeSchema.SCHEMA`。

`beforeScriptsLoaded` 与 `afterScriptsLoaded` 还负责：

- 在 `ScriptType.SERVER` 脚本加载前打开 `KubeJSContentReloadTransaction`；
- 在 `ScriptType.STARTUP` 脚本加载前调用 `PublicApiBootstrap.begin()` 并注册开发等级（当前为空实现）；
- 在 `ScriptType.SERVER` 脚本加载后调用 `MMCREvents.postServer()` 并通过 `Plugin.completeServerReload(...)` 提交事务；
- 在 `ScriptType.STARTUP` 脚本加载后调用 `MMCREvents.postStartup()` 并调用 `StartupContentRegistration.completeKubeJSStartupIfReady()`。

脚本不需要直接引用 `Plugin`。

### `KubeJSContentReloadTransaction`

> `cn.howxu.mmcr.compat.kubejs.KubeJSContentReloadTransaction` 是 `MMCREvents.server` 事务期间累计结构与配方的容器。`MachineStructureBuilderJS.build()` 与 `MachineRecipeBuilderJS.build()` 都通过 `KubeJSContentReloadTransaction.active()` 取得当前事务对象并调用 `registerStructure(...)` 或 `registerRecipe(...)`。

每个 ID 在事务中只能注册一次；`commit()` 把事务中的结构与配方合并到 `MachineStructureRegistry.dynamicSnapshot()` 与 `RecipeRegistry.dynamicSnapshot()`，并把已发布快照保留用于后续重载的差异检测。该类是包私有，脚本不可见。

### `KubeJSRecipeSync`

> `cn.howxu.mmcr.compat.kubejs.KubeJSRecipeSync` 是 KubeJS 数据包配方重载 mixin（`RecipeManagerMixin`）调用的同步入口。`replaceDataPackRecipes(Iterable<RecipeHolder<?>>)` 会在每次 KubeJS 数据包配方完成加载后被调用：

1. 遍历传入的 `RecipeHolder`，筛选出 `MachineRecipe` 类型的条目；
2. 跳过 KubeJS 动态注册（事务中）和已经发布过的配方，避免与 `MMCREvents.server` 中的脚本覆盖；
3. 把余下的条目合并到 `RuntimeContentSnapshot` 中，并触发 JEI 重新加载。

该类是脚本不可见的内部桥接。

### `KubeJSReloadHooks`

> `cn.howxu.mmcr.compat.kubejs.KubeJSReloadHooks` 是 KubeJS 重载 mixin 在错误路径上调用 `Plugin.abortServerReload(manager)` 的桥接，避免把 mixin 放在 `compat.kubejs` 公共包外。该类只暴露 `abortServerReload(Object manager)` 静态方法，脚本不可见。

---

## 附：跨节注意事项

- **生命周期**：MMCR 启动窗口由 `Plugin.beforeScriptsLoaded` 打开、`afterScriptsLoaded` 关闭；机器定义、等级、修饰符与控制器屏幕文本必须在 `MMCREvents.startup` 回调中完成注册。`MMCREvents.server` 回调在服务端 KubeJS 内容事务内运行，调用 `build()` 时若事务已结束会抛 `IllegalStateException`。
- **块谓词类型**：`KubeJSApi` 返回的方块谓词类型是 `cn.howxu.mmcr.api.machine.BlockPredicate`，与 Java 公共 API 包 `cn.howxu.mmcr.api.publicapi.machine.BlockPredicate` 不同。`modifierUse(...)` 会自动从前者转换为后者；结构字符绑定只能使用前者或脚本能识别的 `BlockState`/`Block`/`LevelSlot`。
- **配方多通道**：MMCR 配方有四条注册路径——`event.custom({ type: 'mmcr:machine_recipe' })` 数据驱动配方、`MachineRecipeBuilderJS` 编程式配方、`RecipeRegistry.registerStatic(...)` 静态注册（`Plugin.completeServerReload` 之外）、`MachineRecipeConverter` 转换的自定义 codec。同一 ID 在任意路径下只允许存在一次。
- **网络请求**：`sendRequest` 在目标不可达时不会抛异常，失败由源机器上同 ID 的 `requestFailed` 处理器处理。请求体必须是字符串键映射，且每个值都是 `dataValue` 支持的类型。
- **智能接口**：智能接口类型在 `MachineBuilderJS.smartInterface(type, ...)` 注册时是机器级声明，结构可以同时通过 `set(symbol, smartInterfaceBlock())` 决定哪些位置允许放置接口。`SmartInterfaceUpdateEventJS` 监听写在 `mmcr.smart_interface.updated`，参数与机器定义保持一致。
- **可热加载范围**：机器定义、等级类型、等级、修饰符和控制器屏幕文本注册在启动脚本中，修改后必须重启游戏；结构、配方、控制器屏幕文本内容可随 `/reload` 重载（屏幕文本行的静态/动态重写都遵循 `ControllerScreenText` 的替换语义）。
- **语言约定**：本文档中的 Java 类型在脚本里以相同名称使用；KubeJS 会把字符串、数组、对象和回调转换为对应参数；标记为 `@HideFromJS` 的重载（见 `MachineStructureBuilderJS` 多个 `extension`/`fullStructure` 与 `MachineBuilderJS` 的 `controllerSpec`/`runningSound(Identifier)` 等）保留给 Java 互操作或内部桥接，不应作为脚本入口。
