# 修复：登录后右下角公司/项目选择不显示

**日期**: 2026-05-24
**影响文件**: `pages/context/AuthContext.tsx`

## 问题
用户登录后，右下角的已选公司和项目不显示（之前是正常的）。

## 根因
前端架构重构（`12104c5`）时，将认证逻辑从 `Layout.tsx` 提取到独立的 `AuthContext.tsx`。

旧版本 `Layout.tsx` 的 verify useEffect 依赖 `[location.pathname]`，每次页面导航都会重新执行，从而把登录时保存在 `user` 对象中的 `selected_company`/`selected_project` 写入 localStorage。

重构后 `AuthProvider` 的 verify useEffect 依赖 `[]`（仅 mount 时执行一次），而此时用户还没登录（无 token），直接 return。登录时 `login()` 函数只写了 `token` 和 `user` 到 localStorage，**没有写 `selected_company`/`selected_project`**。`AppContext` mount 时从 localStorage 读取不到这两个 key，导致右下角显示"未选择公司"/"未选择项目"。

## 修复
在 `AuthContext.tsx` 的 `login()` 函数中，补充将 `userData.selected_company` 和 `userData.selected_project` 写入 localStorage（与 verify useEffect 中的逻辑一致）。

## 验证
- `pnpm build:page` ✅
- auth 相关 176 个测试全通过 ✅
