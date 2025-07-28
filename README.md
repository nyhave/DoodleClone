# DoodleClone

A minimal Doodle-like polling app built with HTML, CSS and JavaScript. Polls are stored in `localStorage` and optionally synced to Firebase so links work across devices. The app can be deployed as a static site using GitHub Pages.

## Development

Open `index.html` in a browser to test locally. Creating a poll generates a shareable link with a unique identifier in the URL.

Polls now support optional multiple selections and can be finalized once a consensus is reached. Options are entered with date/time pickers so each value is stored in ISO format with time zone support. After voting, results are displayed with small bars showing the relative popularity of each option.

Additional features include optional poll deadlines with local reminder notifications, participant management with editable votes, a selectable time zone for display, improved accessibility with ARIA alerts and keyboard shortcuts, a dark mode toggle, and a sticky "Add Option" button on mobile screens. Polls sync across devices through Firebase with real-time updates, and participants can leave comments on each poll.

If a shared link is opened on a different device and the poll does not exist locally, a clearer message is displayed explaining that the poll may have expired or been created elsewhere.

The mobile layout has been tweaked so form controls and buttons span the available width on small screens.

You can also run `jekyll build` to produce the `_site` directory and preview the site exactly as it will appear on GitHub Pages.

## Deployment

Push changes to the `main` branch. GitHub Actions will automatically deploy the contents of the repository to GitHub Pages.

## Testing

Unit tests use Jest. Install dependencies and run:

```bash
npm install
npm test
```

## Offline Support

The site registers a service worker to cache assets so existing polls can be viewed without a network connection.
