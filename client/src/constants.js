// Everything you may want to change in one place: names, texts, limits and routes.
// To rename the app, change APP_NAME. To retheme it, change src/styles/theme.css.

// ---------- branding ----------

export const APP_NAME = "Alpaca Loyalty";
export const APP_TAGLINE = "Collect points. Enjoy rewards.";
export const ADMIN_NAME = `${APP_NAME} Admin`;
export const POINTS_LABEL = "pts";

export const ABOUT_TITLE = `About ${APP_NAME}`;
export const ABOUT_PARAGRAPHS = [
    `${APP_NAME} is our membership programme. Every time you spend at one of our outlets you collect points.`,
    "Use your points to redeem rewards, or enjoy exclusive vouchers made just for members.",
    "Show your phone to our staff at the counter, they will confirm your points and redemptions with their staff PIN.",
];
export const ABOUT_STEPS = [
    "Register for free and verify your email.",
    "Collect points when you spend at an outlet.",
    "Redeem rewards and vouchers, then keep collecting.",
];

// ---------- rules (must match the server, see server/Validation.cs) ----------

export const PHONE_PREFIX = "+60";
export const PHONE_EXAMPLE = "123456789";
export const PASSWORD_MIN_LENGTH = 8;
export const STAFF_PIN_LENGTH = 6;
export const MAX_IMAGE_MB = 5;
export const MAX_POINTS_PER_CLAIM = 100000;

export const OTP_LENGTH = 6;
export const OTP_COUNTDOWN_SECONDS = 120;

export const TOAST_SECONDS = 3.5;

// ---------- choices used in forms and filters ----------

export const FEEDBACK_CATEGORIES = ["Service", "Food & Drinks", "Cleanliness", "Staff", "Rewards", "Other"];

export const MEMBER_TIERS = ["Bronze", "Silver", "Gold"];

export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const HISTORY_TYPES = [
    { value: "", label: "All activity" },
    { value: "Point", label: "Points" },
    { value: "Reward", label: "Rewards" },
    { value: "Voucher", label: "Vouchers" },
];

export const HISTORY_RANGES = [
    { value: "All", label: "Any time" },
    { value: "Today", label: "Today" },
    { value: "ThisWeek", label: "This week" },
    { value: "ThisMonth", label: "This month" },
    { value: "ThisYear", label: "This year" },
];

// ---------- routes ----------

export const ROUTES = {
    member: {
        home: "/",
        login: "/login",
        register: "/register",
        verify: "/verify",
        forgotPassword: "/forgot-password",
        resetPassword: "/reset-password",
        about: "/about",
        outlets: "/outlets",
        outlet: (guid) => `/outlets/${guid}`,
        rewards: "/rewards",
        reward: (guid) => `/rewards/${guid}`,
        vouchers: "/vouchers",
        myVouchers: "/my-vouchers",
        voucher: (guid) => `/vouchers/${guid}`,
        highlight: (guid) => `/highlights/${guid}`,
        collectPoints: "/collect-points",
        history: "/history",
        historyItem: (guid) => `/history/${guid}`,
        feedback: "/feedback",
        account: "/account",
        profile: "/account/profile",
        changePassword: "/account/password",
    },
    admin: {
        home: "/admin",
        login: "/admin/login",
        members: "/admin/members",
        member: (id) => `/admin/members/${id}`,
        newMember: "/admin/members/new",
        editMember: (id) => `/admin/members/${id}/edit`,
        rewards: "/admin/rewards",
        reward: (id) => `/admin/rewards/${id}`,
        newReward: "/admin/rewards/new",
        editReward: (id) => `/admin/rewards/${id}/edit`,
        vouchers: "/admin/vouchers",
        voucher: (id) => `/admin/vouchers/${id}`,
        newVoucher: "/admin/vouchers/new",
        editVoucher: (id) => `/admin/vouchers/${id}/edit`,
        highlights: "/admin/highlights",
        highlight: (id) => `/admin/highlights/${id}`,
        newHighlight: "/admin/highlights/new",
        editHighlight: (id) => `/admin/highlights/${id}/edit`,
        outlets: "/admin/outlets",
        staff: (outletId) => `/admin/outlets/${outletId}/staff`,
        points: "/admin/points",
        point: (id) => `/admin/points/${id}`,
        assignPoints: "/admin/points/assign",
        redemptions: "/admin/redemptions",
        redemption: (type, id) => `/admin/redemptions/${type}/${id}`,
        feedback: "/admin/feedback",
        feedbackItem: (id) => `/admin/feedback/${id}`,
    },
};

// the two tabs at the top of the Rewards and Vouchers pages
export const REWARD_TABS = [
    { to: ROUTES.member.rewards, label: "Rewards" },
    { to: ROUTES.member.vouchers, label: "Vouchers" },
];

// the admin pages, used by the dashboard tiles (phone) and the side menu (desktop)
export const ADMIN_MENU = [
    { label: "Members", icon: "users", to: ROUTES.admin.members },
    { label: "Rewards", icon: "gift", to: ROUTES.admin.rewards },
    { label: "Vouchers", icon: "ticket", to: ROUTES.admin.vouchers },
    { label: "Highlights", icon: "image", to: ROUTES.admin.highlights },
    { label: "Outlets & staff", icon: "store", to: ROUTES.admin.outlets },
    { label: "Point records", icon: "plus", to: ROUTES.admin.points },
    { label: "Redemptions", icon: "chart", to: ROUTES.admin.redemptions },
    { label: "Feedback", icon: "message", to: ROUTES.admin.feedback },
];
