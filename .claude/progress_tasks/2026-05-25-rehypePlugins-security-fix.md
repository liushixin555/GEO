# rehypePlugins.tsx 安全评审修复

日期: 2026-05-25
评审文件: tasks/review/rehypePlugins.tsx.security.md (REJECT 3.5/10)

## 修复项

| 编号 | 严重度 | 修复项 | 修复方式 |
|------|--------|--------|----------|
| SEC-01 | HIGH | data-code 属性 XSS | escapeHtmlAttr() 编码 |
| SEC-02 | MEDIUM-HIGH | 属性展开保留不受信属性 | SAFE_ANCHOR_PROPS 白名单 |
| SEC-03 | MEDIUM | 代码块无长度限制 DoS | MAX_CODE_LENGTH=100000 |
| SEC-04 | MEDIUM | 正则绕过 | HEADING_TAGS Set |
| SEC-05 | MEDIUM | rewrite 无异常边界 | try-catch |
| SEC-06 | MEDIUM | URL 安全过滤禁用 | safeUrlTransform |

## 文件变更

1. patches/@uiw__react-markdown-preview@5.2.1.patch
2. node_modules/@uiw/react-markdown-preview/ (src/esm/lib)
3. tests/pages/components/rehypePlugins.security.test.ts (+30)

## 测试

102 passed, 0 failed. Build + Lint 通过.
