<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ForgotPasswordController extends Controller
{
    /**
     * Send a reset link to the given user.
     */
    public function sendResetLinkEmail(Request $request)
    {
        Log::info('=== PASSWORD RESET REQUEST STARTED ===');
        Log::info('Request data: ' . json_encode($request->all()));

        try {
            // Validate the email
            $validated = $request->validate([
                'email' => [
                    'required',
                    'email',
                    'exists:user,email',  // Ensure email exists in user table
                ],
            ], [
                'email.required' => 'Email is required.',
                'email.email' => 'Please enter a valid email address.',
                'email.exists' => 'If this email is registered, a reset link has been sent.',
            ]);

            $email = $validated['email'];
            Log::info('PASSWORD RESET: Email validation passed for: ' . $email);

            // Find the user
            $user = User::where('email', $email)->first();
            
            if (!$user) {
                Log::warning('PASSWORD RESET: User not found for email: ' . $email);
                return response()->json([
                    'message' => 'If this email is registered, a reset link has been sent.',
                ], 200);
            }

            Log::info('PASSWORD RESET: User found - ID: ' . $user->user_id . ', Name: ' . $user->name);

            // Generate a unique reset token
            $token = Str::random(64);
            Log::info('PASSWORD RESET: Generated token: ' . substr($token, 0, 10) . '...');
            
            // Create a new password reset token without deleting existing ones
            // This allows users to request multiple reset links if needed
            $insertResult = DB::table('password_reset_tokens')->insert([
                'email' => $email,
                'token' => $token,
                'created_at' => now(),
            ]);

            Log::info('PASSWORD RESET: Token insert result: ' . ($insertResult ? 'success' : 'failed'));

            // Verify the token was inserted
            $checkToken = DB::table('password_reset_tokens')->where('email', $email)->first();
            if ($checkToken) {
                Log::info('PASSWORD RESET: Token verified in database - Created at: ' . $checkToken->created_at);
            } else {
                Log::error('PASSWORD RESET: Token NOT found in database after insert!');
            }

            // Build reset URL
            $resetUrl = config('app.frontend_url') . '/reset-password?token=' . $token . '&email=' . urlencode($email);
            Log::info('PASSWORD RESET: Reset URL: ' . $resetUrl);

            // Send email using Mail facade with Mailable
            try {
                Log::info('PASSWORD RESET: Attempting to send email via Mail facade...');
                Mail::to($email)->send(new ResetPasswordMail($user, $resetUrl));
                Log::info('PASSWORD RESET: Email sent successfully via Mail facade');
            } catch (\Exception $e) {
                Log::error('PASSWORD RESET: Mail send error - ' . $e->getMessage());
                Log::error('PASSWORD RESET: Mail error trace - ' . $e->getTraceAsString());
                // Continue anyway - log the error but don't fail the request
            }

            // Return success response
            return response()->json([
                'message' => 'If this email is registered, a reset link has been sent.',
            ], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('PASSWORD RESET: Validation error - ' . json_encode($e->errors()));
            throw $e;
        } catch (\Exception $e) {
            Log::error('PASSWORD RESET: ERROR - ' . $e->getMessage());
            Log::error('PASSWORD RESET: Stack trace - ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'If this email is registered, a reset link has been sent.',
            ], 200);
        }
    }
}
