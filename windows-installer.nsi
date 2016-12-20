# set the name of the installer
Outfile "hello world.exe"
 
# create a default section.
Section
 
# create a popup box, with an OK button and the text "Hello world!"
MessageBox MB_OK "Hello world!"
 
SectionEnd
