import { NextResponse } from "next/server"
import { shopifyAdminFetch } from "@/lib/shopify"
import { createBulkUploadLog, saveBulkUploadLogs } from "@/lib/bulk-upload"

export async function POST(request: Request) {
  try {
    const { variants, rule, action } = await request.json()

    console.log("Bulk price update request:", {
      variantCount: variants.length,
      rule,
      action,
    })

    const results = []
    const errors = []
    const logs = []

    for (const variant of variants) {
      try {
        console.log(`Processing variant ${variant.sku}:`, {
          currentPrice: variant.currentPrice,
          currentCompareAtPrice: variant.currentCompareAtPrice,
          newPrice: variant.newPrice,
          newCompareAtPrice: variant.newCompareAtPrice,
          rule,
          action,
        })

        // Build the update input based on what needs to be updated
        const updateInput = {
          id: variant.variantId,
        }

        // Only update price if it's different and we're applying to price
        if ((rule.applyTo === "price" || rule.applyTo === "both") && variant.newPrice !== variant.currentPrice) {
          updateInput.price = variant.newPrice
        }

        // Only update compareAtPrice if it's different and we're applying to it
        if (
          (rule.applyTo === "compareAtPrice" || rule.applyTo === "both") &&
          variant.newCompareAtPrice &&
          variant.newCompareAtPrice !== variant.currentCompareAtPrice
        ) {
          updateInput.compareAtPrice = variant.newCompareAtPrice
        }

        console.log(`Update input for ${variant.sku}:`, updateInput)

        // Skip if no changes needed
        if (!updateInput.price && !updateInput.compareAtPrice) {
          console.log(`No changes needed for ${variant.sku}`)
          continue
        }

        // Update variant using GraphQL
        const updateVariantMutation = `
          mutation productVariantUpdate($input: ProductVariantInput!) {
            productVariantUpdate(input: $input) {
              productVariant {
                id
                price
                compareAtPrice
                sku
                product {
                  id
                  title
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `

        const response = await shopifyAdminFetch({
          query: updateVariantMutation,
          variables: { input: updateInput },
        })

        console.log(`Shopify response for ${variant.sku}:`, {
          status: response.status,
          hasData: !!response.body?.data,
          hasErrors: !!response.body?.errors,
          userErrors: response.body?.data?.productVariantUpdate?.userErrors?.length || 0,
          updatedVariant: response.body?.data?.productVariantUpdate?.productVariant,
        })

        if (response.status === 200 && response.body.data?.productVariantUpdate?.productVariant) {
          const updatedVariant = response.body.data.productVariantUpdate.productVariant

          results.push({
            variantId: variant.variantId,
            productId: variant.productId,
            productTitle: variant.productTitle,
            variantTitle: variant.variantTitle,
            sku: variant.sku,
            oldPrice: variant.currentPrice,
            newPrice: updatedVariant.price,
            oldCompareAtPrice: variant.currentCompareAtPrice,
            newCompareAtPrice: updatedVariant.compareAtPrice,
            success: true,
          })

          // Create success log
          const priceChange = updateInput.price ? `price: $${variant.currentPrice} → $${updatedVariant.price}` : ""
          const compareChange = updateInput.compareAtPrice
            ? `compare: $${variant.currentCompareAtPrice} → $${updatedVariant.compareAtPrice}`
            : ""
          const changes = [priceChange, compareChange].filter(Boolean).join(", ")

          logs.push(
            createBulkUploadLog(
              "bulk_price_update",
              `${action === "increase" ? "Increased" : "Decreased"} ${changes} (${rule.type}: ${rule.value}${rule.type === "percentage" ? "%" : ""})`,
              "success",
              {
                id: variant.productId,
                title: variant.productTitle,
                sku: variant.sku,
              },
            ),
          )

          console.log(`✅ Successfully updated ${variant.sku}:`, {
            price: `$${variant.currentPrice} → $${updatedVariant.price}`,
            compareAtPrice: variant.currentCompareAtPrice
              ? `$${variant.currentCompareAtPrice} → $${updatedVariant.compareAtPrice}`
              : "N/A",
          })
        } else {
          const userErrors = response.body.data?.productVariantUpdate?.userErrors || []
          const graphqlErrors = response.body.errors || []
          const allErrors = [...userErrors, ...graphqlErrors]

          const errorMessage =
            allErrors.length > 0 ? allErrors.map((e) => e.message).join(", ") : response.error || "Unknown error"

          errors.push(`${variant.productTitle} - ${variant.variantTitle} (${variant.sku}): ${errorMessage}`)

          // Create error log
          logs.push(
            createBulkUploadLog("bulk_price_update", `Failed to update price: ${errorMessage}`, "error", {
              id: variant.productId,
              title: variant.productTitle,
              sku: variant.sku,
            }),
          )

          console.log(`❌ Failed to update ${variant.sku}: ${errorMessage}`)
        }
      } catch (error) {
        console.error(`Error updating variant ${variant.variantId}:`, error)
        const errorMsg = error instanceof Error ? error.message : "Processing error"

        errors.push(`${variant.productTitle} - ${variant.variantTitle} (${variant.sku}): ${errorMsg}`)

        // Create error log
        logs.push(
          createBulkUploadLog("bulk_price_update", `Processing error: ${errorMsg}`, "error", {
            id: variant.productId,
            title: variant.productTitle,
            sku: variant.sku,
          }),
        )
      }
    }

    // Save all logs to history
    if (logs.length > 0) {
      saveBulkUploadLogs(logs)
    }

    console.log("Bulk price update summary:", {
      successful: results.length,
      failed: errors.length,
      total: variants.length,
    })

    return NextResponse.json({
      success: results.length > 0,
      successful: results.length,
      failed: errors.length,
      total: variants.length,
      results,
      errors,
    })
  } catch (error) {
    console.error("Bulk price update error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        successful: 0,
        failed: 0,
        total: 0,
        results: [],
        errors: [error instanceof Error ? error.message : "Unknown server error"],
      },
      { status: 500 },
    )
  }
}
