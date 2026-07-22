// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBEPh61ad4j9qogxH457h79NE9AQJD_tUo",
    authDomain: "helpforfarmer-c717e.firebaseapp.com",
    projectId: "helpforfarmer-c717e",
    storageBucket: "helpforfarmer-c717e.firebasestorage.app",
    messagingSenderId: "645087836594",
    appId: "1:645087836594:web:ce04cb38c529d5fe7d8cab",
    measurementId: "G-MSVG3D5XTD"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

// Initialize Firebase Authentication and make it available globally
const auth = firebase.auth();
window.auth = auth;

// Set persistence to LOCAL to maintain session
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log("Auth persistence set to LOCAL");
    })
    .catch((error) => {
        console.error("Error setting auth persistence:", error);
    });

// Debug initialization
console.log("Firebase initialized successfully");
console.log("Auth object:", auth); 


