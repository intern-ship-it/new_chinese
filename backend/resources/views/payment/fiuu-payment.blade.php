<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FIUU Payment Integration - Sandbox</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">FIUU Payment Sandbox</h4>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-info">
                            <strong>Sandbox Mode Active</strong><br>
                            Merchant ID: {{ 'SB_graspsoftware' }}<br>
                            Using Test Environment
                        </div>

                        @if(session('error'))
                            <div class="alert alert-danger">
                                {{ session('error') }}
                            </div>
                        @endif

                        <form action="{{ route('payment.create') }}" method="POST">
                            @csrf
                            
                            <div class="mb-3">
                                <label for="amount" class="form-label">Amount (?)</label>
                                <input type="number" 
                                       class="form-control" 
                                       id="amount" 
                                       name="amount" 
                                       value="1" 
                                       min="1" 
                                       step="0.01" 
                                       required>
                                <div class="form-text">Test with minimum amount 1</div>
                            </div>

                            <div class="mb-3">
                                <label for="customer_name" class="form-label">Customer Name</label>
                                <input type="text" 
                                       class="form-control" 
                                       id="customer_name" 
                                       name="customer_name" 
                                       value="Test Customer" 
                                       required>
                            </div>

                            <div class="mb-3">
                                <label for="customer_email" class="form-label">Customer Email</label>
                                <input type="email" 
                                       class="form-control" 
                                       id="customer_email" 
                                       name="customer_email" 
                                       value="test@graspsoftwaresolutions.com" 
                                       required>
                            </div>

                            <div class="mb-3">
                                <label for="customer_phone" class="form-label">Customer Phone</label>
                                <input type="text" 
                                       class="form-control" 
                                       id="customer_phone" 
                                       name="customer_phone" 
                                       value="9876543210" 
                                       required>
                            </div>

                            <button type="submit" class="btn btn-primary w-100">
                                Proceed to FIUU Payment
                            </button>

                            <div class="mt-3 text-center">
                                <small class="text-muted">
                                    You will be redirected to FIUU sandbox payment page
                                </small>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="mt-4">
                    <h5>Test Credentials:</h5>
                    <div class="card">
                        <div class="card-body">
                            <p><strong>For Testing:</strong></p>
                            <ul>
                                <li>Use any test card number</li>
                                <li>Use any future expiry date</li>
                                <li>Use any CVV</li>
                                <li>Use test OTP: 123456</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>