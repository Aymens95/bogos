param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,

    [switch]$SmokeTest
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$LauncherDir = Join-Path $ProjectRoot "launcher"
$LogDir = Join-Path $ProjectRoot "logs"
$LogFile = Join-Path $LogDir "bogos-launcher.log"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$script:botProcess = $null
$script:taskProcess = $null
$script:status = "Stopped"
$script:userStopping = $false
$script:autoRestart = $false
$script:restartTimes = New-Object System.Collections.Generic.List[datetime]
$script:botLogFile = Join-Path $LogDir "bogos-bot.log"
$script:taskLogFile = Join-Path $LogDir "bogos-task.log"
$script:botLogPosition = 0
$script:taskLogPosition = 0

function Invoke-Ui {
    param([scriptblock]$Block)

    if ($form.IsHandleCreated -and $form.InvokeRequired) {
        $form.BeginInvoke([Action]$Block) | Out-Null
    } else {
        & $Block
    }
}

function Set-ControlState {
    $running = $null -ne $script:botProcess -and -not $script:botProcess.HasExited
    $busy = $null -ne $script:taskProcess -and -not $script:taskProcess.HasExited

    $startButton.Enabled = -not $running -and -not $busy
    $stopButton.Enabled = $running
    $restartButton.Enabled = -not $busy
    $deployButton.Enabled = -not $busy -and $script:status -notin @("Starting", "Stopping")
    $checkButton.Enabled = -not $busy -and $script:status -notin @("Starting", "Stopping")
}

function Set-LauncherStatus {
    param([string]$Value)

    $script:status = $Value
    $statusLabel.Text = "Status: $Value"

    switch ($Value) {
        "Running" { $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(16, 124, 16) }
        "Crashed" { $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(196, 43, 28) }
        "Starting" { $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(0, 120, 212) }
        "Stopping" { $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(160, 92, 0) }
        default { $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(75, 85, 99) }
    }

    Set-ControlState
}

function Write-Log {
    param([string]$Message)

    if ([string]::IsNullOrWhiteSpace($Message)) {
        return
    }

    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -LiteralPath $LogFile -Value $line

    Invoke-Ui {
        $logBox.AppendText("$line`r`n")
        $logBox.SelectionStart = $logBox.TextLength
        $logBox.ScrollToCaret()
    }.GetNewClosure()
}

function Read-NewLogLines {
    param(
        [string]$Label,
        [string]$Path,
        [ref]$Position,
        [switch]$IsBot
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    try {
        $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        try {
            if ($Position.Value -gt $stream.Length) {
                $Position.Value = 0
            }

            $stream.Seek($Position.Value, [System.IO.SeekOrigin]::Begin) | Out-Null
            $reader = New-Object System.IO.StreamReader($stream)
            $text = $reader.ReadToEnd()
            $Position.Value = $stream.Position
        } finally {
            $stream.Dispose()
        }

        foreach ($line in ($text -split "`r?`n")) {
            if ([string]::IsNullOrWhiteSpace($line)) {
                continue
            }

            if ($IsBot -and $line -match "Logged in as|INFO Logged in") {
                Set-LauncherStatus "Running"
            }

            Write-Log "$Label | $line"
        }
    } catch {
        Write-Log "Could not read $Label log: $($_.Exception.Message)"
    }
}

function Test-BotLogIndicatesRunning {
    if (-not (Test-Path -LiteralPath $script:botLogFile)) {
        return $false
    }

    try {
        return $null -ne (Select-String -LiteralPath $script:botLogFile -Pattern "Logged in as|INFO Logged in" -Quiet)
    } catch {
        return $false
    }
}

function Update-Processes {
    Read-NewLogLines "bot" $script:botLogFile ([ref]$script:botLogPosition) -IsBot
    Read-NewLogLines "task" $script:taskLogFile ([ref]$script:taskLogPosition)

    if ($script:status -eq "Starting" -and $null -ne $script:botProcess -and -not $script:botProcess.HasExited -and (Test-BotLogIndicatesRunning)) {
        Set-LauncherStatus "Running"
    }

    if ($null -ne $script:botProcess -and $script:botProcess.HasExited) {
        $exitCode = $script:botProcess.ExitCode
        $wasUserStop = $script:userStopping
        $script:botProcess = $null

        if ($wasUserStop -or $exitCode -eq 0) {
            Write-Log "Bogos stopped with exit code $exitCode."
            Set-LauncherStatus "Stopped"
        } else {
            Write-Log "Bogos crashed with exit code $exitCode."
            Set-LauncherStatus "Crashed"
            Invoke-AutoRestart
        }
    }

    if ($null -ne $script:taskProcess -and $script:taskProcess.HasExited) {
        $exitCode = $script:taskProcess.ExitCode
        Write-Log "Task finished with exit code $exitCode."
        $script:taskProcess = $null
        Set-ControlState
    }
}

function Test-CommandAvailable {
    param([string]$Name)

    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-VersionCheck {
    param(
        [string]$Name,
        [string]$Command,
        [string[]]$Arguments
    )

    if (-not (Test-CommandAvailable $Command)) {
        return "$Name`: missing"
    }

    try {
        $output = & $Command @Arguments 2>&1 | Select-Object -First 1
        return "$Name`: $output"
    } catch {
        return "$Name`: failed ($($_.Exception.Message))"
    }
}

function Update-DependencyChecks {
    $checks = @(
        Invoke-VersionCheck "Node" "node" @("-v")
        Invoke-VersionCheck "npm" "npm" @("-v")
        Invoke-VersionCheck "FFmpeg" "ffmpeg" @("-version")
        Invoke-VersionCheck "yt-dlp" "yt-dlp" @("--version")
        ".env: $(if (Test-Path -LiteralPath (Join-Path $ProjectRoot ".env")) { "present" } else { "missing" })"
        "node_modules: $(if (Test-Path -LiteralPath (Join-Path $ProjectRoot "node_modules")) { "present" } else { "missing" })"
        "package.json: $(if (Test-Path -LiteralPath (Join-Path $ProjectRoot "package.json")) { "present" } else { "missing" })"
        "src/index.js: $(if (Test-Path -LiteralPath (Join-Path $ProjectRoot "src/index.js")) { "present" } else { "missing" })"
    )

    $dependencyBox.Text = ($checks -join "`r`n")
}

function New-ManagedProcess {
    param(
        [string]$CommandLine,
        [string]$OutputPath
    )

    Set-Content -LiteralPath $OutputPath -Value ""

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo.FileName = "cmd.exe"
    $escapedOutputPath = $OutputPath.Replace('"', '""')
    $process.StartInfo.Arguments = "/D /S /C ""$CommandLine >> ""$escapedOutputPath"" 2>>&1"""
    $process.StartInfo.WorkingDirectory = $ProjectRoot
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.RedirectStandardOutput = $false
    $process.StartInfo.RedirectStandardError = $false
    $process.StartInfo.CreateNoWindow = $true

    if (-not $process.Start()) {
        throw "Failed to start $CommandLine"
    }

    return $process
}

function Invoke-AutoRestart {
    if (-not $script:autoRestart) {
        return
    }

    $now = Get-Date
    $recent = @($script:restartTimes | Where-Object { ($now - $_).TotalMinutes -lt 5 })
    $script:restartTimes.Clear()
    foreach ($time in $recent) {
        $script:restartTimes.Add($time)
    }

    if ($script:restartTimes.Count -ge 5) {
        $script:autoRestart = $false
        $autoRestartCheck.Checked = $false
        Write-Log "Auto-restart disabled after 5 crashes in 5 minutes."
        return
    }

    $script:restartTimes.Add($now)
    Write-Log "Auto-restart scheduled in 5 seconds."

    $timer = New-Object System.Windows.Forms.Timer
    $timer.Interval = 5000
    $timer.Add_Tick({
        $this.Stop()
        $this.Dispose()
        if ($script:autoRestart -and ($null -eq $script:botProcess -or $script:botProcess.HasExited)) {
            Start-Bogos
        }
    })
    $timer.Start()
}

function Start-Bogos {
    if ($null -ne $script:botProcess -and -not $script:botProcess.HasExited) {
        Write-Log "Start ignored because Bogos is already running."
        return
    }

    $script:userStopping = $false
    Set-LauncherStatus "Starting"
    Write-Log "Starting Bogos with npm start."

    try {
        $script:botLogPosition = 0
        $script:botProcess = New-ManagedProcess "npm start" $script:botLogFile
    } catch {
        Write-Log "Failed to start Bogos: $($_.Exception.Message)"
        Set-LauncherStatus "Stopped"
    }
}

function Stop-Bogos {
    param([switch]$ForRestart)

    if ($null -eq $script:botProcess -or $script:botProcess.HasExited) {
        Set-LauncherStatus "Stopped"
        return
    }

    $script:userStopping = $true
    Set-LauncherStatus "Stopping"
    Write-Log "Stopping Bogos process tree."

    $rootPid = $script:botProcess.Id

    function Stop-Tree {
        param([int]$TargetPid)

        foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $TargetPid" -ErrorAction SilentlyContinue)) {
            Stop-Tree -TargetPid $child.ProcessId
        }

        Stop-Process -Id $TargetPid -Force -ErrorAction SilentlyContinue
    }

    Stop-Tree -TargetPid $rootPid

    if ($ForRestart) {
        $timer = New-Object System.Windows.Forms.Timer
        $timer.Interval = 700
        $timer.Add_Tick({
            if ($null -eq $script:botProcess -or $script:botProcess.HasExited) {
                $this.Stop()
                $this.Dispose()
                Start-Bogos
            }
        })
        $timer.Start()
    }
}

function Restart-Bogos {
    Write-Log "Restart requested."
    if ($null -ne $script:botProcess -and -not $script:botProcess.HasExited) {
        Stop-Bogos -ForRestart
    } else {
        Start-Bogos
    }
}

function Start-TaskCommand {
    param(
        [string]$Label,
        [string]$CommandLine
    )

    if ($null -ne $script:taskProcess -and -not $script:taskProcess.HasExited) {
        Write-Log "$Label ignored because another task is still running."
        return
    }

    Write-Log "Running $CommandLine."
    Set-ControlState

    try {
        $script:taskLogPosition = 0
        $script:taskProcess = New-ManagedProcess $CommandLine $script:taskLogFile
    } catch {
        Write-Log "$Label failed: $($_.Exception.Message)"
        $script:taskProcess = $null
        Set-ControlState
    }
}

function Open-Path {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        [System.Windows.Forms.MessageBox]::Show("Path not found:`r`n$Path", "Bogos Launcher", "OK", "Warning") | Out-Null
        return
    }

    Start-Process -FilePath $Path
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "Bogos Control Panel"
$form.StartPosition = "CenterScreen"
$form.Size = New-Object System.Drawing.Size(1080, 720)
$form.MinimumSize = New-Object System.Drawing.Size(960, 620)
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9)

$main = New-Object System.Windows.Forms.TableLayoutPanel
$main.Dock = "Fill"
$main.ColumnCount = 2
$main.RowCount = 1
$main.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Absolute, 280))) | Out-Null
$main.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle([System.Windows.Forms.SizeType]::Percent, 100))) | Out-Null
$form.Controls.Add($main)

$left = New-Object System.Windows.Forms.FlowLayoutPanel
$left.Dock = "Fill"
$left.FlowDirection = "TopDown"
$left.WrapContents = $false
$left.Padding = New-Object System.Windows.Forms.Padding(12)
$left.AutoScroll = $true
$main.Controls.Add($left, 0, 0)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Status: Stopped"
$statusLabel.AutoSize = $false
$statusLabel.Width = 240
$statusLabel.Height = 28
$statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$left.Controls.Add($statusLabel)

function New-Button {
    param([string]$Text)
    $button = New-Object System.Windows.Forms.Button
    $button.Text = $Text
    $button.Width = 240
    $button.Height = 34
    $button.Margin = New-Object System.Windows.Forms.Padding(0, 4, 0, 4)
    return $button
}

$startButton = New-Button "Start Bot"
$stopButton = New-Button "Stop Bot"
$restartButton = New-Button "Restart Bot"
$deployButton = New-Button "Deploy Commands"
$checkButton = New-Button "Run Check"
$clearButton = New-Button "Clear Logs"
$saveButton = New-Button "Save Logs"
$copyButton = New-Button "Copy Logs"

$autoRestartCheck = New-Object System.Windows.Forms.CheckBox
$autoRestartCheck.Text = "Auto-restart on crash"
$autoRestartCheck.Width = 240
$autoRestartCheck.Height = 28
$autoRestartCheck.Margin = New-Object System.Windows.Forms.Padding(0, 8, 0, 8)

foreach ($control in @($startButton, $stopButton, $restartButton, $deployButton, $checkButton, $autoRestartCheck, $clearButton, $saveButton, $copyButton)) {
    $left.Controls.Add($control)
}

$openLabel = New-Object System.Windows.Forms.Label
$openLabel.Text = "Open"
$openLabel.Width = 240
$openLabel.Height = 24
$openLabel.Margin = New-Object System.Windows.Forms.Padding(0, 12, 0, 0)
$openLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$left.Controls.Add($openLabel)

$openProjectButton = New-Button "Project Folder"
$openEnvButton = New-Button ".env"
$openDocsButton = New-Button "Docs"
foreach ($control in @($openProjectButton, $openEnvButton, $openDocsButton)) {
    $left.Controls.Add($control)
}

$right = New-Object System.Windows.Forms.TableLayoutPanel
$right.Dock = "Fill"
$right.RowCount = 2
$right.ColumnCount = 1
$right.Padding = New-Object System.Windows.Forms.Padding(0, 12, 12, 12)
$right.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 170))) | Out-Null
$right.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 100))) | Out-Null
$main.Controls.Add($right, 1, 0)

$dependencyBox = New-Object System.Windows.Forms.TextBox
$dependencyBox.Dock = "Fill"
$dependencyBox.Multiline = $true
$dependencyBox.ReadOnly = $true
$dependencyBox.ScrollBars = "Vertical"
$dependencyBox.BackColor = [System.Drawing.Color]::White
$right.Controls.Add($dependencyBox, 0, 0)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Dock = "Fill"
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.ScrollBars = "Both"
$logBox.WordWrap = $false
$logBox.BackColor = [System.Drawing.Color]::FromArgb(17, 24, 39)
$logBox.ForeColor = [System.Drawing.Color]::FromArgb(229, 231, 235)
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$right.Controls.Add($logBox, 0, 1)

$startButton.Add_Click({ Start-Bogos })
$stopButton.Add_Click({ Stop-Bogos })
$restartButton.Add_Click({ Restart-Bogos })
$deployButton.Add_Click({ Start-TaskCommand "deploy" "npm run deploy" })
$checkButton.Add_Click({ Start-TaskCommand "check" "npm run check" })
$autoRestartCheck.Add_CheckedChanged({ $script:autoRestart = $autoRestartCheck.Checked })
$clearButton.Add_Click({ $logBox.Clear() })
$copyButton.Add_Click({ if ($logBox.TextLength -gt 0) { [System.Windows.Forms.Clipboard]::SetText($logBox.Text) } })
$saveButton.Add_Click({
    $dialog = New-Object System.Windows.Forms.SaveFileDialog
    $dialog.Filter = "Log files (*.log)|*.log|Text files (*.txt)|*.txt|All files (*.*)|*.*"
    $dialog.FileName = "bogos-launcher.log"
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        Set-Content -LiteralPath $dialog.FileName -Value $logBox.Text
    }
})

$openProjectButton.Add_Click({ Open-Path $ProjectRoot })
$openEnvButton.Add_Click({ Open-Path (Join-Path $ProjectRoot ".env") })
$openDocsButton.Add_Click({ Open-Path (Join-Path $ProjectRoot "docs") })

$form.Add_FormClosing({
    if ($null -ne $script:botProcess -and -not $script:botProcess.HasExited) {
        $choice = [System.Windows.Forms.MessageBox]::Show(
            "Bogos is still running. Stop it before closing the control panel?",
            "Bogos Control Panel",
            [System.Windows.Forms.MessageBoxButtons]::YesNoCancel,
            [System.Windows.Forms.MessageBoxIcon]::Question
        )

        if ($choice -eq [System.Windows.Forms.DialogResult]::Cancel) {
            $_.Cancel = $true
            return
        }

        if ($choice -eq [System.Windows.Forms.DialogResult]::Yes) {
            Stop-Bogos
        }
    }
})

$processTimer = New-Object System.Windows.Forms.Timer
$processTimer.Interval = 250
$processTimer.Add_Tick({ Update-Processes })
$processTimer.Start()

Update-DependencyChecks
Set-LauncherStatus "Stopped"
Write-Log "Bogos control panel opened from $LauncherDir."

if ($SmokeTest) {
    "Bogos control panel smoke test OK"
    $form.Dispose()
    return
}

[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::Run($form)
