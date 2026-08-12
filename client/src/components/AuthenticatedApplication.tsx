import Home from '@/pages/Home';
import { Toaster } from './ui/sonner';
import { TooltipProvider } from './ui/tooltip';

export default function AuthenticatedApplication() {
  return <TooltipProvider><Home /><Toaster /></TooltipProvider>;
}
