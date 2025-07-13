"use client"

import { useState, useEffect } from "react"
import { X, Search, Calendar, Package, Upload, Edit, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getBulkUploadLogs, type BulkUploadLog } from "@/lib/bulk-upload"

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  products: any[]
}

export function HistoryModal({ isOpen, onClose, products }: HistoryModalProps) {
  const [logs, setLogs] = useState<BulkUploadLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<BulkUploadLog[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    if (isOpen) {
      const allLogs = getBulkUploadLogs()
      setLogs(allLogs)
      setFilteredLogs(allLogs)
    }
  }, [isOpen])

  useEffect(() => {
    let filtered = logs

    // Filter by search term (SKU, product title, or details)
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.productTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.details.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by action
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter)
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((log) => log.status === statusFilter)
    }

    setFilteredLogs(filtered)
  }, [logs, searchTerm, actionFilter, statusFilter])

  const getActionIcon = (action: string) => {
    switch (action) {
      case "bulk_upload":
        return <Upload className="w-4 h-4" />
      case "product_update":
        return <Edit className="w-4 h-4" />
      case "product_delete":
        return <Trash2 className="w-4 h-4" />
      case "image_upload":
        return <Package className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
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

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all history? This action cannot be undone.")) {
      localStorage.removeItem("shopify_bulk_upload_logs")
      setLogs([])
      setFilteredLogs([])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Activity History</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearHistory}>
              Clear History
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by SKU, product, or details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="bulk_upload">Bulk Upload</SelectItem>
                  <SelectItem value="product_update">Product Update</SelectItem>
                  <SelectItem value="product_delete">Product Delete</SelectItem>
                  <SelectItem value="image_upload">Image Upload</SelectItem>
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

              <div className="text-sm text-gray-500 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {filteredLogs.length} of {logs.length} entries
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {logs.length === 0 ? "No activity history found" : "No entries match your filters"}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
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
                              {log.imagesCount && (
                                <Badge variant="outline" className="text-xs">
                                  {log.imagesCount} images
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mb-1">{log.details}</div>
                            {log.productTitle && (
                              <div className="text-xs text-gray-500">Product: {log.productTitle}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">{formatDate(log.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {logs.filter((log) => log.status === "success").length}
                </div>
                <div className="text-sm text-gray-500">Successful Operations</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {logs.filter((log) => log.status === "error").length}
                </div>
                <div className="text-sm text-gray-500">Failed Operations</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {logs.filter((log) => log.action === "bulk_upload").length}
                </div>
                <div className="text-sm text-gray-500">Bulk Uploads</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {logs.reduce((sum, log) => sum + (log.imagesCount || 0), 0)}
                </div>
                <div className="text-sm text-gray-500">Total Images Uploaded</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
