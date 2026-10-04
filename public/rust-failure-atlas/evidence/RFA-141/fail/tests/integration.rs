use rfa_cfg_test_integration::fixture_name;

#[test]
fn integration_fixture_is_available() {
    assert_eq!("integration", fixture_name());
}
