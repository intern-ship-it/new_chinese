<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Failed</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header bg-danger text-white">
                        <h4 class="mb-0">Payment Failed</h4>
                    </div>
                    <div class="card-body text-center">
                        <div class="mb-4">
                            <div class="text-danger" style="font-size: 4rem;">
                                X
                            </div>
                        </div>
                        
                        <h5>Payment was not successful</h5>
                        
                        <div class="alert alert-danger mt-4">
                            <strong>Details:</strong><br>
                            {{ $message ?? 'An error occurred during payment processing.' }}
                        </div>
                        
                        @if(isset($order_no))
                        <div class="alert alert-info">
                            Order No: {{ $order_no }}<br>
                            Error Code: {{ $error_code }}
                        </div>
                        @endif
                        
                        <div class="mt-4">
                            <a href="{{ route('payment.form') }}" class="btn btn-primary">
                                Try Again
                            </a>
                            <a href="/" class="btn btn-secondary">
                                Return to Home
                            </a>
                        </div>
                        
                        <div class="mt-4 text-muted small">
                            <p>If you continue to face issues, please contact support.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
	<script>
	setTimeout(function(){
		window.close();
	}, 3500);
	</script>
</body>
</html>