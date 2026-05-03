// Function to handle Google Login Response
function handleCredentialResponse(response) {
    fetch('/api/auth/google', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // 2. Redirect the user to the Geoflix dashboard
            window.location.href = '/dashboard.html';
        } else {
            alert("Login failed. Please try again.");
        }
    })
    .catch(err => console.error("Error during auth:", err));
}

// Watering Feature Logic
const googleBtnWrapper = document.getElementById('google-btn-wrapper');
const treeSidebar = document.querySelector('.tree-sidebar');

// When user hovers over the Google Button area
googleBtnWrapper.addEventListener('mouseenter', () => {
    treeSidebar.classList.add('is-watering');
});

// When mouse leaves the Google Button area
googleBtnWrapper.addEventListener('mouseleave', () => {
    treeSidebar.classList.remove('is-watering');
});