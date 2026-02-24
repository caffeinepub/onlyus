import React from 'react';
import { MessageCircle, Camera, Image, Phone } from 'lucide-react';

type Tab = 'chat' | 'camera' | 'gallery' | 'calls';

interface BottomTabNavigatorProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'chat', label: 'Chat', icon: <MessageCircle size={22} /> },
  { id: 'camera', label: 'Camera', icon: <Camera size={22} /> },
  { id: 'gallery', label: 'Gallery', icon: <Image size={22} /> },
  { id: 'calls', label: 'Calls', icon: <Phone size={22} /> },
];

export default function BottomTabNavigator({ activeTab, onTabChange }: BottomTabNavigatorProps) {
  return (
    <nav
      className="shrink-0 flex items-center bg-white/90 backdrop-blur-sm border-t border-rose-100 shadow-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              isActive ? 'text-warm-accent' : 'text-rose-pink/60'
            }`}
          >
            <span className={`transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}>
              {tab.icon}
            </span>
            <span className={`text-[10px] font-medium ${isActive ? 'text-warm-accent' : 'text-rose-pink/60'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
