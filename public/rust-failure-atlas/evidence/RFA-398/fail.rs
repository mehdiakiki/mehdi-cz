fn main() {
    let mut values = [10, 20].into_iter();
    let partial = values.next_chunk::<3>().expect_err("two items cannot fill a three-item array");
    assert_eq!(partial.len(), 0, "next_chunk returns already consumed partial items inside the error iterator");
}
