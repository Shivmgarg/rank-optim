import { NextResponse } from "next/server"
import { getAllProducts, getProductsByCollection, createProduct, updateProduct, deleteProduct } from "@/lib/shopify"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const collectionId = searchParams.get("collection")

    console.log("Fetching products from Shopify store...")
    console.log("Collection filter:", collectionId)
    console.log("Environment check:", {
      hasStoreDomain: !!process.env.SHOPIFY_STORE_DOMAIN,
      hasStoreUrl: !!process.env.SHOPIFY_STORE_URL,
      hasAdminSession: !!process.env.SHOPIFY_ADMIN_SESSION,
    })

    let response

    // Use different query based on whether collection filter is applied
    if (collectionId && collectionId !== "all") {
      console.log(`Fetching products for collection: ${collectionId}`)
      response = await getProductsByCollection(collectionId)
    } else {
      console.log("Fetching all products")
      response = await getAllProducts()
    }

    if (response.status !== 200) {
      console.error("Shopify API Error:", response.error)
      return NextResponse.json(
        {
          error: "Failed to fetch products from Shopify",
          details: response.error,
          debug: {
            status: response.status,
            hasStoreDomain: !!process.env.SHOPIFY_STORE_DOMAIN,
            hasToken: !!process.env.SHOPIFY_ADMIN_SESSION,
            collectionId,
          },
        },
        { status: response.status },
      )
    }

    // Check if response has the expected structure
    if (!response.body?.data?.products) {
      console.error("Unexpected response structure:", response.body)
      return NextResponse.json(
        {
          error: "Invalid response structure from Shopify",
          details: "Missing products data",
          response: response.body,
        },
        { status: 500 },
      )
    }

    if (response.body.errors) {
      console.error("GraphQL Errors:", response.body.errors)
      return NextResponse.json(
        {
          error: "GraphQL errors",
          details: response.body.errors,
        },
        { status: 400 },
      )
    }

    // Transform Shopify data to our format with better error handling
    let products = []
    try {
      products = response.body.data.products.edges.map((edge: any) => {
        const product = edge.node
        return {
          id: product.id,
          title: product.title || "Untitled Product",
          description: product.description || product.descriptionHtml || "No description available",
          handle: product.handle || "",
          images:
            product.images?.edges?.map((imgEdge: any) => ({
              id: imgEdge.node.id,
              url: imgEdge.node.url,
              altText: imgEdge.node.altText || product.title,
              width: imgEdge.node.width,
              height: imgEdge.node.height,
            })) || [],
          variants:
            product.variants?.edges?.map((varEdge: any) => ({
              id: varEdge.node.id,
              title: varEdge.node.title,
              price: varEdge.node.price,
              compareAtPrice: varEdge.node.compareAtPrice,
              inventoryQuantity: varEdge.node.inventoryQuantity || 0,
              sku: varEdge.node.sku || "",
              selectedOptions: varEdge.node.selectedOptions || [],
            })) || [],
          collections:
            product.collections?.edges?.map((collEdge: any) => ({
              id: collEdge.node.id,
              title: collEdge.node.title,
              handle: collEdge.node.handle,
            })) || [],
          tags: product.tags || [],
          status: product.status?.toLowerCase() || "draft",
          createdAt: product.createdAt ? new Date(product.createdAt).toLocaleDateString() : "Unknown",
          productType: product.productType || "",
          vendor: product.vendor || "",
          totalInventory: product.totalInventory || 0,
        }
      })
    } catch (transformError) {
      console.error("Error transforming product data:", transformError)
      return NextResponse.json(
        {
          error: "Error processing product data",
          details: transformError instanceof Error ? transformError.message : "Unknown transform error",
        },
        { status: 500 },
      )
    }

    console.log(`Successfully fetched ${products.length} products`)
    console.log("Sample product collections:", products[0]?.collections)

    return NextResponse.json({
      products,
      count: products.length,
      collectionFilter: collectionId,
      debug: {
        totalProducts: products.length,
        hasCollectionFilter: !!collectionId && collectionId !== "all",
        sampleCollections: products.slice(0, 3).map((p) => ({
          title: p.title,
          collections: p.collections,
        })),
      },
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const productData = await request.json()

    const shopifyProductData = {
      title: productData.title,
      descriptionHtml: productData.description,
      tags: productData.tags,
      status: productData.status?.toUpperCase() || "DRAFT",
      productType: productData.productType,
      vendor: productData.vendor,
    }

    const response = await createProduct(shopifyProductData)

    if (response.status !== 200) {
      return NextResponse.json({ success: false, error: response.error }, { status: response.status })
    }

    const { data, errors } = response.body as any

    if (errors?.length) {
      return NextResponse.json({ success: false, error: errors }, { status: 400 })
    }

    const productCreate = data?.productCreate
    const userErrors = productCreate?.userErrors ?? []

    if (userErrors.length) {
      return NextResponse.json({ success: false, error: userErrors }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      product: {
        ...productCreate.product,
        description: productCreate.product.descriptionHtml,
      },
    })
  } catch (error) {
    console.error("Create Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const productData = await request.json()

    const shopifyProductData = {
      id: productData.id,
      title: productData.title,
      descriptionHtml: productData.description,
      tags: productData.tags,
      status: productData.status?.toUpperCase() || "DRAFT",
      productType: productData.productType,
      vendor: productData.vendor,
    }

    const response = await updateProduct(shopifyProductData)

    if (response.status !== 200) {
      return NextResponse.json({ success: false, error: response.error }, { status: response.status })
    }

    const { data, errors } = response.body as any

    if (errors?.length) {
      return NextResponse.json({ success: false, error: errors }, { status: 400 })
    }

    const productUpdate = data?.productUpdate
    const userErrors = productUpdate?.userErrors ?? []

    if (userErrors.length) {
      return NextResponse.json({ success: false, error: userErrors }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      product: {
        ...productUpdate.product,
        description: productUpdate.product.descriptionHtml,
      },
    })
  } catch (error) {
    console.error("Update Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("id")

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 })
    }

    const response = await deleteProduct(productId)

    if (response.status !== 200) {
      return NextResponse.json({ success: false, error: response.error }, { status: response.status })
    }

    const { data, errors } = response.body as any

    if (errors?.length) {
      return NextResponse.json({ success: false, error: errors }, { status: 400 })
    }

    const productDelete = data?.productDelete
    const userErrors = productDelete?.userErrors ?? []

    if (userErrors.length) {
      return NextResponse.json({ success: false, error: userErrors }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      deletedProductId: productDelete.deletedProductId,
    })
  } catch (error) {
    console.error("Delete Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
