import { NextResponse } from "next/server"
import { getAllCollections } from "@/lib/shopify"

export async function GET() {
  try {
    console.log("Fetching collections from Pure Jewels store...")
    const response = await getAllCollections()

    if (response.status !== 200) {
      console.error("Shopify API Error:", response.error)
      return NextResponse.json(
        { error: "Failed to fetch collections from Shopify", details: response.error },
        { status: response.status },
      )
    }

    if (response.body.errors) {
      console.error("GraphQL Errors:", response.body.errors)
      return NextResponse.json({ error: "GraphQL errors", details: response.body.errors }, { status: 400 })
    }

    // Transform Shopify data to our format
    const collections = response.body.data.collections.edges.map((edge: any) => {
      const collection = edge.node
      return {
        id: collection.id,
        title: collection.title || "Untitled Collection",
        handle: collection.handle || "",
        description: collection.description || "",
        productsCount: collection.productsCount?.count || 0,
        image: collection.image
          ? {
              url: collection.image.url,
              altText: collection.image.altText || collection.title,
            }
          : null,
      }
    })

    console.log(`Successfully fetched ${collections.length} collections from Pure Jewels`)
    return NextResponse.json({ collections, count: collections.length })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
