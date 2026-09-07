# 文档写作实施计划

本计划梳理需要写的内容、按什么顺序写、每节要覆盖到什么深度。**写完再删**或根据进度更新。

---

## 总体结构

```
zh-cn/
├── API/
│   ├── 开始.md               # 入口索引（已写）
│   ├── JavaAPI.md            # Java 公共 API 集中参考（持续扩充）
│   └── KubeJS.md             # KubeJS 集成 API 集中参考（重写）
├── JavaAPI/                  # Java 示例机器博客教程
│   ├── BLAST_FURNACE.md      # 已写
│   ├── ALLOY_FURNACE.md
│   ├── CRACKER.md
│   ├── THERMAL_SMELTING_FURNACE.md
│   ├── PURPUR_FURNACE.md
│   ├── DISTILLATION_TOWER.md
│   ├── SPACE.md
│   ├── MONSTER_FARM.md
│   ├── ARTIFICIAL_STAR.md    # Java + KubeJS 混合 + 渲染器
│   ├── REACTOR.md
│   ├── DATA_STORAGE_MACHINE.md
│   ├── NETWORK_PRODUCER_MACHINE.md
│   ├── NETWORK_CENTER_MACHINE.md
│   ├── PURE_TICK_MACHINE.md
│   └── RECIPE_TICKER.md
├── KubeJS/                   # KubeJS 示例机器博客教程
│   ├── A_Simple_Machine.md   # 已写
│   ├── A_BlockState_Machine.md
│   ├── A_Group_Machine.md
│   ├── A_Large_Machine.md
│   ├── A_Level_Machine.md
│   ├── A_Modifier_Machine.md
│   ├── A_Module_Machine.md
│   ├── A_Smart_Machine.md
│   ├── A_Vertical_Machine.md
│   ├── A_Data_Storage_Machine.md
│   ├── A_Network_Machine.md
│   ├── A_Pure_Tick_Machine.md
│   ├── A_Recipe_Tick_Machine.md
│   ├── 高炉.md
│   ├── 人造恒星.md
│   └── 服务器集群.md
└── 快速开始/                # 已存在，不动
```

---

## A. `zh-cn/API/KubeJS.md`（重写）

当前 383 行，明显不够。覆盖 `cn/howxu/mmcr/compat/kubejs/` 下 23 个 .java 文件的全部公共 API。

### A.1 顶层全局绑定

- **`MMCR`**（由 `Plugin.registerBindings` 注入 `MMCRKubeJS` 实例）
  - `MMCR.getAPI()` → `KubeJSApi`
  - `MMCR.getValues()` → `MMCRValues`
- **`MMCRValues`**
  - `INT_MAX` / `INT_MIN`（整数上下界便捷常量）
- **`MMCREvents`**
  - 事件组常量：`STARTUP_ID`、`SERVER_ID`、`GROUP`
  - `group()` / `postStartup()` / `postServer()` / `events()`
  - 监听语法：`MMCREvents.startup(event => ...)` / `MMCREvents.server(event => ...)`

### A.2 启动期回调

- **`MMCRStartupEventJS`**
  - `getAPI()` → `KubeJSApi`
  - `createMachine(String id)` → `MachineBuilderJS`
  - `createLevelType(String id)` → `LevelTypeBuilderJS`
  - `createLevel(String id)` → `MachineLevelBuilderJS`
  - `levelSlot(String typeId)` → `LevelSlot`
  - `registerControllerScreenText(String machineId, Consumer<ControllerScreenTextEventJS> handler)`
  - `registerModifier(String id, ModifierDefinition definition)`
  - `registerModifierItem(ItemStack stack, String modifierId)`

### A.3 服务期回调

- **`MMCRServerEventJS`**
  - `getAPI()` → `KubeJSApi`
  - `createStructure(String id)` → `MachineStructureBuilderJS`

### A.4 KubeJSApi 完整方法

文件：`KubeJSApi.java`（441 行）。逐个方法的签名、参数语义、抛出条件、示例：

**常量对象**（共三个内部类）：
- `screenScope()` → `ScreenScopeValues`（含 `CONTROLLER`、`OPERATION`）
- `recipeIO()` → `RecipeIoValues`（含 `INPUT`、`OUTPUT`）
- `outputPolicy()` → `OutputPolicyValues`（含 `REQUIRE_FULL`、`ALLOW_PARTIAL`）

**字符串与数字**：
- `id(String id)` / `readableNumber(long)` / `readableNumberExact(long)`

**方块谓词**：
- `air()` / `any()` / `coupler()`
- `block(String)` / `state(String)` / `tag(String)`
- `anyOf(BlockPredicate... children)`
- 端口族并集 7 个：`anyOfItemInput()` 等
- 控制器与智能接口：`parallelControllers()` / `factoryController()` / `smartInterface()` / `dataStorage()` / `networkInterface()`

**端口等级与端口需求**：
- `portRequirements(Map<String, Object> ranges)`
- `portTierRequirements(List<String> minimums)`

**配方输入/输出**：
- `itemInput(String, int, float)` / `tagInput(String, int, float)`
- `fluidInput(String, int)` / `fluidStack(String, int)`
- `energyInput(int)` / `energyOutput(int)` / `energyRequirement(RecipeIo, int)`
- `customRecipeIo(String, RecipeIo, JsonElement)`
- `itemOutputRequirement(String, int, float)` / `itemOutputRequirementWithComponents(...)`
- `itemInputRequirement(...)` / `fluidInputRequirement(...)` / `fluidOutputRequirement(...)`

**修饰符与等级**：
- `modifier(target, io, value, operation, chance)` / `modifierDefinition(List)` / `modifierUse(modifierId, replacement)`
- `levelRequirement(typeId, levelId)` / `levelSlot(typeId)`

**智能接口**：
- `smartInterfaceInput(type, min, max)` / `smartInterfaceOutput(type, value)`

**自定义与网络**：
- `networkInterfaces(MachineBehaviorContext)` / `sendRequest(source, target, requestId, body)` / `dataValue(Object)`

### A.5 机器定义构建器

- **`MachineBuilderJS`**（724 行）：完整记录所有链式方法
  - 基本属性：`displayNameKey` / `recipeFamily` / `role` / `host` / `module` / `expandableStructure`
  - 控制器：`controllerSpec` / `controllerTextures` / `controllerFrontTexture` / `controllerSideTexture` / `controllerTopTexture` / `controllerBottomTexture` / `controllerTooltip` / `allowVerticalFacing` / `fullyRotationallySymmetric` / `requireVerticalFacing`
  - 行为：`recipeBehavior` / `tickBehavior` / `preServerTick` / `postServerTick`
  - 并行与多线程：`allowMultithreading` / `allowParallelism` / `maxParallelAmount` / `maxParallelism` / `factoryThreads`
  - 修饰符：`allowModifiers`
  - 网络：`networkInterface` / `allowNetworkMachine`
  - 智能接口：`smartInterface(...)` / `shareSmartInterface` / `durationByInterface` / `energyByInterface` / `itemInputByInterface` / `itemInputChanceByInterface` / `fluidInputByInterface` / `fluidInputChanceByInterface` / 等 9 个 ByInterface
  - 外观：`machineBasicBlock` / `controllerBaseTexture` / `formedPortBaseTexture` / `appearance`
  - 音效：`runningSound` / `finishSound`
  - 请求：`requestProcess` / `requestFailed`
  - 端口谓词快捷方法：`anyOfItemInput` 等 14 个
  - 端口等级快捷：`itemInputTier` 等 6 个
  - 内部类 `SmartInterfaceTypeBuilderJS`：`priority` / `valueType` / `end`
  - 终结：`register()` → `registerObject()`

### A.6 结构构建器

- **`MachineStructureBuilderJS`**（404 行）：完整记录
  - 扁平式：`pattern(String...)` / `pattern(List<String>)` / `patternAll` / `set(symbol, value)` / `controller(symbol)` / `modifier(symbol, use)` / `stateSensitive` / `stateInsensitive` / `build()`
  - 阶段式：`mainStructure(Consumer)` / `expandStructure(Consumer)` / `extension(Consumer)`
  - 元数据：`portRequirements` / `portTierRequirements` / `dynamicPattern`
  - 端口等级：`itemInputTier` 等 6 个
  - 端口谓词快捷：`anyOfItemInput` 等 11 个
  - `PatternEntry` record（隐藏内部类）
- **`MachineStructureStageBuilderJS`**（178 行）：阶段内构建器，与顶层同名方法相同

### A.7 配方

- **数据驱动（推荐）**：完整列 `MachineRecipeSchema` 字段
  - 顶层字段：`machine` / `tick_time` / `parallelized` / `requirements` / `outputs` / `modifiers` / `level_requirements` / `max_threads` / `cancelIfPerTickFails` / `allow_partial_outputs`
  - Schema 函数：`allowPartialOutputs()` / `smartInterfaceInput(type, value)` / `smartInterfaceInputRange(type, min, max)` / `smartInterfaceOutput(type, value)` / `custom(typeId, io, payload)` / `requiredHost(hostId)` / `requiresLevel(typeId, levelId)`
- **编程式（`MachineRecipeBuilderJS`）**：394 行，所有方法签名
  - `id` / `machine` / `tickTime` / `inputs` / `addInput` / `outputs` / `addOutput` / `fluidOutputs` / `requirements` / `addRequirement`
  - `custom` / `priority` / `maxThreads` / `parallelized` / `deriveRequirements` / `conditions`
  - 输入：`itemInput` / `tagInput` / `itemInputWithComponents` / `tagInputWithComponents` / `notConsumableItemInput` / `chancedItemInput`
  - 输出：`itemOutput` / `chancedItemOutput` / `itemOutputWithComponents`
  - 能量：`energyPerTick` / `cancelIfPerTickFails`
  - 部分输出：`allowPartialOutputs`
  - 智能接口：`smartInterfaceInput` / `smartInterfaceOutput`
  - 等级与宿主：`requiresLevel` / `requiredHost` / `requiredHosts`
  - 终结：`createObject` / `build`

### A.8 行为构建器

- **`MachineBehaviorBuilderJS`**（82 行）：配方行为 / tick 行为的回调
  - 配方：`idleStart` / `idleEnd` / `beforeStart` / `recipeTick` / `beforeFinish`
  - tick：`serverTick`

### A.9 等级与等级类型

- **`LevelTypeBuilderJS`**（50 行）：`displayName` / `displayNameKey` / `register()`
- **`MachineLevelBuilderJS`**（94 行）：`type` / `priority` / `state` / `modifier` / `register()`

### A.10 控制器屏幕文本

- **`ControllerScreenTextEventJS`**（116 行）：运行时控制器屏幕文本
  - 上下文：`machineId()` / `controllerPos()`
  - 追加：`append(scope, lineId, Component)` / `appendAfter` / `replace`
  - 可翻译版：`appendTranslatable` / `appendAfterTranslatable` / `replaceTranslatable`
  - 删除：`remove(scope, lineId)`
- 配套：注册入口 `MMCRStartupEventJS.registerControllerScreenText(...)`

### A.11 智能接口事件

- **`SmartInterfaceEvents`**（40 行）：事件组 `mmcr.smart_interface.updated`
- **`SmartInterfaceUpdateEventJS`**（34 行）：record 各字段、`controllerCount()` / `controllerPos()`

### A.12 内部辅助（说明用途但不全展开）

- **`KubeJSInterfaceHelpers`**（111 行）：`anyOfItemInput` 等所有 `BlockPredicate` 工厂的内部入口
- **`MachineRecipeFactory`**（34 行）：KubeJS 配方工厂常量 `TYPE`
- **`MachineRecipeSchema`**（260 行）：RecipeKey 与 Schema 函数定义
- **`Plugin`**（183 行）：KubeJS 插件生命周期，仅做简短描述
- **`KubeJSContentReloadTransaction`**（99 行）：服务端脚本事务管理
- **`KubeJSRecipeSync`**（39 行）：数据包配方同步入口
- **`KubeJSReloadHooks`**（15 行）：中止重载的内部桥

---

## B. `zh-cn/API/JavaAPI.md`（扩充）

当前 1364 行，覆盖 17 个核心类。还需补：

### B.1 顶层入口

- **`MachineApi`**
- **`RecipeApi`**
- **`ApiRegistrationException`**
- **`ApiRuntime`**
- **`ReadableNumber`**

### B.2 渲染事件

- **`MMCRMachineRendersEvent`**

### B.3 行为与上下文（机器端）

- **`MachineBehavior`**（含 `Kind` 枚举、`MachineCallback` 接口）
- **`MachineBehaviorContext`**
- **`RecipeBehavior`**（含 Builder）
- **`RecipeStartContext`** / **`RecipeTickContext`** / **`RecipeFinishContext`**
- **`TickBehavior`**（含 Builder）
- **`TickBehaviorContext`**

### B.4 控制器规格

- **`ControllerSpec`**

### B.5 高级机器属性

- **`MachineRole`**
- **`MachineIoPlan`** / **`MachineIoView`**
- **`DisplayStack`**
- **`ParallelTier`**

### B.6 接口与等级

- **`InterfaceTiers`**
- **`PortRequirements`**

### B.7 模式与结构

- **`PatternDefinition`**
- **`StructureRequirements`**

### B.8 等级系统

- **`LevelType`**
- **`MachineLevel`**
- **`LevelModifier`**
- **`LevelRequirement`**

### B.9 修饰符系统

- **`ModifierDefinition`**
- **`ModifierUse`**
- **`OutputPolicy`**

### B.10 智能接口

- **`SmartInterfaceType`**
- **`SmartInterfaceModifier`**

### B.11 配方 IO 类型

- **`CustomRecipeIo`**
- **`ItemInput`** / **`ItemOutput`** / **`ItemRequirement`**
- **`FluidInput`** / **`FluidOutput`** / **`FluidRequirement`**
- **`EnergyInput`** / **`EnergyRequirement`**
- **`RecipeIo`**
- **`component/ComponentPredicate`**
- **`component/DataComponentPredicateSet`**

### B.12 控制器渲染

- **`ControllerRenderer`**
- **`ControllerRenderContext`**

### B.13 控制器屏幕文本

- **`ControllerScreenText`** / **`ControllerScreenTextHandler`** / **`ControllerScreenTextRegistry`** / **`ControllerScreenTextScope`**
- **`ControllerRuntimeContext`**
- **`JadeText`**

---

## C. 示例机器教程（博客式）

每篇大约 150-300 行。按下面顺序写完一篇教程时，确认所有新增 API 都已并入 JavaAPI.md / KubeJS.md。

### C.1 Java 示例（`zh-cn/JavaAPI/`）

1. `BLAST_FURNACE.md` — ✅ 已写
2. `ALLOY_FURNACE.md`
3. `CRACKER.md`
4. `THERMAL_SMELTING_FURNACE.md`
5. `PURPUR_FURNACE.md`
6. `DISTILLATION_TOWER.md`
7. `SPACE.md`
8. `MONSTER_FARM.md`
9. `ARTIFICIAL_STAR.md`（含 KubeJS 结构文件对应 + Java 渲染器）
10. `REACTOR.md`
11. `DATA_STORAGE_MACHINE.md`
12. `NETWORK_PRODUCER_MACHINE.md`
13. `NETWORK_CENTER_MACHINE.md`
14. `PURE_TICK_MACHINE.md`
15. `RECIPE_TICKER.md`

### C.2 KubeJS 示例（`zh-cn/KubeJS/`）

1. `A_Simple_Machine.md` — ✅ 已写
2. `A_BlockState_Machine.md`
3. `A_Group_Machine.md`
4. `A_Large_Machine.md`
5. `A_Level_Machine.md`
6. `A_Modifier_Machine.md`
7. `A_Module_Machine.md`
8. `A_Smart_Machine.md`
9. `A_Vertical_Machine.md`
10. `A_Data_Storage_Machine.md`
11. `A_Network_Machine.md`
12. `A_Pure_Tick_Machine.md`
13. `A_Recipe_Tick_Machine.md`
14. `高炉.md`
15. `人造恒星.md`
16. `服务器集群.md`

---

## 写作风格（每篇教程的统一规范）

- 第一段：机器是干什么的、为什么选它做示例。
- 概览：列出对应的源文件、本教程涉及的 API 链接表。
- 分阶段拆解：机器定义 → 结构 → 配方（与 KubeJS 版对照时用并表）。
- 涉及特殊概念时：先在本篇内简单解释，再链向集中参考。
- 末尾：与其他教程 / API 参考的跳转链接。

API 集中参考文档的写作规范：
- 每个类：`完整类名` → `类签名（最少方法名+参数类型）` → 每个方法的 `参数表` / `抛出条件` / `默认值` / `示例`。
- 最后加 `注意事项` 一节，列出踩坑点。
- 不再拆 `.md` 文件，按 H2 / H3 在一个文件里组织。

---

## 当前进度

- ✅ 已写：`zh-cn/JavaAPI/BLAST_FURNACE.md`、`zh-cn/KubeJS/A_Simple_Machine.md`
- ✅ 已写：`zh-cn/API/开始.md`、`zh-cn/API/JavaAPI.md`（17 个核心类）、`zh-cn/API/KubeJS.md`（初版，待重写）
- ❌ 待写：上面 B / C 列表的剩余内容