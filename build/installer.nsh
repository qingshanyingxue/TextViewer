!include "StrFunc.nsh"
${StrStr}   ; 声明 StrStr 函数

; 初始化默认安装路径
!macro preInit
  StrCpy $INSTDIR "$LOCALAPPDATA\wenjian"
!macroend

; 每次用户修改安装目录时触发，自动追加 \wenjian
Function .onVerifyInstDir
  ; 检查路径末尾是否已包含目标子目录
  ${StrStr} $R0 "$INSTDIR" "\wenjian"
  ${If} $R0 == ""
    StrCpy $INSTDIR "$INSTDIR\wenjian"
  ${EndIf}
FunctionEnd

; 安装完成后强制创建桌面快捷方式
!macro customInstall
  CreateShortcut "$DESKTOP\文本查看器.lnk" "$INSTDIR\文本查看器.exe"
!macroend

; 卸载时删除桌面快捷方式
!macro customUnInstall
  Delete "$DESKTOP\文本查看器.lnk"
!macroend
