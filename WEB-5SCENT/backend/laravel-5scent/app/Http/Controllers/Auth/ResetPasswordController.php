<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ResetPasswordController extends Controller
{
    /**
     * Reset the user's password.
     */
    public function reset(Request $request)
    {
        Log::info('=== PASSWORD RESET ATTEMPT STARTED ===');
        Log::info('Reset request data: ' . json_encode($request->all()));
        
        // Validate the input
        try {
            $validated = $request->validate([
                'token' => 'required',
                'email' => 'required|email',
                'password' => 'required|confirmed|min:8',
            ], [
                'token.required' => 'Reset token is required.',
                'email.required' => 'Email is required.',
                'email.email' => 'Please enter a valid email address.',
                'password.required' => 'Password is required.',
                'password.confirmed' => 'Passwords do not match.',
                'password.min' => 'Password must be at least 8 characters.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('PASSWORD RESET: Validation failed - ' . json_encode($e->errors()));
            throw $e;
        }

        $email = $validated['email'];
        $token = $validated['token'];

        Log::info('PASSWORD RESET: Validation passed for email: ' . $email . ', token: ' . substr($token, 0, 10) . '...');

        try {
            // Check if the reset token exists and is not expired
            Log::info('PASSWORD RESET: Looking for token in database...');
            $resetRecord = DB::table('password_reset_tokens')
                ->where('email', $email)
                ->where('token', $token)
                ->first();

            if (!$resetRecord) {
                Log::warning('PASSWORD RESET: Token not found for email: ' . $email);
                return response()->json([
                    'message' => 'Password reset link has expired. Please request a new one.',
                ], 410);
            }

            Log::info('PASSWORD RESET: Token found, checking expiry...');

            // Check if token has expired (1 minute)
            // Use Carbon for proper timezone handling
            $tokenCreatedAtCarbon = \Carbon\Carbon::parse($resetRecord->created_at);
            $expiresAt = $tokenCreatedAtCarbon->addMinutes(1);
            $now = \Carbon\Carbon::now();

            Log::info('PASSWORD RESET: Token created at: ' . $tokenCreatedAtCarbon . ', Expires at: ' . $expiresAt . ', Current time: ' . $now);

            if ($now->greaterThan($expiresAt)) {
                Log::warning('PASSWORD RESET: Token expired for email: ' . $email);
                DB::table('password_reset_tokens')->where('email', $email)->delete();
                return response()->json([
                    'message' => 'Password reset link has expired. Please request a new one.',
                ], 410);
            }

            // Find the user
            Log::info('PASSWORD RESET: Looking for user with email: ' . $email);
            $user = User::where('email', $email)->first();

            if (!$user) {
                Log::warning('PASSWORD RESET: User not found for email: ' . $email);
                return response()->json([
                    'message' => 'User not found.',
                ], 400);
            }

            Log::info('PASSWORD RESET: User found - ID: ' . $user->user_id . ', updating password...');

            // Update the password
            $user->password = Hash::make($validated['password']);
            $user->save();

            Log::info('PASSWORD RESET: Password updated for user ID: ' . $user->user_id);

            // Delete the reset token
            DB::table('password_reset_tokens')->where('email', $email)->delete();

            Log::info('PASSWORD RESET: Token deleted, password reset successfully for email: ' . $email);

            return response()->json([
                'message' => 'Password has been reset successfully.',
            ], 200);

        } catch (\Exception $e) {
            Log::error('PASSWORD RESET: Exception occurred - ' . $e->getMessage());
            Log::error('PASSWORD RESET: Stack trace - ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'An error occurred while resetting your password.',
            ], 500);
        }
    }
}
