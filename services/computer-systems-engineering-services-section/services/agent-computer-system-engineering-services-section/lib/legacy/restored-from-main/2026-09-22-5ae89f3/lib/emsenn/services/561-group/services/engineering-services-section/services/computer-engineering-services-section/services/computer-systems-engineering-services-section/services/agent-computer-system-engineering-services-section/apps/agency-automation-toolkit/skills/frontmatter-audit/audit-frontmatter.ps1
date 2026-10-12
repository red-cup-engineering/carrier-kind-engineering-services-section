param(
    [string]$Root = "library",
    [ValidateSet("text", "json")]
    [string]$Format = "text",
    [switch]$SummaryOnly,
    [switch]$FailOnIssues
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-Issue {
    param(
        [string]$Path,
        [int]$Line,
        [string]$Kind,
        [string]$Key,
        [string]$Message,
        [string]$Suggestion
    )

    [pscustomobject]@{
        path       = $Path
        line       = $Line
        kind       = $Kind
        key        = $Key
        message    = $Message
        suggestion = $Suggestion
    }
}

function Get-FrontmatterBlock {
    param([string[]]$Lines)

    if ($Lines.Count -lt 3) {
        return $null
    }

    if ($Lines[0] -ne "---") {
        return $null
    }

    for ($i = 1; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -eq "---") {
            return [pscustomobject]@{
                Lines = $Lines[1..($i - 1)]
            }
        }
    }

    return $null
}

function Get-FrontmatterIssues {
    param(
        [string]$Path,
        [string[]]$FrontmatterLines
    )

    $issues = [System.Collections.Generic.List[object]]::new()
    $stack = [System.Collections.ArrayList]::new()
    $null = $stack.Add([pscustomobject]@{
        Indent = -1
        Path   = ""
        Keys   = @{}
    })

    $pending = $null
    $rootKeysSeen = @{}

    for ($i = 0; $i -lt $FrontmatterLines.Count; $i++) {
        $line = $FrontmatterLines[$i]

        if ($line -match '^\s*$' -or $line -match '^\s*#') {
            continue
        }

        $indent = ([regex]::Match($line, '^\s*').Value).Length

        if ($pending -and $indent -gt $pending.Indent -and $line -match '^\s*[A-Za-z0-9_][A-Za-z0-9_.-]*\s*:') {
            $null = $stack.Add([pscustomobject]@{
                Indent = $indent
                Path   = $pending.Path
                Keys   = @{}
            })
            $pending = $null
        } else {
            $pending = $null
        }

        while ($stack.Count -gt 1 -and $indent -lt $stack[$stack.Count - 1].Indent) {
            $stack.RemoveAt($stack.Count - 1)
        }

        if ($line -notmatch '^(?<space>\s*)(?<key>[A-Za-z0-9_][A-Za-z0-9_.-]*)\s*:(?<rest>.*)$') {
            continue
        }

        $key = $Matches["key"]
        $rest = $Matches["rest"]
        $context = $stack[$stack.Count - 1]
        $lineNumber = $i + 2

        if ($context.Keys.ContainsKey($key)) {
            $issues.Add((New-Issue `
                -Path $Path `
                -Line $lineNumber `
                -Kind "duplicate-key" `
                -Key $key `
                -Message "Duplicate YAML key '$key' in the same mapping." `
                -Suggestion "Keep one '$key' entry and use a single explicit predicate with a list value when multiple objects are intended."
            ))
        } else {
            $context.Keys[$key] = $lineNumber
        }

        if ($context.Path -eq "") {
            $rootKeysSeen[$key] = $lineNumber

            switch ($key) {
                "part-of" {
                    $issues.Add((New-Issue `
                        -Path $Path `
                        -Line $lineNumber `
                        -Kind "ambiguous-key" `
                        -Key $key `
                        -Message "Key '$key' is semantically overloaded and often only repeats path membership." `
                        -Suggestion "Replace it with a more explicit relation such as 'studies:' or drop it if the path already carries the meaning."
                    ))
                }
                "cites" {
                    $issues.Add((New-Issue `
                        -Path $Path `
                        -Line $lineNumber `
                        -Kind "legacy-citation-key" `
                        -Key $key `
                        -Message "Legacy citation usage key '$key' found." `
                        -Suggestion "Merge citation metadata into a single 'citations:' mapping."
                    ))
                }
                "references" {
                    $issues.Add((New-Issue `
                        -Path $Path `
                        -Line $lineNumber `
                        -Kind "legacy-citation-key" `
                        -Key $key `
                        -Message "Legacy citation metadata key '$key' found." `
                        -Suggestion "Rename '$key' to 'citations:' and drop the separate 'cites:' list."
                    ))
                }
            }
        }

        $nextPath = if ($context.Path) { "$($context.Path).$key" } else { $key }
        if ($rest.Trim() -eq "") {
            $pending = [pscustomobject]@{
                Indent = $indent
                Path   = $nextPath
            }
        }
    }

    if ($rootKeysSeen.ContainsKey("cites") -and $rootKeysSeen.ContainsKey("references")) {
        $issues.Add((New-Issue `
            -Path $Path `
            -Line $rootKeysSeen["cites"] `
            -Kind "split-citations" `
            -Key "cites/references" `
            -Message "Citation usage and citation metadata are split across 'cites' and 'references'." `
            -Suggestion "Normalize both into one 'citations:' mapping keyed by citation id."
        ))
    }

    return $issues
}

$rootPath = Resolve-Path -LiteralPath $Root
$rootLiteralPath = $rootPath.ProviderPath
$files = Get-ChildItem -LiteralPath $rootLiteralPath -Recurse -Filter *.md -File
$allIssues = [System.Collections.Generic.List[object]]::new()

foreach ($file in $files) {
    $lines = Get-Content -LiteralPath $file.FullName
    $frontmatter = Get-FrontmatterBlock -Lines $lines
    if (-not $frontmatter) {
        continue
    }

    $relativePath = $file.FullName.Substring($rootLiteralPath.Length).TrimStart('\', '/')
    foreach ($issue in (Get-FrontmatterIssues -Path $relativePath -FrontmatterLines $frontmatter.Lines)) {
        $allIssues.Add($issue)
    }
}

$grouped = $allIssues | Group-Object kind | Sort-Object Name
$summary = [ordered]@{
    root          = $rootLiteralPath
    files_scanned = $files.Count
    issues        = $allIssues.Count
    by_kind       = [ordered]@{}
}

foreach ($group in $grouped) {
    $summary.by_kind[$group.Name] = $group.Count
}

if ($Format -eq "json") {
    [pscustomobject]@{
        summary = [pscustomobject]$summary
        issues  = $allIssues
    } | ConvertTo-Json -Depth 6
} else {
    Write-Output "Frontmatter audit root: $($summary.root)"
    Write-Output "Files scanned: $($summary.files_scanned)"
    Write-Output "Issues found: $($summary.issues)"
    foreach ($kind in $summary.by_kind.Keys) {
        Write-Output ("  {0}: {1}" -f $kind, $summary.by_kind[$kind])
    }

    if (-not $SummaryOnly) {
        Write-Output ""
        foreach ($issue in ($allIssues | Sort-Object path, line, kind, key)) {
            Write-Output ("{0}:{1} [{2}] {3}" -f $issue.path, $issue.line, $issue.kind, $issue.message)
            if ($issue.suggestion) {
                Write-Output ("  suggestion: {0}" -f $issue.suggestion)
            }
        }
    }
}

if ($FailOnIssues -and $allIssues.Count -gt 0) {
    exit 1
}
