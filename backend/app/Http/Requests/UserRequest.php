<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userId = $this->route('user') ? $this->route('user')->id : null;
        $isUpdate = $userId !== null;
        
        $rules = [
            'name' => ['required', 'string', 'max:191'],
            'username' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-zA-Z0-9_]+$/',
                Rule::unique('users')->ignore($userId)
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:191',
                Rule::unique('users')->ignore($userId)
            ],
            'role_id' => ['required', 'exists:roles,id'],
            'is_active' => ['boolean'],
            'staff_id' => ['nullable', 'integer'],
            'ip_restrictions' => ['nullable', 'array'],
            'ip_restrictions.*' => ['nullable', 'string', 'ip'],
        ];
        
        // Password rules
        if ($isUpdate) {
            $rules['password'] = ['nullable', 'confirmed', Password::defaults()];
        } else {
            $rules['password'] = ['required', 'confirmed', Password::defaults()];
        }
        
        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Full name is required.',
            'username.required' => 'Username is required.',
            'username.regex' => 'Username can only contain letters, numbers, and underscores.',
            'username.unique' => 'This username is already taken.',
            'email.required' => 'Email address is required.',
            'email.email' => 'Please enter a valid email address.',
            'email.unique' => 'This email is already registered.',
            'role_id.required' => 'Please select a role.',
            'role_id.exists' => 'Selected role is invalid.',
            'password.required' => 'Password is required.',
            'password.confirmed' => 'Password confirmation does not match.',
            'ip_restrictions.*.ip' => 'One or more IP addresses are invalid.',
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Additional validation for IP restrictions
            if ($this->has('ip_restrictions')) {
                $ips = array_filter($this->ip_restrictions);
                foreach ($ips as $ip) {
                    if (!$this->isValidIpOrCidr($ip)) {
                        $validator->errors()->add('ip_restrictions', "'{$ip}' is not a valid IP address or CIDR notation.");
                    }
                }
            }
        });
    }

    /**
     * Check if IP is valid (including CIDR notation).
     */
    private function isValidIpOrCidr(string $ip): bool
    {
        // Check for single IP
        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            return true;
        }

        // Check for CIDR notation
        if (strpos($ip, '/') !== false) {
            list($subnet, $mask) = explode('/', $ip);
            return filter_var($subnet, FILTER_VALIDATE_IP) && 
                   is_numeric($mask) && 
                   $mask >= 0 && 
                   $mask <= 32;
        }

        return false;
    }
}