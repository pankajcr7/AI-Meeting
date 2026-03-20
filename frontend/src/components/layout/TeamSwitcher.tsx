'use client';

import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { Team } from '@/types';

export function TeamSwitcher() {
  const { team, teams, switchTeam } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 max-w-[200px]">
          <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {team?.name?.charAt(0)?.toUpperCase() || 'T'}
          </div>
          <span className="truncate text-sm">{team?.name || 'Select Team'}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuLabel>Teams</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {teams.map((t: Team) => (
          <DropdownMenuItem
            key={t._id}
            onClick={() => switchTeam(t._id)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {t.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{t.name}</span>
            </div>
            {team?._id === t._id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
