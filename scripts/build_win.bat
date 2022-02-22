
mkdir .\releases
mkdir .\releases\win

.\node_modules\.bin\electron-packager . spiritsInObjects --overwrite --platform=win32 --arch=x64 --ignore=^\proto_imagetosound-nw --icon=dist\icons\icon.ico --prune=true --out=.\releases\win --version-string.CompanyName="dartmouth.edu" --version-string.FileDescription="Application for image sonification and sequencing" --version-string.ProductName="spiritsInObjects"

node .\scripts\build_win.js
