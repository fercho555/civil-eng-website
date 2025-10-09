function Decode-Jwt {
    param([string]$Token)

    # Split JWT into parts
    $parts = $Token -split '\.'
    if ($parts.Length -ne 3) {
        Write-Error "Invalid JWT format"
        return $null
    }

    # Function to fix base64 padding and decode JSON
    function Decode-Part($part) {
        $padded = $part.PadRight($part.Length + (4 - $part.Length % 4) % 4, '=')
        $decodedBytes = [Convert]::FromBase64String($padded.Replace('-', '+').Replace('_', '/'))
        $decodedString = [Text.Encoding]::UTF8.GetString($decodedBytes)
        return $decodedString | ConvertFrom-Json
    }

    # Decode payload part
    $payload = Decode-Part $parts[1]
    return $payload
}

function Check-TokenExpiry {
    param([string]$Token)

    $payload = Decode-Jwt $Token
    if (-not $payload) {
        Write-Error "Failed to decode token"
        return $false
    }

    if (-not $payload.exp) {
        Write-Warning "Token has no expiry field"
        return $true
    }

    $expirationUnix = [int64]$payload.exp
    $currentUnix = [int64][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

    if ($currentUnix -lt $expirationUnix) {
        $timeLeft = $expirationUnix - $currentUnix
        Write-Host "Token is valid for $timeLeft seconds"
        return $true
    }
    else {
        Write-Warning "Token has expired"
        return $false
    }
}

# Login and get token
$response = Invoke-RestMethod -Uri "http://localhost:5000/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{username="temp_acc";password="temp4321"} | ConvertTo-Json)

$token = $response.token

Write-Host "Token extracted: $token"

# Check token expiry
if (Check-TokenExpiry $token) {
    $headers = @{
        Authorization = "Bearer $token"
    }

    $result = Invoke-RestMethod -Uri "http://localhost:5000/api/user/profile" -Headers $headers -Method GET
    Write-Host "API Response:" ($result | ConvertTo-Json -Depth 10)
}
else {
    Write-Warning "Please login again to obtain a new token"
}
