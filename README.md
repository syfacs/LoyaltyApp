To run
On client run: `npm run dev`
On server run: `dotnet run` or `dotnet watch run`

The client opens on http://localhost:5173 (member portal) and http://localhost:5173/admin (admin portal).
The server runs on http://localhost:5218 and calls the remote API (`API:AlpacaBaseUrl` in `server/appsettings.json`).

How it fits together
- `client/src/constants.js` holds the app name, texts, limits and routes. `client/src/styles/theme.css` holds the colours.
- `client/src/services/api.js` has every call the pages make to our server (`memberApi`, `adminApi`).
- `server/Controllers/MemberController.cs` and `AdminController.cs` check the request, call the remote API through
  `server/Services/AlpacaService.cs` and answer with `{ success, message, ... }`.
- The remote JWT tokens (and the pending OTP) are kept in the server session, the browser never sees them.
- While the server runs in Development, the OTP is also shown on the verification page, so you can test without a mailbox.
