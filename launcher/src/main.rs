use std::env;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

fn find_project_root() -> Result<PathBuf, String> {
    let exe = env::current_exe().map_err(|error| format!("Could not locate launcher: {error}"))?;
    let exe_dir = exe
        .parent()
        .ok_or_else(|| "Could not locate launcher directory.".to_string())?;

    let candidates = [
        exe_dir.to_path_buf(),
        exe_dir.parent().unwrap_or(exe_dir).to_path_buf(),
    ];

    for candidate in candidates {
        if candidate.join("package.json").exists() && candidate.join("src").exists() {
            return Ok(candidate);
        }
    }

    Err("Could not find the Discord bot project next to the launcher.".to_string())
}

fn show_error(message: &str) {
    eprintln!("{message}");
    let _ = Command::new("cmd")
        .args(["/C", "pause"])
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status();
}

fn command_exists(name: &str) -> bool {
    Command::new("where")
        .arg(name)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn run_command(root: &Path, command: &str, args: &[&str]) -> Result<i32, String> {
    let mut cmd_args = vec!["/C", command];
    cmd_args.extend_from_slice(args);

    let status = Command::new("cmd")
        .args(cmd_args)
        .current_dir(root)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()
        .map_err(|error| format!("Failed to run {command}: {error}"))?;

    Ok(status.code().unwrap_or(1))
}

fn run_launcher(root: &Path) -> Result<i32, String> {
    if !command_exists("node") {
        return Err("Node.js was not found in PATH. Install Node.js 18 or newer, then try again.".to_string());
    }

    if !command_exists("npm") {
        return Err("npm was not found in PATH. Reinstall Node.js with npm enabled, then try again.".to_string());
    }

    if !root.join(".env").exists() {
        return Err("Missing .env file. Copy .env.example to .env and fill in your Discord and Spotify credentials.".to_string());
    }

    if !root.join("node_modules").exists() {
        println!("Installing dependencies...");
        let code = run_command(root, "npm", &["install"])?;
        if code != 0 {
            return Ok(code);
        }
    }

    println!("Starting Discord music bot...\n");
    run_command(root, "npm", &["start"])
}

fn main() {
    match find_project_root().and_then(|root| run_launcher(&root)) {
        Ok(code) => std::process::exit(code),
        Err(message) => {
            show_error(&message);
            std::process::exit(1);
        }
    }
}
