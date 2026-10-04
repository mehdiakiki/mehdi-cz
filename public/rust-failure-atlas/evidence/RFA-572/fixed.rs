struct Client;

impl Client {
    fn connect(&self) {}

    fn reconnect(&self) {
        self.connect();
    }
}

fn main() {
    Client.reconnect();
}
