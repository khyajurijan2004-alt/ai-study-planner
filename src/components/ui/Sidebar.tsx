'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  GraduationCap,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-56 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <GraduationCap size={16} className="text-white" />
        </div>
        <span className="font-bold text-base text-foreground">StudyAI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn('sidebar-link', pathname === href && 'active')}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-border">
        {profile?.studyStreak ? (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-amber-50 border border-amber-100">
            <Flame size={14} className="text-amber-500" />
            <span className="text-xs font-medium text-amber-700">
              {profile.studyStreak} day streak
            </span>
          </div>
        ) : null}

        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {(profile?.name || user?.displayName || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {profile?.name || user?.displayName || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn-ghost w-full justify-start text-muted-foreground hover:text-destructive mt-1"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
