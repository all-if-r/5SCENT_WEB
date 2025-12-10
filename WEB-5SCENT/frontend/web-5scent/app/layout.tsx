import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { CartProvider } from "@/contexts/CartContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ToastProvider } from "@/contexts/ToastContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "5SCENT - Premium Perfume Ecommerce",
  description: "Discover luxury fragrances for day and night",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-body`}>
        <ToastProvider>
          <AuthProvider>
            <AdminProvider>
              <CartProvider>
                <NotificationProvider>
                  {children}
                </NotificationProvider>
              </CartProvider>
            </AdminProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
