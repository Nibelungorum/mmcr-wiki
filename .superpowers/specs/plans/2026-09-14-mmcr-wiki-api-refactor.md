# MMCR Wiki API 重构 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `zh-cn/API/JavaAPI.md`、`zh-cn/API/KubeJS.md` 与 10 个 KubeJS 教程页中关于 FailedReason（网络层）、Level Requirement、Recipe Pool 三个系统的描述，与主仓库 `main` 当前公共 API 对齐；并把 11 个文件里的失效 `recipeFamily` 调用清理为 `recipePool`。

**Architecture:** 文档级增量补丁。事实源 = `../ModularMachinery-Community-Refoxed/main`，仅以 `cn.howxu.mmcr.api.publicapi.*` 与 `cn.howxu.mmcr.compat.kubejs.MachineBuilderJS / MachineRecipeBuilderJS` 为真相。每个 task 是一次原子化的小改动，自带 grep/build 校验与独立 commit。

**Tech Stack:** VitePress 1.6.x、Markdown、Node.js（仅用于 `npm run docs:dev` / `docs:build`）。

## Global Constraints

- 仅修改 `zh-cn/**` 下与三系统 / `recipeFamily` 直接相关的段落；其他内容一字不动。
- 不动 `zh-cn/快速开始/*`、`README.md`、`index.md`、`IMPLEMENT_PLAN.md`、`.vitepress/config.mts`、`.gitignore`。
- 不动主仓库任何文件；本仓库对主仓库只读。
- 不在文档中新增 emoji；不写"自 1.x 版本起"等无版本号依据的措辞。
- 示例代码片段必须从主仓库 `src/test/.../MachineBuilderJSTest.java` 或 `example/server_scripts/recipe/*.js` 抄录并简化，不编造调用。
- 每节沿用"完整类名 → 类签名 → 方法 → 参数表 → 抛出 → 示例 → 注意事项"骨架；新增节保持同一节标题层级（不引入 H2/H3 变更）。
- 现有锚点（`#porttiers`、`#requestfailurereason`、`#levelrequirement` 等）保持不变；新增节允许 VitePress 自动生成新锚点（如 `#recipepoolstring-recipepoolid--machinebuilderjs`），相对链接指向时按实际生成名修正。
- 每个 task 结束前执行该 task 列出的"可验证检查"。

---

## Task 1: 准备 — 把主仓库公共 API 关键文件落盘为本地事实副本

**Files:**
- 不修改任何文件
- 操作：在 worktree 根目录下建立临时只读快照路径 `.cache/mmcr-src/`（已在 `.gitignore`），从主仓库软链接或复制关键源文件

**为什么先做：** 后续 7 个 task 都要以源码行号为准引用；若中途主仓库工作树变化会导致 `cn/howxu/mmcr/...:LINE` 失真。

- [ ] **Step 1: 确认主仓库路径与目标关键文件**

```bash
test -d ../ModularMachinery-Community-Refoxed || { echo "主仓库不存在"; exit 1; }
cd ../ModularMachinery-Community-Refoxed
test -f src/main/java/cn/howxu/mmcr/api/publicapi/machine/MachineBuilder.java
test -f src/main/java/cn/howxu/mmcr/api/publicapi/recipe/LevelRequirement.java
test -f src/main/java/cn/howxu/mmcr/api/publicapi/network/RequestFailureReason.java
test -f src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBuilderJS.java
test -f src/main/java/cn/howxu/mmcr/compat/kubejs/MachineRecipeBuilderJS.java
test -f src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java
```

- [ ] **Step 2: 抓取并记录每个关键方法的精确行号**

```bash
echo "=== MachineBuilder.recipePool ==="
grep -n "recipePool" src/main/java/cn/howxu/mmcr/api/publicapi/machine/MachineBuilder.java
echo "=== MachineDefinition compact ctor fallback ==="
grep -n "recipePoolId = recipePoolId == null ? id" src/main/java/cn/howxu/mmcr/api/publicapi/machine/MachineDefinition.java
echo "=== LevelRequirement ==="
grep -n "" src/main/java/cn/howxu/mmcr/api/publicapi/recipe/LevelRequirement.java
echo "=== MachineRecipeBuilder.levelRequirement ==="
grep -n "levelRequirement" src/main/java/cn/howxu/mmcr/api/publicapi/recipe/MachineRecipeBuilder.java
echo "=== RequestFailureReason ==="
grep -n "" src/main/java/cn/howxu/mmcr/api/publicapi/network/RequestFailureReason.java
echo "=== MachineBuilderJS.recipePool ==="
grep -n "recipePool" src/main/java/cn/howxu/mmcr/compat/kubejs/MachineBuilderJS.java
echo "=== KubeJSApi.levelRequirement ==="
grep -n -A 8 "public LevelRequirement levelRequirement" src/main/java/cn/howxu/mmcr/compat/kubejs/KubeJSApi.java
```

记录输出（用作后续 task 的行号引用）。如果主仓库 line 与 spec §3 给的不一致，**停下**，更新 spec 行号后再继续——这是 spec 与代码漂移的早期信号。

- [ ] **Step 3: 没有文件变更，无 commit**

任务结束。

---

## Task 2: zh-cn/API/JavaAPI.md — Recipe Pool Java 侧新增节

**Files:**
- Modify: `zh-cn/API/JavaAPI.md`（在 `### MachineBuilder` 节的 `portTiers(...)` 子节之后、`tickBehavior(...)` 之前插入 `### recipePool(Identifier)` 子节；并在顶部包路径清单的 `recipe` 包说明中补一行）
- Modify: `zh-cn/API/JavaAPI.md`（在 `### MachineDefinition` 节的字段表中新增 `recipePoolId` 行；在构造器签名列表中把 `recipePoolId` 作为新增参数列出）

**为什么先做：** Recipe Pool 是机器定义层的新字段，影响 MachineBuilder 与 MachineDefinition 两个核心 record/类；先定下这两个事实，再去动 KubeJS / 教程页才不会出现"教程页引用了 wiki 中尚未存在的节"。

**Consumes / Produces:**
- 引用主仓库 `cn.howxu.mmcr.api.publicapi.machine.MachineBuilder.java:69-72` 与 `MachineDefinition.java:107`
- 产出锚点：`#recipepoolidentifier-recipepoolid--machinebuilder`（VitePress 自动生成，以实际为准）

- [ ] **Step 1: 定位插入点**

```bash
grep -n "^### " zh-cn/API/JavaAPI.md | grep -E "MachineBuilder|MachineDefinition|portTiers|tickBehavior" | head -10
```

预期：`### MachineBuilder` 在前几百行内、`### MachineDefinition` 紧随其后；`portTiers` 与 `tickBehavior` 是 `MachineBuilder` 节内的子标题。

- [ ] **Step 2: 在 `MachineBuilder` 节插入 `recipePool(Identifier)` 子节**

把这段（精确格式匹配现有子节风格——固定宽度表、Java 代码块 + 注释）插入到 `portTiers(...)` 子节结尾、`tickBehavior(...)` 子节之前：

```markdown
#### `recipePool(Identifier recipePoolId)`

声明机器所属的配方池。同一配方池内的机器在 JEI 与重载流水线中按 ID 分组。

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `recipePoolId` | `Identifier` | 配方池 ID。若不调用，`MachineDefinition` 构造时回退到机器 ID。 |

抛出：

- `NullPointerException`：`recipePoolId` 为 `null`（由 `Objects.requireNonNull` 抛出）。

源码：

```java
// cn.howxu.mmcr.api.publicapi.machine.MachineBuilder
public MachineBuilder recipePool(Identifier recipePoolId) {
    this.recipePoolId = Objects.requireNonNull(recipePoolId, "recipePoolId");
    return this;
}
```

示例：

```java
event.registerMachine(MY_MACHINE, builder -> builder
        .displayNameKey("machine.my_mod.my_machine")
        .recipePool(Identifier.fromNamespaceAndPath("my_mod", "shared_pool")));
```
```

- [ ] **Step 3: 在 `MachineDefinition` 节同步字段与构造器**

- 字段表新增一行：

```
| `recipePoolId` | `Identifier` | 配方池 ID；构造时若仍为 `null` 回退为机器 ID。 |
```

- 在 `MachineDefinition` 节里"构造器签名列表"（或等价的多个构造器段落）任一签名后追加 `Identifier recipePoolId` 参数；不要为任意构造器添加 `@Deprecated` 标注——以源码为准。

- [ ] **Step 4: 在顶部包路径清单的 `recipe` 包说明中补一行**

定位现有 `- cn.howxu.mmcr.api.publicapi.recipe` 那一段，补：

```
- `cn.howxu.mmcr.api.publicapi.recipe` — 配方相关类型（含 `MachineRecipeBuilder` 的 `recipePool(Identifier)` 与 `LevelRequirement`）。
```

- [ ] **Step 5: 可验证检查**

```bash
grep -n "recipePool" zh-cn/API/JavaAPI.md
```

预期：至少 4 行命中（新增节内 3 处 + 顶部包路径 1 处）；无 `recipePool\b` 出现但缺示例或缺抛出条件。

- [ ] **Step 6: 提交**

```bash
git add zh-cn/API/JavaAPI.md
git commit -m "docs(javaapi): add recipePool section for MachineBuilder and MachineDefinition"
```

---

## Task 3: zh-cn/API/KubeJS.md — Recipe Pool KubeJS 侧整节替换 + Level Requirement 抛出条件补全

**Files:**
- Modify: `zh-cn/API/KubeJS.md`（把 `##### recipeFamily(String recipeFamilyId) → MachineBuilderJS` 整节替换为 `recipePool(String)`）
- Modify: `zh-cn/API/KubeJS.md`（在 `##### levelRequirement(String typeId, String levelId) → LevelRequirement` 节的"抛出"行补充 `Identifier.parse` 失败一条）

**Consumes:**
- Task 2 产出的 Recipe Pool 节（用于相对链接锚点对齐）
- 主仓库 `cn.howxu.mmcr.compat.kubejs.MachineBuilderJS.java:210-213` 与 `KubeJSApi.java:295-303`

- [ ] **Step 1: 定位 `recipeFamily` 节**

```bash
grep -n "recipeFamily" zh-cn/API/KubeJS.md
```

预期：约 1 行命中节标题。

- [ ] **Step 2: 整段替换**

把整段 `##### recipeFamily(String recipeFamilyId) → MachineBuilderJS`（含标题、参数表、返回、抛出、默认值、示例代码块、紧随其后的 `expandableStructure()` 子节之前的空行）替换为：

```markdown
##### `recipePool(String recipePoolId) → MachineBuilderJS`

- **参数表**：`recipePoolId`（`String`）— 配方池 ID；非法 ID 字符串会抛 `IllegalArgumentException`。
- **返回**：当前构建器。
- **抛出**：`IllegalArgumentException`：`Identifier.parse(...)` 失败。
- **默认值**：机器自身 ID。
- **示例**：

```javascript
machine.recipePool("example:press")
```
```

- [ ] **Step 3: 补 Level Requirement 抛出条件**

定位 `##### levelRequirement(String typeId, String levelId) → LevelRequirement` 节的"抛出"行；当前一行是 `IllegalArgumentException：类型未注册、等级未注册或等级属于另一个类型。`，在其后追加：

```
若 `typeId` / `levelId` 解析为非法 `Identifier` 字符串（无法用 `:` 拆出命名空间与路径），`Identifier.parse(...)` 抛 `IllegalArgumentException`。
```

- [ ] **Step 4: 可验证检查**

```bash
grep -n "recipeFamily\|recipePool" zh-cn/API/KubeJS.md
```

预期：原本的 `recipeFamily` 节标题不再存在；`recipePool` 在节标题、参数表、抛出、示例中至少出现 4 次。

```bash
grep -n "levelRequirement" zh-cn/API/KubeJS.md
```

预期：在第 1038 行附近的节里"抛出"段同时含"类型未注册"和"无法用 `:` 拆出"两句话。

- [ ] **Step 5: 提交**

```bash
git add zh-cn/API/KubeJS.md
git commit -m "docs(kubejs): replace recipeFamily with recipePool and clarify levelRequirement throws"
```

---

## Task 4: zh-cn/API/JavaAPI.md — Level Requirement Java 侧重写

**Files:**
- Modify: `zh-cn/API/JavaAPI.md`（重写 `### LevelRequirement` 节，包路径同步）

**Consumes:**
- 主仓库 `cn.howxu.mmcr.api.publicapi.recipe.LevelRequirement.java` 全文
- Task 2 已经把顶部包路径里的 `recipe` 包说明提到 `LevelRequirement`，此 task 只需核对节内文档

- [ ] **Step 1: 定位现有节**

```bash
grep -n "^### \`LevelRequirement\`" zh-cn/API/JavaAPI.md
```

预期：在第 3101 行附近。

- [ ] **Step 2: 修包路径错**

现有节写 `cn.howxu.mmcr.api.publicapi.machine.LevelRequirement`；源码在 `cn.howxu.mmcr.api.publicapi.recipe.LevelRequirement`。改为：

```
完整类名：`cn.howxu.mmcr.api.publicapi.recipe.LevelRequirement`
```

- [ ] **Step 3: 替换"记录签名"小节**

把现有 `#### 记录签名` 整段（包含 `public record LevelRequirement(Identifier typeId, Identifier levelId);`）替换为：

```markdown
#### 记录签名

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
```

- [ ] **Step 4: 替换"字段"小节**

现有字段表只有 `typeId` / `levelId` 两行。替换为：

```
| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `io` | `RecipeIo` | 流向；构造时强制为 `RecipeIo.INPUT`，三参数构造器以外的入口抛 `IllegalArgumentException`。 |
| `typeId` | `Identifier` | 等级类型 ID。 |
| `levelId` | `Identifier` | 该类型下具体等级 ID。 |
```

- [ ] **Step 5: 替换"构造约束"小节**

现有节"构造约束"只写"`typeId` / `levelId` 为 `null` → `NullPointerException`。"。替换为：

```
构造约束（紧凑构造器）：

- `io != RecipeIo.INPUT` → `IllegalArgumentException("Level requirements must use input direction")`。
- `typeId` / `levelId` 为 `null` → `NullPointerException`。
```

- [ ] **Step 6: 追加"非物理"语义说明**

在"构造约束"之后、"示例"之前新增一段：

```
等级要求是配方级的输入方向校验，**不参与物理输入槽匹配**（即不消耗物品、不占用槽位，仅在配方匹配阶段验证玩家的机器是否达到该等级）。
```

- [ ] **Step 7: 可验证检查**

```bash
grep -n "LevelRequirement\|RecipeIo\.INPUT\|非物理" zh-cn/API/JavaAPI.md
```

预期：包路径已更新为 `api.publicapi.recipe`；节内同时含 `RecipeIo.INPUT` 与"非物理"两关键词。

- [ ] **Step 8: 提交**

```bash
git add zh-cn/API/JavaAPI.md
git commit -m "docs(javaapi): align LevelRequirement record with source (io field, non-physical)"
```

---

## Task 5: zh-cn/API/JavaAPI.md — RequestFailureReason 枚举全量重列

**Files:**
- Modify: `zh-cn/API/JavaAPI.md`（重写 `### RequestFailureReason` 节）
- Verify-only: 对照主仓库 `cn.howxu.mmcr.api.publicapi.network.RequestFailureReason.java` 全文

**Consumes:** 主仓库枚举全 10 个常量。

- [ ] **Step 1: 定位现有节**

```bash
grep -n "^### \`RequestFailureReason\`" zh-cn/API/JavaAPI.md
```

预期：在第 5240 行附近。

- [ ] **Step 2: 写枚举表**

把现有节内的常量列表（通常是一段 Java 代码或一段表格）替换为：

```
枚举常量（按源码声明顺序）：

| 常量 | 触发条件（按命名推断 / 源码注释） |
| --- | --- |
| `SOURCE_INTERFACE_MISSING` | 发起方机器在请求时找不到网络接口。 |
| `TARGET_INTERFACE_MISSING` | 目标接口已被销毁或未成型。 |
| `TARGET_CHUNK_UNLOADED` | 目标机器所在区块未加载。 |
| `CONNECTION_MISSING` | 发起与目标接口之间没有建立连接。 |
| `SOURCE_STRUCTURE_INVALID` | 发起方结构快照失效。 |
| `TARGET_STRUCTURE_INVALID` | 目标结构快照失效。 |
| `HASH_MISMATCH` | 控制器哈希校验失败。 |
| `ALLOWLIST_REJECTED` | 目标接口的白名单拒绝了该请求。 |
| `TARGET_HANDLER_MISSING` | 目标机器未注册对应 `requestId` 的处理器。 |
| `UNREACHABLE` | 拓扑不可达（多种边界条件的兜底分支）。 |
```

- [ ] **Step 3: 可验证检查**

```bash
grep -n "SOURCE_INTERFACE_MISSING\|TARGET_INTERFACE_MISSING\|TARGET_CHUNK_UNLOADED\|CONNECTION_MISSING\|SOURCE_STRUCTURE_INVALID\|TARGET_STRUCTURE_INVALID\|HASH_MISMATCH\|ALLOWLIST_REJECTED\|TARGET_HANDLER_MISSING\|UNREACHABLE" zh-cn/API/JavaAPI.md
```

预期：10 个常量全数命中一次。

```bash
cd ../ModularMachinery-Community-Refoxed && diff <(grep -E "^\s+[A-Z_]+," src/main/java/cn/howxu/mmcr/api/publicapi/network/RequestFailureReason.java) <(grep -oE "[A-Z_]+" zh-cn/API/JavaAPI.md | sort -u | grep -E "INTERFACE_MISSING|CHUNK_UNLOADED|CONNECTION_MISSING|STRUCTURE_INVALID|HASH_MISMATCH|ALLOWLIST_REJECTED|HANDLER_MISSING|UNREACHABLE")
```

预期：仅常量名差异——若有遗漏回到 Step 2 补齐。

- [ ] **Step 4: 提交**

```bash
git add zh-cn/API/JavaAPI.md
git commit -m "docs(javaapi): enumerate full RequestFailureReason constants"
```

---

## Task 6: 清理 10 个 KubeJS 教程页中的失效 `recipeFamily` 调用 — 批量

**Files:**
- Modify: `zh-cn/KubeJS/纯Tick机器示例.md`、`数据存储测试机器.md`、`配方Tick示例.md`、`蒸馏塔.md`、`裂化器.md`、`太空电梯.md`、`热能冶炼炉.md`、`反应堆.md`、`紫珀炉.md`、`合金炉.md`
- 不动的页面：`算力-网络交互示例.md`（已 grep 确认无 recipeFamily）

**Consumes:** Task 3 已经在 `zh-cn/API/KubeJS.md` 替换了 `recipeFamily` 节，本 task 仅清理教程页里 11 个独立文件中的代码块与注释。

- [ ] **Step 1: 一次性完成所有 10 个文件的代码块替换**

对每个文件，把 `grep -rl 'recipeFamily' zh-cn/KubeJS | sort` 命中的 10 个文件：
1. `.recipeFamily("...")` → `.recipePool("...")`
2. "配方族 ID" / "配方系列 ID" / "绑定到同一族" / "老演员了" → "配方池 ID"
3. 顶部"参数表"里 `MachineBuilderJS.recipeFamily(...)` 链接（如有）换成 `MachineBuilderJS.recipePool(...)`，锚点以 Task 3 实际生成的为准

策略：用 `sed -i 's/\.recipeFamily(/\.recipePool(/g'` + 后续 `Edit` 工具手工处理注释行；不要一次性 `sed -i` 改注释文案（容易误伤）。

```bash
sed -i 's/\.recipeFamily(/\.recipePool(/g' \
    zh-cn/KubeJS/纯Tick机器示例.md \
    zh-cn/KubeJS/数据存储测试机器.md \
    zh-cn/KubeJS/配方Tick示例.md \
    zh-cn/KubeJS/蒸馏塔.md \
    zh-cn/KubeJS/裂化器.md \
    zh-cn/KubeJS/太空电梯.md \
    zh-cn/KubeJS/热能冶炼炉.md \
    zh-cn/KubeJS/反应堆.md \
    zh-cn/KubeJS/紫珀炉.md \
    zh-cn/KubeJS/合金炉.md
```

预期：`grep -rn 'recipeFamily' zh-cn/KubeJS` 仅命中 0 行（说明代码块已替换干净）。

- [ ] **Step 2: 手工改注释文案 — 用 Edit 工具逐文件**

依次打开以下文件，把所有 "配方族 ID" / "配方系列 ID" / "绑定到同一族" / "老演员了" 改为 "配方池 ID"。建议用 grep 先定位再 edit：

```bash
grep -n "配方族\|配方系列\|绑定到同一族\|老演员" zh-cn/KubeJS/*.md
```

预期：所有命中行都改成"配方池 ID"或匹配语境。

- [ ] **Step 3: 删除 `zh-cn/KubeJS/反应堆.md:82` 的历史注释并替换**

打开 `zh-cn/KubeJS/反应堆.md`，定位到含 `(在过去的某个提案中...recipeFamily留了下来)` 的段落。删除这段长注释，在原位置补一句：

```
`recipePool` 是机器定义层用于配方分组与广播的标识，决定机器配方如何被注册、检索与同步到 JEI 与重载流水线。
```

- [ ] **Step 4: 修复顶部"参数表"链接（如存在）**

```bash
grep -n "MachineBuilderJS.recipeFamily\|MachineBuilderJS\.recipeFamily" zh-cn/KubeJS/*.md
```

对命中行，链接部分 `MachineBuilderJS.recipeFamily(...)` 改为 `MachineBuilderJS.recipePool(...)`，锚点 `#machinebuilderjsrecipefamilystring-recipefamilyid--machinebuilderjs` 改为 `#recipepoolstring-recipepoolid--machinebuilderjs`（VitePress 自动生成名）。

- [ ] **Step 5: 可验证检查**

```bash
grep -rn 'recipeFamily' zh-cn/KubeJS
echo "---"
grep -rn '配方族\|配方系列\|绑定到同一族\|老演员' zh-cn/KubeJS
```

预期：两行命令输出均空。

```bash
grep -rn 'recipePool' zh-cn/KubeJS | wc -l
```

预期：≥ 10（每文件至少一处）。

- [ ] **Step 6: 提交**

```bash
git add zh-cn/KubeJS/纯Tick机器示例.md zh-cn/KubeJS/数据存储测试机器.md zh-cn/KubeJS/配方Tick示例.md \
    zh-cn/KubeJS/蒸馏塔.md zh-cn/KubeJS/裂化器.md zh-cn/KubeJS/太空电梯.md \
    zh-cn/KubeJS/热能冶炼炉.md zh-cn/KubeJS/反应堆.md zh-cn/KubeJS/紫珀炉.md zh-cn/KubeJS/合金炉.md
git commit -m "docs(kubejs tutorials): replace recipeFamily with recipePool across 10 example pages"
```

---

## Task 7: 最终验证 — 构建与全文比对

**Files:**
- 不修改任何文件
- 操作：本地 `npm run docs:build`，跑全量 grep 比对

- [ ] **Step 1: 跑构建**

```bash
cd /home/howxu/Projects/mmcr-wiki
npm run docs:build 2>&1 | tail -40
```

预期：`vitepress build ...` 成功；如出现 dead link 且仅指向外部 wiki（GitHub 上的旧链接），保留临时 `ignoreDeadLinks` 配置；如出现内部锚点断链，回到 Task 2-6 修复。

- [ ] **Step 2: 全量 grep 核对**

```bash
cd /home/howxu/Projects/mmcr-wiki
echo "=== A: zh-cn 不应再有 recipeFamily 调用 ==="
grep -rn 'recipeFamily' zh-cn
echo "=== B: 10 个枚举常量均在 JavaAPI.md 出现 ==="
grep -c "SOURCE_INTERFACE_MISSING\|TARGET_INTERFACE_MISSING\|TARGET_CHUNK_UNLOADED\|CONNECTION_MISSING\|SOURCE_STRUCTURE_INVALID\|TARGET_STRUCTURE_INVALID\|HASH_MISMATCH\|ALLOWLIST_REJECTED\|TARGET_HANDLER_MISSING\|UNREACHABLE" zh-cn/API/JavaAPI.md
echo "=== C: recipePool / levelRequirement 在 JavaAPI.md 与 KubeJS.md 各至少出现 4 次 ==="
grep -c 'recipePool' zh-cn/API/JavaAPI.md
grep -c 'recipePool' zh-cn/API/KubeJS.md
grep -c 'levelRequirement' zh-cn/API/JavaAPI.md
grep -c 'levelRequirement' zh-cn/API/KubeJS.md
```

预期：
- A 行输出为空；
- B 行输出 = 10（每个常量至少 1 次）；
- C 行每个数字 ≥ 4。

- [ ] **Step 3: diff 自检**

```bash
cd /home/howxu/Projects/mmcr-wiki
git diff --stat HEAD~7 HEAD
```

预期：diff 文件全部落在 §2 文件清单的 13 个 .md 之内（`zh-cn/API/JavaAPI.md`、`zh-cn/API/KubeJS.md`、`zh-cn/API/开始.md`、10 个 KubeJS 教程页）；`vitepress`、`package.json`、`README.md`、`index.md` 未出现在 diff 中。

- [ ] **Step 4: 任务结束**

任务结束。

---

## 备注：执行的协作模式

- 推荐的执行模式是 subagent-driven-development（每个 task 派一个 fresh subagent，按 task 内 step 顺序执行，task 间 review）。
- 每个 task 结束前必须跑该 task 末尾的"可验证检查"——全过才能 commit。
- 中途若发现 spec 与代码漂移（例如行号已变），回到 Task 1 重新记录行号并更新 spec；不要凭记忆改。
