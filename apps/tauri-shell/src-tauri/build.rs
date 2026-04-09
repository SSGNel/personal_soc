fn main() {
    tauri_build::build();

    // Read GROQ_API_KEY from .env file next to this build.rs and bake it into the binary.
    // The .env file is gitignored so the key is never committed.
    let env_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".env");
    if let Ok(contents) = std::fs::read_to_string(&env_path) {
        for line in contents.lines() {
            let line = line.trim();
            if line.starts_with('#') || line.is_empty() { continue; }
            if let Some(val) = line.strip_prefix("GROQ_API_KEY=") {
                println!("cargo:rustc-env=GROQ_API_KEY={}", val.trim());
            }
        }
    }

    // Re-run if the .env file changes
    println!("cargo:rerun-if-changed=.env");
}
