use std::process::Command;

fn main() {
    let output = Command::new("date")
        .args(["-u", "+%Y-%m-%d"])
        .output()
        .expect("date command should run");
    assert!(output.status.success(), "date command failed");

    let date = String::from_utf8(output.stdout).expect("date command should return UTF-8");
    println!("cargo:rustc-env=LAST_UPDATED={}", date.trim());
}
