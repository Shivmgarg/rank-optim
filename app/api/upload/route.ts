import { NextResponse } from "next/server"
import { uploadProductImage, uploadProductImageStaged } from "@/lib/shopify"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const productId = formData.get("productId") as string
    const altText = formData.get("altText") as string

    if (!file || !productId) {
      return NextResponse.json({ success: false, error: "File and product ID are required" }, { status: 400 })
    }

    console.log("Single image upload:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      productId,
    })

    let response

    // Use staged upload for larger files
    if (file.size > 5 * 1024 * 1024) {
      console.log("Using staged upload for large file")
      response = await uploadProductImageStaged(productId, file)
    } else {
      // ══ SMALL FILE (≤5 MB) – REST attachment upload ══
      const bytes = await file.arrayBuffer()
      const base64 = Buffer.from(bytes).toString("base64")

      response = await uploadProductImage(productId, {
        base64,
        altText: altText || file.name.replace(/\.[^/.]+$/, ""),
        filename: file.name,
      })
    }

    if (response.status === 200 || response.status === 201) {
      // Handle REST API response
      if (response.body.image) {
        return NextResponse.json({
          success: true,
          image: {
            id: response.body.image.id,
            url: response.body.image.src,
            altText: response.body.image.alt,
          },
        })
      }
      // Handle GraphQL response (staged upload)
      else if (response.body.data?.productCreateMedia?.media) {
        const media = response.body.data.productCreateMedia.media[0]
        return NextResponse.json({
          success: true,
          image: {
            id: media.id,
            url: media.image.url,
            altText: media.image.altText,
          },
        })
      }
    }

    const errors = response.body.errors || response.body.data?.productCreateMedia?.mediaUserErrors || []
    return NextResponse.json({ success: false, error: errors }, { status: 422 })
  } catch (error) {
    console.error("Upload Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
