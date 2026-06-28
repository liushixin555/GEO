# 2026-06-24 技能目录嵌套导致文章生成未读取 SKILL.md

## 问题

文章 #11 的 `skills` 字段为 `[1]`，技能表中 `id=1` 对应 `skill_dir=geo-content-generator-v8`。但磁盘实际文件位于：

`skills/geo-content-generator-v8/geo-content-generator-v8/SKILL.md`

后端原链路按 `skills/geo-content-generator-v8/SKILL.md` 读取，因此不能稳定读取到实际 SKILL 文件。

## 修复

- `apis/service/impl/llm.service.impl.ts` 中普通字符串技能输入同时按技能名和技能目录解析。
- 技能目录解析时优先读取 `skills/<skillDir>/SKILL.md`。
- 如果直接路径不存在，则自动识别一层内嵌目录中的 `SKILL.md`，例如 `skills/geo-content-generator-v8/geo-content-generator-v8/SKILL.md`。

## 验证

- `node scripts/with-local-env.cjs npx tsc -p tsconfig.api.json --noEmit` 通过。
- 文章 #11 当前正文标题结构不符合 `geo-content-generator-v8` 的选型类文章结构要求，需要重启后端后重新生成文章验证。
