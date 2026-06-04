// Define the cusrefreshCaptcha function outside window.onload to ensure it's accessible globally
function cusgenerateCaptcha() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let captcha = '';
    for (let i = 0; i < 4; i++) {
        captcha += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return captcha;
}

function cusdisplayCaptcha(captcha) {
    const captchaDisplay = document.getElementById('cuscaptchaDisplay');
    captchaDisplay.innerHTML = ''; // Clear existing CAPTCHA

    // Apply styles to each character
    for (let char of captcha) {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.color = `hsl(${Math.random() * 360}, 100%, 50%)`; // Random color
        span.style.transform = `rotate(${Math.random() * 30 - 15}deg)`; // Random rotation
        captchaDisplay.appendChild(span);
    }
}

// Function to refresh the CAPTCHA
function cusrefreshCaptcha() {
    captchaCode = cusgenerateCaptcha();
    cusdisplayCaptcha(captchaCode);
}

// Initialize the CAPTCHA when the page loads
window.onload = function () {
    setTimeout(() => {
        const popup = document.getElementById('enquiryPopup');
        popup.style.display = 'block'; // Ensure the element is in the flow
        requestAnimationFrame(() => popup.classList.add('show')); // Add the 'show' class for the transition

        emailjs.init("Zw8ZSYnTyioHUEjVD"); // Initialize EmailJS

        // Set initial CAPTCHA
        let captchaCode = cusgenerateCaptcha();
        cusdisplayCaptcha(captchaCode);

        // Handle form submission
        document.getElementById('cusenquiryForm').addEventListener('submit', function (event) {
            event.preventDefault();
            const captchaInput = document.getElementById('cuscaptchaInput').value;

            // Check if CAPTCHA matches
            if (captchaInput !== captchaCode) {
                swal("Error!", "Incorrect CAPTCHA. Please try again.", "error");
                cusrefreshCaptcha();  // Regenerate new CAPTCHA
                return; // Stop form submission if CAPTCHA fails
            }

            // Get the form data
            const name = document.getElementById('cusname').value;
            const email = document.getElementById('cusemail').value;
            const phone = document.getElementById('cusphone').value;
            const state = document.getElementById('cusstate').value;
            const products = document.getElementById('cusproducts').value;
            const requirements = document.getElementById('cusrequirements').value;

            // Send email using EmailJS
            emailjs.send("service_qny0n9u", "template_imgvmno", {
                name: name,
                email: email,
                phone: phone,
                state: state,
                products: products,
                requirements: requirements
            })
                .then(function (response) {
                    swal("Success!", "Your enquiry has been sent successfully!", "success");
                    document.getElementById('cusenquiryForm').reset();
                    cusrefreshCaptcha();  // Regenerate new CAPTCHA
                }, function (error) {
                    swal("Error!", "Failed to send enquiry. Please try again.", "error");
                });
        });
    }, 5000);
};
function closeEnquiryPopup() {
    document.getElementById('enquiryPopup').style.display = 'none';
}
