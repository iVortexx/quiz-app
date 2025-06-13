
import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { AuthProvider } from "@/contexts/auth-context";

export const metadata: Metadata = {
    title: "Quiz App",
    description: "AI-Powered Quiz Generator",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    <SidebarProvider>
                        <AppSidebar />
                        <main className={"relative w-full overflow-hidden"}>
                            <SidebarTrigger />
                            {children}
                            <Toaster
                                position="top-right"
                                toastOptions={{
                                    duration: 4000,
                                    style: {
                                        background: "#363636",
                                        color: "#fff",
                                    },
                                    success: {
                                        duration: 3000,
                                        iconTheme: {
                                            primary: "#4ade80",
                                            secondary: "#fff",
                                        },
                                    },
                                    error: {
                                        duration: 4000,
                                        iconTheme: {
                                            primary: "#ef4444",
                                            secondary: "#fff",
                                        },
                                    },
                                }}
                            />
                        </main>
                    </SidebarProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
