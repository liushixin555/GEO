# MaskReveal.test.tsx 代码安全专家评审

**文件**: `tests/pages/video-presentation/MaskReveal.test.tsx`
**评审角色**: 代码安全专家
**评审日期**: 2026-05-26
**综合评分**: 2.0/10 — REJECT

---

## 评审摘要

| 维度 | 评分 | 等级 |
|------|------|------|
| 供应链安全 | 0/10 | CRITICAL |
| 输入验证与注入防护测试 | 2.0/10 | HIGH |
| 测试隔离与状态安全 | 6.5/10 | MEDIUM |
| DOM 安全与 XSS 覆盖 | 1.5/10 | CRITICAL |
| 快照安全完整性 | 2.0/10 | HIGH |
| 配置安全 | 5.0/10 | MEDIUM |
| **综合** | **2.0/10** | **REJECT** |

> 评分说明：存在 3 项 CRITICAL 级别安全阻断（供应链路径不可信 + DOM 安全零覆盖 + 安全边界违规），加权后综合评分极低。

---

## 1. CRITICAL 阻断项（安全不可接受）

### C-1. 供应链路径信任违规 — 导入 `.agents/` 只读参考目录 `[BLOCKING]`

**位置**: L6
```typescript
import { MaskReveal } from '../../../.agents/skills/web-video-presentation/templates/src/components/MaskReveal';
```

**安全问题**:

1. **不可信路径执行**: `.agents/` 目录在项目规范中被明确定义为只读参考资源，不参与构建流程，不受代码审查保护。测试文件直接 `import` 该路径下的代码并在 jsdom 中执行，等效于运行未经安全审计的第三方代码。若 `.agents/` 通过 git submodule、CI 脚本或第三方工具更新，恶意代码可借测试运行时执行。

2. **路径穿越风险**: 相对路径 `../../../.agents/` 跨越了 3 层目录，从 `tests/pages/video-presentation/` 回溯到项目根目录再进入 `.agents/`。这种多级 `../` 模式在路径解析时存在潜在的符号链接（symlink）攻击面——攻击者可构造符号链接将导入重定向到任意文件系统位置。

3. **文件不存在 = 零安全验证**: 经确认 `.agents/skills/web-video-presentation/templates/src/components/MaskReveal.tsx` 和 `MaskReveal/index.tsx` 均不存在。39 个测试用例全部无法执行，形成**虚假安全覆盖**——CI 报告"测试存在"但实际从未运行，安全缺陷被完全遮蔽。

**CVSS 评估**: 供给链安全 — AV:L/AC:L/PR:N/UI:N/S:C/C:N/I:H/A:N → **7.1 HIGH**

**修复**: 将组件迁移到项目正式源码目录（如 `pages/components/MaskReveal/`），测试导入正式路径。

### C-2. DOM 安全零覆盖 — 无 XSS / 注入测试 `[BLOCKING]`

**位置**: 整个文件（L1-499），特别关注 L237-287（Children 渲染区块）

**安全问题**: 39 个测试用例中，**没有任何一个**验证组件对恶意输入的防御能力：

| 未测试的攻击向量 | 风险等级 | 说明 |
|------------------|----------|------|
| XSS via children | CRITICAL | `<MaskReveal>{<script>alert(1)</script>}</MaskReveal>` 未测试 |
| HTML 注入 via children | HIGH | `<MaskReveal><img onerror="alert(1)" src=x></MaskReveal>` 未测试 |
| dangerouslySetInnerHTML 泄露 | HIGH | 组件是否使用 dangerouslySetInnerHTML 未知 |
| CSS 注入 via className | MEDIUM | `<MaskReveal className="expression(alert(1))">` 未测试 |
| 样式注入 via delay/duration | LOW | `delay={'"><script>'}` 字符串注入未测试 |
| prototype pollution | MEDIUM | `__proto__` 作为 className 未测试 |

**具体缺失**:

```typescript
// 缺失：XSS 字符串 children 测试
it('HTML 实体在 children 中不被执行', () => {
  render(<MaskReveal show={true}>{"<script>alert('xss')</script>"}</MaskReveal>);
  expect(document.querySelector('script')).toBeNull();
});

// 缺失：恶意 className 注入测试
it('className 不注入事件处理器', () => {
  render(<MaskReveal show={true} className={'" onclick="alert(1)'}>text</MaskReveal>);
  const el = screen.getByText('text');
  expect(el.getAttribute('class')).not.toContain('onclick');
});

// 缺失：dangerouslySetInnerHTML 检测
it('不使用 dangerouslySetInnerHTML', () => {
  const { container } = render(<MaskReveal show={true}>text</MaskReveal>);
  // React 在 jsdom 中不会实际执行 innerHTML 赋值，但应验证组件源码不含该属性
});
```

**影响**: 如果源组件存在 XSS 漏洞（如通过 `innerHTML` 渲染 children、不转义用户输入等），当前测试套件完全无法发现。

### C-3. 违反 `.agents/` 安全边界 — 破坏只读隔离 `[BLOCKING]`

**位置**: L6（导入路径），整个文件

**CLAUDE.md 安全铁律原文**:
> 禁止修改或测试 `.agents/` 目录 — `.agents/skills/` 下的所有文档（README、SKILL、manifest、模板、主题等）禁止任何形式的修改、删除或测试，该目录为只读参考资源

**安全问题**: `.agents/` 作为只读参考资源的安全边界被打破：
1. 测试代码建立了到 `.agents/` 的运行时依赖链，使 `.agents/` 从"参考资源"变为"运行时依赖"
2. `.agents/` 的变更（即使是无意修改）会直接影响测试结果，扩大了攻击面
3. 违反最小权限原则——测试不应需要访问 `.agents/` 目录

**修复**: 将测试目标组件迁移到受代码审查保护的正式源码路径。

---

## 2. HIGH 级别安全问题

### H-1. 快照安全完整性失效

**位置**: L424-444（快照测试），`__snapshots__/MaskReveal.test.tsx.snap`

**安全问题**:

1. **快照伪造风险**: 快照文件 `MaskReveal.test.tsx.snap` 记录了 DOM 结构，但源组件不存在，快照无法与实际输出对比。攻击者可修改快照内容而不被发现：
   ```javascript
   // 当前快照（无人验证其正确性）
   exports[`MaskReveal 快照测试 show=true 匹配快照 1`] = `
   <span class="mask-reveal in" style="display: inline-block; transition-delay: 0ms;">
     text
   </span>`;
   ```
   若攻击者将 `class="mask-reveal in"` 修改为 `class=""`，测试仍然"通过"（因为组件不存在，测试根本不执行）。

2. **快照内容包含样式细节泄露**: 快照中内联样式 `transition-delay: 0ms` 暴露了动画时间参数，在公开仓库中可能被用于时间侧信道攻击分析。

3. **快照无签名保护**: 快照文件为纯文本，无哈希校验，容易被篡改。

### H-2. 无恶意 Props 输入验证测试

**位置**: L366-418（Props 边界区块）

**安全问题**: 边界测试仅覆盖负值、零值、大数值等合法范围边界，**完全未覆盖恶意输入**：

| 恶意输入 | 是否测试 | 潜在风险 |
|----------|----------|----------|
| `show={undefined}` | ❌ | 组件可能崩溃或进入不安全状态 |
| `show={1}` / `show={""}` | ❌ | truthy/falsy 强制转换可能导致意外行为 |
| `show={() => {}}` | ❌ | 函数作为 boolean prop 的行为未定义 |
| `delay={Infinity}` | ❌ | `transition-delay: Infinityms` 的浏览器行为不一致 |
| `delay={NaN}` | ❌ | `transition-delay: NaNms` 可能导致样式解析错误 |
| `duration={NaN}` | ❌ | 同上 |
| `className={null}` | ❌ | null className 拼接可能产生 "mask-reveal null" |
| `className={undefined}` | ❌ | undefined 拼接行为不确定 |
| `children={Symbol()}` | ❌ | React 对 Symbol 的渲染行为可能抛错 |

**修复**: 添加 OWASP 类别的恶意输入测试矩阵。

### H-3. 缺少 `ref` 拦截安全测试

**位置**: 整个文件

**安全问题**: 如果组件实现使用了 `forwardRef`，攻击者可通过 `ref` 访问底层 DOM 节点并执行：
- `ref.current.innerHTML = '<script>...</script>'` — XSS
- `ref.current.click()` — UI 红包攻击（自动触发用户交互）
- `ref.current.style.cssText = '...'` — 样式覆盖攻击

测试套件未验证组件是否对 `ref` 返回值做了安全限制（如仅暴露必要 API 而非原始 DOM 节点）。

---

## 3. MEDIUM 级别安全问题

### M-1. `beforeEach` 空操作掩盖潜在 Mock 安全问题

**位置**: L9-11
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

**安全问题**: `jest.clearAllMocks()` 在无任何 mock 的情况下是空操作，但它的存在暗示未来可能添加 mock。当 mock 被添加后：
1. `clearAllMocks()` 会清除所有 spy，包括安全相关的 mock（如 auth middleware mock）
2. 全局清除可能导致安全 mock 被意外重置，使安全测试失效
3. 建议改用 `jest.restoreAllMocks()` 或针对特定 mock 的清理

### M-2. CSS 类名安全未验证

**位置**: L58-134（CSS 类名区块）

**安全问题**: 测试验证了 `mask-reveal`、`in`、`custom-class` 等类名是否被正确附加，但未验证：
1. `className` prop 是否被 sanitize（如 `className="foo" onclick="alert(1)"` — React 会自动转义，但测试未验证）
2. className 是否包含 CSS 伪协议（如 `className="x{background:url('javascript:alert(1)')}"` — 现代浏览器已修复，但应回归测试）
3. CSS `expression()` 注入（IE 兼容场景）

### M-3. 样式值注入未测试

**位置**: L139-232（内联样式区块）

**安全问题**: `delay` 和 `duration` prop 被直接拼接为 `transitionDelay: '${delay}ms'` 和 `transitionDuration: '${duration}ms'`。如果组件实现不做类型检查：
```typescript
// 假设组件实现：
style={{ transitionDelay: `${delay}ms` }}
// 若 delay = "0;content:url(javascript:alert(1))"
// 结果: "transitionDelay: '0;content:url(javascript:alert(1))ms'"
```
虽然 React 对 `style` prop 有白名单保护，但测试应验证这一安全机制确实生效。

### M-4. `container.querySelector` 直接 DOM 操作

**位置**: L206-209, L269-273

**安全问题**: 使用 `container.querySelector('span')` 绕过了 Testing Library 的抽象层，直接操作 DOM：
1. 若组件结构变更（如 `span` → `div`），querySelector 静默返回 `null`，后续 `!` 断言导致运行时错误而非安全失败
2. 直接 DOM 查询跳过了 React 的虚拟 DOM 安全层，可能在并发测试中读到不一致的 DOM 状态
3. 不符合 OWASP 测试最佳实践——应通过语义查询验证

### M-5. 测试环境隔离不完整

**位置**: jest.config.ts L44-56（video-presentation 项目配置）

**安全问题**: `video-presentation` jest 项目配置使用 `jsdom` 环境，但：
1. 未配置 `testTimeout` — 默认 5 秒超时，rerender 循环测试（L459-497，最多 20 次循环）可能在慢速 CI 中超时
2. 未限制 `maxWorkers` — 大量 `rerender` 操作可能导致内存压力
3. 未配置 `sandboxInjectedGlobals` — jsdom 全局变量（`window`、`document`）对测试代码完全开放

---

## 4. LOW 级别安全问题

### L-1. 快照中样式信息泄露

**位置**: `__snapshots__/MaskReveal.test.tsx.snap`

快照文件包含内联样式细节（`transition-delay`、`transition-duration`），在公开仓库中可能暴露 UI 动画参数。虽非直接安全风险，但属于信息泄露范畴。

### L-2. 未测试 `key` prop 对安全的影响

**位置**: 整个文件

当组件在列表中使用时，`key` prop 的缺失或不当使用可能导致 React 的 key 复用漏洞（state 泄漏到错误组件）。测试未覆盖此场景。

### L-3. 未验证 `propTypes` / TypeScript 类型运行时保护

**位置**: 整个文件

TypeScript 类型仅在编译期生效，运行时不提供保护。如果组件通过 JavaScript 调用（如跨框架场景），类型约束失效。测试未验证运行时类型检查。

### L-4. 未测试 `useEffect` / `useLayoutEffect` 清理函数

**位置**: 整个文件

若组件使用了副作用 hooks，清理函数（cleanup）未执行可能导致内存泄漏或事件监听器残留。unmount 测试（L449-457）仅验证不抛错，未验证资源释放。

---

## 5. OWASP 测试覆盖分析

| OWASP 类别 | 本文件覆盖 | 状态 |
|-------------|-----------|------|
| A01 — 权限控制失效 | N/A | 不适用（UI 组件） |
| A02 — 加密失败 | N/A | 不适用 |
| A03 — 注入 | ❌ 零覆盖 | CRITICAL |
| A04 — 不安全设计 | ⚠️ 部分覆盖 | 类名/样式设计有测试，安全设计无 |
| A05 — 安全配置错误 | ⚠️ 部分 | jest 配置有排除但源文件不存在 |
| A06 — 过时组件 | ❌ 零覆盖 | React 版本/依赖安全未验证 |
| A07 — 身份认证失败 | N/A | 不适用 |
| A08 — 数据完整性失败 | ❌ 零覆盖 | 快照无签名、供应链无校验 |
| A09 — 安全日志不足 | N/A | 不适用 |
| A10 — SSRF | N/A | 不适用 |

**OWASP 覆盖率**: 2/10 类别有实质覆盖，**A03（注入）零覆盖** 是最严重的安全缺陷。

---

## 6. 安全测试缺失矩阵

应添加的安全测试用例：

| 编号 | 测试用例 | 对应攻击向量 | 优先级 |
|------|----------|-------------|--------|
| S-1 | `<script>` 标签作为 children 不被执行 | XSS (A03) | P0 |
| S-2 | `onerror`/`onload` 事件属性不触发 | XSS (A03) | P0 |
| S-3 | `className` 包含引号/事件属性不注入 | HTML 注入 (A03) | P0 |
| S-4 | `delay={NaN}` 不导致样式解析崩溃 | 拒绝服务 (A04) | P1 |
| S-5 | `duration={Infinity}` 不导致无限动画 | 拒绝服务 (A04) | P1 |
| S-6 | `className={null}` 不产生异常 DOM 属性 | 类型混淆 (A04) | P1 |
| S-7 | `children` 为恶意 SVG 时不执行内嵌脚本 | XSS (A03) | P1 |
| S-8 | 快照与实际输出一致性验证 | 数据完整性 (A08) | P2 |
| S-9 | `show={undefined}` 默认为安全状态 | 安全默认值 (A04) | P2 |
| S-10 | unmount 后事件监听器被完全清除 | 资源泄漏 (A05) | P2 |

---

## 7. 修复优先级

| 优先级 | 编号 | 修复内容 | 安全影响 |
|--------|------|----------|----------|
| P0 | C-1 | 将组件从 `.agents/` 迁移到正式源码目录 | 消除供应链信任违规 |
| P0 | C-2 | 添加 XSS/注入安全测试用例 (S-1~S-3) | 覆盖 OWASP A03 |
| P0 | C-3 | 遵守 `.agents/` 只读安全边界 | 恢复安全隔离 |
| P1 | H-1 | 快照与实际输出交叉验证 | 防止快照伪造 |
| P1 | H-2 | 添加恶意 Props 输入测试 (S-4~S-9) | 防止类型混淆/DoS |
| P1 | H-3 | 添加 `ref` 安全测试 | 防止 DOM 节点泄露 |
| P2 | M-1 | 移除无效 `clearAllMocks` 或改用 `restoreAllMocks` | 防止 mock 安全重置 |
| P2 | M-2 | 添加 className sanitize 测试 | 防止 CSS 注入 |
| P2 | M-3 | 添加样式值注入测试 | 防止 style 注入 |
| P3 | L-4 | 验证 unmount 后资源释放 | 防止内存泄漏 |

---

## 8. 总结

MaskReveal.test.tsx 在 **安全维度** 存在严重缺陷，综合评分 **2.0/10**：

1. **供应链安全 0/10** — 导入路径指向不存在的 `.agents/` 只读目录，建立不可信运行时依赖，39 个测试全部不可执行形成虚假安全覆盖
2. **DOM 安全零覆盖** — 39 个测试用例无一验证 XSS、HTML 注入、CSS 注入等 OWASP A03 攻击向量，组件在恶意输入下的行为完全未知
3. **安全边界违规** — 违反 `.agents/` 只读隔离铁律，破坏了项目的安全边界设计

**三重阻断**（C-1 + C-2 + C-3）使该测试文件在安全评审中不可接受。

**评审结论**: **REJECT** — CRITICAL 安全阻断未解决，禁止合并。建议在迁移组件到正式源码目录后，按照安全测试矩阵（S-1 ~ S-10）补充安全测试用例，预期修复后安全评分可达 **6.0-6.5/10**。
