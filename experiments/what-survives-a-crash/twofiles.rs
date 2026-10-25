use std::env;
use std::ffi::CString;
use std::fs::{self, File};
use std::io::Write;
use std::os::unix::fs::symlink;
use std::path::Path;

const AT_FDCWD: i32 = -100;
const RENAME_EXCHANGE: u32 = 2;

unsafe extern "C" {
    fn renameat2(olddirfd: i32, oldpath: *const i8, newdirfd: i32, newpath: *const i8, flags: u32) -> i32;
}

fn config(version: u32) -> Vec<u8> {
    format!("version={version}\n").into_bytes()
}

fn data(version: u32) -> Vec<u8> {
    format!("data for version {version}\n").repeat(200).into_bytes()
}

fn write_synced(path: &Path, content: &[u8]) {
    let mut file = File::create(path).expect("create");
    file.write_all(content).expect("write");
    file.sync_all().expect("fsync");
}

fn sync_dir(path: &Path) {
    File::open(path).expect("open dir").sync_all().expect("fsync dir");
}

fn separate(dir: &Path, version: u32) {
    for (name, content) in [("config", config(version)), ("data", data(version))] {
        let tmp = dir.join(format!("{name}.tmp"));
        write_synced(&tmp, &content);
        fs::rename(&tmp, dir.join(name)).expect("rename");
        sync_dir(dir);
    }
}

fn write_version(dir: &Path, version: u32) {
    fs::create_dir(dir).expect("mkdir");
    write_synced(&dir.join("config"), &config(version));
    write_synced(&dir.join("data"), &data(version));
    sync_dir(dir);
}

fn switch_symlink(dir: &Path, version: u32) {
    write_version(&dir.join(format!("v{version}")), version);
    let tmp = dir.join("current.tmp");
    symlink(format!("v{version}"), &tmp).expect("symlink");
    fs::rename(&tmp, dir.join("current")).expect("rename symlink");
    sync_dir(dir);
    let old = dir.join(format!("v{}", version - 1));
    if old.exists() {
        fs::remove_dir_all(&old).expect("remove old version");
        sync_dir(dir);
    }
}

fn exchange(dir: &Path, version: u32) {
    let staging = dir.join("staging");
    write_version(&staging, version);
    sync_dir(dir);
    let old = CString::new(staging.to_str().unwrap()).unwrap();
    let new = CString::new(dir.join("live").to_str().unwrap()).unwrap();
    let rc = unsafe { renameat2(AT_FDCWD, old.as_ptr(), AT_FDCWD, new.as_ptr(), RENAME_EXCHANGE) };
    assert_eq!(rc, 0, "renameat2: {}", std::io::Error::last_os_error());
    sync_dir(dir);
}

fn setup(dir: &Path, layout: &str) {
    let _ = fs::remove_dir_all(dir);
    fs::create_dir(dir).expect("mkdir");
    match layout {
        "separate" => separate(dir, 1),
        "symlink" => {
            write_version(&dir.join("v1"), 1);
            symlink("v1", dir.join("current")).expect("symlink");
        }
        _ => write_version(&dir.join("live"), 1),
    }
    sync_dir(dir);
}

fn version_of(config: &[u8], data: &[u8]) -> Option<(u32, u32)> {
    let c = (1..=2).find(|&v| config == self::config(v).as_slice())?;
    let d = (1..=2).find(|&v| data == self::data(v).as_slice())?;
    Some((c, d))
}

fn check(dir: &Path, layout: &str) {
    let base = match layout {
        "separate" => dir.to_path_buf(),
        "symlink" => dir.join("current"),
        _ => dir.join("live"),
    };
    let (Ok(c), Ok(d)) = (fs::read(base.join("config")), fs::read(base.join("data"))) else {
        return println!("a file is missing");
    };
    match version_of(&c, &d) {
        Some((a, b)) if a == b => println!("both files at version {a}"),
        Some((a, b)) => println!("mixed: config at version {a}, data at version {b}"),
        None => println!("a file has unknown content"),
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let (command, dir) = (args[1].as_str(), Path::new(&args[2]));
    match command {
        "setup" => return setup(dir, &args[3]),
        "check" => return check(dir, &args[3]),
        "separate" => separate(dir, 2),
        "symlink" => switch_symlink(dir, 2),
        "exchange" => exchange(dir, 2),
        _ => return eprintln!("usage: twofiles setup|check DIR LAYOUT | separate|symlink|exchange DIR"),
    }
    println!("saved");
}
