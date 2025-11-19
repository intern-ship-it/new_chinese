<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Print Archanai Booking</title>
    
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <!-- App Config -->
    <script src="/config/app.config.js"></script>
    
    <!-- Core Scripts -->
    <script src="/js/core/api.js"></script>
    <script src="/js/core/temple.core.js"></script>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }

        #printContainer {
            max-width: 80mm;
            margin: 0 auto;
            background: white;
        }

        .ticket {
            background: white;
            padding: 15px;
            font-size: 12px;
        }

        .ticket-header {
            text-align: center;
            margin-bottom: 15px;
        }

        .temple-logo {
            width: 80px;
            height: auto;
            margin-bottom: 10px;
        }

        .temple-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .temple-name-secondary {
            font-size: 14px;
            margin-bottom: 5px;
        }

        .temple-address,
        .temple-phone {
            font-size: 11px;
            color: #666;
        }

        .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
        }

        .booking-info {
            margin: 10px 0;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
        }

        .ticket-item {
            display: flex;
            gap: 10px;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }

        .item-number {
            font-weight: bold;
            min-width: 25px;
        }

        .item-details {
            flex: 1;
        }

        .item-name {
            font-weight: bold;
            font-size: 14px;
        }

        .item-name-secondary {
            font-size: 11px;
            color: #666;
        }

        .deity-name {
            font-size: 11px;
            color: #0066cc;
            font-weight: 500;
        }

        .token-badge {
            display: inline-block;
            background: #f0f0f0;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            margin-top: 3px;
        }

        .item-price {
            text-align: right;
            font-size: 11px;
            min-width: 100px;
        }

        .rasi-section {
            margin: 15px 0;
        }

        .rasi-section h4 {
            font-size: 13px;
            margin-bottom: 10px;
        }

        .rasi-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
        }

        .rasi-table th,
        .rasi-table td {
            padding: 5px;
            border: 1px solid #ddd;
            text-align: left;
        }

        .rasi-table th {
            background: #f5f5f5;
            font-weight: bold;
        }

        .payment-method {
            text-align: center;
            font-size: 13px;
            margin: 10px 0;
        }

        .totals-section {
            margin: 10px 0;
        }

        .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
        }

        .discount-row {
            color: #28a745;
        }

        .balance-row {
            color: #dc3545;
        }

        .grand-total {
            font-size: 16px;
            font-weight: bold;
            padding-top: 8px;
            border-top: 2px solid #000;
            margin-top: 8px;
        }

        .ticket-footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
            color: #666;
        }

        .thank-you {
            margin-top: 5px;
            font-weight: bold;
            color: #000;
        }

        /* Separate Ticket Styles */
        .separate-ticket .item-main {
            text-align: center;
            padding: 20px 0;
            border: 3px solid #000;
            margin: 10px 0;
        }

        .item-name-large {
            font-size: 18px;
            font-weight: bold;
        }

        .item-name-secondary-large {
            font-size: 14px;
            margin-top: 5px;
        }

        .deity-section {
            text-align: center;
            padding: 15px 0;
            background: #f8f9fa;
            margin: 10px 0;
        }

        .deity-section h3 {
            font-size: 16px;
            font-weight: bold;
        }

        .token-section {
            text-align: center;
            padding: 15px 0;
        }

        .token-label {
            font-size: 13px;
        }

        .token-number-badge {
            display: inline-block;
            border: 2px solid #000;
            padding: 8px 20px;
            border-radius: 50%;
            font-size: 18px;
            font-weight: bold;
            margin-left: 10px;
        }

        .item-price-large {
            text-align: center;
            font-size: 14px;
            margin: 10px 0;
        }

        /* Error Styles */
        .error-container {
            text-align: center;
            padding: 40px;
        }

        .error-container h2 {
            color: #dc3545;
            margin-bottom: 15px;
        }

        .btn-close-window {
            margin-top: 20px;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }

        /* Print Styles */
        @media print {
            body {
                background: white;
                padding: 0;
            }

            #printContainer {
                max-width: none;
            }

            .page-break {
                page-break-before: always;
            }

            .ticket {
                page-break-after: auto;
            }
        }

        @page {
            size: 80mm auto;
            margin: 0;
        }
    </style>
</head>
<body>
    <div id="printContainer">
        <div style="text-align: center; padding: 40px;">
            <div class="spinner-border" role="status">
                <span class="sr-only">Loading...</span>
            </div>
            <p style="margin-top: 15px;">Loading booking data...</p>
        </div>
    </div>

    <!-- Print Script -->
    <script src="/js/pages/archanai/booking/print.js"></script>
    <script>
        $(document).ready(function() {
            TempleApp.init();
            setTimeout(function() {
                ArchanaiPrintPage.init();
            }, 500);
        });
    </script>
</body>
</html>