#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

use std::env;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

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

fn command_exists(name: &str) -> bool {
    Command::new("where")
        .arg(name)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn run_gui(root: &Path) -> Result<i32, String> {
    let script = root.join("launcher").join("bogos-control-panel.ps1");
    if !script.exists() {
        return Err(format!("Missing launcher GUI script: {}", script.display()));
    }

    let shell = if command_exists("pwsh") {
        "pwsh"
    } else if command_exists("powershell") {
        "powershell"
    } else {
        return Err("PowerShell was not found in PATH.".to_string());
    };

    let mut command = Command::new(shell);
    command
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-File"])
        .arg(&script)
        .arg("-ProjectRoot")
        .arg(root);

    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);

    let status = command
        .status()
        .map_err(|error| format!("Failed to open Bogos control panel: {error}"))?;

    Ok(status.code().unwrap_or(1))
}

fn show_error(message: &str) {
    let escaped = message.replace('\'', "''");
    let script = format!(
        "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('{escaped}', 'Bogos Launcher', 'OK', 'Error') | Out-Null"
    );

    let _ = Command::new("powershell")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
        .status();
}

fn main() {
    match find_project_root().and_then(|root| run_gui(&root)) {
        Ok(code) => std::process::exit(code),
        Err(message) => {
            show_error(&message);
            std::process::exit(1);
        }
    }
}
