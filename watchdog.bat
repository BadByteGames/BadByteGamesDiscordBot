@echo off
cls
echo launching
:begin:
echo error restarting
start /wait node index
goto begin