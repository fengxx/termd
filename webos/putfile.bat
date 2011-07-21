echo %~nx1
if exist %1 (
novacom put file:///media/internal/%~nx1 <"%1"
)