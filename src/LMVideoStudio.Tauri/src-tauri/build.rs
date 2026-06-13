fn main() {
    if std::env::var("LMVS_BUILD_FLAVOR").as_deref() == Ok("microsoft-store") {
        println!("cargo:rustc-cfg=lmvs_microsoft_store");
    }
    tauri_build::build()
}
