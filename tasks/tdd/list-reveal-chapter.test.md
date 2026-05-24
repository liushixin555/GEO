# list-reveal-chapter TDD 执行报告

## 基本信息

| 项目 | 值 |
|------|-----|
| 被测文件 | `.agents/skills/web-video-presentation/references/EXAMPLES/list-reveal/chapter.tsx` |
| 测试文件 | `tests/pages/list-reveal-chapter.test.tsx` |
| 执行日期 | 2026-05-24 |
| 测试框架 | Jest 29 + React Testing Library |
| 测试环境 | jsdom |

## 测试结果

| 指标 | 值 |
|------|-----|
| 测试套件 | 1 passed |
| 测试用例 | **60 passed**, 0 failed |
| 执行耗时 | ~9s |

## 覆盖率

| 指标 | 值 |
|------|-----|
| Statements | **100%** |
| Branches | **100%** |
| Functions | **100%** |
| Lines | **100%** |

## 测试用例分布

### step=0 — 引子（14 项）
- lr-intro 场景容器、lr-scene 基础类名
- masthead 区域、kicker "第一部分"、2 条 rule 分割线
- h1 标题 "强在哪"、accent 强调 "哪"
- 副标题 "三件事 —— 一个个看"
- MaskReveal 包裹验证（duration/delay 参数）
- 3 个 ghost 槽位、编号 01/02/03、不显示标题正文

### step=1 — 第一项 active（7 项）
- slot 0 active / slots 1-2 ghost 状态
- 标题 "文字渲染"、正文显示
- ghost 不显示标题
- kicker 变为 "第一部分 · 强在哪"
- 无 lr-intro 类名

### step=2 — 第二项 active（6 项）
- slot 0 past / slot 1 active / slot 2 ghost
- 标题 "指令遵循"、正文显示
- past 槽位只显示标题不显示正文

### step=3 — 第三项 active（5 项）
- slots 0-1 past / slot 2 active
- 标题 "照片真实感"、正文显示
- past 槽位只显示标题不显示正文

### step>=4 — 全部 past（4 项）
- step=4 全部 3 个 past 槽位
- past 槽位只显示标题不显示正文
- step=5/100 极端值兜底

### step < 0 边界（2 项）
- step=-1 全部 ghost（activeIdx=-2）
- 不渲染 lr-intro

### Slot 组件内部结构（5 项）
- lr-slot-num / lr-slot-content 结构
- MaskReveal 包裹参数（duration=900 / delay=350）
- past 槽位 MaskReveal 包裹验证

### MaskReveal 调用统计（5 项）
- step 0-4 的 MaskReveal 数量精确验证

### 场景切换（4 项）
- step=0→1 / step=1→2 / step=3→4 切换
- kicker 文字随 step 动态变化

### 槽位编号（5 项）
- step 0-4 编号 01/02/03 始终存在

### grid 布局（3 项）
- lr-grid 存在性、3 个 lr-slot 固定布局

## 覆盖的分支

| 分支 | 测试 step |
|------|-----------|
| `step === 0` → intro 分支 | step=0 |
| `step !== 0` → 正常分支 | step=1,2,3,4,5,100,-1 |
| `i < activeIdx` → past | step=2,3,4 |
| `i === activeIdx` → active | step=1,2,3 |
| `i > activeIdx` → ghost | step=0,1,2 |
| `state !== "ghost"` → 显示内容 | step=1,2,3,4 |
| `state === "active"` → 显示 body | step=1,2,3 |
