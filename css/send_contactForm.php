<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Capture form data
    $name = htmlspecialchars($_POST['name']);
    $phone = htmlspecialchars($_POST['phone']);
    $email = htmlspecialchars($_POST['email']);
    $message = htmlspecialchars($_POST['message']);
    
    //Create an instance; passing `true` enables exceptions
    $mail = new PHPMailer(true);

    try {
        //Server settings
        //$mail->SMTPDebug = SMTP::DEBUG_SERVER;               
        $mail->isSMTP();                                      
        $mail->Host       = 'smtp.office365.com';             //Set the SMTP server to send through (Outlook/Office 365)
        $mail->SMTPAuth   = true;                             //Enable SMTP authentication
        $mail->Username   = 'your_outlook_email@outlook.com'; //SMTP username (your Outlook email)
        $mail->Password   = 'your_password';                  //SMTP password (your Outlook password or app password if 2FA is enabled)
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;   //Enable TLS encryption
        $mail->Port       = 587;                              //TCP port to connect to (TLS uses 587)

        //Recipients
        $mail->setFrom($email, $name);                       
        $mail->addAddress('recipient@example.com');           

        //Content
        $mail->isHTML(true);                                  //Set email format to HTML
        $mail->Subject = 'New Message from Website Contact Form';
        $mail->Body    = "
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> $name</p>
            <p><strong>Phone:</strong> $phone</p>
            <p><strong>Email:</strong> $email</p>
            <p><strong>Message:</strong> $message</p>
        ";
        $mail->AltBody = "Name: $name\nPhone: $phone\nEmail: $email\nMessage: $message"; //Plain text version for non-HTML mail clients

        $mail->send();
        echo 'Message has been sent successfully!';
    } catch (Exception $e) {
        echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
    }
} else {
    echo "Invalid request!";
}
?>
