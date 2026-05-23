'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Play,
  Bug,
  BarChart3,
  Settings,
  ChevronLeft,
  FolderKanban,
  LayoutDashboard,
  ChevronsUpDown,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from './sidebar-context';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  {
    title: 'ダッシュボード',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'テスト仕様書',
    href: '/test-specs',
    icon: FileText,
  },
  {
    title: 'テストラン',
    href: '/test-runs',
    icon: Play,
  },
  {
    title: 'バグ管理',
    href: '/bugs',
    icon: Bug,
  },
  {
    title: 'レポート',
    href: '/reports',
    icon: BarChart3,
  },
  {
    title: '設定',
    href: '/settings',
    icon: Settings,
  },
];

interface SampleProject {
  id: string;
  name: string;
}

const sampleProjects: SampleProject[] = [
  { id: '1', name: 'Sample Project' },
  { id: '2', name: 'Web Application' },
  { id: '3', name: 'Mobile App' },
];

const defaultProject: SampleProject = sampleProjects[0] ?? { id: '1', name: 'Sample Project' };

export function Sidebar() {
  const pathname = usePathname();
  const { state, open, toggleSidebar, isMobile } = useSidebar();
  const [selectedProject, setSelectedProject] = React.useState<SampleProject>(defaultProject);

  // Don't render sidebar on mobile - it uses Sheet instead
  if (isMobile) {
    return null;
  }

  return (
    <aside
      data-state={state}
      className={cn(
        'group/sidebar relative flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out',
        open ? 'w-64' : 'w-16'
      )}
    >
      {/* Project Selector */}
      <div className="flex h-14 items-center border-b px-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent',
              !open && 'justify-center px-0'
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FolderKanban className="size-4" />
            </div>
            {open && (
              <>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{selectedProject.name}</span>
                  <span className="text-xs text-muted-foreground">プロジェクト</span>
                </div>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>プロジェクト切替</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sampleProjects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={cn(
                  'cursor-pointer',
                  selectedProject.id === project.id && 'bg-accent text-accent-foreground'
                )}
              >
                <FolderKanban className="mr-2 size-4" />
                {project.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                !open && 'justify-center px-2'
              )}
              title={!open ? item.title : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {open && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size={open ? 'default' : 'icon'}
          className={cn('w-full', !open && 'justify-center')}
          onClick={toggleSidebar}
        >
          <ChevronLeft
            className={cn('size-4 transition-transform duration-200', !open && 'rotate-180')}
          />
          {open && <span className="ml-2">折りたたむ</span>}
        </Button>
      </div>
    </aside>
  );
}
