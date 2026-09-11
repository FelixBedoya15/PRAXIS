import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'PRAXIS Prevención y Seguros - Intermediación ARL & SG-SST',
  description: 'PRAXIS PREVENCIÓN Y SEGUROS AGENCIA DE SEGUROS LTDA. Plataforma integral de gestión de intermediación ARL, Comisiones PILA, Consultoría de Campo SST y RUI MinTrabajo.',
  icons: {
    icon: '/praxis-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <Navigation>{children}</Navigation>
      </body>
    </html>
  );
}
