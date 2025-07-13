// Universal History System for all Shopify operations
export interface UniversalHistoryEntry {
  id: string
  timestamp: string
  operationType:
    | "product_create"
    | "product_update"
    | "product_delete"
    | "bulk_upload"
    | "bulk_price_update"
    | "bulk_discount"
    | "image_upload"
    | "collection_update"
  category: "product" | "pricing" | "images" | "bulk" | "collections"
  productId?: string
  productTitle?: string
  variantId?: string
  variantTitle?: string
  sku?: string
  collectionId?: string
  collectionTitle?: string
  description: string
  status: "success" | "error" | "warning" | "pending"

  // Operation details
  operationData: {
    action: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
    affectedCount?: number
    batchId?: string // For grouping bulk operations
    parentBatchId?: string // For linking individual operations to bulk operations
  }

  // Rollback information
  rollbackData?: {
    canRollback: boolean
    rollbackType: "api_call" | "batch_operation" | "file_restore"
    rollbackPayload?: any
    dependencies?: string[] // Other operations that depend on this
  }

  // User and context
  userAgent?: string
  ipAddress?: string
  sessionId?: string

  // Metadata
  metadata?: {
    duration?: number
    errorDetails?: string
    affectedProducts?: string[]
    affectedVariants?: string[]
    fileNames?: string[]
    imageUrls?: string[]
    bulkOperationSummary?: {
      totalItems: number
      successfulItems: number
      failedItems: number
      operationType: string
    }
  }
}

export interface HistoryFilter {
  category?: string
  operationType?: string
  status?: string
  dateRange?: {
    start: string
    end: string
  }
  productId?: string
  searchTerm?: string
  batchId?: string
}

export interface RollbackResult {
  success: boolean
  message: string
  affectedEntries: string[]
  errors?: string[]
}

class UniversalHistoryManager {
  private readonly STORAGE_KEY = "shopify_universal_history"
  private readonly MAX_ENTRIES = 5000

  // Create a new history entry
  createEntry(entry: Omit<UniversalHistoryEntry, "id" | "timestamp">): UniversalHistoryEntry {
    const historyEntry: UniversalHistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    }

    this.saveEntry(historyEntry)
    return historyEntry
  }

  // Create bulk operation with individual product entries
  createBulkOperation(
    operationType: UniversalHistoryEntry["operationType"],
    category: UniversalHistoryEntry["category"],
    description: string,
    affectedItems: Array<{
      productId: string
      productTitle: string
      variantId?: string
      variantTitle?: string
      sku?: string
      oldValues: any
      newValues: any
    }>,
    rollbackPayload?: any,
  ): { batchId: string; entries: UniversalHistoryEntry[] } {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const entries: UniversalHistoryEntry[] = []

    // Create main bulk operation entry
    const mainEntry = this.createEntry({
      operationType,
      category,
      description: `${description} (${affectedItems.length} items)`,
      status: "success",
      operationData: {
        action: "bulk_operation",
        affectedCount: affectedItems.length,
        batchId,
      },
      rollbackData: rollbackPayload
        ? {
            canRollback: true,
            rollbackType: "batch_operation",
            rollbackPayload,
          }
        : undefined,
      metadata: {
        bulkOperationSummary: {
          totalItems: affectedItems.length,
          successfulItems: affectedItems.length,
          failedItems: 0,
          operationType,
        },
        affectedProducts: affectedItems.map((item) => item.productId),
        affectedVariants: affectedItems.map((item) => item.variantId).filter(Boolean) as string[],
      },
    })
    entries.push(mainEntry)

    // Create individual entries for each affected item
    affectedItems.forEach((item) => {
      const individualEntry = this.createEntry({
        operationType,
        category,
        productId: item.productId,
        productTitle: item.productTitle,
        variantId: item.variantId,
        variantTitle: item.variantTitle,
        sku: item.sku,
        description: `${description}: ${item.productTitle}${item.variantTitle ? ` - ${item.variantTitle}` : ""}`,
        status: "success",
        operationData: {
          action: "individual_item_in_bulk",
          oldValues: item.oldValues,
          newValues: item.newValues,
          batchId,
          parentBatchId: batchId,
        },
        rollbackData: {
          canRollback: true,
          rollbackType: "api_call",
          rollbackPayload: {
            id: item.variantId || item.productId,
            ...item.oldValues,
          },
        },
      })
      entries.push(individualEntry)
    })

    return { batchId, entries }
  }

  // Save entry to storage
  private saveEntry(entry: UniversalHistoryEntry): void {
    const entries = this.getAllEntries()
    entries.unshift(entry) // Add to beginning

    // Keep only the most recent entries
    const trimmedEntries = entries.slice(0, this.MAX_ENTRIES)

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedEntries))
    } catch (error) {
      console.error("Failed to save history entry:", error)
    }
  }

  // Get all history entries
  getAllEntries(): UniversalHistoryEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Failed to load history entries:", error)
      return []
    }
  }

  // Get filtered entries
  getFilteredEntries(filter: HistoryFilter): UniversalHistoryEntry[] {
    let entries = this.getAllEntries()

    if (filter.category) {
      entries = entries.filter((entry) => entry.category === filter.category)
    }

    if (filter.operationType) {
      entries = entries.filter((entry) => entry.operationType === filter.operationType)
    }

    if (filter.status) {
      entries = entries.filter((entry) => entry.status === filter.status)
    }

    if (filter.productId) {
      entries = entries.filter(
        (entry) => entry.productId === filter.productId || entry.metadata?.affectedProducts?.includes(filter.productId),
      )
    }

    if (filter.batchId) {
      entries = entries.filter(
        (entry) =>
          entry.operationData.batchId === filter.batchId || entry.operationData.parentBatchId === filter.batchId,
      )
    }

    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase()
      entries = entries.filter(
        (entry) =>
          entry.description.toLowerCase().includes(term) ||
          entry.productTitle?.toLowerCase().includes(term) ||
          entry.sku?.toLowerCase().includes(term),
      )
    }

    if (filter.dateRange) {
      const start = new Date(filter.dateRange.start)
      const end = new Date(filter.dateRange.end)
      entries = entries.filter((entry) => {
        const entryDate = new Date(entry.timestamp)
        return entryDate >= start && entryDate <= end
      })
    }

    return entries
  }

  // Get entries for a specific product
  getProductHistory(productId: string): UniversalHistoryEntry[] {
    return this.getAllEntries().filter(
      (entry) => entry.productId === productId || entry.metadata?.affectedProducts?.includes(productId),
    )
  }

  // Get entries for a batch operation
  getBatchHistory(batchId: string): UniversalHistoryEntry[] {
    return this.getAllEntries().filter(
      (entry) => entry.operationData.batchId === batchId || entry.operationData.parentBatchId === batchId,
    )
  }

  // Get bulk operations only (main entries, not individual items)
  getBulkOperations(): UniversalHistoryEntry[] {
    return this.getAllEntries().filter((entry) => entry.operationData.action === "bulk_operation")
  }

  // Get individual items for a bulk operation
  getBulkOperationItems(batchId: string): UniversalHistoryEntry[] {
    return this.getAllEntries().filter((entry) => entry.operationData.parentBatchId === batchId)
  }

  // Rollback an operation
  async rollbackOperation(entryId: string): Promise<RollbackResult> {
    const entry = this.getAllEntries().find((e) => e.id === entryId)

    if (!entry) {
      return {
        success: false,
        message: "History entry not found",
        affectedEntries: [],
      }
    }

    if (!entry.rollbackData?.canRollback) {
      return {
        success: false,
        message: "This operation cannot be rolled back",
        affectedEntries: [],
      }
    }

    try {
      const result = await this.executeRollback(entry)

      if (result.success) {
        // Create a rollback history entry
        this.createEntry({
          operationType: entry.operationType,
          category: entry.category,
          productId: entry.productId,
          productTitle: entry.productTitle,
          variantId: entry.variantId,
          variantTitle: entry.variantTitle,
          sku: entry.sku,
          description: `Rolled back: ${entry.description}`,
          status: "success",
          operationData: {
            action: "rollback",
            oldValues: entry.operationData.newValues,
            newValues: entry.operationData.oldValues,
            batchId: entry.operationData.batchId,
          },
          rollbackData: {
            canRollback: false,
            rollbackType: "api_call",
          },
          metadata: {
            ...entry.metadata,
            originalEntryId: entryId,
          },
        })
      }

      return result
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Rollback failed",
        affectedEntries: [],
      }
    }
  }

  // Execute the actual rollback
  private async executeRollback(entry: UniversalHistoryEntry): Promise<RollbackResult> {
    switch (entry.rollbackData?.rollbackType) {
      case "api_call":
        return await this.executeApiRollback(entry)
      case "batch_operation":
        return await this.executeBatchRollback(entry)
      case "file_restore":
        return await this.executeFileRollback(entry)
      default:
        throw new Error("Unknown rollback type")
    }
  }

  // Execute API-based rollback
  private async executeApiRollback(entry: UniversalHistoryEntry): Promise<RollbackResult> {
    const { rollbackPayload } = entry.rollbackData!

    switch (entry.operationType) {
      case "product_update":
        const response = await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rollbackPayload),
        })

        if (response.ok) {
          return {
            success: true,
            message: "Product successfully rolled back",
            affectedEntries: [entry.id],
          }
        } else {
          throw new Error("Failed to rollback product")
        }

      case "bulk_price_update":
        const priceResponse = await fetch("/api/bulk-price-rollback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rollbackPayload),
        })

        if (priceResponse.ok) {
          return {
            success: true,
            message: "Bulk price update successfully rolled back",
            affectedEntries: [entry.id],
          }
        } else {
          throw new Error("Failed to rollback bulk price update")
        }

      case "bulk_discount":
        const discountResponse = await fetch("/api/rollback-discount-enhanced", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rollbackPayload),
        })

        if (discountResponse.ok) {
          return {
            success: true,
            message: "Bulk discount successfully rolled back",
            affectedEntries: [entry.id],
          }
        } else {
          throw new Error("Failed to rollback bulk discount")
        }

      default:
        throw new Error(`Rollback not implemented for ${entry.operationType}`)
    }
  }

  // Execute batch rollback
  private async executeBatchRollback(entry: UniversalHistoryEntry): Promise<RollbackResult> {
    const batchEntries = this.getBulkOperationItems(entry.operationData.batchId!)
    const results: string[] = []
    const errors: string[] = []

    for (const batchEntry of batchEntries) {
      try {
        const result = await this.executeApiRollback(batchEntry)
        if (result.success) {
          results.push(...result.affectedEntries)
        } else {
          errors.push(`Failed to rollback ${batchEntry.id}: ${result.message}`)
        }
      } catch (error) {
        errors.push(`Error rolling back ${batchEntry.id}: ${error}`)
      }
    }

    return {
      success: errors.length === 0,
      message: `Rolled back ${results.length} operations${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
      affectedEntries: results,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  // Execute file-based rollback
  private async executeFileRollback(entry: UniversalHistoryEntry): Promise<RollbackResult> {
    // Implementation for file-based rollbacks (e.g., image deletions)
    throw new Error("File rollback not yet implemented")
  }

  // Clear all history
  clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  // Export history
  exportHistory(): string {
    const entries = this.getAllEntries()
    return JSON.stringify(entries, null, 2)
  }

  // Import history
  importHistory(jsonData: string): boolean {
    try {
      const entries = JSON.parse(jsonData)
      if (Array.isArray(entries)) {
        localStorage.setItem(this.STORAGE_KEY, jsonData)
        return true
      }
      return false
    } catch (error) {
      console.error("Failed to import history:", error)
      return false
    }
  }

  // Get statistics
  getStatistics() {
    const entries = this.getAllEntries()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return {
      total: entries.length,
      today: entries.filter((e) => new Date(e.timestamp) >= today).length,
      thisWeek: entries.filter((e) => new Date(e.timestamp) >= thisWeek).length,
      thisMonth: entries.filter((e) => new Date(e.timestamp) >= thisMonth).length,
      byCategory: {
        product: entries.filter((e) => e.category === "product").length,
        pricing: entries.filter((e) => e.category === "pricing").length,
        images: entries.filter((e) => e.category === "images").length,
        bulk: entries.filter((e) => e.category === "bulk").length,
        collections: entries.filter((e) => e.category === "collections").length,
      },
      byStatus: {
        success: entries.filter((e) => e.status === "success").length,
        error: entries.filter((e) => e.status === "error").length,
        warning: entries.filter((e) => e.status === "warning").length,
        pending: entries.filter((e) => e.status === "pending").length,
      },
      bulkOperations: entries.filter((e) => e.operationData.action === "bulk_operation").length,
    }
  }
}

// Export singleton instance
export const universalHistory = new UniversalHistoryManager()

// Helper functions for creating specific types of history entries
export const createProductHistoryEntry = (
  action: string,
  productId: string,
  productTitle: string,
  oldValues: any,
  newValues: any,
  status: "success" | "error" | "warning" = "success",
) => {
  return universalHistory.createEntry({
    operationType: "product_update",
    category: "product",
    productId,
    productTitle,
    description: `${action}: ${productTitle}`,
    status,
    operationData: {
      action,
      oldValues,
      newValues,
    },
    rollbackData: {
      canRollback: true,
      rollbackType: "api_call",
      rollbackPayload: {
        id: productId,
        ...oldValues,
      },
    },
  })
}

export const createBulkHistoryEntry = (
  operationType: UniversalHistoryEntry["operationType"],
  category: UniversalHistoryEntry["category"],
  description: string,
  affectedItems: Array<{
    productId: string
    productTitle: string
    variantId?: string
    variantTitle?: string
    sku?: string
    oldValues: any
    newValues: any
  }>,
  rollbackPayload?: any,
) => {
  return universalHistory.createBulkOperation(operationType, category, description, affectedItems, rollbackPayload)
}

export const createImageHistoryEntry = (
  action: string,
  productId: string,
  productTitle: string,
  imageUrls: string[],
  status: "success" | "error" | "warning" = "success",
) => {
  return universalHistory.createEntry({
    operationType: "image_upload",
    category: "images",
    productId,
    productTitle,
    description: `${action}: ${imageUrls.length} images for ${productTitle}`,
    status,
    operationData: {
      action,
      affectedCount: imageUrls.length,
    },
    metadata: {
      imageUrls,
    },
    rollbackData: {
      canRollback: false, // Image deletion rollback is complex
      rollbackType: "file_restore",
    },
  })
}
