import { Loader2, ImageIcon } from "lucide-react"

export default function SmartImageUploadLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">RankOptim</span>
                <div className="text-xs text-gray-500">Smart Image Upload</div>
              </div>
            </div>
          </div>
          <div className="w-32 h-12 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>

      <div className="p-6">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Image Upload</h1>
          <p className="text-gray-600">
            Upload and manage product images with AI-powered optimization and bulk processing capabilities
          </p>
        </div>

        {/* Loading Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse mb-1"></div>
              <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Loading Main Content */}
        <div className="bg-white rounded-lg border p-6 mb-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3 text-blue-600" />
            <div>
              <p className="text-lg font-medium">Loading Smart Image Upload...</p>
              <p className="text-sm text-gray-500">Preparing image upload interface</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
