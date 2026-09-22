# Care Pine Labs Frontend

A Care plugin that collects payments on Pine Labs (Plutus) POS terminals — it
replaces Care's payment sheet, adds a Pine Labs transactions listing under
Billing, contributes a `pos-terminal` device type, and adds a per-facility
Pine Labs configuration page.

**In one paragraph:** the plugin is a Vite module-federation remote
(`remoteEntry.js`) that care_fe loads at runtime. Unlike a purely additive plug
it registers a **component override** — `PaymentReconciliationSheet` at priority
`10` — so wherever Care would open its payment sheet, this plugin decides what
renders. Its own API calls go to `/api/care_pinelabs/*`, served by
the `care_pinelabs` backend plug.

## What the plugin registers

Care offers two extension mechanisms: **component overrides** (`overrides[]`,
priority-ranked, only the single highest-priority one renders) and **pluggable
slots** (`components{}`, additive, every plugin filling a slot shows up). This
plugin uses both.

`src/manifest.ts`:

| Manifest field                               | Key                                              | What it does                                                                                                     |
| -------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `overrides[]`                              | `PaymentReconciliationSheet` @ priority `10` | `PaymentReconciliationSheetOverride` — picks the Pine Labs sheet, the native sheet, or another plugin's sheet |
| `components{}`                             | `InvoiceRecordPaymentOptions`                  | "Collect via Pinelabs terminal" in the invoice payment-options dropdown                                          |
| `components{}`                             | `FacilityHomeActions`                          | "Configure Pinelabs" in the facility home actions                                                                |
| `devices[]`                                | `pos-terminal`                                 | Device type with its own configure form (`client_id`, `store_id`) and show-page card                         |
| `billingNavItems[]`                        | —                                               | "Pinelabs Transactions" under Billing                                                                            |
| `routes`                                   | —                                               | The three pages below                                                                                            |
| `extends`, `navItems`, `encounterTabs` | —                                               | Empty                                                                                                            |

Routes (`src/routes.tsx`):

| Path                                                           | Component                                                                                                                         |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/facility/:facilityId/billing/pinelabs/transactions`        | `TransactionsPage` — Pine Labs transaction listing                                                                             |
| `/pinelabs/facility/:facilityId/billing/invoices/:invoiceId` | `PineLabsPaymentPage` — dedicated payment page, auto-opens `PaymentSheet`                                                    |
| `/facility/:facilityId/settings/general/pinelabs`            | `PinelabsConfigurePage`. Nested under `settings/general/` so the host's settings sidebar keeps **General** highlighted. |

## Configuration

Configuration lives in **two separate places**, and they answer different
questions. Mixing them up is the most common source of "the flag does nothing".

|           | Layer 1 —`PlugConfig.meta.config`                          | Layer 2 —`PinelabsConfig`                                   |
| --------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Stored in | Care's`PlugConfig` row, slug `care_pinelabs_fe`           | `/api/care_pinelabs/pinelabs_config/`, one row per facility  |
| Scope     | Whole deployment                                              | One facility                                                   |
| Edited by | A deployment admin, via the Admin Panel                       | A facility admin, in Settings → General → Configure Pinelabs |
| Controls  | **Which toggles are visible** on the configuration page | **What the payment flows actually do**                   |
| Read by   | `src/pages/PinelabsConfigurePage.tsx` only                  | Every payment component                                        |

### Layer 1 — Plugin Configuration for CARE FE

Super admins add this plugin from the CARE **Admin panel → Apps**
(`/admin/apps`), which lists the existing *Plug Configs* by slug. Press **Add
New Config** (or the pencil next to an existing row) and fill the two fields of
the form:

| Field                 | Value                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **Slug**        | `care_pinelabs_fe` — must match exactly; it is how the host and this plugin find each other |
| **Meta (JSON)** | the JSON below                                                                                 |

**Save** writes the row; **Delete Config** on an existing row removes the
plugin from the deployment.

```json
{
  "url": "https://<host>/assets/remoteEntry.js",
  "name": "care_pinelabs_fe",
  "config": {
    "allow_advance_payment": true,
    "allow_partial_payment": true,
    "allow_manual_entry": true
  }
}
```

What you type into **Meta (JSON)** is stored as the `meta` blob of that
`PlugConfig` row (`care.users.models.PlugConfig`, served from
`/api/v1/plug_config/`). `PluginEngine` publishes it on
`window.__CARE_PLUGIN_RUNTIME__.meta["care_pinelabs_fe"]`, which is what the
`Level` column below refers to: `url` and `name` sit at the top of the blob,
the three flags one level deeper under `config`. Everything shown above is
optional except `url` — the values in the example are the **permissive**
setting, which shows all three switches; omitting a key hides its switch.

| Key                       | Level           | Effect                                                                                                                                                                                                 | Default when omitted                                                                  |
| ------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `url`                   | `meta`        | Care host — the federated`remoteEntry.js`; its **origin** is also the translation base URL                                                                                                    | — (required)                                                                         |
| `name`                  | `meta`        | Care host — the i18n namespace. Set it to`care_pinelabs_fe` as in the example. ⚠️ Any other value silently breaks every label (see [i18n](#i18n))                                                  | falls back to the slug, which is also`care_pinelabs_fe` — so omitting it works too |
| `allow_advance_payment` | `meta.config` | Shows the**Advance payment** switch on the configuration page                                                                                                                                    | switch hidden                                                                         |
| `allow_partial_payment` | `meta.config` | Shows the**Partial payment** switch                                                                                                                                                              | switch hidden                                                                         |
| `allow_manual_entry`    | `meta.config` | Shows the**Manual entry** switch, *and* enables the rule that disables the "Native" payment-flow option while manual entry is off (a "Native" already selected is forced back to `pinelabs`) | switch hidden; "Native" always selectable                                             |

**These three flags change no payment behaviour on their own.** They gate the
form fields. If all three are omitted the whole "Payment Features" section of
the configuration page disappears, and the corresponding `PinelabsConfig`
values keep whatever they already had — except on **create**, where they are
written as `true` (see [Gotchas](#gotchas)).

#### Possible values

The check is `pluginConfig?.config?.[fieldKey] === true`, so:

| Value in`meta.config`                             | Effect                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| key omitted /`config` absent / `meta` absent    | **Hidden** (the default)                                                   |
| `true` (JSON boolean)                             | **Shown.** The only value that shows the switch.                           |
| `"true"` (string), `1`, `null`, anything else | **Hidden.** ⚠️ Not coerced — a quoted `"true"` silently does nothing. |

`meta` is fetched by the host at load time and frozen, and this plugin snapshots
it once in a mount effect, so an edited `PlugConfig` row needs a **page reload**.
There is no per-facility scoping: the row is global to the deployment.

### Layer 2 — per-facility behaviour (`PinelabsConfig`)

Fetched with `apis.pinelabs_config.get(facilityId)` from
`/api/care_pinelabs/pinelabs_config/?facility_id=<id>`, and cached under the
React Query key `["pinelabs_config", facilityId]`.

| Field                         | Type                                           | What it does                                                                                                                                                                              | Value on create when the switch is hidden                           |
| ----------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `default_payment_flow`      | `"pinelabs"` \| `"native"`                 | `"pinelabs"` → the Pine Labs sheet opens by default; `"native"` → Care's (or the next plugin's) sheet opens, with a "Switch to Pinelabs" button injected                            | `"pinelabs"` (form default, required)                             |
| `allow_advance_payment`     | boolean                                        | Allows the Pine Labs flow for**account / advance** payments (not tied to an invoice). Also gates the "Switch to Pinelabs" button on account sheets                                  | `true`                                                            |
| `allow_partial_payment`     | boolean                                        | Shows the tendered-amount input in the invoice sheet, pre-filled with the full amount due; the transaction is uploaded for the tendered amount                                            | `true`                                                            |
| `meta.allow_manual_entry`   | boolean                                        | Shows "Switch to manual entry"**inside** the Pine Labs sheets — the only way out of the Pine Labs flow once it opens                                                               | `true`                                                            |
| `pinelabs_merchant_id`      | string                                         | Pine Labs merchant id                                                                                                                                                                     | — (required)                                                       |
| `pinelabs_security_token`   | string                                         | Pine Labs security token. Required on create; on edit,**leave empty to keep the existing token** (the field is then not sent)                                                       | —                                                                  |
| `payment_method_mappings[]` | `{care_method, pinelabs_method, is_default}` | Maps a Care payment method to a Pinelabs payment mode. The mapping marked`is_default` pre-selects the method in both sheets                                                             | one row:`debc` (debit card) → `1` (Card), `is_default: true` |
| `pos_terminals[]`           | `{device_id}`                                | Terminals usable for payment at this facility.**Not part of the config PATCH** — saved through its own endpoint as a whole list (see [POS terminal devices](#pos-terminal-devices)) | empty                                                               |

Selectable Plutus modes (`src/lib/paymentMethods.ts`): `1` Card, `10` UPI Sale,
`11` UPI Bharat QR, `8` PhonePe, `21` Amazon Pay. Each mode may be mapped once
(the dropdown hides modes already used); Care methods are **not** de-duplicated.
At least one mapping must be `is_default` — enforced client-side on submit.

#### Defaults at *read* time

Each consumer applies its own fallback, which is what you get when the row is
missing or the field is absent:

| Read site                                        | Expression                                                                                                               | Fallback                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `PaymentReconciliationSheetOverride.tsx:58-60` | `config?.allow_advance_payment`, `config?.meta?.allow_manual_entry`, `config?.default_payment_flow === "pinelabs"` | `undefined` / `false` → native flow, no manual-switch affordance             |
| `PaymentSheet.tsx:118`                         | `config?.allow_partial_payment ?? false`                                                                               | **`false`** — full amount only                                           |
| `PaymentSheet` / `PineLabsAccountPayment`    | mapping with`is_default`, else the first mapping                                                                       | no method selected; a`no_payment_methods_configured` toast if the list is empty |
| `TerminalSelect.tsx:41`                        | `showMineOnly`                                                                                                         | `true` — "My terminals" first, togglable to "All terminals"                    |

⚠️ **The write default and the read default for `allow_partial_payment`
disagree**: creating a config writes `true`, but a config whose field is somehow
absent reads as `false`.

### If nothing is configured at all

| Situation                                 | Behaviour                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No`PlugConfig.meta.config`              | Configuration page shows Basic Settings, POS Terminals and Payment Methods; the Payment Features section is hidden. Payment behaviour unaffected.                                                                                                                                                          |
| No`PinelabsConfig` row for the facility | The payment override renders the**native / next-plugin sheet** for invoices, accounts and credit notes, with **no** "Switch to Pinelabs" button. The plugin is effectively invisible except for the Billing nav item, the "Collect via Pinelabs terminal" menu entry and "Configure Pinelabs". |
| Row exists, no POS terminals linked       | Sheets open, terminal picker is empty; submitting reports`error_please_select_terminal`.                                                                                                                                                                                                                 |
| Row exists, no payment-method mappings    | Both sheets toast`no_payment_methods_configured` and cannot submit.                                                                                                                                                                                                                                      |

### Not configurable (compile-time constants)

| Value                                                                            | Where                                                            | Used for                                                                                                                              |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_PAGE_SIZE = 14`                                                       | `src/lib/constants.ts`                                         | Transactions list, payment-reconciliation list, device search                                                                         |
| Polling:`3000 ms` for the first `30 s`, then `5000 ms`, hard cap `7 min` | `src/hooks/usePaymentReconciliationStatus.ts`                  | Transaction status polling. The cap is deliberately above the backend's ~6 min Plutus polling window. Every caller uses the defaults. |
| `SEARCH_DEBOUNCE_INTERVAL = 500 ms`                                            | `PinelabsConfigurePage`                                        | Terminal device search                                                                                                                |
| `PLUGIN_SLUG` / `I18NNAMESPACE = "care_pinelabs_fe"`                         | `src/lib/constants.ts`                                         | Plugin slug and i18n namespace                                                                                                        |
| Plutus mode list and labels                                                      | `src/lib/paymentMethods.ts`, `src/lib/pinelabsMetaConfig.ts` | Selectable modes; which`meta` fields the transaction details sheet shows                                                            |

### Transactions listing defaults

| Filter                                             | Default            | How to clear         |
| -------------------------------------------------- | ------------------ | -------------------- |
| `status`                                         | `completed`      | `?status=none`     |
| `created_by`                                     | the current user   | `?created_by=none` |
| `method`, `location`, `terminal`, date range | unset (all)        | —                   |
| `ordering`                                       | `-modified_date` | —                   |
| `page` / `limit`                               | `1` / `14`     | —                   |

The table query is deferred until the `created_by` default is settled, so the
first request is never accidentally unscoped.

## POS terminal devices

The plugin contributes the `pos-terminal` device type. Its configure form
(rendered by the host inside the host's device form) collects **`client_id`**
and **`store_id`**, both required — the form intercepts the host form's `submit`
in the capture phase and blocks it with a toast if either is empty. The
show-page card displays the same two values.

Only devices with `care_type: "pos-terminal"` can be linked, and the picker
additionally drops any device whose `status` is not `"active"` — a client-side
filter over the search results, not a query parameter.

Terminals are managed in their own step of the configuration sheet ("Manage
terminals") and **saved independently of the configuration form**:

|                       | Where it goes                                                                                                                | When                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Config already exists | `PATCH /pinelabs_config/{id}/pos-terminals/` with the full `pos_terminals` list — what you send replaces what is stored | Immediately, when you press**Save** in the terminals step. The config form's own Save is not involved. |
| No config yet         | Staged in component state                                                                                                    | Linked with the same call right after the config is created                                                  |

The terminals step keeps a draft list against the saved list: **Save** is
disabled until they differ, and **Back** discards the draft. The list shown in
the form step reflects what is saved on the server (`?mine=false`, i.e. all
terminals of the config), not the draft.

## i18n

Translations live in `public/locale/en.json`. Every component calls
`useTranslation(I18NNAMESPACE)`, so the namespace is the literal
`care_pinelabs_fe`.

care_fe resolves a plugin's namespace as `meta.name ?? slug`, which is why the
configuration above sets `"name": "care_pinelabs_fe"`. **Setting `meta.name` to
anything other than `care_pinelabs_fe` silently breaks every label in the
plugin** — keys render as raw strings. Omitting `name` is equally safe, because
the slug is the same string.

## File map

| File                                                                | Role                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/manifest.ts`                                                 | Registers the override, slots, device type, nav item and routes; installs the bridge spy via its first import |
| `src/routes.tsx`                                                  | Transactions, payment and configuration routes                                                                |
| `src/lib/constants.ts`                                            | Slug, i18n namespace, page size, the two env-driven expiry constants                                          |
| `src/types/plugin.ts`                                             | `PlugConfigMeta` (incl. the three `config` flags) + `window.__CARE_PLUGIN_RUNTIME__`                    |
| `src/types/pinelabs_config.ts`                                    | `PinelabsConfig` read/create/update shapes                                                                  |
| `src/pages/PinelabsConfigurePage.tsx`                             | Per-facility configuration sheet; the only reader of`meta.config`                                           |
| `src/pages/PineLabsPaymentPage.tsx`                               | Dedicated invoice payment route; auto-opens`PaymentSheet`                                                   |
| `src/pages/TransactionsPage.tsx`                                  | Transactions listing; owns the URL filter state                                                               |
| `src/components/overrides/PaymentReconciliationSheetOverride.tsx` | Flow decision + the`mode` URL param                                                                         |
| `src/components/overrides/ManualPaymentSheet.tsx`                 | Hand-off point to the next plugin's sheet, behind an error boundary                                           |
| `src/components/overrides/SwitchToPinelabsButton.tsx`             | Portal-injected "back to Pinelabs" button                                                                     |
| `src/components/payment/PaymentSheet.tsx`                         | Invoice payment: method, terminal, location, partial amount, polling                                          |
| `src/components/payment/PineLabsAccountPayment.tsx`               | Account / advance payment, same shape with a free-entry amount                                                |
| `src/components/payment/PaymentDialog.tsx`                        | In-progress / success / failure / timed-out views, cancel action                                              |
| `src/components/payment/TerminalSelect.tsx`                       | Terminal picker with the "My terminals" / "All terminals" toggle                                              |
| `src/components/payment/LocationPicker.tsx`                       | Location picker used when the terminal has no current location                                                |
| `src/components/pluggables/*`                                     | The additive slot components and the device configure form / show card                                        |
| `src/components/transactions/*`                                   | Listing table, filters, sort, details sheet                                                                   |
| `src/hooks/usePaymentReconciliationStatus.ts`                     | Status polling loop (intervals and the 7-minute cap)                                                          |
| `src/lib/paymentMethods.ts`                                       | Care method ↔ Plutus mode labels, icons, validators                                                          |
| `src/lib/pinelabsMetaConfig.ts`                                   | Which`meta` fields the transaction details sheet shows                                                      |
| `src/lib/terminalSession.ts`                                      | `sessionStorage` for the last used terminal                                                                 |
| `src/lib/paymentRedirect.ts`                                      | The`sourceUrl` → appointment print redirect                                                                |
| `src/lib/errors.ts`                                               | Maps the backend's`{errors:[{type,msg}]}` envelope to friendly strings                                      |
| `src/apis/`                                                       | Endpoint definitions,`fetch` wrapper, `APIError`                                                          |

## Gotchas

- **A new config saves `true` for switches that render as off.** The create form
  has no default value for `allow_advance_payment`, `allow_partial_payment` or
  `meta.allow_manual_entry`, so the `Switch` renders unchecked
  (`checked={field.value ?? false}`) while submit sends `?? true`. Leaving a
  visible switch alone therefore saves it **on**.
- **`meta.config` flags are not behaviour flags.** They only show or hide form
- fields. Turning `allow_partial_payment` on in `PlugConfig` does not enable
  partial payments anywhere — the facility's `PinelabsConfig` row does.
- **Terminals and the rest of the configuration save separately.** On an
  existing config, pressing Save in the terminals step writes immediately, even
  if you then abandon the configuration form; conversely, saving the form never
  touches the terminal list. On a *new* config the two calls are chained
  (create, then link) — if the link call fails, the config exists with no
  terminals and you have to re-link them.
- **The "Collect via Pinelabs terminal" menu entry is never gated.** It is a
  pluggable slot with no config check, so it appears even for facilities with no
  `PinelabsConfig`; clicking it lands on a payment page that cannot load a
  config.
- **Deleting all payment-method mappings is possible via the API**,
  and both sheets then dead-end with a toast. The form's "at least one default"
  check is client-side only.

## Debugging checklist

| Symptom                                                                | Look at                                                                                                                                                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Pine Labs sheet never opens                                        | The facility's`PinelabsConfig`: does a row exist, and is `default_payment_flow` `"pinelabs"`? For account payments, also `allow_advance_payment`                |
| Advance / partial / manual-entry switches missing from the config page | `window.__CARE_PLUGIN_RUNTIME__.meta.care_pinelabs_fe.config` — are the keys unquoted JSON `true`? Did the page reload?                                            |
| No "Switch to manual entry" inside the Pine Labs sheet                 | `meta.allow_manual_entry` on the facility row is falsy                                                                                                                |
| "Switch to Pinelabs" button missing from the native sheet              | The button mounts into`[data-slot="sheet-description"]` — is that node in the DOM? Is a `PinelabsConfig` present (and `allow_advance_payment` on, for accounts)? |
| Care's native sheet shows instead of another plugin's                  | Console`[pinelabs]` warnings, then `window.__careOverrides.addComponent.__pinelabs_spy__`                                                                           |
| Tendered-amount input missing                                          | `allow_partial_payment` on the facility row; remember it reads as `false` when absent                                                                               |
| Terminal list empty or "failed to load terminals"                      | Linked`pos_terminals`, device `status: "active"`, and the "My terminals" / "All terminals" toggle                                                                   |
| Terminal changes did not stick                                         | The terminals step has its own Save (`PATCH .../pos-terminals/`); saving the configuration form does not write them                                                   |
| A device never appears in the terminal picker                          | `care_type` must be `pos-terminal` and `status` `active`; devices already in the draft list are hidden                                                          |
| Payment stays "in progress" then times out                             | Polling caps at 7 minutes; check the backend's Plutus polling and the transaction in the listing                                                                        |
| All labels render as raw keys (`pinelabs_transactions`)              | i18n namespace — is`meta.name` set to something other than the slug? Is `/locale/en.json` reachable at the `meta.url` origin?                                    |
| Transactions list looks empty                                          | The default filters: status`completed` and created-by *you.* Clear filters and check                                                                               |
| Requests 404 or 401                                                    | The`care_pinelabs` backend plug, `window.__CORE_ENV__.apiUrl`, and the `care_access_token` in `localStorage`                                                    |
| Nothing from the plugin renders at all                                 | `window.__CARE_PLUGIN_RUNTIME__.meta.care_pinelabs_fe` in the console; then the `meta.url` remote entry                                                             |

## Development

```sh
npm install
npm run start   # vite build --watch + preview on :5173
npm run build   # builds the remote entry into dist/
```
