# Ceejay frontend

This React application uses Create React App (`react-scripts`).

## Development

```sh
npm install
npm start
```

The development server opens at `http://localhost:3000` by default.

## Tests and production build

```sh
npm test
npm run build
```

The production build is written to `build/`.

The local `.env.example` points to the Ceejay API at `http://localhost:5001`. To use another backend, set `REACT_APP_API_BASE_URL` or `REACT_APP_API_URL` before starting or building. Keep MongoDB credentials in the backend's `atlas-credentials.env`; frontend environment values are public in the browser bundle.

The theme control starts in dark mode for a new visitor and remembers the selected theme in browser storage.

Signed-in viewers can like posts, reply to comments, and save posts to a personal Favorites feed. Likes and favorites are stored per account in MongoDB; post views are recorded when a detail is opened.

## Frontend structure

- `src/models/ceejayModel.js` owns API requests and persisted session data.
- `src/controllers/useCeejayController.js` coordinates feed, account, and creator actions.
- `src/pages/CeejayPage.jsx` composes the main feed and page layout.
- `src/components/` contains the avatar, post, dashboard, and modal views.

To show Ceejay's profile photo, place the image in `public/` and set `REACT_APP_CREATOR_PROFILE_IMAGE` to its public path, such as `/ceejay-profile.jpg`.
