# 2026-07-05 引用检测来源 URL 清洗补强

- 引用来源 URL 入库前必须清理 markdown 列表尾巴、换行转义和智能引号。
- 真实检测中观察到模型可能返回 `https://domain\n-`、`https://domain”` 这类来源；应清洗为标准 URL 后再写入 `ai_citation_records`。
