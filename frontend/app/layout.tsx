import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Pathwise - AI-Powered Personalized Learning Platform',
  description:
    'Transform textbooks, slides, and lecture materials into personalized interactive roadmaps, step-by-step AI tutoring, and adaptive assessments.',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>Pathwise AI &copy; {new Date().getFullYear()} &mdash; Grounded Learning Intelligence</p>
            <p className="text-slate-400">Powered by Gemini &amp; PyMuPDF</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
