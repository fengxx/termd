mkdir ..\build
xcopy /s /y /i termd.application  ..\build\termd.application\
xcopy /s /y /i termd.srv  ..\build\termd.srv\
xcopy /s /y /i termd.package ..\build\termd.package\
xcopy  /y package_it.bat ..\build\
xcopy /s /y /i ..\lib ..\build\termd.srv\lib
mkdir ..\build\termd.srv\bin
if "%1"=="arm" (
copy  ..\bin\arm\ptyrun ..\build\termd.srv\bin\
)ELSE (
copy  ..\bin\ptyrun ..\build\termd.srv\bin\
)
xcopy  /y ..\*.js ..\build\termd.srv\
cd ..\build\
call package_it.bat
cd ..\webos