.echo on
CREATE INDEX users_country_created ON users(country, created_at);
ANALYZE;
EXPLAIN SELECT count(email) FROM users WHERE created_at > '2025-12-01';
