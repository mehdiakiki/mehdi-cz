.headers on
.mode column
.echo on
PRAGMA page_size;
PRAGMA page_count;
SELECT name, pageno AS pages, payload, unused FROM dbstat WHERE aggregate = TRUE;
.timer on
CREATE INDEX users_email ON users(email);
.timer off
PRAGMA page_count;
SELECT name, pageno AS pages, payload, unused FROM dbstat WHERE aggregate = TRUE;
SELECT name, pagetype, count(*) AS pages, sum(ncell) AS cells,
       max(length(path) - length(replace(path, '/', ''))) AS depth
FROM dbstat WHERE name LIKE 'users%' GROUP BY name, pagetype;
SELECT email, rowid FROM users INDEXED BY users_email ORDER BY email LIMIT 5;
SELECT email, rowid FROM users INDEXED BY users_email ORDER BY email DESC LIMIT 3;
SELECT * FROM users WHERE rowid = 966676;
