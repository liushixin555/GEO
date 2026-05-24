# 2026-05-24 project.controller.ts 评审修复

## 修复依据
tasks/review/project.controller.md

## 修复内容
- C-1: updateProject view角色拦截
- C-2: getProject view角色拦截
- H-3: company_id NaN/正整数校验
- M-1: err:any→err:unknown
- M-2: req.user防御性检查
- M-5: search长度限制100
- L-3: 字符串长度验证（50/200/500）
- 附带修复 knowledge-base.controller.ts create()多余参数

## 测试
- 76 controller测试 + 326项目测试全通过
- 构建通过
