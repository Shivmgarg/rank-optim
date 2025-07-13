"use client"

import { useState, useEffect } from "react"
import {
  X,
  History,
  Search,
  Download,
  Trash2,
  RotateCcw,
  Package,
  DollarSign,
  ImageIcon,
  Layers,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  BarChart3,
  ExternalLink,
  Users,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { universalHistory, type UniversalHistoryEntry, type HistoryFilter } from "@/lib/universal-history"

interface UniversalHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  productId?: string // If provided, show product-specific history
  batchId?: string // If provided, show batch-specific history
}

export function UniversalHistoryModal({ isOpen, onClose, productId, batchId }: UniversalHistoryModalProps) {
  const [entries, setEntries] = useState<UniversalHistoryEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<UniversalHistoryEntry[]>([])
  const [filter, setFilter] = useState<HistoryFilter>({
    operationType: "",
    status: "",
    dateRange: { start: "", end: "" },
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEntry, setSelectedEntry] = useState<UniversalHistoryEntry | null>(null)
  const [rollbackLoading, setRollbackLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [statistics, setStatistics] = useState<any>(null)
  const [showBulkDetails, setShowBulkDetails] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadHistory()
      loadStatistics()
    }
  }, [isOpen, productId, batchId])

  useEffect(() => {
    applyFilters()
  }, [entries, filter, searchTerm, activeTab])

  const loadHistory = () => {
    if (batchId) {
      const batchHistory = universalHistory.getBatchHistory(batchId)
      setEntries(batchHistory)
    } else if (productId) {
      const productHistory = universalHistory.getProductHistory(productId)
      setEntries(productHistory)
    } else {
      const allHistory = universalHistory.getAllEntries()
      setEntries(allHistory)
    }
  }

  const loadStatistics = () => {
    const stats = universalHistory.getStatistics()
    setStatistics(stats)
  }

  const applyFilters = () => {
    let filtered = entries

    // Apply tab filter
    if (activeTab === "bulk") {
      filtered = filtered.filter(
        (entry) =>
          entry.operationData.action === "bulk_operation" || entry.operationData.action === "individual_item_in_bulk",
      )
    } else if (activeTab !== "all") {
      filtered = filtered.filter((entry) => entry.category === activeTab)
    }

    // Apply other filters
    if (filter.operationType) {
      filtered = filtered.filter((entry) => entry.operationType === filter.operationType)
    }

    if (filter.status) {
      filtered = filtered.filter((entry) => entry.status === filter.status)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (entry) =>
          entry.description.toLowerCase().includes(term) ||
          entry.productTitle?.toLowerCase().includes(term) ||
          entry.sku?.toLowerCase().includes(term),
      )
    }

    if (filter.dateRange.start && filter.dateRange.end) {
      const start = new Date(filter.dateRange.start)
      const end = new Date(filter.dateRange.end)
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.timestamp)
        return entryDate >= start && entryDate <= end
      })
    }

    setFilteredEntries(filtered)
  }

  const handleRollback = async (entryId: string) => {
    setRollbackLoading(entryId)
    setMessage(null)

    try {
      const result = await universalHistory.rollbackOperation(entryId)

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        loadHistory() // Refresh history

        // Emit custom event to refresh products without full page reload
        window.dispatchEvent(new CustomEvent("productsUpdated"))
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Rollback failed",
      })
    } finally {
      setRollbackLoading(null)
    }
  }

  const exportHistory = () => {
    const data = universalHistory.exportHistory()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `shopify-history-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all history? This action cannot be undone.")) {
      universalHistory.clearHistory()
      setEntries([])
      setFilteredEntries([])
      loadStatistics()
      setMessage({ type: "info", text: "History cleared successfully" })
    }
  }

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case "product_create":
      case "product_update":
      case "product_delete":
        return <Package className="w-4 h-4" />
      case "bulk_price_update":
      case "bulk_discount":
        return <DollarSign className="w-4 h-4" />
      case "bulk_upload":
      case "image_upload":
        return <ImageIcon className="w-4 h-4" />
      case "collection_update":
        return <Layers className="w-4 h-4" />
      default:
        return <History className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case "pending":
        return <Clock className="w-4 h-4 text-blue-500" />
      default:
        return <History className="w-4 h-4 text-gray-500" />
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
      case "pending":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return "N/A"
    return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`
  }

  const getBulkOperationItems = (batchId: string) => {
    return universalHistory.getBulkOperationItems(batchId)
  }

  const handleViewBulkDetails = (batchId: string) => {
    setShowBulkDetails(batchId)
  }

  const handleViewProductHistory = (productId: string) => {
    // Close current modal and open product-specific history
    onClose()
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("openProductHistory", { detail: { productId } }))
    }, 100)
  }

  if (!isOpen) return null

  const modalTitle = batchId ? "Bulk Operation History" : productId ? "Product History" : "Universal History"

  const modalDescription = batchId
    ? "All operations in this bulk operation"
    : productId
      ? "All operations for this product"
      : "Complete operation history across all systems"

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-7xl max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <History className="w-6 h-6 mr-2" />
              {modalTitle}
            </h2>
            <p className="text-gray-600">{modalDescription}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportHistory}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {!productId && !batchId && (
              <Button variant="outline" onClick={clearHistory}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <Alert
            className={`mb-4 ${
              message.type === "error"
                ? "border-red-200 bg-red-50"
                : message.type === "success"
                  ? "border-green-200 bg-green-50"
                  : "border-blue-200 bg-blue-50"
            }`}
          >
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Dashboard */}
        {statistics && !productId && !batchId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                History Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{statistics.today}</div>
                  <div className="text-sm text-gray-500">Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{statistics.thisWeek}</div>
                  <div className="text-sm text-gray-500">This Week</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{statistics.byStatus.success}</div>
                  <div className="text-sm text-gray-500">Success</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{statistics.byStatus.error}</div>
                  <div className="text-sm text-gray-500">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{statistics.byCategory.bulk}</div>
                  <div className="text-sm text-gray-500">Bulk Ops</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{statistics.byCategory.images}</div>
                  <div className="text-sm text-gray-500">Images</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">{statistics.bulkOperations}</div>
                  <div className="text-sm text-gray-500">Bulk Operations</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search operations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={filter.operationType || "all"}
                onValueChange={(value) => setFilter({ ...filter, operationType: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Operation Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operations</SelectItem>
                  <SelectItem value="product_create">Product Create</SelectItem>
                  <SelectItem value="product_update">Product Update</SelectItem>
                  <SelectItem value="product_delete">Product Delete</SelectItem>
                  <SelectItem value="bulk_upload">Bulk Upload</SelectItem>
                  <SelectItem value="bulk_price_update">Bulk Price Update</SelectItem>
                  <SelectItem value="bulk_discount">Bulk Discount</SelectItem>
                  <SelectItem value="image_upload">Image Upload</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filter.status || "all"}
                onValueChange={(value) => setFilter({ ...filter, status: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Start Date"
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    dateRange: {
                      start: e.target.value,
                      end: filter.dateRange?.end || "",
                    },
                  })
                }
              />

              <Input
                type="date"
                placeholder="End Date"
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    dateRange: {
                      start: filter.dateRange?.start || "",
                      end: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Showing {filteredEntries.length} of {entries.length} operations
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilter({ operationType: "", status: "", dateRange: { start: "", end: "" } })
                  setSearchTerm("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">All Operations</TabsTrigger>
            <TabsTrigger value="product">Products</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "all"
                    ? "All Operations"
                    : activeTab === "product"
                      ? "Product Operations"
                      : activeTab === "pricing"
                        ? "Pricing Operations"
                        : activeTab === "images"
                          ? "Image Operations"
                          : activeTab === "bulk"
                            ? "Bulk Operations"
                            : activeTab === "collections"
                              ? "Collection Operations"
                              : "System Operations"}
                  ({filteredEntries.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {filteredEntries.map((entry) => (
                      <div key={entry.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="mt-1">{getOperationIcon(entry.operationType)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {getStatusIcon(entry.status)}
                                <Badge className={getStatusColor(entry.status)}>{entry.status}</Badge>
                                <Badge variant="outline" className="text-xs">
                                  {entry.operationType.replace("_", " ")}
                                </Badge>
                                {entry.sku && (
                                  <Badge variant="outline" className="text-xs">
                                    SKU: {entry.sku}
                                  </Badge>
                                )}
                                {entry.operationData.affectedCount && (
                                  <Badge variant="outline" className="text-xs">
                                    {entry.operationData.affectedCount} items
                                  </Badge>
                                )}
                                {entry.operationData.action === "bulk_operation" && (
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    <Users className="w-3 h-3 mr-1" />
                                    Bulk Operation
                                  </Badge>
                                )}
                                {entry.operationData.action === "individual_item_in_bulk" && (
                                  <Badge variant="outline" className="text-xs">
                                    Part of Bulk
                                  </Badge>
                                )}
                              </div>

                              <div className="text-sm font-medium text-gray-900 mb-1">{entry.description}</div>

                              {entry.productTitle && (
                                <div className="text-xs text-gray-600 mb-1 flex items-center">
                                  Product: {entry.productTitle}
                                  {entry.productId && !productId && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="ml-2 h-auto p-1"
                                      onClick={() => handleViewProductHistory(entry.productId!)}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              )}

                              {entry.variantTitle && (
                                <div className="text-xs text-gray-600 mb-1">Variant: {entry.variantTitle}</div>
                              )}

                              {entry.metadata?.duration && (
                                <div className="text-xs text-gray-500">
                                  Duration: {formatDuration(entry.metadata.duration)}
                                </div>
                              )}

                              {entry.metadata?.errorDetails && (
                                <div className="text-xs text-red-600 mt-1">Error: {entry.metadata.errorDetails}</div>
                              )}

                              {/* Bulk Operation Summary */}
                              {entry.operationData.action === "bulk_operation" &&
                                entry.metadata?.bulkOperationSummary && (
                                  <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                                    <div className="font-medium text-purple-800">Bulk Operation Summary:</div>
                                    <div className="text-purple-700">
                                      Total: {entry.metadata.bulkOperationSummary.totalItems} | Success:{" "}
                                      {entry.metadata.bulkOperationSummary.successfulItems} | Failed:{" "}
                                      {entry.metadata.bulkOperationSummary.failedItems}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-1 h-auto p-1 text-purple-700"
                                      onClick={() => handleViewBulkDetails(entry.operationData.batchId!)}
                                    >
                                      View Individual Items <ArrowRight className="w-3 h-3 ml-1" />
                                    </Button>
                                  </div>
                                )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <div className="text-xs text-gray-400 text-right">{formatDate(entry.timestamp)}</div>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Operation Details</DialogTitle>
                                </DialogHeader>
                                <HistoryEntryDetails entry={entry} />
                              </DialogContent>
                            </Dialog>

                            {entry.rollbackData?.canRollback && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRollback(entry.id)}
                                disabled={rollbackLoading === entry.id}
                              >
                                {rollbackLoading === entry.id ? (
                                  <Clock className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredEntries.length === 0 && (
                      <div className="text-center py-8 text-gray-500">No operations found matching your criteria</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bulk Details Modal */}
        {showBulkDetails && (
          <Dialog open={!!showBulkDetails} onOpenChange={() => setShowBulkDetails(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Bulk Operation Details</DialogTitle>
              </DialogHeader>
              <BulkOperationDetails batchId={showBulkDetails} onViewProductHistory={handleViewProductHistory} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

// Component to show detailed information about a history entry
function HistoryEntryDetails({ entry }: { entry: UniversalHistoryEntry }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-500">Operation ID</label>
          <div className="text-sm font-mono">{entry.id}</div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Timestamp</label>
          <div className="text-sm">{new Date(entry.timestamp).toLocaleString()}</div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Type</label>
          <div className="text-sm">{entry.operationType}</div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Category</label>
          <div className="text-sm">{entry.category}</div>
        </div>
      </div>

      {entry.productId && (
        <div>
          <label className="text-sm font-medium text-gray-500">Product</label>
          <div className="text-sm">
            {entry.productTitle} ({entry.productId})
          </div>
        </div>
      )}

      {entry.variantId && (
        <div>
          <label className="text-sm font-medium text-gray-500">Variant</label>
          <div className="text-sm">
            {entry.variantTitle} ({entry.variantId})
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-500">Description</label>
        <div className="text-sm">{entry.description}</div>
      </div>

      {entry.operationData.oldValues && (
        <div>
          <label className="text-sm font-medium text-gray-500">Old Values</label>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(entry.operationData.oldValues, null, 2)}
          </pre>
        </div>
      )}

      {entry.operationData.newValues && (
        <div>
          <label className="text-sm font-medium text-gray-500">New Values</label>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(entry.operationData.newValues, null, 2)}
          </pre>
        </div>
      )}

      {entry.rollbackData && (
        <div>
          <label className="text-sm font-medium text-gray-500">Rollback Information</label>
          <div className="text-sm">
            <div>Can Rollback: {entry.rollbackData.canRollback ? "Yes" : "No"}</div>
            <div>Rollback Type: {entry.rollbackData.rollbackType}</div>
          </div>
        </div>
      )}

      {entry.metadata && (
        <div>
          <label className="text-sm font-medium text-gray-500">Metadata</label>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Component to show bulk operation details
function BulkOperationDetails({
  batchId,
  onViewProductHistory,
}: {
  batchId: string
  onViewProductHistory: (productId: string) => void
}) {
  const items = universalHistory.getBulkOperationItems(batchId)

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">Showing {items.length} individual items in this bulk operation</div>

      <ScrollArea className="h-96">
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="border rounded p-3 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.productTitle}</div>
                  {item.variantTitle && <div className="text-xs text-gray-600">{item.variantTitle}</div>}
                  {item.sku && <div className="text-xs text-gray-500">SKU: {item.sku}</div>}
                  <div className="text-xs text-gray-500 mt-1">{new Date(item.timestamp).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-green-100 text-green-800 text-xs">{item.status}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => onViewProductHistory(item.productId!)}>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
