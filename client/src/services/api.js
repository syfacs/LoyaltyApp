import useFetch from "./useFetch.js"

class API_URL_REGISTRY {
    constructor(base={}) {
        this.urls = {};

        Object.entries(base).forEach(([k, v]) => {
            this.register_url(k, v);
        });
    }

    get_url(key) {
        return this.urls[key];
    }

    register_url(key, url) {
        if (typeof url !== "string") throw new Error("url must be a string");
        this.urls[key] = url.replace(/\/+$/, "");
    }

    path(key, path) {
        const url = this.get_url(key);
        if (!url) return;

        return url + path;
    }
}

export class HTTP_CLIENT {
    constructor(registry) {
        this.registry = registry;
    }

    set_path(key) {
        if (!this.registry.get_url(key)) throw new Error(`invalid path for ${key}`);
        this.path = key;
    }

    useFetch(url, init, dt) {
        return useFetch(this.registry.path(this.path, url), init, dt);
    }

    // Sends a request to our own server (the helper API) and gives back the "success" response.
    // A failed response throws an ApiError with the message to show to the user.
    // "body" can be an object (sent as JSON) or FormData (used when an image is uploaded).
    async request(method, url, body) {
        const options = { method, credentials: "include", headers: {} };

        if (body instanceof FormData) {
            options.body = body;
        } else if (body !== undefined) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }

        let response;

        try {
            response = await fetch(this.registry.path(this.path, url), options);
        } catch {
            throw new ApiError("Cannot reach the server. Please check your connection and try again.", 0);
        }

        let data = null;

        try {
            data = await response.json();
        } catch {
            // the response has no JSON body
        }

        if (!response.ok || !data || data.success === false) {
            const error = new ApiError(
                data?.message || "Something went wrong. Please try again.",
                response.status,
                data?.sessionExpired === true,
            );

            if (error.sessionExpired) notifySessionExpired(url);

            throw error;
        }

        return data;
    }

    get(url) {
        return this.request("GET", url);
    }

    post(url, body) {
        return this.request("POST", url, body);
    }

    delete(url) {
        return this.request("DELETE", url);
    }
}

export class ApiError extends Error {
    constructor(message, status, sessionExpired = false) {
        super(message);
        this.status = status;
        this.sessionExpired = sessionExpired;
    }
}

// The server forgot who we are (the session timed out). The AuthProvider listens to this and shows the login page.
const expiredListeners = new Set();

export function onSessionExpired(callback) {
    expiredListeners.add(callback);

    return () => expiredListeners.delete(callback);
}

function notifySessionExpired(url) {
    const portal = url.startsWith("/Admin") ? "admin" : "member";

    expiredListeners.forEach((callback) => callback(portal));
}

export const AUR = new API_URL_REGISTRY({
    remote: "https://alpacaapi.xcode.com.my/api",
    base: "http://localhost:5218/api",
    test: "https://studentapp.xcode.com.my/api",
});

// ======================================================================
// All calls to our server. The pages use these and never call fetch themselves.
// Every function gives back the response of the server, for example { success, message, member }.
// ======================================================================

const client = new HTTP_CLIENT(AUR);
client.set_path("base");

// { search: "a b", empty: "" } becomes "?search=a%20b"
function query(params) {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") search.set(key, value);
    });

    const text = search.toString();

    return text ? `?${text}` : "";
}

// turns an object into FormData and skips empty values
function toForm(values) {
    const form = new FormData();

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") form.append(key, value);
    });

    return form;
}

// the server calls the uploaded image of rewards, vouchers and highlights "file"
function toFormWithFile(values) {
    const { image, ...rest } = values;

    return toForm({ ...rest, file: image });
}

export const memberApi = {
    // account
    register: (values) => client.post("/Member/Register", toForm(values)),
    verifyOtp: (code) => client.post("/Member/VerifyOtp", { code }),
    resendOtp: () => client.post("/Member/ResendOtp"),
    login: (phoneNumber, password) => client.post("/Member/Login", { phoneNumber, password }),
    logout: () => client.post("/Member/Logout"),
    forgotPassword: (phoneNumber) => client.post("/Member/ForgotPassword", { phoneNumber }),
    resetPassword: (newPassword, confirmPassword) => client.post("/Member/ResetPassword", { newPassword, confirmPassword }),
    profile: () => client.get("/Member/Profile"),
    updateProfile: (values) => client.post("/Member/UpdateProfile", toForm(values)),
    changePassword: (values) => client.post("/Member/ChangePassword", values),

    // content
    home: () => client.get("/Member/Home"),
    highlight: (guid) => client.get(`/Member/Highlight/${guid}`),
    rewards: () => client.get("/Member/Rewards"),
    reward: (guid) => client.get(`/Member/Reward/${guid}`),
    redeemReward: (values) => client.post("/Member/RedeemReward", values),
    vouchers: () => client.get("/Member/Vouchers"),
    myVouchers: () => client.get("/Member/MyVouchers"),
    voucher: (guid) => client.get(`/Member/Voucher/${guid}`),
    redeemVoucher: (values) => client.post("/Member/RedeemVoucher", values),
    outlets: () => client.get("/Member/Outlets"),
    outlet: (guid) => client.get(`/Member/Outlet/${guid}`),

    // activity
    collectPoints: (values) => client.post("/Member/CollectPoints", values),
    history: (range, types) => client.get(`/Member/History${query({ range, types })}`),
    sendFeedback: (values) => client.post("/Member/Feedback", values),
};

export const adminApi = {
    login: (username, password) => client.post("/Admin/Login", { username, password }),
    logout: () => client.post("/Admin/Logout"),
    session: () => client.get("/Admin/Session"),
    dashboard: () => client.get("/Admin/Dashboard"),

    members: (search) => client.get(`/Admin/Members${query({ search })}`),
    member: (id) => client.get(`/Admin/Member/${id}`),
    createMember: (values) => client.post("/Admin/CreateMember", values),
    editMember: (values) => client.post("/Admin/EditMember", values),
    toggleMember: (id) => client.post(`/Admin/ToggleMember/${id}`),

    rewards: () => client.get("/Admin/Rewards"),
    reward: (id) => client.get(`/Admin/Reward/${id}`),
    createReward: (values) => client.post("/Admin/CreateReward", toFormWithFile(values)),
    editReward: (values) => client.post("/Admin/EditReward", toFormWithFile(values)),
    deleteReward: (id) => client.delete(`/Admin/Reward/${id}`),

    vouchers: () => client.get("/Admin/Vouchers"),
    voucher: (id) => client.get(`/Admin/Voucher/${id}`),
    createVoucher: (values) => client.post("/Admin/CreateVoucher", toFormWithFile(values)),
    editVoucher: (values) => client.post("/Admin/EditVoucher", toFormWithFile(values)),
    deleteVoucher: (id) => client.delete(`/Admin/Voucher/${id}`),

    highlights: () => client.get("/Admin/Highlights"),
    highlight: (id) => client.get(`/Admin/Highlight/${id}`),
    createHighlight: (values) => client.post("/Admin/CreateHighlight", toFormWithFile(values)),
    editHighlight: (values) => client.post("/Admin/EditHighlight", toFormWithFile(values)),
    deleteHighlight: (id) => client.delete(`/Admin/Highlight/${id}`),

    outlets: () => client.get("/Admin/Outlets"),
    createOutlet: (outletName) => client.post("/Admin/CreateOutlet", { outletName }),
    toggleOutlet: (id) => client.post(`/Admin/ToggleOutlet/${id}`),
    staff: (outletId) => client.get(`/Admin/Staff${query({ outletId })}`),
    createStaff: (values) => client.post("/Admin/CreateStaff", values),
    updateStaff: (values) => client.post("/Admin/UpdateStaff", values),
    deleteStaff: (id) => client.delete(`/Admin/Staff/${id}`),

    points: (outletId) => client.get(`/Admin/Points${query({ outletId })}`),
    point: (id) => client.get(`/Admin/Point/${id}`),
    assignPoints: (values) => client.post("/Admin/AssignPoints", values),
    rejectPoint: (values) => client.post("/Admin/RejectPoint", values),

    redemptions: () => client.get("/Admin/Redemptions"),
    redemption: (type, id) => client.get(`/Admin/Redemption/${type}/${id}`),

    feedbacks: (memberId) => client.get(`/Admin/Feedbacks${query({ memberId })}`),
    feedback: (id) => client.get(`/Admin/Feedback/${id}`),
};