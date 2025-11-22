'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-900 py-12">
      <div className="container mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Information */}
          <div>
            <h3 className="text-2xl font-header font-bold mb-4 text-black">5SCENT</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Discover your signature scent with our luxurious collection of premium fragrances.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-5 text-base text-black">Quick Links</h4>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li>
                <Link href="/about" className="hover:text-black transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-black transition-colors">
                  Products
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-black transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold mb-5 text-base text-black">Customer Service</h4>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li>
                <Link href="/shipping" className="hover:text-black transition-colors">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-black transition-colors">
                  Returns
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-black transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-black transition-colors">
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Us */}
          <div>
            <h4 className="font-semibold mb-5 text-base text-black">Contact Us</h4>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li>Phone: (+62) 826-4444-5311</li>
              <li>Email: info@5scent.com</li>
              <li>Jl. Telekomunikasi 1 Bandung, Indonesia</li>
            </ul>
            <div className="flex gap-4 mt-5">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black hover:text-gray-700 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black hover:text-gray-700 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black hover:text-gray-700 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-300 mt-10 pt-8 text-center">
          <p className="text-gray-600 text-sm">
            © 2025 5SCENT. All rights reserved. Crafted with elegance.
          </p>
        </div>
      </div>
    </footer>
  );
}
