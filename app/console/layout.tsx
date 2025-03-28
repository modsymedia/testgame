import { Header } from '@/components/ui/Header';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
    </>
  );
} 