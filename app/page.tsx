"use client"

import type React from "react"

import { useState } from "react"
import {
  ArrowRight,
  CheckCircle,
  Star,
  Play,
  Zap,
  Shield,
  Users,
  Upload,
  DollarSign,
  Package,
  History,
  BarChart3,
  Settings,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0)

  const howItWorksSteps = [
    {
      title: "Connect Your Store",
      description: "Securely connect your Shopify store using API credentials in just a few clicks",
      image: "/placeholder.svg?height=400&width=600",
      steps: ["Enter your store domain", "Add API credentials", "Verify connection status"],
      imagePosition: "right",
    },
    {
      title: "Smart Image Upload System",
      description: "Upload hundreds of product images by SKU with our intelligent ZIP file processing",
      image: "/placeholder.svg?height=400&width=600",
      steps: ["Prepare ZIP with SKU folders", "Upload and auto-process", "Images assigned instantly"],
      imagePosition: "left",
    },
    {
      title: "Bulk Discount Management",
      description: "Apply percentage discounts across your entire catalog with advanced filtering",
      image: "/placeholder.svg?height=400&width=600",
      steps: ["Select products or collections", "Set discount percentage", "Apply changes instantly"],
      imagePosition: "right",
    },
  ]

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "E-commerce Manager",
      company: "Pure Jewels",
      content:
        "The bulk image upload saved us 20+ hours per week. We can now process hundreds of product images in minutes!",
      rating: 5,
      avatar: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Mike Rodriguez",
      role: "Store Owner",
      company: "Tech Gadgets Pro",
      content: "The discount system helped us implement seasonal sales across 500+ products effortlessly.",
      rating: 5,
      avatar: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Emily Johnson",
      role: "Operations Director",
      company: "Fashion Forward",
      content: "Finally, a tool that understands bulk operations. The SKU-based image upload is genius!",
      rating: 5,
      avatar: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "David Kim",
      role: "Marketing Director",
      company: "Urban Style",
      content: "RankOptim transformed our product management workflow. The time savings are incredible!",
      rating: 5,
      avatar: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Lisa Wang",
      role: "Operations Manager",
      company: "Home Essentials",
      content: "The bulk discount feature helped us increase sales by 40% during our seasonal campaigns.",
      rating: 5,
      avatar: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "James Thompson",
      role: "E-commerce Specialist",
      company: "Sports Gear Plus",
      content: "Best investment we made for our Shopify store. The ROI was immediate and substantial.",
      rating: 5,
      avatar: "/placeholder.svg?height=60&width=60",
    },
  ]

  const stats = [
    { label: "Images Processed", value: "100K+", icon: Upload },
    { label: "Time Saved", value: "2000+ hrs", icon: Zap },
    { label: "Happy Users", value: "500+", icon: Users },
    { label: "Uptime", value: "99.9%", icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/landing" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">RankOptim</span>
                <div className="text-xs text-gray-500">Shopify Admin Pro</div>
              </div>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">
                How It Works
              </a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">
                Testimonials
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/admin">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  🚀 Smart Bulk Operations for Shopify
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
                  Transform Your{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Shopify Store
                  </span>{" "}
                  Management
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Upload hundreds of product images by SKU and apply bulk discounts across your entire catalog.
                  Streamline your e-commerce workflow with our powerful automation tools.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/admin">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3"
                  >
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-lg px-8 py-3 bg-transparent">
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </div>

              <div className="flex items-center space-x-8 pt-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">No setup fees</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Secure API integration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Real-time sync</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative z-10">
                <Image
                  src="/placeholder.svg?height=600&width=800"
                  alt="RankOptim Shopify Admin Dashboard"
                  width={800}
                  height={600}
                  className="rounded-2xl shadow-2xl"
                  priority
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur-3xl opacity-20 transform scale-105"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern E-commerce
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage your Shopify store efficiently, from bulk image uploads to discount
              management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Smart Image Upload Feature */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-8 flex flex-col justify-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Image Upload</h3>
                  <p className="text-gray-600 mb-6">
                    Upload hundreds of product images by SKU with our intelligent ZIP file processing system. Organize
                    images in folders named with SKU numbers for automatic assignment.
                  </p>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>ZIP file processing</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>SKU-based organization</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Automatic image assignment</span>
                    </div>
                  </div>
                  <Link href="/smart-image-upload">
                    <Button className="bg-blue-600 hover:bg-blue-700 w-full">
                      Start Image Upload
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 flex items-center justify-center">
                  <Image
                    src="/placeholder.svg?height=300&width=400"
                    alt="Smart Image Upload System"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-md"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Discount System Feature */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-8 flex flex-col justify-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Bulk Discount System</h3>
                  <p className="text-gray-600 mb-6">
                    Apply percentage discounts across your entire catalog with advanced filtering options. Schedule
                    discounts and track all pricing changes with rollback capabilities.
                  </p>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Percentage-based discounts</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Advanced product filtering</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Scheduled pricing changes</span>
                    </div>
                  </div>
                  <Link href="/bulk-discount">
                    <Button className="bg-purple-600 hover:bg-purple-700 w-full">
                      Manage Discounts
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 flex items-center justify-center">
                  <Image
                    src="/placeholder.svg?height=300&width=400"
                    alt="Bulk Discount System"
                    width={400}
                    height={300}
                    className="rounded-lg shadow-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Package className="w-6 h-6" />}
              title="Product Management"
              description="View and manage all your products in one centralized dashboard"
              link="/admin"
              linkText="Manage Products"
              comingSoon={false}
            />
            <FeatureCard
              icon={<History className="w-6 h-6" />}
              title="Universal History"
              description="Track every change with comprehensive operation history and rollback capabilities"
              link="/coming-soon"
              linkText="Coming Soon"
              comingSoon={true}
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Advanced Analytics"
              description="Get insights into your product performance and pricing strategies"
              link="/coming-soon"
              linkText="Coming Soon"
              comingSoon={true}
            />
            <FeatureCard
              icon={<Settings className="w-6 h-6" />}
              title="Automation Rules"
              description="Set up automated workflows for product updates and pricing changes"
              link="/coming-soon"
              linkText="Coming Soon"
              comingSoon={true}
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started in minutes with our simple three-step process
            </p>
          </div>

          <div className="space-y-20">
            {howItWorksSteps.map((step, index) => (
              <div
                key={index}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                  step.imagePosition === "left" ? "lg:grid-flow-col-dense" : ""
                }`}
              >
                {/* Content */}
                <div className={step.imagePosition === "left" ? "lg:col-start-2" : ""}>
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                      {index + 1}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900">{step.title}</h3>
                  </div>
                  <p className="text-lg text-gray-600 mb-6">{step.description}</p>
                  <div className="space-y-3 mb-8">
                    {step.steps.map((stepItem, stepIndex) => (
                      <div key={stepIndex} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{stepItem}</span>
                      </div>
                    ))}
                  </div>
                  <Link href={index === 0 ? "/admin" : index === 1 ? "/smart-image-upload" : "/bulk-discount"}>
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      {index === 0 ? "Connect Store" : index === 1 ? "Upload Images" : "Apply Discounts"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>

                {/* Image */}
                <div className={step.imagePosition === "left" ? "lg:col-start-1" : ""}>
                  <div className="relative">
                    <Image
                      src={step.image || "/placeholder.svg"}
                      alt={step.title}
                      width={600}
                      height={400}
                      className="rounded-xl shadow-lg"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Loved by E-commerce Teams</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what our customers say about transforming their Shopify workflow with bulk operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic">"{testimonial.content}"</p>
                  <div className="flex items-center space-x-3">
                    <Image
                      src={testimonial.avatar || "/placeholder.svg"}
                      alt={testimonial.name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                      <div className="text-sm text-gray-500">{testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Transform Your Shopify Workflow?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of e-commerce teams who have streamlined their product management with bulk image uploads and
            discount systems.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/admin">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-3 bg-transparent"
            >
              Schedule Demo
            </Button>
          </div>
          <p className="text-blue-100 text-sm mt-4">No credit card required • 14-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Link href="/landing" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold">RankOptim</span>
                  <div className="text-xs text-gray-400">Shopify Admin Pro</div>
                </div>
              </Link>
              <p className="text-gray-400">
                The ultimate tool for managing your Shopify store with bulk operations and smart automation.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/coming-soon" className="hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/coming-soon" className="hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/coming-soon" className="hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 RankOptim - Shopify Admin Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
function FeatureCard({
  icon,
  title,
  description,
  link,
  linkText,
  comingSoon = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  link: string
  linkText: string
  comingSoon?: boolean
}) {
  return (
    <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow group">
      <CardHeader>
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4 text-gray-600">
          {icon}
        </div>
        <CardTitle className="text-xl text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">{description}</p>
        {comingSoon ? (
          <Button variant="outline" className="w-full bg-gray-50 text-gray-500 cursor-not-allowed" disabled>
            {linkText}
          </Button>
        ) : (
          <Link href={link}>
            <Button
              variant="outline"
              className="w-full group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors bg-transparent"
            >
              {linkText}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

