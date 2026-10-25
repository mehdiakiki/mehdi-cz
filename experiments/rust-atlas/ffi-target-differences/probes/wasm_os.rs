// Calls std services that need an operating system and writes what happened
// into a buffer that the host reads from linear memory.
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

static OUT: Mutex<[u8; 512]> = Mutex::new([0; 512]);
static LAST_PANIC: Mutex<String> = Mutex::new(String::new());

fn publish(text: &str) -> usize {
    let mut out = OUT.lock().unwrap();
    let len = text.len().min(out.len());
    out[..len].copy_from_slice(&text.as_bytes()[..len]);
    len
}

#[unsafe(no_mangle)]
pub extern "C" fn out_ptr() -> *const u8 {
    OUT.lock().unwrap().as_ptr()
}

#[unsafe(no_mangle)]
pub extern "C" fn install_panic_hook() {
    std::panic::set_hook(Box::new(|info| {
        let message = info.payload_as_str().unwrap_or("non-string payload");
        *LAST_PANIC.lock().unwrap() = format!("panicked: {message}");
    }));
}

#[unsafe(no_mangle)]
pub extern "C" fn last_panic() -> usize {
    let text = LAST_PANIC.lock().unwrap().clone();
    publish(&text)
}

#[unsafe(no_mangle)]
pub extern "C" fn probe_fs() -> usize {
    let text = match std::fs::read("/etc/hostname") {
        Ok(bytes) => format!("Ok({} bytes)", bytes.len()),
        Err(e) => format!("Err(kind: {:?}, message: \"{}\")", e.kind(), e),
    };
    publish(&text)
}

#[unsafe(no_mangle)]
pub extern "C" fn probe_thread() -> usize {
    let text = match std::thread::Builder::new().spawn(|| 1) {
        Ok(handle) => format!("Ok(joined {:?})", handle.join().ok()),
        Err(e) => format!("Err(kind: {:?}, message: \"{}\")", e.kind(), e),
    };
    publish(&text)
}

#[unsafe(no_mangle)]
pub extern "C" fn probe_time() -> usize {
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    publish(&format!("Ok({secs} seconds since 1970)"))
}
