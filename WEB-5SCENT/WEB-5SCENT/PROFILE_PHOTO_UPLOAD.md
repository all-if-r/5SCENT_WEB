# 📸 Profile Photo Upload Guide

Complete guide for implementing profile photo uploads in 5SCENT.

## Backend Implementation

### Storage Configuration

Profile photos are stored in `storage/app/public/profiles/`.

### Controller Method

The `ProfileController@update` method handles photo uploads:

```php
public function update(Request $request)
{
    $validated = $request->validate([
        'profile_picture' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        // ... other fields
    ]);

    if ($request->hasFile('profile_picture')) {
        // Delete old photo if exists
        if ($user->profile_picture) {
            Storage::disk('public')->delete($user->profile_picture);
        }
        
        // Store new photo
        $validated['profile_picture'] = $request->file('profile_picture')
            ->store('profiles', 'public');
    }

    $user->update($validated);
    return response()->json($user);
}
```

### Database

The `users` table has a `profile_picture` column that stores the file path.

## Frontend Implementation

### Component

Profile photo upload is handled in `components/profile/MyAccountTab.tsx`.

### Features

1. **Image Preview**: Shows current or selected image
2. **File Selection**: Click camera icon to select file
3. **Upload on Save**: Photo uploads when form is submitted
4. **Automatic Display**: Profile picture displays in navigation

### Code Example

```tsx
const [profilePicture, setProfilePicture] = useState<File | null>(null);
const [preview, setPreview] = useState<string | null>(
  user.profile_picture 
    ? `http://localhost:8000/storage/${user.profile_picture}` 
    : null
);

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    setProfilePicture(file);
    setPreview(URL.createObjectURL(file));
  }
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const formData = new FormData();
  
  if (profilePicture) {
    formData.append('profile_picture', profilePicture);
  }
  
  // ... other fields
  
  await api.put('/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

## File Requirements

- **Allowed formats**: JPEG, PNG, JPG, GIF
- **Max size**: 2MB
- **Storage location**: `storage/app/public/profiles/`

## Display Profile Picture

### In Navigation

```tsx
{user.profile_picture && (
  <img
    src={`http://localhost:8000/storage/${user.profile_picture}`}
    alt="Profile"
    className="w-8 h-8 rounded-full"
  />
)}
```

### In Profile Modal

```tsx
<img
  src={preview || '/placeholder-avatar.jpg'}
  alt="Profile"
  className="w-24 h-24 rounded-full object-cover"
/>
```

## Storage Link

Ensure storage link is created:

```bash
php artisan storage:link
```

This creates a symbolic link from `public/storage` to `storage/app/public`.

## Troubleshooting

### Image not displaying

1. Check storage link: `php artisan storage:link`
2. Verify file permissions: `chmod -R 775 storage`
3. Check file path in database
4. Verify image URL in browser

### Upload fails

1. Check file size (max 2MB)
2. Verify file format (JPEG, PNG, JPG, GIF)
3. Check storage permissions
4. Verify `Content-Type: multipart/form-data` header

### Old image not deleted

The controller automatically deletes old images when a new one is uploaded. If issues persist:

1. Check file permissions
2. Verify storage disk configuration
3. Manually delete old files if needed



