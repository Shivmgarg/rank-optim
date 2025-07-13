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

        // Fetch metafields to get price history
        const metafieldsResponse = await shopifyRestFetch(`variants/${numericVariantId}/metafields.json`)

        if (metafieldsResponse.status !== 200) {
          continue
        }

        const metafields = metafieldsResponse.body.metafields
        const priceHistoryFields = metafields
          .filter((field: any) => field.namespace === "discount_history" && field.key.startsWith("price_history_"))
          .sort((a: any, b: any) => {
            const timestampA = Number.parseInt(a.key.replace("price_history_", ""))
            const timestampB = Number.parseInt(b.key.replace("price_history_", ""))
            return timestampB - timestampA // Most recent first
          })

        if (priceHistoryFields.length === 0) {
          // No history found, try fallback method
          const variantResponse = await shopifyRestFetch(`variants/${numericVariantId}.json`)
          if (variantResponse.status === 200) {
            const variant = variantResponse.body.variant
            const currentCompareAtPrice = variant.compare_at_price ? Number.parseFloat(variant.compare_at_price) : null

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
          }
          continue
        }

        // Get the most recent price history entry
        const latestHistory = JSON.parse(priceHistoryFields[0].value)

        // Update variant with previous prices
        const updateData = {
          variant: {
            id: numericVariantId,
            price: latestHistory.price,
            compare_at_price: latestHistory.compare_at_price,
          },
        }

        const updateResponse = await shopifyRestFetch(`variants/${numericVariantId}.json`, {
          method: "PUT",
          body: JSON.stringify(updateData),
        })

        if (updateResponse.status === 200) {
          // Store rollback action in metafield
          const rollbackMetafield = {
            metafield: {
              namespace: "discount_history",
              key: `rollback_${Date.now()}`,
              value: JSON.stringify({
                action: "Rollback to previous price",
                date: new Date().toISOString(),
                reverted_to_price: latestHistory.price,
                reverted_to_compare_at_price: latestHistory.compare_at_price,
              }),
              type: "json",
            },
          }

          await shopifyRestFetch(`variants/${numericVariantId}/metafields.json`, {
            method: "POST",
            body: JSON.stringify(rollbackMetafield),
          })

          successCount++
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
