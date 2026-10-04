enum Schedule {
    Daily { hour: u8, enabled: bool },
}

fn enable(schedule: Schedule) -> Schedule {
    match schedule {
        Schedule::Daily { hour, .. } => Schedule::Daily { hour, enabled: true },
    }
}

fn main() {
    let Schedule::Daily { enabled, .. } = enable(Schedule::Daily { hour: 9, enabled: false });
    assert!(enabled);
}
