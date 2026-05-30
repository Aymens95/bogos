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

fn find_powershell() -> Option<String> {
    let candidates = [
        (
            "pwsh",
            &[r"C:\Program Files\PowerShell\7\pwsh.exe"] as &[&str],
        ),
        (
            "powershell",
            &[
                r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
                r"C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe",
            ] as &[&str],
        ),
    ];

    for (name, fallback_paths) in candidates {
        if command_exists(name) {
            return Some(name.to_string());
        }

        for fallback_path in fallback_paths {
            if Path::new(fallback_path).exists() {
                return Some((*fallback_path).to_string());
            }
        }
    }

    None
}

fn run_gui(root: &Path) -> Result<i32, String> {
    let script = root.join("launcher").join("bogos-control-panel.ps1");
    if !script.exists() {
        return Err(format!("Missing launcher GUI script: {}", script.display()));
    }

    let shell = find_powershell()
        .ok_or_else(|| "PowerShell was not found. Install PowerShell and try again.".to_string())?;

    let mut command = Command::new(&shell);
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

    let shell = find_powershell().unwrap_or_else(|| {
        r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe".to_string()
    });

    let _ = Command::new(shell)
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
