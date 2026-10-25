ATTACH 'out/p03-keys.db' AS keys;
CREATE TABLE a (id INTEGER PRIMARY KEY, k TEXT NOT NULL);
CREATE INDEX a_k ON a(k);
CREATE TABLE b (id INTEGER PRIMARY KEY, k TEXT NOT NULL);
CREATE INDEX b_k ON b(k);
.echo on
.stats on
.timer on
SELECT 1;
INSERT INTO a(k) SELECT k FROM keys.sorted_keys;
INSERT INTO b(k) SELECT k FROM keys.shuffled_keys;
