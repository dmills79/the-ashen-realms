param([Parameter(Mandatory=$true)][string]$Source,[Parameter(Mandatory=$true)][string]$Destination,[int]$Columns,[int]$Rows,[string[]]$Names,[switch]$Trim)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$image=[System.Drawing.Bitmap]::new((Resolve-Path -LiteralPath $Source).Path)
try {
    for ($i=0; $i -lt $Names.Count; $i++) {
        $col=$i%$Columns; $row=[Math]::Floor($i/$Columns)
        $x=[int][Math]::Round($col*$image.Width/$Columns); $y=[int][Math]::Round($row*$image.Height/$Rows)
        $width=[int][Math]::Round(($col+1)*$image.Width/$Columns)-$x; $height=[int][Math]::Round(($row+1)*$image.Height/$Rows)-$y
        $crop=$image.Clone([System.Drawing.Rectangle]::new($x,$y,$width,$height),$image.PixelFormat)
        if ($Trim) {
            $minX=$width; $minY=$height; $maxX=-1; $maxY=-1
            for ($py=0; $py -lt $height; $py++) { for ($px=0; $px -lt $width; $px++) {
                if ($crop.GetPixel($px,$py).A -gt 10) { $minX=[Math]::Min($minX,$px); $minY=[Math]::Min($minY,$py); $maxX=[Math]::Max($maxX,$px); $maxY=[Math]::Max($maxY,$py) }
            }}
            if ($maxX -ge 0) { $tight=$crop.Clone([System.Drawing.Rectangle]::new($minX,$minY,$maxX-$minX+1,$maxY-$minY+1),$crop.PixelFormat); $crop.Dispose(); $crop=$tight }
        }
        $crop.Save((Join-Path (Resolve-Path -LiteralPath $Destination).Path ($Names[$i]+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
        $crop.Dispose()
    }
} finally { $image.Dispose() }
