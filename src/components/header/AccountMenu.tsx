import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';

const comingSoon = () => toast('Coming in step 12');

export function AccountMenu() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const name = session?.user.name ?? 'Signed out';
  const email = session?.user.email ?? '';
  const initial = name.charAt(0).toUpperCase() || '·';

  function handleSignOut() {
    signOut();
    queryClient.clear();
    navigate('/signin', { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Account menu"
      >
        <Avatar className="size-9 border border-rule bg-parchment">
          <AvatarFallback className="bg-parchment font-sans text-sm font-medium text-clay">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-serif text-sm text-ink">{name}</span>
          {email && <span className="text-xs font-normal text-ink-soft">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={comingSoon}>English (US) / (UK)</DropdownMenuItem>
        <DropdownMenuItem onSelect={comingSoon}>Export my journal</DropdownMenuItem>
        <DropdownMenuItem onSelect={comingSoon}>Delete my account</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
