import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN
    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN

    if (!shopDomain || !accessToken) {
      return NextResponse.json({ error: "Missing Shopify configuration" }, { status: 500 })
    }

    const shopUrl = `https://${shopDomain}/admin/api/2023-10/shop.json`

    const response = await fetch(shopUrl, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Shopify API error:", response.status, errorText)
      return NextResponse.json({ error: "Failed to fetch shop info", details: errorText }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json({
      shop: {
        name: data.shop.name,
        domain: data.shop.domain,
        email: data.shop.email,
        currency: data.shop.currency,
        timezone: data.shop.timezone,
        plan_name: data.shop.plan_name,
      },
    })
  } catch (error) {
    console.error("Error fetching shop info:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
