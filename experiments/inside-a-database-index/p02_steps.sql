.echo on
.stats vmstep
SELECT * FROM users WHERE email = 'Adam.Ali1087@example.net';
SELECT id, email FROM users ORDER BY created_at DESC LIMIT 3;
.stats off
CREATE INDEX users_email ON users(email);
CREATE INDEX users_created ON users(created_at);
.stats vmstep
SELECT * FROM users WHERE email = 'Adam.Ali1087@example.net';
