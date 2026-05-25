# 2026-05-25 project.controller.ts 软件架构专家评审

## 变更
- `tasks/review/project.controller.ts.md` — 软件架构专家评审报告

## 评审摘要
- **综合评分**: 8.0/10（旧版 5.7/10，+2.3 分）
- **问题统计**: HIGH × 1 / MEDIUM × 3 / LOW × 3
- **核心改进确认**: 旧版 CRITICAL × 2、HIGH × 4、MEDIUM × 5 全部已修复
  - C-1/C-2: 业务逻辑下沉 service 层
  - H-1: IProjectService 接口类型声明
  - H-2: AppError 类型化错误分派
  - H-4: created() 工具函数
  - M-1~M-3: err:unknown + 白名单 + 消除重复查询
- **主要问题**: H-1 Zod schema 与 Controller 校验规则长度限制不一致（short_name 100 vs 50、description 2000 vs 500）
- **建议**: 统一 Zod schema 与 DB 约束，移除 controller 重复校验
