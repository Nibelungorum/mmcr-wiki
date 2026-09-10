# MMCR Wiki Markdown 容器美化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 MMCR wiki 现存的 `#### 注意事项` / `##### 注意事项` / `**注意事项**` / `> 注意：...` / `> 备注：...` 等"提示/注意/警告/备注"类表达统一迁移到 VitePress `:::tip / warning / danger / info` 容器，提升可读性，不引入 npm 依赖、不改 vitepress 配置。

**Architecture:** 一次性 Python 重写脚本，按"语义映射规则"把字面 `#### 注意事项` 标题折掉、把列表项 / 引用块包进对应容器。脚本不入仓。改完后用 `docs:dev` 启 vitepress，肉眼抽查 5–10 个文件。

**Tech Stack:** VitePress 1.6.4 + Vue 3.5.18；markdown-it 内置 custom containers（`:::tip/warning/info/danger/details`）；markdown-it 内置 GitHub-flavored alerts（`> [!TIP/WARNING/...]`）。无需新增依赖。

## Global Constraints

- VitePress 容器语法：`:::tip [emoji]<标题>` 起始、`:::` 结束；起始行必须有 `:::` 与类型，二者间可空格 + 可选标题。**不要**在容器内套 `:::`（会出现解析冲突）。
- VitePress 容器**支持嵌套** markdown 列表、引用块、代码块，缩进按 markdown 规则即可。**容器内部**不能再写 `:::`（即容器不可嵌套）。
- 容器默认 5 种：`tip / warning / danger / info / details`。其它类型（`note / caution / success`）未启用且不在本计划范围。
- GitHub Alert（`> [!TIP]`）不在本计划使用——按之前澄清一律用容器。
- 不动代码 fence 内的内容（Java/KubeJS 示例）。
- 不改 vitepress 配置 / `package.json`。
- 不加 emoji 标题（按之前澄清；如需后续追加）。
- 单次 commit；保留之前 18 个未 commit 的改动作为基线，不 reset。
- 不动文件级 frontmatter（`title / order`）。
- 容器起始行后必须有内容；标题、列表、引用块、段落都可。
- 不对 `index.md` 与 `快速开始/*.md` 做改动（扫不到目标）。

---

## Task 1: Dry-run 清单 + 基线确认

**Files:**
- Read: `/home/howxu/Projects/mmcr-wiki/zh-cn/`（全部 md）
- Print: stdout

**Interfaces:**
- Consumes: 无
- Produces: 终端打印的"待改文件 + 每文件修改点行数"清单

- [ ] **Step 1: 用 rg 统计 5 类目标**

```bash
cd /home/howxu/Projects/mmcr-wiki
echo '==== H4 注意事项 ===='; rg -n '^#### 注意事项$' zh-cn/ -g '*.md' | wc -l
echo '==== H5 注意事项 ===='; rg -n '^##### 注意事项$' zh-cn/ -g '*.md' | wc -l
echo '==== **注意事项** 标题 ===='; rg -n '^\*\*注意事项\*\*$' zh-cn/ -g '*.md' | wc -l
echo '==== 引用块提示 ===='; rg -n '^> 注意[：:]|^> 提示[：:]|^> 警告[：:]|^> 备注[：:]|^> 推荐[：:]' zh-cn/ -g '*.md' | wc -l
echo '==== 文件清单 ===='; rg -l '^#### 注意事项$|^##### 注意事项$|^\*\*注意事项\*\*$|^> 注意[：:]|^> 提示[：:]|^> 警告[：:]|^> 备注[：:]|^> 推荐[：:]' zh-cn/ -g '*.md'
```

预期：H4 90、H5 14、\*\*注意事项\*\* 15、引用块 9 左右（前面会话已确认实际数字）。

- [ ] **Step 2: 与基线对账，确认 18 个未 commit 改动都在**

```bash
cd /home/howxu/Projects/mmcr-wiki
git status --short | wc -l   # 应该是 18（18 个修改过的文件）
```

预期：`18`。若不一致（说明有人在你不知情时又动了文件），停下来报告给用户。

- [ ] **Step 3: 把清单打印出来给用户确认**

把 Step 1 的输出贴到对话里，问"清单 OK 吗？"。**等用户回答 "OK" 后**才进 Task 2。

---

## Task 2: 写 Python 重写脚本

**Files:**
- Create: `/tmp/mmcr-container-rewrite.py`（不入仓；任务结束删除）

**Interfaces:**
- Consumes: 命令行传入文件路径列表
- Produces: 原地改写每个文件，stdout 打印"modified <file> (N changes)"

- [ ] **Step 1: 写脚本骨架**

```python
#!/usr/bin/env python3
"""One-shot rewriter: turns MMCR-wiki note paragraphs into VitePress containers."""
from __future__ import annotations
import re, sys, pathlib
from typing import Callable

W = '\uff0c'  # not used directly; placeholder

# Regex for each pattern we'll match.
RE_H45_NOTE = re.compile(r'^(#{4,5})\s*注意事项\s*$', re.MULTILINE)
RE_BOLD_NOTE = re.compile(r'^\*\*注意事项\*\*\s*$', re.MULTILINE)
RE_QUOTE_NOTE = re.compile(
    r'^>\s*(注意|提示|警告|备注|推荐|推荐做法)[：:]\s*(.*)$', re.MULTILINE)

# When H4/H5/Bold "注意事项" appears, we want to fold it + everything up to
# the next heading at >= that level, or to the next empty line + heading boundary.
HEADING_RE_CACHE: dict[int, re.Pattern] = {}

def heading_pattern(level: int) -> re.Pattern:
    p = HEADING_RE_CACHE.get(level)
    if p is None:
        p = re.compile(rf'^#{{{level}}}\s', re.MULTILINE)
        HEADING_RE_CACHE[level] = p
    return p
```

- [ ] **Step 2: 实现 `fold_heading_to_container`（H4/H5 路径）**

```python
def fold_heading_to_container(s: str, heading_re: re.Pattern, container: str, title: str) -> tuple[str, int]:
    """Find each `#### 注意事项` (or `#####`); fold it + its body into a `:::warning 注意事项 ... :::` block.
    The body ends at the next heading at the same or shallower level, or at EOF.
    Returns (new_text, change_count)."""
    out: list[str] = []
    pos = 0
    changes = 0
    while True:
        m = heading_re.search(s, pos)
        if not m:
            out.append(s[pos:])
            break
        # Write everything before this heading verbatim.
        out.append(s[pos:m.start()])
        # Find body end: next heading at level <= heading level.
        if heading_re.pattern.startswith(r'^#{4,5}'):
            level = len(m.group(1))
        else:
            level = 4  # bold case
        next_h = re.search(rf'^#{{1,{level}}}\s', s[m.end():], re.MULTILINE)
        body_end = m.end() + next_h.start() if next_h else len(s)
        # Strip trailing blank lines from body so the closing `:::` is tight.
        body = s[m.end():body_end].rstrip()
        # Inject the container.
        if body:
            out.append(f':::{container} {title}\n')
            out.append(body + '\n')
            out.append(':::\n')
        else:
            # Heading with empty body — skip the heading, do not insert empty container.
            pass
        changes += 1
        pos = body_end
    return ''.join(out), changes
```

- [ ] **Step 3: 实现 `fold_bold_note_to_container`（`**注意事项**` 路径）**

```python
def fold_bold_note_to_container(s: str) -> tuple[str, int]:
    """Fold each `**注意事项**` + its body (until next heading or blank+heading) into :::warning."""
    out: list[str] = []
    pos = 0
    changes = 0
    while True:
        m = RE_BOLD_NOTE.search(s, pos)
        if not m:
            out.append(s[pos:])
            break
        out.append(s[pos:m.start()])
        # End at next heading at any level (# through #####).
        next_h = re.search(r'^#{1,5}\s', s[m.end():], re.MULTILINE)
        body_end = m.end() + next_h.start() if next_h else len(s)
        body = s[m.end():body_end].rstrip()
        if body:
            out.append(':::warning 注意事项\n')
            out.append(body + '\n')
            out.append(':::\n')
        changes += 1
        pos = body_end
    return ''.join(out), changes
```

- [ ] **Step 4: 实现 `fold_quote_to_container`（`> 注意：xxx` / `> 备注：xxx` 等路径）**

```python
QUOTE_KIND_TO_CONTAINER: dict[str, tuple[str, str]] = {
    '注意':       ('warning', '注意'),
    '警告':       ('danger',  '警告'),
    '提示':       ('tip',     '提示'),
    '推荐':       ('tip',     '推荐'),
    '推荐做法':   ('tip',     '推荐做法'),
    '备注':       ('info',    '备注'),
}

def fold_quote_to_container(s: str) -> tuple[str, int]:
    """Fold each `> <kind>：<body>` (and its continuation `>` lines) into a container."""
    out: list[str] = []
    pos = 0
    changes = 0
    while True:
        m = RE_QUOTE_NOTE.search(s, pos)
        if not m:
            out.append(s[pos:])
            break
        out.append(s[pos:m.start()])
        kind, rest = m.group(1), m.group(2)
        if kind not in QUOTE_KIND_TO_CONTAINER:
            # Should not happen given regex, but defensive.
            out.append(s[m.start():m.end()])
            pos = m.end()
            continue
        container, title = QUOTE_KIND_TO_CONTAINER[kind]
        # Collect continuation `>` lines.
        body_lines: list[str] = []
        if rest:
            body_lines.append(rest)
        scan = m.end()
        while True:
            nl = s.find('\n', scan)
            if nl == -1:
                tail = s[scan:]
                if tail.startswith('> '):
                    body_lines.append(tail[2:])
                    scan = len(s)
                break
            line = s[scan:nl]
            if line.startswith('> '):
                body_lines.append(line[2:])
                scan = nl + 1
                continue
            if line == '>':
                body_lines.append('')
                scan = nl + 1
                continue
            break
        # Trim trailing blank lines in body.
        while body_lines and body_lines[-1].strip() == '':
            body_lines.pop()
        body = '\n'.join(body_lines).rstrip()
        out.append(f':::{container} {title}\n')
        if body:
            out.append(body + '\n')
        out.append(':::\n')
        changes += 1
        pos = scan
    return ''.join(out), changes
```

- [ ] **Step 5: 实现 main + dry-run**

```python
def rewrite(text: str) -> tuple[str, int]:
    total = 0
    text, n = fold_heading_to_container(text, RE_H45_NOTE, 'warning', '注意事项')
    total += n
    text, n = fold_bold_note_to_container(text)
    total += n
    text, n = fold_quote_to_container(text)
    total += n
    return text, total

def main(argv: list[str]) -> int:
    dry = '--dry' in argv
    argv = [a for a in argv if a != '--dry']
    total_changes = 0
    for path in argv:
        p = pathlib.Path(path)
        s = p.read_text(encoding='utf-8')
        new, n = rewrite(s)
        if not dry and new != s:
            p.write_text(new, encoding='utf-8')
        print(f'{"(dry) " if dry else ""}modified {p} ({n} changes)')
        total_changes += n
    print(f'TOTAL: {total_changes}')
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 6: 用 --dry 跑一次确认计数与 Task 1 一致**

```bash
cd /home/howxu/Projects/mmcr-wiki
files=$(rg -l '^#### 注意事项$|^##### 注意事项$|^\*\*注意事项\*\*$|^> 注意[：:]|^> 提示[：:]|^> 警告[：:]|^> 备注[：:]|^> 推荐[：:]' zh-cn/ -g '*.md')
python3 /tmp/mmcr-container-rewrite.py --dry $files
```

预期：TOTAL 与 Task 1 的几类计数总和一致。若偏差超过 ±2，停下来报告。

- [ ] **Step 7: 提交 commit（脚本本身不入仓，所以此步无 git 操作）**

任务内没有 commit——脚本在 `/tmp/`，结束就删。

---

## Task 3: 真跑改写

**Files:**
- Modify: Task 1 列出的所有 `.md`

**Interfaces:**
- Consumes: Task 2 的脚本
- Produces: 每个目标 .md 的新版本

- [ ] **Step 1: 跑脚本（去掉 `--dry`）**

```bash
cd /home/howxu/Projects/mmcr-wiki
files=$(rg -l '^#### 注意事项$|^##### 注意事项$|^\*\*注意事项\*\*$|^> 注意[：:]|^> 提示[：:]|^> 警告[：:]|^> 备注[：:]|^> 推荐[：:]' zh-cn/ -g '*.md')
python3 /tmp/mmcr-container-rewrite.py $files
```

预期：每个文件输出 `modified <file> (N changes)`，末尾 `TOTAL: ~120`（90 H4 + 14 H5 + 15 bold + ~9 quote）。

- [ ] **Step 2: 抽查 1：API/KubeJS.md（最大块）**

```bash
cd /home/howxu/Projects/mmcr-wiki
rg -n '^#### 注意事项$|^##### 注意事项$|^\*\*注意事项\*\*$|^> 注意[：:]' zh-cn/API/KubeJS.md
```

预期：**没有**任何匹配（全部已折进容器）。

- [ ] **Step 3: 抽查 2：API/JavaAPI.md**

```bash
rg -n '^#### 注意事项$|^##### 注意事项$|^\*\*注意事项\*\*$' zh-cn/API/JavaAPI.md
```

预期：无匹配。

- [ ] **Step 4: 抽查 3：引用块是否还有残留**

```bash
cd /home/howxu/Projects/mmcr-wiki
rg -n '^> 注意[：:]|^> 提示[：:]|^> 警告[：:]|^> 备注[：:]|^> 推荐[：:]' zh-cn/
```

预期：无匹配。

- [ ] **Step 5: 抽查 4：开头的 `:::warning 注意事项` 渲染**

```bash
cd /home/howxu/Projects/mmcr-wiki
rg -n '^:::warning 注意事项$|^:::warning 注意$|^:::tip 提示$|^:::tip 推荐$|^:::danger 警告$|^:::info 备注$' zh-cn/ | head -20
```

预期：每条原文都生成了对应的 `:::` 行。

---

## Task 4: VitePress 视觉抽查

**Files:**
- Read: 启动中的 dev server
- Outputs: 终端报告

**Interfaces:**
- Consumes: 改写后的 .md
- Produces: 用户对渲染效果的确认

- [ ] **Step 1: 启 dev server（后台）**

```bash
cd /home/howxu/Projects/mmcr-wiki
npm run docs:dev &
sleep 6
```

预期：输出 `Local: http://localhost:5173/`。若端口冲突，前台会报错；把 5173 换成空闲端口。

- [ ] **Step 2: 浏览以下 5 个页面，**记录**每个容器的视觉**

```
http://localhost:5173/zh-cn/JavaAPI/数据存储测试机器  (含 > 备注, > 注意)
http://localhost:5173/zh-cn/KubeJS/反应堆            (含 > 备注)
http://localhost:5173/zh-cn/API/JavaAPI              (含 90 处 #### 注意事项 + 14 处 #####)
http://localhost:5173/zh-cn/API/KubeJS               (含 **注意事项** 标题)
http://localhost:5173/zh-cn/JavaAPI/高炉             (含 #### 注意事项)
```

**视觉检查清单：**
- 容器是否带左侧色条（蓝/黄/红/绿）。
- 容器内列表 / 代码块 / 内层 `>` 引用是否正确渲染。
- 标题"注意事项" / "注意" / "备注" 是否出现在容器顶部。
- 没有出现 `:::` 起始行后立刻 `:::` 结束（空容器）。
- 没有出现 `:::` 嵌套（外层 `:::` 内又写了 `:::`）。

- [ ] **Step 3: 把 5 个截图或文字描述贴给用户，问"视觉 OK 吗？"**

**等用户回答**。如果用户说哪个不对，把对应的 .md 文件名 + 问题报回来，按下面"修复补丁"加 Step：

```bash
cd /home/howxu/Projects/mmcr-wiki
# 改文件
python3 /tmp/mmcr-container-rewrite.py <specific_file>
# 浏览器刷新页面，再确认
```

- [ ] **Step 4: 关掉 dev server**

```bash
pkill -f 'vitepress dev'
```

---

## Task 5: 提交 + 清理

**Files:**
- Modify: `<list>`（Task 3 改的）
- Delete: `/tmp/mmcr-container-rewrite.py`

**Interfaces:**
- Consumes: 改写后的 .md
- Produces: 1 个 commit

- [ ] **Step 1: git status 看修改文件清单**

```bash
cd /home/howxu/Projects/mmcr-wiki
git status --short
```

预期：除了之前 18 个未 commit 改动外，**再追加**几个新修改文件（新修改的部分应当只是新增 `:::...` 容器，不影响 18 个文件之外的代码）。

- [ ] **Step 2: 验证未 commit 改动没被破坏**

```bash
git diff --stat HEAD
```

预期：每个之前已修改的文件，diff 行数应该**只增不减**（新增了容器），不能比跑脚本前少。

- [ ] **Step 3: 把新增的 .md 改动 stage + commit**

```bash
cd /home/howxu/Projects/mmcr-wiki
git add zh-cn/
git status --short
git commit -m "docs: 迁移注意事项 / 提示 / 警告 / 备注到 VitePress 容器

- ####/##### 注意事项 与 **注意事项** 标题全部折进 :::warning 注意事项
- > 注意：xxx 折进 :::warning 注意
- > 提示：xxx / > 推荐：xxx 折进 :::tip 提示 / 推荐
- > 警告：xxx 折进 :::danger 警告
- > 备注：xxx 折进 :::info 备注

零依赖、不改 vitepress 配置。"
```

- [ ] **Step 4: 删脚本**

```bash
rm /tmp/mmcr-container-rewrite.py
```

---

## Self-Review（已完成）

- **Spec coverage**：
  - H4 注意事项 ✓ → Task 2 `RE_H45_NOTE` + Task 3 跑脚本
  - H5 注意事项 ✓ → 同上（H4/H5 同处理）
  - `**注意事项**` ✓ → Task 2 `RE_BOLD_NOTE` + Task 3
  - `> 注意：xxx` 等 ✓ → Task 2 `RE_QUOTE_NOTE` + Task 3
  - 字面映射规则 ✓ → Task 2 `QUOTE_KIND_TO_CONTAINER`
  - 边界：多行引用、列表内代码块、同节多个、空标题 ✓ → Task 2 内置
  - 工艺（脚本 + 视觉抽查 + commit）✓ → Task 1/2/4/5
- **Placeholder 扫描**：无 TBD/TODO；所有命令给出完整；无 "fill in later"。
- **类型 / 命名一致**：脚本内的 `QUOTE_KIND_TO_CONTAINER` 键与正则捕获组一一对应（注意 / 警告 / 提示 / 推荐 / 推荐做法 / 备注），未发现矛盾。
- **任务粒度**：每 Task 2–5 分钟；Task 1/2 在脚本内一个 Step 内完成。
