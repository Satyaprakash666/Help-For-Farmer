// Firebase configuration
const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
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
