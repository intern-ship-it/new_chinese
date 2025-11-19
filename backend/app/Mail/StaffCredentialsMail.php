<?php
// app/Mail/StaffCredentialsMail.php

namespace App\Mail;

use App\Models\Staff;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class StaffCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public $staff;
    public $user;
    public $password;
    public $isReset;

    public function __construct(Staff $staff, User $user, string $password, bool $isReset = false)
    {
        $this->staff = $staff;
        $this->user = $user;
        $this->password = $password;
        $this->isReset = $isReset;
    }

    public function build()
    {
        $subject = $this->isReset 
            ? 'Password Reset - Temple Management System' 
            : 'Welcome to Temple Management System';

        return $this->subject($subject)
                    ->view('emails.staff-credentials');
    }
}