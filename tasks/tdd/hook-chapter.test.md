# hook-chapter · TDD 执行报告

- **源文件**: `.agents/skills/web-video-presentation/references/EXAMPLES/hook-chapter/chapter.tsx`
- **测试文件**: `tests/pages/hook-chapter.test.tsx`
- **执行日期**: 2026-05-24

## 测试结果

| 指标 | 值 |
|------|-----|
| 测试套件 | 1 passed |
| 测试用例 | 42 passed, 0 failed |
| 语句覆盖率 | 100% |
| 分支覆盖率 | 100% |
| 函数覆盖率 | 100% |
| 行覆盖率 | 100% |
| 执行时间 | ~3.9s |

## 测试用例清单

### step=0 — 三张 ghost 卡片（7 项）
| # | 用例 | 验证点 |
|---|------|--------|
| 1 | 应渲染 kicker 引子区域 | `screen.getByText('这几天')` |
| 2 | 应渲染 3 个 ghost 占位卡片 | `.hk-ghost` 数量 === 3 |
| 3 | ghost 编号依次为 01、02、03 | 文本内容断言 |
| 4 | 每个 ghost 内含 image 标签 | `screen.getAllByText('image')` 长度 === 3 |
| 5 | 应包含 3 个 MaskReveal 组件 | `data-testid="mask-reveal"` 数量 |
| 6 | MaskReveal 依次带 0/200/400ms 延迟 | delay 属性值验证 |
| 7 | kicker 区域包含 accent 红条 | `.hk-kicker-line` 存在 |

### step=1/2/3 — 单图独占（19 项，含 3×6 + 1 跨 step）
| # | 用例 | 验证点 |
|---|------|--------|
| 8-10 | 图片渲染 + alt 包含反例 caption | `getByRole('img')` + alt 属性 |
| 11-13 | 编号标签 01/03, 02/03, 03/03 | 文本断言 |
| 14-16 | FAKE? 角章 | 文本断言 |
| 17-19 | 2 个 MaskReveal（图片+元信息） | 数量 === 2 |
| 20-22 | 第二个 MaskReveal 延迟 400ms | delay 属性 |
| 23-25 | hk-solo-frame 容器 | CSS 类名存在 |
| 26 | 三个 step 图片 src 各不相同 | Set 去重验证 |

### step=4 — takeover（6 项）
| # | 用例 | 验证点 |
|---|------|--------|
| 27 | 应渲染 3 张缩略图 | `.hk-mini` 数量 === 3 |
| 28 | 应包含 accent 红条 | `.hk-accent-bar` 存在 |
| 29 | 应包含 hero 大字区域 | `.hk-hero` 存在 |
| 30 | 应包含 MaskReveal | 至少 1 个 |
| 31 | 缩略图带动画延迟 | animationDelay 0/80/160ms |
| 32 | 外层 hk-takeover 类名 | CSS 类名存在 |

### step>=5 — 钩子收束（6 项）
| # | 用例 | 验证点 |
|---|------|--------|
| 33 | 应渲染引用文字区域 | `.hk-quote` 存在 |
| 34 | 应包含 brush 划线元素 | `.hk-brush` 存在 |
| 35 | brush 元素应有 aria-hidden | 无障碍属性 |
| 36 | 外层 hk-close 类名 | CSS 类名存在 |
| 37 | step=6 兜底分支 | 同样渲染收束 |
| 38 | step=100 极端值 | 走收束分支 |

### 边界 & 切换（4 项）
| # | 用例 | 验证点 |
|---|------|--------|
| 39 | step=-1 走收束分支 | 不匹配 step===0 |
| 40 | step=0 外层不设 key | 正常渲染 |
| 41 | step=1→2 切换内容 | rerender + 文本断言 |
| 42 | step=4→5 切换场景 | takeover → close |

## Mock 策略

- **MaskReveal**: Mock 为透传 children 的 `<span>`，通过 `data-*` 属性记录 show/delay/duration
- **CSS**: 空对象 mock，避免解析 CSS 文件
- **antd**: 由 `tests/pages/setup.ts` 全局 mock 处理

## 分支覆盖分析

| 分支 | 覆盖 |
|------|------|
| `step === 0` | ✅ step=0 |
| `step >= 1 && step <= 3` | ✅ step=1,2,3 |
| `step === 4` | ✅ step=4 |
| `else`（收束） | ✅ step=5,6,100,-1 |

所有 4 个条件分支均已覆盖，100% 分支覆盖率。
