export function UploadLoading() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center" role="status" aria-label="Checking upload session">
      <div className="animate-spin h-8 w-8 border-2 border-aurora-violet border-t-transparent rounded-full" aria-hidden="true" />
      <span className="sr-only">Checking upload session</span>
    </div>
  )
}
