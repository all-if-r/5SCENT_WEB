<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function update(Request $request)
    {
        $user = $request->user();

        // Debug logging - show EVERYTHING
        error_log('[Profile Update] === NEW REQUEST ===');
        error_log('Content-Type: ' . $request->header('Content-Type'));
        error_log('Method: ' . $request->method());
        error_log('User ID: ' . ($user?->user_id ?? 'NOT AUTHENTICATED'));
        error_log('Has name: ' . ($request->has('name') ? 'YES' : 'NO'));
        error_log('Has email: ' . ($request->has('email') ? 'YES' : 'NO'));
        error_log('Name value: "' . ($request->input('name') ?? 'NULL') . '"');
        error_log('Email value: "' . ($request->input('email') ?? 'NULL') . '"');
        error_log('All input: ' . json_encode($request->all()));
        
        \Log::info('[Profile Update] New request received', [
            'user_id' => $user?->user_id,
            'content_type' => $request->header('Content-Type'),
            'all_input' => $request->all(),
            'all_files' => $request->allFiles(),
            'method' => $request->method(),
            'has_name' => $request->has('name'),
            'has_email' => $request->has('email'),
            'raw_name' => $request->input('name'),
            'raw_email' => $request->input('email'),
        ]);

        // If user not authenticated
        if (!$user) {
            \Log::error('[Profile Update] User not authenticated');
            error_log('[Profile Update] User not authenticated');
            return response()->json([
                'message' => 'Unauthenticated',
                'errors' => ['auth' => ['You must be logged in']]
            ], 401);
        }

        $rules = [
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:user,email,' . $user->user_id . ',user_id',
            'phone' => 'nullable|string|max:20',
            'address_line' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'province' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'profile_pic' => 'nullable|image|mimes:jpeg,png,jpg',
            'profile_pic_filename' => 'nullable|string|max:500',
        ];

        error_log('[Profile Update] About to validate with rules: ' . json_encode($rules));

        try {
            $validated = $request->validate($rules);
            error_log('[Profile Update] Validation PASSED successfully');
            \Log::info('[Profile Update] Validation passed', [
                'validated_data' => $validated,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            error_log('[Profile Update] Validation CAUGHT EXCEPTION');
            $errors = $e->errors();
            error_log('Validation errors: ' . json_encode($errors));
            \Log::error('[Profile Update] Validation failed', [
                'errors' => $errors,
            ]);
            
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $errors
            ], 422);
        } catch (\Exception $e) {
            error_log('[Profile Update] CAUGHT OTHER EXCEPTION: ' . $e->getMessage());
            return response()->json([
                'message' => 'An error occurred: ' . $e->getMessage(),
                'errors' => []
            ], 500);
        }

        // Phone validation only if provided
        if ($request->filled('phone')) {
            $phone = trim($validated['phone'] ?? '');
            if (!empty($phone) && !preg_match('/^\+62[0-9]{8,}$/', $phone)) {
                \Log::warning('[Profile Update] Invalid phone format', [
                    'phone' => $phone,
                ]);
                return response()->json([
                    'message' => 'Phone number must start with +62 and have at least 8 digits after the country code.',
                    'errors' => ['phone' => ['Phone number must start with +62 and have at least 8 digits after the country code.']]
                ], 422);
            }
        }

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
        ];
        
        // Handle nullable fields
        $nullableFields = ['address_line', 'district', 'city', 'province', 'postal_code'];
        foreach ($nullableFields as $field) {
            $updateData[$field] = $validated[$field] ?? null;
        }

        // Handle profile picture upload
        if ($request->hasFile('profile_pic')) {
            // Validate file type
            $file = $request->file('profile_pic');
            $mimeType = $file->getMimeType();
            if (!in_array($mimeType, ['image/jpeg', 'image/jpg', 'image/png'])) {
                return response()->json([
                    'message' => 'Only JPG and PNG image files are allowed for profile photos.',
                    'errors' => ['profile_pic' => ['Only JPG and PNG image files are allowed for profile photos.']]
                ], 422);
            }
            
            // Delete old profile picture if exists
            if ($user->profile_pic && !str_contains($user->profile_pic, 'profile_pics')) {
                // Only delete if stored in Laravel storage, not in Next.js public folder
                Storage::disk('public')->delete($user->profile_pic);
            }
            
            $path = $file->store('profiles', 'public');
            $updateData['profile_pic'] = $path;
        } elseif ($request->has('profile_pic_filename') && $request->filled('profile_pic_filename')) {
            // Use filename from Next.js upload (saved to public/profile_pics)
            // Store only the filename, not the full path
            $filename = $validated['profile_pic_filename'];
            
            // Validate filename format (must be user_id_timestamp.ext)
            if (!preg_match('/^\d+_\d{12}\.(jpg|jpeg|png)$/i', $filename)) {
                return response()->json([
                    'message' => 'Invalid profile picture filename format.',
                    'errors' => ['profile_pic_filename' => ['Invalid profile picture filename format.']]
                ], 422);
            }
            
            // Store only filename - frontend will prepend /profile_pics/
            $updateData['profile_pic'] = $filename;
        }

        $user->update($updateData);
        
        // Refresh the user model to get updated data
        $user->refresh();

        \Log::info('[Profile Update] Update successful', [
            'user_id' => $user->user_id,
            'updated_data' => $updateData,
        ]);

        return response()->json($user);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect'
            ], 400);
        }

        // Additional password complexity check
        $password = $validated['password'];
        $errors = [];
        
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter.';
        }
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'Password must contain at least one lowercase letter.';
        }
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number.';
        }
        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            $errors[] = 'Password must contain at least one symbol.';
        }

        if (!empty($errors)) {
            return response()->json([
                'message' => implode(' ', $errors)
            ], 400);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json(['message' => 'Password changed successfully']);
    }

    public function deleteProfilePicture(Request $request)
    {
        $user = $request->user();

        // Delete file if it's in profile_pics directory
        if ($user->profile_pic) {
            if (!str_contains($user->profile_pic, 'profile_pics')) {
                // Old Laravel storage file
                Storage::disk('public')->delete($user->profile_pic);
            }
            // Note: Next.js public files can be manually deleted from filesystem if needed
        }

        // Set profile_pic to null
        $user->update(['profile_pic' => null]);

        return response()->json(['message' => 'Profile picture removed successfully']);
    }
}
