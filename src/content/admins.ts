/** Copy for the Admins page (owners only): who can sign in to the admin, and what each role may do. */

export const ROLES = ["owner", "editor"] as const;
export type AdminRole = (typeof ROLES)[number];

export const adminsCopy = {
  title: "Admins",
  lede: "Who can sign in to this admin. Owners manage everything, including this list; admins run the site's content.",
  /** Shown labels. The database calls the second role `editor`; on screen it is "Admin". */
  roles: {
    owner: { label: "Owner", hint: "Everything, including Settings, the Fantasy controls and this list." },
    editor: { label: "Admin", hint: "Events, teams, players, results, news, staff and media." },
  } satisfies Record<AdminRole, { label: string; hint: string }>,
  add: {
    title: "Add an admin",
    lede: "Set their email and a password, then send them both privately. They sign in at /admin/login straight away. If they already have an MGL account, leave the password empty.",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters. Leave empty if they already have an account; their own password stays.",
    role: "Role",
    submit: "Add admin",
    idle: "They can sign in to the admin straight away.",
    pending: "Adding…",
  },
  list: {
    title: "Everyone with access",
    you: "You",
    added: (date: string) => `Added ${date}`,
    lastIn: (date: string) => `Last signed in ${date}`,
    never: "Hasn't signed in yet",
    change: "Change role",
    remove: "Remove",
    confirm: (email: string) => `Remove ${email} from the admin? Their account stays, so they can still play Fantasy; they just can't sign in here.`,
  },
  results: {
    added: (email: string) => `${email} is now an admin.`,
    created: (email: string) => `Account created. ${email} can sign in at /admin/login with the password you set.`,
    addedExisting: (email: string) => `${email} already had an account, so it's now an admin with its own password (the one you typed wasn't used).`,
    shortPassword: "Use at least 8 characters.",
    updated: "Role changed.",
    removed: "Removed. They'll be signed out of the admin within the hour.",
    no_account: "No account uses that email yet. Set a password to create one.",
    already: "That account is already an admin. Change its role in the list below.",
    self: "You can't change your own access. Ask another owner.",
    last_owner: "There has to be at least one owner. Make someone else an owner first.",
    missing: "That admin was already removed. The list has been refreshed.",
    badEmail: "Enter an email address.",
    failed: "That didn't save. Check you're online and try again.",
  },
  ownerOnly: {
    title: "Owners only",
    body: "Only an owner can open this page. Ask an owner if you need something changed here.",
  },
  notReady: "Admin management needs a one-time database update: run supabase/migrations/20261108120000_admin_management.sql in the Supabase SQL editor.",
};
