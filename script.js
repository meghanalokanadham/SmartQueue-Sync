
// =====================================
// 1. API URLS
// =====================================

const API_URL =
    "https://cjntrc536b.execute-api.ap-south-1.amazonaws.com/prod/tokens";

const STATUS_API_URL =
    "https://cjntrc536b.execute-api.ap-south-1.amazonaws.com/prod/status";
// =====================================
// COGNITO CONFIGURATION
// =====================================

const COGNITO_REGION = "ap-south-1";

const USER_POOL_ID = "ap-south-1_FxuWpAYPw";

const CLIENT_ID = "4v6icf7a4u6a5mqsm03ac11jpj";

const COGNITO_DOMAIN =
    "https://ap-south-1fxuwpaypw.auth.ap-south-1.amazoncognito.com";

const REDIRECT_URI =
    "https://main.d317uughpfyxnc.amplifyapp.com/";
    async function handleCognitoLogin() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) return;

    try {
        const response = await fetch(
            `${COGNITO_DOMAIN}/oauth2/token`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    client_id: CLIENT_ID,
                    code: code,
                    redirect_uri: REDIRECT_URI
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error_description || data.error || "Token exchange failed");
        }

        sessionStorage.setItem("cognito_id_token", data.id_token);

        window.history.replaceState({}, document.title, REDIRECT_URI);

        console.log("Cognito login successful");
    } catch (error) {
        console.error("Cognito login error:", error);
    }
}

handleCognitoLogin();
    // =====================================
// COGNITO ACCESS TOKEN
// =====================================

function getAccessToken() {
    const key = `CognitoIdentityServiceProvider.${CLIENT_ID}.LastAuthUser`;

    const username = localStorage.getItem(key);

    if (!username) {
        return null;
    }

    const tokenKey =
        `CognitoIdentityServiceProvider.${CLIENT_ID}.${username}.accessToken`;

    return localStorage.getItem(tokenKey);
}


// =====================================
// 2. TOKEN GENERATION
// =====================================

const generateBtn = document.getElementById("generateBtn");

generateBtn.addEventListener("click", async function () {

    const customerName =
        document.getElementById("customerName").value.trim();

    const phoneNumber =
        document.getElementById("customerPhone").value.trim();

    const email =
        document.getElementById("customerEmail").value.trim();

    // Validate patient details
    if (customerName === "" || phoneNumber === "" || email === "") {
        alert("Please enter all patient details!");
        return;
    }

    // Validate phone number
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
        alert("Please enter a valid 10-digit phone number!");
        return;
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("Please enter a valid email address!");
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "Generating...";

    try {

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                customerName: customerName,
                phoneNumber: phoneNumber,
                email: email,
                registrationType: "Online"
            })
        });

        const data = await response.json();

        console.log("Token API Response:", data);

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to generate token"
            );
        }

        document.getElementById("result").style.display = "block";

        document.getElementById("tokenNumber").textContent =
            "Your Token: " + data.tokenNumber;

        document.getElementById("message").textContent =
            data.message;

        document.getElementById("status").textContent =
            "Status: " + data.status;

        // Refresh queue status
        loadQueueStatus();

    } catch (error) {

        alert("Error: " + error.message);
        console.error("Token Generation Error:", error);

    } finally {

        generateBtn.disabled = false;
        generateBtn.textContent = "Generate Token →";

    }

});



// =====================================
// 3. LIVE QUEUE STATUS
// =====================================

async function loadQueueStatus() {

    try {

        const response = await fetch(STATUS_API_URL);

        const responseText = await response.text();

        console.log("API Status:", response.status);
        console.log("Raw API Response:", responseText);

        if (!response.ok) {
            throw new Error("Unable to fetch queue status");
        }

        /*let data = JSON.parse(responseText);

        // Handle Lambda proxy response if necessary
        if (data.body) {
            data = typeof data.body === "string"
                ? JSON.parse(data.body)
                : data.body;
        }*/
 let data = JSON.parse(responseText);

if (data.body) {
    data = typeof data.body === "string"
        ? JSON.parse(data.body)
        : data.body;
}



        console.log("Final Queue Data:", data);

       document.getElementById("totalWaiting").textContent =
    data.totalWaiting ?? 0;

document.getElementById("currentServing").textContent =
    data.currentServing ?? "None";

currentServingTokenId = data.currentServingTokenId ?? null;
console.log("Current Serving Data:", data.currentServing, data.currentServingTokenId);
        const waitingList =
            document.getElementById("waitingTokens");

        waitingList.innerHTML = "";

        const tokens = Array.isArray(data.waitingTokens)
            ? data.waitingTokens
            : [];

const waitingDetails = Array.isArray(data.waitingDetails)
    ? data.waitingDetails
    : [];

waitingList.innerHTML = "";

waitingDetails.forEach(function (patient) {

    const li = document.createElement("li");

    li.innerHTML = `
        <span>${patient.tokenNumber}</span>
        <span class="waiting-time">
            ⏱ ${patient.estimatedWaitingTime} min
        </span>
    `;

    waitingList.appendChild(li);

});

    } catch (error) {

        console.error("Queue Status Error:", error);

    }

}


// =====================================
// 4. REFRESH STATUS BUTTON
// =====================================

const refreshBtn = document.getElementById("refreshBtn");

refreshBtn.addEventListener("click", loadQueueStatus);


// =====================================
// 5. INITIAL PAGE LOAD
// =====================================

// Load queue status when the page opens
loadQueueStatus();
// =====================================
// 6. ADMIN DASHBOARD
// =====================================

const ADMIN_API_URL =
    "https://cjntrc536b.execute-api.ap-south-1.amazonaws.com/prod/admin";

let currentServingTokenId = null;


// Call Next Button
document.getElementById("callNextBtn").addEventListener("click", async function () {

    await adminAction("CALL_NEXT");

});


// Complete Button
document.getElementById("completeBtn").addEventListener("click", async function () {

    if (!currentServingTokenId) {
        alert("No serving token available!");
        return;
    }

    await adminAction("COMPLETE", currentServingTokenId);

});


// Skip Button
document.getElementById("skipBtn").addEventListener("click", async function () {

    if (!currentServingTokenId) {
        alert("No serving token available!");
        return;
    }

    await adminAction("SKIP", currentServingTokenId);

});


// Admin API Function
async function adminAction(action, tokenId = null) {

    try {

       const  response = await fetch(ADMIN_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action: action,
                tokenId: tokenId
            })
        });

       // const data = await response.json();
let data = await response.json();

if (data.body) {
    data = typeof data.body === "string"
        ? JSON.parse(data.body)
        : data.body;
}
        console.log("Admin API Response:", data);

        if (!response.ok) {
            throw new Error(data.message || "Admin action failed");
        }

        currentServingTokenId = action === "CALL_NEXT"
            ? data.tokenId
            : null;

        document.getElementById("adminMessage").textContent =
            data.message + " | Status: " + data.status;

        loadQueueStatus();

    } catch (error) {

        console.error("Admin Error:", error);

        document.getElementById("adminMessage").textContent =
            error.message;

    }

}
// =====================================
// 7. AUTOMATIC QUEUE REFRESH
// =====================================

// Refresh queue status every 5 seconds
setInterval(function () {
    loadQueueStatus();
}, 5000);

// =====================================
// 8. WALK-IN PATIENT REGISTRATION
// =====================================

const walkinBtn = document.getElementById("walkinGenerateBtn");

walkinBtn.addEventListener("click", async function () {

    const patientName =
        document.getElementById("walkinName").value.trim();

    const phoneNumber =
        document.getElementById("walkinPhone").value.trim();

    if (patientName === "" || phoneNumber === "") {
        alert("Please enter patient name and phone number!");
        return;
    }

    if (!/^[0-9]{10}$/.test(phoneNumber)) {
        alert("Please enter a valid 10-digit phone number!");
        return;
    }

    walkinBtn.disabled = true;
    walkinBtn.textContent = "Generating...";

    try {

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                customerName: patientName,
                phoneNumber: phoneNumber,
                registrationType: "Walk-in"
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Token generation failed");
        }

        document.getElementById("walkinResult").style.display = "block";

        document.getElementById("walkinTokenNumber").textContent =
            "Your Token: " + data.tokenNumber;

        document.getElementById("walkinMessage").textContent =
            data.message;

        document.getElementById("walkinStatus").textContent =
            "Status: " + data.status;

        loadQueueStatus();

    } catch (error) {

        alert("Error: " + error.message);
        console.error("Walk-in Error:", error);

    } finally {

        walkinBtn.disabled = false;
        walkinBtn.textContent = "Generate Walk-in Token →";

    }

});
