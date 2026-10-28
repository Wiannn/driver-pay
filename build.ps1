# 打包：把 src.html 引用的 css/js 全部内联，生成单文件的 司机工资结算.html（部署用）
# 日常开发编辑 src.html、pages/、js/、css/，改完运行本脚本再提交
$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)
$dir = 'e:\WorkSpace\Driver Pay'

$src = [System.IO.File]::ReadAllText("$dir\src.html")

# <link rel="stylesheet" href="..."> → 内联 <style>
$out = [regex]::Replace($src, '<link rel="stylesheet" href="([^"]+)">', {
  param($m)
  $file = Join-Path $dir $m.Groups[1].Value
  "<style>`n/* ===== " + $m.Groups[1].Value + " ===== */`n" + ([System.IO.File]::ReadAllText($file)).Trim() + "`n</style>"
}.GetNewClosure())

# <script src="..."></script> → 内联 <script>
$out = [regex]::Replace($out, '<script src="([^"]+)"></script>', {
  param($m)
  $file = Join-Path $dir $m.Groups[1].Value
  "<script>`n/* ===== " + $m.Groups[1].Value + " ===== */`n" + ([System.IO.File]::ReadAllText($file)).TrimEnd() + "`n</script>"
}.GetNewClosure())

$banner = '<!-- 本文件由 build.ps1 自动生成，请勿直接编辑。改代码请编辑 src.html、pages/、js/、css/ 后重新运行 build.ps1 -->'
$out = $out -replace '<!DOCTYPE html>', ('<!DOCTYPE html>' + "`r`n" + $banner)

[System.IO.File]::WriteAllText("$dir\司机工资结算.html", $out, $enc)
Write-Host ('built 司机工资结算.html: ' + [math]::Round($out.Length / 1KB, 1) + ' KB')
