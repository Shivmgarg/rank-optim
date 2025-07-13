import { Loader2, DollarSign } from "lucide-react"

export default function BulkDiscountLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">RankOptim</span>
                <div className="text-xs text-gray-500">Bulk Discount System</div>
              </div>
            </div>
          </div>
          <div className="w-32 h-12 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>

      <div className="p-6">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Discount System</h1>
          <p className="text-gray-600">
            Apply percentage discounts across your entire catalog with advanced filtering and scheduling options
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
            <Loader2 className="w-8 h-8 animate-spin mr-3 text-purple-600" />
            <div>
              <p className="text-lg font-medium">Loading Bulk Discount System...</p>
              <p className="text-sm text-gray-500">Fetching products and collections from Shopify</p>
            </div>
          </div>
        </div>

        {/* Loading Product Preview */}
        <div className="bg-white rounded-lg border p-6">
          <div className="mb-4">
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="flex items-center space-x-4">
              <div className="w-64 h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-15 h-15 bg-gray-200 rounded-md animate-pulse flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-3/4 h-3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex gap-2">
                      <div className="w-12 h-5 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-16 h-5 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
