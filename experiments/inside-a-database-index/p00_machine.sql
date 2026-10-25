.echo on
PRAGMA secure_delete;
PRAGMA cache_size;
PRAGMA page_size;
PRAGMA auto_vacuum;
SELECT compile_options FROM pragma_compile_options
WHERE compile_options IN ('SECURE_DELETE', 'ENABLE_STAT4', 'ENABLE_DBSTAT_VTAB', 'ENABLE_FTS5')
   OR compile_options LIKE 'DEFAULT_CACHE_SIZE%' OR compile_options LIKE 'DEFAULT_MMAP_SIZE%';
.scanstats on
