-- Normalize legacy active published links that were stored with protocol in normalized_url.
UPDATE published_article_links p
SET deleted_at = NOW(), updated_at = NOW()
WHERE p.deleted_at IS NULL
  AND p.normalized_url ~* '^https?://'
  AND EXISTS (
    SELECT 1
    FROM published_article_links q
    WHERE q.deleted_at IS NULL
      AND q.article_id = p.article_id
      AND q.id <> p.id
      AND q.normalized_url = regexp_replace(p.normalized_url, '^https?://', '', 'i')
  );

UPDATE published_article_links
SET normalized_url = regexp_replace(normalized_url, '^https?://', '', 'i'),
    updated_at = NOW()
WHERE deleted_at IS NULL
  AND normalized_url ~* '^https?://';

-- Soft-delete soft-media backend URLs. They are order/manuscript console links,
-- not final public article links, and must not enter citation detection.
UPDATE published_article_links
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    domain = 'ruan.net'
    OR domain LIKE '%.ruan.net'
    OR normalized_url = 'ruan.net'
    OR normalized_url LIKE 'ruan.net/%'
    OR normalized_url LIKE '%.ruan.net/%'
  );
