#[derive(Clone, Copy)]
struct Ticket {
    generation: u64,
}

struct CheckedSlot {
    generation: u64,
    value: u64,
}

impl CheckedSlot {
    fn ticket(&self) -> Ticket {
        Ticket {
            generation: self.generation,
        }
    }

    fn replace(&mut self, value: u64) {
        self.generation += 1;
        self.value = value;
    }

    fn read(&self, ticket: Ticket) -> Option<u64> {
        (ticket.generation == self.generation).then_some(self.value)
    }
}

fn main() {
    let logging = std::env::var("RFA_LOG").as_deref() == Ok("1");
    let mut slot = CheckedSlot {
        generation: 1,
        value: 10,
    };
    let stale = slot.ticket();
    slot.replace(38);

    if logging {
        eprintln!(
            "diagnostic observation: old_generation={} current_generation={}",
            stale.generation, slot.generation
        );
    }

    let value = slot.read(stale).unwrap_or_else(|| {
        panic!(
            "checked invariant rejected stale token; logging={logging}; old_generation={} current_generation={}",
            stale.generation, slot.generation
        )
    });
    println!("unexpected stale value={value}");
}
