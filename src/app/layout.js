import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "AI Character Studio — Premium Character Design & Chat Hub",
  description:
    "Generate highly optimized, beautiful AI character portraits and converse with custom personas in a real-time responsive chat hub.",
  keywords: "AI character, character generator, visual avatar, roleplay companion, chat AI, fantasy, sci-fi",
  openGraph: {
    title: "AI Character Studio — Premium Character Design & Chat Hub",
    description: "Generate highly optimized, beautiful AI character portraits with custom personas.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="https://newoaks.s3.us-west-1.amazonaws.com/AutoDev/11407/5272b774-1dec-479f-9b03-bb7eeb892b80.jpg" />
      </head>
      <body className="antialiased min-h-screen bg-zinc-950 text-zinc-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
