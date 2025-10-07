"use client";
import { toast, ToastContainer } from "react-toastify";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Form } from "@heroui/form";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "../functions/UserAPI";
import { RegisterData } from "../types/User";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    twitchUsername: "",
    password: "",
    confirmPassword: "",
  });
  const [validationError, setValidationError] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const router = useRouter();

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return "Password must contain at least one special character (!@#$%^&*)";
    }
    return null;
  };

  const validateUsername = (username: string): string | null => {
    if (username.length < 3 || username.length > 20) {
      return "Username must be between 3 and 20 characters long";
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return "Username can only contain letters, numbers, underscores and hyphens";
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError({});

    // Validate username
    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      setValidationError((prev) => ({ ...prev, username: usernameError }));
      return;
    }

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setValidationError((prev) => ({ ...prev, password: passwordError }));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setValidationError((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match",
      }));
      return;
    }

    const registerData: RegisterData = {
      username: formData.username,
      TwitchUsername: formData.twitchUsername,
      email: formData.email,
      password: formData.password,
    };

    try {
      setIsLoading(true);
      await register(registerData);
      toast.success("Account created successfully!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      router.push("/login");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <ToastContainer />
      <Card className="space-y-8 p-8 w-96 md:w-[500px]">
        <CardHeader className="flex flex-col space-y-5">
          <h2 className="text-3xl font-extrabold text-center bg-gradient-to-r from-green-500 to-lime-400 bg-clip-text text-transparent">
            Create Account
          </h2>
        </CardHeader>
        <Form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <CardBody className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg">
                {error}
              </div>
            )}
            <div>
              <Input
                type="text"
                name="username"
                label="Username"
                value={formData.username}
                onChange={handleChange}
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_-]+"
                title="Username can only contain letters, numbers, underscores and hyphens"
              />
              {validationError.username && (
                <p className="mt-1 text-xs text-red-500">
                  {validationError.username}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                3-20 characters, letters, numbers, underscores and hyphens only
              </p>
            </div>
            <div>
              <Input
                type="email"
                name="email"
                label="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Input
                type="text"
                name="twitchUsername"
                label="Kick Username"
                value={formData.twitchUsername}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                name="password"
                label="Password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                title="Password must be at least 8 characters long, contain uppercase and lowercase letters, numbers and special characters"
              />
              {validationError.password && (
                <p className="mt-1 text-xs text-red-500">
                  {validationError.password}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Minimum 8 characters, must include uppercase, lowercase, number
                and special character
              </p>
            </div>
            <div>
              <Input
                type="password"
                name="confirmPassword"
                label="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              {validationError.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">
                  {validationError.confirmPassword}
                </p>
              )}
            </div>
            <div>
              <Button
                type="submit"
                isLoading={isLoading}
                spinner={
                  <svg
                    className="animate-spin h-5 w-5 text-current"
                    fill="none"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      fill="currentColor"
                    />
                  </svg>
                }
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-600">
                  Already have an account?{" "}
                </span>
                <Button
                  variant="ghost"
                  className="text-sm text-green-600 hover:text-green-800"
                  onPress={() => router.push("/login")}
                >
                  Login now
                </Button>
              </div>
            </div>
          </CardBody>
        </Form>
      </Card>
    </div>
  );
}
