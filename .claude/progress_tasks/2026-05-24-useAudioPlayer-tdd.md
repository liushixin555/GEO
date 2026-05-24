# 变更记录：useAudioPlayer hook TDD

## 日期
2026-05-24

## 摘要
创建 `useAudioPlayer.ts` hook 并编写完整 TDD 测试——63 项用例，100% 全维度覆盖率。

## 变更文件

### 新增文件
| 文件 | 说明 |
|------|------|
| `.agents/skills/web-video-presentation/templates/src/hooks/useAudioPlayer.ts` | 音频播放 hook（useAudioPlayer + estimateMs） |
| `tests/pages/video-presentation/useAudioPlayer.test.ts` | TDD 测试文件，12 组 63 项用例 |
| `tasks/tdd/video-presentation-useAudioPlayer.test.md` | TDD 执行报告 |

## API 设计

### 导出
- `PlaybackMode` 类型：`"manual" | "audio" | "auto"`
- `estimateMs(text: string): number` — 纯函数，根据文本长度估算播放时长（ms）
- `useAudioPlayer(options): { playing, play, pause }` — 核心 hook

### useAudioPlayer 参数
- `audioSrc: string | null` — 音频 URL，null 走 fallback timer
- `mode: PlaybackMode` — 当前播放模式
- `autoStarted: boolean` — auto 模式门控
- `onEnded?: () => void` — 播放结束回调（用于自动翻页）
- `estimateFallbackMs?: number` — 无音频时的 fallback 时长（默认 1500ms）

## 测试结果
- Tests: 63 passed, 63 total
- Stmts 100% | Branch 100% | Funcs 100% | Lines 100%
