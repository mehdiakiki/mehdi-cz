.echo on
CREATE INDEX users_email ON users(email);
CREATE INDEX users_email_status ON users(email, status);
SELECT name, pageno AS pages, payload FROM dbstat WHERE aggregate = TRUE AND name LIKE 'users%';
SELECT name, max(length(path) - length(replace(path, '/', ''))) AS depth
FROM dbstat WHERE name LIKE 'users%' GROUP BY name;
EXPLAIN SELECT email, status FROM users INDEXED BY users_email_status WHERE email = 'Adam.Ali1087@example.net';
.eqp on
.stats on
SELECT 1;
SELECT email, status FROM users INDEXED BY users_email WHERE email = 'Adam.Ali1087@example.net';
SELECT email, status FROM users INDEXED BY users_email_status WHERE email = 'Adam.Ali1087@example.net';
SELECT count(status) FROM users INDEXED BY users_email WHERE email >= 'm' AND email < 'n';
SELECT count(status) FROM users INDEXED BY users_email_status WHERE email >= 'm' AND email < 'n';
SELECT id, email FROM users INDEXED BY users_email WHERE email = 'Adam.Ali1087@example.net';
