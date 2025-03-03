"use client";
import { Form, Input, Button, Card, CardHeader, CardBody } from "@heroui/react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import React, { useState } from "react";
import { login } from "../functions/UserAPI";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(formData: FormData) {
    try {
      setIsLoading(true);
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;

      await login({ username, password });

      toast.success("Successfully logged in!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      window.location.href = "/";
    } catch (err) {
      let errorMessage = "An unexpected error occurred";

      if (err instanceof Error) {
        if (err.message.includes("401")) {
          errorMessage = "Invalid username or password";
        } else {
          errorMessage = err.message;
        }
      }

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
            Welcome Back
          </h2>
        </CardHeader>
        <Form className="mt-8 space-y-6" action={handleLogin}>
          <CardBody className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg">
                {error}
              </div>
            )}
            <div>
              <Input type="text" name="username" label="Username" required />
            </div>
            <div>
              <Input
                type="password"
                name="password"
                label="Password"
                required
              />
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
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-600">
                  Don&apos;t have an account?{" "}
                </span>
                <Button
                  variant="ghost"
                  className="text-sm text-green-600 hover:text-green-800"
                  onPress={() => (window.location.href = "/register")}
                >
                  Register now
                </Button>
              </div>
            </div>
          </CardBody>
        </Form>
      </Card>
    </div>
  );
}
