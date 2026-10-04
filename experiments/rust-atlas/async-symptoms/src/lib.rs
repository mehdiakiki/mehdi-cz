//! Deterministic claims behind the async Rust cluster.
//! Each binary in `src/bin` reproduces one measured symptom from the pillar
//! article. The tests below pin the claims that do not depend on wall-clock
//! timing. `compile-fail/send_fail.rs` is intentionally not compiled: it
//! documents the `future cannot be sent between threads safely` error.

pub async fn tiny() -> u8 {
    tokio::task::yield_now().await;
    1
}

pub async fn buffer_alive_across_await() -> u8 {
    let buf = [7u8; 4096];
    tokio::task::yield_now().await;
    buf[0]
}

pub async fn buffer_finished_before_await() -> u8 {
    let buf = [7u8; 4096];
    let first = buf[0];
    tokio::task::yield_now().await;
    first
}

pub async fn two_sequential_calls() -> u8 {
    let a = buffer_alive_across_await().await;
    let b = buffer_alive_across_await().await;
    a + b
}

pub async fn two_joined_calls() -> u8 {
    let (a, b) = tokio::join!(buffer_alive_across_await(), buffer_alive_across_await());
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::mem::size_of_val;
    use std::time::Duration;

    #[test]
    fn a_local_alive_across_an_await_becomes_a_field_of_the_future() {
        assert_eq!(size_of_val(&tiny()), size_of_val(&buffer_finished_before_await()));
        assert!(size_of_val(&buffer_alive_across_await()) >= 4096 + size_of_val(&tiny()));
    }

    #[test]
    fn sequential_awaits_share_storage_but_joined_awaits_do_not() {
        let one = size_of_val(&buffer_alive_across_await());
        assert!(size_of_val(&two_sequential_calls()) < 2 * one);
        assert!(size_of_val(&two_joined_calls()) >= 2 * one);
    }

    #[test]
    fn boxing_moves_the_future_to_the_heap_without_shrinking_it() {
        assert_eq!(size_of_val(&Box::pin(two_joined_calls())), std::mem::size_of::<usize>());
    }

    struct Source {
        halves: u32,
    }

    impl Source {
        async fn next_half(&mut self) -> u32 {
            tokio::time::sleep(Duration::from_millis(15)).await;
            self.halves += 1;
            self.halves
        }
    }

    async fn read_record_in_future(src: &mut Source) -> (u32, u32) {
        let a = src.next_half().await;
        let b = src.next_half().await;
        (a, b)
    }

    #[tokio::test(flavor = "current_thread", start_paused = true)]
    async fn select_drops_partial_progress_held_inside_the_future() {
        let mut src = Source { halves: 0 };
        let mut ticks = tokio::time::interval(Duration::from_millis(20));
        let mut records = 0;
        for _ in 0..40 {
            tokio::select! {
                _ = read_record_in_future(&mut src) => { records += 1; }
                _ = ticks.tick() => {}
            }
        }
        // Exactly what the `select_loss` binary prints under the paused clock.
        assert_eq!(records, 0);
        assert_eq!(src.halves, 39);
    }

    #[tokio::test(flavor = "current_thread", start_paused = true)]
    async fn select_loses_nothing_when_progress_lives_outside_the_future() {
        struct Buffered {
            inner: Source,
            pending: Option<u32>,
        }
        impl Buffered {
            async fn read_record(&mut self) -> (u32, u32) {
                if self.pending.is_none() {
                    self.pending = Some(self.inner.next_half().await);
                }
                let b = self.inner.next_half().await;
                (self.pending.take().unwrap(), b)
            }
        }
        let mut src = Buffered { inner: Source { halves: 0 }, pending: None };
        let mut ticks = tokio::time::interval(Duration::from_millis(20));
        let mut records = 0;
        for _ in 0..40 {
            tokio::select! {
                _ = src.read_record() => { records += 1; }
                _ = ticks.tick() => {}
            }
        }
        let held = u32::from(src.pending.is_some());
        assert_eq!(src.inner.halves, 2 * records + held);
        assert_eq!(records, 13);
        assert_eq!(src.inner.halves, 26);
    }
}
