// Replace with your Firebase project configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
};

if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
}
