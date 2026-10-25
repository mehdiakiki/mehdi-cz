.echo on
PRAGMA cache_size;
.stats on
SELECT count(*) FROM sqlite_schema;
.eqp on
.timer on
SELECT * FROM users WHERE id = 966676;
SELECT * FROM users WHERE email = 'Adam.Ali1087@example.net';
SELECT count(*) FROM users WHERE created_at BETWEEN '2025-03-01 00:00:00' AND '2025-03-01 23:59:59';
SELECT id, email FROM users ORDER BY created_at DESC LIMIT 3;
