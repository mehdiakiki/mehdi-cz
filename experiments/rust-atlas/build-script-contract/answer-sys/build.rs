use std::env;
use std::path::PathBuf;
use std::process::Command;

const NATIVE_VERSION: &str = "2";

fn main() {
    println!("cargo::rerun-if-changed=native/answer.c");
    println!("cargo::rerun-if-env-changed=CC");
    println!("cargo::rerun-if-env-changed=AR");

    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo sets OUT_DIR"));
    let cc = env::var("CC").unwrap_or_else(|_| "cc".to_string());
    let ar = env::var("AR").unwrap_or_else(|_| "ar".to_string());
    let object = out_dir.join("answer.o");
    let archive = out_dir.join("libanswer.a");

    let mut compile = Command::new(&cc);
    compile.args(["-c", "-fPIC", "native/answer.c", "-o"]).arg(&object);
    let mut pack = Command::new(&ar);
    pack.arg("crs").arg(&archive).arg(&object);
    for command in [&mut compile, &mut pack] {
        let program = command.get_program().to_string_lossy().into_owned();
        match command.status() {
            Ok(status) if status.success() => {}
            Ok(status) => {
                println!("cargo::error={program} failed with {status}");
                return;
            }
            Err(error) => {
                println!("cargo::error=could not start {program}: {error}");
                return;
            }
        }
    }

    println!("cargo::rustc-link-search=native={}", out_dir.display());
    println!("cargo::rustc-link-lib=static=answer");
    println!("cargo::rustc-link-arg=-Wl,--defsym=link_arg_from_answer_sys=0x2a");
    println!("cargo::rustc-check-cfg=cfg(answer_version, values(\"1\", \"2\"))");
    println!("cargo::rustc-cfg=answer_version=\"{NATIVE_VERSION}\"");
    println!("cargo::rustc-env=ANSWER_CC={cc}");
    println!("cargo::metadata=version={NATIVE_VERSION}");
    println!("cargo::warning=compiled native/answer.c with {cc}");
}
