$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$env:PIP_CACHE_DIR = Join-Path $root '.tmp/pip-cache'
$env:TMP = Join-Path $root '.tmp/analysis-build'
$env:TEMP = $env:TMP
New-Item -ItemType Directory -Path $env:TMP -Force | Out-Null
$target = Join-Path $root 'infra/.analysis-package'
New-Item -ItemType Directory -Path $target -Force | Out-Null
Push-Location $root
try {
    & node scripts/export-analysis-schema.ts
    if ($LASTEXITCODE -ne 0) { throw 'Schema export failed' }
    # Resolve for Lambda's Python 3.12, independent of this Windows host's Python version.
    # --ignore-installed prevents host site packages from satisfying target dependencies.
    & python -m pip install --platform manylinux2014_x86_64 --platform manylinux_2_28_x86_64 --python-version 3.12 --implementation cp --only-binary=:all: --no-compile --upgrade --ignore-installed --target $target -r services/analysis/requirements.txt --disable-pip-version-check
    if ($LASTEXITCODE -ne 0) { throw 'Linux dependency packaging failed' }
    if (!(Test-Path -LiteralPath (Join-Path $target 'typing_extensions.py'))) {
        throw 'Linux package is missing typing_extensions required by referencing on Python 3.12'
    }
    Copy-Item -LiteralPath "$root/services/analysis/src/waste2watt_analysis" -Destination $target -Recurse -Force
} finally { Pop-Location }
