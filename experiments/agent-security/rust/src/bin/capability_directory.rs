use cap_std::{ambient_authority, fs::Dir};
use std::{fs, io, time::{SystemTime, UNIX_EPOCH}};

fn read_input(directory: &Dir, name: &str) -> io::Result<String> {
    directory.read_to_string(name)
}

fn demonstrate(root: &std::path::Path) -> io::Result<()> {
    let job = root.join("job");
    fs::create_dir(&job)?;
    fs::write(root.join("outside.txt"), "dummy outside file")?;
    fs::write(job.join("inside.txt"), "dummy inside file")?;
    fs::write(job.join("report with spaces.txt"), "another permitted file")?;
    let directory = Dir::open_ambient_dir(&job, ambient_authority())?;
    assert_eq!(read_input(&directory, "inside.txt")?, "dummy inside file");
    assert_eq!(read_input(&directory, "report with spaces.txt")?, "another permitted file");
    assert!(read_input(&directory, "missing.txt").is_err());
    assert!(read_input(&directory, "../outside.txt").is_err());
    assert!(read_input(&directory, root.join("outside.txt").to_str().unwrap()).is_err());
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(root.join("outside.txt"), job.join("shortcut"))?;
        assert!(read_input(&directory, "shortcut").is_err());
    }
    println!("The trusted tool's directory capability rejected paths outside its root.");
    Ok(())
}

fn main() -> io::Result<()> {
    let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    let root = std::env::temp_dir().join(format!("agent-capfs-{}-{nonce}", std::process::id()));
    fs::create_dir(&root)?;
    let result = demonstrate(&root);
    let cleanup = fs::remove_dir_all(&root);
    result.and(cleanup)
}
