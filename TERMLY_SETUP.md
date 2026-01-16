# Termly & Google Tag Manager Setup

## Environment Variables

To use the Termly API for backend cookie management, you need to create a `.env` file in the root directory with the following:

```env
TERMLY_API_KEY=eyJhbGciOiJIUzI1NiJ9.InEyWi9CYVhBTzlmUmRVU3VUZSt6MllmdmdxR2J3SDhncmJtemV5VnJwRnFKNnpCVmlYajdDS21GRzF0L1ZkU0lCMjhyWWhBRW1vSUJrMm9hOVBLVGszQnBlWlB0a2JsNUR5Y0JEbzQ5NjNJK2FWYXozN1pPL2h0SjVkK2hVNWhnYkE1VW5JSFpzbDZrMlpQTk1LNm9TSW89LS1BdWE5WUlMMkRLaXVwbTduLS02ZFZDRzlVRXFYbGlKZk1BRkFlKytRPT0i.isNJXVcfVN9hsG_NRYYEW4CRPw02hcweaOfenvCIz3w
```

**Note:** The `.env` file is already in `.gitignore` and will not be committed to the repository.

## What's Installed

### Google Tag Manager (GTM)
- Container ID: `GTM-WZVND7H`
- Script added to `<head>` section of BaseLayout
- Noscript fallback added to `<body>` section
- AdSense can be configured through GTM tags

### Termly Consent Management
- Consent banner script added to `<head>` section
- Preference center link added to footer (all pages)
- API key utility created at `src/utils/termly.ts`

## Usage

To use the Termly API key in your backend code:

```typescript
import { getTermlyApiKey } from '../utils/termly';

const apiKey = getTermlyApiKey();
// Use apiKey to retrieve cookie whitelist from Termly API
```
