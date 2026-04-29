# Project Guidelines

## Security (Zero Tolerance)
* **NO SECRETS**: Never output hardcoded secrets. Use `process.env` which reads from .env file. CI creates this from .env.dist file using envsubst.
* **Auth**: Ensure api routes verify sessions/tokens where required. Any JWT usage must be signed + expiry.
* **Injection Prevention**: Use parameterized queries for SQL/GraphQL.

#### Database Integrity (CRITICAL)
* When changing the Drizzle schema, always run `npm run db:generate` (from the `total/` directory) to generate the migration files. The pipeline will then run migrate later.
* To apply migrations locally, run `npm run db:migrate`. Do NOT use `npx drizzle-kit` directly — the npm scripts handle `.env` loading and proper error reporting.

## Observability
* **Logging**: Must use GCP `Logger` helper class (not `console.log`) for logging. Do NOT pass metadata objects to Logger calls (e.g., Logger.info("message", { userId, day })) because we instead using logging labels via the CLS helper class.
* **Labels**: Near the start of controller functions, assign individual keys on `cls.logFields.labels` — e.g. `cls.logFields.labels.userId = userId`. The `logTrace` middleware already initialises `cls.logFields = { labels: {} }` for every request; reassigning `cls.logFields` or `cls.logFields.labels` in a controller wipes that initialisation and any labels set upstream.
* **Reporting Errors**: You can NOT send an error to ErrorReporting without it being properly thrown and caught. e.g. ErrorReporting.report(new Error(errorMessage)) is wrong because GCP ErroReporting expects a StackTrace, which would now be missing.
* **INPUT**: For input validation, use express-validator rules at the top of the controller which are then loaded as middleware in the route. Only validate input in the controller method itself if it's too complex for express-validator, e.g. when doing DB queries.
* **CATCHING**: We have an errorHandler middleware set in index.ts that reports ANY UNCAUGHT (propagated) error and returns an api error to the client.                                                                           
  - If you use try-catch and DON'T re-throw the error: the error does NOT propagate to the global errorhandler, so you MUST manually report it with ErrorReporting.report() if you want it tracked.                               
  - If you use try-catch and re-throw: the error DOES propagate to the global errorhandler, which will both report it AND send the response. In this case, do NOT manually call ErrorReporting.report().
  - If you DON'T use try-catch: the error propagates to the global errorhandler automatically.
  - Therefore: You should NOT wrap controller functions in try-catch blocks unless you actually need to do specific work in the catch block (like specific recovery logic, custom error throwing, or returning a different structured response).
* **FLOW**: Do NOT look at errorMessages for flow control (string or substring matching). Use proper return types/values for such things.
  #### Error Logging vs ErrorReporting
  When choosing to log an error instead of reporting it via ErrorReporting:
  - You MUST include the actual error message or code in the log
  - DO NOT use bare `Logger.error("message")` when catching an error
  - Instead, format the error message into the log string: `Logger.error(`Action failed: ${errorMessage}`)`
  - The CLS labels should only contain small identifiers/IDs, not full error messages.

## Performance
* **Async Discipline (CRITICAL)**: Every async call MUST be `await`ed within the request handler. We run on Cloud Run (serverless) — CPU is only allocated during an active HTTP request. Fire-and-forget patterns (unawaited promises, floating async calls) will silently fail or cause unhandled rejections that crash the process. For any work that should happen outside the request lifecycle, use Google Cloud Tasks.
* **N+1 check**: Look for loops that trigger DB calls.
* **Indexes**: If a `WHERE/JOIN/ORDER BY` clause is added, verify the index exists in the schema
* **Workloads**: If a task takes >60s or is CPU-heavy, OFF-LOAD to Google Cloud Tasks ('dequeue' service) using CloudTasks helper class. Do not do such work in the main request. Only enforce this for genuinely heavy tasks (file processing, video rendering, etc.) and not for simple API calls even if they may take a while.

## GDPR - Don't log actual personal data (PII). Log only identifiers or lengths. This includes:
* **Direct identifiers**: email, phone, SSN, tax ID, username
* **Contact info**: postal address, city, state, zip
* **Demographics**: race, religion, ethnicity, political opinion, sexual orientation
* **Health/biometric**: medical records, DNA, fingerprint data
* **Financial**: full credit card number, bank account number
* **Names**: first name, last name
* **NOT considered personal data**: userId, random tokens/codes, coupon codes, session IDs, transaction IDs

### Error Handling
* **When to use try-catch**: Do NOT add try-catch blocks unless you need specific recovery or error handling logic in the catch block. Let errors propagate to the global errorHandler middleware instead.
* **Required catch block work**: If you DO use try-catch, the catch block must do useful work:
  - Report all errors to GCP Error Reporting unless there is a good reason not to (e.g. error is expected), in which case a Logger.error or Logger.warning will suffice.
  - Custom error throwing
  - Recovery logic (e.g., retry, continue to next iteration)
* **Silent catch blocks (CRITICAL — review must flag these)**: Every `catch` block MUST contain a Logger call or ErrorReporting call. The following patterns are ALL violations, even when the catch "does something" like return or continue:
  - `catch { return ... }` — silent return without logging
  - `catch { continue }` — silent skip without logging
  - `catch { }` — empty block
  - `catch(err) { throw err }` — pointless re-throw
  - Any catch that does not call `Logger.*` or `ErrorReporting.*` is a violation

## Required Verification
*Whenever you modify SQL or write complex logic, you MUST run the relevant skill:*
- SQL Changes? -> Run `audit-db`