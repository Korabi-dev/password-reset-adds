param(
    [string]$username,
    [string]$newPassword
)

# Import AD Module
Import-Module ActiveDirectory

# Set the new password for the specified user
try {
    Set-ADAccountPassword -Identity $username -NewPassword (ConvertTo-SecureString -AsPlainText $newPassword -Force) -Reset
    Write-Host "Success"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
