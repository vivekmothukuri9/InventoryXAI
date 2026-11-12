Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot "build"
if (!(Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
}

$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background rect
$rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
$c1 = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)
$c2 = [System.Drawing.Color]::FromArgb(255, 30, 27, 75)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
$g.FillRectangle($brush, $rect)

# Cyan/Indigo rings
$cCircle = [System.Drawing.Color]::FromArgb(180, 99, 102, 241)
$pCircle = New-Object System.Drawing.Pen($cCircle, 8)
$g.DrawEllipse($pCircle, 24, 24, 208, 208)

$cA = [System.Drawing.Color]::FromArgb(220, 6, 182, 212)
$pA = New-Object System.Drawing.Pen($cA, 4)
$g.DrawEllipse($pA, 36, 36, 184, 184)

# Text 'IX'
$font = New-Object System.Drawing.Font("Segoe UI", 66, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("IX", $font, $textBrush, 128, 115, $sf)

# Text 'AI' badge
$fontSub = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
$aiBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 56, 189, 248))
$g.DrawString("AI", $fontSub, $aiBrush, 128, 188, $sf)

$pngPath = Join-Path $dir "icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$icoPath = Join-Path $dir "icon.ico"
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp.Dispose()
$g.Dispose()

Write-Output "SUCCESS: Icon files generated at $dir"

