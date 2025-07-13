import { NextResponse } from "next/server"
import { shopifyRestFetch } from "@/lib/shopify"

interface DiscountRequest {
  variantIds: string[]
  discountPercentage: number
  expiryDate?: string | null
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

export async function POST(request: Request) {
  try {
    const { variantIds, discountPercentage, expiryDate }: DiscountRequest = await request.json()

    // Validate inputs
    if (!Array.isArray(variantIds) || variantIds.length === 0) {
      return NextResponse.json({ error: "Please provide valid variant IDs" }, { status: 400 })
    }

    if (typeof discountPercentage !== "number" || discountPercentage <= 0 || discountPercentage >= 100) {
      return NextResponse.json({ error: "Discount percentage must be between 1 and 99" }, { status: 400 })
    }

    if (expiryDate && new Date(expiryDate) <= new Date()) {
      return NextResponse.json({ error: "Expiry date must be in the future" }, { status: 400 })
    }

    const results: DiscountResult[] = []

    // Process each variant
    for (const variantId of variantIds) {
      try {
        // Convert GraphQL ID to REST ID if needed
        const numericVariantId = variantId.replace("gid://shopify/ProductVariant/", "")

        // Fetch current variant data
        const variantResponse = await shopifyRestFetch(`variants/${numericVariantId}.json`)

        if (variantResponse.status !== 200) {
          results.push({
            variantId,
            productTitle: "Unknown",
            variantTitle: "Unknown",
            success: false,
            error: "Failed to fetch variant data",
            originalPrice: "0.00",
            newPrice: "0.00",
            compareAtPrice: "0.00",
          })
          continue
        }

        const variant = variantResponse.body.variant
        const currentPrice = Number.parseFloat(variant.price)
        const currentCompareAtPrice = variant.compare_at_price ? Number.parseFloat(variant.compare_at_price) : null

        // Fetch product data for title
        const productResponse = await shopifyRestFetch(`products/${variant.product_id}.json`)
        const productTitle = productResponse.status === 200 ? productResponse.body.product.title : "Unknown Product"

        // Store current price in metafield before applying discount
        const timestamp = new Date().toISOString()
        const metafieldKey = `price_history_${Date.now()}`
        const metafieldValue = {
          price: variant.price,
          compare_at_price: variant.compare_at_price,
          date: timestamp,
          action: `Applied ${discountPercentage}% discount`,
          discount_percentage: discountPercentage,
          expiry_date: expiryDate,
        }

        // Create metafield to store price history
        const metafieldData = {
          metafield: {
            namespace: "discount_history",
            key: metafieldKey,
            value: JSON.stringify(metafieldValue),
            type: "json",
          },
        }

        await shopifyRestFetch(`variants/${numericVariantId}/metafields.json`, {
          method: "POST",
          body: JSON.stringify(metafieldData),
        })

        let newPrice: number
        let newCompareAtPrice: number

        // Apply discount logic based on product type
        if (currentCompareAtPrice && currentCompareAtPrice > currentPrice) {
          // Type 2: Product already has compare_at_price (already discounted)
          // Apply discount to compare_at_price to get new price
          newPrice = currentCompareAtPrice * (1 - discountPercentage / 100)
          newCompareAtPrice = currentCompareAtPrice
        } else {
          // Type 1: Product has only original price (no discount)
          // Set compare_at_price to current price, then apply discount
          newPrice = currentPrice * (1 - discountPercentage / 100)
          newCompareAtPrice = currentPrice
        }

        // Ensure compare_at_price > price (Shopify rule)
        if (newPrice >= newCompareAtPrice) {
          results.push({
            variantId,
            productTitle,
            variantTitle: variant.title || "Default Title",
            success: false,
            error: "New price would be equal or greater than compare-at price",
            originalPrice: currentPrice.toFixed(2),
            newPrice: newPrice.toFixed(2),
            compareAtPrice: newCompareAtPrice.toFixed(2),
          })
          continue
        }

        // Update variant in Shopify
        const updateData = {
          variant: {
            id: variant.id,
            price: newPrice.toFixed(2),
            compare_at_price: newCompareAtPrice.toFixed(2),
          },
        }

        const updateResponse = await shopifyRestFetch(`variants/${numericVariantId}.json`, {
          method: "PUT",
          body: JSON.stringify(updateData),
        })

        if (updateResponse.status === 200) {
          // Schedule automatic reversion if expiry date is provided
          if (expiryDate) {
            await scheduleDiscountReversion(numericVariantId, expiryDate, {
              price: variant.price,
              compare_at_price: variant.compare_at_price,
            })
          }

          results.push({
            variantId,
            productTitle,
            variantTitle: variant.title || "Default Title",
            success: true,
            originalPrice: currentPrice.toFixed(2),
            newPrice: newPrice.toFixed(2),
            compareAtPrice: newCompareAtPrice.toFixed(2),
          })
        } else {
          results.push({
            variantId,
            productTitle,
            variantTitle: variant.title || "Default Title",
            success: false,
            error: `Shopify API error: ${updateResponse.status}`,
            originalPrice: currentPrice.toFixed(2),
            newPrice: newPrice.toFixed(2),
            compareAtPrice: newCompareAtPrice.toFixed(2),
          })
        }

        // Add delay to respect Shopify rate limits (2 requests per second)
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        results.push({
          variantId,
          productTitle: "Unknown",
          variantTitle: "Unknown",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          originalPrice: "0.00",
          newPrice: "0.00",
          compareAtPrice: "0.00",
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Apply discount error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Schedule discount reversion (simplified version - in production, use a proper job queue)
async function scheduleDiscountReversion(
  variantId: string,
  expiryDate: string,
  originalPrices: { price: string; compare_at_price: string | null },
) {
  try {
    // Store reversion schedule in metafield
    const scheduleData = {
      metafield: {
        namespace: "discount_schedule",
        key: `revert_${Date.now()}`,
        value: JSON.stringify({
          variant_id: variantId,
          expiry_date: expiryDate,
          original_price: originalPrices.price,
          original_compare_at_price: originalPrices.compare_at_price,
          scheduled_at: new Date().toISOString(),
        }),
        type: "json",
      },
    }

    await shopifyRestFetch(`variants/${variantId}/metafields.json`, {
      method: "POST",
      body: JSON.stringify(scheduleData),
    })
  } catch (error) {
    console.error("Error scheduling reversion:", error)
  }
}
