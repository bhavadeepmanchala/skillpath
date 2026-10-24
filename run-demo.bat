@echo off
title SkillPath demo
set ROOT=%~dp0
start "SkillPath backend" cmd /k "cd /d %ROOT%backend && mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=seed"
start "SkillPath frontend" cmd /k "cd /d %ROOT%frontend && npm run dev"
echo Waiting for the servers to start...
timeout /t 45 /nobreak > nul
start http://localhost:3000