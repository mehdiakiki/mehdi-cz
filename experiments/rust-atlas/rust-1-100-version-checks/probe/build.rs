// Asks three common build-script helpers the same question: is this compiler at least Rust 1.80?
// The last line asks for at least 1.100, where a beta and its release give different answers.
fn main() {
    let autocfg = autocfg::new().probe_rustc_version(1, 80);
    println!("cargo:warning=autocfg probe_rustc_version(1, 80) = {autocfg}");

    let read = version_check::Version::read().map(|version| version.to_string());
    let minimum = version_check::is_min_version("1.80.0");
    println!("cargo:warning=version_check reads {read:?}, is_min_version(\"1.80.0\") = {minimum:?}");

    let version = rustc_version::version().expect("rustc_version could not read the compiler");
    let at_least = version >= semver::Version::new(1, 80, 0);
    println!("cargo:warning=rustc_version reads {version}, >= 1.80.0 is {at_least}");

    let requirement = semver::VersionReq::parse(">=1.80").unwrap();
    let matches = requirement.matches(&version);
    println!("cargo:warning=semver VersionReq \">=1.80\" matches {version}: {matches}");

    let autocfg_100 = autocfg::new().probe_rustc_version(1, 100);
    let version_check_100 = version_check::is_min_version("1.100.0");
    let rustc_version_100 = version >= semver::Version::new(1, 100, 0);
    println!(
        "cargo:warning=at least 1.100: autocfg {autocfg_100}, version_check {version_check_100:?}, rustc_version {rustc_version_100}"
    );
}
