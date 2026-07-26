
# Health Tracker Build Plan


# Phase 0: Define the application before implementation

## Step 1: Freeze the first-release scope

Define the minimum usable version as:

1. A user can register and log in.
2. A logged-in user can record food entries.
3. A logged-in user can record weight, mood, and sleep.
4. The dashboard shows today’s entries and totals.
5. The user can view previous days.
6. Every record belongs to exactly one user.
7. Users cannot access each other’s data.

Defer these until the core application works:

* Saved food templates
* Goal customization
* CSV or JSON export
* Advanced charts
* Password resets
* Email verification
* Third-party food databases
* Barcode scanning
* Social features
* Mobile applications

This keeps the initial product aligned with the larger goals already listed in your syllabus while preventing optional features from blocking completion. ([GitHub][2])

## Step 2: Define the main application screens

Plan these routes before writing UI code:

| Route        | Purpose                            |
| ------------ | ---------------------------------- |
| `/`          | Redirect to dashboard or login     |
| `/login`     | Authenticate an existing user      |
| `/register`  | Create an account                  |
| `/dashboard` | Today’s summary and recent entries |
| `/food`      | View and manage food entries       |
| `/health`    | Weight, mood, and sleep records    |
| `/history`   | Browse previous dates              |
| `/analytics` | Trends and charts                  |
| `/settings`  | Goals, account, theme, export      |

The first functional release only needs login, registration, dashboard, food logging, and basic health logging.

---

# Phase 1: Repository and tooling setup

These are the setup steps from the beginning through your current state.

## Step 3: Create the repository

Completed or substantially completed:

* Create a Git repository.
* Create the GitHub repository.
* Add root-level `backend/` and `frontend/` directories.
* Add a root `.gitignore`.
* Add a root `README.md`.
* Commit the initial project structure.

Your repository currently contains those two application directories plus project documentation. ([GitHub][1])

## Step 4: Initialize the FastAPI backend

Completed:

* Create the Python project under `backend/`.
* Use `uv` for Python package and environment management.
* Create the `app` package.
* Create `app/main.py`.
* Instantiate the FastAPI application.
* Run the development server.
* Verify the application on port `8000`.

The backend currently includes `pyproject.toml`, `uv.lock`, and the `app` package. ([GitHub][3])

## Step 5: Initialize the Qwik frontend

Completed:

* Generate the Qwik City project under `frontend/`.
* Install npm dependencies.
* Run the Vite development server.
* Verify the frontend on port `5173`.
* Identify `src/routes/index.tsx` as the home page.

The current frontend follows Qwik City’s directory-based routing structure. ([GitHub][4])

## Step 6: Connect frontend and backend

Completed:

* Add a FastAPI health endpoint.
* Add CORS middleware.
* Allow both common local frontend origins.
* Fetch the health endpoint from Qwik.
* Display the returned status in the browser.

Your current FastAPI configuration allows requests from both `http://localhost:5173` and `http://127.0.0.1:5173`, and exposes `/api/health`. ([GitHub][5])

## Step 7: Improve the project-level developer experience

Do this next, before adding substantial functionality.

Create a predictable local workflow:

* Document the required Python and Node versions.
* Document backend installation.
* Document frontend installation.
* Document the two development commands.
* Add an example environment file.
* Decide whether commands run from the repository root or individual directories.
* Add formatting and linting commands.
* Add test commands.
* Decide on a branch and commit strategy.

A new developer should be able to clone the repository and run both applications without guessing.

### Completion checkpoint

You should be able to delete local dependencies, clone the repository fresh, follow the README, and reproduce the working health-check page.

---

# Phase 2: Design the application architecture

## Step 8: Split the FastAPI application into modules

Do not continue putting everything in `main.py`.

Plan a structure with separate responsibilities:

```text
backend/app/
  main
  core/
    configuration
    security
  database/
    session
    base
  models/
  schemas/
  repositories/
  services/
  api/
    dependencies
    routes/
  tests/
```

The exact names can vary, but the boundaries should be clear:

* **Models:** database tables.
* **Schemas:** request and response validation.
* **Repositories:** database access.
* **Services:** business rules.
* **Routes:** HTTP behavior.
* **Dependencies:** authentication and shared request dependencies.
* **Core:** configuration and security.
* **Database:** engine and session management.

For a learning project, avoid unnecessary abstraction. A route may initially call a repository directly. Introduce services where real business logic exists, such as daily summaries or authentication.

## Step 9: Establish API conventions

Choose conventions before creating many endpoints:

* All API routes begin with `/api`.
* Versioning begins with `/api/v1`, or you deliberately defer versioning.
* JSON uses one naming convention consistently.
* Dates use ISO 8601.
* Timestamps are stored in UTC.
* User-facing day calculations use the user’s timezone.
* Errors follow a consistent shape.
* List endpoints support pagination.
* Protected resources never accept `user_id` from the browser.
* Ownership comes from the authenticated user.

A sensible route prefix would be `/api/v1`.

## Step 10: Establish frontend architecture

Plan Qwik directories such as:

```text
frontend/src/
  components/
    common/
    forms/
    dashboard/
  routes/
  services/
  types/
  utils/
  context/
  styles/
```

Responsibilities:

* **Routes:** pages and route loaders/actions.
* **Components:** reusable presentation and interaction.
* **Services:** communication with FastAPI.
* **Types:** frontend representations of API data.
* **Utils:** formatting and small pure functions.
* **Context:** narrowly scoped shared application state.

Avoid placing all API calls, state, markup, and formatting in route files.

## Step 11: Decide the browser-to-API strategy

You have two viable patterns.

### Pattern A: Browser calls FastAPI directly

The browser at port `5173` calls the backend at port `8000`.

Advantages:

* Easy to understand.
* Matches your current implementation.
* Clearly teaches CORS.

Costs:

* Authentication cookies and production origins require careful configuration.
* The frontend must know the API origin.

### Pattern B: Qwik server acts as an intermediary

Qwik server routes call FastAPI, and the browser primarily communicates with Qwik.

Advantages:

* Can simplify browser cookies and API origin handling.
* Can hide backend addresses from browser code.
* Reduces some CORS concerns.

Costs:

* Adds another layer.
* Makes request flow less direct for a beginner.

For this project, continue with **Pattern A** until the application is working. Reconsider the proxy approach during deployment.

---

# Phase 3: Configuration and environment management

## Step 12: Add backend settings

Create centralized settings for:

* Application environment
* Debug mode
* Database URL
* JWT secret or session secret
* Token expiration
* Allowed origins
* Frontend URL
* Logging level

Use environment variables rather than hard-coded production values.

Maintain an `.env.example` containing safe placeholders. Never commit real secrets.

## Step 13: Add frontend environment configuration

The frontend needs a configurable API base URL.

Use separate values for:

* Local development
* Production
* Tests, if needed

Do not scatter `http://127.0.0.1:8000` throughout components.

## Step 14: Configure error and logging behavior

Backend:

* Log application startup.
* Log unexpected errors.
* Avoid logging passwords, tokens, or sensitive health data.
* Return generic messages for internal failures.
* Preserve useful validation errors.

Frontend:

* Distinguish loading, success, empty, and error states.
* Show user-friendly errors.
* Keep detailed diagnostic information in development logs.

### Completion checkpoint

Changing an environment variable should be sufficient to point the frontend at a different backend or the backend at a different database.

---

# Phase 4: Database foundation

This is the most important next technical milestone.

## Step 15: Choose the development database strategy

Use PostgreSQL as the target database because that is also your intended deployment database. Your syllabus already identifies PostgreSQL and Alembic as core technologies. ([GitHub][2])

You have two reasonable local options:

* Install PostgreSQL locally.
* Run PostgreSQL in a container.

A container generally makes setup more reproducible, but learning a local PostgreSQL installation is also valid.

Avoid building the application around SQLite and switching much later. SQLite is useful for tiny experiments, but differences in typing, concurrency, date handling, and constraints can produce surprises.

## Step 16: Add SQLAlchemy

Establish:

* Database engine
* Session factory
* Declarative model base
* Per-request database session
* Transaction behavior
* Connection cleanup

Understand the lifecycle:

1. Request arrives.
2. A database session is opened.
3. Route or repository performs work.
4. Changes are committed or rolled back.
5. Session closes.

## Step 17: Add Alembic

Initialize migrations and connect Alembic to your model metadata.

From that point onward:

* Every schema change receives a migration.
* Migrations are committed.
* Migrations are reviewed before execution.
* Production does not rely on automatic table creation.

## Step 18: Design the first database schema

Recommended initial tables:

### `users`

* ID
* Email
* Password hash
* Display name, optional
* Timezone
* Active status
* Created timestamp
* Updated timestamp

### `food_entries`

* ID
* User ID
* Entry date
* Meal category
* Food name
* Serving description
* Calories
* Protein grams
* Carbohydrate grams
* Fat grams
* Optional notes
* Created timestamp
* Updated timestamp

### `weight_entries`

* ID
* User ID
* Measurement date
* Weight
* Optional notes
* Created timestamp
* Updated timestamp

### `mood_entries`

* ID
* User ID
* Entry date
* Mood score from 1 to 10
* Optional notes
* Created timestamp
* Updated timestamp

### `sleep_entries`

* ID
* User ID
* Sleep date
* Duration
* Quality score from 1 to 10
* Optional notes
* Created timestamp
* Updated timestamp

### `user_goals`

Add later, after basic logging works:

* User ID
* Daily calorie target
* Protein target
* Carbohydrate target
* Fat target
* Optional target weight

## Step 19: Decide important data rules

Set these rules explicitly:

* Emails are unique after normalization.
* Calories cannot be negative.
* Macronutrients cannot be negative.
* Weight must be greater than zero.
* Mood is restricted to 1–10.
* Sleep quality is restricted to 1–10.
* Sleep duration cannot be negative.
* A user may have multiple food entries per day.
* Decide whether weight, mood, and sleep allow one or multiple entries per day.
* Deleting a user should remove or anonymize owned records.
* All owned tables require a foreign key to the user.

For the first release, allowing multiple records per day is more flexible. The dashboard can display the latest weight, mood, and sleep record for that date.

## Step 20: Create and verify the first migration

The first migration should create the initial tables and constraints.

Verify:

* A new empty database can be fully built from migrations.
* Migration rollback works during development.
* Foreign-key constraints work.
* Unique constraints work.
* Invalid records are rejected.

### Completion checkpoint

You can create a database from scratch, apply all migrations, and inspect the resulting tables.

---

# Phase 5: Build one complete vertical slice before authentication

Do not build all backend endpoints and then all frontend pages. Build one feature end to end.

Use **food entries** as the first vertical slice.

## Step 21: Create food-entry schemas

Plan separate representations for:

* Food-entry creation input
* Food-entry update input
* Food-entry response
* Food-entry list response

Do not reuse the database model as the request schema.

Decide which fields:

* The user supplies.
* The server generates.
* Are required.
* Are optional.
* May be updated.

## Step 22: Create food-entry persistence operations

Implement conceptually:

* Create an entry
* Retrieve one entry
* List entries
* Update an entry
* Delete an entry

At this stage, you may temporarily use a seeded development user or a temporary ownership mechanism. Clearly mark it as temporary so it cannot accidentally become the final design.

## Step 23: Create food-entry endpoints

Initial API surface:

| Method   | Endpoint                    | Purpose        |
| -------- | --------------------------- | -------------- |
| `POST`   | `/api/v1/food-entries`      | Create entry   |
| `GET`    | `/api/v1/food-entries`      | List entries   |
| `GET`    | `/api/v1/food-entries/{id}` | Retrieve entry |
| `PATCH`  | `/api/v1/food-entries/{id}` | Update entry   |
| `DELETE` | `/api/v1/food-entries/{id}` | Delete entry   |

The list endpoint should support:

* Date
* Start date
* End date
* Meal category
* Pagination

Do not implement all filters immediately. Begin with a single date and pagination.

## Step 24: Test through FastAPI documentation

Use the generated OpenAPI interface to verify:

* Valid entry creation.
* Validation failure behavior.
* Listing by date.
* Missing-record behavior.
* Update behavior.
* Deletion behavior.

## Step 25: Create the Qwik food-entry form

The form needs:

* Food name
* Meal category
* Serving description
* Calories
* Protein
* Carbohydrates
* Fat
* Date
* Notes

Plan for:

* Client-side feedback.
* Server validation errors.
* Disabled submission while pending.
* Form reset on success.
* Accessible labels.
* Mobile usability.

## Step 26: Display food entries

Build a simple daily list with:

* Food name
* Meal category
* Calories and macros
* Edit action
* Delete action
* Empty-state message

## Step 27: Calculate and display daily totals

For the first slice, decide where totals are calculated.

Recommended progression:

1. Initially calculate totals in the backend list or summary response.
2. The frontend renders the server-provided totals.
3. Later create a dedicated daily-summary endpoint.

This prevents inconsistent calculations in multiple clients.

### Completion checkpoint

You can create, view, edit, and delete food entries from the browser, with data persisted in PostgreSQL.

This is the first meaningful application milestone.

---

# Phase 6: Authentication and user isolation

Once the food slice works, introduce real users.

## Step 28: Design authentication behavior

Use:

* Email and password registration.
* Secure password hashing.
* Short-lived access authentication.
* A durable session mechanism.
* Logout.
* A “current user” endpoint.

Although the original syllabus says JWT authentication, avoid automatically assuming that tokens must be stored in browser local storage. ([GitHub][2])

For a browser-based application, a safer design is typically:

* JWT or opaque session value in an `HttpOnly` cookie.
* `Secure` in production.
* Appropriate `SameSite` policy.
* Explicit CSRF consideration.
* No token access from ordinary JavaScript.

You can still learn JWTs while storing them in protected cookies.

## Step 29: Build password handling

Requirements:

* Never store plaintext passwords.
* Use a modern password-hashing algorithm.
* Enforce reasonable minimum requirements.
* Normalize emails consistently.
* Do not reveal whether an account exists unnecessarily.
* Never log passwords.

## Step 30: Build authentication endpoints

Initial endpoints:

| Method | Endpoint                | Purpose             |
| ------ | ----------------------- | ------------------- |
| `POST` | `/api/v1/auth/register` | Create account      |
| `POST` | `/api/v1/auth/login`    | Start session       |
| `POST` | `/api/v1/auth/logout`   | End session         |
| `GET`  | `/api/v1/auth/me`       | Return current user |

Password reset and email verification can wait.

## Step 31: Create the current-user dependency

Create one reusable backend mechanism that:

1. Reads the authentication credential.
2. Validates it.
3. Loads the user.
4. Rejects inactive or invalid users.
5. Supplies the user to protected routes.

Every protected route should use this dependency.

## Step 32: Enforce ownership in database queries

This is a critical security rule.

Do not:

1. Retrieve an entry by ID.
2. Then check whether its user ID matches.

Prefer querying with both conditions together:

* Entry ID matches.
* Owner ID matches the authenticated user.

Apply this rule to read, update, and delete operations.

Never trust a browser-provided `user_id`.

## Step 33: Build Qwik registration and login routes

Each page should handle:

* Form state
* Pending state
* Validation errors
* Authentication failure
* Successful redirect
* Already-authenticated users

## Step 34: Protect frontend routes

For protected pages:

* Determine whether a valid session exists.
* Redirect unauthenticated users to login.
* Prevent protected data from flashing before redirect.
* Redirect authenticated users away from login and registration where appropriate.

Remember that frontend route protection is a usability feature. The backend remains the security boundary.

## Step 35: Replace temporary ownership

Remove the seeded or hard-coded user from the food-entry slice.

All food-entry operations must now use the authenticated user.

### Completion checkpoint

Create two separate accounts and verify:

* Each user sees only their own entries.
* Guessing another entry’s ID does not reveal it.
* Updating another user’s record fails.
* Deleting another user’s record fails.
* Logout invalidates access.

---

# Phase 7: Complete the health-tracking features

Repeat the established vertical-slice pattern.

## Step 36: Add weight tracking

Backend:

* Schemas
* Repository operations
* Routes
* Validation
* Ownership checks

Frontend:

* Weight-entry form
* Recent-entry display
* Edit and delete
* Date handling
* Unit label

Initially support pounds only because that is your stated application requirement. Store the unit decision deliberately so kilograms could be added later.

## Step 37: Add mood tracking

Backend:

* Score validation from 1 to 10
* Optional notes
* Date filtering
* Ownership enforcement

Frontend:

* Clearly labeled 1–10 input
* Explanation of scale direction
* Optional notes
* Recent entries

## Step 38: Add sleep tracking

Decide what the date means. A useful convention is:

* The sleep record is assigned to the morning on which the user woke.

Backend:

* Duration validation
* Quality validation
* Optional notes
* Ownership enforcement

Frontend:

* Duration input
* Quality input
* Notes
* Date picker
* Recent records

## Step 39: Decide whether to combine or separate health endpoints

Separate resource endpoints are simplest:

* `/weight-entries`
* `/mood-entries`
* `/sleep-entries`

A combined daily-health endpoint can be added later for dashboard reads.

### Completion checkpoint

A user can fully manage all four core record types: food, weight, mood, and sleep.

---

# Phase 8: Build the dashboard

## Step 40: Define the dashboard response

Avoid having the dashboard make many unrelated requests forever.

Create a dedicated endpoint such as:

`GET /api/v1/dashboard?date=YYYY-MM-DD`

Its response should include:

* Selected date
* Food entries
* Calorie total
* Protein total
* Carbohydrate total
* Fat total
* Latest weight for the selected date
* Latest mood for the selected date
* Latest sleep record for the selected date
* Optional goal progress

This is a read model tailored to the dashboard rather than a direct database model.

## Step 41: Build the dashboard layout

Recommended sections:

1. Date navigation
2. Daily calorie and macro summary
3. Food-entry list
4. Quick-add food form
5. Weight summary
6. Mood summary
7. Sleep summary
8. Links to detailed history

Start with functional layout and readable spacing. Do not spend significant time on visual polish yet.

## Step 42: Handle daily date boundaries correctly

This requires careful design.

* Database timestamps should use UTC.
* A “day” should reflect the user’s configured timezone.
* Explicit record dates may be stored as date values.
* The dashboard should not depend solely on the server’s timezone.
* “Today” should mean today for the user.

Timezone mistakes become difficult to repair after data accumulates.

## Step 43: Add optimistic behavior only where useful

Begin with conservative refresh behavior:

1. Submit form.
2. Wait for server confirmation.
3. Refresh the relevant dashboard data.
4. Display the result.

Add optimistic updates later, after the data flow is reliable.

### Completion checkpoint

A user can open the dashboard and manage a complete day without leaving the page.

---

# Phase 9: History and filtering

## Step 44: Add date navigation

Support:

* Previous day
* Next day
* Today
* Direct date selection

Keep the selected date in the URL where practical so the page can be bookmarked or refreshed.

## Step 45: Create the history endpoint

The history API should support:

* Start date
* End date
* Record type
* Pagination
* Sort order

Do not return an unlimited lifetime dataset.

## Step 46: Build the history page

Begin with daily grouped summaries:

* Date
* Calories
* Macros
* Latest weight
* Mood
* Sleep

Allow users to open a day for details.

## Step 47: Add robust empty states

Differentiate:

* No records exist at all.
* No records exist on this date.
* No results match the filter.
* The request failed.
* The user is offline or the API is unavailable.

### Completion checkpoint

A user can find and inspect records from an earlier date without manually changing database data.

---

# Phase 10: Goals and progress

## Step 48: Add user goals

Support:

* Calorie target
* Protein target
* Carbohydrate target
* Fat target
* Optional target weight

Decide whether goals are:

* One current goal record per user, or
* Historical, date-effective goals.

For the first version, one current goal record per user is sufficient.

## Step 49: Integrate goals into the dashboard

Display:

* Current total
* Target
* Remaining amount or amount over target
* Progress indicator

Be careful with health-oriented wording. Prefer neutral tracking language over judgmental labels.

## Step 50: Add settings UI

The settings page should eventually contain:

* Display name
* Timezone
* Nutritional goals
* Theme preference
* Account management
* Data export

### Completion checkpoint

Dashboard totals are shown relative to each user’s configured goals.

---

# Phase 11: Analytics and charts

Do this only after the underlying data and summaries are trustworthy.

## Step 51: Define analytics questions

Each chart should answer a real question:

* How has body weight changed?
* How consistent is calorie intake?
* How has protein intake changed?
* Is sleep duration changing?
* Is mood trending up or down?
* Are sleep and mood visibly correlated?

Avoid adding charts simply because a chart library is available.

## Step 52: Create aggregated analytics endpoints

Examples:

* Daily calorie totals
* Daily macro totals
* Weight series
* Mood series
* Sleep duration and quality series

Support:

* Start date
* End date
* Aggregation interval when needed

Do not send all raw food records to the browser just to calculate a 90-day trend.

## Step 53: Select a charting approach compatible with Qwik

Evaluate candidates based on:

* Qwik compatibility
* SSR behavior
* Bundle size
* Accessibility
* Responsive resizing
* TypeScript support
* Maintenance activity

Wrap charts behind your own components so replacing the library does not affect every page.

## Step 54: Build analytics progressively

Recommended order:

1. Weight over time
2. Calories over time
3. Macro trends
4. Sleep duration and quality
5. Mood trend
6. Combined or comparative views

## Step 55: Handle missing data honestly

Do not convert missing records into zero unless zero is semantically correct.

For example:

* No weight record is not a weight of zero.
* No mood record is not a mood score of zero.
* No sleep entry does not necessarily mean no sleep.

### Completion checkpoint

The analytics page accurately represents selected date ranges and handles missing days correctly.

---

# Phase 12: Reusable food templates

## Step 56: Add saved foods

Create a separate saved-food or food-template resource containing:

* Name
* Default serving description
* Calories
* Protein
* Carbohydrates
* Fat
* Owner

## Step 57: Add quick-add behavior

Users should be able to:

* Save an existing food entry as a template.
* Select a template.
* Adjust serving or nutrition values before saving.
* Add it to today’s entries.

Avoid merging templates and historical food entries into the same table unless you have a clear reason. They serve different purposes.

---

# Phase 13: Data export and account controls

## Step 58: Add personal-data export

Export should include:

* User profile settings
* Food entries
* Weight entries
* Mood entries
* Sleep entries
* Goals
* Saved foods

Start with JSON because it preserves structure. Add CSV files later for spreadsheet usage.

## Step 59: Add account deletion

Plan account deletion carefully:

* Require fresh authentication or password confirmation.
* Clearly explain the effect.
* Delete owned data in a transaction.
* Revoke sessions.
* Record only minimal operational audit information, if necessary.

## Step 60: Add password change

Require:

* Current password
* New password
* New-password confirmation
* Session revocation policy

Password reset by email can remain outside the first self-hosted release.

---

# Phase 14: Frontend design system and accessibility

## Step 61: Establish reusable UI primitives

Create reusable components for:

* Buttons
* Inputs
* Selects
* Text areas
* Form-field errors
* Cards
* Dialogs
* Loading indicators
* Empty states
* Alerts
* Navigation

Do not create a huge design system. Extract components after patterns repeat.

## Step 62: Add responsive navigation

Plan:

* Desktop sidebar or header
* Mobile navigation
* Clear active route
* Accessible keyboard interaction
* Visible logout control

## Step 63: Add theme support

Implement light and dark themes after the core layout stabilizes.

Store preference:

* In the user profile when logged in.
* Optionally in local storage before login.
* Respect system preference when no explicit choice exists.

## Step 64: Perform accessibility review

Verify:

* All form controls have labels.
* Keyboard navigation works.
* Focus is visible.
* Error messages are associated with inputs.
* Color is not the only status indicator.
* Charts have textual summaries.
* Contrast is sufficient.
* Dialog focus is managed correctly.

---

# Phase 15: Testing strategy

Testing should begin before the application is “finished.”

## Step 65: Add backend unit tests

Test pure logic such as:

* Password hashing and verification
* Token creation and validation
* Daily total calculations
* Date handling
* Goal progress
* Validation boundaries

## Step 66: Add backend API tests

Test:

* Registration
* Login
* Logout
* Current user
* Authentication failures
* CRUD for every resource
* Ownership isolation
* Filtering
* Pagination
* Invalid data
* Missing records

The most important tests are cross-user access tests.

## Step 67: Use a dedicated test database

Tests must not use the development database.

The test process should:

* Create or reset a dedicated database.
* Apply migrations.
* Run tests in isolation.
* Clean up reliably.

## Step 68: Add frontend component tests selectively

Focus on behavior with real risk:

* Form validation display
* Submission states
* Date navigation
* Summary rendering
* Error rendering
* Authentication redirects

Avoid testing framework internals or trivial static markup.

## Step 69: Add end-to-end tests

Critical workflows:

1. Register.
2. Log in.
3. Add a food entry.
4. Add weight, mood, and sleep.
5. Verify dashboard totals.
6. Edit an entry.
7. Delete an entry.
8. Log out.
9. Verify protected pages are inaccessible.
10. Confirm a second user cannot see the first user’s data.

### Completion checkpoint

The full critical workflow can run automatically against a clean environment.

---

# Phase 16: Security hardening

## Step 70: Review authentication security

Verify:

* Passwords use secure hashing.
* Authentication cookies use `HttpOnly`.
* Production cookies use `Secure`.
* Cookie `SameSite` behavior is intentional.
* Tokens expire.
* Logout invalidates the appropriate credential.
* Secrets are not committed.
* Authentication errors do not reveal sensitive information.

## Step 71: Review request security

Verify:

* CORS allows only known origins in production.
* Request sizes are bounded.
* Server validation exists for every input.
* User ownership is enforced in every query.
* IDs are treated as untrusted.
* SQLAlchemy query construction avoids raw untrusted SQL.
* Error messages do not expose internals.

## Step 72: Add rate limiting where valuable

Prioritize:

* Login
* Registration
* Password-related endpoints
* Export
* Potentially expensive analytics queries

## Step 73: Review health-data sensitivity

This may not be a regulated medical application, but its data is still sensitive.

Practice:

* Collect only needed information.
* Avoid logging record contents unnecessarily.
* Encrypt traffic in production.
* Restrict database access.
* Maintain backups securely.
* Document that this is a wellness tracker, not a clinical diagnostic system.

---

# Phase 17: API and performance refinement

## Step 74: Add pagination consistently

All growing collections need:

* Page or cursor input
* Limit
* Stable ordering
* Total count only where useful
* Maximum page size

## Step 75: Add database indexes

Likely indexes include:

* Unique normalized user email
* User ID plus entry date
* User ID plus created timestamp
* User ID plus resource ID where appropriate

Base indexes on actual query patterns, especially dashboard and history requests.

## Step 76: Prevent inefficient query patterns

Review:

* Dashboard query count
* Analytics aggregation
* Repeated user lookups
* Relationship loading
* History pagination

Use database aggregation for large date ranges.

## Step 77: Add API documentation

FastAPI generates an OpenAPI specification, but you still need:

* Endpoint summaries
* Request descriptions
* Response descriptions
* Authentication documentation
* Error examples
* Pagination documentation

---

# Phase 18: Containerization and production packaging

## Step 78: Package the backend

Create a production backend build that:

* Installs locked dependencies.
* Runs as a non-root user where possible.
* Starts with a production ASGI server configuration.
* Receives settings through environment variables.
* Exposes an application health endpoint.
* Runs migrations through an explicit deployment step.

## Step 79: Choose the Qwik production adapter

Qwik City requires a production integration or adapter. The generated project documentation notes that Qwik supports adding deployment integrations and distinguishes preview mode from production operation. ([GitHub][4])

Choose the adapter that matches the deployment architecture, likely a Node-based server if deploying through Dokku.

## Step 80: Decide production topology

A practical topology:

* Qwik application exposed publicly.
* FastAPI application exposed through the same domain under `/api`, or on a dedicated API subdomain.
* PostgreSQL accessible only internally.
* Reverse proxy terminates HTTPS.
* Environment variables provide service addresses and secrets.

Using one public origin simplifies authentication cookies and removes much of the production CORS complexity.

---

# Phase 19: Deploy to Linode and Dokku

## Step 81: Prepare the server

* Provision the Linode.
* Apply operating-system updates.
* Create a non-root administrative user.
* Configure SSH keys.
* Disable unnecessary password access.
* Configure a firewall.
* Install Dokku.
* Configure DNS.

## Step 82: Provision PostgreSQL

* Install the Dokku PostgreSQL plugin.
* Create the database service.
* Link it to the backend application.
* Confirm the database URL is provided securely.
* Restrict external access.

## Step 83: Deploy the backend

* Create the Dokku backend application.
* Configure production environment variables.
* Deploy the backend.
* Apply migrations.
* Verify the health endpoint.
* Inspect logs.
* Verify database connectivity.

## Step 84: Deploy the frontend

* Create the Dokku frontend application.
* Configure the API origin.
* Deploy the Qwik production server.
* Verify SSR and browser navigation.
* Verify API calls.

## Step 85: Configure domains and HTTPS

* Point DNS records to the server.
* Configure the frontend domain.
* Configure backend routing or API subdomain.
* Install Let’s Encrypt integration.
* Enable automatic certificate renewal.
* Redirect HTTP to HTTPS.

## Step 86: Configure production CORS and cookies

Replace development settings with exact production values.

Do not use wildcard origins with credentialed requests.

Confirm:

* Cookie domain
* Secure flag
* SameSite value
* Frontend origin
* API origin
* Reverse-proxy headers

### Completion checkpoint

A user can register, log in, and manage data through the public HTTPS domain.

---

# Phase 20: Operations and maintenance

## Step 87: Configure backups

Back up:

* PostgreSQL
* Application configuration
* Deployment configuration
* Uploaded files, should the app ever support them

A backup is not trustworthy until restoration has been tested.

## Step 88: Add monitoring

At minimum, monitor:

* Frontend availability
* Backend health
* Database availability
* Disk usage
* Memory
* CPU
* TLS certificate renewal
* Failed deployment status

## Step 89: Add structured production logging

Include:

* Timestamp
* Severity
* Request identifier
* Route
* Status code
* Duration

Exclude:

* Passwords
* Authentication tokens
* Full sensitive health records
* Database credentials

## Step 90: Create a release process

For each release:

1. Run backend tests.
2. Run frontend linting and type checking.
3. Run frontend build.
4. Run end-to-end tests.
5. Review migrations.
6. Back up the database when appropriate.
7. Deploy.
8. Apply migrations.
9. Run smoke tests.
10. Monitor logs.

---

# Recommended implementation order from your current position

Here is the direct sequence I recommend following now:

1. Clean up and expand the README.
2. Add environment configuration to both applications.
3. Restructure FastAPI into route, schema, model, and database modules.
4. Install and configure PostgreSQL.
5. Add SQLAlchemy.
6. Add Alembic.
7. Design the initial database schema.
8. Create the first migration.
9. Build food-entry backend CRUD.
10. Test food endpoints through OpenAPI.
11. Build the Qwik food form and daily list.
12. Add daily calorie and macro totals.
13. Add authentication tables and password security.
14. Add registration, login, logout, and current-user endpoints.
15. Protect food endpoints and enforce ownership.
16. Build Qwik login and registration.
17. Add weight tracking.
18. Add mood tracking.
19. Add sleep tracking.
20. Build the combined daily dashboard endpoint.
21. Build the complete dashboard page.
22. Add history and date filtering.
23. Add goals.
24. Add analytics endpoints.
25. Add charts.
26. Add saved-food templates.
27. Add export and account controls.
28. Add comprehensive tests.
29. Harden authentication and production security.
30. Package and deploy to Linode through Dokku.
31. Add backups, monitoring, and a repeatable release process.

---

# Your immediate next milestone

Your next milestone should be:

> **Persist one food entry in PostgreSQL through FastAPI and display it in Qwik.**

To reach that milestone, the next work package is:

1. Introduce environment settings.
2. Set up PostgreSQL.
3. Add SQLAlchemy database sessions.
4. Add Alembic.
5. Create the `users` and `food_entries` tables.
6. Seed or temporarily identify one development user.
7. Add food-entry schemas.
8. Add create and list endpoints.
9. Build the corresponding Qwik form and list.
10. Verify that data survives server restarts.

That milestone forces you to learn the central full-stack path:

**Qwik form → HTTP request → FastAPI validation → SQLAlchemy → PostgreSQL → API response → Qwik rendering**

Once that path works, authentication and the remaining trackers become controlled repetitions rather than entirely new systems.

[1]: https://github.com/timjedrek/ikemen-ni-naru "GitHub - timjedrek/ikemen-ni-naru: heath tracker app being built to learn FastAPI and Qwik · GitHub"
[2]: https://github.com/timjedrek/ikemen-ni-naru/blob/main/sylllabus.md "ikemen-ni-naru/sylllabus.md at main · timjedrek/ikemen-ni-naru · GitHub"
[3]: https://github.com/timjedrek/ikemen-ni-naru/tree/main/backend "ikemen-ni-naru/backend at main · timjedrek/ikemen-ni-naru · GitHub"
[4]: https://github.com/timjedrek/ikemen-ni-naru/tree/main/frontend "ikemen-ni-naru/frontend at main · timjedrek/ikemen-ni-naru · GitHub"
[5]: https://github.com/timjedrek/ikemen-ni-naru/blob/main/backend/app/main.py "ikemen-ni-naru/backend/app/main.py at main · timjedrek/ikemen-ni-naru · GitHub"
