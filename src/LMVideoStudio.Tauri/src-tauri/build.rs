fn main() {
    println!("cargo::rustc-check-cfg=cfg(lmvs_microsoft_store)");

    if std::env::var("LMVS_BUILD_FLAVOR").as_deref() == Ok("microsoft-store") {
        println!("cargo:rustc-cfg=lmvs_microsoft_store");
    }
    tauri_build::build()
}
