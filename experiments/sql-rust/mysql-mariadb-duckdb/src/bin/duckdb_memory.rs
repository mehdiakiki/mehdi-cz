use duckdb::Connection;
use sql_rust_engines_b::{duck_version, literal, Result};
use std::path::Path;

fn temp_peak(value: &serde_json::Value) -> Option<u64> {
    match value {
        serde_json::Value::Object(map) => {
            for key in [
                "system.peak_temp_dir_size",
                "peak_temp_dir_size",
                "system_peak_temp_dir_size",
            ] {
                if let Some(number) = map.get(key).and_then(|v| v.as_u64()) {
                    return Some(number);
                }
            }
            map.values().filter_map(temp_peak).max()
        }
        serde_json::Value::Array(items) => items.iter().filter_map(temp_peak).max(),
        _ => None,
    }
}

fn consume(c: &Connection) -> duckdb::Result<(u64, i64)> {
    let mut statement =
        c.prepare("SELECT i::BIGINT FROM range(250000) t(i) ORDER BY md5(i::VARCHAR)")?;
    let mut rows = statement.query([])?;
    let mut count = 0_u64;
    let mut sum = 0_i64;
    while let Some(row) = rows.next()? {
        count += 1;
        sum += row.get::<_, i64>(0)?;
    }
    Ok((count, sum))
}

// article-example:start
fn case(root: &Path, name: &str, memory: &str, scratch: &str, must_complete: bool) -> Result<()> {
    let c = Connection::open_in_memory()?;
    duck_version(&c)?;
    let temp = root.join(format!("scratch-{name}"));
    let profile = root.join(format!("profile-{name}.json"));
    std::fs::create_dir(&temp)?;
    c.execute_batch(&format!("SET threads=1; SET max_execution_time=15000; SET memory_limit='{memory}'; SET max_temp_directory_size='{scratch}'; SET temp_directory={}; SET enable_profiling='json'; SET profiling_output={};", literal(&temp), literal(&profile)))?;
    let outcome = consume(&c);
    c.execute_batch("PRAGMA disable_profiling")?;
    match outcome {
        Ok((count, sum)) => {
            assert_eq!(count, 250000);
            assert_eq!(sum, (0..250000_i64).sum::<i64>());
            println!("{name}: completed, rows={count}, memory={memory}, scratch cap={scratch}");
        }
        Err(error) => {
            let message = error.to_string();
            if must_complete || !message.to_ascii_lowercase().contains("out of memory") {
                return Err(error.into());
            }
            println!("{name}: bounded engine memory rejection: {message}");
        }
    }
    if profile.is_file() {
        let json: serde_json::Value = serde_json::from_slice(&std::fs::read(&profile)?)?;
        match temp_peak(&json) {
            Some(0) => {
                println!("{name}: profile reports zero peak scratch bytes; spill not observed")
            }
            Some(bytes) => println!("{name}: observed peak scratch bytes={bytes}"),
            None => println!(
                "{name}: profile schema has no recognized scratch metric; spill unverified"
            ),
        }
        println!("{name}: actual profile={json}");
    } else {
        println!("{name}: no profile file; spill unverified");
    }
    Ok(())
}
// article-example:end

fn main() -> Result<()> {
    let files = tempfile::tempdir()?;
    case(files.path(), "baseline", "128MB", "0B", true)?;
    case(files.path(), "scratch-allowed", "32MB", "64MB", false)?;
    case(files.path(), "tight-no-scratch", "1MB", "0B", false)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::temp_peak;
    use serde_json::json;

    #[test]
    fn distinguish_missing_zero_and_observed_scratch() {
        assert_eq!(temp_peak(&json!({"system.peak_temp_dir_size": 0})), Some(0));
        assert_eq!(
            temp_peak(&json!({"metrics": {"system": {"peak_temp_dir_size": 4096}}})),
            Some(4096)
        );
        assert_eq!(temp_peak(&json!({"system.peak_buffer_memory": 4096})), None);
        assert_eq!(
            temp_peak(&json!({"system.peak_temp_dir_size": "unknown"})),
            None
        );
    }
}
