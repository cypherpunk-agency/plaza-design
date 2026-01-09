type ViewMode = 'channels' | 'dms' | 'profile' | 'forum' | 'settings';

interface MobileBottomNavProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenUserPanel?: () => void;
  showUserPanelButton?: boolean;
  hasUnreadDMs?: boolean;
}

const tabs: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'forum', label: 'Forum', icon: '[]' },
  { id: 'channels', label: 'Chat', icon: '#' },
  { id: 'dms', label: 'DMs', icon: '@' },
  { id: 'settings', label: 'Settings', icon: '*' },
];

export function MobileBottomNav({
  viewMode,
  onViewModeChange,
  onOpenUserPanel,
  showUserPanelButton = false,
  hasUnreadDMs = false,
}: MobileBottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t-2 border-primary-500 bg-black safe-area-bottom z-40">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = viewMode === tab.id || (tab.id === 'profile' && viewMode === 'profile');
          const showBadge = tab.id === 'dms' && hasUnreadDMs;

          return (
            <button
              key={tab.id}
              onClick={() => onViewModeChange(tab.id)}
              className={`
                flex-1 flex flex-col items-center justify-center py-3 touch-target
                font-mono text-xs transition-colors relative
                ${isActive
                  ? 'text-primary-400 bg-primary-950'
                  : 'text-primary-600 hover:text-primary-500 hover:bg-primary-950/50'
                }
              `}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="mt-1">{tab.label}</span>
              {showBadge && (
                <span className="absolute top-2 right-1/4 w-2 h-2 bg-accent-400 rounded-full" />
              )}
            </button>
          );
        })}

        {/* User list button - only show in channels view */}
        {showUserPanelButton && onOpenUserPanel && (
          <button
            onClick={onOpenUserPanel}
            className="flex-1 flex flex-col items-center justify-center py-3 touch-target font-mono text-xs text-primary-600 hover:text-primary-500 hover:bg-primary-950/50 transition-colors"
          >
            <span className="text-lg leading-none">&gt;_</span>
            <span className="mt-1">Users</span>
          </button>
        )}
      </div>
    </nav>
  );
}
