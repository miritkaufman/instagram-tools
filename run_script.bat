@echo off
cd /d "G:\My Drive\Mirit - instagram\instagram\Unfollowers"

chcp 65001 >nul
echo מריץ את הסקריפט למציאת משתמשים שלא עוקבים חזרה...
echo.

node find_unfollowers.js

echo.
pause