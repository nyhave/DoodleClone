# DoodleClone

A minimal Doodle-like polling app built with HTML, CSS and JavaScript. Polls are kept in each browser's `localStorage` so links only work on the device where they were created. The app can be deployed as a static site using GitHub Pages.

## Development

Open `index.html` in a browser to test locally. Creating a poll generates a shareable link with a unique identifier in the URL.

Polls now support optional multiple selections and can be finalized once a consensus is reached. If a shared link is opened on a different device and the poll does not exist locally, a message will be shown.

You can also run `jekyll build` to produce the `_site` directory and preview the site exactly as it will appear on GitHub Pages.

## Deployment

Push changes to the `main` branch. GitHub Actions will automatically deploy the contents of the repository to GitHub Pages.
