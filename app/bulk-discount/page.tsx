"use client"

import { Button } from "@/components/ui/button"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Search,
  Package,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  TrendingDown,
  Percent,
  Loader2,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BulkDiscountSystem } from "@/components/bulk-discount-system"

interface Product {
  id: string
  title: string
  description: string
  handle: string
  images: Array<{
    id: string
    url: string
    altText: string
    width: number
    height: number
  }>
  variants: Array<{
    id: string
    title: string
    price: string
    compareAtPrice?: string
    inventoryQuantity: number
    sku: string
  }>
  collections: Array<{
    id: string
    title: string
    handle: string
  }>
  tags: string[]
  status: string
  createdAt: string
  productType: string
  vendor: string
  totalInventory: number
}

interface Collection {
  id: string
  title: string
  handle: string
  description: string
  productsCount: number
  image: {
    url: string
    altText: string
  } | null
}

export default function BulkDiscountPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error">("checking")
  const [storeInfo, setStoreInfo] = useState<any>(null)
  const [errorDetails, setErrorDetails] = useState<string>("")

  // Optimized search with debouncing
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Optimized filtered products using useMemo with debounced search
  const filteredProducts = useMemo(() => {
    if (!debouncedSearchTerm) return products

    const searchLower = debouncedSearchTerm.toLowerCase()
    return products.filter((product) => {
      return (
        product.title.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.productType?.toLowerCase().includes(searchLower) ||
        product.vendor?.toLowerCase().includes(searchLower) ||
        (product.tags || []).some((tag) => tag.toLowerCase().includes(searchLower)) ||
        (product.variants || []).some(
          (variant) =>
            variant.sku?.toLowerCase().includes(searchLower) || variant.title.toLowerCase().includes(searchLower),
        ) ||
        (product.collections || []).some((collection) => collection.title.toLowerCase().includes(searchLower))
      )
    })
  }, [products, debouncedSearchTerm])

  // Calculate discount stats
  const discountStats = useMemo(() => {
    const productsWithDiscounts = products.filter((p) =>
      p.variants?.some((v) => v.compareAtPrice && Number.parseFloat(v.compareAtPrice) > Number.parseFloat(v.price)),
    ).length

    const totalVariants = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0)
    const variantsWithDiscounts = products.reduce(
      (sum, p) =>
        sum +
        (p.variants?.filter((v) => v.compareAtPrice && Number.parseFloat(v.compareAtPrice) > Number.parseFloat(v.price))
          .length || 0),
      0,
    )

    const averageDiscount =
      products.reduce((sum, p) => {
        const productDiscounts =
          p.variants?.map((v) => {
            if (v.compareAtPrice && Number.parseFloat(v.compareAtPrice) > Number.parseFloat(v.price)) {
              return (
                ((Number.parseFloat(v.compareAtPrice) - Number.parseFloat(v.price)) /
                  Number.parseFloat(v.compareAtPrice)) *
                100
              )
            }
            return 0
          }) || []
        return sum + productDiscounts.reduce((a, b) => a + b, 0)
      }, 0) / Math.max(variantsWithDiscounts, 1)

    return {
      productsWithDiscounts,
      totalVariants,
      variantsWithDiscounts,
      averageDiscount: Math.round(averageDiscount),
    }
  }, [products])

  // Check store connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log("Checking Shopify connection...")
        const response = await fetch("/api/products")

        if (response.ok) {
          const data = await response.json()
          console.log("Connection successful:", data)
          setConnectionStatus("connected")

          try {
            const shopResponse = await fetch("/api/shop-info")
            if (shopResponse.ok) {
              const shopData = await shopResponse.json()
              setStoreInfo({
                productCount: data.count || data.products?.length || 0,
                storeName: shopData.shop?.name || shopData.name || "Shopify Store",
                domain: shopData.shop?.domain || shopData.domain || "",
              })
            } else {
              setStoreInfo({
                productCount: data.count || data.products?.length || 0,
                storeName: "Shopify Store",
                domain: "",
              })
            }
          } catch (shopError) {
            console.log("Shop info not available, using fallback")
            setStoreInfo({
              productCount: data.count || data.products?.length || 0,
              storeName: "Shopify Store",
              domain: "",
            })
          }

          setErrorDetails("")
        } else {
          const errorData = await response.json()
          console.error("Connection failed:", errorData)
          setConnectionStatus("error")
          setErrorDetails(errorData.details || errorData.error || "Unknown error")
        }
      } catch (error) {
        console.error("Network error:", error)
        setConnectionStatus("error")
        setErrorDetails(error instanceof Error ? error.message : "Network error")
      }
    }

    checkConnection()
  }, [])

  // Fetch products and collections with enhanced error handling
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch collections with better error handling
        try {
          const collectionsResponse = await fetch("/api/collections")
          if (collectionsResponse.ok) {
            const collectionsData = await collectionsResponse.json()
            console.log("Collections response:", collectionsData)

            // Handle different response formats
            let collections = []
            if (collectionsData.collections && Array.isArray(collectionsData.collections)) {
              collections = collectionsData.collections
            } else if (collectionsData.body && collectionsData.body.data && collectionsData.body.data.collections) {
              collections = collectionsData.body.data.collections.edges?.map((edge: any) => edge.node) || []
            } else if (Array.isArray(collectionsData)) {
              collections = collectionsData
            }

            setCollections(collections)
          } else {
            console.error("Failed to fetch collections:", collectionsResponse.status)
            setCollections([])
          }
        } catch (collectionsError) {
          console.error("Error fetching collections:", collectionsError)
          setCollections([])
        }

        // Fetch products with better error handling
        try {
          const productsResponse = await fetch("/api/products")
          if (productsResponse.ok) {
            const productsData = await productsResponse.json()
            console.log("Products response:", productsData)

            // Handle different response formats
            let products = []
            if (productsData.products && Array.isArray(productsData.products)) {
              products = productsData.products
            } else if (productsData.body && productsData.body.data && productsData.body.data.products) {
              products = productsData.body.data.products.edges?.map((edge: any) => edge.node) || []
            } else if (Array.isArray(productsData)) {
              products = productsData
            }

            setProducts(products)
          } else {
            console.error("Failed to fetch products:", productsResponse.status)
            setProducts([])
          }
        } catch (productsError) {
          console.error("Error fetching products:", productsError)
          setProducts([])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setProducts([])
        setCollections([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleProductsUpdate = useCallback((updatedProducts: Product[]) => {
    setProducts(updatedProducts)
  }, [])

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "checking":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getProductImage = useCallback((p: Product) => {
    if (!p.images || !Array.isArray(p.images) || p.images.length === 0) {
      return "/placeholder.svg?height=60&width=60"
    }
    return p.images[0]?.url || "/placeholder.svg?height=60&width=60"
  }, [])

  const getProductImageAlt = useCallback((p: Product) => {
    if (!p.images || !Array.isArray(p.images) || p.images.length === 0) {
      return p.title
    }
    return p.images[0]?.altText || p.title
  }, [])

  const calculateCurrentDiscount = useCallback((price: string, compareAtPrice?: string) => {
    if (!compareAtPrice) return 0
    const priceNum = Number.parseFloat(price)
    const compareNum = Number.parseFloat(compareAtPrice)
    if (compareNum <= priceNum) return 0
    return Math.round(((compareNum - priceNum) / compareNum) * 100)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <Link href="/landing" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">RankOptim</span>
                <div className="text-xs text-gray-500">Bulk Discount System</div>
              </div>
            </Link>
          </div>

          {/* Store Connection Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
              {getStatusIcon()}
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {connectionStatus === "connected" ? storeInfo?.storeName || "Shopify Store" : "Store Connection"}
                </div>
                <div className="text-xs text-gray-500">
                  {connectionStatus === "connected"
                    ? `${storeInfo?.productCount || 0} products`
                    : connectionStatus === "checking"
                      ? "Checking..."
                      : "Not connected"}
                </div>
              </div>
            </div>
          </div>
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">Available for discounting</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products with Discounts</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{discountStats.productsWithDiscounts}</div>
              <p className="text-xs text-muted-foreground">Currently discounted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Discount</CardTitle>
              <Percent className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{discountStats.averageDiscount}%</div>
              <p className="text-xs text-muted-foreground">Across all discounted items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Search Results</CardTitle>
              <Search className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{filteredProducts.length}</div>
              <p className="text-xs text-muted-foreground">Matching your search</p>
            </CardContent>
          </Card>
        </div>

        {/* Connection Error Display */}
        {connectionStatus === "error" && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center">
                <XCircle className="w-5 h-5 mr-2" />
                Connection Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-2">Failed to connect to Shopify store.</p>
              <p className="text-sm text-red-600">{errorDetails}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
              >
                Retry Connection
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bulk Discount System */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-purple-600" />
              Discount Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mr-3" />
                <div>
                  <p className="text-lg font-medium">Loading products and collections...</p>
                  <p className="text-sm text-gray-500">This may take a moment for large catalogs</p>
                </div>
              </div>
            ) : (
              <BulkDiscountSystem products={products} onProductsUpdate={handleProductsUpdate} />
            )}
          </CardContent>
        </Card>

        {/* Product Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Product Preview</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products, SKUs, tags, collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="outline">
                {filteredProducts.length} of {products.length} products
              </Badge>
              {collections.length > 0 && <Badge variant="secondary">{collections.length} collections</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2">Loading products...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.slice(0, 12).map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <Image
                        src={getProductImage(product) || "/placeholder.svg"}
                        alt={getProductImageAlt(product)}
                        width={60}
                        height={60}
                        className="rounded-md object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{product.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>

                        {/* Product metadata */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant={product.status === "active" ? "default" : "secondary"} className="text-xs">
                            {product.status}
                          </Badge>
                          {product.productType && (
                            <Badge variant="outline" className="text-xs">
                              {product.productType}
                            </Badge>
                          )}
                          {product.vendor && (
                            <Badge variant="outline" className="text-xs">
                              {product.vendor}
                            </Badge>
                          )}
                        </div>

                        {/* Collections */}
                        {product.collections && product.collections.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              Collections: {product.collections.map((c) => c.title).join(", ")}
                            </p>
                          </div>
                        )}

                        {/* Variants */}
                        <div className="mt-2 space-y-1">
                          {product.variants?.slice(0, 2).map((variant) => {
                            const discount = calculateCurrentDiscount(variant.price, variant.compareAtPrice)
                            return (
                              <div key={variant.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 truncate">{variant.title}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">₹{Number.parseFloat(variant.price).toFixed(2)}</span>
                                  {discount > 0 && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                      {discount}% OFF
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {product.variants && product.variants.length > 2 && (
                            <div className="text-xs text-gray-500">+{product.variants.length - 2} more variants</div>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {product.variants?.filter(
                              (v) =>
                                v.compareAtPrice && Number.parseFloat(v.compareAtPrice) > Number.parseFloat(v.price),
                            ).length || 0}{" "}
                            discounted
                          </span>
                          <span className="text-xs text-gray-500">{product.variants?.length || 0} variants</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "No products found matching your search." : "No products available."}
                {searchTerm && (
                  <p className="text-sm mt-2">
                    Try searching for product names, SKUs, tags, collections, types, or vendors.
                  </p>
                )}
              </div>
            )}

            {filteredProducts.length > 12 && (
              <div className="text-center mt-4 text-sm text-gray-500">
                Showing first 12 of {filteredProducts.length} products. Use search to find specific products.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
