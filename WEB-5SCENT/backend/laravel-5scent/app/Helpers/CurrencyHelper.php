<?php

if (!function_exists('formatRupiah')) {
    /**
     * Format number to Indonesian Rupiah currency format
     * 
     * @param float|int $amount
     * @return string
     */
    function formatRupiah($amount): string
    {
        if ($amount == 0) {
            return 'Rp0';
        }
        
        // Format with thousands separator (period) and no decimal places
        $formatted = number_format($amount, 0, ',', '.');
        
        return 'Rp' . $formatted;
    }
}

if (!function_exists('format_rupiah')) {
    /**
     * Format number to Indonesian Rupiah currency format (snake_case alias)
     * 
     * @param float|int $amount
     * @return string
     */
    function format_rupiah($amount): string
    {
        if ($amount == 0) {
            return 'Rp0';
        }
        
        // Format with thousands separator (period) and no decimal places
        $formatted = number_format($amount, 0, ',', '.');
        
        return 'Rp' . $formatted;
    }
}

