"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Upload, ImageIcon, Zap, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { BulkUploadModal } from "@/components/bulk-upload-modal"

interface Product {
  id: string
  title: string
  images: Array<{
    id: string
    url: string
    altText: string
  }>
  variants: Array<{
    id: string
    title: string
    price: string
    sku: string
  }>
  status: string
}

interface UploadResult {
  success: boolean
  productId: string
  productTitle: string
  imageUrl: string
  error?: string
}

export default function SmartImageUploadPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [showBulkModal, setShowBulkModal] = useState(false)

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      } else {
        setMessage({ type: "error", text: "Failed to fetch products" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error fetching products" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Zap className="w-3 h-3 mr-1" />
                Smart Upload
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Image Upload</h1>
          <p className="text-gray-600">
            Upload and manage product images with intelligent optimization and bulk processing capabilities.
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <Alert
            className={`mb-6 ${
              message.type === "error"
                ? "border-red-200 bg-red-50"
                : message.type === "success"
                  ? "border-green-200 bg-green-50"
                  : "border-blue-200 bg-blue-50"
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Bulk Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Bulk Image Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Upload Multiple Images</h3>
                  <p className="text-gray-600 mb-4">
                    Process multiple product images at once with intelligent matching and optimization.
                  </p>
                  <Button onClick={() => setShowBulkModal(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Zap className="w-4 h-4 mr-2" />
                    Start Bulk Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Upload Results & Stats */}
          <div className="space-y-6">
            {/* Upload Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Products</span>
                    <span className="font-medium">{products.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Products with Images</span>
                    <span className="font-medium">{products.filter((p) => p.images.length > 0).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Products without Images</span>
                    <span className="font-medium text-orange-600">
                      {products.filter((p) => p.images.length === 0).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Upload Results */}
            {uploadResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Uploads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {uploadResults.map((result, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{result.productTitle}</div>
                          {result.success ? (
                            <div className="text-xs text-green-600">Upload successful</div>
                          ) : (
                            <div className="text-xs text-red-600">{result.error}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start bg-transparent" onClick={fetchProducts}>
                  <Loader2 className="w-4 h-4 mr-2" />
                  Refresh Products
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  View Image Gallery
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        products={products}
        onUploadComplete={(results) => {
          setUploadResults(results)
          fetchProducts()
        }}
      />
    </div>
  )
}
