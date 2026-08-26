import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Users,
  User as UserIcon,
  Crown,
  Medal,
  Award,
  Calendar,
  Zap,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Star,
  ShieldCheck,
  ChevronDown,
  Info,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import { Event, Registration, EventWinner, User } from '../../types';

export interface SingleLeaderboardEntry {
  id: string;
  name: string;
  email: string;
  registrationNumber: string;
  avatarUrl?: string;
  totalScore: number;
  eventsWonCount: number;
  eventsParticipatedCount: number;
  rank: number;
  bestPlacement?: string;
  recentEventNames: string[];
}

export interface TeamLeaderboardEntry {
  id: string;
  teamName: string;
  teamLogoUrl?: string;
  leaderName: string;
  leaderEmail: string;
  leaderRegistrationNumber: string;
  memberCount: number;
  members: { name: string; email: string; registrationNumber?: string; avatarUrl?: string }[];
  totalScore: number;
  eventsWonCount: number;
  eventsParticipatedCount: number;
  rank: number;
  bestPlacement?: string;
  recentEventNames: string[];
}

interface LeaderboardViewProps {
  currentUser: User;
  events: Event[];
  registrations: Registration[];
  allWinnersMap: Record<string, EventWinner[]>;
  allUsers?: User[];
  onSelectEvent?: (event: Event) => void;
  onOpenProfile?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentUser,
  events,
  registrations,
  allWinnersMap,
  allUsers = [],
  onSelectEvent,
  onOpenProfile,
}) => {
  const [leaderboardType, setLeaderboardType] = useState<'single' | 'team'>('single');
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Month Generation
  const currentDate = new Date();
  const MIN_LEADERBOARD_MONTH = '2026-08'; // Leaderboard starts from August 2026
  const currentMonthKey = currentDate.toISOString().substring(0, 7) < MIN_LEADERBOARD_MONTH
    ? MIN_LEADERBOARD_MONTH
    : currentDate.toISOString().substring(0, 7); // e.g. "2026-08"

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Generate available months dynamically starting from August 2026
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, string>();

    // Baseline: August 2026
    monthMap.set('2026-08', 'August 2026');

    // Current month if >= August 2026
    const curActualKey = currentDate.toISOString().substring(0, 7);
    if (curActualKey >= MIN_LEADERBOARD_MONTH) {
      const curLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      monthMap.set(curActualKey, curLabel);
    }

    // Scan events for active months starting from August 2026
    events.forEach((e) => {
      if (e.startDate) {
        const k = e.startDate.substring(0, 7);
        if (k >= MIN_LEADERBOARD_MONTH && !monthMap.has(k)) {
          const d = new Date(e.startDate);
          monthMap.set(k, d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
        }
      }
    });

    return Array.from(monthMap.entries())
      .filter(([k]) => k >= MIN_LEADERBOARD_MONTH)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label]) => ({ key, label }));
  }, [events, currentMonthKey]);

  // Fast User Lookup Map for Avatars & Reg Numbers
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    allUsers.forEach((u) => {
      if (u.email) map.set(u.email.toLowerCase(), u);
    });
    if (currentUser.email) {
      map.set(currentUser.email.toLowerCase(), currentUser);
    }
    return map;
  }, [allUsers, currentUser]);

  // Filter events based on selected month
  const filteredEvents = useMemo(() => {
    if (selectedMonth === 'all') return events;
    return events.filter((e) => {
      const startKey = e.startDate ? e.startDate.substring(0, 7) : '';
      const endKey = e.endDate ? e.endDate.substring(0, 7) : '';
      return startKey === selectedMonth || endKey === selectedMonth;
    });
  }, [events, selectedMonth]);

  const filteredEventIds = useMemo(() => new Set(filteredEvents.map((e) => e.id)), [filteredEvents]);

  // =========================================================================
  // 1. CALCULATE INDIVIDUAL (SINGLE) LEADERBOARD
  // =========================================================================
  const singleLeaderboard = useMemo<SingleLeaderboardEntry[]>(() => {
    const map = new Map<string, {
      name: string;
      email: string;
      registrationNumber: string;
      avatarUrl?: string;
      totalScore: number;
      eventsWonCount: number;
      eventsParticipatedCount: number;
      bestRank: number;
      recentEventNames: Set<string>;
    }>();

    // Scan all registrations for filtered events
    registrations.forEach((reg) => {
      if (!filteredEventIds.has(reg.eventId) || reg.status === 'cancelled') return;

      const email = reg.attendeeEmail.toLowerCase();
      const userProfile = userMap.get(email);

      if (!map.has(email)) {
        map.set(email, {
          name: userProfile?.name || reg.attendeeName || 'Attendee',
          email: email,
          registrationNumber: userProfile?.registrationNumber || reg.registrationNumber || 'N/A',
          avatarUrl: userProfile?.avatarUrl || undefined,
          totalScore: 0,
          eventsWonCount: 0,
          eventsParticipatedCount: 0,
          bestRank: 999,
          recentEventNames: new Set<string>(),
        });
      }

      const entry = map.get(email)!;
      entry.eventsParticipatedCount += 1;

      // Participation Points
      if (reg.status === 'checked_in' || reg.checkedInAt) {
        entry.totalScore += 20; // 20 pts for gate check-in
      } else {
        entry.totalScore += 10; // 10 pts for registration
      }

      const evt = events.find((e) => e.id === reg.eventId);
      if (evt) entry.recentEventNames.add(evt.title);
    });

    // Scan winners for filtered events
    filteredEvents.forEach((evt) => {
      const winners = allWinnersMap[evt.id] || [];
      winners.forEach((w) => {
        const email = w.attendeeEmail.toLowerCase();
        const userProfile = userMap.get(email);

        if (!map.has(email)) {
          map.set(email, {
            name: userProfile?.name || w.attendeeName || 'Winner',
            email: email,
            registrationNumber: userProfile?.registrationNumber || 'N/A',
            avatarUrl: userProfile?.avatarUrl || undefined,
            totalScore: 0,
            eventsWonCount: 0,
            eventsParticipatedCount: 1,
            bestRank: 999,
            recentEventNames: new Set<string>([evt.title]),
          });
        }

        const entry = map.get(email)!;
        const rank = w.rank || 1;
        entry.bestRank = Math.min(entry.bestRank, rank);
        entry.eventsWonCount += 1;

        // Points awarded for placement + judge score
        let placementPoints = 25;
        if (rank === 1) placementPoints = 100;
        else if (rank === 2) placementPoints = 75;
        else if (rank === 3) placementPoints = 50;

        const scoreBonus = w.score ? Number(w.score) : 0;
        entry.totalScore += Math.max(placementPoints, scoreBonus);
      });
    });

    // Sort descending by score, then wins
    const sorted = Array.from(map.values())
      .map((entry) => {
        let bestPlacement = undefined;
        if (entry.bestRank === 1) bestPlacement = '1st Place Gold 🥇';
        else if (entry.bestRank === 2) bestPlacement = '2nd Place Silver 🥈';
        else if (entry.bestRank === 3) bestPlacement = '3rd Place Bronze 🥉';
        else if (entry.bestRank < 999) bestPlacement = `Rank #${entry.bestRank}`;

        return {
          id: entry.email,
          name: entry.name,
          email: entry.email,
          registrationNumber: entry.registrationNumber,
          avatarUrl: entry.avatarUrl,
          totalScore: entry.totalScore,
          eventsWonCount: entry.eventsWonCount,
          eventsParticipatedCount: entry.eventsParticipatedCount,
          bestPlacement,
          recentEventNames: Array.from(entry.recentEventNames),
          rank: 0,
        };
      })
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.eventsWonCount !== a.eventsWonCount) return b.eventsWonCount - a.eventsWonCount;
        return a.name.localeCompare(b.name);
      });

    // Assign 1-indexed Ranks
    sorted.forEach((item, index) => {
      item.rank = index + 1;
    });

    return sorted;
  }, [filteredEvents, filteredEventIds, registrations, allWinnersMap, userMap, events]);

  // =========================================================================
  // 2. CALCULATE TEAM WISE LEADERBOARD
  // =========================================================================
  const teamLeaderboard = useMemo<TeamLeaderboardEntry[]>(() => {
    const map = new Map<string, {
      teamName: string;
      teamLogoUrl?: string;
      leaderName: string;
      leaderEmail: string;
      leaderRegistrationNumber: string;
      members: Map<string, { name: string; email: string; registrationNumber?: string; avatarUrl?: string }>;
      totalScore: number;
      eventsWonCount: number;
      eventsParticipatedCount: number;
      bestRank: number;
      recentEventNames: Set<string>;
    }>();

    registrations.forEach((reg) => {
      if (!filteredEventIds.has(reg.eventId) || reg.status === 'cancelled' || !reg.teamName?.trim()) return;

      const teamKey = reg.teamName.trim().toLowerCase();
      const memberEmail = reg.attendeeEmail.toLowerCase();
      const userProfile = userMap.get(memberEmail);

      if (!map.has(teamKey)) {
        map.set(teamKey, {
          teamName: reg.teamName.trim(),
          teamLogoUrl: reg.teamLogoUrl || undefined,
          leaderName: reg.teamLeaderName || (reg.isTeamLeader ? reg.attendeeName : 'Team Leader'),
          leaderEmail: reg.isTeamLeader ? memberEmail : '',
          leaderRegistrationNumber: reg.isTeamLeader ? (userProfile?.registrationNumber || reg.registrationNumber || 'N/A') : 'N/A',
          members: new Map(),
          totalScore: 0,
          eventsWonCount: 0,
          eventsParticipatedCount: 0,
          bestRank: 999,
          recentEventNames: new Set<string>(),
        });
      }

      const teamEntry = map.get(teamKey)!;

      if (!teamEntry.teamLogoUrl && reg.teamLogoUrl) {
        teamEntry.teamLogoUrl = reg.teamLogoUrl;
      }

      if (reg.isTeamLeader) {
        teamEntry.leaderName = reg.attendeeName;
        teamEntry.leaderEmail = memberEmail;
        teamEntry.leaderRegistrationNumber = userProfile?.registrationNumber || reg.registrationNumber || 'N/A';
      }

      teamEntry.members.set(memberEmail, {
        name: userProfile?.name || reg.attendeeName,
        email: memberEmail,
        registrationNumber: userProfile?.registrationNumber || reg.registrationNumber,
        avatarUrl: userProfile?.avatarUrl,
      });

      // Participation Points
      if (reg.status === 'checked_in' || reg.checkedInAt) {
        teamEntry.totalScore += 25; // 25 pts for each checked in member
      } else {
        teamEntry.totalScore += 15; // 15 pts for registration
      }

      const evt = events.find((e) => e.id === reg.eventId);
      if (evt) {
        teamEntry.recentEventNames.add(evt.title);
      }
    });

    // Scan winners for team placements (deduplicate per team per event)
    filteredEvents.forEach((evt) => {
      const winners = allWinnersMap[evt.id] || [];
      const seenTeamsForEvent = new Set<string>();

      winners.forEach((w) => {
        if (!w.teamName?.trim()) return;
        const teamKey = w.teamName.trim().toLowerCase();
        if (seenTeamsForEvent.has(teamKey)) return;
        seenTeamsForEvent.add(teamKey);

        if (!map.has(teamKey)) {
          map.set(teamKey, {
            teamName: w.teamName.trim(),
            teamLogoUrl: w.teamLogoUrl || undefined,
            leaderName: w.attendeeName,
            leaderEmail: w.attendeeEmail.toLowerCase(),
            leaderRegistrationNumber: 'N/A',
            members: new Map(),
            totalScore: 0,
            eventsWonCount: 0,
            eventsParticipatedCount: 1,
            bestRank: 999,
            recentEventNames: new Set<string>([evt.title]),
          });
        }

        const teamEntry = map.get(teamKey)!;
        const rank = w.rank || 1;
        teamEntry.bestRank = Math.min(teamEntry.bestRank, rank);
        teamEntry.eventsWonCount += 1;

        let placementPoints = 40;
        if (rank === 1) placementPoints = 150;
        else if (rank === 2) placementPoints = 100;
        else if (rank === 3) placementPoints = 75;

        const scoreBonus = w.score ? Number(w.score) : 0;
        teamEntry.totalScore += Math.max(placementPoints, scoreBonus);
      });
    });

    // Sort descending by total score
    const sorted = Array.from(map.values())
      .map((entry) => {
        let bestPlacement = undefined;
        if (entry.bestRank === 1) bestPlacement = '1st Place Champions 🏆';
        else if (entry.bestRank === 2) bestPlacement = '2nd Place Silver 🥈';
        else if (entry.bestRank === 3) bestPlacement = '3rd Place Bronze 🥉';
        else if (entry.bestRank < 999) bestPlacement = `Rank #${entry.bestRank}`;

        return {
          id: entry.teamName.toLowerCase(),
          teamName: entry.teamName,
          teamLogoUrl: entry.teamLogoUrl,
          leaderName: entry.leaderName,
          leaderEmail: entry.leaderEmail,
          leaderRegistrationNumber: entry.leaderRegistrationNumber,
          memberCount: Math.max(1, entry.members.size),
          members: Array.from(entry.members.values()),
          totalScore: entry.totalScore,
          eventsWonCount: entry.eventsWonCount,
          eventsParticipatedCount: Math.max(1, entry.recentEventNames.size),
          bestPlacement,
          recentEventNames: Array.from(entry.recentEventNames),
          rank: 0,
        };
      })
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.eventsWonCount !== a.eventsWonCount) return b.eventsWonCount - a.eventsWonCount;
        return a.teamName.localeCompare(b.teamName);
      });

    sorted.forEach((item, index) => {
      item.rank = index + 1;
    });

    return sorted;
  }, [filteredEvents, filteredEventIds, registrations, allWinnersMap, userMap, events]);

  // Strictly Top 50 for Solo & Top 10 for Team
  const topSingleList = useMemo(() => {
    return singleLeaderboard.slice(0, 50);
  }, [singleLeaderboard]);

  const topTeamList = useMemo(() => {
    return teamLeaderboard.slice(0, 10);
  }, [teamLeaderboard]);

  // Top 3 Podium Winners
  const topThreeSingle = singleLeaderboard.slice(0, 3);
  const topThreeTeam = teamLeaderboard.slice(0, 3);

  const selectedMonthLabel =
    selectedMonth === 'all'
      ? 'All-Time Champions'
      : availableMonths.find((m) => m.key === selectedMonth)?.label || 'Current Month';

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-16">
      {/* 1. Header Banner Strip */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 p-6 sm:p-10 shadow-2xl text-white">
        {/* Glowing Background Orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase">
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">Leaderboard</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Every month scores update live based on hackathon victories, project judging, gate attendance, and verified participation across all campus events.
            </p>
          </div>

          {/* Quick Stat Highlights */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-center min-w-[120px]">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Month</span>
              <span className="text-sm font-black text-amber-400 truncate block mt-0.5">{selectedMonthLabel}</span>
            </div>
            <button
              onClick={() => setShowRulesModal(true)}
              className="p-3.5 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/30 backdrop-blur-md text-center min-w-[120px] transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <div className="flex items-center justify-center gap-1.5 text-indigo-200">
                <Info className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white">Scoring Rules</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 block mt-0.5">How Points Work</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Controls Bar: Single vs Team Switcher & Month Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
        {/* Single vs Team Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => setLeaderboardType('single')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
              leaderboardType === 'single'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Solo Participants</span>
          </button>

          <button
            onClick={() => setLeaderboardType('team')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
              leaderboardType === 'team'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Wise Scores</span>
          </button>
        </div>

        {/* Right Filter: Month Selector */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-900 focus:outline-none cursor-pointer pr-4"
              >
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    📅 {m.label} {m.key === currentMonthKey ? '(Current Month)' : ''}
                  </option>
                ))}
                <option value="all">🌟 All-Time Overall</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Top 3 Podium View */}
      {leaderboardType === 'single' && topThreeSingle.length > 0 && (
        <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border border-indigo-900/60 shadow-2xl text-white relative overflow-hidden">
          <div className="text-center mb-8 space-y-1">
            <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase">
              Top Performers of {selectedMonthLabel}
            </span>
            <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
              👑 Hall of Champions
            </h3>
          </div>

          {/* Podium Grid (2nd Place - 1st Place - 3rd Place) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end max-w-4xl mx-auto pt-4">
            {/* 2nd Place (Silver) */}
            {topThreeSingle[1] && (
              <div className="order-2 sm:order-1 flex flex-col items-center text-center space-y-3 bg-white/5 border border-slate-700/60 rounded-3xl p-5 backdrop-blur-md relative hover:scale-105 transition-all">
                <div className="absolute -top-3 px-3 py-1 rounded-full bg-slate-300 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Medal className="w-3 h-3 text-slate-700" />
                  <span>2nd Place</span>
                </div>

                <div className="relative mt-2">
                  {topThreeSingle[1].avatarUrl ? (
                    <img
                      src={topThreeSingle[1].avatarUrl}
                      alt={topThreeSingle[1].name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-slate-300 shadow-xl shadow-slate-300/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-900 font-black text-xl flex items-center justify-center border-4 border-slate-300 shadow-xl">
                      {topThreeSingle[1].name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center ring-2 ring-slate-900">
                    2
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white truncate max-w-[180px]">{topThreeSingle[1].name}</h4>
                  <p className="text-[11px] font-mono text-indigo-300 font-bold bg-white/10 px-2 py-0.5 rounded-full inline-block">
                    {topThreeSingle[1].registrationNumber}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 w-full flex items-center justify-between px-2">
                  <span className="text-[10px] text-slate-400 font-mono">Wins: {topThreeSingle[1].eventsWonCount}</span>
                  <span className="text-sm font-black font-mono text-slate-200">{topThreeSingle[1].totalScore} PTS</span>
                </div>
              </div>
            )}

            {/* 1st Place (Gold Champion) */}
            {topThreeSingle[0] && (
              <div className="order-1 sm:order-2 flex flex-col items-center text-center space-y-3.5 bg-gradient-to-b from-amber-500/20 via-amber-600/10 to-transparent border-2 border-amber-400 rounded-3xl p-6 backdrop-blur-md relative hover:scale-105 transition-all shadow-2xl shadow-amber-500/20 -translate-y-2">
                <div className="absolute -top-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-400/40">
                  <Crown className="w-4 h-4 text-slate-950 animate-bounce" />
                  <span>Grand Champion</span>
                </div>

                <div className="relative mt-3">
                  {topThreeSingle[0].avatarUrl ? (
                    <img
                      src={topThreeSingle[0].avatarUrl}
                      alt={topThreeSingle[0].name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-amber-400 shadow-2xl shadow-amber-400/50"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center border-4 border-amber-400 shadow-2xl">
                      {topThreeSingle[0].name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center ring-2 ring-slate-900 shadow-md">
                    1
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-white truncate max-w-[200px]">{topThreeSingle[0].name}</h4>
                  <p className="text-xs font-mono text-amber-300 font-black bg-amber-400/20 px-2.5 py-0.5 rounded-full inline-block border border-amber-400/30">
                    {topThreeSingle[0].registrationNumber}
                  </p>
                </div>

                <div className="pt-2 border-t border-amber-400/20 w-full flex items-center justify-between px-2">
                  <span className="text-[11px] text-amber-200 font-bold">🏆 {topThreeSingle[0].eventsWonCount} Wins</span>
                  <span className="text-base font-black font-mono text-amber-400">{topThreeSingle[0].totalScore} PTS</span>
                </div>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {topThreeSingle[2] && (
              <div className="order-3 flex flex-col items-center text-center space-y-3 bg-white/5 border border-amber-800/40 rounded-3xl p-5 backdrop-blur-md relative hover:scale-105 transition-all">
                <div className="absolute -top-3 px-3 py-1 rounded-full bg-amber-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Medal className="w-3 h-3 text-amber-300" />
                  <span>3rd Place</span>
                </div>

                <div className="relative mt-2">
                  {topThreeSingle[2].avatarUrl ? (
                    <img
                      src={topThreeSingle[2].avatarUrl}
                      alt={topThreeSingle[2].name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-amber-700 shadow-xl shadow-amber-800/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-800 to-amber-600 text-white font-black text-xl flex items-center justify-center border-4 border-amber-700 shadow-xl">
                      {topThreeSingle[2].name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center ring-2 ring-slate-900">
                    3
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white truncate max-w-[180px]">{topThreeSingle[2].name}</h4>
                  <p className="text-[11px] font-mono text-indigo-300 font-bold bg-white/10 px-2 py-0.5 rounded-full inline-block">
                    {topThreeSingle[2].registrationNumber}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 w-full flex items-center justify-between px-2">
                  <span className="text-[10px] text-slate-400 font-mono">Wins: {topThreeSingle[2].eventsWonCount}</span>
                  <span className="text-sm font-black font-mono text-amber-400">{topThreeSingle[2].totalScore} PTS</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3b. Team Podium (If Team Mode) */}
      {leaderboardType === 'team' && topThreeTeam.length > 0 && (
        <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border border-indigo-900/60 shadow-2xl text-white relative overflow-hidden">
          <div className="text-center mb-8 space-y-1">
            <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase">
              Top Teams of {selectedMonthLabel}
            </span>
            <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
              👑 Team Hall of Champions
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end max-w-4xl mx-auto pt-4">
            {/* 2nd Place Team */}
            {topThreeTeam[1] && (
              <div className="order-2 sm:order-1 flex flex-col items-center text-center space-y-3 bg-white/5 border border-slate-700/60 rounded-3xl p-5 backdrop-blur-md relative hover:scale-105 transition-all">
                <div className="absolute -top-3 px-3 py-1 rounded-full bg-slate-300 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Medal className="w-3 h-3 text-slate-700" />
                  <span>2nd Place Team</span>
                </div>

                <div className="relative mt-2">
                  {topThreeTeam[1].teamLogoUrl ? (
                    <img
                      src={topThreeTeam[1].teamLogoUrl}
                      alt={topThreeTeam[1].teamName}
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-slate-300 shadow-xl"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-900 font-black text-xl flex items-center justify-center border-4 border-slate-300 shadow-xl">
                      {topThreeTeam[1].teamName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center ring-2 ring-slate-900">
                    2
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white truncate max-w-[180px]">{topThreeTeam[1].teamName}</h4>
                  <p className="text-[11px] text-slate-300 font-medium truncate max-w-[180px]">
                    Leader: {topThreeTeam[1].leaderName}
                  </p>
                  <p className="text-[10px] font-mono text-indigo-300 font-bold bg-white/10 px-2 py-0.5 rounded-full inline-block">
                    {topThreeTeam[1].leaderRegistrationNumber}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 w-full flex items-center justify-between px-2">
                  <span className="text-[10px] text-slate-400 font-mono">{topThreeTeam[1].memberCount} Members</span>
                  <span className="text-sm font-black font-mono text-slate-200">{topThreeTeam[1].totalScore} PTS</span>
                </div>
              </div>
            )}

            {/* 1st Place Champion Team */}
            {topThreeTeam[0] && (
              <div className="order-1 sm:order-2 flex flex-col items-center text-center space-y-3.5 bg-gradient-to-b from-amber-500/20 via-amber-600/10 to-transparent border-2 border-amber-400 rounded-3xl p-6 backdrop-blur-md relative hover:scale-105 transition-all shadow-2xl shadow-amber-500/20 -translate-y-2">
                <div className="absolute -top-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-400/40">
                  <Crown className="w-4 h-4 text-slate-950 animate-bounce" />
                  <span>Grand Champion Team</span>
                </div>

                <div className="relative mt-3">
                  {topThreeTeam[0].teamLogoUrl ? (
                    <img
                      src={topThreeTeam[0].teamLogoUrl}
                      alt={topThreeTeam[0].teamName}
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-amber-400 shadow-2xl shadow-amber-400/50"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center border-4 border-amber-400 shadow-2xl">
                      {topThreeTeam[0].teamName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center ring-2 ring-slate-900 shadow-md">
                    1
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-white truncate max-w-[200px]">{topThreeTeam[0].teamName}</h4>
                  <p className="text-xs text-amber-200 font-semibold truncate max-w-[200px]">
                    Leader: {topThreeTeam[0].leaderName}
                  </p>
                  <p className="text-xs font-mono text-amber-300 font-black bg-amber-400/20 px-2.5 py-0.5 rounded-full inline-block border border-amber-400/30">
                    {topThreeTeam[0].leaderRegistrationNumber}
                  </p>
                </div>

                <div className="pt-2 border-t border-amber-400/20 w-full flex items-center justify-between px-2">
                  <span className="text-[11px] text-amber-200 font-bold">👥 {topThreeTeam[0].memberCount} Members • {topThreeTeam[0].eventsWonCount} Wins</span>
                  <span className="text-base font-black font-mono text-amber-400">{topThreeTeam[0].totalScore} PTS</span>
                </div>
              </div>
            )}

            {/* 3rd Place Team */}
            {topThreeTeam[2] && (
              <div className="order-3 flex flex-col items-center text-center space-y-3 bg-white/5 border border-amber-800/40 rounded-3xl p-5 backdrop-blur-md relative hover:scale-105 transition-all">
                <div className="absolute -top-3 px-3 py-1 rounded-full bg-amber-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Medal className="w-3 h-3 text-amber-300" />
                  <span>3rd Place Team</span>
                </div>

                <div className="relative mt-2">
                  {topThreeTeam[2].teamLogoUrl ? (
                    <img
                      src={topThreeTeam[2].teamLogoUrl}
                      alt={topThreeTeam[2].teamName}
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-amber-700 shadow-xl"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-800 to-amber-600 text-white font-black text-xl flex items-center justify-center border-4 border-amber-700 shadow-xl">
                      {topThreeTeam[2].teamName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center ring-2 ring-slate-900">
                    3
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white truncate max-w-[180px]">{topThreeTeam[2].teamName}</h4>
                  <p className="text-[11px] text-slate-300 font-medium truncate max-w-[180px]">
                    Leader: {topThreeTeam[2].leaderName}
                  </p>
                  <p className="text-[10px] font-mono text-indigo-300 font-bold bg-white/10 px-2 py-0.5 rounded-full inline-block">
                    {topThreeTeam[2].leaderRegistrationNumber}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 w-full flex items-center justify-between px-2">
                  <span className="text-[10px] text-slate-400 font-mono">{topThreeTeam[2].memberCount} Members</span>
                  <span className="text-sm font-black font-mono text-amber-400">{topThreeTeam[2].totalScore} PTS</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Complete Ranked Leaderboard List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        <div className="p-4 sm:p-6 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
              {leaderboardType === 'single' ? 'Solo Participant Rankings' : 'Team Performance Rankings'}
            </h3>
          </div>
        </div>

        {/* SINGLE RANKINGS LIST */}
        {leaderboardType === 'single' && (
          <div className="divide-y divide-slate-100">
            {topSingleList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No Participant Scores Recorded for {selectedMonthLabel}</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Participate in hackathons, workshops, and events this month to earn points and claim the top rank!
                </p>
              </div>
            ) : (
              topSingleList.map((entry) => {
                const isCurrentUser = entry.email.toLowerCase() === currentUser.email.toLowerCase();

                return (
                  <div
                    key={entry.id}
                    className={`p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 transition-all hover:bg-slate-50/90 ${
                      isCurrentUser ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : ''
                    }`}
                  >
                    {/* Left: Rank & User Info */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Rank Badge */}
                      <div className="w-8 sm:w-10 text-center shrink-0">
                        {entry.rank === 1 ? (
                          <span className="inline-flex w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 text-slate-950 font-black text-xs sm:text-sm items-center justify-center shadow-sm">
                            🥇
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-300 text-slate-900 font-black text-xs sm:text-sm items-center justify-center shadow-sm">
                            🥈
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-700 text-white font-black text-xs sm:text-sm items-center justify-center shadow-sm">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono font-black text-slate-500 text-xs sm:text-sm">
                            #{entry.rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar Image */}
                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt={entry.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0">
                          {entry.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Name, Reg Number & Details */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {entry.name}
                          </h4>
                          {isCurrentUser && (
                            <span className="text-[9px] font-black uppercase bg-indigo-600 text-white px-2 py-0.2 rounded-full">
                              You
                            </span>
                          )}
                          {entry.bestPlacement && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.2 rounded-md hidden sm:inline-block">
                              {entry.bestPlacement}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50/70 border border-indigo-100 px-1.5 py-0.2 rounded">
                            Reg: {entry.registrationNumber}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">
                            {entry.eventsParticipatedCount} Event{entry.eventsParticipatedCount > 1 ? 's' : ''}
                          </span>
                          {entry.eventsWonCount > 0 && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="text-amber-600 font-bold">
                                🏆 {entry.eventsWonCount} Win{entry.eventsWonCount > 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Score Points */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <Flame className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <span className="text-base sm:text-xl font-black font-mono text-slate-900">
                          {entry.totalScore}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                        Points
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TEAM RANKINGS LIST */}
        {leaderboardType === 'team' && (
          <div className="divide-y divide-slate-100">
            {topTeamList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No Team Scores Recorded for {selectedMonthLabel}</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Form a team for upcoming hackathons &amp; challenges to earn team scores on the leaderboard!
                </p>
              </div>
            ) : (
              topTeamList.map((team) => {
                const isUserInTeam = team.members.some(
                  (m) => m.email.toLowerCase() === currentUser.email.toLowerCase()
                );

                return (
                  <div
                    key={team.id}
                    className={`p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 transition-all hover:bg-slate-50/90 ${
                      isUserInTeam ? 'bg-purple-50/50 border-l-4 border-l-purple-600' : ''
                    }`}
                  >
                    {/* Left: Rank & Team Info */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Rank Badge */}
                      <div className="w-8 sm:w-10 text-center shrink-0">
                        {team.rank === 1 ? (
                          <span className="inline-flex w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 text-slate-950 font-black text-xs sm:text-sm items-center justify-center shadow-sm">
                            🥇
                          </span>
                        ) : team.rank === 2 ? (
                          <span className="inline-flex w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-300 text-slate-900 font-black text-xs sm:text-sm items-center justify-center shadow-sm">
                            🥈
                          </span>
                        ) : team.rank === 3 ? (
                          <span className="inline-flex w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-700 text-white font-black text-xs sm:text-sm items-center justify-center shadow-sm">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono font-black text-slate-500 text-xs sm:text-sm">
                            #{team.rank}
                          </span>
                        )}
                      </div>

                      {/* Team Logo / Avatar */}
                      {team.teamLogoUrl ? (
                        <img
                          src={team.teamLogoUrl}
                          alt={team.teamName}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0">
                          {team.teamName.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Team Name, Leader & Members */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {team.teamName}
                          </h4>
                          {isUserInTeam && (
                            <span className="text-[9px] font-black uppercase bg-purple-600 text-white px-2 py-0.2 rounded-full">
                              Your Team
                            </span>
                          )}
                          {team.bestPlacement && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.2 rounded-md hidden sm:inline-block">
                              {team.bestPlacement}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                          <span>Leader: <strong className="text-slate-800">{team.leaderName}</strong></span>
                          <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded text-[10px] font-bold">
                            {team.leaderRegistrationNumber}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-bold text-slate-700">
                            {team.memberCount} Member{team.memberCount > 1 ? 's' : ''}
                          </span>
                          {team.eventsWonCount > 0 && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="text-amber-600 font-bold">
                                🏆 {team.eventsWonCount} Win{team.eventsWonCount > 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Team Score */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <Zap className="w-4 h-4 text-purple-600 fill-purple-600" />
                        <span className="text-base sm:text-xl font-black font-mono text-slate-900">
                          {team.totalScore}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                        Team PTS
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 5. SCORING RULES MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">How Leaderboard Points Work</h3>
                  <p className="text-xs text-slate-500">Official Monthly Scoring Matrix</p>
                </div>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer active:scale-95"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Hackathon &amp; Event Placements</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-amber-600 block">🥇 1st Place (Gold)</span>
                    <span className="font-mono font-black text-slate-900">+100 to 150 PTS</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-slate-600 block">🥈 2nd Place (Silver)</span>
                    <span className="font-mono font-black text-slate-900">+75 to 100 PTS</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-amber-700 block">🥉 3rd Place (Bronze)</span>
                    <span className="font-mono font-black text-slate-900">+50 to 75 PTS</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                    <span className="font-bold text-purple-700 block">⭐ Judge Score Bonus</span>
                    <span className="font-mono font-black text-slate-900">+Score from Faculty</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <h4 className="font-black text-indigo-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Participation &amp; Attendance</span>
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p>• <strong>Gate Check-In Verified:</strong> +20 PTS for every event attended in person.</p>
                  <p>• <strong>Registered Pass:</strong> +10 PTS for active event passes.</p>
                  <p>• <strong>Team Bonus:</strong> Extra points for each verified team member on gate entry.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Got It ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
