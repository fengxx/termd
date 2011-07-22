mkdir ..\build
xcopy /s /y /i termd.application  ..\build\termd.application\
xcopy /s /y /i termd.srv  ..\build\termd.srv\
xcopy /s /y /i termd.package ..\build\termd.package\
xcopy  /y package_it.bat ..\build\
rem xcopy  /y install.bat ..\build\
xcopy /s /y /i ..\lib ..\build\termd.srv\lib
mkdir ..\build\termd.srv\bin
copy  ..\bin\ptyrun ..\build\termd.srv\bin
xcopy  /y ..\*.js ..\build\termd.srv\
xcopy  /y ..\*.htm ..\build\termd.srv\
xcopy  /y ..\*.css ..\build\termd.srv\
cd ..\build\
call package_it.bat