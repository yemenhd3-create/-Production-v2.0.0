import Home from '@/pages/Home';
import { Toaster } from './ui/sonner';
import { TooltipProvider } from './ui/tooltip';

export default function AuthenticatedApplication({ friendTestMode = false }: { friendTestMode?: boolean }) {
  return <TooltipProvider><Home friendTestMode={friendTestMode} /><Toaster /></TooltipProvider>;
}
