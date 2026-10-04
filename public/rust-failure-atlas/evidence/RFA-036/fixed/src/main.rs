use std::collections::VecDeque;
use std::pin::Pin;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc, Barrier, Mutex,
};
use std::task::{Context, Poll, Wake, Waker};

use futures_core::Stream;

struct WakeCounter(AtomicUsize);

impl Wake for WakeCounter {
    fn wake(self: Arc<Self>) {
        self.0.fetch_add(1, Ordering::SeqCst);
    }

    fn wake_by_ref(self: &Arc<Self>) {
        self.0.fetch_add(1, Ordering::SeqCst);
    }
}

struct State {
    queue: VecDeque<u8>,
    waker: Option<Waker>,
}

struct FixedStream {
    state: Arc<Mutex<State>>,
    registered: Arc<Barrier>,
    item_published: Arc<Barrier>,
}

impl Stream for FixedStream {
    type Item = u8;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let mut state = self.state.lock().unwrap();
        if let Some(item) = state.queue.pop_front() {
            return Poll::Ready(Some(item));
        }

        state.waker = Some(cx.waker().clone());
        drop(state);
        self.registered.wait();
        self.item_published.wait();
        Poll::Pending
    }
}

fn main() {
    let state = Arc::new(Mutex::new(State {
        queue: VecDeque::new(),
        waker: None,
    }));
    let registered = Arc::new(Barrier::new(2));
    let item_published = Arc::new(Barrier::new(2));
    let wakes = Arc::new(WakeCounter(AtomicUsize::new(0)));
    let waker = Waker::from(Arc::clone(&wakes));
    let mut context = Context::from_waker(&waker);

    let producer_state = Arc::clone(&state);
    let producer_registered = Arc::clone(&registered);
    let producer_published = Arc::clone(&item_published);
    let producer = std::thread::spawn(move || {
        producer_registered.wait();
        let wake = {
            let mut state = producer_state.lock().unwrap();
            state.queue.push_back(7);
            state.waker.take()
        };
        if let Some(waker) = wake {
            waker.wake();
        }
        producer_published.wait();
    });

    let mut stream = FixedStream {
        state,
        registered,
        item_published,
    };
    assert_eq!(Pin::new(&mut stream).poll_next(&mut context), Poll::Pending);
    producer.join().unwrap();
    assert_eq!(wakes.0.load(Ordering::SeqCst), 1);
    assert_eq!(Pin::new(&mut stream).poll_next(&mut context), Poll::Ready(Some(7)));
}
