param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$Pattern = 'IRR|equity multiple|DSCR|refinanc|preferred|promote|waterfall|exit cap|capital gain|tax|depreciation|construction|draw',
  [string[]]$SheetNames,
  [int]$RowStart = 0,
  [int]$RowEnd = 0,
  [string]$CellPattern,
  [switch]$DumpRows
)

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($Path)

function Read-EntryXml([string]$name) {
  $entry = $archive.GetEntry($name)
  if (-not $entry) { return $null }
  $reader = [System.IO.StreamReader]::new($entry.Open())
  try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Column-Number([string]$address) {
  $letters = ($address -replace '[^A-Z]', '')
  $number = 0
  foreach ($character in $letters.ToCharArray()) { $number = ($number * 26) + ([int]$character - [int][char]'A' + 1) }
  return $number
}

try {
  $stringsXml = Read-EntryXml 'xl/sharedStrings.xml'
  $sharedStrings = @()
  if ($stringsXml) {
    foreach ($item in $stringsXml.SelectNodes("//*[local-name()='si']")) {
      $sharedStrings += (($item.SelectNodes(".//*[local-name()='t']") | ForEach-Object { $_.'#text' }) -join '')
    }
  }

  $workbookXml = Read-EntryXml 'xl/workbook.xml'
  $relationshipsXml = Read-EntryXml 'xl/_rels/workbook.xml.rels'
  $relationshipTargets = @{}
  foreach ($relationship in $relationshipsXml.SelectNodes("//*[local-name()='Relationship']")) {
    $relationshipTargets[$relationship.Id] = $relationship.Target
  }

  $targetNames = @('Summary','Annual','Assumptions','Budget','Master Inputs','Economics','Unit Mix Calculation','Monthly','Class A Waterfall','Class C1 Waterfall','Class C2 Waterfall','PFC Waterfall','_Debt','Exit','Waterfall (3)','Debt','PMTS')
  if ($SheetNames -and $SheetNames.Count -gt 0) { $targetNames = $SheetNames }
  $results = [System.Collections.Generic.List[object]]::new()

  foreach ($sheet in $workbookXml.SelectNodes("//*[local-name()='sheet']")) {
    if ($targetNames -notcontains $sheet.name) { continue }
    $relationshipId = $sheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    $target = $relationshipTargets[$relationshipId]
    if (-not $target) { continue }
    $entryName = if ($target.StartsWith('/')) { $target.TrimStart('/') } else { "xl/$target" }
    $sheetXml = Read-EntryXml $entryName
    if (-not $sheetXml) { continue }

    foreach ($row in $sheetXml.SelectNodes("//*[local-name()='sheetData']/*[local-name()='row']")) {
      $rowNumber = [int]$row.r
      if ($RowStart -gt 0 -and $rowNumber -lt $RowStart) { continue }
      if ($RowEnd -gt 0 -and $rowNumber -gt $RowEnd) { continue }
      $decoded = @{}
      foreach ($cell in $row.SelectNodes("./*[local-name()='c']")) {
        $address = $cell.r
        $column = Column-Number $address
        $valueNode = $cell.SelectSingleNode("./*[local-name()='v']")
        $formulaNode = $cell.SelectSingleNode("./*[local-name()='f']")
        $value = if ($cell.t -eq 's' -and $valueNode) {
          $sharedStrings[[int]$valueNode.InnerText]
        } elseif ($cell.t -eq 'inlineStr') {
          (($cell.SelectNodes(".//*[local-name()='t']") | ForEach-Object { $_.'#text' }) -join '')
        } elseif ($valueNode) {
          $valueNode.InnerText
        } else { $null }
        $decoded[$column] = [pscustomobject]@{ Address = $address; Value = $value; Formula = $formulaNode.InnerText }
      }
      if ($DumpRows) {
        foreach ($column in @($decoded.Keys | Sort-Object)) {
          $cell = $decoded[$column]
          if ($null -eq $cell.Value -and -not $cell.Formula) { continue }
          if ($CellPattern -and $cell.Address -notmatch $CellPattern) { continue }
          $results.Add([pscustomobject]@{
            Sheet = $sheet.name
            Cell = $cell.Address
            Value = $cell.Value
            Formula = $cell.Formula
          })
        }
        continue
      }
      foreach ($column in @($decoded.Keys)) {
        $cell = $decoded[$column]
        if ($cell.Value -is [string] -and $cell.Value -match $Pattern) {
          $results.Add([pscustomobject]@{
            Sheet = $sheet.name
            Cell = $cell.Address
            Label = $cell.Value
            Formula = $cell.Formula
            Right1 = $decoded[$column + 1].Value
            Right1Formula = $decoded[$column + 1].Formula
            Right2 = $decoded[$column + 2].Value
            Right2Formula = $decoded[$column + 2].Formula
          })
        }
      }
    }
  }
  $results | ConvertTo-Json -Depth 4
} finally {
  $archive.Dispose()
}
