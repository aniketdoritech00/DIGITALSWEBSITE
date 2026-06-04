window.onload = function() {
    // Set initial CAPTCHA when the page is loaded
    let captchaCode = progenerateCaptcha();
    prodisplayCaptcha(captchaCode);
};

(function () {
    emailjs.init("MiG8tvgy4FXscx4x3");
})();

function progenerateCaptcha() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let captcha = '';
    for (let i = 0; i < 4; i++) {
        captcha += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return captcha;
}

function prodisplayCaptcha(captcha) {
    const captchaDisplay = document.getElementById('procaptchaDisplay');
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

// // Set initial CAPTCHA
// let captchaCode = progenerateCaptcha();
// prodisplayCaptcha(captchaCode);

function prorefreshCaptcha() {
    captchaCode = progenerateCaptcha();
    prodisplayCaptcha(captchaCode);
}

document.getElementById('proenquiryForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const captchaInput = document.getElementById('procaptchaInput').value;

    // Check if CAPTCHA matches
    if (captchaInput !== captchaCode) {
        swal("Error!", "Incorrect CAPTCHA. Please try again.", "error");
        //prorefreshCaptcha();  // Regenerate new CAPTCHA
        return; // Stop the form submission if CAPTCHA fails
    }


    // Get the form data
    const name = document.getElementById('proname').value;
    const email = document.getElementById('proemail').value;
    const phone = document.getElementById('prophone').value;
    const state = document.getElementById('prostate').value;
    const products = document.getElementById('proproducts').value;
    const requirements = document.getElementById('prorequirements').value;

    // Send email using EmailJS
    emailjs.send("service_in1op4i", "template_3i3mgjq", {
        name: name,
        email: email,
        phone: phone,
        state: state,
        products: products,
        requirements: requirements
    })
        .then(function (response) {
            swal("Success!", "Your enquiry has been sent successfully!", "success");
            document.getElementById('proenquiryForm').reset();
            prorefreshCaptcha();  // Regenerate new CAPTCHA
        }, function (error) {
            swal("Error!", "Failed to send enquiry. Please try again.", "error");
        });
});



