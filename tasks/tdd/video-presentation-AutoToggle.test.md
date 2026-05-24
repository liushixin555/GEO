# TDD 执行报告：AutoToggle.tsx（web-video-presentation）

## 测试文件
`tests/pages/video-presentation/AutoToggle.test.tsx`

## 被测文件
`.agents/skills/web-video-presentation/templates/src/components/AutoToggle.tsx`

## 测试结果

```
Test Suites: 1 passed
Tests:       39 passed, 39 total
Snapshots:   3 written, 3 total
```

## 覆盖率

| 指标       | 覆盖率 |
|------------|--------|
| Statements | 100%   |
| Branch     | 100%   |
| Functions  | 100%   |
| Lines      | 100%   |

**未覆盖行**: 无

## 测试分类（10 组、39 项用例）

### 1. 渲染逻辑（4 项）
- 渲染容器 div.at-hover
- 渲染内部 button 元素
- 三种 mode 均正常渲染不报错
- 切换 mode 从 manual → audio → auto 均正确渲染

### 2. 文本内容（4 项）
- mode=manual 时显示 "MANUAL" 标签
- mode=audio 时显示 "AUDIO" 标签
- mode=auto 时显示 "AUTO" 标签
- 按钮 title 属性为 "切换播放模式（M）"

### 3. 事件处理（4 项）
- 点击按钮调用 onCycle
- 多次点击多次调用 onCycle
- 点击按钮调用 stopPropagation
- 不同 mode 下点击均触发 onCycle

### 4. A11y 属性（3 项）
- 容器 div 具有 data-no-advance 属性
- data-no-advance 属性值为 "true"
- 按钮具有 title 提示

### 5. CSS 类名（7 项）
- 容器具有 at-hover 类
- 按钮具有 at-btn 类
- 按钮具有 at-manual 类（mode=manual）
- 按钮具有 at-audio 类（mode=audio）
- 按钮具有 at-auto 类（mode=auto）
- 圆点具有 at-dot 类
- 标签具有 at-label 类

### 6. DOM 结构（5 项）
- at-hover > at-btn 嵌套关系
- at-btn > at-dot + at-label 子元素
- at-dot 为 span 元素
- at-label 为 span 元素
- at-btn 为 button 元素

### 7. 模式切换（3 项）
- 从 manual 切换到 audio 时类名更新
- 从 audio 切换到 auto 时标签更新
- 快速切换 mode 10 次不报错

### 8. 快照测试（3 项）
- mode=manual 匹配快照
- mode=audio 匹配快照
- mode=auto 匹配快照

### 9. Props 验证（2 项）
- onCycle 回调被正确引用（不会覆盖）
- 所有 PlaybackMode 值均为合法 mode

### 10. unmount 与 rerender 稳定性（4 项）
- unmount 不抛出错误
- 不同 mode 下 unmount 均不报错
- 重复 rerender 同样的 props 不抛出错误
- 快速切换 mode 后点击按钮仍然正常

## 技术要点

- **CSS mock**: 使用 `identity-obj-proxy` 自动映射 CSS 模块，通过 jest.config.ts 中 video-presentation 项目的 moduleNameMapper 配置
- **stopPropagation 验证**: 通过 `jest.spyOn(Event.prototype, 'stopPropagation')` 拦截原生事件方法，验证组件内调用了 stopPropagation
- **data-no-advance 属性**: JSX 中写为 `data-no-advance`（无值），React 将其序列化为 `data-no-advance="true"`
- **PlaybackMode 类型**: 从 useAudioPlayer hook 导入，值为 "manual" | "audio" | "auto"
- **三种模式快照**: 为每种 PlaybackMode 生成独立快照，确保模式间结构一致
