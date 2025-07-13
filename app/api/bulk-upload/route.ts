import { NextResponse } from "next/server"
import { uploadProductImage, uploadProductImageStaged } from "@/lib/shopify"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const productId = formData.get("productId") as string
    const images = formData.getAll("images") as File[]

    console.log("Bulk upload request:", { productId, imageCount: images.length })

    if (!productId || images.length === 0) {
      return NextResponse.json({ success: false, error: "Product ID and images are required" }, { status: 400 })
    }

    const uploadResults = []
    const errors = []

    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      console.log(`Processing image ${i + 1}/${images.length}: ${image.name}`)

      try {
        // Validate image
        if (!image.type.startsWith("image/")) {
          errors.push(`${image.name}: Not a valid image file`)
          continue
        }

        if (image.size > 20 * 1024 * 1024) {
          // 20MB limit for Shopify
          errors.push(`${image.name}: File too large (max 20MB)`)
          continue
        }

        console.log(`Uploading image: ${image.name} (${image.type}, ${(image.size / 1024).toFixed(1)}KB)`)

        let response

        // Try staged upload for larger files (>5MB) or if base64 fails
        if (image.size > 5 * 1024 * 1024) {
          console.log("Using staged upload for large file")
          response = await uploadProductImageStaged(productId, image)
        } else {
          // Use REST API with base64 for smaller files
          console.log("Using REST API with base64")

          const bytes = await image.arrayBuffer()
          const base64 = Buffer.from(bytes).toString("base64")

          response = await uploadProductImage(productId, {
            base64,
            altText: image.name.replace(/\.[^/.]+$/, ""),
            filename: image.name,
          })
        }

        console.log("Shopify response:", {
          status: response.status,
          hasError: !!response.error,
          hasBody: !!response.body,
        })

        if (response.status === 200 || response.status === 201) {
          // Handle REST API response
          if (response.body.image) {
            uploadResults.push({
              id: response.body.image.id,
              url: response.body.image.src,
              altText: response.body.image.alt,
              originalName: image.name,
            })
            console.log(`Successfully uploaded: ${image.name}`)
          }
          // Handle GraphQL response (staged upload)
          else if (response.body.data?.productCreateMedia?.media) {
            const media = response.body.data.productCreateMedia.media[0]
            if (media?.image) {
              uploadResults.push({
                id: media.id,
                url: media.image.url,
                altText: media.image.altText,
                originalName: image.name,
              })
              console.log(`Successfully uploaded via staged upload: ${image.name}`)
            }
          } else {
            errors.push(`${image.name}: No image returned from Shopify`)
          }
        } else {
          console.error("HTTP error:", response.status, response.error)
          errors.push(`${image.name}: HTTP ${response.status} - ${response.error || "Unknown error"}`)
        }
      } catch (error) {
        console.error(`Error processing ${image.name}:`, error)
        errors.push(`${image.name}: ${error instanceof Error ? error.message : "Processing error"}`)
      }
    }

    console.log("Upload summary:", {
      successful: uploadResults.length,
      failed: errors.length,
      total: images.length,
    })

    return NextResponse.json({
      success: uploadResults.length > 0,
      uploadedImages: uploadResults.length,
      totalImages: images.length,
      images: uploadResults,
      errors,
      summary: {
        successful: uploadResults.length,
        failed: errors.length,
        total: images.length,
      },
    })
  } catch (error) {
    console.error("Bulk upload error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        uploadedImages: 0,
        totalImages: 0,
        images: [],
        errors: [error instanceof Error ? error.message : "Unknown server error"],
      },
      { status: 500 },
    )
  }
}
