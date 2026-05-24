# 2026-05-25 list.tsx 安全专家评审

## 变更概述
对 `@uiw/react-md-editor@4.1.0/src/commands/list.tsx` 进行代码安全专家评审。

## 评审文件
- `tasks/review/list.tsx.security.md`

## 评审结论
✅ APPROVE — 无可直接利用的安全漏洞，攻击面极小

## 问题统计
- HIGH × 0
- MEDIUM × 3: checkedList 不处理 `- [x] ` 已勾选项(S1)、`prefix!` 非空断言(S2)、insertBeforeEachLine 多重求值(S3)
- LOW × 3: selection 越界无校验(S4)、Array.join 大字符串(S5)、SVG 可访问性不一致(S6)
- INFO × 2: FontAwesome 许可合规(S7)、buttonProps 硬编码英文(S8)

## 综合安全评分
7.5/10

## 关键发现
- checkedListCommand 的 insertBefore 回调忽略 item/index 参数，不支持切换已有 `- [x] ` 任务标记
- 所有操作在 textarea.value 上（纯文本），天然免疫 XSS
- insertBeforeEachLine 函数分支对 insertBefore 回调最多调用 5 次且未复用变量
