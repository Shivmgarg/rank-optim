// Bulk upload utilities for SKU-based image management
import JSZip from "jszip"

export interface BulkUploadResult {
  success: boolean
  processedProducts: number
  skippedProducts: number
  errors: string[]
  uploadedImages: number
  logs: BulkUploadLog[]
}

export interface BulkUploadLog {
  id: string
  timestamp: string
  action: "bulk_upload" | "product_update" | "product_delete" | "image_upload"
  productId?: string
  productTitle?: string
  sku?: string
  details: string
  status: "success" | "error" | "warning"
  imagesCount?: number
}

export interface SKUFolder {
  sku: string
  images: File[]
  matchedProduct?: any
}

export async function processZipFile(file: File): Promise<SKUFolder[]> {
  const zip = new JSZip()
  const zipContent = await zip.loadAsync(file)
  const skuFolders: SKUFolder[] = []

  // First, find the parent folder (usually the first directory)
  let parentFolderName = ""
  const topLevelEntries = Object.keys(zipContent.files).filter((path) => {
    const parts = path.split("/")
    return parts.length === 2 && zipContent.files[path].dir // Top level directories
  })

  if (topLevelEntries.length > 0) {
    parentFolderName = topLevelEntries[0].replace("/", "")
  }

  console.log("Found parent folder:", parentFolderName)

  // Process each file in the zip
  for (const [path, zipEntry] of Object.entries(zipContent.files)) {
    if (zipEntry.dir) continue

    const pathParts = path.split("/")

    // Handle nested structure: parentFolder/SKUFolder/image.jpg
    if (pathParts.length < 3) continue // Need at least parent/sku/file.jpg

    const parentFolder = pathParts[0]
    const skuFolderName = pathParts[1]
    const fileName = pathParts[pathParts.length - 1]

    // Skip if not in expected parent folder structure
    if (parentFolderName && parentFolder !== parentFolderName) continue

    // Check if it's an image file
    if (!isImageFile(fileName)) continue

    console.log(`Processing: ${parentFolder}/${skuFolderName}/${fileName}`)

    // Find or create SKU folder
    let skuFolder = skuFolders.find((f) => f.sku === skuFolderName)
    if (!skuFolder) {
      skuFolder = { sku: skuFolderName, images: [] }
      skuFolders.push(skuFolder)
    }

    // Convert zip entry to File
    const blob = await zipEntry.async("blob")
    const imageFile = new File([blob], fileName, { type: getImageMimeType(fileName) })
    skuFolder.images.push(imageFile)
  }

  console.log(
    `Found ${skuFolders.length} SKU folders:`,
    skuFolders.map((f) => f.sku),
  )
  return skuFolders
}

export function isImageFile(fileName: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."))
  return imageExtensions.includes(extension)
}

export function getImageMimeType(fileName: string): string {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."))
  const mimeTypes: { [key: string]: string } = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
  }
  return mimeTypes[extension] || "image/jpeg"
}

export function matchSKUsWithProducts(skuFolders: SKUFolder[], products: any[]): SKUFolder[] {
  return skuFolders.map((skuFolder) => {
    // Find product by SKU in variants
    const matchedProduct = products.find((product) =>
      product.variants?.some((variant: any) => variant.sku === skuFolder.sku),
    )

    return {
      ...skuFolder,
      matchedProduct,
    }
  })
}

export function createBulkUploadLog(
  action: BulkUploadLog["action"],
  details: string,
  status: BulkUploadLog["status"],
  productInfo?: { id?: string; title?: string; sku?: string },
  imagesCount?: number,
): BulkUploadLog {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    productId: productInfo?.id,
    productTitle: productInfo?.title,
    sku: productInfo?.sku,
    details,
    status,
    imagesCount,
  }
}

export function saveBulkUploadLogs(logs: BulkUploadLog[]): void {
  const existingLogs = getBulkUploadLogs()
  const allLogs = [...logs, ...existingLogs].slice(0, 1000) // Keep last 1000 logs
  localStorage.setItem("shopify_bulk_upload_logs", JSON.stringify(allLogs))
}

export function getBulkUploadLogs(): BulkUploadLog[] {
  try {
    const logs = localStorage.getItem("shopify_bulk_upload_logs")
    return logs ? JSON.parse(logs) : []
  } catch {
    return []
  }
}

export function searchLogsBySKU(sku: string): BulkUploadLog[] {
  const logs = getBulkUploadLogs()
  return logs.filter((log) => log.sku === sku)
}

export function searchLogsByProduct(productId: string): BulkUploadLog[] {
  const logs = getBulkUploadLogs()
  return logs.filter((log) => log.productId === productId)
}

export interface ProductHistoryLog extends BulkUploadLog {
  oldPrice?: string
  newPrice?: string
  oldCompareAtPrice?: string
  newCompareAtPrice?: string
  priceChangeType?: "increase" | "decrease"
  priceChangeValue?: number
  priceChangeMethod?: "percentage" | "fixed" | "absolute"
}

export function createPriceUpdateLog(
  action: "bulk_price_update" | "single_price_update",
  details: string,
  status: "success" | "error" | "warning",
  productInfo: { id?: string; title?: string; sku?: string },
  priceInfo?: {
    oldPrice?: string
    newPrice?: string
    oldCompareAtPrice?: string
    newCompareAtPrice?: string
    changeType?: "increase" | "decrease"
    changeValue?: number
    changeMethod?: "percentage" | "fixed" | "absolute"
  },
): ProductHistoryLog {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    productId: productInfo?.id,
    productTitle: productInfo?.title,
    sku: productInfo?.sku,
    details,
    status,
    oldPrice: priceInfo?.oldPrice,
    newPrice: priceInfo?.newPrice,
    oldCompareAtPrice: priceInfo?.oldCompareAtPrice,
    newCompareAtPrice: priceInfo?.newCompareAtPrice,
    priceChangeType: priceInfo?.changeType,
    priceChangeValue: priceInfo?.changeValue,
    priceChangeMethod: priceInfo?.changeMethod,
  }
}

export function getProductHistory(productId: string): ProductHistoryLog[] {
  const logs = getBulkUploadLogs() as ProductHistoryLog[]
  return logs.filter((log) => log.productId === productId)
}

export function getProductHistoryBySKU(sku: string): ProductHistoryLog[] {
  const logs = getBulkUploadLogs() as ProductHistoryLog[]
  return logs.filter((log) => log.sku === sku)
}

export function getPriceUpdateHistory(): ProductHistoryLog[] {
  const logs = getBulkUploadLogs() as ProductHistoryLog[]
  return logs.filter((log) => log.action === "bulk_price_update" || log.action === "single_price_update")
}
