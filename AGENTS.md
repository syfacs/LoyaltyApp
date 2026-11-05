# LoyaltyApp

A loyalty membership web app: a React client and an ASP.NET Web API "helper" over an existing remote API.
It has two portals. Members collect points and redeem rewards and vouchers. Admins manage the content, the
members and the point records.

The original assignment asked for MVC and jQuery. React plus a Web API controller is a deliberate replacement,
so do not move the code towards MVC.

There is no database and no authentication of our own. All data lives in the remote API, which is a shared
class database that other people also use.

## Stack

- **Client:** React 19, Vite 8, react-router-dom 7, plain CSS. No UI or chart library.
- **Server:** ASP.NET Core on .NET 10, `Scrypt.NET` 1.3.0, in-memory session.
- **Remote API:** `https://alpacaapi.xcode.com.my/api` ([Swagger](https://alpacaapi.xcode.com.my/swagger/index.html)).
  The base URL is `API:AlpacaBaseUrl` in `server/appsettings.json`.

## Running it

```bash
cd server && dotnet run
```

```bash
cd client && npm run dev
```

- Member portal: `http://localhost:5173`
- Admin portal: `http://localhost:5173/admin`
- Server: `http://localhost:5218` (the default `http` launch profile)

The client's server URL is the `base` entry of `AUR` in `client/src/services/api.js`. CORS only allows
`http://localhost:5173` (`server/Program.cs`), so a change to either port needs both places updated.

Checks:

```bash
cd client && npm run lint
```

```bash
cd client && npm run build
```

```bash
cd server && dotnet build
```

There is no test suite. `npm run lint` reports one known error, `useFetch` being called inside the
`HTTP_CLIENT` class in `client/src/services/api.js`. That code came with the project, so leave it unless asked.

`dotnet build` fails with `MSB3021` / `MSB3027` while the server is running, because `server.exe` is locked.
That is a file lock, not a code error.

## Layout

```
client/src/
  constants.js      app name, texts, limits, routes, ADMIN_MENU
  App.jsx           all routes for both portals
  main.jsx          entry point
  components/       shared UI (Field, PhoneField, Carousel, BarChart, RequireAuth, ...)
  context/          AuthProvider (per portal), ToastProvider
  layouts/          TabsLayout (bottom nav), StackLayout (back button), AdminLayout (desktop side menu)
  renders/member/   member pages
  renders/admin/    admin pages
  services/         api.js (every server call), useLoad.js (data loading hook)
  styles/           theme.css (colours, sizes), index.css (all component styles)
  utils/            format.js, useForm.js, validators.js

server/
  Program.cs            CORS, session, HttpClient "AlpacaAPI"
  Controllers/          MemberController.cs, AdminController.cs (the two template controllers are unused)
  Services/             AlpacaService.cs (all remote calls)
  RemoteModels/         records that mirror the remote JSON (server side only)
  DTO/DTOs.cs           request models and the view models sent to the browser
  Validation.cs         shared input checks
  SessionKeys.cs        session key names
```

## How a request flows

1. A page calls `memberApi` or `adminApi` in `client/src/services/api.js`. Every call uses
   `credentials: "include"` so the session cookie travels with it.
2. The controller checks the input and the session, then calls the remote through `AlpacaService`.
3. `AlpacaService` returns a `ServiceResult<T>`. A failure becomes the error body with `result.ToError(...)`.
4. The controller answers `{ success, message, ...data }`. Remote models are mapped to DTOs first.

## Rules to keep

- **Never send a `Remote*` model to the browser.** They contain password hashes, staff PINs, OTPs and tokens.
  Map them to a DTO with its static `From(...)`.
- **Remote JWTs stay in the server session**, never in the browser. There is no `[Authorize]` on these
  controllers: the session is checked directly (`SessionKeys.MemberToken`, `SessionKeys.AdminName`).
- **Session expiry:** a 401 on a token call returns `sessionExpired: true`. `AuthProvider` clears the user and
  `RequireAuth` redirects to the portal's login page. Pages skip their error toast when `err.sessionExpired` is set.
- **The OTP reaches the browser only as `debugOtp`**, and only in the Development environment.
- **Images:** the remote sends a file name. `AlpacaService.ImageUrl(folder, file)` builds the full URL, which
  reaches the browser as `imageUrl`. The folders are `MerchantHighlight`, `MerchantReward` (rewards and vouchers)
  and `MemberProfileImage`.
- **Status:** the remote's status fields are unreliable, so DTO status is worked out from the dates
  (`DateStatus.For`).
- **Phone numbers:** the field shows `+60` and the person types the number without the leading 0 (9 or 10 digits,
  first digit 1-9). `fullPhone()` puts the 0 back before sending, and `localPhone()` removes it to fill a form.
  The server rule (`Validation.IsPhone`) still expects the 0, with 10 or 11 digits in total.
- **Validation lives in both places.** `client/src/utils/validators.js` is for quick feedback and
  `server/Validation.cs` is the real check. Keep the limits in `constants.js` in step with the server.

## Coding conventions

- Keep it simple. Avoid new systems, new services and new dependencies. `AlpacaService` is the only service;
  add to it rather than creating another.
- New DTOs and remote models are fine.
- Leave blank lines between logical blocks of code, but do not pad every line.
- Client text, names and limits go in `constants.js`, so the app name changes in one place. Colours go in `theme.css`.
- Work around the code that came with the project (`HTTP_CLIENT`, `AUR`, the template controllers, `Roles.cs`)
  instead of rewriting it.
- Keep components small and pages plain. Use `useLoad` for loading and `useForm` for forms.

## Design

- The theme is teal and orange. It is meant to differ from the reference images, which only show the layouts.
- The member portal and the admin login are a phone-sized column (`--app-width: 480px`), on desktop too.
- Logged in admin pages are the only exception. At 1024px and wider, `AdminLayout` shows a side menu and the page
  widens to 1100px, with CSS in the "admin shell" section at the end of `index.css`. Below 1024px they are the same
  single column. The wide layout uses `#root:has(.admin-shell)`.
- `.phone-only` hides things on desktop, such as the dashboard tiles that the side menu replaces.
- `Carousel` turns the mouse wheel into sideways scrolling and hands the wheel back to the page at the first and
  last card.

## Authentication and OTP

**Member login:** the phone and password go to the remote's `MemberLogin`, and the returned token goes in the session.

**Register:** the server creates the account, asks the remote for an OTP and keeps the new token as pending. The
member is only signed in after the OTP passes.

**Forgot password:** the server asks the remote for an OTP. A verified OTP unlocks `ResetPassword`.

The remote has no verify-OTP endpoint, so the helper does the checking. It keeps a `PendingOtp` in the session
(purpose, phone, code, created time, attempts, verified). A code is valid for 10 minutes with at most 5 attempts.

**Passwords:** `AlpacaService.VerifyPassword` uses Scrypt for the checks made before change password and redeem.
It must stay on `Scrypt.NET`. The older `SCrypt` package is a different library and cannot verify these hashes.

**Admin login:** a 200 from the remote is the login, and `AdminName` in the session marks it. A token is only
stored and sent if the remote ever returns one.

**Session:** kept in server memory with a 10 minute idle timeout, so restarting the server logs everyone out.

## Remote API behaviour

The live remote differs from the integration guide and the supplied zip in several places. Check these before
changing the related code.

- Admin endpoints need no token. `AdminLogin` answers `{ message, adminID, username }` with no token. The working
  account is `admin` / `admin`, and the documented `admin123` is rejected.
- `MemberLogin` emails an OTP on every successful login. This comes from the remote (the zip's source does it, and
  our code never asks for it), so the helper cannot stop it. Only the remote's owner can.
- `ApprovePoint` is a multipart form, and the guide's `{ code, outletGUID, pin }` body is incomplete. Points are
  only awarded when `PointRecordStatus` is `Approve`, so it must be sent. See `CollectPoints` in `MemberController`.
- `RejectPoint` has no field for a reason, so the helper only logs it.
- A member can redeem each reward only once.
- Staff and rewards that have records cannot be deleted. `DeleteFail` in `AdminController` turns the foreign key
  error into a friendly message.
- Editing a voucher replaces its rules, so the helper always sends the full rule list without ids.
- Older members may have no birthday, so it is optional when an admin edits a member.
- Feedback returns "No Records Found" as a 400, which the helper treats as an empty list.
- `MemberOutletStaff` and member details return staff PINs and password hashes. Never pass these on.

## Working on the shared remote

Other people use this data. Any test data must be prefixed `CLAUDE-TEST` and cleaned up afterwards.

Earlier testing left some records behind: inactive `CLAUDE-TEST` members, an expired reward and voucher, point
records, redemptions, one feedback, and a staff member `CLAUDE-TEST staff 2` on outlet Pavilion that the remote
refuses to delete.

## Git

- `main` is the base branch. Work happens on feature branches such as `claude/sonnet-5.5`.
- Only commit or push when asked.
- `server/bin` and `server/obj` are ignored by the root `.gitignore`. Do not add them back.
- The GitHub CLI (`gh`) is not installed on this machine, so pull requests are opened from the GitHub website.
