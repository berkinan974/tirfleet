$action = New-ScheduledTaskAction -Execute "C:\Users\berki\Desktop\TIR\reminder.bat"
$trigger = New-ScheduledTaskTrigger -Daily -At 8am
Register-ScheduledTask -TaskName "TIR PTI Reminder" -Action $action -Trigger $trigger -Force
Write-Host "Zamanlanmis gorev olusturuldu!"
