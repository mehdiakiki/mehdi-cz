-- Run only in a disposable GitHub CI database with pgvector installed.
-- These vectors are hand-written test coordinates, not model embeddings.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TEMP TABLE trial_documents (
  id integer PRIMARY KEY,
  tenant_id integer NOT NULL,
  symbol text NOT NULL,
  body text NOT NULL,
  embedding vector(3) NOT NULL,
  search tsvector GENERATED ALWAYS AS (to_tsvector('english', body)) STORED
);
CREATE INDEX ON trial_documents USING gin (search);
CREATE INDEX ON trial_documents (tenant_id, symbol);

INSERT INTO trial_documents (id, tenant_id, symbol, body, embedding) VALUES
  (1, 7, 'E_UPLOAD_17', 'E_UPLOAD_17: resume an upload session after a disconnect.', '[1,0,0]'),
  (2, 7, 'upload-recovery', 'Restart a failed transfer by reopening the upload session.', '[0.8,0.2,0]'),
  (3, 7, 'resumeUpload', 'resumeUpload(sessionId) continues a saved upload session.', '[0,1,0]'),
  (4, 8, 'E_UPLOAD_17', 'Private instructions for another customer.', '[1,0,0]');

CREATE TEMP TABLE trial_queries (
  id text PRIMARY KEY,
  text text NOT NULL,
  embedding vector(3) NOT NULL,
  useful_ids integer[] NOT NULL
);
INSERT INTO trial_queries VALUES
  ('error-code', 'E_UPLOAD_17', '[1,0,0]', ARRAY[1]),
  ('paraphrase', 'continue after a broken connection', '[1,0,0]', ARRAY[1,2]),
  ('function-name', 'resumeUpload', '[0,1,0]', ARRAY[3]);

-- Fixed tenant 7 stands in for an authenticated tenant, never a search parameter
-- supplied unchecked by an agent. Outputs show mechanics, not relevance quality.
CREATE TEMP TABLE trial_results AS
WITH lexical AS (
  SELECT q.id AS query_id, result.id,
         row_number() OVER (PARTITION BY q.id ORDER BY result.exact DESC, result.score DESC, result.id) AS rank
  FROM trial_queries AS q
  CROSS JOIN LATERAL (
    SELECT d.id, (d.symbol = q.text) AS exact,
           ts_rank_cd(d.search, websearch_to_tsquery('english', q.text)) AS score
    FROM trial_documents AS d
    WHERE d.tenant_id = 7
      AND (d.symbol = q.text OR d.search @@ websearch_to_tsquery('english', q.text))
    ORDER BY exact DESC, score DESC, d.id
    LIMIT 3
  ) AS result
), nearest AS (
  SELECT q.id AS query_id, result.id,
         row_number() OVER (PARTITION BY q.id ORDER BY result.distance, result.id) AS rank
  FROM trial_queries AS q
  CROSS JOIN LATERAL (
    SELECT d.id, d.embedding <=> q.embedding AS distance
    FROM trial_documents AS d
    WHERE d.tenant_id = 7
    ORDER BY distance, d.id
    LIMIT 3
  ) AS result
), fused AS (
  SELECT query_id, id, sum(1.0 / (60 + rank)) AS score
  FROM (SELECT * FROM lexical UNION ALL SELECT * FROM nearest) AS candidates
  GROUP BY query_id, id
)
SELECT q.id, q.useful_ids AS relevance_labels,
       ARRAY(SELECT l.id FROM lexical AS l WHERE l.query_id = q.id ORDER BY l.rank) AS lexical_ids,
       ARRAY(SELECT n.id FROM nearest AS n WHERE n.query_id = q.id ORDER BY n.rank) AS vector_ids,
       ARRAY(SELECT f.id FROM fused AS f WHERE f.query_id = q.id ORDER BY f.score DESC, f.id LIMIT 3) AS fused_ids
FROM trial_queries AS q ORDER BY q.id;

-- Display and assertions read the same materialized query outputs. Repeating
-- an unrelated tenant-filtered query below would not protect these paths.
SELECT * FROM trial_results ORDER BY id;

DO $$
DECLARE candidate integer;
BEGIN
  SELECT id INTO candidate FROM trial_documents
  WHERE tenant_id = 7 AND symbol = 'E_UPLOAD_17';
  IF candidate IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Exact symbol lookup failed'; END IF;

  IF (SELECT count(*) FROM trial_results) <> 3 THEN
    RAISE EXCEPTION 'A displayed query result is missing or duplicated';
  END IF;
  IF EXISTS (
    SELECT 1 FROM trial_results AS r
    CROSS JOIN LATERAL unnest(r.lexical_ids || r.vector_ids || r.fused_ids) AS returned(id)
    LEFT JOIN trial_documents AS d ON d.id = returned.id
    WHERE d.id IS NULL OR d.tenant_id <> 7
  ) THEN RAISE EXCEPTION 'Unauthorized or unknown ID in displayed search results'; END IF;

  -- These orders follow the fixed text and hand-written coordinates above.
  -- They are a mechanics regression, not evidence of embedding-model quality.
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('error-code', ARRAY[1], ARRAY[1,2,3], ARRAY[1,2,3]),
      ('paraphrase', ARRAY[]::integer[], ARRAY[1,2,3], ARRAY[1,2,3]),
      ('function-name', ARRAY[3], ARRAY[3,2,1], ARRAY[3,2,1])
    ) AS expected(id, lexical_ids, vector_ids, fused_ids)
    LEFT JOIN trial_results AS actual USING (id)
    WHERE actual.id IS NULL
      OR actual.lexical_ids IS DISTINCT FROM expected.lexical_ids
      OR actual.vector_ids IS DISTINCT FROM expected.vector_ids
      OR actual.fused_ids IS DISTINCT FROM expected.fused_ids
  ) THEN RAISE EXCEPTION 'Displayed lexical/vector/fused ordering changed'; END IF;

  UPDATE trial_documents SET body = 'Restored transfer instructions.' WHERE id = 2;
  IF NOT EXISTS (
    SELECT 1 FROM trial_documents WHERE id = 2 AND search @@ plainto_tsquery('english', 'restored')
  ) THEN RAISE EXCEPTION 'Generated text-search value did not update'; END IF;
  IF EXISTS (
    SELECT 1 FROM trial_documents WHERE id = 2 AND search @@ plainto_tsquery('english', 'reopening')
  ) THEN RAISE EXCEPTION 'Stale text-search content survived update'; END IF;

  DELETE FROM trial_documents WHERE id = 3;
  IF EXISTS (SELECT 1 FROM trial_documents WHERE tenant_id = 7 AND symbol = 'resumeUpload') THEN
    RAISE EXCEPTION 'Deleted symbol still visible';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT id FROM trial_documents WHERE tenant_id = 7
      ORDER BY embedding <=> '[0,1,0]'::vector LIMIT 3
    ) AS results WHERE id = 3
  ) THEN RAISE EXCEPTION 'Deleted vector row still visible'; END IF;
END $$;

-- This is a correctness fixture. A plan from four rows is not a scaling result.
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM trial_documents
WHERE tenant_id = 7
ORDER BY embedding <=> '[1,0,0]'::vector, id LIMIT 3;
ROLLBACK;
