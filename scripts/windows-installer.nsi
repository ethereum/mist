# Add current directory to plugin path
!addplugindir .\

# Include LogicLib (http://nsis.sourceforge.net/LogicLib)
!include 'LogicLib.nsh'

# Include ZipDLL plugin (http://nsis.sourceforge.net/ZipDLL_plug-in)
!include 'ZipDLL.nsh'

# Include MoveFileFolder plugin (http://nsis.sourceforge.net/MoveFileFolder)
!include 'FileFunc.nsh'
!insertmacro Locate
Var /GLOBAL switch_overwrite
!include 'MoveFileFolder.nsh'

# Enable CRC
CRCCheck on

# Require admin privledges when UAC is on
RequestExecutionLevel admin

!define APPNAME "Mist"
!define GROUPNAME "Ethereum"
!define HELPURL "https://ethereum.org"

# These must be integers and can be set on the command line by NSIS with "/DMAJORVERSION=0 /DMINORVERSION=8 /DBUILDVERSION=7"
!define VERSIONMAJOR 0
!define VERSIONMINOR 8
!define VERSIONBUILD 7
!define INSTALLSIZE 78233

# Need to add architecture detection and/or include both files
!define RELEASEZIP "Mist-win32-${VERSIONMAJOR}-${VERSIONMINOR}-${VERSIONBUILD}.zip"

# Define some script globals
Name "${GROUPNAME} ${APPNAME}"
Icon "..\dist_mist\build\icon.ico"
OutFile "..\dist_mist\release\mist-installer.exe"
var FILEDIR
var DATADIR

!macro VerifyUserIsAdmin
UserInfo::GetAccountType
pop $0
${If} $0 != "admin" ;Require admin rights on NT4+
        messageBox mb_iconstop "Administrator rights required!"
        setErrorLevel 740 ;ERROR_ELEVATION_REQUIRED
        quit
${EndIf}
!macroend

# For removing Start Menu shortcut in Windows 7
RequestExecutionLevel user

# The license page. Can use .txt or .rtf data
PageEx license
  LicenseData ..\LICENSE
PageExEnd

# Components is a good place to allow the user to select optional software to install
# For example, it could be used to allow the user to select which node they want installed and then download it
#Page components

# Select the location to install the files
PageEx directory
  PageCallbacks "preFileDir" "" ""
  DirVar $FILEDIR
PageExEnd

Function preFileDir
  !insertmacro VerifyUserIsAdmin
  StrCpy $FILEDIR "$PROGRAMFILES\${APPNAME}"
FunctionEnd

# This can be used so the data directory is selectable by the user
PageEx directory
  PageCallbacks "preDatadir" "" ""
  DirText "Select a location for data files (including keystore and chaindata)"
  DirVar $DATADIR
PageExEnd

Function preDataDir
  !insertmacro VerifyUserIsAdmin
  StrCpy $DATADIR "$APPDATA\${APPNAME}"
  SetShellVarContext ALL
FunctionEnd

# Installation
Page instfiles

# Uninstaller confirmation page. Useful to remind the user what data (if any) will remain, for example chaindata or keystore
UninstPage uninstConfirm

# Uninstallation section
UninstPage instfiles

# Mist installer instructions
Section Mist
    StrCpy $switch_overwrite 0

    # set the installation directory as the destination for the following actions
    SetOutPath $TEMP
    # include the zip file in this installer
    file "..\dist_mist\release\${RELEASEZIP}"
    # Extract the zip file from TEMP to the user's selected installation directory
    ZipDLL::extractALL "$TEMP\${RELEASEZIP}" "$FILEDIR"
 
    # create the uninstaller
    WriteUninstaller "$FILEDIR\uninstall.exe"
 
    # create shortcuts with flags in the start menu programs directory
    createDirectory "$SMPROGRAMS\${APPNAME}"
    createShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME} - Full Node.lnk" "$FILEDIR\win-unpacked\${APPNAME}.exe" "--fast --datadir=\"$DATADIR\""
    createShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME} - Light Client.lnk" "$FILEDIR\win-unpacked\${APPNAME}.exe" "--light --datadir=\"$DATADIR\""
    createShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME} - Testnet (Full).lnk" "$FILEDIR\win-unpacked\${APPNAME}.exe" "--testnet --fast --datadir=\"$DATADIR\""
    # create a shortcut for the program uninstaller
    CreateShortCut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$FILEDIR\uninstall.exe"

    # write registry strings for uninstallation
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${GROUPNAME} ${APPNAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$\"$FILEDIR\uninstall.exe$\""
SectionEnd
 
# uninstaller section start
Section "uninstall"

    # second, remove the link from the start menu
    rmDir /r /REBOOTOK "$SMPROGRAMS\${APPNAME}"
    rmDir /r /REBOOTOK "$FILEDIR"

    # delete registry strings
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
 
# uninstaller section end
SectionEnd
