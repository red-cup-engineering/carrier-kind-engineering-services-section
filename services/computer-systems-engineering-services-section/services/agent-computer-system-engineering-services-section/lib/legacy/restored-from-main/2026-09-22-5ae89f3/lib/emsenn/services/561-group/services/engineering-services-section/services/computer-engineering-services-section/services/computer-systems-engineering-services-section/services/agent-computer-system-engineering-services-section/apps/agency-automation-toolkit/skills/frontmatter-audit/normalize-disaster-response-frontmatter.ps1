param(
    [string]$Root = "library/domains/humanities/domains/sociology/domains/critical-theory/domains/anarchism/domains/disaster-response"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path -LiteralPath $Root).ProviderPath
$textDir = Join-Path $rootPath "texts"
$termDir = Join-Path $rootPath "terms"

$dropStudyValues = @("history", "methods")

function Split-Frontmatter {
    param([string[]]$Lines)

    if ($Lines.Count -lt 3 -or $Lines[0] -ne "---") {
        return $null
    }

    for ($i = 1; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -eq "---") {
            return [pscustomobject]@{
                Frontmatter = if ($i -gt 1) { $Lines[1..($i - 1)] } else { @() }
                Body        = if ($i + 1 -lt $Lines.Count) { $Lines[($i + 1)..($Lines.Count - 1)] } else { @() }
            }
        }
    }

    return $null
}

function Rewrite-Frontmatter {
    param(
        [string[]]$Frontmatter,
        [bool]$IsTextFile
    )

    $newLines = [System.Collections.Generic.List[string]]::new()
    $partOfValues = [System.Collections.Generic.List[string]]::new()
    $skipMode = ""
    for ($i = 0; $i -lt $Frontmatter.Count; $i++) {
        $line = $Frontmatter[$i]

        if ($skipMode -eq "part-of") {
            if ($line -match '^\s+-\s+(.+)$') {
                $partOfValues.Add($Matches[1].Trim())
                continue
            }
            $skipMode = ""
        }

        if ($skipMode -eq "cites") {
            if ($line -match '^\s+-\s+') {
                continue
            }
            $skipMode = ""
        }

        if ($line -match '^part-of:\s*$') {
            $skipMode = "part-of"
            continue
        }

        if ($line -match '^cites:\s*$') {
            $skipMode = "cites"
            continue
        }

        if ($line -match '^references:\s*$') {
            $newLines.Add("citations:")
            continue
        }

        $newLines.Add($line)
    }

    while ($newLines.Count -gt 0 -and [string]::IsNullOrWhiteSpace($newLines[0])) {
        $newLines.RemoveAt(0)
    }

    while ($newLines.Count -gt 0 -and [string]::IsNullOrWhiteSpace($newLines[$newLines.Count - 1])) {
        $newLines.RemoveAt($newLines.Count - 1)
    }

    if ($IsTextFile) {
        $meaningfulStudies = @()
        foreach ($value in $partOfValues) {
            if ($dropStudyValues -contains $value) {
                continue
            }
            $meaningfulStudies += $value
        }

        if ($meaningfulStudies.Count -gt 0) {
            $prefix = [System.Collections.Generic.List[string]]::new()
            $prefix.Add("studies:")
            foreach ($value in $meaningfulStudies) {
                $prefix.Add("  - $value")
            }
            $prefix.Add("")
            foreach ($line in $newLines) {
                $prefix.Add($line)
            }
            return $prefix.ToArray()
        }
    }

    return $newLines.ToArray()
}

function Normalize-FrontmatterSpacing {
    param([string[]]$Lines)

    $clean = [System.Collections.Generic.List[string]]::new()
    $previousBlank = $false

    foreach ($line in $Lines) {
        $isBlank = [string]::IsNullOrWhiteSpace($line)
        if ($clean.Count -eq 0 -and $isBlank) {
            continue
        }
        if ($isBlank -and $previousBlank) {
            continue
        }
        $clean.Add($line)
        $previousBlank = $isBlank
    }

    while ($clean.Count -gt 0 -and [string]::IsNullOrWhiteSpace($clean[$clean.Count - 1])) {
        $clean.RemoveAt($clean.Count - 1)
    }

    return $clean.ToArray()
}

$files = Get-ChildItem -LiteralPath $rootPath -Recurse -Filter *.md -File

foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName
    $split = Split-Frontmatter -Lines $content
    if (-not $split) {
        continue
    }

    $isTextFile = $file.DirectoryName -eq $textDir
    $isTermFile = $file.DirectoryName -eq $termDir
    if (-not ($isTextFile -or $isTermFile)) {
        continue
    }

    $rewritten = Rewrite-Frontmatter -Frontmatter $split.Frontmatter -IsTextFile:$isTextFile
    $frontmatterOutput = Normalize-FrontmatterSpacing -Lines $rewritten
    $output = @("---") + $frontmatterOutput + @("---") + $split.Body
    Set-Content -LiteralPath $file.FullName -Value $output
}
