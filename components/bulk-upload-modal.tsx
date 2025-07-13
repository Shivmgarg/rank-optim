"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, X, CheckCircle, FileImage, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  processZipFile,
  matchSKUsWithProducts,
  createBulkUploadLog,
  saveBulkUploadLogs,
  type SKUFolder,
  type BulkUploadResult,
} from "@/lib/bulk-upload"

interface BulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
  products: any[]
  onComplete: (result: BulkUploadResult) => void
}

export function BulkUploadModal({ isOpen, onClose, products, onComplete }: BulkUploadModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "processing" | "complete">("upload")
  const [skuFolders, setSkuFolders] = useState<SKUFolder[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<BulkUploadResult | null>(null)
  const [currentProcessing, setCurrentProcessing] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".zip")) {
      alert("Please upload a ZIP file")
      return
    }

    try {
      setProcessing(true)
      console.log("Processing ZIP file:", file.name)

      const folders = await processZipFile(file)
      console.log("Extracted SKU folders:", folders)

      if (folders.length === 0) {
        alert(
          "No SKU folders found in ZIP file. Please check the folder structure:\n\nExpected: ZIP → Parent Folder → SKU Folders → Images",
        )
        return
      }

      const matchedFolders = matchSKUsWithProducts(folders, products)
      console.log("Matched folders:", matchedFolders)

      setSkuFolders(matchedFolders)
      setStep("preview")
    } catch (error) {
      console.error("Error processing ZIP file:", error)
      alert(
        "Error processing ZIP file: " +
          error +
          "\n\nPlease check that your ZIP file has the correct structure:\nZIP → Parent Folder → SKU Folders → Images",
      )
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkUpload = async () => {
    setStep("processing")
    setProgress(0)

    const logs: any[] = []
    let processedProducts = 0
    let skippedProducts = 0
    let uploadedImages = 0
    const errors: string[] = []

    const matchedFolders = skuFolders.filter((folder) => folder.matchedProduct)
    const totalFolders = matchedFolders.length

    console.log(`Starting bulk upload for ${totalFolders} products`)

    for (let i = 0; i < matchedFolders.length; i++) {
      const folder = matchedFolders[i]
      const product = folder.matchedProduct

      setCurrentProcessing(`Processing ${folder.sku} (${i + 1}/${totalFolders}) - ${folder.images.length} images`)
      console.log(`Processing SKU: ${folder.sku}, Product: ${product.title}, Images: ${folder.images.length}`)

      try {
        const formData = new FormData()
        formData.append("productId", product.id)

        folder.images.forEach((image, index) => {
          console.log(`Adding image ${index + 1}: ${image.name} (${image.type}, ${(image.size / 1024).toFixed(1)}KB)`)
          formData.append("images", image)
        })

        console.log(`Uploading ${folder.images.length} images for SKU ${folder.sku}`)

        const response = await fetch("/api/bulk-upload", {
          method: "POST",
          body: formData,
        })

        const responseText = await response.text()
        console.log("API Response:", { status: response.status, responseLength: responseText.length })

        let result
        try {
          result = JSON.parse(responseText)
        } catch (parseError) {
          console.error("Failed to parse response:", parseError)
          throw new Error(`Invalid response: ${responseText.substring(0, 200)}...`)
        }

        if (result.success && result.uploadedImages > 0) {
          processedProducts++
          uploadedImages += result.uploadedImages || 0

          const successMessage = `Successfully uploaded ${result.uploadedImages}/${result.totalImages} images for SKU ${folder.sku}`
          console.log(successMessage)

          logs.push(
            createBulkUploadLog(
              "bulk_upload",
              successMessage,
              "success",
              { id: product.id, title: product.title, sku: folder.sku },
              result.uploadedImages,
            ),
          )

          // Add individual errors if some images failed
          if (result.errors?.length > 0) {
            result.errors.forEach((error: string) => {
              errors.push(`SKU ${folder.sku}: ${error}`)
              console.warn(`Image error for ${folder.sku}:`, error)
            })
          }
        } else {
          skippedProducts++
          const errorMessage = `Failed to upload images for SKU ${folder.sku}: ${result.error || "No images uploaded"}`
          errors.push(errorMessage)
          console.error(errorMessage)

          logs.push(
            createBulkUploadLog("bulk_upload", errorMessage, "error", {
              id: product.id,
              title: product.title,
              sku: folder.sku,
            }),
          )

          // Add detailed errors
          if (result.errors?.length > 0) {
            result.errors.forEach((error: string) => {
              errors.push(`SKU ${folder.sku}: ${error}`)
            })
          }
        }
      } catch (error) {
        skippedProducts++
        const errorMsg = `Error uploading images for SKU ${folder.sku}: ${error instanceof Error ? error.message : error}`
        errors.push(errorMsg)
        console.error(errorMsg)

        logs.push(
          createBulkUploadLog("bulk_upload", errorMsg, "error", {
            id: product.id,
            title: product.title,
            sku: folder.sku,
          }),
        )
      }

      setProgress(((i + 1) / totalFolders) * 100)
    }

    // Handle unmatched SKUs
    const unmatchedFolders = skuFolders.filter((folder) => !folder.matchedProduct)
    unmatchedFolders.forEach((folder) => {
      skippedProducts++
      const warningMsg = `No product found for SKU: ${folder.sku}`
      errors.push(warningMsg)

      logs.push(createBulkUploadLog("bulk_upload", warningMsg, "warning", { sku: folder.sku }))
    })

    // Save logs
    saveBulkUploadLogs(logs)

    const finalResult: BulkUploadResult = {
      success: processedProducts > 0,
      processedProducts,
      skippedProducts,
      errors,
      uploadedImages,
      logs,
    }

    console.log("Final result:", finalResult)
    setResult(finalResult)
    setStep("complete")
    setCurrentProcessing("")
    onComplete(finalResult)
  }

  const reset = () => {
    setStep("upload")
    setSkuFolders([])
    setProcessing(false)
    setProgress(0)
    setResult(null)
    setCurrentProcessing("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Bulk Image Upload by SKU</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {step === "upload" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload ZIP File with SKU Folders</h3>
                <p className="text-gray-500 mb-4">
                  Upload a ZIP file containing folders named with SKU numbers. Each folder should contain product
                  images.
                </p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".zip" className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} disabled={processing}>
                  {processing ? "Processing..." : "Choose ZIP File"}
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="w-5 h-5 mr-2 text-blue-500" />
                  Instructions & Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Create a ZIP file with a parent folder (e.g., "mvpimages")</li>
                  <li>Inside the parent folder, create folders named with SKU numbers (e.g., "mvp1", "mvp2")</li>
                  <li>Place product images inside each SKU folder</li>
                  <li>Supported formats: JPG, PNG, GIF, WebP, BMP (max 20MB each)</li>
                  <li>Structure: mvpimages.zip → mvpimages/ → mvp1/ → images</li>
                  <li>SKU folders must match exactly with product variant SKUs in Shopify</li>
                  <li>Images will be uploaded using Shopify REST API for reliability</li>
                </ol>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Example Structure:</h4>
                  <pre className="text-xs text-blue-800">
                    {`mvpimages.zip
└── mvpimages/
    ├── mvp1/
    │   ├── image1.jpg
    │   └── image2.png
    ├── mvp2/
    │   └── product.jpg
    └── mvp3/
        ├── main.jpg
        └── detail.png`}
                  </pre>
                </div>
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Upload Methods:</h4>
                  <ul className="text-xs text-green-800 space-y-1">
                    <li>• Small files (&lt;5MB): Direct REST API upload</li>
                    <li>• Large files (&gt;5MB): Staged upload for better reliability</li>
                    <li>• Maximum file size: 20MB per image</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Preview Upload</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>
                  Back
                </Button>
                <Button onClick={handleBulkUpload} disabled={skuFolders.length === 0}>
                  Start Upload ({skuFolders.filter((f) => f.matchedProduct).length} products)
                </Button>
              </div>
            </div>

            {/* Debug Information */}
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-sm">Upload Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <strong>SKU folders found:</strong> {skuFolders.length}
                  </div>
                  <div>
                    <strong>Products matched:</strong> {skuFolders.filter((f) => f.matchedProduct).length}
                  </div>
                  <div>
                    <strong>Unmatched SKUs:</strong> {skuFolders.filter((f) => !f.matchedProduct).length}
                  </div>
                  <div>
                    <strong>Total images:</strong> {skuFolders.reduce((sum, f) => sum + f.images.length, 0)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">✅ Matched SKUs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {skuFolders
                      .filter((folder) => folder.matchedProduct)
                      .map((folder) => (
                        <div key={folder.sku} className="flex items-center justify-between p-2 border-b">
                          <div>
                            <div className="font-medium">{folder.sku}</div>
                            <div className="text-sm text-gray-500">{folder.matchedProduct.title}</div>
                            <div className="text-xs text-gray-400">ID: {folder.matchedProduct.id}</div>
                          </div>
                          <Badge variant="outline">
                            <FileImage className="w-3 h-3 mr-1" />
                            {folder.images.length}
                          </Badge>
                        </div>
                      ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">❌ Unmatched SKUs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {skuFolders
                      .filter((folder) => !folder.matchedProduct)
                      .map((folder) => (
                        <div key={folder.sku} className="flex items-center justify-between p-2 border-b">
                          <div>
                            <div className="font-medium">{folder.sku}</div>
                            <div className="text-sm text-red-500">No matching product found</div>
                            <div className="text-xs text-gray-400">Check SKU in product variants</div>
                          </div>
                          <Badge variant="outline">
                            <FileImage className="w-3 h-3 mr-1" />
                            {folder.images.length}
                          </Badge>
                        </div>
                      ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-4">Uploading Images to Shopify...</h3>
              <Progress value={progress} className="w-full mb-2" />
              <p className="text-sm text-gray-500">{Math.round(progress)}% complete</p>
              {currentProcessing && (
                <div className="flex items-center justify-center mt-4">
                  <AlertCircle className="w-4 h-4 mr-2 text-blue-500 animate-spin" />
                  <span className="text-sm text-blue-600">{currentProcessing}</span>
                </div>
              )}
            </div>
            <Card className="bg-blue-50">
              <CardContent className="pt-4">
                <div className="text-xs text-blue-800">
                  <div>• Using Shopify REST API for reliable image uploads</div>
                  <div>• Large files (&gt;5MB) use staged upload method</div>
                  <div>• Processing may take longer for high-resolution images</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "complete" && result && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload Complete!</h3>
              <p className="text-sm text-gray-600">
                {result.success
                  ? `Successfully processed ${result.processedProducts} products`
                  : "Upload completed with some issues"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.processedProducts}</div>
                    <div className="text-sm text-gray-500">Products Updated</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.uploadedImages}</div>
                    <div className="text-sm text-gray-500">Images Uploaded</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{result.skippedProducts}</div>
                    <div className="text-sm text-gray-500">SKUs Skipped</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {result.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Detailed Errors ({result.errors.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600 p-2 border-b">
                        <div className="flex items-start">
                          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
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
