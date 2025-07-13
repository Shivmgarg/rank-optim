// Shopify API integration utilities using your Pure Jewels store
export interface ShopifyConfig {
  storeDomain: string
  adminAccessToken: string
  apiKey: string
  apiSecret: string
}

function getStoreDomain() {
  // Try different environment variable formats
  const domain =
    process.env.SHOPIFY_STORE_DOMAIN ||
    process.env.SHOPIFY_STORE_URL?.replace(/https?:\/\//, "").replace(/\/$/, "") ||
    ""

  console.log("Store domain resolved:", domain)
  return domain
}

export async function shopifyAdminFetch({
  query,
  variables = {},
}: {
  query: string
  variables?: Record<string, any>
}) {
  const storeDomain = getStoreDomain()
  const token = process.env.SHOPIFY_ADMIN_SESSION

  // Validate required environment variables
  if (!storeDomain) {
    console.error("Missing SHOPIFY_STORE_DOMAIN")
    return {
      status: 500,
      error: "Missing store domain configuration",
    }
  }

  if (!token) {
    console.error("Missing SHOPIFY_ADMIN_SESSION")
    return {
      status: 500,
      error: "Missing admin access token",
    }
  }

  const endpoint = `https://${storeDomain}/admin/api/2024-01/graphql.json`

  console.log("Shopify API call:", {
    endpoint,
    hasToken: !!token,
    variablesKeys: Object.keys(variables),
  })

  try {
    const result = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    })

    const responseText = await result.text()
    console.log("Shopify raw response:", {
      status: result.status,
      ok: result.ok,
      responseLength: responseText.length,
      headers: Object.fromEntries(result.headers.entries()),
    })

    if (!result.ok) {
      console.error("HTTP error response:", responseText)
      return {
        status: result.status,
        error: `HTTP ${result.status}: ${responseText}`,
      }
    }

    let parsedBody
    try {
      parsedBody = JSON.parse(responseText)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      return {
        status: 500,
        error: `Invalid JSON response: ${responseText.substring(0, 200)}...`,
      }
    }

    // Check for GraphQL errors
    if (parsedBody.errors && parsedBody.errors.length > 0) {
      console.error("GraphQL errors:", parsedBody.errors)
      return {
        status: 400,
        error: `GraphQL errors: ${parsedBody.errors.map((e) => e.message).join(", ")}`,
        body: parsedBody,
      }
    }

    return {
      status: result.status,
      body: parsedBody,
    }
  } catch (error) {
    console.error("Shopify Admin API Error:", error)
    return {
      status: 500,
      error: error instanceof Error ? error.message : "Network error",
    }
  }
}

// REST API function for uploading images (more reliable than GraphQL for images)
export async function shopifyRestFetch(endpoint: string, options: RequestInit = {}) {
  const storeDomain = getStoreDomain()
  const token = process.env.SHOPIFY_ADMIN_SESSION
  const url = `https://${storeDomain}/admin/api/2024-01/${endpoint}`

  console.log("Shopify REST API call:", { url, method: options.method || "GET" })

  try {
    const result = await fetch(url, {
      ...options,
      headers: {
        "X-Shopify-Access-Token": token || "",
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    const responseText = await result.text()
    console.log("Shopify REST response:", {
      status: result.status,
      ok: result.ok,
      responseLength: responseText.length,
    })

    if (!result.ok) {
      console.error("REST API error response:", responseText)
      throw new Error(`HTTP error! status: ${result.status}, body: ${responseText}`)
    }

    let parsedBody
    try {
      parsedBody = JSON.parse(responseText)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      throw new Error(`Invalid JSON response: ${responseText}`)
    }

    return {
      status: result.status,
      body: parsedBody,
    }
  } catch (error) {
    console.error("Shopify REST API Error:", error)
    return {
      status: 500,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Fetch ALL products with pagination and collections
export const GET_ALL_PRODUCTS_ADMIN = `
  query getAllProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          description
          descriptionHtml
          handle
          status
          createdAt
          updatedAt
          tags
          productType
          vendor
          totalInventory
          collections(first: 10) {
            edges {
              node {
                id
                title
                handle
              }
            }
          }
          images(first: 5) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                inventoryQuantity
                availableForSale
                sku
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`

// Fetch products by collection ID
export const GET_PRODUCTS_BY_COLLECTION = `
  query getProductsByCollection($collectionId: ID!, $first: Int!, $after: String) {
    collection(id: $collectionId) {
      id
      title
      products(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            description
            descriptionHtml
            handle
            status
            createdAt
            updatedAt
            tags
            productType
            vendor
            totalInventory
            collections(first: 10) {
              edges {
                node {
                  id
                  title
                  handle
                }
              }
            }
            images(first: 5) {
              edges {
                node {
                  id
                  url
                  altText
                  width
                  height
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  compareAtPrice
                  inventoryQuantity
                  availableForSale
                  sku
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

// Get all collections
export const GET_ALL_COLLECTIONS = `
  query getAllCollections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          id
          title
          handle
          description
          productsCount {
            count
          }
          image {
            url
            altText
          }
        }
      }
    }
  }
`

// Create product mutation
export const CREATE_PRODUCT = `
  mutation createProduct($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        descriptionHtml
        tags
        status
        productType
        vendor
      }
      userErrors {
        field
        message
      }
    }
  }
`

// Update product mutation
export const UPDATE_PRODUCT = `
  mutation updateProduct($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        descriptionHtml
        tags
        status
        productType
        vendor
      }
      userErrors {
        field
        message
      }
    }
  }
`

// Delete product mutation
export const DELETE_PRODUCT = `
  mutation deleteProduct($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }
`

// Function to get ALL products from your Pure Jewels store (with pagination)
export async function getAllProducts() {
  let allProducts: any[] = []
  let hasNextPage = true
  let cursor = null

  try {
    while (hasNextPage) {
      const response = await shopifyAdminFetch({
        query: GET_ALL_PRODUCTS_ADMIN,
        variables: { first: 50, after: cursor },
      })

      if (response.status !== 200 || response.body.errors) {
        throw new Error(response.error || "GraphQL errors")
      }

      const products = response.body.data.products.edges
      allProducts = [...allProducts, ...products]

      hasNextPage = response.body.data.products.pageInfo.hasNextPage
      cursor = response.body.data.products.pageInfo.endCursor
    }

    return {
      status: 200,
      body: {
        data: {
          products: {
            edges: allProducts,
          },
        },
      },
    }
  } catch (error) {
    return {
      status: 500,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Function to get products by collection ID
export async function getProductsByCollection(collectionId: string) {
  let allProducts: any[] = []
  let hasNextPage = true
  let cursor = null

  try {
    while (hasNextPage) {
      const response = await shopifyAdminFetch({
        query: GET_PRODUCTS_BY_COLLECTION,
        variables: { collectionId, first: 50, after: cursor },
      })

      if (response.status !== 200 || response.body.errors) {
        throw new Error(response.error || "GraphQL errors")
      }

      if (!response.body.data.collection) {
        throw new Error("Collection not found")
      }

      const products = response.body.data.collection.products.edges
      allProducts = [...allProducts, ...products]

      hasNextPage = response.body.data.collection.products.pageInfo.hasNextPage
      cursor = response.body.data.collection.products.pageInfo.endCursor
    }

    return {
      status: 200,
      body: {
        data: {
          products: {
            edges: allProducts,
          },
        },
      },
    }
  } catch (error) {
    return {
      status: 500,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Function to get all collections
export async function getAllCollections() {
  return shopifyAdminFetch({
    query: GET_ALL_COLLECTIONS,
    variables: { first: 100 },
  })
}

// Create product function
export async function createProduct(productData: any) {
  return shopifyAdminFetch({
    query: CREATE_PRODUCT,
    variables: { input: productData },
  })
}

// Update product function
export async function updateProduct(productData: any) {
  return shopifyAdminFetch({
    query: UPDATE_PRODUCT,
    variables: { input: productData },
  })
}

// Delete product function
export async function deleteProduct(productId: string) {
  return shopifyAdminFetch({
    query: DELETE_PRODUCT,
    variables: { input: { id: productId } },
  })
}

// Upload image function using REST API with base64 *attachment*
export async function uploadProductImage(
  productId: string,
  { base64, altText, filename }: { base64: string; altText: string; filename?: string },
) {
  // Convert GraphQL product GID → numeric ID expected by REST
  const numericProductId = productId.replace("gid://shopify/Product/", "")

  const payload = {
    image: {
      attachment: base64, // <-- base64 without data-URI prefix
      alt: altText,
      filename,
    },
  }

  return shopifyRestFetch(`products/${numericProductId}/images.json`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// Alternative: Upload image using staged uploads (for larger files)
export async function uploadProductImageStaged(productId: string, imageFile: File) {
  console.log("Starting staged upload for product:", productId)

  try {
    // Step 1: Create staged upload
    const stagedUploadQuery = `
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const stagedUploadResponse = await shopifyAdminFetch({
      query: stagedUploadQuery,
      variables: {
        input: [
          {
            resource: "IMAGE",
            filename: imageFile.name,
            mimeType: imageFile.type,
            httpMethod: "POST",
          },
        ],
      },
    })

    if (stagedUploadResponse.status !== 200 || stagedUploadResponse.body.errors) {
      throw new Error("Failed to create staged upload")
    }

    const stagedTarget = stagedUploadResponse.body.data.stagedUploadsCreate.stagedTargets[0]
    if (!stagedTarget) {
      throw new Error("No staged target returned")
    }

    // Step 2: Upload file to staged URL
    const formData = new FormData()
    stagedTarget.parameters.forEach((param: any) => {
      formData.append(param.name, param.value)
    })
    formData.append("file", imageFile)

    const uploadResponse = await fetch(stagedTarget.url, {
      method: "POST",
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`)
    }

    // Step 3: Create product image with staged URL
    const createImageQuery = `
      mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media {
            ... on MediaImage {
              id
              image {
                url
                altText
              }
            }
          }
          mediaUserErrors {
            field
            message
          }
        }
      }
    `

    const createImageResponse = await shopifyAdminFetch({
      query: createImageQuery,
      variables: {
        productId,
        media: [
          {
            originalSource: stagedTarget.resourceUrl,
            alt: imageFile.name.replace(/\.[^/.]+$/, ""),
            mediaContentType: "IMAGE",
          },
        ],
      },
    })

    return createImageResponse
  } catch (error) {
    console.error("Staged upload error:", error)
    return {
      status: 500,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
