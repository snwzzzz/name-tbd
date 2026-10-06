$content = Get-Content "c:\Users\snwzi\OneDrive\Dokumente\GitHub\name-tbd\README.md" -Raw
$content = $content -replace "(?m)^- Exported data lives in the export and in each visitor's browser. There's no shared live data yet.`r?`n", ""
$content = $content -replace "(?m)^- \*\*Live data sources\*\* \(databases, APIs\): a new definition section plus an \`AppData\` implementation \(section 15\).`r?`n", ""
Set-Content "c:\Users\snwzi\OneDrive\Dokumente\GitHub\name-tbd\README.md" $content
