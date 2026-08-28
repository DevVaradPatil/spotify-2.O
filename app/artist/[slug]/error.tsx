"use client";

import Box from "@/components/Box";
import Button from "@/components/Button";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const Error: React.FC<ErrorProps> = ({ error, reset }) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Box className="h-full flex flex-col gap-y-4 items-center justify-center">
      <div className="text-neutral-300">Something went wrong.</div>
      <Button onClick={reset} className="w-fit px-6 py-2">
        Try again
      </Button>
    </Box>
  );
};

export default Error;
