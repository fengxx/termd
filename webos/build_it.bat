mkdir ..\build
xcopy /s /y /i termd.application  ..\build\termd.application\
xcopy /s /y termd.srv  ..\build\termd.srv\
xcopy /s /y termd.package ..\build\termd.package\
xcopy  /y package_it.bat ..\build\
rem xcopy  /y install.bat ..\build\
xcopy /s /y ..\lib ..\build\termd.srv\lib
xcopy /s /y ..\bin\ptyrun ..\build\termd.srv\bin\ptyrun
xcopy  /y ..\*.js ..\build\termd.srv\
xcopy  /y ..\*.htm ..\build\termd.srv\
xcopy  /y ..\*.css ..\build\termd.srv\
cd ..\build\
call package_it.bat