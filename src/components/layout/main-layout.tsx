'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { SidebarProvider } from './sidebar-context';
import { ProjectProvider } from '@/contexts/project-context';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { MobileSidebar } from './mobile-sidebar';
import { Footer } from './footer';

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  defaultSidebarOpen?: boolean;
}

export function MainLayout({ children, className, defaultSidebarOpen = true }: MainLayoutProps) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <React.Suspense fallback={null}>
        <ProjectProvider>
          <div className={cn('flex min-h-screen flex-col', className)}>
            <Header />
            <div className="flex flex-1">
              <Sidebar />
              <MobileSidebar />
              <main className="flex flex-1 flex-col">
                <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
                <Footer />
              </main>
            </div>
          </div>
        </ProjectProvider>
      </React.Suspense>
    </SidebarProvider>
  );
}
