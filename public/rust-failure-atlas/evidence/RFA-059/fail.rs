trait Repository {
    fn get<T>(&self, key: &str) -> Option<T>;
}

fn use_repository(repository: &dyn Repository) {
    let _: Option<String> = repository.get("name");
}

fn main() {}
