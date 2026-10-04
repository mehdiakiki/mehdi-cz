trait Repository {
    fn get_text(&self, key: &str) -> Option<String>;
}

struct MemoryRepository;

impl Repository for MemoryRepository {
    fn get_text(&self, key: &str) -> Option<String> {
        (key == "name").then(|| String::from("atlas"))
    }
}

fn use_repository(repository: &dyn Repository) {
    assert_eq!(repository.get_text("name").as_deref(), Some("atlas"));
}

fn main() {
    use_repository(&MemoryRepository);
}
