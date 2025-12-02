/**
 * Register Page
 *
 * User registration form with name, email, password, and confirmation.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { getErrorMessage } from '../utils/helpers';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');

  const registerMutation = useRegister();

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name || !email || !password || !passwordConfirmation) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await registerMutation.mutateAsync({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            LinkedIn Automation
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Name Input */}
          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            autoComplete="name"
            required
          />

          {/* Email Input */}
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
            required
          />

          {/* Password Input */}
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />

          {/* Password Confirmation Input */}
          <Input
            label="Confirm Password"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={registerMutation.isPending}
          >
            Create Account
          </Button>

          {/* Login Link */}
          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link
              to="/login"
              className="text-linkedin hover:text-linkedin-dark font-medium"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
