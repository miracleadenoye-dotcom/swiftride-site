Add-Type -AssemblyName System.Drawing
foreach ($size in 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#000033'))
  $s = $size / 64.0
  $pts = @(
    (New-Object System.Drawing.PointF (14*$s), (40*$s)),
    (New-Object System.Drawing.PointF (26*$s), (24*$s)),
    (New-Object System.Drawing.PointF (36*$s), (24*$s)),
    (New-Object System.Drawing.PointF (30*$s), (33*$s)),
    (New-Object System.Drawing.PointF (44*$s), (33*$s)),
    (New-Object System.Drawing.PointF (32*$s), (48*$s)),
    (New-Object System.Drawing.PointF (18*$s), (48*$s))
  )
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#16a34a'))
  $g.FillPolygon($brush, $pts)
  $bmp.Save("$PSScriptRoot\..\public\icon-$size.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
Write-Output "icons done"
