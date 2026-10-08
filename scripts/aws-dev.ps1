param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Identity', 'BootstrapStatus', 'Diff')]
    [string]$Action,
    [ValidatePattern('^\d{12}$')]
    [string]$ExpectedAccountId,
    [string]$HostedOrigin
)
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$env:AWS_PROFILE = 'waste2watt-dev'
# Prevent environment credentials or role overrides from bypassing the selected profile.
foreach ($credentialVariable in @('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_SECURITY_TOKEN', 'AWS_ROLE_ARN', 'AWS_WEB_IDENTITY_TOKEN_FILE')) {
    Remove-Item -LiteralPath "Env:$credentialVariable" -ErrorAction SilentlyContinue
}
$env:AWS_DEFAULT_REGION = 'us-east-1'
$env:AWS_REGION = 'us-east-1'
$env:AWS_EC2_METADATA_DISABLED = 'true'
$env:AWS_PAGER = ''
$env:CDK_HOME = Join-Path $projectDirectory 'infra/.cdk'
$env:CDK_DISABLE_VERSION_CHECK = '1'

# Never print caller ARN/account or read/write credential files.
$identityText = & aws sts get-caller-identity --profile waste2watt-dev --region us-east-1 --output json
if ($LASTEXITCODE -ne 0) { throw 'STS verification failed; no further action taken.' }
$deploymentIdentity = $identityText | ConvertFrom-Json
if ($deploymentIdentity.Arn -match ':root$') { throw 'Root credentials are forbidden; no further action taken.' }
if ($deploymentIdentity.Arn -cne 'arn:aws:iam::415150458314:user/waste2watt-developer') {
    throw 'Only the intended waste2watt-developer IAM user is permitted; no further action taken.'
}
if ($deploymentIdentity.Account -notmatch '^\d{12}$') { throw 'Invalid STS account.' }
if ($deploymentIdentity.Account -ne '415150458314') {
    throw 'Only the new deployment account is permitted; no further action taken.'
}
if ($ExpectedAccountId -and $deploymentIdentity.Account -ne $ExpectedAccountId) {
    throw 'Unexpected account; no further action taken.'
}
if ($Action -eq 'Identity') {
    Write-Output 'Intended waste2watt-dev IAM user verified for us-east-1; STS does not establish MFA.'
    return
}
if (!$ExpectedAccountId) { throw 'Supply the intended ExpectedAccountId privately before inspecting or changing AWS stacks.' }
if ($Action -eq 'BootstrapStatus') {
    & aws cloudformation describe-stacks --stack-name CDKToolkit --profile waste2watt-dev --region us-east-1 --query 'Stacks[0].{Status:StackStatus,Version:Outputs[?OutputKey==`BootstrapVersion`].OutputValue}' --output json
    if ($LASTEXITCODE -ne 0) { throw 'Bootstrap inspection failed. Distinguish not-found from access/network errors.' }
    return
}
if ($HostedOrigin) {
    $originUri = [Uri]$HostedOrigin
    if ($originUri.Scheme -ne 'https' -or $originUri.GetLeftPart([UriPartial]::Authority) -cne $HostedOrigin -or $originUri.UserInfo) {
        throw 'HostedOrigin must be an exact HTTPS origin with no path, credentials or trailing slash.'
    }
}
$stackNames = @('Waste2WattDataStack-dev', 'Waste2WattAuthStack-dev', 'Waste2WattApiStack-dev', 'Waste2WattPipelineStack-dev', 'Waste2WattObservabilityStack-dev')
$cdkArguments = @('diff') + $stackNames + @('--method', 'template', '--profile', 'waste2watt-dev', '--lookups', 'false', '-c', 'stage=dev', '-c', 'region=us-east-1', '-c', 'frontendOrigin=http://localhost:5173')
$origins = @('http://localhost:5173')
if ($HostedOrigin) { $origins += $HostedOrigin }
$env:W2W_FRONTEND_ORIGINS = ConvertTo-Json -InputObject $origins -Compress
Push-Location (Join-Path $projectDirectory 'infra')
try {
    # Windows PowerShell treats native stderr diagnostics as errors when redirected.
    # CDK writes informational messages there; its exit code determines success.
    $ErrorActionPreference = 'Continue'
    & (Join-Path $projectDirectory 'node_modules/.bin/cdk.cmd') @cdkArguments
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) { throw "CDK $Action failed." }
} finally {
    $ErrorActionPreference = 'Stop'
    Pop-Location
}
