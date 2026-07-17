import "./globals.css";

export const metadata = {
  title: "تاقیکردنەوەی ڕێنمایی قوتابخانە ناحکومییەکان",
  description:
    "سیستەمی تاقیکردنەوەی خۆکار بۆ پرسیارەکانی ڕێنمایی قوتابخانە و پەیمانگە ناحکومییەکان — هەڵبژاردنی ماددە و بەشەکان و وەرگرتنی ئەنجام.",
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ckb" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
