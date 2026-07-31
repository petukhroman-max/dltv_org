# Admin authentication and bootstrap

The moderation interface uses Supabase Auth email magic links and a
cookie-backed server session. It is intentionally read-only.

## Supabase dashboard configuration

In the Supabase dashboard:

1. Open **Authentication → Providers → Email**.
2. Enable the Email provider and email OTP/magic-link sign-in. Keep password
   sign-in settings independent; this application does not expose a password
   form.
3. Open **Authentication → URL Configuration**.
4. Set **Site URL** to `http://localhost:3000` for local development.
5. Add `http://localhost:3000/auth/callback` to **Redirect URLs**.

For a deployed environment, use its exact HTTPS origin for
`NEXT_PUBLIC_APP_URL`, set that origin as the Site URL, and add the exact
`https://<application-origin>/auth/callback` URL. Do not use broad wildcard
redirects in production.

Configure the public Supabase URL and anon key for session creation. Keep the
service-role key server-side; it is used only by server-only repositories.

## Bootstrap the first administrator

There is no public "make me admin" function and no automatic promotion based
on email configuration.

1. Open `/admin/login` and request a magic link for the intended address.
2. Follow the link once. Before bootstrap, the authenticated account will see
   **Access denied**; this is expected.
3. In **Authentication → Users**, find that user and copy the UUID.
4. In the SQL editor, verify the UUID and normalized lowercase email, then run:

```sql
insert into public.admin_users (user_id, email)
values ('<AUTH_USER_UUID>', 'email@example.com');
```

Use placeholders until execution; never commit a real UUID or administrator
email. Sign out and request a new magic link after inserting the record.

To revoke access without deleting the Supabase Auth user:

```sql
delete from public.admin_users
where user_id = '<AUTH_USER_UUID>';
```

Revocation takes effect on the next protected request because membership is
checked server-side for each request.

## Authorization model

Access requires all of the following:

- `supabase.auth.getUser()` validates a current authenticated session;
- the Auth `user.id` has a row in `public.admin_users`;
- the lowercased Auth email equals the lowercase email in that row.

`ADMIN_EMAILS` is only an optional bootstrap/configuration helper. It does not
grant access and cannot replace the database row. This avoids an environment
variable becoming an implicit second permission store.

Middleware refreshes Supabase cookies but is not the authorization boundary.
The protected server layout calls `requireAdmin()` before rendering data.
Service-role access is isolated to `server-only` repositories and is never
included in middleware or browser code.

The callback uses fixed internal destinations, exposes no tokens, and shows
generic errors. The login response is the same whether or not an address has
admin access, preventing membership enumeration.

Admin routes use dynamic rendering, disable data-fetch caching, and include
`noindex` metadata because submissions contain personal contact information.
External submission links render only when their protocol is HTTP or HTTPS.
Audit metadata is escaped by React and sensitive-looking keys are redacted.

## Manual test checklist

- Open `/admin/submissions` while signed out; verify redirect to `/admin/login`.
- Request a magic link and verify the pending button state and generic success
  response.
- Sign in as an authenticated user without an `admin_users` row; verify
  **Access denied**.
- Add that Auth UUID and lowercase email to `admin_users`, sign out, then sign
  in again.
- Verify the submissions list, status/region/date filters, and pagination.
- Open a submission and verify tournament, organizer, HTTP(S) links, and audit
  events.
- Verify status is text-only and no edit, approve, reject, publish, or delete
  controls exist.
- Verify logout clears access and a protected route redirects to login again.
- Verify mobile horizontal table scrolling and visible keyboard focus.
- Inspect page metadata and verify admin pages are `noindex`.

## Troubleshooting

- **Magic link returns to the wrong host:** check `NEXT_PUBLIC_APP_URL`, Site
  URL, and the exact callback entry in Redirect URLs.
- **Callback returns a generic error:** the code may be expired, already used,
  or not issued for the configured project. Request a new link.
- **Access denied after successful sign-in:** verify both the Auth UUID and
  lowercase email match the `admin_users` row exactly.
- **Protected page returns to login:** check the public Supabase URL/anon key,
  browser cookie policy, and that the app is consistently using one origin.
- **Data cannot be loaded:** verify the server-only service-role environment
  variable and database migration state. Do not expose the key to the browser.

## Known limitations

- There is no invitation UI or administrator-management UI.
- Email delivery, expiry, and rate limits are controlled by Supabase.
- The interface is read-only and has no moderation workflow actions.
- Authorization has one administrator role; there is no general RBAC engine.
- Audit-key redaction is defensive but does not replace preventing secrets from
  being written to metadata.
