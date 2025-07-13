"use client"

import { useState, useEffect } from "react"
import { X, History, DollarSign, Upload, Edit, TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getProductHistory, getProductHistoryBySKU, type ProductHistoryLog } from "@/lib/bulk-upload"

interface ProductHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: string
    title: string
    variants: Array<{
      id: string
      title: string
      sku: string
      price: string
      compareAtPrice?: string
    }>
  }
}

export function ProductHistoryModal({ isOpen, onClose, product }: ProductHistoryModalProps) {
  const [productLogs, setProductLogs] = useState<ProductHistoryLog[]>([])
  const [variantLogs, setVariantLogs] = useState<{ [sku: string]: ProductHistoryLog[] }>({})
  const [activeTab, setActiveTab] = useState("overview")
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")

  useEffect(() => {
    if (isOpen && product) {
      // Get product-level history
      const productHistory = getProductHistory(product.id)
      setProductLogs(productHistory)

      // Get variant-level history by SKU
      const variantHistory: { [sku: string]: ProductHistoryLog[] } = {}
      product.variants.forEach((variant) => {
        if (variant.sku) {
          variantHistory[variant.sku] = getProductHistoryBySKU(variant.sku)
        }
      })
      setVariantLogs(variantHistory)
    }
  }, [isOpen, product])

  if (!isOpen || !product) return null

  const getAllLogs = () => {
    const allLogs = [...productLogs, ...Object.values(variantLogs).flat()]
    return allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const getFilteredLogs = (logs: ProductHistoryLog[]) => {
    return logs.filter((log) => {
      const matchesAction = actionFilter === "all" || log.action === actionFilter
      const matchesStatus = statusFilter === "all" || log.status === statusFilter

      let matchesDate = true
      if (dateFilter !== "all") {
        const logDate = new Date(log.timestamp)
        const now = new Date()
        const daysDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24))

        switch (dateFilter) {
          case "today":
            matchesDate = daysDiff === 0
            break
          case "week":
            matchesDate = daysDiff <= 7
            break
          case "month":
            matchesDate = daysDiff <= 30
            break
        }
      }

      return matchesAction && matchesStatus && matchesDate
    })
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "bulk_price_update":
      case "single_price_update":
        return <DollarSign className="w-4 h-4" />
      case "bulk_upload":
      case "image_upload":
        return <Upload className="w-4 h-4" />
      case "product_update":
        return <Edit className="w-4 h-4" />
      default:
        return <History className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatPriceChange = (log: ProductHistoryLog) => {
    if (log.oldPrice && log.newPrice) {
      const oldPrice = Number.parseFloat(log.oldPrice)
      const newPrice = Number.parseFloat(log.newPrice)
      const change = newPrice - oldPrice
      const changePercent = ((change / oldPrice) * 100).toFixed(1)

      return (
        <div className="text-xs">
          <div className="flex items-center gap-2">
            <span>${log.oldPrice}</span>
            {change > 0 ? (
              <TrendingUp className="w-3 h-3 text-green-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-600" />
            )}
            <span>${log.newPrice}</span>
          </div>
          <div className={`text-xs ${change > 0 ? "text-green-600" : "text-red-600"}`}>
            {change > 0 ? "+" : ""}
            {change.toFixed(2)} ({changePercent}%)
          </div>
        </div>
      )
    }
    return null
  }

  const priceUpdateLogs = getAllLogs().filter(
    (log) => log.action === "bulk_price_update" || log.action === "single_price_update",
  )

  const imageUploadLogs = getAllLogs().filter((log) => log.action === "bulk_upload" || log.action === "image_upload")

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <History className="w-6 h-6 mr-2" />
              Product History
            </h2>
            <p className="text-gray-600">{product.title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="bulk_price_update">Price Updates</SelectItem>
                  <SelectItem value="bulk_upload">Image Uploads</SelectItem>
                  <SelectItem value="product_update">Product Updates</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-sm text-gray-500 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {getFilteredLogs(getAllLogs()).length} entries
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pricing">Price History</TabsTrigger>
            <TabsTrigger value="images">Image History</TabsTrigger>
            <TabsTrigger value="variants">By Variant</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {getAllLogs().filter((log) => log.status === "success").length}
                    </div>
                    <div className="text-sm text-gray-500">Successful Actions</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{priceUpdateLogs.length}</div>
                    <div className="text-sm text-gray-500">Price Updates</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{imageUploadLogs.length}</div>
                    <div className="text-sm text-gray-500">Image Uploads</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {getFilteredLogs(getAllLogs())
                      .slice(0, 20)
                      .map((log) => (
                        <div key={log.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="mt-1">{getActionIcon(log.action)}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                                  <span className="text-sm font-medium capitalize">{log.action.replace("_", " ")}</span>
                                  {log.sku && (
                                    <Badge variant="outline" className="text-xs">
                                      SKU: {log.sku}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 mb-2">{log.details}</div>
                                {formatPriceChange(log)}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">{formatDate(log.timestamp)}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price History Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Price Update History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {getFilteredLogs(priceUpdateLogs).map((log) => (
                      <div key={log.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <DollarSign className="w-5 h-5 mt-1 text-green-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                                {log.sku && (
                                  <Badge variant="outline" className="text-xs">
                                    SKU: {log.sku}
                                  </Badge>
                                )}
                                {log.priceChangeType && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.priceChangeType} {log.priceChangeValue}
                                    {log.priceChangeMethod === "percentage" ? "%" : ""}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mb-2">{log.details}</div>
                              {formatPriceChange(log)}
                              {log.oldCompareAtPrice && log.newCompareAtPrice && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Compare At: ${log.oldCompareAtPrice} → ${log.newCompareAtPrice}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">{formatDate(log.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Image History Tab */}
          <TabsContent value="images" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Image Upload History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {getFilteredLogs(imageUploadLogs).map((log) => (
                      <div key={log.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <Upload className="w-5 h-5 mt-1 text-blue-600" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                                {log.sku && (
                                  <Badge variant="outline" className="text-xs">
                                    SKU: {log.sku}
                                  </Badge>
                                )}
                                {log.imagesCount && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.imagesCount} images
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">{log.details}</div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">{formatDate(log.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Variant Tab */}
          <TabsContent value="variants" className="space-y-4">
            {product.variants.map((variant) => (
              <Card key={variant.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {variant.title} - SKU: {variant.sku}
                  </CardTitle>
                  <div className="text-sm text-gray-600">
                    Current Price: ${variant.price}
                    {variant.compareAtPrice && <span className="ml-2">Compare At: ${variant.compareAtPrice}</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {getFilteredLogs(variantLogs[variant.sku] || []).map((log) => (
                        <div key={log.id} className="border rounded p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2">
                              {getActionIcon(log.action)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={getStatusColor(log.status)} size="sm">
                                    {log.status}
                                  </Badge>
                                  <span className="text-xs font-medium">{log.action.replace("_", " ")}</span>
                                </div>
                                <div className="text-xs text-gray-600">{log.details}</div>
                                {formatPriceChange(log)}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">{formatDate(log.timestamp)}</div>
                          </div>
                        </div>
                      ))}
                      {(!variantLogs[variant.sku] || variantLogs[variant.sku].length === 0) && (
                        <div className="text-center py-4 text-gray-500 text-sm">No history found for this variant</div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
