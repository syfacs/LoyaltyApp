import { useEffect } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { APP_NAME, ROUTES } from "./constants.js";
import RequireAuth from "./components/RequireAuth.jsx";
import AuthProvider from "./context/AuthProvider.jsx";
import ToastProvider from "./context/ToastProvider.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import StackLayout from "./layouts/StackLayout.jsx";
import TabsLayout from "./layouts/TabsLayout.jsx";
import NotFound from "./renders/NotFound.jsx";

// member portal
import About from "./renders/member/About.jsx";
import Account from "./renders/member/Account.jsx";
import ChangePassword from "./renders/member/ChangePassword.jsx";
import CollectPoints from "./renders/member/CollectPoints.jsx";
import Feedback from "./renders/member/Feedback.jsx";
import ForgotPassword from "./renders/member/ForgotPassword.jsx";
import HighlightDetail from "./renders/member/HighlightDetail.jsx";
import History from "./renders/member/History.jsx";
import HistoryDetail from "./renders/member/HistoryDetail.jsx";
import Home from "./renders/member/Home.jsx";
import Login from "./renders/member/Login.jsx";
import MyVouchers from "./renders/member/MyVouchers.jsx";
import OutletDetail from "./renders/member/OutletDetail.jsx";
import Outlets from "./renders/member/Outlets.jsx";
import Profile from "./renders/member/Profile.jsx";
import Register from "./renders/member/Register.jsx";
import ResetPassword from "./renders/member/ResetPassword.jsx";
import RewardDetail from "./renders/member/RewardDetail.jsx";
import Rewards from "./renders/member/Rewards.jsx";
import Verify from "./renders/member/Verify.jsx";
import VoucherDetail from "./renders/member/VoucherDetail.jsx";
import Vouchers from "./renders/member/Vouchers.jsx";

// admin portal
import AdminAssignPoints from "./renders/admin/AssignPoints.jsx";
import AdminDashboard from "./renders/admin/Dashboard.jsx";
import AdminFeedbackDetail from "./renders/admin/FeedbackDetail.jsx";
import AdminFeedbacks from "./renders/admin/Feedbacks.jsx";
import AdminHighlightDetail from "./renders/admin/HighlightDetail.jsx";
import AdminHighlightForm from "./renders/admin/HighlightForm.jsx";
import AdminHighlights from "./renders/admin/Highlights.jsx";
import AdminLogin from "./renders/admin/Login.jsx";
import AdminMemberDetail from "./renders/admin/MemberDetail.jsx";
import AdminMemberForm from "./renders/admin/MemberForm.jsx";
import AdminMembers from "./renders/admin/Members.jsx";
import AdminOutlets from "./renders/admin/Outlets.jsx";
import AdminPointDetail from "./renders/admin/PointDetail.jsx";
import AdminPoints from "./renders/admin/Points.jsx";
import AdminRedemptionDetail from "./renders/admin/RedemptionDetail.jsx";
import AdminRedemptions from "./renders/admin/Redemptions.jsx";
import AdminRewardDetail from "./renders/admin/RewardDetail.jsx";
import AdminRewardForm from "./renders/admin/RewardForm.jsx";
import AdminRewards from "./renders/admin/Rewards.jsx";
import AdminStaff from "./renders/admin/Staff.jsx";
import AdminVoucherDetail from "./renders/admin/VoucherDetail.jsx";
import AdminVoucherForm from "./renders/admin/VoucherForm.jsx";
import AdminVouchers from "./renders/admin/Vouchers.jsx";

// each portal has its own login, so each one gets its own AuthProvider
function MemberPortal() {
    return (
        <AuthProvider portal="member">
            <Outlet />
        </AuthProvider>
    );
}

function AdminPortal() {
    return (
        <AuthProvider portal="admin">
            <Outlet />
        </AuthProvider>
    );
}

export default function App() {
    useEffect(() => {
        document.title = APP_NAME;
    }, []);

    return (
        <BrowserRouter>
            <ToastProvider>
                <Routes>
                    {/* ---------- member portal ---------- */}
                    <Route element={<MemberPortal />}>
                        {/* the main pages, with the bottom navigation */}
                        <Route element={<TabsLayout />}>
                            <Route index element={<Home />} />
                            <Route path="about" element={<About />} />
                            <Route path="outlets" element={<Outlets />} />
                            <Route path="rewards" element={<Rewards />} />
                            <Route path="vouchers" element={<Vouchers />} />
                            <Route path="account" element={<Account />} />
                        </Route>

                        <Route element={<StackLayout />}>
                            <Route path="login" element={<Login />} />
                            <Route path="register" element={<Register />} />
                            <Route path="verify" element={<Verify />} />
                            <Route path="forgot-password" element={<ForgotPassword />} />
                            <Route path="reset-password" element={<ResetPassword />} />

                            {/* anyone can look at these */}
                            <Route path="outlets/:guid" element={<OutletDetail />} />
                            <Route path="rewards/:guid" element={<RewardDetail />} />
                            <Route path="vouchers/:guid" element={<VoucherDetail />} />
                            <Route path="highlights/:guid" element={<HighlightDetail />} />

                            {/* these need a logged in member */}
                            <Route element={<RequireAuth loginPath={ROUTES.member.login} />}>
                                <Route path="my-vouchers" element={<MyVouchers />} />
                                <Route path="collect-points" element={<CollectPoints />} />
                                <Route path="history" element={<History />} />
                                <Route path="history/:guid" element={<HistoryDetail />} />
                                <Route path="feedback" element={<Feedback />} />
                                <Route path="account/profile" element={<Profile />} />
                                <Route path="account/password" element={<ChangePassword />} />
                            </Route>
                        </Route>
                    </Route>

                    {/* ---------- admin portal ---------- */}
                    <Route path="admin" element={<AdminPortal />}>
                        <Route element={<StackLayout />}>
                            <Route path="login" element={<AdminLogin />} />
                        </Route>

                        {/* the logged in pages have a side menu on a computer */}
                        <Route element={<AdminLayout />}>
                            <Route element={<RequireAuth loginPath={ROUTES.admin.login} />}>
                                <Route index element={<AdminDashboard />} />

                                <Route path="members" element={<AdminMembers />} />
                                <Route path="members/new" element={<AdminMemberForm />} />
                                <Route path="members/:id" element={<AdminMemberDetail />} />
                                <Route path="members/:id/edit" element={<AdminMemberForm />} />

                                <Route path="rewards" element={<AdminRewards />} />
                                <Route path="rewards/new" element={<AdminRewardForm />} />
                                <Route path="rewards/:id" element={<AdminRewardDetail />} />
                                <Route path="rewards/:id/edit" element={<AdminRewardForm />} />

                                <Route path="vouchers" element={<AdminVouchers />} />
                                <Route path="vouchers/new" element={<AdminVoucherForm />} />
                                <Route path="vouchers/:id" element={<AdminVoucherDetail />} />
                                <Route path="vouchers/:id/edit" element={<AdminVoucherForm />} />

                                <Route path="highlights" element={<AdminHighlights />} />
                                <Route path="highlights/new" element={<AdminHighlightForm />} />
                                <Route path="highlights/:id" element={<AdminHighlightDetail />} />
                                <Route path="highlights/:id/edit" element={<AdminHighlightForm />} />

                                <Route path="outlets" element={<AdminOutlets />} />
                                <Route path="outlets/:outletId/staff" element={<AdminStaff />} />

                                <Route path="points" element={<AdminPoints />} />
                                <Route path="points/assign" element={<AdminAssignPoints />} />
                                <Route path="points/:id" element={<AdminPointDetail />} />

                                <Route path="redemptions" element={<AdminRedemptions />} />
                                <Route path="redemptions/:type/:id" element={<AdminRedemptionDetail />} />

                                <Route path="feedback" element={<AdminFeedbacks />} />
                                <Route path="feedback/:id" element={<AdminFeedbackDetail />} />
                            </Route>
                        </Route>
                    </Route>

                    <Route path="*" element={<NotFound />} />
                </Routes>
            </ToastProvider>
        </BrowserRouter>
    );
}
