import type { Metadata } from 'next';
import './globals.css';
import StarknetProvider from '@/components/StarknetProvider';

export const metadata: Metadata = {
  title: 'Kirocred Verifier',
  description: 'Zero-knowledge credential verification system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <StarknetProvider>
          {children}
        </StarknetProvider>
      </body>
    </html>
  );
}
