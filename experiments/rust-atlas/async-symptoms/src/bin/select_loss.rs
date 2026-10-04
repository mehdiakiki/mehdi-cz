use std::time::Duration;
use tokio::time::{interval, sleep};

struct Source { halves_handed_out: u32 }

impl Source {
    async fn next_half(&mut self) -> u32 {
        sleep(Duration::from_millis(15)).await;
        self.halves_handed_out += 1;
        self.halves_handed_out
    }
}

// The partial record lives inside the future.
async fn read_record_in_future(src: &mut Source) -> (u32, u32) {
    let a = src.next_half().await;
    let b = src.next_half().await;
    (a, b)
}

// The partial record lives in the source, outside the future.
struct SourceWithBuffer { inner: Source, pending: Option<u32> }

impl SourceWithBuffer {
    async fn read_record(&mut self) -> (u32, u32) {
        if self.pending.is_none() {
            self.pending = Some(self.inner.next_half().await);
        }
        let b = self.inner.next_half().await;
        (self.pending.take().unwrap(), b)
    }
}

#[tokio::main(flavor = "current_thread", start_paused = true)]
async fn main() {
    let mut src = Source { halves_handed_out: 0 };
    let mut ticks = interval(Duration::from_millis(20));
    let mut records = 0;
    for _ in 0..40 {
        tokio::select! {
            _ = read_record_in_future(&mut src) => { records += 1; }
            _ = ticks.tick() => {}
        }
    }
    println!("state inside the future:  {} halves consumed, {} records produced, {} halves lost",
        src.halves_handed_out, records, src.halves_handed_out - 2 * records);

    let mut src = SourceWithBuffer { inner: Source { halves_handed_out: 0 }, pending: None };
    let mut ticks = interval(Duration::from_millis(20));
    let mut records = 0;
    for _ in 0..40 {
        tokio::select! {
            _ = src.read_record() => { records += 1; }
            _ = ticks.tick() => {}
        }
    }
    let lost = src.inner.halves_handed_out - 2 * records - src.pending.map_or(0, |_| 1);
    println!("state outside the future: {} halves consumed, {} records produced, {} halves lost",
        src.inner.halves_handed_out, records, lost);
}
