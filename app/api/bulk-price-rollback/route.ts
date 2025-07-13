import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { variants } = await request.json()

    if (!variants || !Array.isArray(variants)) {
      return NextResponse.json({ error: "Invalid variants data" }, { status: 400 })
    }

    const results = []
    let successful = 0
    let failed = 0

    for (const variant of variants) {
      try {
        // Restore original prices
        const updateData = {
          id: variant.variantId,
          price: variant.originalPrice,
          compareAtPrice: variant.originalCompareAtPrice || null,
        }

        // Make API call to update variant
        const response = await fetch(
          `${process.env.SHOPIFY_STORE_URL}/admin/api/2023-10/variants/${variant.variantId}.json`,
          {
            method: "PUT",
            headers: {
              "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_SESSION!,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ variant: updateData }),
          },
        )

        if (response.ok) {
          successful++
          results.push({
            variantId: variant.variantId,
            success: true,
            message: "Price rolled back successfully",
          })
        } else {
          failed++
          results.push({
            variantId: variant.variantId,
            success: false,
            error: "Failed to update variant",
          })
        }
      } catch (error) {
        failed++
        results.push({
          variantId: variant.variantId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: failed === 0,
      successful,
      failed,
      total: variants.length,
      results,
    })
  } catch (error) {
    console.error("Bulk price rollback error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
