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

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'email' => 'sometimes|email|unique:user,email,' . $user->user_id . ',user_id',
            'phone' => 'nullable|string|max:20',
            'address_line' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'province' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'profile_pic' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $updateData = [];
        
        if ($request->has('name')) {
            $updateData['name'] = $validated['name'];
        }
        if ($request->has('email')) {
            $updateData['email'] = $validated['email'];
        }
        if ($request->has('phone')) {
            $updateData['phone'] = $validated['phone'];
        }
        if ($request->has('address_line')) {
            $updateData['address_line'] = $validated['address_line'];
        }
        if ($request->has('district')) {
            $updateData['district'] = $validated['district'];
        }
        if ($request->has('city')) {
            $updateData['city'] = $validated['city'];
        }
        if ($request->has('province')) {
            $updateData['province'] = $validated['province'];
        }
        if ($request->has('postal_code')) {
            $updateData['postal_code'] = $validated['postal_code'];
        }

        if ($request->hasFile('profile_pic')) {
            if ($user->profile_pic) {
                Storage::disk('public')->delete($user->profile_pic);
            }
            $path = $request->file('profile_pic')->store('profiles', 'public');
            $updateData['profile_pic'] = $path;
        }

        $user->update($updateData);

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

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json(['message' => 'Password changed successfully']);
    }
}
