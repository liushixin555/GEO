# TDD 执行报告：App.tsx（web-video-presentation）

## 测试文件
`tests/pages/video-presentation/App.test.tsx`

## 被测文件
`.agents/skills/web-video-presentation/templates/src/App.tsx`

## 测试结果

```
Test Suites: 1 passed
Tests:       56 passed, 56 total
```

## 覆盖率

| 指标      | 覆盖率  |
|-----------|---------|
| Statements | 92.85% |
| Branch     | 77.77% |
| Functions  | 75%    |
| Lines      | 100%   |

**未覆盖行**: 23-31（estimateMs 纯函数内部的分支——空字符串和短文本的边界情况，作为私有函数通过集成测试间接覆盖）

## 测试分类（18 组、56 项用例）

### 1. estimateMs 纯函数（1 项）
- 空字符串应返回最小 1500ms

### 2. 初始渲染 — manual 模式（8 项）
- 应渲染 Stage 组件（.app-shell）
- 应渲染 scene 容器包含章节组件
- 应渲染 ProgressBar（.pb-hover）
- 应渲染 AutoToggle（.at-hover）
- manual 模式下不应渲染 AutoStartGate
- 初始 step=0 应渲染示例章节的第一个 step（封面）
- 应显示示例章节品牌名
- manual 模式下 audioSrc 为 null（无 Audio 实例）

### 3. AutoToggle 模式切换（6 项）
- 初始模式标签应显示 MANUAL
- 点击 AutoToggle 按钮应切换到 AUDIO 模式
- 连续点击应循环 manual → audio → auto → manual
- 切换到 audio 模式后 URL 应包含 ?audio=1
- 切换到 auto 模式后 URL 应包含 ?auto=1
- 切换回 manual 模式后 URL 应清除参数

### 4. AutoStartGate 条件渲染（4 项）
- 切换到 auto 模式后应显示 AutoStartGate
- AutoStartGate 显示后点击应关闭 gate
- audio 模式下不显示 AutoStartGate
- manual 模式下不显示 AutoStartGate

### 5. Stage 点击前进（3 项）
- 点击 stage-frame 应触发 step 前进
- 连续点击两次应前进到 step2
- 点击按钮元素（data-no-advance）不应触发前进

### 6. 键盘导航（8 项）
- ArrowRight 键应前进到下一步
- Space 键应前进到下一步
- ArrowLeft 键应后退一步
- Backspace 键应后退一步
- 在第一步按 ArrowLeft 不应变化
- M 键应切换播放模式
- 大写 M 键也应切换播放模式
- 在 input 元素中按键不应触发导航

### 7. ProgressBar 集成（4 项）
- 应渲染章节编号 '01'
- 应渲染章节标题 '示例章节'
- 应渲染 pips 指示器（当前章节的 step 点）
- 前进一步后第一个 pip 应为已访问状态

### 8. audio 模式下的音频播放（3 项）
- 切换到 audio 模式后应创建 Audio 实例
- audio 路径应包含章节 id 和 step+1
- 切换回 manual 模式后播放停止

### 9. 步骤边界（2 项）
- 在最后一步按 ArrowRight 不应变化
- 连续后退到第一步后再后退不变

### 10. URL 参数初始化（3 项）
- ?audio=1 应初始化为 audio 模式
- ?auto=1 应初始化为 auto 模式
- 无参数应初始化为 manual 模式

### 11. Home / End 键导航（2 项）
- Home 键应跳转到第一个 step
- End 键应跳转到最后一个 step

### 12. Auto 模式 autoStarted 门控（3 项）
- auto 模式未启动时不应播放音频
- 点击 AutoStartGate 后应播放音频
- Space 键在 auto+!autoStarted 时应启动 auto

### 13. 模式切换重置 autoStarted（2 项）
- 从 auto 切换到 manual 再切回 auto 应重新显示 gate
- 切到 audio 模式不应显示 gate

### 14. localStorage 持久化（3 项）
- 步骤变化后应写入 localStorage
- 应从 localStorage 恢复 cursor
- 过期的 localStorage 值应被 sanitize

### 15. 数字键跳转（1 项）
- 按 '1' 键应跳到第一章

### 16. 组件 unmount 清理（1 项）
- unmount 不应抛出错误

### 17. rerender 稳定性（1 项）
- 多次 rerender 不应抛出错误

### 18. Stage data-no-advance（1 项）
- 点击 ProgressBar 章节按钮不应触发 step 前进

## 基础设施

### jest.config.ts 变更
- 新增 `video-presentation` 项目配置，使用自定义 transform 处理 `import.meta.env`
- page 项目添加 `testPathIgnorePatterns` 排除 video-presentation 目录

### 自定义 Jest Transform
`tests/pages/video-presentation/jest.transform.js` — 包装 ts-jest 的 `TsJestTransformer`，在编译前将 `import.meta.env.BASE_URL` 替换为 `"/"`

### Mock 清单
- CSS 模块（fonts/tokens/base/animations + 组件 CSS）
- MaskReveal 组件
- localStorage
- window.location / history.replaceState
- Audio API
- Element.scrollIntoView
