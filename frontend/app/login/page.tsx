"use client";
import { toast, ToastContainer } from "react-toastify";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Form } from "@heroui/form";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import "react-toastify/dist/ReactToastify.css";
import React, { useState, useEffect } from "react";
import { login, useGetProfile } from "../functions/UserAPI";
import { PatreonLoginButton } from "@/components/PatreonLoginButton";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: profile, isLoading: isProfileLoading } = useGetProfile();
  const router = useRouter();

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (!isProfileLoading && profile?.user) {
      router.push("/");
    }
  }, [profile, isProfileLoading, router]);

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
            <div className="space-y-4">
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

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-default-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background text-default-500">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Smart Patreon Button - Adapts based on user status */}
              <PatreonLoginButton />

              <div className="mt-4 text-center">
                <span className="text-sm text-default-600">
                  Don&apos;t have an account?{" "}
                </span>
                <Button
                  variant="light"
                  className="text-sm text-green-600 hover:text-green-700 font-semibold"
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
