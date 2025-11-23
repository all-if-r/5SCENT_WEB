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

        $rules = [
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:user,email,' . $user->user_id . ',user_id',
            'address_line' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'province' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'profile_pic' => 'nullable|image|mimes:jpeg,png,jpg',
            'profile_pic_path' => 'nullable|string|max:500',
        ];
        
        // Only validate phone regex if phone is provided and not empty
        if ($request->has('phone') && $request->filled('phone')) {
            $rules['phone'] = 'required|string|max:20|regex:/^\+62[0-9]{8,}$/';
        } else {
            $rules['phone'] = 'nullable|string|max:20';
        }

        $messages = [
            'phone.regex' => 'Phone number must start with +62 and have at least 8 digits after the country code.',
            'profile_pic.image' => 'The profile picture must be an image file.',
            'profile_pic.mimes' => 'Only JPG and PNG image files are allowed for profile photos.',
            'profile_pic_path.string' => 'The profile picture path must be a valid string.',
            'profile_pic_path.max' => 'The profile picture path is too long.',
        ];

        try {
            $validated = $request->validate($rules, $messages);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
        ];
        
        // Handle phone - set to null if empty, otherwise use validated value
        if ($request->has('phone')) {
            $updateData['phone'] = $request->filled('phone') ? $validated['phone'] : null;
        }
        
        // Handle nullable fields
        $nullableFields = ['address_line', 'district', 'city', 'province', 'postal_code'];
        foreach ($nullableFields as $field) {
            if ($request->has($field)) {
                $updateData[$field] = $request->filled($field) ? $validated[$field] : null;
            }
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
        } elseif ($request->has('profile_pic_path') && $request->filled('profile_pic_path')) {
            // Use path from Next.js upload (saved to public/profile_pics)
            // Validate the path format
            $path = $validated['profile_pic_path'];
            if (!str_starts_with($path, 'profile_pics/')) {
                return response()->json([
                    'message' => 'Invalid profile picture path format.',
                    'errors' => ['profile_pic_path' => ['Invalid profile picture path format.']]
                ], 422);
            }
            
            // Extract filename to check if old file should be deleted
            $filename = basename($path);
            if ($user->profile_pic && str_contains($user->profile_pic, 'profile_pics')) {
                $oldFilename = basename($user->profile_pic);
                // Old file deletion is handled by Next.js upload route
            }
            
            $updateData['profile_pic'] = $path;
        }

        $user->update($updateData);
        
        // Refresh the user model to get updated data
        $user->refresh();

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
}
