import { useCallback, useEffect, useState } from "react";
import { APP_NAME, APP_TAGLINE, NAV_ITEMS, REMOTE_URL } from "../constants/app.js";
import { apiRequest } from "../services/api.js";

const initialLists = { highlights: [], rewards: [], vouchers: {}, outlets: [], history: {} };
const img = (path) => path ? (path.startsWith("http") ? path : `${REMOTE_URL}${path.startsWith("/") ? "" : "/"}${path}`) : "";
const date = (value) => value ? new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short" }).format(new Date(value)) : "Available now";

function Header({ title, back }) {
    return <header className="header">
        {back ? <button className="back" onClick={back}>‹</button> : <b className="mark">M</b>}
        <div><small>{back ? "MEMBER SPACE" : APP_NAME.toUpperCase()}</small><h1>{title}</h1></div>
    </header>;
}

function Alert({ value, close }) {
    return value && <button className={`alert ${value.type}`} onClick={close}>{value.message}<b>×</b></button>;
}

function Auth({ complete, alert }) {
    const [mode, setMode] = useState("login");
    const [form, setForm] = useState({ name: "", phoneNumber: "", email: "", password: "", birthday: "" });
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const isRecovery = mode === "recover";

    const field = (name) => ({ value: form[name], onChange: (event) => setForm({ ...form, [name]: event.target.value }) });
    async function send(event) {
        event.preventDefault();
        setBusy(true);
        let path = "/auth/login";
        let body = form;
        if (mode === "register") {
            path = "/auth/register";
            body = Object.entries(form).reduce((data, [key, value]) => { data.append(key, value); return data; }, new FormData());
        }
        if (isRecovery) {
            path = otp ? "/auth/reset-password" : "/auth/request-otp";
            body = otp ? { phoneNumber: form.phoneNumber, email: form.email, otp, newPassword } : { phoneNumber: form.phoneNumber, email: form.email };
        }
        try {
            const result = await apiRequest(path, { method: "POST", body });
            if (!result.success) return alert(result.message, "error");
            if (isRecovery && !otp) { setOtp(" "); return alert("Check your email for the verification code."); }
            if (isRecovery) { setMode("login"); setOtp(""); return alert("Password reset. Sign in with your new password."); }
            if (result.data?.successToken) return complete(result.data.successToken);
            alert("Account created. Please sign in."); setMode("login");
        } catch { alert("Unable to reach the local API. Start the ASP.NET server and try again.", "error"); }
        finally { setBusy(false); }
    }
    return <main className="auth">
        <section className="auth-intro"><b className="mark big">M</b><small>WELCOME TO</small><h1>{APP_NAME}</h1><p>{APP_TAGLINE}</p></section>
        <form className="card auth-card" onSubmit={send}>
            <small>{isRecovery ? "ACCOUNT RECOVERY" : mode === "register" ? "JOIN THE CLUB" : "MEMBER SIGN IN"}</small>
            <h2>{isRecovery ? (otp.trim() ? "Set a new password" : "Find your account") : mode === "register" ? "Make room for more perks." : "Nice to see you."}</h2>
            {mode === "register" && <Label text="Full name"><input required {...field("name")} /></Label>}
            <Label text="Mobile number"><input required inputMode="tel" placeholder="0123456789" {...field("phoneNumber")} /></Label>
            {(mode === "register" || isRecovery) && <Label text="Email"><input required type="email" {...field("email")} /></Label>}
            {mode === "register" && <Label text="Birthday (optional)"><input type="date" {...field("birthday")} /></Label>}
            {!isRecovery && <Label text="Password"><input required type="password" {...field("password")} /></Label>}
            {isRecovery && otp.trim() && <><Label text="Verification code"><input required value={otp} onChange={(event) => setOtp(event.target.value)} /></Label><Label text="New password"><input required type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Label></>}
            <button className="primary" disabled={busy}>{busy ? "One moment…" : isRecovery ? (otp.trim() ? "Reset password" : "Send code") : mode === "register" ? "Create account" : "Sign in"}</button>
            {mode === "login" && <button type="button" className="link" onClick={() => setMode("recover")}>Forgot your password?</button>}
            <button type="button" className="link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setOtp(""); }}>{mode === "login" ? "New here? Create an account" : "Already a member? Sign in"}</button>
        </form>
    </main>;
}

function Label({ text, children }) { return <label>{text}{children}</label>; }

function HomePage({ profile, lists, open }) {
    const feature = lists.highlights[0];
    return <main className="content">
        <section className="hello"><div><small>YOUR DAILY PERK</small><h2>Welcome back, {profile?.name?.split(" ")[0] || "member"}.</h2></div><button className="avatar" onClick={() => open("account")}>{profile?.name?.[0] || "M"}</button></section>
        <section className="points"><div><small>AVAILABLE BALANCE</small><strong>{profile?.point ?? "—"}</strong><span> points</span></div><b>{profile?.tier || "Member"}<em> tier</em></b><button onClick={() => open("collect")}>Collect points <span>→</span></button></section>
        <section className="quick">{[["rewards", "✦", "Rewards"], ["wallet", "▣", "Vouchers"], ["outlets", "⌖", "Outlets"], ["history", "◷", "History"]].map(([id, icon, label]) => <button key={id} onClick={() => open(id)}><b>{icon}</b>{label}</button>)}</section>
        <Section title="Fresh from the counter" note="FOR YOU" />
        {feature ? <article className="feature" style={img(feature.image) ? { backgroundImage: `linear-gradient(90deg,rgba(14,49,46,.9),rgba(14,49,46,.2)),url(${img(feature.image)})` } : {}}><small>{feature.subTitle || "MEMBER HIGHLIGHT"}</small><h3>{feature.title || "A little extra, just because."}</h3><p>{feature.description || "Discover today’s member offer."}</p></article> : <Empty text="New highlights will appear here soon." />}
        <Section title="Worth collecting for" note="PICK A PERK" action={() => open("rewards")} />
        <div className="mini-grid">{lists.rewards.slice(0, 2).map((reward) => <article key={reward.rewardGUID || reward.rewardsID}>{img(reward.image) ? <img src={img(reward.image)} alt="" /> : <div>✦</div>}<b>{reward.name || reward.title}</b><span>{reward.point} pts</span></article>)}</div>
    </main>;
}

function Section({ title, note, action }) { return <section className="section-title"><div><small>{note}</small><h2>{title}</h2></div>{action && <button onClick={action}>See all</button>}</section>; }
function Empty({ text }) { return <div className="empty">{text}</div>; }

function Reward({ item, redeem }) { return <article className="reward">{img(item.image) ? <img src={img(item.image)} alt="" /> : <div className="art">✦</div>}<div><small>{item.point ?? 0} PTS</small><h3>{item.name || item.title || "Member reward"}</h3><p>{item.shortTitle || item.subTitle || "A small treat from us."}</p><button className="outline" onClick={() => redeem(item, "reward")}>Redeem</button></div></article>; }
function Voucher({ item, redeem }) { return <article className="voucher"><small>MEMBER VOUCHER</small><h3>{item.voucherName || item.title || "Exclusive offer"}</h3><p>{item.shortTitle || item.subtitle || item.description || "Present this at an outlet."}</p><footer><span>Until {date(item.expiredDate)}</span><button onClick={() => redeem(item, "voucher")}>Use now →</button></footer></article>; }

function Page({ view, lists, profile, back, redeem, submit }) {
    const [tab, setTab] = useState("activeVouchers");
    const [point, setPoint] = useState(""); const [code, setCode] = useState(""); const [outlet, setOutlet] = useState(""); const [pin, setPin] = useState("");
    const [feedback, setFeedback] = useState({ title: "", description: "", rating: "5", category: "General feedback", location: "" });
    const title = { rewards: "Rewards", wallet: "Voucher wallet", collect: "Collect points", outlets: "Our outlets", history: "Activity", account: "Account" }[view];
    if (view === "rewards") return <PageBox title={title} back={back}><p className="intro">Trade your points for a moment worth keeping.</p><div className="stack">{lists.rewards.map((item) => <Reward key={item.rewardGUID || item.rewardsID} item={item} redeem={redeem} />)}</div></PageBox>;
    if (view === "wallet") return <PageBox title={title} back={back}><div className="tabs">{[["activeVouchers", "Available"], ["claimedVouchers", "Used"], ["expiredVouchers", "Expired"]].map(([id, name]) => <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{name}</button>)}</div><div className="stack">{(lists.vouchers[tab] || []).map((item) => <Voucher key={item.voucherGUID || item.voucherID} item={item} redeem={redeem} />)}{!(lists.vouchers[tab] || []).length && <Empty text="Nothing here yet." />}</div></PageBox>;
    if (view === "collect") return <PageBox title={title} back={back}><section className="card form"><small>AT THE COUNTER</small><h2>Start your point request</h2><p>Enter your purchase points, then show the code to outlet staff.</p><Label text="Points to collect"><input type="number" min="1" value={point} onChange={(e) => setPoint(e.target.value)} /></Label><button className="primary" onClick={async () => { const r = await submit("/points/request", { point: Number(point) }); if (r?.success) setCode(r.data?.code || ""); }}>Generate code</button>{code && <div className="code"><small>YOUR COUNTER CODE</small><strong>{code}</strong><Label text="Outlet"><select value={outlet} onChange={(e) => setOutlet(e.target.value)}><option value="">Choose outlet</option>{lists.outlets.map((o) => <option value={o.outletGUID} key={o.outletGUID}>{o.outletName}</option>)}</select></Label><Label text="Staff PIN"><input inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} /></Label><button className="outline" onClick={() => submit("/points/approve", { code, outletGUID: outlet, pin })}>Confirm with staff</button></div>}</section></PageBox>;
    if (view === "outlets") return <PageBox title={title} back={back}><p className="intro">Find a friendly counter near you.</p><div className="stack">{lists.outlets.map((o) => <article className="outlet" key={o.outletGUID}><b>⌖</b><div><h3>{o.outletName}</h3><p>{o.outletStatus || "Open for members"}</p></div></article>)}</div></PageBox>;
    if (view === "history") { const records = [["pointRecords", "Points"], ["rewardRecords", "Rewards"], ["voucherRecords", "Vouchers"]].flatMap(([key, type]) => (lists.history[key] || []).map((x) => ({ ...x, type }))); return <PageBox title={title} back={back}><div className="history">{records.map((x, i) => <article key={i}><b>{x.type[0]}</b><div><h3>{x.description || x.rewardName || x.voucherName || x.type}</h3><p>{date(x.dateAssign || x.dateClaim)}</p></div><strong>{x.point ? `+${x.point}` : "✓"}</strong></article>)}{!records.length && <Empty text="Your activity will appear here." />}</div></PageBox>; }
    return <PageBox title={title} back={back}><section className="account"><b>{profile?.name?.[0] || "M"}</b><h2>{profile?.name || "Member"}</h2><p>{profile?.email || profile?.phoneNumber}</p><span>{profile?.referralCode ? `Referral code · ${profile.referralCode}` : "Member account"}</span></section><section className="card form"><small>SEND A NOTE</small><h2>How was your visit?</h2><Label text="Subject"><input value={feedback.title} onChange={(e) => setFeedback({ ...feedback, title: e.target.value })} /></Label><Label text="Message"><textarea value={feedback.description} onChange={(e) => setFeedback({ ...feedback, description: e.target.value })} /></Label><button className="outline" onClick={() => submit("/feedback", feedback)}>Send feedback</button></section></PageBox>;
}

function PageBox({ title, back, children }) { return <main className="content"><Header title={title} back={back} />{children}</main>; }
function Nav({ view, open }) { return <nav>{NAV_ITEMS.map(([id, icon, label]) => <button className={view === id ? "active" : ""} onClick={() => open(id)} key={id}><b>{icon}</b><span>{label}</span></button>)}</nav>; }

function App() {
    const [token, setToken] = useState(() => sessionStorage.getItem("loyalty_token")); const [view, setView] = useState("home"); const [profile, setProfile] = useState(null); const [lists, setLists] = useState(initialLists); const [notice, setNotice] = useState(null); const [selected, setSelected] = useState(null); const [password, setPassword] = useState(""); const [staffPin, setStaffPin] = useState("");
    const alert = (message, type = "success") => setNotice({ message, type });
    const load = useCallback(async () => { const [profileResult, highlights, rewards, outlets, vouchers, history] = await Promise.all([apiRequest("/member/profile", { method: "POST", body: {}, token }), apiRequest("/highlights"), apiRequest("/rewards"), apiRequest("/outlets"), apiRequest("/vouchers", { token }), apiRequest("/history", { token })]); if (profileResult.status === 401) { sessionStorage.removeItem("loyalty_token"); setToken(null); return alert("Your session has ended.", "error"); } setProfile(profileResult.data || null); setLists({ highlights: highlights.data || [], rewards: rewards.data || [], outlets: outlets.data || [], vouchers: vouchers.data || {}, history: history.data || {} }); }, [token]);
    useEffect(() => {
        if (!token) return undefined;

        const requestId = window.setTimeout(() => {
            load().catch(() => alert("Some member details could not be loaded.", "error"));
        }, 0);

        return () => window.clearTimeout(requestId);
    }, [token, load]);
    const complete = (value) => { sessionStorage.setItem("loyalty_token", value); setToken(value); };
    const submit = async (path, body) => { try { const result = await apiRequest(path, { method: "POST", body, token }); alert(result.message, result.success ? "success" : "error"); if (result.success) load(); return result; } catch { alert("Unable to reach the local API.", "error"); } };
    const confirm = async () => { if (!selected) return; const body = selected.kind === "reward" ? { rewardGUID: selected.item.rewardGUID, memberPassword: password, outletStaffPin: staffPin } : { voucherGUID: selected.item.voucherGUID, memberPassword: password, outletStaffPin: staffPin }; const result = await submit(selected.kind === "reward" ? "/rewards/redeem" : "/vouchers/redeem", body); if (result?.success) { setSelected(null); setPassword(""); setStaffPin(""); } };
    if (!token) return <><Auth complete={complete} alert={alert} /><Alert value={notice} close={() => setNotice(null)} /></>;
    return <div className="shell">{view === "home" && <Header title="Your little loyalty ritual" />}{view === "home" ? <HomePage profile={profile} lists={lists} open={setView} /> : <Page view={view} lists={lists} profile={profile} back={() => setView("home")} redeem={(item, kind) => setSelected({ item, kind })} submit={submit} />}<Nav view={view} open={setView} /><Alert value={notice} close={() => setNotice(null)} />{selected && <div className="shade"><section className="modal"><button className="x" onClick={() => setSelected(null)}>×</button><small>IN-STORE REDEMPTION</small><h2>{selected.item.name || selected.item.voucherName}</h2><p>Ask the outlet staff to enter their PIN.</p><Label text="Your password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Label><Label text="Staff PIN"><input value={staffPin} onChange={(e) => setStaffPin(e.target.value)} /></Label><button className="primary" onClick={confirm}>Confirm redemption</button></section></div>}</div>;
}

export default App;
