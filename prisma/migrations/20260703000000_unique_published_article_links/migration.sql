CREATE UNIQUE INDEX IF NOT EXISTS "published_article_links_article_id_normalized_url_active_key"
  ON "published_article_links"("article_id", "normalized_url")
  WHERE "deleted_at" IS NULL;
