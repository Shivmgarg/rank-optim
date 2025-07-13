"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, Package, Mail, CheckCircle, Clock, Zap, Shield, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function ComingSoonPage() {
  const [email, setEmail] = useState("")
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setIsSubscribed(true)
      setEmail("")
    }
  }

  const upcomingFeatures = [
    {
      title: "Universal History & Rollback",
      description: "Track every change with comprehensive operation history and one-click rollback capabilities",
      icon: Clock,
      eta: "Q2 2024",
      status: "In Development",
    },
    {
      title: "Advanced Analytics Dashboard",
      description: "Get insights into your product performance, pricing strategies, and sales trends",
      icon: Zap,
      eta: "Q2 2024",
      status: "Planning",
    },
    {
      title: "Automation Rules Engine",
      description: "Set up automated workflows for product updates, pricing changes, and inventory management",
      icon: Shield,
      eta: "Q3 2024",
      status: "Planning",
    },
    {
      title: "Multi-Store Management",
      description: "Manage multiple Shopify stores from a single dashboard with unified operations",
      icon: Users,
      eta: "Q3 2024",
      status: "Research",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/landing" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            <Link href="/landing" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">RankOptim</span>
                <div className="text-xs text-gray-500">Shopify Admin Pro</div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Content */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Exciting Features Coming Soon</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            We're working hard to bring you even more powerful tools for managing your Shopify store. Stay tuned for
            these amazing features!
          </p>

          {/* Email Subscription */}
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              {!isSubscribed ? (
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Get Notified</h3>
                    <p className="text-sm text-gray-600 mb-4">Be the first to know when new features are available</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                      <Mail className="w-4 h-4 mr-2" />
                      Notify Me
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">Thank You!</h3>
                  <p className="text-sm text-gray-600">We'll notify you as soon as new features are available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Features */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What's Coming Next</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingFeatures.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        {feature.eta}
                      </Badge>
                      <div className="text-xs text-gray-500">{feature.status}</div>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Available Features */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Now</h2>
          <p className="text-gray-600 mb-8">While you wait for new features, explore our current powerful tools</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/smart-image-upload">
              <Button className="bg-blue-600 hover:bg-blue-700">Smart Image Upload</Button>
            </Link>
            <Link href="/bulk-discount">
              <Button className="bg-purple-600 hover:bg-purple-700">Bulk Discount System</Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline">Product Management</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
