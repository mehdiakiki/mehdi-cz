extern crate core;

mod helpers {
    pub trait CoreCapability {}
}

use helpers::CoreCapability;

struct Item;
impl CoreCapability for Item {}

fn main() { let _item = Item; }
