/**
 * Words for the MGL Fantasy pages (/fantasy). The rules follow Fantasy Core: four starters, one
 * of each role, a sub, 100 credits, at most two players from one team, a captain, two scoring
 * chips and one free transfer a tournament; every other transfer costs 4 points.
 */

export const fantasyPage = {
  label: "MGL Fantasy",

  /**
   * The signed-out landing page. Fantasy on MGL isn't only for MGL's own seasons: any CODM BR
   * ranking can run its tournament's fantasy through MGL, so the words speak to every one.
   */
  landing: {
    label: "MGL Fantasy",
    hero: {
      title: { before: "Your squad.", accent: "Your call." },
      lede: "The players you watch every matchday, on a team you built. Back your captain, beat the deadline and prove you read the lobby better than everyone else.",
      join: "Start playing",
      signIn: "Sign in",
      offStatus: "Opens with the next tournament",
      facts: { deadline: "Deadline", managers: "Managers", tournaments: "Tournaments" },
    },
    sheet: { title: "Your squad", total: "Matchday points", captain: "Captain", sub: "Sub", bench: "Bench" },
    host: {
      label: "For rankings",
      title: { before: "Run your fantasy", accent: "on MGL." },
      body: "Hosting a CODM BR tournament? Give your community a game to play alongside it. Your players and points, our managers and screens.",
      cta: "Partner with us",
    },
    steps: {
      label: "How it works",
      title: { before: "How it", accent: "works." },
      items: [
        { n: "01", title: "Build your five", body: "100 credits, four starters and a sub. The stars cost the most. The bargains win leagues." },
        { n: "02", title: "Back a captain", body: "Your captain scores double. Feeling sure? Triple Captain makes it three." },
        { n: "03", title: "Climb the table", body: "Points land as the kills do. Every matchday shakes up the standings." },
      ],
    },
    rules: {
      label: "The rules",
      items: [
        { icon: "fantasy", value: "100", label: "credits to build your squad" },
        { icon: "squad", value: "2", label: "players at most from one team" },
        { icon: "crown", value: "2×", label: "points for your captain" },
        { icon: "undo", value: "−4", label: "per transfer, after your free one" },
        { icon: "chart", value: "2", label: "chips: Triple Captain, Bench Boost" },
      ],
    },
    board: { label: "Standings", title: { before: "Top of", accent: "the table." }, cta: "Full standings", empty: "The table fills after the first matchday is scored." },
  },

  /** The signed-in app. */
  app: {
    nav: [
      { href: "/fantasy", label: "Dashboard", icon: "home" },
      { href: "/fantasy/squad", label: "Squad", icon: "squad" },
      { href: "/fantasy/standings", label: "Standings", icon: "chart" },
      { href: "/fantasy/account", label: "Account", icon: "settings" },
    ],
    back: "Back to MGL",
    deadline: "Deadline",
    greeting: (h: number) => (h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening"),
    kpis: { total: "Total points", rank: "Overall rank", budget: "Credits left", free: "Free transfer" },
    of: (n: number) => `of ${n.toLocaleString("en-GB")}`,
    unranked: "Outside top 50",
    timeline: "Matchdays",
    chips: "Chips",
  },
  meta: {
    title: "Fantasy · MGL",
    description: "Fantasy for CODM BR on MGL: pick four players and a sub inside 100 credits, back a captain and score from their real kills and placements, for MGL's seasons and the rankings it hosts.",
  },

  off: {
    title: { before: "Fantasy opens", accent: "soon." },
    lede: "Fantasy opens with the next tournament on MGL. Make your manager now, and pick your squad the moment the market opens.",
  },
  error: { title: "Fantasy didn't load", retry: "Try again" },

  rules: {
    title: { before: "How it", accent: "works." },
    items: [
      { icon: "squad", title: "Four starters and a sub", body: "One Fragger, one IGL, one Support and one Anchor, plus a sub on the bench." },
      { icon: "fantasy", title: "100 credits", body: "Every player has a price. No more than two from the same team." },
      { icon: "crown", title: "Captain", body: "Your captain's points count double. Change them any time the market is open." },
      { icon: "undo", title: "Transfers", body: "One player out, one in. Each costs 4 points, except your one free transfer." },
      { icon: "chart", title: "Chips", body: "Triple Captain and Bench Boost, once each per tournament." },
    ],
  },

  status: {
    open: "Transfers open",
    locked: "Matchday in play",
    scored: "Matchday scored",
    unpublished: "Prices coming",
  },

  guest: {
    title: { before: "Make your", accent: "manager." },
    lede: "Free to play. Pick a display name: it's what every leaderboard shows.",
    join: "Create your manager",
    signIn: "Sign in",
  },

  hub: {
    points: "Total points",
    scoring: "From matchdays",
    adjustments: "Transfer costs",
    noSquad: { title: "No squad yet", body: "Pick four starters and a sub before the deadline." },
    carry: { title: "Carry your squad over", body: "Keep last matchday's five for free, then make changes." },
    pick: "Pick your squad",
    edit: "Edit squad",
    transfers: "Make a transfer",
    standings: "Standings",
    seeAll: "Full standings",
    you: "You",
    unnamed: "Unnamed manager",
    needName: "Pick a display name to start playing.",
  },

  picker: {
    budget: "Budget",
    left: "left",
    selected: "Selected",
    perTeam: "Max 2 per team",
    summary: "Squad summary",
    lineup: "Lineup",
    players: "Players",
    bench: "Bench",
    benchHint: "Comes on if a starter doesn't play",
    benchBoosted: "Bench Boost on: their points count",
    hintNew: "Tap a slot, then pick a player from the list.",
    hintEdit: "Tap a player to change their role, make them captain or transfer them out.",
    tapToPick: "Tap to pick",
    addSub: "Add a sub",
    freeTransfer: "Free transfer",
    search: "Search players or teams",
    allTeams: "All teams",
    sort: { price: "Priciest", cheap: "Cheapest", name: "Name A–Z" },
    empty: "No players match.",
    pickFor: (role: string) => `Choose your ${role}`,
    sub: "Sub",
    captain: "Captain",
    makeCaptain: "Make captain",
    remove: "Remove",
    swapSub: "Swap with sub",
    transfer: "Transfer out",
    save: "Save squad",
    saving: "Saving…",
    saved: "Squad saved",
    closed: "The market is closed. Your squad shows as it was locked in.",
    chips: {
      title: "Chip for this matchday",
      none: "No chip",
      triple_captain: "Triple Captain",
      bench_boost: "Bench Boost",
      used: "Already used",
      about: { none: "Save them for later", triple_captain: "Captain scores 3×", bench_boost: "Sub's points count" },
    },
    why: {
      picked: "In your squad",
      budget: "Over budget",
      team: "2 from this team",
      ineligible: "Not available",
    },
  },

  transfer: {
    title: "Confirm transfer",
    out: "Out",
    in: "In",
    cost: "Cost",
    penalty: "−4 points",
    free: "Free",
    useFree: "Use your free transfer",
    freeUsed: "Your free transfer is used",
    credits: "Credits after",
    confirm: "Confirm transfer",
    pending: "Transferring…",
    retry: "Try again",
    cancel: "Cancel",
    done: (penalty: number) => (penalty ? "Transfer made: −4 points" : "Transfer made for free"),
    choosing: (name: string) => `Replacing ${name}`,
  },

  standings: {
    title: { before: "The", accent: "standings." },
    season: "Season",
    matchday: (n: number) => `MD${n}`,
    rank: "#",
    manager: "Manager",
    total: "Points",
    more: "Next page",
    first: "Back to top",
    empty: "No managers on the board yet.",
  },

  account: {
    title: { before: "Your", accent: "account." },
    name: "Display name",
    nameHint: "3 to 20 letters, numbers, spaces, hyphens or underscores. Shown on every leaderboard.",
    save: "Save name",
    saved: "Name saved",
    email: "Email",
    password: "Change password",
    passwordHint: "We'll email you a link to set a new one.",
    signOut: "Sign out",
  },

  auth: {
    join: {
      title: { before: "Create your", accent: "manager." },
      lede: "One account for every tournament on MGL Fantasy. Your password is stored by MGL only.",
      displayName: "Display name",
      email: "Email",
      password: "Password",
      passwordHint: "At least 8 characters.",
      submit: "Create account",
      pending: "Creating…",
      have: "Already have an account?",
      sent: (email: string) => `Almost there. We sent a link to ${email}: open it to confirm your account.`,
    },
    login: {
      title: { before: "Welcome", accent: "back." },
      lede: "Sign in to pick your squad and make transfers.",
      email: "Email",
      password: "Password",
      submit: "Sign in",
      pending: "Signing in…",
      forgot: "Forgot password?",
      none: "New to MGL Fantasy?",
    },
    forgot: {
      title: { before: "Reset your", accent: "password." },
      lede: "Enter your account's email and we'll send you a link.",
      submit: "Send link",
      pending: "Sending…",
      sent: (email: string) => `If ${email} has an account, a reset link is on its way.`,
    },
    reset: {
      title: { before: "Set a new", accent: "password." },
      submit: "Save password",
      pending: "Saving…",
    },
    welcome: { checking: "Signing you in…", failed: "Sign in" },
    preview: "Preview as a manager",
  },
};
