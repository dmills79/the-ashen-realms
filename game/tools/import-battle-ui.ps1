param([Parameter(Mandatory=$true)][string]$Source)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$gameRoot=Split-Path $PSScriptRoot -Parent
$destination=Join-Path $gameRoot 'assets/battle/ui'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$codec=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$parameters=[System.Drawing.Imaging.EncoderParameters]::new(1)
$parameters.Param[0]=[System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality,[long]92)
function Export-Square($image,$rect,$name,$size){
    $bitmap=[System.Drawing.Bitmap]::new($size,$size)
    $graphics=[System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear([System.Drawing.Color]::FromArgb(7,16,22))
        $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $scale=[Math]::Max($size/$rect.Width,$size/$rect.Height)
        $target=[System.Drawing.RectangleF]::new(($size-$rect.Width*$scale)/2,($size-$rect.Height*$scale)/2,$rect.Width*$scale,$rect.Height*$scale)
        $graphics.DrawImage($image,$target,$rect,[System.Drawing.GraphicsUnit]::Pixel)
        $bitmap.Save((Join-Path $destination ($name+'.jpg')),$codec,$parameters)
    } finally {$graphics.Dispose();$bitmap.Dispose()}
}
$atlas=[System.Drawing.Bitmap]::new((Resolve-Path -LiteralPath $Source).Path)
try {
    $names=@('sword','daggers','hide','bow','arcane','ice','fire','holy','heal','guard','potion','ether','flee','poison','book','gauntlet')
    for($i=0;$i -lt $names.Count;$i++){
        $column=$i%4;$row=[Math]::Floor($i/4)
        $x=[int][Math]::Round($column*$atlas.Width/4)+2;$y=[int][Math]::Round($row*$atlas.Height/4)+2
        $right=[int][Math]::Round(($column+1)*$atlas.Width/4)-2;$bottom=[int][Math]::Round(($row+1)*$atlas.Height/4)-2
        Export-Square $atlas ([System.Drawing.RectangleF]::new($x,$y,$right-$x,$bottom-$y)) $names[$i] 192
    }
} finally {$atlas.Dispose()}
$sourceJs=[System.IO.File]::ReadAllText((Join-Path $gameRoot 'character-assets.js'))
$prefix='window.AshenCharacterManifest='
$manifest=$sourceJs.Substring($sourceJs.IndexOf($prefix)+$prefix.Length).Trim().TrimEnd(';') | ConvertFrom-Json
foreach($entry in $manifest.characters.PSObject.Properties){
    if($entry.Value.kind -ne 'enemy'){continue}
    $image=[System.Drawing.Bitmap]::new((Join-Path $gameRoot ('assets/'+$entry.Value.src)))
    try {
        $r=$entry.Value.frames[0].rect
        $humanoid=$entry.Name -in @('goblin','orc','shaman','bandit','bone','sentinel','warboss')
        $height=if($humanoid){[int]($r[3]*.43)}else{$r[3]}
        Export-Square $image ([System.Drawing.RectangleF]::new($r[0],$r[1],$r[2],$height)) ('enemy_'+$entry.Name) 128
    } finally {$image.Dispose()}
}
$parameters.Dispose()
