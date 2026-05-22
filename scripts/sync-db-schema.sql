-- ================================================
-- 生产数据库 Schema 同步脚本
-- 执行方式: psql -h <host> -U postgres -d geo_ts -f sync-db-schema.sql
-- ================================================

-- 1. articles 表：添加缺失列
ALTER TABLE articles ADD COLUMN IF NOT EXISTS article_type VARCHAR(50);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS write_mode VARCHAR(20);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;

-- 2. articles 表：keywords 从 jsonb 转为 varchar(500)
ALTER TABLE articles ALTER COLUMN keywords DROP NOT NULL;
ALTER TABLE articles ALTER COLUMN keywords SET DATA TYPE varchar(500) USING keywords::text;

-- 3. knowledge_keywords 表：添加 seed_word 列
ALTER TABLE knowledge_keywords ADD COLUMN IF NOT EXISTS seed_word VARCHAR(200);

-- 验证
SELECT table_name, column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'articles' AND column_name IN ('article_type', 'write_mode', 'scheduled_publish_at', 'keywords'))
    OR (table_name = 'knowledge_keywords' AND column_name = 'seed_word'))
ORDER BY table_name, column_name;
