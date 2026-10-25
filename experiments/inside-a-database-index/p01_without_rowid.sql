.headers on
.mode column
.echo on
CREATE TABLE users_wr (
    email TEXT PRIMARY KEY,
    id INTEGER NOT NULL,
    country TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL
) WITHOUT ROWID;
INSERT INTO users_wr SELECT email, id, country, created_at, status FROM users ORDER BY email;
SELECT name, pageno AS pages, payload FROM dbstat WHERE aggregate = TRUE;
SELECT name, pagetype, count(*) AS pages, sum(ncell) AS cells,
       max(length(path) - length(replace(path, '/', ''))) AS depth
FROM dbstat WHERE name LIKE 'users%' GROUP BY name, pagetype;
EXPLAIN QUERY PLAN SELECT * FROM users WHERE id = 966676;
EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'Adam.Ali1087@example.net';
EXPLAIN QUERY PLAN SELECT * FROM users_wr WHERE email = 'Adam.Ali1087@example.net';
