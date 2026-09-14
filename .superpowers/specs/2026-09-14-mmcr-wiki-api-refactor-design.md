# MMCR Wiki API 重构 — FailedReason / Level Requirement / Recipe Pool

- 日期：2026-09-14
- 状态：待用户审阅
- 范围：MMCR Wiki 文档同步，不改主仓库

## 1 背景与目标

主仓库 `Nibelungorum/ModularMachinery-Community-Refoxed` 最近一次大规模合并（`merge: integrate recipe pool system`，`2175d751`）将 `recipeFamily` 完整替换为 `recipePool`，并合并了 Level Requirement 的统一重构与 `FailedReason` 失败原因迁移。本仓库（mmcr-wiki）的 `zh-cn/API/JavaAPI.md`、`zh-cn/API/KubeJS.md` 与 10 个 KubeJS 教程页中关于这三个系统的描述尚未跟进，存在失效调用与过时签名（`grep -l` 命中 11 个文件，含 `API/KubeJS.md`）。

本次目标：以主仓库 `main` 当前公共 API 层（`cn.howxu.mmcr.api.publicapi.*`）与 KubeJS 集成层（`cn.howxu.mmcr.compat.kubejs.*`）为唯一事实源，修订本仓库相关文档，并对教程页中的失效 `recipeFamily` 调用做替换清理。

不在范围内：
- capability/status 层（`FailureReason` / `BuiltinFailureReasons` / `FailureReasonRegistry`）——用户明确说"这是新特性而已，wiki 不用"；
- 新增 example 教程页——用户明确说"不用专门写"；
- 教程页的章节结构、侧边栏、`vitepress/config.mts`、`README.md`、`index.md`、`IMPLEMENT_PLAN.md`；
- 主仓库 Blueprint UI、AE2 Pattern、PortTiers 等其他变更；
- 主仓库本身（本仓库对主仓库只读）。

## 2 修改文件清单

| 文件 | 性质 | 变更范围 |
| --- | --- | --- |
| `zh-cn/API/JavaAPI.md` | 增量补丁 | 新增 Recipe Pool 节；按主仓库代码复核 Level Requirement、RequestFailureReason；更新顶部包路径清单与注意事项 |
| `zh-cn/API/KubeJS.md` | 增量补丁 | 同步 KubeJS 集成层对应入口；整节替换已失效的 `recipeFamily(String)` 节为 `recipePool(String)` 节；按主仓库代码复核 Level Requirement |
| `zh-cn/KubeJS/纯Tick机器示例.md`、`数据存储测试机器.md`、`配方Tick示例.md`、`蒸馏塔.md`、`裂化器.md`、`太空电梯.md`、`热能冶炼炉.md`、`反应堆.md`、`紫珀炉.md`、`合金炉.md` | 代码块替换 + 注释行调整 | 把所有 `.recipeFamily("...")` 替换为 `.recipePool("...")`；相关注释改写为"配方池"；删除 `(在过去的某个提案中...recipeFamily留了下来)` 这条历史注释 |
| `zh-cn/API/开始.md` | 视情况 | 仅当"阅读建议"段需要指向新增节时微调 |

事实源：`../ModularMachinery-Community-Refoxed/main`，以公共 API 层 `cn.howxu.mmcr.api.publicapi.*` 与 KubeJS 集成层 `cn.howxu.mmcr.compat.kubejs.MachineBuilderJS/MachineRecipeBuilderJS` 为唯一真相。

## 3 系统级改动

### 3.1 Recipe Pool

#### 3.1.1 Java API

源码事实：`cn.howxu.mmcr.api.publicapi.machine.MachineBuilder.java:69-72`

```java
public MachineBuilder recipePool(Identifier recipePoolId) {
    this.recipePoolId = Objects.requireNonNull(recipePoolId, "recipePoolId");
    return this;
}
```

行为：
- 默认值：构造 `MachineDefinition` 时若 `recipePoolId` 仍为 `null`，回退为 `machine.id`（`cn.howxu.mmcr.api.publicapi.machine.MachineDefinition.java:107`）。
- 抛出：`NullPointerException`（`recipePoolId` 为 `null`，由 `Objects.requireNonNull` 抛出）。

文档新增节：`zh-cn/API/JavaAPI.md` 在 `MachineBuilder` 节中 `portTiers(...)` 之后新增 `recipePool(Identifier)` 子节，包含完整类名、方法签名、参数表、抛出条件、示例。

`MachineDefinition` record 字段表新增 `Identifier recipePoolId`；构造器列表把 `recipePoolId` 作为新增参数列出。构造器上的 @Deprecated 标注以源码为准——本仓库不得自行添加。

#### 3.1.2 KubeJS API

源码事实：`cn.howxu.mmcr.compat.kubejs.MachineBuilderJS.java:210-213`

```java
public MachineBuilderJS recipePool(String recipePoolId) {
    this.recipePoolId = Identifier.parse(recipePoolId);
    return this;
}
```

行为：
- 默认值：与 Java 侧一致，回退为机器 ID；
- 抛出：`IllegalArgumentException`（`Identifier.parse` 解析失败）。

文档：`zh-cn/API/KubeJS.md` 把 `##### recipeFamily(String recipeFamilyId) → MachineBuilderJS` 整节替换为 `##### recipePool(String recipePoolId) → MachineBuilderJS`，参数表与示例同步更新。

### 3.2 Level Requirement

#### 3.2.1 Java API

源码事实：`cn.howxu.mmcr.api.publicapi.recipe.LevelRequirement.java`

```java
public record LevelRequirement(RecipeIo io, Identifier typeId, Identifier levelId)
        implements RecipeRequirement {
    public LevelRequirement(Identifier typeId, Identifier levelId) {
        this(RecipeIo.INPUT, typeId, levelId);
    }
    public LevelRequirement {
        Objects.requireNonNull(io, "io");
        if (io != RecipeIo.INPUT) {
            throw new IllegalArgumentException("Level requirements must use input direction");
        }
        Objects.requireNonNull(typeId, "typeId");
        Objects.requireNonNull(levelId, "levelId");
    }
}
```

与 commit `2631ef61 fix: classify level requirements as non-physical` 一致：level requirement 是 input 方向、非物理 IO，不参与物理输入槽匹配。

`MachineRecipeBuilder.levelRequirement(Identifier typeId, Identifier levelId)`（`MachineRecipeBuilder.java:132`）：

```java
public MachineRecipeBuilder levelRequirement(Identifier typeId, Identifier levelId) {
    return requirement(new LevelRequirement(typeId, levelId));
}
```

文档改动：以源码为唯一真相重写 `LevelRequirement` 节，补：
- 双参数构造器（隐含 `io = RecipeIo.INPUT`）；
- 紧凑构造器校验（`io == INPUT`、`typeId` / `levelId` 非 null）；
- "非物理"语义说明（不参与物理 IO）。

#### 3.2.2 KubeJS API

源码事实：`cn.howxu.mmcr.compat.kubejs.KubeJSApi.java:295-303`

```java
public LevelRequirement levelRequirement(String typeId, String levelId) {
    Identifier type = Identifier.parse(typeId);
    Identifier level = Identifier.parse(levelId);
    var registered = MachineLevelRegistry.getLevel(level);
    if (MachineLevelRegistry.getType(type) == null || registered == null
            || !registered.typeId().equals(type)) {
        throw new IllegalArgumentException("Unknown or mismatched machine level: " + typeId + "/" + levelId);
    }
    return new LevelRequirement(type, level);
}
```

文档改动：在 `KubeJS.md` 中 `LevelRequirement` 相关章节的"抛出条件"小节新增：
- `typeId` 未知 / `levelId` 未注册 / `typeId` 与 `levelId` 不匹配 → `IllegalArgumentException`；
- `Identifier.parse` 失败 → `IllegalArgumentException`。

### 3.3 FailedReason（仅网络层）

源码事实：`cn.howxu.mmcr.api.publicapi.network.RequestFailureReason.java`

```java
public enum RequestFailureReason {
    SOURCE_INTERFACE_MISSING,
    TARGET_INTERFACE_MISSING,
    TARGET_CHUNK_UNLOADED,
    CONNECTION_MISSING,
    SOURCE_STRUCTURE_INVALID,
    TARGET_STRUCTURE_INVALID,
    HASH_MISMATCH,
    ALLOWLIST_REJECTED,
    TARGET_HANDLER_MISSING,
    UNREACHABLE
}
```

文档改动：`zh-cn/API/JavaAPI.md` 的 `RequestFailureReason` 节以源码为唯一真相全量列出 10 个常量，并按源码/合理推断给出每条一行注释。

`RequestFailed` 节相关字段（`reason` 参数）以源码 `RequestFailed.java` 为准核对一次。

### 3.4 RecipeFamily → RecipePool 失效调用清理

10 个 KubeJS 教程页 + `API/KubeJS.md` 中的旧 `recipeFamily(String)` 节，共 11 个文件：纯Tick机器示例、数据存储测试机器、配方Tick示例、蒸馏塔、裂化器、太空电梯、热能冶炼炉、反应堆、紫珀炉、合金炉，加 `API/KubeJS.md`。

统一规则：
1. 所有 `.recipeFamily("...")` 调用 → `.recipePool("...")`；
2. "配方族 ID" / "配方系列 ID" / "绑定到同一族" / "老演员了" → "配方池 ID"；
3. 删除 `zh-cn/KubeJS/反应堆.md:82` 的历史注释 `(在过去的某个提案中，recipeFamily被用来实现类似GregTech配方池的功能，但是最终作者放弃了这个提案，但是recipeFamily留了下来)`，替换为一句对 `recipePool` 的简短说明：`recipePool` 是机器定义层用于配方分组与广播的标识，决定机器配方如何被注册、检索与同步到 JEI 与重载流水线；
4. `zh-cn/KubeJS/纯Tick机器示例.md`、`数据存储测试机器.md`、`配方Tick示例.md` 顶部"参数表"中的 `MachineBuilderJS.recipeFamily(...)` 链接换成 `MachineBuilderJS.recipePool(...)`，锚点指向 `zh-cn/API/KubeJS.md` 中新增的 `recipePool(String recipePoolId)` 节（VitePress 自动生成锚点 `#recipepoolstring-recipepoolid--machinebuilderjs`，以实际为准）。

## 4 风格约束

- 每节沿用"完整类名 → 类签名 → 方法 → 参数表 → 抛出 → 示例 → 注意事项"骨架。
- 顶部包路径清单随新增 API 更新；不增段落标题；不引入 H2/H3 变更。
- 示例代码片段必须可直接从主仓库 `src/test/.../MachineBuilderJSTest.java` 或 `example/` 抄录并简化，不编造调用。
- 不在文档中新增 emoji；不写"自 1.x 版本起"等无版本号依据的措辞。
- 现有锚点（`#porttiers`、`#requestfailurereason` 等）保持不变。

## 5 验证流程

1. `npm run docs:dev`：本地预览，逐节跳转锚点；
2. `npm run docs:build`：VitePress 死链检查；若命中仅因外部 wiki 链接暂时不通，可保留 `ignoreDeadLinks` 临时配置；
3. `git diff --stat` 自检：diff 仅落在 §2 文件清单内的 .md；
4. `git grep -n 'RequestFailureReason\|recipePool\|levelRequirement\|recipeFamily' zh-cn` 与主仓库 publicapi 同名类一一比对：
   - `zh-cn` 中不应再出现 `.recipeFamily(...)` 调用；
   - `RequestFailureReason` 常量名与源码一致；
   - `recipePool` / `levelRequirement` 参数顺序与源码一致。

## 6 不做的事（明确划界）

- 不写"近 N 个版本迁移说明"附录；
- 不调整 `vitepress/config.mts` 的 `themeConfig.nav` / `sidebar`，不新增 sidebar 项；
- 不动 `README.md`、`index.md`、`IMPLEMENT_PLAN.md`；
- 不动主仓库任何文件；
- 不动 `zh-cn/快速开始/*`、`zh-cn/KubeJS/*` 教程页除 §2 列出的失效调用清理外的任何内容。

## 7 风险与回滚

- 风险：API 文档与主仓库公共 API 出现版本漂移。规避：执行 §5 第 4 步 grep 比对；写代码示例时严格从 `src/test/` 与 `example/` 抄录，不臆造。
- 回滚：`git revert` 单 commit 即恢复；本次提交语义集中于"API 同步 + recipeFamily 清理"，无跨功能改动。
