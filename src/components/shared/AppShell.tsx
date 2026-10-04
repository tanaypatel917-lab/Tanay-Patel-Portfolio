import { Footer } from './Footer';
import { MotionProvider } from './MotionProvider';
import { SoundProvider } from './SoundProvider';
import { Navbar } from '@/components/Navigation/Navbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <SoundProvider>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Navbar />
        <main id="main-content" tabIndex={-1}>{children}</main>
        <Footer />
      </SoundProvider>
    </MotionProvider>
  );
}
