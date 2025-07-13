"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Search,
  Package,
  Edit,
  Eye,
  Plus,
  MoreHorizontal,
  Grid,
  List,
  Trash2,
  Upload,
  DollarSign,
  History,
  Home,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StoreConnectionStatus } from "@/components/store-connection-status"
import { ProductEditModal } from "@/components/product-edit-modal"
import { BulkUploadModal } from "@/components/bulk-upload-modal"
import { UniversalHistoryModal } from "@/components/universal-history-modal"
import { BulkPriceEditModal } from "@/components/bulk-price-edit-modal"
import { BulkDiscountSystem } from "@/components/bulk-discount-system"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { UserProfile } from "@/components/auth/UserProfile"
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

export default function ShopifyAdminPage() {
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
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showUniversalHistory, setShowUniversalHistory] = useState(false)
  const [showBulkPriceEdit, setShowBulkPriceEdit] = useState(false)
  const [activeTab, setActiveTab] = useState("products")
  const [showProductHistory, setShowProductHistory] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if there are URL parameters (like ?tab=bulk-upload)
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get("tab")

    if (tab && ["products", "bulk-upload", "bulk-discount"].includes(tab)) {
      // If there's a valid tab parameter, go to the admin dashboard
      router.push(`/admin${window.location.search}`)
    }
    //  else {
    //   // Otherwise, redirect to the landing page
    //   router.push("/landing")
    // }
  }, [router])

  // Check URL parameters to set initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get("tab")
    if (tab && ["products", "bulk-upload", "bulk-discount"].includes(tab)) {
      setActiveTab(tab)
    }
  }, [])

  // Optimized filtered products using useMemo
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.tags || []).some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = statusFilter === "all" || product.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [products, searchTerm, statusFilter])

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

  // Listen for custom events from history system
  useEffect(() => {
    const handleOpenProductHistory = (event: CustomEvent) => {
      const { productId } = event.detail
      const product = products.find((p) => p.id === productId)
      if (product) {
        setSelectedProductForHistory(product)
        setShowProductHistory(true)
      }
    }

    const handleProductsUpdated = () => {
      fetchProducts()
    }

    window.addEventListener("openProductHistory", handleOpenProductHistory as EventListener)
    window.addEventListener("productsUpdated", handleProductsUpdated)

    return () => {
      window.removeEventListener("openProductHistory", handleOpenProductHistory as EventListener)
      window.removeEventListener("productsUpdated", handleProductsUpdated)
    }
  }, [products])

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
      console.log(`Loaded ${productsData.products.length} products from Pure Jewels store`)
      console.log("Collection filter applied:", collectionFilter)
      console.log("Debug info:", productsData.debug)

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

  const handleBulkUploadComplete = useCallback(
    (result: any) => {
      fetchProducts()
    },
    [fetchProducts],
  )

  const handleShowProductHistory = useCallback((product: Product) => {
    setSelectedProductForHistory(product)
    setShowProductHistory(true)
  }, [])

  const handleCollectionFilterChange = useCallback((value: string) => {
    console.log("Collection filter changed to:", value)
    setCollectionFilter(value)
    setSelectedProducts([])
  }, [])

  const handleProductsUpdate = useCallback((updatedProducts: Product[]) => {
    setProducts(updatedProducts)
  }, [])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pure Jewels - Admin Dashboard</h1>
                <p className="text-gray-600">
                  Manage your jewelry collection ({products.length} total products
                  {collectionFilter !== "all" && ` in selected collection`})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push("/AddStore")}>
                Add Store 
              </Button>
              <Link href="/landing">
                <Button variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Landing Page
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setShowUniversalHistory(true)}>
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
              <Button variant="outline" onClick={() => setShowBulkPriceEdit(true)}>
                <DollarSign className="w-4 h-4 mr-2" />
                Bulk Pricing
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
              <UserProfile />
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Store Connection Status */}
          <StoreConnectionStatus />

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products" className="flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Product Management
              </TabsTrigger>
              <TabsTrigger value="bulk-upload" className="flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Image Upload
              </TabsTrigger>
              <TabsTrigger value="bulk-discount" className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Bulk Discount System
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
                                  <DropdownMenuItem onClick={() => handleShowProductHistory(product)}>
                                    <History className="w-4 h-4 mr-2" />
                                    View History
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
            </TabsContent>

            {/* Bulk Upload Tab */}
            <TabsContent value="bulk-upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Image Upload</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Upload Images by SKU</h3>
                    <p className="text-gray-500 mb-4">
                      Upload ZIP files containing folders named with SKU numbers for bulk image management.
                    </p>
                    <Button onClick={() => setShowBulkUpload(true)}>Start Bulk Upload</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bulk Discount System Tab */}
            <TabsContent value="bulk-discount" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Discount System</CardTitle>
                  <p className="text-gray-600">Apply percentage discounts to selected products automatically</p>
                </CardHeader>
                <CardContent>
                  <BulkDiscountSystem products={products} onProductsUpdate={handleProductsUpdate} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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

        {/* Bulk Upload Modal */}
        {showBulkUpload && (
          <BulkUploadModal
            isOpen={showBulkUpload}
            onClose={() => setShowBulkUpload(false)}
            products={products}
            onComplete={handleBulkUploadComplete}
          />
        )}

        {/* Universal History Modal */}
        {showUniversalHistory && (
          <UniversalHistoryModal isOpen={showUniversalHistory} onClose={() => setShowUniversalHistory(false)} />
        )}

        {/* Product-Specific History Modal */}
        {showProductHistory && selectedProductForHistory && (
          <UniversalHistoryModal
            isOpen={showProductHistory}
            onClose={() => {
              setShowProductHistory(false)
              setSelectedProductForHistory(null)
            }}
            productId={selectedProductForHistory.id}
          />
        )}

        {/* Bulk Pricing Modal */}
        {showBulkPriceEdit && (
          <BulkPriceEditModal
            isOpen={showBulkPriceEdit}
            onClose={() => setShowBulkPriceEdit(false)}
            products={products}
            collections={collections}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
