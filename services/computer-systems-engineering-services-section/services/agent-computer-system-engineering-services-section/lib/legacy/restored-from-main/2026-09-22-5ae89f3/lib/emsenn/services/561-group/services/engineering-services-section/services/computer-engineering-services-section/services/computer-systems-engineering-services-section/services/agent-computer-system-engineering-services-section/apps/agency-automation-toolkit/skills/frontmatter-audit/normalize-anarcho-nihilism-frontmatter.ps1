param(
    [string]$Root = "library/domains/humanities/domains/sociology/domains/critical-theory/domains/anarchism/domains/anarcho-nihilism"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path -LiteralPath $Root).ProviderPath

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

function Rewrite-Frontmatter {
    param([string[]]$Frontmatter)

    $newLines = [System.Collections.Generic.List[string]]::new()
    $skipMode = ""

    for ($i = 0; $i -lt $Frontmatter.Count; $i++) {
        $line = $Frontmatter[$i]

        if ($skipMode -eq "cites") {
            if ($line -match '^\s+-\s+') {
                continue
            }
            $skipMode = ""
        }

        if ($line -match '^part-of:\s*') {
            continue
        }

        if ($line -match '^references:\s*$') {
            $newLines.Add("citations:")
            continue
        }

        if ($line -match '^cites:\s*$') {
            $skipMode = "cites"
            continue
        }

        $newLines.Add($line)
    }

    return (Normalize-FrontmatterSpacing -Lines $newLines.ToArray())
}

$files = Get-ChildItem -LiteralPath $rootPath -Recurse -Filter *.md -File

foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName
    $split = Split-Frontmatter -Lines $content
    if (-not $split) {
        continue
    }

    $rewritten = Rewrite-Frontmatter -Frontmatter $split.Frontmatter
    $output = @("---") + $rewritten + @("---") + $split.Body

    if (Compare-Object -ReferenceObject $content -DifferenceObject $output -SyncWindow 0) {
        Set-Content -LiteralPath $file.FullName -Value $output
    }
}
