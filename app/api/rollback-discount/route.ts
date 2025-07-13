import { NextResponse } from "next/server"
import { shopifyRestFetch } from "@/lib/shopify"

interface RollbackRequest {
  variantIds: string[]
}

export async function POST(request: Request) {
  try {
    const { variantIds }: RollbackRequest = await request.json()

    // Validate inputs
    if (!Array.isArray(variantIds) || variantIds.length === 0) {
      return NextResponse.json({ error: "Please provide valid variant IDs" }, { status: 400 })
    }

    let successCount = 0

    // Process each variant
    for (const variantId of variantIds) {
      try {
        // Convert GraphQL ID to REST ID if needed
        const numericVariantId = variantId.replace("gid://shopify/ProductVariant/", "")

        // Fetch current variant data
        const variantResponse = await shopifyRestFetch(`variants/${numericVariantId}.json`)

        if (variantResponse.status !== 200) {
          continue
        }

        const variant = variantResponse.body.variant
        const currentCompareAtPrice = variant.compare_at_price ? Number.parseFloat(variant.compare_at_price) : null

        // Only rollback if there's a compare_at_price (indicating a discount was applied)
        if (currentCompareAtPrice) {
          // Rollback: Set price to compare_at_price and remove compare_at_price
          const updateData = {
            variant: {
              id: variant.id,
              price: currentCompareAtPrice.toFixed(2),
              compare_at_price: null,
            },
          }

          const updateResponse = await shopifyRestFetch(`variants/${numericVariantId}.json`, {
            method: "PUT",
            body: JSON.stringify(updateData),
          })

          if (updateResponse.status === 200) {
            successCount++
          }
        }

        // Add delay to respect Shopify rate limits
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error rolling back variant ${variantId}:`, error)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      count: successCount,
      message: `Successfully rolled back ${successCount} variants`,
    })
  } catch (error) {
    console.error("Rollback discount error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
