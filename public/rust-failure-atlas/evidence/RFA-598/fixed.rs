#[unsafe(export_name = "service_entry")]
pub extern "C" fn service_entry() {}

fn main() {
    service_entry();
}
