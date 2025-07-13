"use client"

import { useState } from "react"
import {
  DollarSign,
  X,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { createBulkUploadLog, saveBulkUploadLogs } from "@/lib/bulk-upload"

interface Product {
  id: string
  title: string
  handle: string
  status: string
  productType: string
  vendor: string
  tags: string[]
  collections: Array<{
    id: string
    title: string
  }>
  variants: Array<{
    id: string
    title: string
    price: string
    compareAtPrice?: string
    sku: string
    inventoryQuantity: number
    availableForSale: boolean
  }>
}

interface Collection {
  id: string
  title: string
  productsCount: number
}

interface PriceRule {
  type: "percentage" | "fixed" | "absolute"
  value: number
  applyTo: "price" | "compareAtPrice" | "both"
  minPrice?: number
  maxPrice?: number
  maintainMargin?: boolean
  roundingRule?: "none" | "nearest_99" | "nearest_00" | "nearest_95"
}

interface BulkPriceEditModalProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  collections: Collection[]
}

export function BulkPriceEditModal({ isOpen, onClose, products, collections }: BulkPriceEditModalProps) {
  const [step, setStep] = useState<"select" | "preview" | "edit" | "confirm" | "complete">("select")
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [selectedVariants, setSelectedVariants] = useState<string[]>([])
  const [collectionFilter, setCollectionFilter] = useState("all")
  const [tagFilter, setTagFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [priceAction, setPriceAction] = useState<"increase" | "decrease">("increase")
  const [priceRule, setPriceRule] = useState<PriceRule>({
    type: "percentage",
    value: 0,
    applyTo: "price",
    roundingRule: "none",
  })
  const [expandedProducts, setExpandedProducts] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [progress, setProgress] = useState(0)

  if (!isOpen) return null

  // Filter products based on selection criteria
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || product.status === statusFilter
    const matchesCollection =
      collectionFilter === "all" || product.collections.some((col) => col.id === collectionFilter)
    const matchesTag = !tagFilter || product.tags.some((tag) => tag.toLowerCase().includes(tagFilter.toLowerCase()))

    return matchesSearch && matchesStatus && matchesCollection && matchesTag
  })

  const handleProductSelect = (product: Product, selected: boolean) => {
    if (selected) {
      setSelectedProducts([...selectedProducts, product])
      // Auto-select all variants
      const variantIds = product.variants.map((v) => v.id)
      setSelectedVariants([...selectedVariants, ...variantIds])
    } else {
      setSelectedProducts(selectedProducts.filter((p) => p.id !== product.id))
      // Remove all variants of this product
      const variantIds = product.variants.map((v) => v.id)
      setSelectedVariants(selectedVariants.filter((id) => !variantIds.includes(id)))
    }
  }

  const handleVariantSelect = (variantId: string, selected: boolean) => {
    if (selected) {
      setSelectedVariants([...selectedVariants, variantId])
    } else {
      setSelectedVariants(selectedVariants.filter((id) => id !== variantId))
    }
  }

  const handleSelectAll = () => {
    setSelectedProducts(filteredProducts)
    const allVariantIds = filteredProducts.flatMap((p) => p.variants.map((v) => v.id))
    setSelectedVariants(allVariantIds)
  }

  const handleClearAll = () => {
    setSelectedProducts([])
    setSelectedVariants([])
  }

  const calculateNewPrice = (currentPrice: string, rule: PriceRule, action: "increase" | "decrease") => {
    const price = Number.parseFloat(currentPrice)
    let newPrice = price

    console.log(`Calculating price for ${currentPrice}:`, { rule, action })

    if (rule.type === "percentage") {
      const multiplier = action === "increase" ? 1 + rule.value / 100 : 1 - rule.value / 100
      newPrice = price * multiplier
    } else if (rule.type === "fixed") {
      newPrice = action === "increase" ? price + rule.value : price - rule.value
    } else if (rule.type === "absolute") {
      newPrice = rule.value
    }

    console.log(`Before business rules: ${newPrice}`)

    // Apply minimum price rule only
    if (newPrice < 0.01) {
      newPrice = 0.01
    }

    // Remove maximum price cap for luxury products - let Shopify handle limits
    // Shopify's actual limit is much higher than $99,999

    console.log(`After business rules: ${newPrice}`)

    // Apply rounding rules
    if (rule.roundingRule === "nearest_99") {
      newPrice = Math.floor(newPrice) + 0.99
    } else if (rule.roundingRule === "nearest_00") {
      newPrice = Math.round(newPrice)
    } else if (rule.roundingRule === "nearest_95") {
      newPrice = Math.floor(newPrice) + 0.95
    }

    console.log(`Final calculated price: ${newPrice.toFixed(2)}`)

    return newPrice.toFixed(2)
  }

  const getSelectedVariantsData = () => {
    const variantsData = []
    for (const product of selectedProducts) {
      for (const variant of product.variants) {
        if (selectedVariants.includes(variant.id)) {
          let newPrice = variant.price
          let newCompareAtPrice = variant.compareAtPrice

          // Only calculate new price if we're applying to sale price
          if (priceRule.applyTo === "price" || priceRule.applyTo === "both") {
            newPrice = calculateNewPrice(variant.price, priceRule, priceAction)
          }

          // Only calculate new compare-at price if we're applying to it and it exists
          if ((priceRule.applyTo === "compareAtPrice" || priceRule.applyTo === "both") && variant.compareAtPrice) {
            newCompareAtPrice = calculateNewPrice(variant.compareAtPrice, priceRule, priceAction)
          }

          variantsData.push({
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            variantTitle: variant.title,
            sku: variant.sku,
            currentPrice: variant.price,
            currentCompareAtPrice: variant.compareAtPrice,
            newPrice,
            newCompareAtPrice,
            inventoryQuantity: variant.inventoryQuantity,
            availableForSale: variant.availableForSale,
          })
        }
      }
    }
    return variantsData
  }

  const handleBulkPriceUpdate = async () => {
    setProcessing(true)
    setStep("processing")
    setProgress(0)

    try {
      const variantsData = getSelectedVariantsData()
      console.log("Starting bulk price update for variants:", variantsData.length)

      const response = await fetch("/api/bulk-price-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variants: variantsData,
          rule: priceRule,
          action: priceAction,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log("Bulk price update result:", result)

      // Log the bulk operation summary
      const summaryLog = createBulkUploadLog(
        "bulk_price_update",
        `Bulk ${priceAction} operation: ${priceRule.type} ${priceRule.value}${priceRule.type === "percentage" ? "%" : ""} - ${result.successful}/${result.total} variants updated`,
        result.success ? "success" : "error",
        { title: `${selectedProducts.length} products` },
        result.successful,
      )

      saveBulkUploadLogs([summaryLog])

      setResult(result)
      setStep("complete")
    } catch (error) {
      console.error("Bulk price update error:", error)
      const variantsData = getSelectedVariantsData()
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        successful: 0,
        failed: variantsData?.length || 0,
        total: variantsData?.length || 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
      setResult(errorResult)
      setStep("complete")
    } finally {
      setProcessing(false)
      setProgress(100)
    }
  }

  const reset = () => {
    setStep("select")
    setSelectedProducts([])
    setSelectedVariants([])
    setCollectionFilter("all")
    setTagFilter("")
    setStatusFilter("all")
    setSearchTerm("")
    setPriceAction("increase")
    setPriceRule({
      type: "percentage",
      value: 0,
      applyTo: "price",
      roundingRule: "none",
    })
    setExpandedProducts([])
    setProcessing(false)
    setResult(null)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <DollarSign className="w-6 h-6 mr-2" />
            Bulk Price Editor
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step === "select" ? "text-blue-600" : "text-gray-400"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === "select" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                1
              </div>
              <span className="ml-2">Select Products</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center ${step === "preview" ? "text-blue-600" : "text-gray-400"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === "preview" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                2
              </div>
              <span className="ml-2">Preview Selection</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center ${step === "edit" ? "text-blue-600" : "text-gray-400"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === "edit" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                3
              </div>
              <span className="ml-2">Price Rules</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center ${step === "confirm" ? "text-blue-600" : "text-gray-400"}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === "confirm" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                4
              </div>
              <span className="ml-2">Confirm</span>
            </div>
          </div>
        </div>

        {/* Step 1: Product Selection */}
        {step === "select" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Products for Price Update</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={collectionFilter} onValueChange={setCollectionFilter}>
                    <SelectTrigger>
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
                  <Input
                    placeholder="Filter by tag..."
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                  />
                </div>

                {/* Bulk Actions */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      Select All ({filteredProducts.length})
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearAll}>
                      Clear All
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedProducts.length} products, {selectedVariants.length} variants selected
                  </div>
                </div>

                {/* Product List */}
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <Card key={product.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedProducts.some((p) => p.id === product.id)}
                              onCheckedChange={(checked) => handleProductSelect(product, checked as boolean)}
                            />
                            <div>
                              <div className="font-medium">{product.title}</div>
                              <div className="text-sm text-gray-500">
                                {product.variants.length} variants • {product.productType} • {product.vendor}
                              </div>
                              <div className="flex gap-1 mt-1">
                                {product.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={product.status === "active" ? "default" : "secondary"}>
                              {product.status}
                            </Badge>
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  {expandedProducts.includes(product.id) ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-2">
                                <div className="space-y-2">
                                  {product.variants.map((variant) => (
                                    <div
                                      key={variant.id}
                                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={selectedVariants.includes(variant.id)}
                                          onCheckedChange={(checked) =>
                                            handleVariantSelect(variant.id, checked as boolean)
                                          }
                                        />
                                        <div>
                                          <div className="text-sm font-medium">{variant.title}</div>
                                          <div className="text-xs text-gray-500">SKU: {variant.sku}</div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-medium">${variant.price}</div>
                                        {variant.compareAtPrice && (
                                          <div className="text-xs text-gray-500 line-through">
                                            ${variant.compareAtPrice}
                                          </div>
                                        )}
                                        <div className="text-xs text-gray-500">Stock: {variant.inventoryQuantity}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setStep("preview")} disabled={selectedProducts.length === 0}>
                Next: Preview Selection
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview Selection */}
        {step === "preview" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview Selected Products & Variants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{selectedProducts.length}</div>
                      <div className="text-sm text-gray-500">Products Selected</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{selectedVariants.length}</div>
                      <div className="text-sm text-gray-500">Variants Selected</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        $
                        {selectedProducts
                          .reduce(
                            (sum, p) =>
                              sum +
                              p.variants
                                .filter((v) => selectedVariants.includes(v.id))
                                .reduce((vSum, v) => vSum + Number.parseFloat(v.price), 0),
                            0,
                          )
                          .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-gray-500">Total Current Value</div>
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {selectedProducts.map((product) => (
                      <Card key={product.id} className="p-4">
                        <div className="font-medium mb-2">{product.title}</div>
                        <div className="space-y-2">
                          {product.variants
                            .filter((v) => selectedVariants.includes(v.id))
                            .map((variant) => (
                              <div
                                key={variant.id}
                                className="flex justify-between items-center p-2 bg-gray-50 rounded"
                              >
                                <div>
                                  <div className="text-sm font-medium">{variant.title}</div>
                                  <div className="text-xs text-gray-500">SKU: {variant.sku}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">
                                    $
                                    {Number.parseFloat(variant.price).toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </div>
                                  {variant.compareAtPrice && (
                                    <div className="text-xs text-gray-500 line-through">
                                      Compare: $
                                      {Number.parseFloat(variant.compareAtPrice).toLocaleString("en-US", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500">Stock: {variant.inventoryQuantity}</div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("select")}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Selection
              </Button>
              <Button onClick={() => setStep("edit")}>
                Next: Set Price Rules
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Price Rules */}
        {step === "edit" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configure Price Update Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={priceAction} onValueChange={(value) => setPriceAction(value as "increase" | "decrease")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="increase" className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Increase Prices
                    </TabsTrigger>
                    <TabsTrigger value="decrease" className="flex items-center">
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Decrease Prices
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="increase" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Price Change Type</Label>
                        <Select
                          value={priceRule.type}
                          onValueChange={(value) =>
                            setPriceRule({ ...priceRule, type: value as "percentage" | "fixed" | "absolute" })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage Increase</SelectItem>
                            <SelectItem value="fixed">Fixed Amount Increase</SelectItem>
                            <SelectItem value="absolute">Set Absolute Price</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>
                          {priceRule.type === "percentage"
                            ? "Percentage (%)"
                            : priceRule.type === "fixed"
                              ? "Amount ($)"
                              : "New Price ($)"}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={priceRule.value}
                          onChange={(e) =>
                            setPriceRule({ ...priceRule, value: Number.parseFloat(e.target.value) || 0 })
                          }
                          placeholder={priceRule.type === "percentage" ? "10" : "5000.00"}
                        />
                      </div>

                      <div>
                        <Label>Apply To</Label>
                        <Select
                          value={priceRule.applyTo}
                          onValueChange={(value) =>
                            setPriceRule({ ...priceRule, applyTo: value as "price" | "compareAtPrice" | "both" })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="price">Sale Price Only</SelectItem>
                            <SelectItem value="compareAtPrice">Compare At Price Only</SelectItem>
                            <SelectItem value="both">Both Prices</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Rounding Rule</Label>
                        <Select
                          value={priceRule.roundingRule}
                          onValueChange={(value) => setPriceRule({ ...priceRule, roundingRule: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Rounding</SelectItem>
                            <SelectItem value="nearest_99">Round to .99</SelectItem>
                            <SelectItem value="nearest_00">Round to .00</SelectItem>
                            <SelectItem value="nearest_95">Round to .95</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="decrease" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Price Change Type</Label>
                        <Select
                          value={priceRule.type}
                          onValueChange={(value) =>
                            setPriceRule({ ...priceRule, type: value as "percentage" | "fixed" | "absolute" })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage Decrease</SelectItem>
                            <SelectItem value="fixed">Fixed Amount Decrease</SelectItem>
                            <SelectItem value="absolute">Set Absolute Price</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>
                          {priceRule.type === "percentage"
                            ? "Percentage (%)"
                            : priceRule.type === "fixed"
                              ? "Amount ($)"
                              : "New Price ($)"}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={priceRule.type === "percentage" ? "100" : undefined}
                          value={priceRule.value}
                          onChange={(e) =>
                            setPriceRule({ ...priceRule, value: Number.parseFloat(e.target.value) || 0 })
                          }
                          placeholder={priceRule.type === "percentage" ? "10" : "5000.00"}
                        />
                      </div>

                      <div>
                        <Label>Apply To</Label>
                        <Select
                          value={priceRule.applyTo}
                          onValueChange={(value) =>
                            setPriceRule({ ...priceRule, applyTo: value as "price" | "compareAtPrice" | "both" })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="price">Sale Price Only</SelectItem>
                            <SelectItem value="compareAtPrice">Compare At Price Only</SelectItem>
                            <SelectItem value="both">Both Prices</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Rounding Rule</Label>
                        <Select
                          value={priceRule.roundingRule}
                          onValueChange={(value) => setPriceRule({ ...priceRule, roundingRule: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Rounding</SelectItem>
                            <SelectItem value="nearest_99">Round to .99</SelectItem>
                            <SelectItem value="nearest_00">Round to .00</SelectItem>
                            <SelectItem value="nearest_95">Round to .95</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                          <div>
                            <div className="font-medium text-yellow-800">Price Decrease Warning</div>
                            <div className="text-sm text-yellow-700">
                              Decreasing prices will be limited to a minimum of $0.01. Large percentage decreases may
                              significantly impact profit margins.
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Price Preview */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-blue-800">Price Change Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-blue-700">
                      {priceRule.type === "percentage" && (
                        <div>
                          {priceAction === "increase" ? "Increase" : "Decrease"} all selected prices by{" "}
                          {priceRule.value}%
                          {priceRule.roundingRule !== "none" &&
                            ` (rounded to ${priceRule.roundingRule.replace("nearest_", ".")})`}
                        </div>
                      )}
                      {priceRule.type === "fixed" && (
                        <div>
                          {priceAction === "increase" ? "Add" : "Subtract"} $
                          {priceRule.value.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          {priceAction === "increase" ? "to" : "from"} all selected prices
                          {priceRule.roundingRule !== "none" &&
                            ` (rounded to ${priceRule.roundingRule.replace("nearest_", ".")})`}
                        </div>
                      )}
                      {priceRule.type === "absolute" && (
                        <div>
                          Set all selected prices to $
                          {priceRule.value.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("preview")}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Preview
              </Button>
              <Button onClick={() => setStep("confirm")} disabled={priceRule.value <= 0}>
                Next: Confirm Changes
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm Changes */}
        {step === "confirm" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Confirm Price Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Card className="bg-gray-50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Action</div>
                          <div className="font-medium">
                            {priceAction === "increase" ? "Increase" : "Decrease"} Prices
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Method</div>
                          <div className="font-medium">
                            {priceRule.type === "percentage"
                              ? `${priceRule.value}% ${priceAction}`
                              : priceRule.type === "fixed"
                                ? `$${priceRule.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${priceAction}`
                                : `Set to $${priceRule.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Apply To</div>
                          <div className="font-medium">
                            {priceRule.applyTo === "price"
                              ? "Sale Price"
                              : priceRule.applyTo === "compareAtPrice"
                                ? "Compare At Price"
                                : "Both Prices"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Rounding</div>
                          <div className="font-medium">
                            {priceRule.roundingRule === "none"
                              ? "No Rounding"
                              : `Round to ${priceRule.roundingRule.replace("nearest_", ".")}`}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {getSelectedVariantsData().map((variant) => (
                      <div key={variant.variantId} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <div className="font-medium">{variant.productTitle}</div>
                          <div className="text-sm text-gray-600">{variant.variantTitle}</div>
                          <div className="text-xs text-gray-500">SKU: {variant.sku}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <div>
                              <div className="text-sm text-gray-500">Current</div>
                              <div className="font-medium">
                                $
                                {Number.parseFloat(variant.currentPrice).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm text-gray-500">New</div>
                              <div className="font-medium text-green-600">
                                $
                                {Number.parseFloat(variant.newPrice).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                          </div>
                          {variant.currentCompareAtPrice && (
                            <div className="text-xs text-gray-500 mt-1">
                              Compare: $
                              {Number.parseFloat(variant.currentCompareAtPrice).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              → $
                              {Number.parseFloat(variant.newCompareAtPrice || "0").toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("edit")}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Rules
              </Button>
              <Button onClick={handleBulkPriceUpdate} disabled={processing} className="bg-green-600 hover:bg-green-700">
                {processing ? "Updating Prices..." : "Apply Price Changes"}
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === "processing" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Updating Prices...</h3>
              <p className="text-gray-600">Please wait while we update your product prices in Shopify.</p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-gray-500">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    Updating {selectedVariants.length} variants across {selectedProducts.length} products
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === "complete" && result && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Price Update Complete!</h3>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{result.successful || 0}</div>
                    <div className="text-sm text-gray-500">Successfully Updated</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{result.failed || 0}</div>
                    <div className="text-sm text-gray-500">Failed Updates</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{result.total || 0}</div>
                    <div className="text-sm text-gray-500">Total Processed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.errors && result.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    {result.errors.map((error: string, index: number) => (
                      <div key={index} className="text-sm text-red-600 p-1">
                        • {error}
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
