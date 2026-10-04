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

struct BrokenStream {
    queue: Arc<Mutex<VecDeque<u8>>>,
    waker: Arc<Mutex<Option<Waker>>>,
    checked_empty: Arc<Barrier>,
    item_published: Arc<Barrier>,
}

impl Stream for BrokenStream {
    type Item = u8;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        if let Some(item) = self.queue.lock().unwrap().pop_front() {
            return Poll::Ready(Some(item));
        }

        // The producer is forced into the gap between checking and registration.
        self.checked_empty.wait();
        self.item_published.wait();
        *self.waker.lock().unwrap() = Some(cx.waker().clone());
        Poll::Pending
    }
}

fn main() {
    let queue = Arc::new(Mutex::new(VecDeque::new()));
    let registered_waker = Arc::new(Mutex::new(None::<Waker>));
    let checked_empty = Arc::new(Barrier::new(2));
    let item_published = Arc::new(Barrier::new(2));
    let wakes = Arc::new(WakeCounter(AtomicUsize::new(0)));
    let waker = Waker::from(Arc::clone(&wakes));
    let mut context = Context::from_waker(&waker);

    let producer_queue = Arc::clone(&queue);
    let producer_waker = Arc::clone(&registered_waker);
    let producer_checked = Arc::clone(&checked_empty);
    let producer_published = Arc::clone(&item_published);
    let producer = std::thread::spawn(move || {
        producer_checked.wait();
        producer_queue.lock().unwrap().push_back(7);
        if let Some(waker) = producer_waker.lock().unwrap().take() {
            waker.wake();
        }
        producer_published.wait();
    });

    let mut stream = BrokenStream {
        queue,
        waker: registered_waker,
        checked_empty,
        item_published,
    };
    assert_eq!(Pin::new(&mut stream).poll_next(&mut context), Poll::Pending);
    producer.join().unwrap();

    assert_eq!(
        wakes.0.load(Ordering::SeqCst),
        1,
        "the item was published before registration, so no wake was delivered"
    );
}
