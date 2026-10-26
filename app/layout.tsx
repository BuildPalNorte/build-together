import type { Metadata, Viewport } from "next";
import { Locale } from "@/components/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "Build Together",
  description: "El talento existe. Solo falta conectarlo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07070c" },
    { media: "(prefers-color-scheme: light)", color: "#e4e4ea" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX">
      <body>
        <Locale>{children}</Locale>
      </body>
    </html>
  );
}
