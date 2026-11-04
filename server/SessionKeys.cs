namespace server;

// keys used to store things in the server session (see Program.cs, AddSession)
public static class SessionKeys
{
    // JWT tokens returned by the remote API after a successful login
    public const string MemberToken = "MemberToken";
    public const string AdminToken = "AdminToken";
    public const string AdminName = "AdminName";

    // a member who just registered but has not entered the OTP yet
    public const string PendingToken = "PendingMemberToken";

    // the OTP we are waiting for (register or forgot password), kept on the server only
    public const string PendingOtp = "PendingOtp";
}
