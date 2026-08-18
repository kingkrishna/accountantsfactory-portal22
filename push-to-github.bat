@echo off
setlocal
echo ==============================================
echo Pushing AccountantsFactory Portal to GitHub
echo Repository: https://github.com/kingkrishna/accountantsfactory-portal22.git
echo ==============================================
echo.

set "PATH=C:\Users\RAMA\AppData\Local\Programs\Git\cmd;%PATH%"

cd /d "c:\Users\RAMA\Downloads\accountantsfactory-portal-main\accountantsfactory-portal-main"

git remote set-url origin https://github.com/kingkrishna/accountantsfactory-portal22.git
git branch -M main

echo Uploading commits to GitHub...
git push -u origin main

if errorlevel 1 (
    echo.
    echo ==============================================
    echo If prompted, enter your GitHub Username and Personal Access Token (PAT),
    echo or authorize via browser window.
    echo ==============================================
) else (
    echo.
    echo ==============================================
    echo SUCCESS: Pushed to GitHub repository!
    echo ==============================================
)

echo.
pause
