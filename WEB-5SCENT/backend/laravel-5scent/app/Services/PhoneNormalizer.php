<?php

namespace App\Services;

class PhoneNormalizer
{
    /**
     * Normalize phone number to +62 format
     * 
     * @param string|null $phone
     * @return string|null
     */
    public static function normalize(?string $phone): ?string
    {
        if (empty($phone)) {
            return null;
        }

        // Remove any whitespace
        $phone = trim($phone);

        if (empty($phone)) {
            return null;
        }

        // If already starts with +62, return as is
        if (str_starts_with($phone, '+62')) {
            return $phone;
        }

        // If starts with 0, replace with +62
        if (str_starts_with($phone, '0')) {
            return '+62' . substr($phone, 1);
        }

        // If starts with 62 (without +), add +
        if (str_starts_with($phone, '62')) {
            return '+' . $phone;
        }

        // For any other format, try to add +62 prefix
        // but only if it looks like it could be a phone number
        if (preg_match('/^\d+$/', $phone)) {
            return '+62' . $phone;
        }

        // Return as-is to avoid losing data
        return $phone;
    }
}
