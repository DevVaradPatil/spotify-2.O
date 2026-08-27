import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        className={twMerge(
          `
       flex w-full rounded-md bg-surface-hover border border-transparent px-3 py-3 text-sm file:border-0 file:bg-transparent file:text-sm placeholder:text-content-subtle disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface
      `,
          className
        )}
        disabled={disabled}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
