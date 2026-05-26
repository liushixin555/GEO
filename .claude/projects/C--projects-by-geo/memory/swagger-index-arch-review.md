---
name: swagger-index-arch-review
description: pages/swagger/index.tsx 架构评审 7.8/10 APPROVE：职责单一+副作用规范+安全属性完备，小问题Card bordered隐式依赖+硬编码文案+Swagger路径未配置化
metadata:
  type: reference
---

pages/swagger/index.tsx 架构评审 7.8/10 APPROVE。组件职责单一（73行）、AbortController副作用清理规范、三态布尔状态机清晰、noopener noreferrer安全属性完备、测试覆盖20用例全通过。

**Issues**: ARCH-1 Card bordered隐式依赖antd默认值、ARCH-2 硬编码中文文案未提取常量、ARCH-3 SWAGGER_UI_PATH未纳入配置层、ARCH-4 api-docs-info移动端Divider折行异常、ARCH-5 memo匿名函数缺displayName。

**Why**: 架构评审记录，用于后续质量评审/安全评审/Committer评审参考基线
**How to apply**: 后续评审 swagger 页面时，以本评审为基线验证改进项是否已修复
