"use client"

import { useState } from "react"
import { UploadLoading } from "./components/UploadLoading"
import { UploadLogin } from "./components/UploadLogin"
import { UploadManager } from "./components/UploadManager"
import { useUploadAuth } from "./hooks/use-upload-auth"
import { useUploadFile } from "./hooks/use-upload-file"

export default function UploadPage() {
  const auth = useUploadAuth()
  const upload = useUploadFile()
  const [showSamples, setShowSamples] = useState(false)

  if (auth.checking) return <UploadLoading />

  if (!auth.authenticated) {
    return (
      <UploadLogin
        username={auth.username}
        password={auth.password}
        loginError={auth.loginError}
        loggingIn={auth.loggingIn}
        onUsernameChange={auth.setUsername}
        onPasswordChange={auth.setPassword}
        onLogin={auth.login}
      />
    )
  }

  const handleLogout = async () => {
    await auth.logout()
    upload.resetUpload()
  }

  return (
    <UploadManager
      file={upload.file}
      fileRef={upload.fileRef}
      status={upload.status}
      message={upload.message}
      uploadedUrl={upload.uploadedUrl}
      showSamples={showSamples}
      onToggleSamples={() => setShowSamples((visible) => !visible)}
      onFileSelect={upload.selectFile}
      onClearFile={upload.clearFile}
      onUpload={upload.upload}
      onLogout={handleLogout}
    />
  )
}
