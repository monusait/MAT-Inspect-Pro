$machines = @(
    @("eq-c1", "Overhead Crane Alpha"),
    @("eq-c2", "Overhead Crane Beta"),
    @("eq-c3", "Overhead Crane Gamma"),
    @("eq-c4", "Overhead Crane Delta"),
    @("eq-f1", "Forklift Heavy H1"),
    @("eq-f2", "Forklift Agile F2"),
    @("eq-f3", "Forklift Reach R1"),
    @("eq-t1", "Transport Truck T1"),
    @("eq-t2", "Transport Truck T2"),
    @("eq-p1", "Electric Pallet Jack")
)

$outDir = "e:\Capstone\digital-inspection-app\qr-codes"
if (Test-Path $outDir) {
    Remove-Item -Path "$outDir\*" -Force -Recurse
} else {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

foreach ($m in $machines) {
    $id = $m[0]
    # Keep the payload extremely precise and machine-readable
    $jsonStr = "{`"id`":`"$id`"}"
    $encodedUrl = [System.Uri]::EscapeDataString($jsonStr)
    $name = $m[1] -replace '\s+', '_'
    
    $url = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=$encodedUrl"
    $outFile = "$outDir\${id}_${name}.png"
    Invoke-WebRequest -Uri $url -OutFile $outFile
}
Write-Output "Successfully deleted old specific codes and generated uniquely precise JSON QR codes."
