.echo on
CREATE INDEX users_country_created ON users(country, created_at);
.eqp on
.stats on
SELECT 1;
SELECT count(email) FROM users WHERE country = 'DE';
SELECT count(email) FROM users WHERE country = 'DE' AND created_at > '2025-12-01';
SELECT count(email) FROM users WHERE created_at > '2025-12-01';
SELECT id, email FROM users WHERE country = 'DE' ORDER BY created_at DESC LIMIT 3;
.stats off
ANALYZE;
SELECT * FROM sqlite_stat1;
.stats on
SELECT 1;
SELECT count(email) FROM users WHERE created_at > '2025-12-01';
SELECT count(*) FROM users WHERE created_at > '2025-12-01';
.stats off
CREATE INDEX users_created_country ON users(created_at, country);
CREATE INDEX users_country ON users(country);
ANALYZE;
SELECT * FROM sqlite_stat1;
.stats on
SELECT 1;
SELECT count(email) FROM users INDEXED BY users_country_created WHERE country = 'DE' AND created_at > '2025-12-01';
SELECT count(email) FROM users INDEXED BY users_created_country WHERE country = 'DE' AND created_at > '2025-12-01';
SELECT count(email) FROM users INDEXED BY users_created_country WHERE country = 'DE';
SELECT id, email FROM users INDEXED BY users_country WHERE country = 'DE' ORDER BY created_at DESC LIMIT 3;
