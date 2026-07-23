'use client';
import { usePathname } from 'next/navigation';
import ComoFunciona from './ComoFunciona';

export default function ComoFuncionaGate() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  return <ComoFunciona />;
}
