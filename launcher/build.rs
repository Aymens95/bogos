fn main() {
    if cfg!(target_os = "windows") {
        let mut res = winresource::WindowsResource::new();
        res.set_icon("assets/bot-launcher.ico");
        res.set("FileDescription", "Discord Music Bot Launcher");
        res.set("ProductName", "Discord Music Bot");
        res.set("OriginalFilename", "Discord Music Bot Launcher.exe");
        res.compile().expect("failed to compile Windows resources");
    }
}
