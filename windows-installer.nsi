CRCCheck on

!define APPNAME "Mist"
!define GROUPNAME "Ethereum"
!define HELPURL "https://ethereum.org"

Name "${GROUPNAME} ${APPNAME}"
Icon "dist_mist\build\icon.ico"
OutFile "dist_mist\release\mist-installer.exe"

# These must be integers and can be set on the command line by NSIS with "/DMAJORVERSION=0 /DMINORVERSION=8 /DBUILDVERSION=7"
!define VERSIONMAJOR 0
!define VERSIONMINOR 8
!define VERSIONBUILD 7
!define INSTALLSIZE 78233

# Need to add architecture detection and/or include both files
!define RELEASEZIP "Mist-win32-${VERSIONMAJOR}-${VERSIONMINOR}-${VERSIONBUILD}.zip"

# Include ZipDLL plugin (http://nsis.sourceforge.net/ZipDLL_plug-in)
!include "ZipDLL.nsh"
 
# For removing Start Menu shortcut in Windows 7
RequestExecutionLevel user

InstallDir "$PROGRAMFILES\${APPNAME}"

# The license page. Can use .txt or .rtf data
PageEx license
  LicenseData LICENSE
PageExEnd

# Components is a good place to allow the user to select optional software to install if we have any
#Page components

# Select the location to install the files
Page directory

# This can be used so the data directory is selectable by the user
#PageEx datadir
#PageExEnd

# Installation
Page instfiles

# Uninstaller confirmation page. Useful to remind the user what data (if any) will remain, for example chaindata or keystore
UninstPage uninstConfirm

# Uninstallation section
UninstPage instfiles

# Mist installer instructions
Section Mist
    # set the installation directory as the destination for the following actions
    SetOutPath $TEMP
    # include the zip file in this installer
    file "dist_mist\release\${RELEASEZIP}"
    # Extract the zip file from TEMP to the user's selected installation directory
    ZipDLL::extractALL "$TEMP\${RELEASEZIP}" "$INSTDIR"
 
    # create the uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
 
    # create shortcuts with flags in the start menu programs directory
    createDirectory "$SMPROGRAMS\${APPNAME}"
    createShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME} - Full Node.lnk" "$INSTDIR\win-unpacked\${APPNAME}.exe" "--fast"
    createShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME} - Light Client.lnk" "$INSTDIR\win-unpacked\${APPNAME}.exe" "--light"
    # create a shortcut for the program uninstaller
    CreateShortCut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"

    # write registry strings for uninstallation
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${GROUPNAME} ${APPNAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
SectionEnd
 
# uninstaller section start
Section "uninstall"
 
    # first, delete the uninstaller
    Delete "$INSTDIR\uninstall.exe"
 
    # second, remove the link from the start menu
    rmDir "$SMPROGRAMS\${APPNAME}"
    rmDir "$INSTDIR"

    # delete registry strings
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
 
# uninstaller section end
SectionEnd








