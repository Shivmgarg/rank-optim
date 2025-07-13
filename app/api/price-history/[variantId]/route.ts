import { NextResponse } from "next/server"
import { shopifyRestFetch } from "@/lib/shopify"

export async function GET(request: Request, { params }: { params: { variantId: string } }) {
  try {
    const { variantId } = params

    // Convert GraphQL ID to REST ID if needed
    const numericVariantId = variantId.replace("gid://shopify/ProductVariant/", "")

    // Fetch metafields for price history
    const metafieldsResponse = await shopifyRestFetch(`variants/${numericVariantId}/metafields.json`)

    if (metafieldsResponse.status !== 200) {
      return NextResponse.json({ history: [] })
    }

    const metafields = metafieldsResponse.body.metafields
    const historyFields = metafields
      .filter(
        (field: any) =>
          field.namespace === "discount_history" &&
          (field.key.startsWith("price_history_") || field.key.startsWith("rollback_")),
      )
      .map((field: any) => {
        try {
          const data = JSON.parse(field.value)
          return {
            date: data.date || data.scheduled_at || new Date().toISOString(),
            price: data.price || data.reverted_to_price || "0.00",
            compareAtPrice: data.compare_at_price || data.reverted_to_compare_at_price || null,
            discountPercentage: data.discount_percentage || 0,
            action: data.action || `Applied ${data.discount_percentage || 0}% discount`,
          }
        } catch (error) {
          return null
        }
      })
      .filter((entry: any) => entry !== null)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ history: historyFields })
  } catch (error) {
    console.error("Error fetching price history:", error)
    return NextResponse.json({ history: [] })
  }
}
