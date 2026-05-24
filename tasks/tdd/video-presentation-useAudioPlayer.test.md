# TDD 执行报告：useAudioPlayer.ts（web-video-presentation）

## 测试文件
`tests/pages/video-presentation/useAudioPlayer.test.ts`

## 被测文件
`.agents/skills/web-video-presentation/templates/src/hooks/useAudioPlayer.ts`

## 测试结果

```
Test Suites: 1 passed
Tests:       63 passed, 63 total
```

## 覆盖率

| 指标       | 覆盖率 |
|------------|--------|
| Statements | 100%   |
| Branch     | 100%   |
| Functions  | 100%   |
| Lines      | 100%   |

**未覆盖行**: 无

## 测试分类（12 组、63 项用例）

### 1. estimateMs 纯函数（9 项）
- 空字符串返回 1500ms
- 单字符返回 1500ms（Math.max 保底）
- 短文本（< 8 字符）仍返回 1500ms
- 10 字符文本返回 2000ms（10 * 200）
- 长文本按字符数 * 200 计算
- 纯空格字符串（非空）按字符数计算
- 中英文混合文本按字符数计算
- 非常长的文本正确计算
- 结果始终 >= 1500

### 2. manual 模式（5 项）
- 初始 playing 为 false
- 不调用 Audio 构造函数
- 有 audioSrc 时也不播放
- 返回 play 和 pause 方法
- pause 调用不抛错

### 3. audio 模式 — 有 audioSrc（10 项）
- 切换到 audio 模式后 playing 为 true
- 创建 Audio 实例并调用 play
- 设置 audio.src 为传入的 audioSrc
- 设置 audio.preload 为 'auto'
- 注册 ended 事件监听器
- audio ended 后 playing 变为 false
- audio ended 后调用 onEnded 回调
- 切换回 manual 模式后停止播放
- 切换回 manual 时调用 pause
- audio.play() reject 时不抛错

### 4. audio 模式 — 无 audioSrc / fallback timer（5 项）
- audioSrc 为 null 时使用 fallback timer
- 默认 fallback 为 1500ms
- 自定义 estimateFallbackMs 生效
- timer 到期后 playing 变 false
- 切换回 manual 时清除 fallback timer

### 5. auto 模式（6 项）
- auto + autoStarted=false 不播放
- auto + autoStarted=true 播放音频
- auto + autoStarted=true playing 为 true
- 从 autoStarted=false 切到 true 后开始播放
- auto 模式下 audio ended 触发 onEnded
- auto 模式无 audioSrc 时使用 fallback timer

### 6. 模式切换（6 项）
- manual → audio 开始播放
- audio → manual 停止播放
- audio → auto (autoStarted=true) 继续播放
- manual → auto (autoStarted=false) 不播放
- 循环切换 manual → audio → auto → manual 状态正确
- 快速切换 10 次不报错

### 7. audioSrc 变化（3 项）
- audioSrc 变化时重新播放
- 从有 audioSrc 切换到 null 使用 fallback
- 从 null 切换到有 audioSrc 创建 Audio 实例

### 8. onEnded 回调（3 项）
- onEnded 未传时不报错
- onEnded 回调更新后使用最新引用
- audio ended 后不重复调用 onEnded

### 9. play / pause 方法（6 项）
- manual 模式下调用 play() 开始播放
- audio 模式下调用 pause() 停止播放
- pause 后再 play 恢复播放
- play() 使用 fallback timer（无 audioSrc）
- 连续调用 play() 多次不报错
- 连续调用 pause() 多次不报错

### 10. 资源清理（4 项）
- unmount 时清理 Audio（pause + removeAttribute + removeEventListener）
- unmount 时清除 fallback timer
- rerender 同样 props 不重新创建 Audio
- 从 audio 切到 manual 时 removeEventListener 被调用

### 11. PlaybackMode 类型（1 项）
- 三个合法值均可作为 mode 使用

### 12. 边界情况（5 项）
- estimateFallbackMs = 0 时立即触发 onEnded
- 所有 props 同时变化时状态一致
- onEnded 为 undefined 时正常工作
- estimateFallbackMs 为负数时仍设置 timer
- 大 estimateFallbackMs 不提前触发

## 技术要点

- **Audio mock**: 自定义 MockAudio 类，实例追踪通过 `mockAudioInstances` 数组
- **fakeTimers**: 使用 `jest.useFakeTimers()` 控制 setTimeout（fallback timer）
- **ended 事件模拟**: 从 `mockAddEventListener.mock.calls` 提取 handler 手动触发
- **onEndedRef 模式**: hook 内部用 `useRef` 保存最新 onEnded 引用，避免闭包过期
- **renderHook**: 使用 `@testing-library/react` 的 `renderHook` 测试自定义 hook
- **PlaybackMode 类型**: 导出 `"manual" | "audio" | "auto"` 联合类型，供 AutoToggle 等组件导入使用
