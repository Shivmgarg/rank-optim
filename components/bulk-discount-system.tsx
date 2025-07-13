"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Search,
  Check,
  X,
  AlertCircle,
  Loader2,
  RotateCcw,
  Calendar,
  Filter,
  Package,
  Settings,
  ChevronDown,
  ChevronUp,
  Tag,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createBulkHistoryEntry } from "@/lib/universal-history"

interface Product {
  id: string
  title: string
  images: Array<{
    id: string
    url: string
    altText: string
  }>
  variants: Array<{
    id: string
    title: string
    price: string
    compareAtPrice?: string
    sku: string
    currentDiscount?: number
    priceHistory?: PriceHistoryEntry[]
  }>
  status: string
  tags: string[]
  collections: Array<{
    id: string
    title: string
  }>
  productType: string
  vendor: string
}

interface PriceHistoryEntry {
  date: string
  price: string
  compareAtPrice: string | null
  discountPercentage: number
  action: string
}

interface Collection {
  id: string
  title: string
  handle: string
  description: string
  productsCount: number
}

interface DiscountResult {
  variantId: string
  productTitle: string
  variantTitle: string
  success: boolean
  error?: string
  originalPrice: string
  newPrice: string
  compareAtPrice: string
}

interface BulkDiscountSystemProps {
  products: Product[]
  onProductsUpdate?: (updatedProducts: Product[]) => void
}

export function BulkDiscountSystem({ products, onProductsUpdate }: BulkDiscountSystemProps) {
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [skuSearch, setSkuSearch] = useState("")
  const [debouncedSkuSearch, setDebouncedSkuSearch] = useState("")
  const [selectedCollection, setSelectedCollection] = useState("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedVariants, setSelectedVariants] = useState<string[]>([])
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)

  // Discount settings
  const [discountPercentage, setDiscountPercentage] = useState<number>(10)
  const [expiryDate, setExpiryDate] = useState("")
  const [showDiscountPanel, setShowDiscountPanel] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  // UI states
  const [isApplying, setIsApplying] = useState(false)
  const [results, setResults] = useState<DiscountResult[]>([])
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [isLoadingCollections, setIsLoadingCollections] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  // Data states
  const [localProducts, setLocalProducts] = useState<Product[]>(products)
  const [collections, setCollections] = useState<Collection[]>([])

  // Progress tracking states
  const [isProcessing, setIsProcessing] = useState(false)
  const [processProgress, setProcessProgress] = useState({
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    current: "",
  })

  // Show/hide discount panel based on selection
  useEffect(() => {
    if (selectedVariants.length > 0) {
      setShowDiscountPanel(true)
    } else {
      setShowDiscountPanel(false)
      setIsPanelCollapsed(false)
    }
  }, [selectedVariants.length])

  // Debounce search terms for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSkuSearch(skuSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [skuSearch])

  // Fetch collections on component mount
  useEffect(() => {
    const fetchCollections = async () => {
      setIsLoadingCollections(true)
      try {
        const response = await fetch("/api/collections")
        if (response.ok) {
          const data = await response.json()
          console.log("Collections fetched:", data)

          // Handle different response formats
          let collectionsData = []
          if (data.collections && Array.isArray(data.collections)) {
            collectionsData = data.collections
          } else if (data.body && data.body.data && data.body.data.collections) {
            collectionsData = data.body.data.collections.edges?.map((edge: any) => edge.node) || []
          } else if (Array.isArray(data)) {
            collectionsData = data
          }

          // Transform collections to ensure consistent format
          const formattedCollections = collectionsData.map((collection: any) => ({
            id: collection.id,
            title: collection.title || collection.name || "Untitled Collection",
            handle: collection.handle || "",
            description: collection.description || "",
            productsCount: collection.productsCount?.count || collection.productsCount || 0,
          }))

          setCollections(formattedCollections)
          console.log("Formatted collections:", formattedCollections)
        } else {
          console.error("Failed to fetch collections:", response.status)
          setCollections([])
        }
      } catch (error) {
        console.error("Error fetching collections:", error)
        setCollections([])
      } finally {
        setIsLoadingCollections(false)
      }
    }

    fetchCollections()
  }, [])

  // Extract unique tags from products with proper cleaning and deduplication
  const availableTags = useMemo(() => {
    const allTags = new Set<string>()

    localProducts.forEach((product) => {
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach((tag) => {
          if (tag && typeof tag === "string" && tag.trim()) {
            // Keep original case but clean whitespace
            const cleanTag = tag.trim()
            allTags.add(cleanTag)
          }
        })
      }
    })

    const sortedTags = Array.from(allTags).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    console.log("Available tags extracted:", sortedTags)
    return sortedTags
  }, [localProducts])

  // Universal search function with comprehensive filtering
  const filteredProducts = useMemo(() => {
    setIsSearching(true)
    console.log("Filtering products with:", {
      searchTerm: debouncedSearchTerm,
      skuSearch: debouncedSkuSearch,
      selectedCollection,
      selectedTags,
      totalProducts: localProducts.length,
    })

    let filtered = [...localProducts]

    // Search by product name (debounced)
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase().trim()
      filtered = filtered.filter((product) => {
        return (
          product.title?.toLowerCase().includes(searchLower) ||
          product.productType?.toLowerCase().includes(searchLower) ||
          product.vendor?.toLowerCase().includes(searchLower) ||
          (product.tags &&
            Array.isArray(product.tags) &&
            product.tags.some((tag) => tag?.toLowerCase().includes(searchLower))) ||
          (product.variants &&
            Array.isArray(product.variants) &&
            product.variants.some(
              (variant) =>
                variant.title?.toLowerCase().includes(searchLower) || variant.sku?.toLowerCase().includes(searchLower),
            ))
        )
      })
    }

    // Search by SKU (debounced)
    if (debouncedSkuSearch) {
      const skuLower = debouncedSkuSearch.toLowerCase().trim()
      filtered = filtered.filter(
        (product) =>
          product.variants &&
          Array.isArray(product.variants) &&
          product.variants.some((variant) => variant.sku && variant.sku.toLowerCase().includes(skuLower)),
      )
    }

    // Filter by collection
    if (selectedCollection !== "all") {
      filtered = filtered.filter(
        (product) =>
          product.collections &&
          Array.isArray(product.collections) &&
          product.collections.some((collection) => collection.id === selectedCollection),
      )
    }

    // Filter by tags - Enhanced logic with exact matching
    if (selectedTags.length > 0) {
      console.log("Filtering by selected tags:", selectedTags)
      filtered = filtered.filter((product) => {
        if (!product.tags || !Array.isArray(product.tags)) {
          console.log(`Product ${product.title} has no tags`)
          return false
        }

        // Check if any selected tag matches any product tag (case-insensitive)
        const hasMatchingTag = selectedTags.some((selectedTag) => {
          const matches = product.tags.some((productTag) => {
            if (typeof productTag === "string" && typeof selectedTag === "string") {
              return productTag.trim().toLowerCase() === selectedTag.trim().toLowerCase()
            }
            return false
          })
          if (matches) {
            console.log(`Tag match found for product ${product.title}: ${selectedTag}`)
          }
          return matches
        })

        return hasMatchingTag
      })
    }

    console.log("Filtered products count:", filtered.length)
    setTimeout(() => setIsSearching(false), 100)
    return filtered
  }, [localProducts, debouncedSearchTerm, debouncedSkuSearch, selectedCollection, selectedTags])

  // Calculate current discount function
  const calculateCurrentDiscount = useCallback((price: string, compareAtPrice?: string) => {
    if (!compareAtPrice || !price) return 0
    const priceNum = Number.parseFloat(price)
    const compareNum = Number.parseFloat(compareAtPrice)
    if (isNaN(priceNum) || isNaN(compareNum) || compareNum <= priceNum) return 0
    return Math.round(((compareNum - priceNum) / compareNum) * 100)
  }, [])

  // Get all variants from filtered products with enhanced data
  const allVariants = useMemo(() => {
    return filteredProducts.flatMap((product) =>
      (product.variants || []).map((variant) => {
        const currentDiscount = calculateCurrentDiscount(variant.price, variant.compareAtPrice)
        return {
          ...variant,
          productId: product.id,
          productTitle: product.title,
          productImage:
            product.images && product.images.length > 0 ? product.images[0].url : "/placeholder.svg?height=40&width=40",
          productStatus: product.status,
          productTags: product.tags || [],
          productType: product.productType || "",
          productVendor: product.vendor || "",
          currentDiscount,
        }
      }),
    )
  }, [filteredProducts, calculateCurrentDiscount])

  // Get failed results for display
  const failedResults = useMemo(() => {
    return results.filter(result => !result.success)
  }, [results])

  // Get successful results for display
  const successfulResults = useMemo(() => {
    return results.filter(result => result.success)
  }, [results])

  // Update local products when props change
  useEffect(() => {
    setLocalProducts(products)
  }, [products])

  // Listen for product updates from history system
  useEffect(() => {
    const handleProductsUpdated = () => {
      fetchUpdatedProducts()
    }

    window.addEventListener("productsUpdated", handleProductsUpdated)
    return () => window.removeEventListener("productsUpdated", handleProductsUpdated)
  }, [])

  const fetchUpdatedProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        const updatedProducts = data.products || []
        setLocalProducts(updatedProducts)
        if (onProductsUpdate) {
          onProductsUpdate(updatedProducts)
        }
      }
    } catch (error) {
      console.error("Error fetching updated products:", error)
    }
  }, [onProductsUpdate])

  // Handle variant selection
  const handleVariantSelect = useCallback((variantId: string, checked: boolean) => {
    if (checked) {
      setSelectedVariants((prev) => [...prev, variantId])
    } else {
      setSelectedVariants((prev) => prev.filter((id) => id !== variantId))
    }
  }, [])

  // Select all variants
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedVariants(allVariants.map((v) => v.id))
      } else {
        setSelectedVariants([])
      }
    },
    [allVariants],
  )

  // Handle tag selection with improved logic
  const handleTagSelect = useCallback((tag: string, checked: boolean) => {
    console.log("Tag selection:", tag, checked)
    if (checked) {
      setSelectedTags((prev) => {
        if (!prev.some((t) => t.toLowerCase() === tag.toLowerCase())) {
          const newTags = [...prev, tag]
          console.log("Added tag, new selected tags:", newTags)
          return newTags
        }
        return prev
      })
    } else {
      setSelectedTags((prev) => {
        const newTags = prev.filter((t) => t.toLowerCase() !== tag.toLowerCase())
        console.log("Removed tag, updated selected tags:", newTags)
        return newTags
      })
    }
  }, [])

  // Calculate preview prices
  const calculatePreviewPrice = useCallback(
    (currentPrice: string, compareAtPrice: string | undefined, discount: number) => {
      const price = Number.parseFloat(currentPrice)
      const comparePrice = compareAtPrice ? Number.parseFloat(compareAtPrice) : null

      if (comparePrice && comparePrice > price) {
        // Type 2: Has compare_at_price (already discounted)
        const newPrice = comparePrice * (1 - discount / 100)
        return {
          newPrice: newPrice.toFixed(2),
          newCompareAtPrice: comparePrice.toFixed(2),
          type: "Type 2: Already has discount",
        }
      } else {
        // Type 1: No compare_at_price (original price)
        const newPrice = price * (1 - discount / 100)
        return {
          newPrice: newPrice.toFixed(2),
          newCompareAtPrice: price.toFixed(2),
          type: "Type 1: Original price",
        }
      }
    },
    [],
  )

  // Apply discount function with parallel processing for speed
const applyDiscount = useCallback(async () => {
  if (selectedVariants.length === 0) {
    setMessage({ type: "error", text: "Please select at least one variant to apply discount." })
    return
  }

  if (discountPercentage <= 0 || discountPercentage >= 100) {
    setMessage({ type: "error", text: "Please enter a valid discount percentage between 1 and 99." })
    return
  }

  if (expiryDate && new Date(expiryDate) <= new Date()) {
    setMessage({ type: "error", text: "Expiry date must be in the future." })
    return
  }

  setIsApplying(true)
  setIsProcessing(true)
  setMessage(null)
  setResults([])

  // Initialize progress tracking
  setProcessProgress({
    total: selectedVariants.length,
    completed: 0,
    successful: 0,
    failed: 0,
    current: "Starting parallel processing...",
  })

  const allResults: DiscountResult[] = []
  let completed = 0
  let successful = 0
  let failed = 0

  try {
    // Process variants in batches of 2 to respect Shopify rate limits
    const batchSize = 2
    const batches = []
    
    for (let i = 0; i < selectedVariants.length; i += batchSize) {
      batches.push(selectedVariants.slice(i, i + batchSize))
    }

    // Process each batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      // Update status for current batch
      setProcessProgress(prev => ({
        ...prev,
        current: `Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)...`,
      }))

      // Process all items in current batch simultaneously
      const batchPromises = batch.map(async (variantId) => {
        const variant = allVariants.find(v => v.id === variantId)
        const displayName = variant ? `${variant.productTitle} - ${variant.title}` : `Variant`
        
        try {
          // Process single variant
          const response = await fetch("/api/apply-discount", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              variantIds: [variantId],
              discountPercentage: discountPercentage,
              expiryDate: expiryDate || null,
            }),
          })

          const data = await response.json()

          if (response.ok && data.results && data.results.length > 0) {
            const result = data.results[0]
            return { result, success: result.success, displayName }
          } else {
            // Handle API error
            return {
              result: {
                variantId,
                productTitle: variant?.productTitle || "Unknown Product",
                variantTitle: variant?.title || "Unknown Variant",
                success: false,
                error: data.error || "API request failed",
                originalPrice: variant?.price || "0.00",
                newPrice: "0.00",
                compareAtPrice: "0.00",
              },
              success: false,
              displayName
            }
          }
        } catch (error) {
          // Handle network/processing error
          return {
            result: {
              variantId,
              productTitle: variant?.productTitle || "Unknown Product",
              variantTitle: variant?.title || "Unknown Variant",
              success: false,
              error: error instanceof Error ? error.message : "Processing failed",
              originalPrice: variant?.price || "0.00",
              newPrice: "0.00",
              compareAtPrice: "0.00",
            },
            success: false,
            displayName
          }
        }
      })

      // Wait for all items in current batch to complete
      const batchResults = await Promise.all(batchPromises)
      
      // Process batch results
      batchResults.forEach(({ result, success, displayName }) => {
        allResults.push(result)
        completed++
        
        if (success) {
          successful++
        } else {
          failed++
        }

        // Update progress in real-time
        setProcessProgress({
          total: selectedVariants.length,
          completed,
          successful,
          failed,
          current: `✅ Completed: ${displayName}`,
        })

        // Update results in real-time
        setResults([...allResults])
      })

      // Respect Shopify rate-limit: pause 1.1s between batches
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1100))
      }
    }

    // Final completion status
    setProcessProgress({
      total: selectedVariants.length,
      completed: selectedVariants.length,
      successful,
      failed,
      current: `🚀 All ${selectedVariants.length} items processed! ${successful} successful, ${failed} failed`,
    })

    // Create history entries for successful operations
    const affectedItems = allResults
      .filter((r: DiscountResult) => r.success)
      .map((result: DiscountResult) => {
        const variant = allVariants.find((v) => v.id === result.variantId)
        return {
          productId: variant?.productId || "",
          productTitle: result.productTitle,
          variantId: result.variantId,
          variantTitle: result.variantTitle,
          sku: variant?.sku || "",
          oldValues: {
            price: result.originalPrice,
            compareAtPrice: variant?.compareAtPrice || null,
          },
          newValues: {
            price: result.newPrice,
            compareAtPrice: result.compareAtPrice,
            discountPercentage: discountPercentage,
          },
        }
      })

    if (affectedItems.length > 0) {
      createBulkHistoryEntry(
        "bulk_discount",
        "pricing",
        `Bulk Discount Applied: ${discountPercentage}% off`,
        affectedItems,
        {
          variantIds: selectedVariants,
          originalDiscountPercentage: discountPercentage,
          expiryDate: expiryDate || null,
        },
      )
    }

    // Set final message
    if (failed === 0) {
      setMessage({
        type: "success",
        text: `🚀 Successfully applied ${discountPercentage}% discount to all ${successful} variants${
          expiryDate ? ` (expires ${new Date(expiryDate).toLocaleDateString()})` : ""
        }!`,
      })
    } else if (successful > 0) {
      setMessage({
        type: "info",
        text: `⚡ Applied discount to ${successful} variants. ${failed} failed - see failed products below for details.`,
      })
    } else {
      setMessage({
        type: "error",
        text: `❌ All ${failed} variants failed to update. Check failed products below for details.`,
      })
    }

    // Refresh products data
    await fetchUpdatedProducts()
    setSelectedVariants([])

  } catch (error) {
    setMessage({ type: "error", text: "❌ Network error occurred. Please try again." })
    setProcessProgress(prev => ({
      ...prev,
      current: "❌ Process failed due to network error",
    }))
  } finally {
    setIsApplying(false)
    // Keep processing state visible for 2 seconds to show completion
    setTimeout(() => {
      setIsProcessing(false)
      setProcessProgress({
        total: 0,
        completed: 0,
        successful: 0,
        failed: 0,
        current: "",
      })
    }, 2000)
  }
}, [selectedVariants, discountPercentage, expiryDate, allVariants, fetchUpdatedProducts])

  // ---------- place this AFTER the applyDiscount definition ----------
  const retryFailedItems = useCallback(() => {
    const failedVariantIds = failedResults.map(r => r.variantId)

    if (failedVariantIds.length === 0) {
      setMessage({ type: "error", text: "No failed items to retry." })
      return
    }

    // Select only the failed variants, then re-run applyDiscount
    setSelectedVariants(failedVariantIds)

    // Wait a tick so state updates first
    setTimeout(() => {
      applyDiscount()
    }, 0)
  }, [failedResults, applyDiscount, setSelectedVariants, setMessage])

  // Rollback discounts function with parallel processing
  const rollbackDiscounts = useCallback(async () => {
    if (selectedVariants.length === 0) {
      setMessage({ type: "error", text: "Please select variants to rollback." })
      return
    }

    setIsApplying(true)
    setIsProcessing(true)
    setMessage(null)

    // Initialize progress tracking
    setProcessProgress({
      total: selectedVariants.length,
      completed: 0,
      successful: 0,
      failed: 0,
      current: "Starting parallel rollback...",
    })

    let completed = 0
    let successful = 0
    let failed = 0

    try {
      // Process variants in batches of 2 to respect Shopify rate limits
      const batchSize = 2
      const batches = []
      
      for (let i = 0; i < selectedVariants.length; i += batchSize) {
        batches.push(selectedVariants.slice(i, i + batchSize))
      }

      // Process each batch in parallel
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]
        
        // Update status for current batch
        setProcessProgress(prev => ({
          ...prev,
          current: `Rolling back batch ${batchIndex + 1}/${batches.length} (${batch.length} items)...`,
        }))

        // Process all items in current batch simultaneously
        const batchPromises = batch.map(async (variantId) => {
          const variant = allVariants.find(v => v.id === variantId)
          const displayName = variant ? `${variant.productTitle} - ${variant.title}` : `Variant`
          
          try {
            const response = await fetch("/api/rollback-discount", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ variantIds: [variantId] }),
            })

            const data = await response.json()
            return { success: response.ok, displayName }
          } catch (error) {
            return { success: false, displayName }
          }
        })

        // Wait for all items in current batch to complete
        const batchResults = await Promise.all(batchPromises)
        
        // Process batch results
        batchResults.forEach(({ success, displayName }) => {
          completed++
          
          if (success) {
            successful++
          } else {
            failed++
          }

          // Update progress in real-time
          setProcessProgress({
            total: selectedVariants.length,
            completed,
            successful,
            failed,
            current: `✅ Rolled back: ${displayName}`,
          })
        })

        // Pause 1.1s after each batch to stay under 2 req/s
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100))
        }
      }

      // Final completion status
      setProcessProgress({
        total: selectedVariants.length,
        completed: selectedVariants.length,
        successful: successful,
        failed: failed,
        current: `🚀 Rollback completed! ${successful} successful, ${failed}`,
      })

      // Create history entry
      const affectedItems = selectedVariants.map((variantId) => {
        const variant = allVariants.find((v) => v.id === variantId)
        return {
          productId: variant?.productId || "",
          productTitle: variant?.productTitle || "",
          variantId: variantId,
          variantTitle: variant?.title || "",
          sku: variant?.sku || "",
          oldValues: {
            price: variant?.price || "",
            compareAtPrice: variant?.compareAtPrice || null,
          },
          newValues: {
            price: variant?.price || "",
            compareAtPrice: null,
          },
        }
      })

      createBulkHistoryEntry("bulk_discount", "pricing", `Bulk Discount Rollback`, affectedItems)

      setMessage({ 
        type: "success", 
        text: `🚀 Successfully rolled back discounts for ${successful} variants!` 
      })
      setResults([])
      await fetchUpdatedProducts()
      setSelectedVariants([])

    } catch (error) {
      setMessage({ type: "error", text: "❌ Network error during rollback. Please try again." })
    } finally {
      setIsApplying(false)
      // Keep processing state visible for 2 seconds
      setTimeout(() => {
        setIsProcessing(false)
        setProcessProgress({
          total: 0,
          completed: 0,
          successful: 0,
          failed: 0,
          current: "",
        })
      }, 2000)
    }
  }, [selectedVariants, allVariants, fetchUpdatedProducts, setMessage])

  // Clear filters function
  const clearFilters = useCallback(() => {
    setSearchTerm("")
    setSkuSearch("")
    setSelectedCollection("all")
    setSelectedTags([])
  }, [])

  // Remove individual tag
  const removeTag = useCallback((tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag.toLowerCase() !== tagToRemove.toLowerCase()))
  }, [])

  // Close tag dialog and apply filters
  const closeTagDialog = useCallback(() => {
    setIsTagDialogOpen(false)
  }, [])

  return (
    <div className="space-y-6 relative">
      {/* Message Display */}
      {message && (
        <Alert
          className={
            message.type === "error"
              ? "border-red-200 bg-red-50"
              : message.type === "success"
                ? "border-green-200 bg-green-50"
                : "border-blue-200 bg-blue-50"
          }
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Enhanced Progress Status Bar with Real-time Updates */}
      {isProcessing && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Progress Header with Animation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <div className="absolute inset-0 w-6 h-6 border-2 border-blue-200 rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-800 text-lg">Processing Discounts</span>
                    <div className="text-sm text-blue-600">
                      {processProgress.completed} of {processProgress.total} items completed
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-700">
                    {processProgress.total > 0 
                      ? Math.round((processProgress.completed / processProgress.total) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-blue-500">Complete</div>
                </div>
              </div>

              {/* Enhanced Progress Bar with Gradient */}
              <div className="space-y-2">
                <div className="w-full bg-blue-200 rounded-full h-4 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{
                      width: `${processProgress.total > 0 ? (processProgress.completed / processProgress.total) * 100 : 0}%`,
                    }}
                  >
                    <div className="h-full bg-gradient-to-r from-transparent to-white opacity-30 rounded-full"></div>
                  </div>
                  <div className="flex justify-between text-xs text-blue-600">
                    <span>Started</span>
                    <span className="font-medium">
                      {processProgress.completed}/{processProgress.total}
                    </span>
                    <span>Complete</span>
                  </div>
                </div>

                {/* Real-time Status Counts with Icons */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                    <div className="text-2xl font-bold text-gray-700">{processProgress.total}</div>
                    <div className="text-xs text-gray-500 flex items-center justify-center">
                      <Package className="w-3 h-3 mr-1" />
                      Total
                    </div>
                  </div>
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">{processProgress.completed}</div>
                    <div className="text-xs text-blue-600 flex items-center justify-center">
                      <Loader2 className="w-3 h-3 mr-1" />
                      Processed
                    </div>
                  </div>
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-green-100">
                    <div className="text-2xl font-bold text-green-600">{processProgress.successful}</div>
                    <div className="text-xs text-green-600 flex items-center justify-center">
                      <Check className="w-3 h-3 mr-1" />
                      Successful
                    </div>
                  </div>
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm border border-red-100">
                    <div className="text-2xl font-bold text-red-600">{processProgress.failed}</div>
                    <div className="text-xs text-red-600 flex items-center justify-center">
                      <X className="w-3 h-3 mr-1" />
                      Failed
                    </div>
                  </div>
                </div>

                {/* Current Processing Item with Enhanced Display */}
                {processProgress.current && (
                  <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {processProgress.current.includes('✅') ? (
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                        ) : processProgress.current.includes('❌') ? (
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <X className="w-4 h-4 text-red-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">Current Status</div>
                        <div className="text-sm text-gray-600 truncate">{processProgress.current}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Completion Celebration */}
                {processProgress.completed === processProgress.total && processProgress.total > 0 && (
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 p-4 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-green-800 text-lg">
                          🎉 Process Completed Successfully!
                        </div>
                        <div className="text-green-700">
                          {processProgress.successful > 0 && `✅ ${processProgress.successful} items processed successfully`}
                          {processProgress.failed > 0 && ` • ❌ ${processProgress.failed} items failed`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Sticky Discount Panel - Top Right */}
      {showDiscountPanel && (
        <div className="fixed top-4 right-4 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="bg-blue-600 text-white p-3 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              <span className="font-medium">Discount Panel</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="text-white hover:bg-blue-700 p-1"
            >
              {isPanelCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>

          {!isPanelCollapsed && (
            <div className="p-4 space-y-4">
              {/* Selection Summary */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Selected Items</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Products:</span>
                    <span className="ml-1 font-medium">
                      {new Set(allVariants.filter((v) => selectedVariants.includes(v.id)).map((v) => v.productId)).size}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Variants:</span>
                    <span className="ml-1 font-medium">{selectedVariants.length}</span>
                  </div>
                </div>
              </div>

              {/* Discount Settings */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="panel-discount" className="text-sm font-medium">
                    Discount %
                  </Label>
                  <Input
                    id="panel-discount"
                    type="number"
                    min="1"
                    max="99"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                    placeholder="Enter %"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="panel-expiry" className="text-sm font-medium">
                    Expiry Date
                  </Label>
                  <Input
                    id="panel-expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={applyDiscount}
                  disabled={isApplying || selectedVariants.length === 0 || isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing... ({processProgress.completed}/{processProgress.total})
                    </>
                  ) : isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Apply {discountPercentage}% Discount
                    </>
                  )}
                </Button>

                <Button
                  onClick={rollbackDiscounts}
                  disabled={isApplying || selectedVariants.length === 0}
                  variant="outline"
                  className="w-full bg-transparent"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Rollback Selected
                </Button>
              </div>

              {/* Quick Preview */}
              {selectedVariants.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xs font-medium text-blue-800 mb-1">Preview Impact</div>
                  <div className="text-xs text-blue-700">
                    {discountPercentage}% discount on {selectedVariants.length} variants
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Universal Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Search & Filter Products
            {isSearching && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Product Name Search */}
            <div>
              <Label htmlFor="product-search">Product Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="product-search"
                  placeholder="Search by name, type, vendor, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* SKU Search */}
            <div>
              <Label htmlFor="sku-search">SKU Search</Label>
              <Input
                id="sku-search"
                placeholder="Search by SKU or variant..."
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
              />
            </div>

            {/* Collection Filter */}
            <div>
              <Label htmlFor="collection-filter">Collection</Label>
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingCollections ? "Loading..." : "Select collection"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.title} ({collection.productsCount || 0})
                    </SelectItem>
                  ))}
                  {collections.length === 0 && !isLoadingCollections && (
                    <SelectItem value="none" disabled>
                      No collections found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Tags Filter */}
            <div>
              <Label>Tags</Label>
              <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent hover:bg-gray-50"
                    onClick={() => setIsTagDialogOpen(true)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {selectedTags.length > 0 ? `${selectedTags.length} tags selected` : "Select tags"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                      <Tag className="w-5 h-5 mr-2" />
                      Select Product Tags
                    </DialogTitle>
                  </DialogHeader>

                  {/* Tag Selection Area */}
                  <div className="space-y-4">
                    {/* Selected Tags Summary */}
                    {selectedTags.length > 0 && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-blue-800 mb-2">
                          Selected Tags ({selectedTags.length})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedTags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Tags List */}
                    <ScrollArea className="h-60 border rounded-lg p-2">
                      <div className="space-y-2">
                        {availableTags.length > 0 ? (
                          availableTags.map((tag) => {
                            const isSelected = selectedTags.some(
                              (selectedTag) => selectedTag.toLowerCase() === tag.toLowerCase(),
                            )

                            // Count products with this tag
                            const productCount = localProducts.filter(
                              (product) =>
                                product.tags &&
                                product.tags.some((productTag) => productTag.toLowerCase() === tag.toLowerCase()),
                            ).length

                            return (
                              <div
                                key={tag}
                                className="flex items-center justify-between space-x-2 p-2 hover:bg-gray-50 rounded"
                              >
                                <div className="flex items-center space-x-2 flex-1">
                                  <Checkbox
                                    id={`tag-${tag}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleTagSelect(tag, checked as boolean)}
                                  />
                                  <Label htmlFor={`tag-${tag}`} className="text-sm cursor-pointer flex-1">
                                    {tag}
                                  </Label>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {productCount}
                                </Badge>
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-sm text-gray-500 text-center py-8">
                            <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            No tags found in products
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Dialog Actions */}
                    <div className="flex justify-between gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedTags([])}
                        disabled={selectedTags.length === 0}
                        size="sm"
                      >
                        Clear All
                      </Button>
                      <div className="flex gap-2">
                        <DialogClose asChild>
                          <Button variant="outline" size="sm">
                            Cancel
                          </Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button onClick={closeTagDialog} size="sm">
                            Apply Filters
                          </Button>
                        </DialogClose>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Selected Tags Display */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700 flex items-center">
                <Tag className="w-4 h-4 mr-1" />
                Active Tag Filters:
              </span>
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  <span>{tag}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTag(tag)}
                    className="h-auto p-0 hover:bg-transparent"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Filter Actions and Stats */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
              {(searchTerm || skuSearch || selectedCollection !== "all" || selectedTags.length > 0) && (
                <Badge variant="secondary" className="px-3 py-1">
                  Filters Active
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                <span>
                  Showing {allVariants.length} variants from {filteredProducts.length} products
                </span>
              </div>
              {availableTags.length > 0 && (
                <div className="text-xs text-gray-500">{availableTags.length} tags available</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Products & Variants ({selectedVariants.length} selected)</CardTitle>
          <Button variant="outline" onClick={() => handleSelectAll(selectedVariants.length !== allVariants.length)}>
            {selectedVariants.length === allVariants.length ? "Deselect All" : "Select All"}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Compare-At Price</TableHead>
                <TableHead>Current Discount</TableHead>
                <TableHead>Preview ({discountPercentage}% off)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allVariants.map((variant) => {
                const preview = calculatePreviewPrice(variant.price, variant.compareAtPrice, discountPercentage)
                const isSelected = selectedVariants.includes(variant.id)

                return (
                  <TableRow key={variant.id} className={isSelected ? "bg-blue-50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleVariantSelect(variant.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Image
                          src={variant.productImage || "/placeholder.svg"}
                          alt={variant.productTitle}
                          width={40}
                          height={40}
                          className="rounded-md object-cover"
                        />
                        <div>
                          <div className="font-medium">{variant.productTitle}</div>
                          <div className="flex gap-1 mt-1">
                            <Badge
                              variant={variant.productStatus === "active" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {variant.productStatus}
                            </Badge>
                            {variant.productType && (
                              <Badge variant="outline" className="text-xs">
                                {variant.productType}
                              </Badge>
                            )}
                          </div>
                          {/* Display product tags */}
                          {variant.productTags && variant.productTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {variant.productTags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs bg-gray-50 text-gray-600">
                                  {tag}
                                </Badge>
                              ))}
                              {variant.productTags.length > 2 && (
                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500">
                                  +{variant.productTags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{variant.title}</div>
                        {variant.sku && <div className="text-sm text-gray-500">SKU: {variant.sku}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">₹{Number.parseFloat(variant.price).toFixed(2)}</div>
                    </TableCell>
                    <TableCell>
                      {variant.compareAtPrice ? (
                        <div className="font-medium">₹{Number.parseFloat(variant.compareAtPrice).toFixed(2)}</div>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {variant.currentDiscount > 0 ? (
                        <Badge className="bg-green-100 text-green-800">{variant.currentDiscount}% OFF</Badge>
                      ) : (
                        <span className="text-gray-400">No discount</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-green-600 font-medium">₹{preview.newPrice}</span>
                          <span className="text-gray-400 ml-2">Compare: ₹{preview.newCompareAtPrice}</span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {allVariants.length === 0 && !isSearching && (
            <div className="text-center py-8 text-gray-500">
              {filteredProducts.length === 0
                ? "No products found. Try adjusting your search terms or filters."
                : "No variants found in the selected products."}
            </div>
          )}

          {isSearching && (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Searching products...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failed Products Section - NEW */}
      {failedResults.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Failed Products ({failedResults.length})
              </CardTitle>
              <Button
                onClick={retryFailedItems}
                disabled={isApplying || isProcessing}
                variant="outline"
                className="bg-red-100 border-red-300 text-red-700 hover:bg-red-200"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Failed Items
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg border border-red-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Error Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedResults.map((result, index) => {
                    const variant = allVariants.find(v => v.id === result.variantId)
                    return (
                      <TableRow key={index} className="hover:bg-red-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Image
                              src={variant?.productImage || "/placeholder.svg"}
                              alt={result.productTitle}
                              width={32}
                              height={32}
                              className="rounded-md object-cover"
                            />
                            <div>
                              <div className="font-medium text-red-900">{result.productTitle}</div>
                              <div className="text-xs text-red-600">ID: {variant?.productId || 'Unknown'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-red-800">{result.variantTitle}</div>
                          <div className="text-xs text-red-600">ID: {result.variantId}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-700">{variant?.sku || 'No SKU'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-red-800">₹{result.originalPrice}</span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <Badge variant="destructive" className="mb-1">
                              Error
                            </Badge>
                            <div className="text-sm text-red-700 break-words">
                              {result.error || 'Unknown error occurred'}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            
            {/* Failed Items Summary */}
            <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-red-800">
                  <strong>{failedResults.length}</strong> products failed to update. 
                  Common issues: Rate limits, invalid prices, or network errors.
                </div>
                <div className="text-xs text-red-600">
                  Click "Retry Failed Items" to attempt processing again
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
