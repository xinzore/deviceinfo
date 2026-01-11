import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Smartphone } from 'lucide-react';

export function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-white/10 mt-20 bg-black/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-6 h-6" />
              <span className="text-xl">Cihaz İnfo</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Akıllı telefonların teknik özelliklerini modern, minimal ve premium bir deneyimle keşfedin.
              Topluluk destekli, yeni nesil specification platformu.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm mb-4">Hızlı Linkler</h3>
            <div className="space-y-2">
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/')}
              >
                Anasayfa
              </Button>
              <br />
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/compare')}
              >
                Karşılaştır
              </Button>
              <br />
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/submit')}
              >
                Telefon Ekle
              </Button>
            </div>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm mb-4">Hesap</h3>
            <div className="space-y-2">
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/login')}
              >
                Giriş Yap
              </Button>
              <br />
              <Button
                variant="link"
                className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/admin')}
              >
                Admin Paneli
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Cihaz İnfo. Tüm hakları saklıdır.
            </p>
            <p className="text-xs text-muted-foreground">
              Cihaz bilgi platformu
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
