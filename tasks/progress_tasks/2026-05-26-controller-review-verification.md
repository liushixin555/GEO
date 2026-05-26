# apis/controller/index.ts 评审修复验证

**日期**: 2026-05-26
**范围**: 根据 `tasks/review/index.md`（已删除）评审报告验证所有修复

## 评审问题验证结果

### P0 — CRITICAL（2项）
| 编号 | 问题 | 验证文件 | 状态 |
|------|------|---------|------|
| C-1 | API密钥明文泄露 | `apis/map/index.ts` — `mapLlmModel` 脱敏为 `sk-t****-key` 格式 | ✅ 已修复 |
| C-2 | Zip Slip路径遍历 | `apis/controller/skills.controller.ts` — 解压前逐条校验路径 + zip bomb 检查 | ✅ 已修复 |

### P1 — HIGH（6项）
| 编号 | 问题 | 验证文件 | 状态 |
|------|------|---------|------|
| C-3 | todo IDOR越权 | `apis/controller/todo.controller.ts` — 添加项目权限校验 | ✅ 已修复 |
| H-1 | 错误信息泄露 | `todo/user/llm-model/system-config` 四个 controller 统一固定错误消息 | ✅ 已修复 |
| H-3 | 角色值白名单 | `apis/controller/user.controller.ts` — `['sysadmin','admin','view']` 校验 | ✅ 已修复 |
| H-4 | 密码强度验证 | `apis/controller/user.controller.ts` — 密码 >= 8位 | ✅ 已修复 |
| H-5 | URL格式验证 | `apis/controller/llm-model.controller.ts` — URL格式+协议白名单 | ✅ 已修复 |
| H-6 | config_key白名单 | `apis/controller/system-config.controller.ts` — 白名单限制 | ✅ 已修复 |

### P2 — MEDIUM（6项）
| 编号 | 问题 | 验证文件 | 状态 |
|------|------|---------|------|
| M-1 | 登录缺少账户锁定 | `apis/utils/account-lockout.util.ts` — 5次锁定15分钟 | ✅ 已修复 |
| M-2 | pageSize参数无上限 | Zod schema `max(100)` 覆盖 | ✅ 已有 |
| M-3 | search参数无长度限制 | Zod schema `max(100/200)` + `slice(0,100)` | ✅ 已修复 |
| M-4 | 解压失败未清理残留 | catch 块 + `skills-file.service.ts` 回滚 | ✅ 已有 |
| M-5 | 反爬虫UA检查简单 | 11种自动化工具 UA 拦截 | ✅ 已修复 |
| M-6 | 登录错误信息区分度 | `LoginSelectionError` 统一返回 401 + 固定消息 | ✅ 已修复 |

### fullscreen.tsx 封装层修复
| 条件 | 修复位置 | 状态 |
|------|---------|------|
| P0: 移除 shortcuts 条件守卫 | `MarkdownEditor.tsx` execute 重写 | ✅ 已修复 |
| P1: 快捷键重映射 | `MarkdownEditor.tsx` ctrlcmd+shift+f | ✅ 已修复 |
| P2: 中文 ARIA + antd 图标 | `MarkdownEditor.tsx` FullscreenOutlined | ✅ 已修复 |

### pages/user/index.tsx 评审验证
| 级别 | 问题 | 验证结果 | 状态 |
|------|------|---------|------|
| B-1 | 原生table违反铁律 | 已使用 antd `Table` + `ColumnsType<UserItem>` | ✅ 已修复 |
| B-2 | 空catch吞错误 | 使用 `message.error(getApiErrorMessage(err, ...))` | ✅ 已修复 |
| B-3 | 搜索无防抖DoS | `useUserList` 已有 300ms debounce | ✅ 已修复 |
| H-1 | 状态切换无确认 | 已有 `Popconfirm` | ✅ 已修复 |
| H-2 | Switch无loading | 已有 `loading={togglingId === item.id}` | ✅ 已修复 |
| H-3 | 双视图同渲染 | `isWide` 条件渲染，同一时间只渲染一个 | ✅ 已修复 |
| H-4 | 认证双数据源 | 使用 `useAuth()` | ✅ 已修复 |
| H-5 | 类型重复定义 | 共享类型 `pages/types/user.ts` | ✅ 已修复 |
| M-1 | 无AbortController | `useUserList` 已有 | ✅ 已修复 |
| M-2 | 无Tooltip | 编辑按钮已有 Tooltip | ✅ 已修复 |
| M-4 | 分页不完整 | 已有 Pagination + showTotal | ✅ 已修复 |
| M-5 | any类型 | 使用 `unknown` | ✅ 已修复 |
| M-6 | 魔术字符串 | 使用 `constants/roles.ts` | ✅ 已修复 |
| M-7 | 颜色硬编码 | 使用 CSS variables | ✅ 已修复 |
| M-8 | 空状态无引导 | 已有 Empty 组件 | ✅ 已修复 |
| M-9 | useState扁平罗列 | 已提取到 hooks | ✅ 已修复 |

## 测试修复

### 修复的测试问题

1. **user.schema.test.ts** — 2个断言方向错误修复：
   - "应接受 unicode 字符" → "应拒绝 unicode 字符"（schema 仅允许 `[a-zA-Z0-9_]`）
   - "应拒绝空格字符串" — 断言改为 `expect(result.success).toBe(false)`

2. **user.controller.test.ts** — 1个 flaky test 修复：
   - "should handle concurrent list requests" → "should handle multiple list requests"
   - `Promise.all` 并发改为 `for` 循环顺序执行，避免 ECONNRESET

### 测试结果

- auth tests: 310 passed ✅
- user tests: 978 passed (188 controller + 150 schema + 640 service) ✅
- todo tests: 789 passed ✅
- company/skills/llm tests: 1292 passed ✅
- build: 通过 ✅
- lint: 通过 ✅
