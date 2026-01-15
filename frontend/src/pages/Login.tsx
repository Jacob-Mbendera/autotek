import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../store/api/authApi';
import { useAppDispatch } from '../store/types';
import { setUser } from '../store/slices/authSlice';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { H1, Body } from '../components/ui/Typography';
import { LogIn } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await login(formData).unwrap();
      dispatch(setUser({ user: result.user, token: result.token }));
      navigate('/');
    } catch (err: any) {
      setError(err.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card variant="md" className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <LogIn className="h-6 w-6 text-teal-600" />
          <H1 className="text-2xl">Login</H1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="Enter your email"
          />

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            placeholder="Enter your password"
          />

          <Button
            type="submit"
            variant="primary"
            size="default"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Body className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-600 hover:text-teal-700 font-medium">
              Register here
            </Link>
          </Body>
        </div>
      </Card>
    </div>
  );
};
