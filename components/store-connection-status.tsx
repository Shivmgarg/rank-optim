"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function StoreConnectionStatus() {
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error">("checking")
  const [storeInfo, setStoreInfo] = useState<any>(null)
  const [errorDetails, setErrorDetails] = useState<string>("")

  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log("Checking Shopify connection...")
        const response = await fetch("/api/products")

        if (response.ok) {
          const data = await response.json()
          console.log("Connection successful:", data)
          setConnectionStatus("connected")
          setStoreInfo({
            productCount: data.count || 0,
            storeName: "Shopify Store",
          })
          setErrorDetails("")
        } else {
          const errorData = await response.json()
          console.error("Connection failed:", errorData)
          setConnectionStatus("error")
          setErrorDetails(errorData.details || errorData.error || "Unknown error")
        }
      } catch (error) {
        console.error("Network error:", error)
        setConnectionStatus("error")
        setErrorDetails(error instanceof Error ? error.message : "Network error")
      }
    }

    checkConnection()
  }, [])

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "checking":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case "checking":
        return "Checking connection..."
      case "connected":
        return `Connected to ${storeInfo?.storeName} (${storeInfo?.productCount} products)`
      case "error":
        return `Connection failed: ${errorDetails}`
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "checking":
        return "bg-yellow-100 text-yellow-800"
      case "connected":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
    }
  }

  const retryConnection = () => {
    setConnectionStatus("checking")
    setErrorDetails("")
    // Trigger useEffect again
    window.location.reload()
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">Store Connection</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor()}>{getStatusText()}</Badge>
            {connectionStatus === "error" && (
              <Button variant="outline" size="sm" onClick={retryConnection}>
                Retry
              </Button>
            )}
          </div>
        </div>
        {connectionStatus === "error" && errorDetails && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            <strong>Debug Info:</strong> {errorDetails}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
