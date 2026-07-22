// const rootUrl = 'https://helpforfarmer.onrender.com';
const rootUrl = '';


const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
let isOtpVerified = false;

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert ${type}`;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.classList.add('hide');
        setTimeout(() => {
            document.body.removeChild(alertDiv);
        }, 500);
    }, 5000);
}

registerBtn.addEventListener('click', (event) => {
    event.preventDefault();
    container.classList.add("active");
});

loginBtn.addEventListener('click', (event) => {
    event.preventDefault();
    container.classList.remove("active");
});

document.addEventListener("DOMContentLoaded", function() {
    const sendOtpBtn = document.getElementById("sendOtp");
    const verifyOtpBtn = document.getElementById("verifyOtp");
    const emailInput = document.getElementById("email");
    const otpInput = document.getElementById("otp");
    const nameInput = document.getElementById("name");
    const signUpBtn = document.querySelector('.sign-up button:not(#sendOtp):not(#verifyOtp)');
    const signInBtn = document.querySelector('.sign-in button');
    const signInEmail = document.querySelector('.sign-in input[type="email"]');
    const signInPassword = document.querySelector('.sign-in input[type="password"]');
    const signUpPassword = document.querySelector('.sign-up input[type="password"]');
    const signUpForm = document.querySelector('.sign-up form');
    const signInForm = document.querySelector('.sign-in form');
    const resetPasswordLink = document.querySelector('.reset-password');

    signUpForm.addEventListener('submit', (e) => e.preventDefault());
    signInForm.addEventListener('submit', (e) => e.preventDefault());

    signUpBtn.type = 'button';
    signInBtn.type = 'button';

    sendOtpBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        const email = emailInput.value.trim();
        const name = nameInput.value.trim();

        if (!email || !name) {
            showAlert("Please enter your name and email.");
            return;
        }
        try {
            // LINK HERE
            // const response = await fetch('/send-otp', {
            const response = await fetch(`${rootUrl}/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email, name: name })
            });

            const result = await response.json();
            console.log("Server response:", result);

            if (response.ok) {
                verifyOtpBtn.classList.remove("white-btn");
                showAlert(result.message, "success");
            } else {
                showAlert(result.error, "error");
            }
        } catch (error) {
            console.error("Error sending OTP:", error);
            showAlert("An error occurred while sending OTP", "error");
        }
    });

    verifyOtpBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        const email = emailInput.value.trim();
        const otp = otpInput.value.trim();
        if (!email || !otp) {
            showAlert("Please enter both email and OTP", "warning");
            return;
        }

        try {
            // LINK HERE
            // const response = await fetch('/verify-otp', {
            const response = await fetch(`${rootUrl}/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email, otp: otp })
            });

            const result = await response.json();
            // console.log("Server response:", result);
            
            if (response.ok) {
                isOtpVerified = true;
                otpInput.disabled = true;
                otpInput.type = "password";
                verifyOtpBtn.classList.add("white-btn");
                sendOtpBtn.classList.add("white-btn");
                signUpBtn.classList.remove("white-btn");

                showAlert(result.message, "success");
            } 
            else {
                showAlert(result.error, "error");
            }
        } catch (error) {
            console.error("Error verifying OTP:", error);
            showAlert("An error occurred while verifying OTP", "error");
        }
    });

    signUpBtn.addEventListener("click", async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = signUpPassword.value;
        const name = nameInput.value.trim();
        const otp = otpInput.value.trim();

        if (!email || !password || !name || !otp) {
            showAlert("Please fill in all fields and verify OTP", "warning");
            return;
        }

        if (!isOtpVerified) {
            showAlert("Please verify your OTP first", "warning");
            return;
        }

        try {
            // LINK HERE
            const response = await fetch(`${rootUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, password, otp })
            });

            const result = await response.json();

            if (response.ok) {
                showAlert("Registration successful!", "success");

                // Reuse existing sign-in logic
                signInEmail.value = email;
                signInPassword.value = password;
                signInBtn.click();  // triggers the existing signInBtn listener
            } else {
                showAlert(result.error || "Registration failed", "error");
            }

        } catch (error) {
            console.error("Error during registration:", error);
            showAlert("An error occurred during registration", "error");
        }
    });
    
    signInBtn.addEventListener("click", (event) => {
        event.preventDefault();
        const email = signInEmail.value.trim();
        const password = signInPassword.value;

        if (!email || !password) {
            showAlert("Please fill in all fields", "warning");
            return;
        }

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                console.log("Sign-in successful, user:", user);
                showAlert("Sign in successful!", "success");
                // LINK HERE
                // window.location.href = "/home";
                window.location.href = `${rootUrl}/home`;
            })
            .catch((error) => {
                const messages = {
                    'auth/invalid-email': "Invalid email format.",
                    'auth/user-disabled': "Account disabled.",
                    'auth/user-not-found': "No user found with this email.",
                    'auth/wrong-password': "Incorrect password.",
                    'auth/invalid-login-credentials': "Invalid credentials."
                };
                const parsed = JSON.parse(error.message);
                showAlert("Sign-in failed: " + parsed.error.message, "error");

            });
    });

    if (resetPasswordLink) {
        resetPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = signInEmail.value.trim();
            
            if (!email) {
                showAlert("Please enter your email address first", "warning");
                return;
            }

            firebase.auth().sendPasswordResetEmail(email)
                .then(() => {
                    showAlert("Password reset email sent! Please check your inbox.", "success");
                })
                .catch((error) => {
                    const messages = {
                        'auth/invalid-email': "Please enter a valid email address.",
                        'auth/user-not-found': "No account found with this email address.",
                        'auth/too-many-requests': "Too many attempts. Please try again later."
                    };
                    showAlert(messages[error.code] || "Error sending reset email: " + error.message, "error");
                });
        });
    }


    document.querySelectorAll(".toggle-password").forEach(icon => {
        icon.addEventListener("click", function () {

            const input = document.getElementById(this.dataset.target);

            if (input.type === "password") {
                input.type = "text";
                this.classList.replace("fa-eye", "fa-eye-slash");
            } else {
                input.type = "password";
                this.classList.replace("fa-eye-slash", "fa-eye");
            }
        });
    });


    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            setTimeout(() => {
                // LINK HERE
                // window.location.href = "/home";
                window.location.href = `${rootUrl}/home`;
            }, 1000);
        }
    });
});