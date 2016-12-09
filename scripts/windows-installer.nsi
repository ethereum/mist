# Add current directory to plugin path
!addplugindir .\

# Architecture detection
!include x64.nsh

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
!define HELPURL "https://github.com/ethereum/mist/releases/issues"
!define UPDATEURL "https://github.com/ethereum/mist/releases"
!define ABOUTURL "https://ethereum.org"
!define /date NOW "%Y%m%d"

# These must be integers and can be set on the command line by NSIS with "/DMAJORVERSION=0 /DMINORVERSION=8 /DBUILDVERSION=7"
!define VERSIONMAJOR 0
!define VERSIONMINOR 8
!define VERSIONBUILD 7

# Need to add architecture detection and/or include both files
!define RELEASEZIP "${APPNAME}-win64-${VERSIONMAJOR}-${VERSIONMINOR}-${VERSIONBUILD}.zip"

# Define some script globals
Name "${GROUPNAME} ${APPNAME}"
Icon "..\dist_mist\build\icon.ico"
OutFile "..\dist_mist\release\mist-installer-${VERSIONMAJOR}-${VERSIONMINOR}-${VERSIONBUILD}.exe"
var FILEDIR
var DATADIR
var NODEDATADIR
var ARCHDIR
var ARCHSHRT

# Check for administrative rights
!macro VerifyUserIsAdmin
UserInfo::GetAccountType
pop $0
${If} $0 != "admin"
        messageBox mb_iconstop "Administrator rights required!"
        setErrorLevel 740 ;ERROR_ELEVATION_REQUIRED
        quit
${EndIf}
!macroend

# Create a shared function function for setting environment variables
!macro ENVFUNC un
  Function ${un}setenv
    SetShellVarContext current
    StrCpy $DATADIR "$APPDATA\${APPNAME}"
    StrCpy $NODEDATADIR "$APPDATA\Ethereum"
    ${If} ${RunningX64}
      StrCpy $FILEDIR "$PROGRAMFILES64\${APPNAME}"
      StrCpy $ARCHDIR "win-unpacked"
      StrCpy $ARCHSHRT "win64"
    ${Else}
      StrCpy $FILEDIR "$PROGRAMFILES32\${APPNAME}"
      StrCpy $ARCHDIR "win-ia32-unpacked"
      StrCpy $ARCHSHRT "win32"
    ${Endif}
  FunctionEnd
!macroend

!insertmacro ENVFUNC ""
!insertmacro ENVFUNC "un."

function .onInit
  setShellVarContext all
  !insertmacro VerifyUserIsAdmin
  call setenv
functionEnd

# The license page. Can use .txt or .rtf data
PageEx license
  LicenseData ..\LICENSE
PageExEnd

# Components is a good place to allow the user to select optional software to install
# For example, it could be used to allow the user to select which node they want installed and then download it
#Page components

# Select the location to install the main program files
PageEx directory
  DirVar $FILEDIR
PageExEnd

# Select the location for Mist's data directory
PageEx directory
  DirText "Select a location for Mist's data files (watched contracts, etc.)"
  DirVar $DATADIR
PageExEnd

# Select the location for the node's data directory
PageEx directory
  DirText "Select a location where blockchain data will be stored"
  DirVar $NODEDATADIR
PageExEnd

# Installation
Page instfiles

# Uninstaller confirmation page. Useful to remind the user what data (if any) will remain, for example chaindata or keystore
UninstPage uninstConfirm

# Uninstallation section
UninstPage instfiles

# Show details by default
ShowInstDetails show
ShowUninstDetails show

# Mist installer instructions
Section "Mist"
    StrCpy $switch_overwrite 1

    # set the installation directory as the destination for the following actions
    SetOutPath $TEMP
    # include the zip file in this installer
    file "..\dist_mist\release\${RELEASEZIP}"
    file "..\dist_mist\build\icon.ico"

    # Extract the zip file from TEMP to the user's selected installation directory
    ZipDLL::extractALL "$TEMP\${RELEASEZIP}" "$FILEDIR"
    # Move files out of subfolder
    !insertmacro MoveFolder "$FILEDIR\win-unpacked" "$FILEDIR" "*.*"
    # Copy the icon over (not included in zip)
    !insertmacro MoveFile "$TEMP\icon.ico" "$FILEDIR\logo.ico"
 
    # create the uninstaller
    WriteUninstaller "$FILEDIR\uninstall.exe"
 
    # create shortcuts with flags in the start menu programs directory
    createDirectory "$SMPROGRAMS\${APPNAME}"
    createShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME} - Mainnet (Full).lnk" "$FILEDIR\${APPNAME}.exe" '--datadir="$DATADIR" --node-datadir="$NODEDATADIR"' "$FILEDIR\${APPNAME}.exe" 0
    createShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME} - Testnet (Full).lnk" "$FILEDIR\${APPNAME}.exe" '--testnet --datadir="$DATADIR" --node-datadir="$NODEDATADIR"' "$FILEDIR\${APPNAME}.exe" 0
    # create a shortcut for the program uninstaller
    CreateShortCut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$FILEDIR\uninstall.exe"

    # write registry strings for uninstallation
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "DisplayName" "${GROUPNAME} ${APPNAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "UninstallString" '"$FILEDIR\uninstall.exe"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "QuietUninstallString" "$\"$INSTDIR\uninstall.exe$\" /S"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "InstallLocation" '"$FILEDIR"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "InstallDate" "${NOW}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "DisplayIcon" '"$FILEDIR\logo.ico"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "Publisher" "${GROUPNAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "HelpLink" '"${HELPURL}"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "URLUpdateInfo" '"${UPDATEURL}"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "URLInfoAbout" '"${ABOUTURL}"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "DisplayVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "VersionMajor" ${VERSIONMAJOR}
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "VersionMinor" ${VERSIONMINOR}
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}" "NoRepair" 1
SectionEnd

function un.onInit
  call un.setenv
  SetShellVarContext all
  !insertmacro VerifyUserIsAdmin
functionEnd
 
# uninstaller section start
Section "uninstall"
    # remove the link from the start menu
    rmDir /r "$SMPROGRAMS\${APPNAME}"
    # remove files from installation directory
    rmDir /r /REBOOTOK "$FILEDIR"

    # delete registry strings
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${GROUPNAME} ${APPNAME}"
SectionEnd
