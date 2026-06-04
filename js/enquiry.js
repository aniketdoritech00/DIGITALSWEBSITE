(function () {
    emailjs.init("lOGIFkCQD5VxJB4FP");
})();

function generateCaptcha() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let captcha = '';
    for (let i = 0; i < 4; i++) {
        captcha += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return captcha;
}

function displayCaptcha(captcha) {
    const captchaDisplay = document.getElementById('captchaDisplay');
    captchaDisplay.innerHTML = ''; 

    // Apply styles to each character
    for (let char of captcha) {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        span.style.transform = `rotate(${Math.random() * 30 - 15}deg)`;
        captchaDisplay.appendChild(span);
    }
}

// Set initial CAPTCHA
let captchaCode = generateCaptcha();
displayCaptcha(captchaCode);

function refreshCaptcha() {
    captchaCode = generateCaptcha();
    displayCaptcha(captchaCode);
}

document.getElementById('enquiryForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const captchaInput = document.getElementById('captchaInput').value;

    // Check if CAPTCHA matches
    if (captchaInput !== captchaCode) {
        swal("Error!", "Incorrect CAPTCHA. Please try again.", "error");
        //refreshCaptcha();  // Regenerate new CAPTCHA
        return; 
    }
    

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const state = document.getElementById('state').value;
    const products = document.getElementById('products').value;
    const requirements = document.getElementById('requirements').value;


    emailjs.send("service_yej7rfp", "template_u9ypfxu", {
        name: name,
        email: email,
        phone: phone,
        state: state,
        products: products,
        requirements: requirements
    })
        .then(function (response) {
            swal("Success!", "Your enquiry has been sent successfully!", "success");
            document.getElementById('enquiryForm').reset();
            refreshCaptcha(); 
        }, function (error) {
            swal("Error!", "Failed to send enquiry. Please try again.", "error");
        });
});