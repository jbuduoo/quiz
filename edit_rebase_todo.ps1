param($file)
$content = Get-Content $file
$content = $content -replace '^pick cd1ce0b', 'reword cd1ce0b'
$content = $content -replace '^pick 5180730', 'reword 5180730'
Set-Content $file $content



