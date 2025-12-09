<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GoogleAuthController extends Controller
{
    /**
     * Handle Google OAuth login/registration.
     * 
     * Accepts a Google ID token from the frontend, verifies it with Google's servers,
     * and returns a Laravel API token for authenticated requests.
     */
    public function handleGoogleLogin(Request $request)
    {
        // Validate that credential is present
        $validated = $request->validate([
            'credential' => 'required|string',
        ], [
            'credential.required' => 'Google credential is required.',
        ]);

        // Verify the Google ID token
        $googleUser = $this->verifyGoogleToken($validated['credential']);

        if (!$googleUser) {
            return response()->json([
                'message' => 'Invalid Google token',
            ], 401);
        }

        // Extract user information from Google token
        $email = $googleUser['email'] ?? null;
        $name = $googleUser['name'] ?? null;
        $picture = $googleUser['picture'] ?? null;

        if (!$email) {
            return response()->json([
                'message' => 'Email not provided by Google.',
            ], 400);
        }

        // Check if user already exists in database
        $user = User::where('email', $email)->first();

        if (!$user) {
            // Create a new user if they don't exist
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make(Str::random(32)), // Random password since using OAuth
                'profile_pic' => $picture,
            ]);
        } else {
            // Update existing user's profile picture if they're logging in with Google
            // This ensures the profile picture stays up to date
            if ($picture && !$user->profile_pic) {
                $user->update(['profile_pic' => $picture]);
            }
        }

        // Generate API token for the user
        $token = $user->createToken('google_auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'user_id' => $user->user_id,
                'name' => $user->name,
                'email' => $user->email,
                'profile_pic' => $user->profile_pic,
            ],
        ], 200);
    }

    /**
     * Verify Google ID token with Google's token verification endpoint.
     * 
     * @param string $token The Google ID token from frontend
     * @return array|null The decoded token payload or null if invalid
     */
    private function verifyGoogleToken(string $token): ?array
    {
        try {
            // Google's token verification endpoint
            $googleClientId = config('auth.google_client_id');
            
            if (!$googleClientId) {
                \Log::error('GOOGLE_CLIENT_ID not configured');
                return null;
            }

            // Verify token using Google's tokeninfo endpoint
            $client = new \GuzzleHttp\Client([
                'verify' => false, // Disable SSL verification for development (Windows Laragon issue)
            ]);
            $response = $client->get('https://oauth2.googleapis.com/tokeninfo', [
                'query' => ['id_token' => $token],
            ]);

            $payload = json_decode($response->getBody(), true);

            // Verify the audience (client ID) matches
            if (($payload['aud'] ?? null) !== $googleClientId) {
                \Log::warning('Google token audience mismatch', [
                    'expected' => $googleClientId,
                    'received' => $payload['aud'] ?? null,
                ]);
                return null;
            }

            // Verify the token is not expired
            if ((int)($payload['exp'] ?? 0) < time()) {
                \Log::warning('Google token expired');
                return null;
            }

            return $payload;
        } catch (\Exception $e) {
            \Log::error('Google token verification failed', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
