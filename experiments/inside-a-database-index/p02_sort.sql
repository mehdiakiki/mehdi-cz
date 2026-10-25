.echo on
EXPLAIN SELECT id, email FROM users ORDER BY created_at DESC LIMIT 3;
