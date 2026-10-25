.echo on
EXPLAIN SELECT * FROM users NOT INDEXED WHERE email = 'Adam.Ali1087@example.net';
EXPLAIN SELECT * FROM users WHERE email = 'Adam.Ali1087@example.net';
EXPLAIN SELECT count(*) FROM users WHERE created_at BETWEEN '2025-03-01 00:00:00' AND '2025-03-01 23:59:59';
EXPLAIN QUERY PLAN SELECT count(*) FROM users WHERE created_at > '2025-03-01' AND created_at < '2025-03-02';
EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'Adam.Ali1087@example.net' AND country = 'US';
