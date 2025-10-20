# Review Tool Demo

A simple single-page review intake flow. Visitors rate their experience, and:

- 5-star reviewers are immediately forwarded to your Google review link.
- 1–4 star ratings reveal an optional form where visitors can leave contact details and comments that are stored privately in a Google Sheet you control.

The project is intentionally lightweight (plain HTML/CSS/JS) so you can deploy it anywhere.

## Quick start

1. Update `config.js` with your business information (details below).
2. Run a simple local server (for example `npx serve .`) and open the provided URL in your browser—this gives the Google Maps script a valid origin for your API key.
3. When you are ready to go live, upload the files to any static hosting provider (Netlify, Vercel, GitHub Pages, etc.).

## Configure the app

Edit `config.js` and replace the placeholder values:

```js
window.REVIEW_TOOL_CONFIG = {
  businessName: "Your Business Name",
  businessCategory: "Retail",
  googleMapsUrl: "https://www.google.com/maps/place/your-business",
  googlePlaceId: "ChIJxxxxxxxxxxxxxxxxxxxx",

  // Optional overrides
  googleReviewBaseUrl: "https://search.google.com/local/writereview?placeid=",
  googleReviewUrl: "",
  customReviewPrompts: [
    "Share how the latte art or specialty drinks made your visit memorable.",
    "Mention the cozy seating or playlist that keeps you coming back.",
    "Talk about the friendly staff and how they made your day."
  ],

  // Google Apps Script endpoint for storing internal feedback (see below).
  sheetScriptUrl: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
};
```

- `businessName`, `businessCategory`: Displayed on the review page and attached to internal feedback rows.
- `googleMapsUrl`: For your reference (used only in admin tooling—safe to leave blank on the public page).
- `googlePlaceId`: Required so 5-star reviewers go straight to Google. Paste it from Google’s Place ID Finder or the setup tool output.
- `googleReviewUrl`: Optional override if you prefer to paste the full review link yourself.
- `googleReviewBaseUrl`: Only adjust if Google changes their review link structure.
- `customReviewPrompts`: Optional. Otherwise, category-aware defaults are generated automatically.
- `sheetScriptUrl`: The web app URL of your Google Apps Script (instructions below) that writes submissions into a Sheet.

If the Sheet URL is not set yet, the page still accepts reviews but logs them to the browser console so you can confirm the payload.

## Set up Google Sheets logging

1. Create a new Google Sheet and add the following header row in the first sheet (adjust as needed):
   ```
   submittedAt	name	email	rating	comments	businessName	businessCategory	placeId	mapUrl
   ```
2. With the sheet open, click **Extensions → Apps Script**.
3. Replace the default script with the snippet below and save the project.
4. Click **Deploy → Test deployments → Select type: Web app**, then choose **Me** as the executing account, **Anyone** or **Anyone with the link** as “Who has access”, and deploy.
5. Copy the “Web app URL” and paste it into `sheetScriptUrl` in `config.js`.

### Apps Script snippet

```js
const SHEET_NAME = "Sheet1";

function doPost(request) {
  try {
    const {
      comments,
      email,
      name,
      rating,
      submittedAt,
      businessName,
      businessCategory,
      placeId,
      mapUrl
    } = JSON.parse(request.postData.contents);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    sheet.appendRow([
      submittedAt || new Date().toISOString(),
      name || "",
      email || "",
      rating || "",
      comments || "",
      businessName || "",
      businessCategory || "",
      placeId || "",
      mapUrl || ""
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: error.message })
    )
      .setMimeType(ContentService.MimeType.JSON)
      .setResponseCode(500);
  }
}
```

> If you use a different sheet name, update the `SHEET_NAME` constant accordingly.

## Customization ideas

- Swap in your own branding by editing `styles.css`.
- Add fields (phone number, visit date, etc.) by updating both `index.html` and `app.js`.
- Send yourself email or SMS alerts by extending the Apps Script to trigger additional services.

## Testing the flow

1. Open `index.html` in your browser.
2. Click 5 stars → the Google Reviews form opens in a new tab and the page reveals copy-ready review prompts. (Pop-up blockers may require you to click the button manually.)
3. Click 1–4 stars, optionally add details, and submit → check your Google Sheet for the new row.

Enjoy the streamlined review collection process!

## Admin Setup Tool (optional but recommended)

Use `setup.html` to resolve Place ID, name, and category from a Google Maps URL (one-time per business).

- Start a local server (`npx serve .`) and open `/setup.html`.
- Paste the full Google Maps URL and a Places API key (enable Maps JavaScript API + Places API; restrict it to your setup origin).
- Click “Resolve Place Info”. The tool will:
  - Parse the URL for name/coordinates
  - Load the new Places JS library (v=beta)
  - Search via `Place.searchByText` (with location bias) and `Place.searchNearby` fallback
  - Fetch fields with `place.fetchFields`
- Copy the generated config snippet and paste into `config.js` for the live page. After that, your public page does not need to call Places at runtime; it just uses the saved `googlePlaceId` to build the review URL.
