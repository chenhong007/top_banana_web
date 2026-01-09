# Import prompts_data.json to remote backend
# PowerShell version
# v2.0: Optimized for R2 upload stability (reduced batch size, increased delays)

$API_BASE_URL = "https://topai.ink"
$IMPORT_SECRET = "my-super-secret-key-2024"
$BATCH_SIZE = 15  # Reduced from 30 to 15 to avoid rate limiting
$START_FROM_BATCH = 0  # Start from beginning, duplicates will be skipped
$SKIP_R2 = $false  # Set to $true to skip R2 upload
$BATCH_DELAY_SECONDS = 5  # Increased delay between batches (was 2s)

# Load JSON data
$jsonPath = Join-Path $PSScriptRoot "..\data\prompts_data.json"
Write-Host "Loading data from: $jsonPath"
$rawData = Get-Content -Path $jsonPath -Raw -Encoding UTF8
$data = $rawData | ConvertFrom-Json

$items = $data.prompts
Write-Host "Loaded $($items.Count) items"

# Transform items
$transformedItems = [System.Collections.ArrayList]@()
foreach ($item in $items) {
    if (-not $item.title -or -not $item.prompt) {
        continue
    }
    
    $imageUrls = @()
    if ($item.imageUrls) {
        $imageUrls = @($item.imageUrls | Where-Object { $_ })
    } elseif ($item.imageUrl) {
        $imageUrls = @($item.imageUrl)
    }
    
    $transformed = [ordered]@{
        title = $item.title
        prompt = $item.prompt
        description = if ($item.description) { $item.description } else { "" }
        source = if ($item.source) { $item.source } else { "unknown" }
        tags = if ($item.tags) { @($item.tags) } else { @() }
        modelTags = @("banana")
        category = [char]::ConvertFromUtf32(0x6587) + [char]::ConvertFromUtf32(0x751F) + [char]::ConvertFromUtf32(0x56FE)
        createdAt = $item.updateDate
    }
    
    if ($imageUrls.Count -gt 0) {
        $transformed.imageUrl = $imageUrls[0]
        $transformed.imageUrls = $imageUrls
    }
    
    [void]$transformedItems.Add($transformed)
}

Write-Host "Valid items: $($transformedItems.Count)"

# Create batches
$batches = [System.Collections.ArrayList]@()
for ($i = 0; $i -lt $transformedItems.Count; $i += $BATCH_SIZE) {
    $endIndex = [Math]::Min($i + $BATCH_SIZE, $transformedItems.Count)
    $batchItems = $transformedItems[$i..($endIndex-1)]
    [void]$batches.Add($batchItems)
}

Write-Host "Created $($batches.Count) batches"
Write-Host ""

# Import batches
$totalSuccess = 0
$totalFailed = 0
$totalSkipped = 0
$startTime = Get-Date

# Calculate actual start index based on items processed
$skipItems = ($START_FROM_BATCH - 1) * 30  # Previous batch size was 30
$actualStartBatch = [Math]::Floor($skipItems / $BATCH_SIZE)
Write-Host "Skipping first $skipItems items (starting from batch $($actualStartBatch + 1))"

for ($batchIndex = $actualStartBatch; $batchIndex -lt $batches.Count; $batchIndex++) {
    $batch = $batches[$batchIndex]
    Write-Host "Batch $($batchIndex + 1)/$($batches.Count): Importing $($batch.Count) items..."
    
    $requestBody = @{
        secret = $IMPORT_SECRET
        items = @($batch)
        mode = "merge"
        fastMode = $true
        skipR2 = $SKIP_R2
    }
    
    $body = $requestBody | ConvertTo-Json -Depth 10 -Compress
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE_URL/api/import" -Method POST -Headers @{'Content-Type'='application/json; charset=utf-8'} -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 300
        
        if ($response.success) {
            $d = $response.data
            Write-Host "  OK: $($d.imported) imported, $($d.skipped) skipped, $($d.failed) failed"
            if ($d.imageUpload) {
                Write-Host "  R2: $($d.imageUpload.uploaded) uploaded, $($d.imageUpload.failed) failed"
            }
            $totalSuccess += $d.imported
            $totalSkipped += $d.skipped
            $totalFailed += $d.failed
        } else {
            Write-Host "  Error: $($response.error)"
            $totalFailed += $batch.Count
        }
    } catch {
        Write-Host "  Network error: $($_.Exception.Message)"
        $totalFailed += $batch.Count
    }
    
    if ($batchIndex -lt $batches.Count - 1) {
        Write-Host "  Waiting ${BATCH_DELAY_SECONDS}s before next batch..."
        Start-Sleep -Seconds $BATCH_DELAY_SECONDS
    }
}

$duration = ((Get-Date) - $startTime).TotalSeconds

Write-Host ""
Write-Host "========================================"
Write-Host "Import Complete!"
Write-Host "========================================"
Write-Host "Total: $($transformedItems.Count)"
Write-Host "Success: $totalSuccess"
Write-Host "Skipped: $totalSkipped"
Write-Host "Failed: $totalFailed"
Write-Host "Duration: $([Math]::Round($duration, 1))s"
Write-Host "========================================"
