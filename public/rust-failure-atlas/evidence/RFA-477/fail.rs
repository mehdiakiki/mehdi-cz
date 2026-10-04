enum Schedule {
    Daily { hour: u8, enabled: bool },
}

fn enable(schedule: Schedule) -> Schedule {
    match schedule {
        current @ Schedule::Daily { .. } => Schedule::Daily {
            enabled: true,
            ..current
        },
    }
}

fn main() {}
