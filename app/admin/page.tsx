"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Search,
  Package,
  Edit,
  Eye,
  MoreHorizontal,
  Grid,
  List,
  Trash2,
  Upload,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProductEditModal } from "@/components/product-edit-modal"
import { createProductHistoryEntry } from "@/lib/universal-history"

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

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [collectionFilter, setCollectionFilter] = useState("all")
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
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
    let filtered = products

    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase()
      filtered = filtered.filter((product) => {
        return (
          product.title.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          (product.tags || []).some((tag) => tag.toLowerCase().includes(searchLower)) ||
          (product.variants || []).some(
            (variant) =>
              variant.sku?.toLowerCase().includes(searchLower) || variant.title.toLowerCase().includes(searchLower),
          )
        )
      })
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((product) => product.status === statusFilter)
    }

    if (collectionFilter !== "all") {
      filtered = filtered.filter((product) =>
        product.collections?.some((collection) => collection.id === collectionFilter),
      )
    }

    return filtered
  }, [products, debouncedSearchTerm, statusFilter, collectionFilter])

  // Optimized stats calculations using useMemo
  const stats = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === "active").length
    const draftProducts = products.filter((p) => p.status === "draft").length
    const customizableProducts = products.filter((p) => (p.tags || []).includes("customizable")).length

    return {
      activeProducts,
      draftProducts,
      customizableProducts,
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

  // Fetch products and collections
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch collections first
        const collectionsResponse = await fetch("/api/collections")
        if (collectionsResponse.ok) {
          const collectionsData = await collectionsResponse.json()
          setCollections(collectionsData.collections || [])
          console.log("Loaded collections:", collectionsData.collections?.length || 0)
        }

        await fetchProducts()
      } catch (error) {
        console.error("Error fetching data:", error)
        setProducts([])
        setCollections([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [collectionFilter])

  const fetchProducts = useCallback(async () => {
    try {
      const productsUrl = collectionFilter !== "all" ? `/api/products?collection=${collectionFilter}` : "/api/products"

      console.log("Fetching products from:", productsUrl)
      const productsResponse = await fetch(productsUrl)

      if (!productsResponse.ok) {
        const errorData = await productsResponse.json()
        console.error("Products fetch error:", errorData)
        throw new Error(errorData.error || "Failed to fetch products")
      }

      const productsData = await productsResponse.json()
      console.log(`Loaded ${productsData.products.length} products`)
      setProducts(productsData.products || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
    }
  }, [collectionFilter])

  const handleProductSelect = useCallback((productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }, [])

  const handleProductSave = useCallback(
    (updatedProduct: Product) => {
      const isNew = isCreatingNew
      const originalProduct = products.find((p) => p.id === updatedProduct.id)

      if (isNew) {
        setProducts((prev) => [updatedProduct, ...prev])
        setIsCreatingNew(false)

        createProductHistoryEntry(
          "Product Created",
          updatedProduct.id,
          updatedProduct.title,
          {},
          {
            title: updatedProduct.title,
            status: updatedProduct.status,
            productType: updatedProduct.productType,
            vendor: updatedProduct.vendor,
          },
        )
      } else {
        setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)))

        if (originalProduct) {
          createProductHistoryEntry(
            "Product Updated",
            updatedProduct.id,
            updatedProduct.title,
            {
              title: originalProduct.title,
              status: originalProduct.status,
              productType: originalProduct.productType,
              vendor: originalProduct.vendor,
            },
            {
              title: updatedProduct.title,
              status: updatedProduct.status,
              productType: updatedProduct.productType,
              vendor: updatedProduct.vendor,
            },
          )
        }
      }
    },
    [isCreatingNew, products],
  )

  const handleProductDelete = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId)
      setProducts((prev) => prev.filter((p) => p.id !== productId))

      if (product) {
        createProductHistoryEntry(
          "Product Deleted",
          productId,
          product.title,
          {
            title: product.title,
            status: product.status,
            productType: product.productType,
            vendor: product.vendor,
          },
          {},
        )
      }
    },
    [products],
  )

  const getInventory = useCallback((p: Product) => {
    if (!p.variants || !Array.isArray(p.variants)) return 0
    return p.variants.reduce((sum, v) => sum + (v?.inventoryQuantity || 0), 0)
  }, [])

  const getProductImage = useCallback((p: Product) => {
    if (!p.images || !Array.isArray(p.images) || p.images.length === 0) {
      return "/placeholder.svg?height=40&width=40"
    }
    return p.images[0]?.url || "/placeholder.svg?height=40&width=40"
  }, [])

  const getProductImageAlt = useCallback((p: Product) => {
    if (!p.images || !Array.isArray(p.images) || p.images.length === 0) {
      return p.title
    }
    return p.images[0]?.altText || p.title
  }, [])

  const handleCreateNew = useCallback(() => {
    setIsCreatingNew(true)
    setEditingProduct(null)
  }, [])

  const handleBulkDelete = useCallback(async () => {
    if (selectedProducts.length === 0) return

    if (confirm(`Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`)) {
      try {
        const deletePromises = selectedProducts.map((productId) =>
          fetch(`/api/products?id=${productId}`, { method: "DELETE" }),
        )

        await Promise.all(deletePromises)

        selectedProducts.forEach((productId) => {
          const product = products.find((p) => p.id === productId)
          if (product) {
            createProductHistoryEntry(
              "Bulk Product Deletion",
              productId,
              product.title,
              { title: product.title, status: product.status },
              {},
            )
          }
        })

        setProducts((prev) => prev.filter((p) => !selectedProducts.includes(p.id)))
        setSelectedProducts([])
      } catch (error) {
        console.error("Error deleting products:", error)
        alert("Error deleting products: " + error)
      }
    }
  }, [selectedProducts, products])

  const handleCollectionFilterChange = useCallback((value: string) => {
    console.log("Collection filter changed to:", value)
    setCollectionFilter(value)
    setSelectedProducts([])
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

  const retryConnection = () => {
    setConnectionStatus("checking")
    setErrorDetails("")
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/landing" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">RankOptim</span>
                <div className="text-xs text-gray-500">Admin Dashboard</div>
              </div>
            </Link>
          </div>

          {/* Store Connection Status in Header */}
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
        {/* Tools Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopify Management Tools</h1>
          <p className="text-gray-600 mb-6">Choose from our powerful tools to manage your Shopify store efficiently</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Smart Image Upload Tool */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <CardTitle className="text-xl">Smart Image Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Upload hundreds of product images by SKU with our intelligent ZIP file processing system. Organize
                  images in folders named with SKU numbers for automatic assignment.
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>ZIP file processing</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>SKU-based organization</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Automatic image assignment</span>
                  </div>
                </div>
                <Link href="/smart-image-upload">
                  <Button className="bg-blue-600 hover:bg-blue-700 w-full">
                    Open Smart Image Upload
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Bulk Discount System Tool */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <CardTitle className="text-xl">Bulk Discount System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Apply percentage discounts across your entire catalog with advanced filtering options. Schedule
                  discounts and track all pricing changes with rollback capabilities.
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Percentage-based discounts</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Advanced product filtering</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Scheduled pricing changes</span>
                  </div>
                </div>
                <Link href="/bulk-discount">
                  <Button className="bg-purple-600 hover:bg-purple-700 w-full">
                    Open Bulk Discount System
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">
                {collectionFilter !== "all" ? "In selected collection" : "All products loaded"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              <Eye className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeProducts}</div>
              <p className="text-xs text-muted-foreground">Live on store</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft Products</CardTitle>
              <Edit className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.draftProducts}</div>
              <p className="text-xs text-muted-foreground">Pending review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collections</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{collections.length}</div>
              <p className="text-xs text-muted-foreground">Product categories</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customizable</CardTitle>
              <Edit className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.customizableProducts}</div>
              <p className="text-xs text-muted-foreground">Ready for custom</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products, tags, descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={collectionFilter} onValueChange={handleCollectionFilterChange}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.title} ({collection.productsCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Collection Filter Debug Info */}
            {collectionFilter !== "all" && (
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-4">
                <strong>Collection Filter Active:</strong> Showing products from "
                {collections.find((c) => c.id === collectionFilter)?.title || collectionFilter}"
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Display */}
        <Card>
          <CardHeader>
            <CardTitle>Products ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2">Loading products...</span>
              </div>
            ) : viewMode === "table" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(filteredProducts.map((p) => p.id))
                          } else {
                            setSelectedProducts([])
                          }
                        }}
                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      />
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Collections</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleProductSelect(product.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Image
                            src={getProductImage(product) || "/placeholder.svg"}
                            alt={getProductImageAlt(product)}
                            width={40}
                            height={40}
                            className="rounded-md object-cover"
                          />
                          <div>
                            <div className="font-medium">{product.title}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.status === "active" ? "default" : "secondary"}
                          className={
                            product.status === "active"
                              ? "bg-green-100 text-green-800"
                              : product.status === "draft"
                                ? "bg-yellow-100 text-yellow-800"
                                : ""
                          }
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(product.collections || []).slice(0, 2).map((collection) => (
                            <Badge key={collection.id} variant="outline" className="text-xs">
                              {collection.title}
                            </Badge>
                          ))}
                          {(product.collections || []).length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{(product.collections || []).length - 2}
                            </Badge>
                          )}
                          {(product.collections || []).length === 0 && (
                            <span className="text-xs text-gray-400">No collections</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{getInventory(product)} units</div>
                        <div className="text-xs text-gray-500">{(product.variants || []).length} variants</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(product.tags || []).slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {(product.tags || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(product.tags || []).length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{product.createdAt}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="aspect-square relative">
                      <Image
                        src={getProductImage(product) || "/placeholder.svg"}
                        alt={getProductImageAlt(product)}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={product.status === "active" ? "default" : "secondary"}
                          className={
                            product.status === "active"
                              ? "bg-green-100 text-green-800"
                              : product.status === "draft"
                                ? "bg-yellow-100 text-yellow-800"
                                : ""
                          }
                        >
                          {product.status}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold truncate">{product.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-500">{getInventory(product)} units</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setEditingProduct(product)}>
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                {collectionFilter !== "all"
                  ? "No products found in the selected collection. Try selecting a different collection or clearing the filter."
                  : "No products found. Try adjusting your search terms or filters."}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{selectedProducts.length} products selected</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Bulk Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    Export Selected
                  </Button>
                  <Button variant="outline" size="sm">
                    Update Status
                  </Button>
                  <Button variant="outline" size="sm">
                    Add to Collection
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Edit Modal */}
      {(editingProduct || isCreatingNew) && (
        <ProductEditModal
          product={editingProduct}
          isOpen={!!(editingProduct || isCreatingNew)}
          onClose={() => {
            setEditingProduct(null)
            setIsCreatingNew(false)
          }}
          onSave={handleProductSave}
          onDelete={handleProductDelete}
          isNew={isCreatingNew}
        />
      )}
    </div>
  )
}
