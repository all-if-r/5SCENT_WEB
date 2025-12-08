<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'Poppins', 'Arial', sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 20px;
            color: #000;
        }
        
        .header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #000;
        }
        
        .logo {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
            font-family: 'Poppins', 'Arial', sans-serif;
        }

        .sales-reports-title {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 12px;
            font-family: 'Poppins', 'Arial', sans-serif;
        }
        
        .meta {
            font-size: 11px;
            line-height: 1.6;
        }
        
        .meta p {
            margin: 4px 0;
        }
        
        h2 {
            margin-top: 20px;
            margin-bottom: 12px;
            font-size: 14px;
            font-weight: 600;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            font-size: 11px;
        }
        
        thead {
            background-color: #f5f5f5;
        }
        
        th {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }
        
        td.number {
            text-align: right;
        }

        tr.total-row {
            background-color: #f0f0f0;
        }

        tr.total-row td {
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">5SCENT</div>
        <div class="sales-reports-title">SALES REPORTS</div>
        <div class="meta">
            <p>Exported by: {{ $adminName }}</p>
            <p>Generated at: {{ $generatedAt->format('d-m-Y H:i') }}</p>
        </div>
    </div>

    <!-- Daily Sales -->
    <h2>Daily Sales</h2>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Avg Revenue</th>
            </tr>
        </thead>
        <tbody>
            @php
                $dailyTotalOrders = 0;
                $dailyTotalRevenue = 0;
            @endphp
            @foreach ($daily as $row)
            <tr>
                <td>{{ $row['date'] }}</td>
                <td class="number">{{ $row['orders'] }}</td>
                <td class="number">{{ format_rupiah($row['revenue']) }}</td>
                <td class="number">{{ format_rupiah($row['avg_revenue']) }}</td>
            </tr>
            @php
                $dailyTotalOrders += $row['orders'];
                $dailyTotalRevenue += $row['revenue'];
            @endphp
            @endforeach
            <tr class="total-row">
                <td>Total (Daily)</td>
                <td class="number">{{ $dailyTotalOrders }}</td>
                <td class="number">{{ format_rupiah($dailyTotalRevenue) }}</td>
                <td class="number">{{ format_rupiah($dailyTotalOrders > 0 ? $dailyTotalRevenue / $dailyTotalOrders : 0) }}</td>
            </tr>
        </tbody>
    </table>

    <!-- Weekly Sales -->
    <h2>Weekly Sales</h2>
    <table>
        <thead>
            <tr>
                <th>Week</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Avg Revenue</th>
            </tr>
        </thead>
        <tbody>
            @php
                $weeklyTotalOrders = 0;
                $weeklyTotalRevenue = 0;
            @endphp
            @foreach ($weekly as $row)
            <tr>
                <td>{{ $row['date'] }}</td>
                <td class="number">{{ $row['orders'] }}</td>
                <td class="number">{{ format_rupiah($row['revenue']) }}</td>
                <td class="number">{{ format_rupiah($row['avg_revenue']) }}</td>
            </tr>
            @php
                $weeklyTotalOrders += $row['orders'];
                $weeklyTotalRevenue += $row['revenue'];
            @endphp
            @endforeach
            <tr class="total-row">
                <td>Total (Weekly)</td>
                <td class="number">{{ $weeklyTotalOrders }}</td>
                <td class="number">{{ format_rupiah($weeklyTotalRevenue) }}</td>
                <td class="number">{{ format_rupiah($weeklyTotalOrders > 0 ? $weeklyTotalRevenue / $weeklyTotalOrders : 0) }}</td>
            </tr>
        </tbody>
    </table>

    <!-- Monthly Sales -->
    <h2>Monthly Sales</h2>
    <table>
        <thead>
            <tr>
                <th>Month</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Avg Revenue</th>
            </tr>
        </thead>
        <tbody>
            @php
                $monthlyTotalOrders = 0;
                $monthlyTotalRevenue = 0;
            @endphp
            @foreach ($monthly as $row)
            <tr>
                <td>{{ $row['date'] }}</td>
                <td class="number">{{ $row['orders'] }}</td>
                <td class="number">{{ format_rupiah($row['revenue']) }}</td>
                <td class="number">{{ format_rupiah($row['avg_revenue']) }}</td>
            </tr>
            @php
                $monthlyTotalOrders += $row['orders'];
                $monthlyTotalRevenue += $row['revenue'];
            @endphp
            @endforeach
            <tr class="total-row">
                <td>Total (Monthly)</td>
                <td class="number">{{ $monthlyTotalOrders }}</td>
                <td class="number">{{ format_rupiah($monthlyTotalRevenue) }}</td>
                <td class="number">{{ format_rupiah($monthlyTotalOrders > 0 ? $monthlyTotalRevenue / $monthlyTotalOrders : 0) }}</td>
            </tr>
        </tbody>
    </table>

    <!-- Yearly Sales -->
    <h2>Yearly Sales</h2>
    <table>
        <thead>
            <tr>
                <th>Year</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Avg Revenue</th>
            </tr>
        </thead>
        <tbody>
            @php
                $yearlyTotalOrders = 0;
                $yearlyTotalRevenue = 0;
            @endphp
            @foreach ($yearly as $row)
            <tr>
                <td>{{ $row['date'] }}</td>
                <td class="number">{{ $row['orders'] }}</td>
                <td class="number">{{ format_rupiah($row['revenue']) }}</td>
                <td class="number">{{ format_rupiah($row['avg_revenue']) }}</td>
            </tr>
            @php
                $yearlyTotalOrders += $row['orders'];
                $yearlyTotalRevenue += $row['revenue'];
            @endphp
            @endforeach
            <tr class="total-row">
                <td>Total (Yearly)</td>
                <td class="number">{{ $yearlyTotalOrders }}</td>
                <td class="number">{{ format_rupiah($yearlyTotalRevenue) }}</td>
                <td class="number">{{ format_rupiah($yearlyTotalOrders > 0 ? $yearlyTotalRevenue / $yearlyTotalOrders : 0) }}</td>
            </tr>
        </tbody>
    </table>
</body>
</html>
