// Copy this file to firebase-config.js and fill in your Firebase project details
// See https://firebase.google.com/docs/web/setup
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    if (firebase.analytics) {
        try { firebase.analytics(); } catch (e) {}
    }
}
