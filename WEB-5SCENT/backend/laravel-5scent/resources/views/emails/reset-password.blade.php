<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #000; color: #fff; padding: 20px; text-align: center; }
        .content { padding: 20px; border: 1px solid #ddd; }
        .button { display: inline-block; background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>5SCENT</h1>
        </div>
        <div class="content">
            <p>Hello {{ $user->name }},</p>
            
            <p>You have requested to reset your password. Click the button below to proceed:</p>
            
            <div style="text-align: center;">
                <a href="{{ $resetUrl }}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <p>{{ $resetUrl }}</p>
            
            <p>This password reset link will expire in 24 hours.</p>
            
            <p>If you did not request a password reset, you can safely ignore this email.</p>
            
            <hr>
            
            <p>Best regards,<br>5SCENT Team</p>
        </div>
        <div class="footer">
            <p>&copy; 2025 5SCENT. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
