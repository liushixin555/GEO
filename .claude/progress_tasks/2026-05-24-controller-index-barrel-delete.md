# 删除 controller/index.ts barrel file

**日期**: 2026-05-24
**类型**: 评审修复（死代码清理）
**评审来源**: tasks/review/controller-index.md + controller-index.committer.md

## 变更内容

- **删除** `apis/controller/index.ts` — Committer 评审 REJECT 2.0/10，运行时零引用（死代码），65% 函数遗漏
- **删除** `tests/apis/controller/index.test.ts` — barrel file 的专属测试，随源文件一起删除

## 评审问题与修复

| 评审问题 | 严重级别 | 修复方式 |
|----------|---------|---------|
| P0-1: 遗漏 8 个控制器模块 | P0 | 删除 barrel file（方案 B） |
| P0-2: 遗漏 toggleCompanyStatus | P0 | 删除 barrel file（方案 B） |
| P1-1: barrel file 零引用（死代码） | P1 | 删除 |
| P1-2: 同步风险 | P1 | 删除消除同步负担 |
| P2-1: CRUD 导出不一致 | P2 | 删除消除问题 |
| P2-2: 缺少分组注释 | P2 | 删除消除问题 |

## 验证

- tsc 后端编译通过（排除预先存在的 swagger 依赖问题）
- Vite 前端构建通过
- 项目 15 个路由文件全部使用直接导入，不受影响
