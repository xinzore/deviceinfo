import { Smartphone, LogOut, Shield, Plus, Home, GitCompare, SlidersHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCurrentUser, signOut, getAccessToken } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import logo from '../styles/logo.png';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const session = await getCurrentUser();
    if (session) {
      setUser(session.user);

      // Fetch profile to check admin status
      const token = await getAccessToken();
      if (token) {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const profileData = await response.json();
          setProfile(profileData);
        }
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setProfile(null);
      toast.success('Çıkış yapıldı');
      navigate('/');
    } catch (error) {
      toast.error('Çıkış yapılırken hata oluştu');
    }
  };

  return (
    <header className="border-b border-white/10 sticky top-0 z-50 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left Side - Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <img src={logo} alt="Cihaz İnfo" className="h-16 w-16 object-contain" />
            <span className="text-xl">Cihaz İnfo</span>
          </div>

          {/* Center - Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Button
              variant={location.pathname === '/' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 mr-2" />
              Anasayfa
            </Button>

            <Button
              variant={location.pathname === '/compare' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/compare')}
            >
              <GitCompare className="w-4 h-4 mr-2" />
              Karşılaştır
            </Button>

            <Button
              variant={location.pathname === '/filter' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/filter')}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filtrele
            </Button>

            {user && (
              <Button
                variant={location.pathname === '/submit' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate('/submit')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Cihaz Ekle
              </Button>
            )}
          </nav>

          {/* Right Side - Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {user ? (
              <>
                {profile?.role === 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/admin')}
                  >
                    <Shield className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Admin</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Çıkış</span>
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Giriş Yap
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
