"use client"

import type React from "react"

import { useState, useRef } from "react"
import { X, Save, Upload, Trash2, Plus } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Product {
  id: string
  title: string
  description: string
  tags: string[]
  status: string
  productType: string
  vendor: string
  images?: Array<{
    id: string
    url: string
    altText: string
  }>
}

interface ProductEditModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedProduct: Product) => void
  onDelete?: (productId: string) => void
  isNew?: boolean
}

export function ProductEditModal({ product, isOpen, onClose, onSave, onDelete, isNew = false }: ProductEditModalProps) {
  const [editedProduct, setEditedProduct] = useState<Product>(
    product || {
      id: "",
      title: "",
      description: "",
      tags: [],
      status: "draft",
      productType: "",
      vendor: "",
      images: [],
    },
  )
  const [newTag, setNewTag] = useState("")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const method = isNew ? "POST" : "PUT"
      const response = await fetch("/api/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editedProduct.id,
          title: editedProduct.title,
          description: editedProduct.description,
          tags: editedProduct.tags,
          status: editedProduct.status.toUpperCase(),
          productType: editedProduct.productType,
          vendor: editedProduct.vendor,
        }),
      })

      const json = await response.json()

      if (json.success) {
        onSave(json.product)
        onClose()
      } else {
        console.error("Save failed:", json.error)
        alert("Save failed: " + JSON.stringify(json.error))
      }
    } catch (error) {
      console.error("Error saving product:", error)
      alert("Error saving product: " + error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || isNew) return

    if (confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      try {
        const response = await fetch(`/api/products?id=${editedProduct.id}`, {
          method: "DELETE",
        })

        const json = await response.json()

        if (json.success) {
          onDelete(editedProduct.id)
          onClose()
        } else {
          console.error("Delete failed:", json.error)
          alert("Delete failed: " + JSON.stringify(json.error))
        }
      } catch (error) {
        console.error("Error deleting product:", error)
        alert("Error deleting product: " + error)
      }
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || isNew) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("productId", editedProduct.id)
      formData.append("altText", editedProduct.title)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const json = await response.json()

      if (json.success) {
        setEditedProduct({
          ...editedProduct,
          images: [...(editedProduct.images || []), json.image],
        })
      } else {
        console.error("Upload failed:", json.error)
        alert("Upload failed: " + JSON.stringify(json.error))
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      alert("Error uploading image: " + error)
    } finally {
      setUploading(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !editedProduct.tags.includes(newTag.trim())) {
      setEditedProduct({
        ...editedProduct,
        tags: [...editedProduct.tags, newTag.trim()],
      })
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setEditedProduct({
      ...editedProduct,
      tags: editedProduct.tags.filter((tag) => tag !== tagToRemove),
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{isNew ? "Create New Product" : "Edit Product"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Product Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product Title *</label>
              <Input
                value={editedProduct.title}
                onChange={(e) => setEditedProduct({ ...editedProduct, title: e.target.value })}
                placeholder="Enter product title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={editedProduct.description}
                onChange={(e) => setEditedProduct({ ...editedProduct, description: e.target.value })}
                placeholder="Enter product description"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select
                  value={editedProduct.status}
                  onValueChange={(value) => setEditedProduct({ ...editedProduct, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Product Type</label>
                <Input
                  value={editedProduct.productType}
                  onChange={(e) => setEditedProduct({ ...editedProduct, productType: e.target.value })}
                  placeholder="e.g., Jewelry, Ring, Necklace"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Vendor</label>
              <Input
                value={editedProduct.vendor}
                onChange={(e) => setEditedProduct({ ...editedProduct, vendor: e.target.value })}
                placeholder="Enter vendor name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === "Enter" && addTag()}
                />
                <Button onClick={addTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editedProduct.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Images */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product Images</label>
              {!isNew && (
                <div className="mb-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Image"}
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {editedProduct.images?.map((image, index) => (
                  <div key={image.id || index} className="relative">
                    <Image
                      src={image.url || "/placeholder.svg"}
                      alt={image.altText}
                      width={150}
                      height={150}
                      className="rounded-lg object-cover w-full h-32"
                    />
                    <div className="absolute top-2 right-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setEditedProduct({
                            ...editedProduct,
                            images: editedProduct.images?.filter((_, i) => i !== index) || [],
                          })
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {isNew && (
                <div className="text-sm text-gray-500 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  Save the product first to upload images
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <div>
            {!isNew && onDelete && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Product
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !editedProduct.title.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
