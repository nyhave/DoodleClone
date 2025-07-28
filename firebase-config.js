// Firebase configuration for the developer project
// See https://firebase.google.com/docs/web/setup
const firebaseConfig = {
    apiKey: "AIzaSyBxxmjBahtSSDj2MuxuX4o2v7ujPyvsHVQ",
    authDomain: "doodleclone-62042.firebaseapp.com",
    projectId: "doodleclone-62042",
    storageBucket: "doodleclone-62042.firebasestorage.app",
    messagingSenderId: "897044750947",
    appId: "1:897044750947:web:33a1831c8c9e63e10f0e56",
    measurementId: "G-H7F61E2S4J"
};

if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    if (firebase.analytics) {
        try { firebase.analytics(); } catch (e) {}
    }
}
