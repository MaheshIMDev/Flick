'use client';

import { useState } from 'react';
import { LogOut, User, Users, MessageSquare, Settings, Menu, X, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { useContacts, Contact } from '@/hooks/useContacts';

export default function Sidebar({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { logout } = useAuth();
  const router = useRouter();
  const { contacts, groups, loading } = useContacts();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const filteredContacts = contacts.filter(c => 
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const hasContacts = filteredContacts.length > 0;
  const hasGroups = groups.length > 0;

  return (
    <>
      {/* Mobile Hamburger */}
      <button 
        onClick={toggleSidebar} 
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out
          overflow-y-auto
        `}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {/* Mini Profile */}
          <div className="flex items-center space-x-3 mb-4">
            <Avatar src={user.avatar_url} alt={user.display_name} size="md" online={user.is_online} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.display_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
            </div>
          </div>

          {/* Status Selector */}
          <select className="w-full p-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="away">Away</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Navigation & Sections */}
        <nav className="p-4 space-y-4">
          {/* New Chat Button */}
          <Button 
            variant="primary" 
            className="w-full justify-start" 
            onClick={() => router.push('/new-chat')}  // Future route
          >
            <Plus size={20} className="mr-2" />
            New Chat
          </Button>

          {/* Contacts Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
              Contacts ({filteredContacts.length})
            </h3>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : !hasContacts ? (
              <div className="text-center py-4">
                <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No contacts yet</p>
                <Button variant="ghost" onClick={() => router.push('/friends')} size="sm" className="mt-2">  {/* Changed to ghost */}
                  Add your first friend
                </Button>
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredContacts.map((contact: Contact) => (
                  <li key={contact.id}>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-left hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => {/* Open chat */}}
                    >
                      <Avatar src={contact.avatar_url} size="sm" alt="" online={contact.is_online} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {contact.display_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{contact.username}</p>
                      </div>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Groups Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
              Groups ({groups.length})
            </h3>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : !hasGroups ? (
              <div className="text-center py-4">
                <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No groups yet</p>
                <Button variant="ghost" size="sm" className="mt-2">  {/* Changed to ghost */}
                  Create a group
                </Button>
              </div>
            ) : (
              <ul className="space-y-1">
                {groups.map((group: any) => (
                  <li key={group.id}>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-left hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => {/* Open group chat */}}
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-xs font-bold">{group.name?.[0] || 'G'}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {group.name}
                      </p>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Settings */}
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => {/* Settings Modal */}}
          >
            <Settings size={20} className="mr-2" />
            Settings
          </Button>
        </nav>

        {/* Logout */}
        <div className="absolute bottom-4 left-4 right-4">
          <Button 
            variant="outline" 
            icon={<LogOut size={18} />} 
            className="w-full" 
            onClick={logout}
          >
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}