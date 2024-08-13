import { ReactNode } from 'react';

export interface ButtonProps {
    submits?: boolean;

    loading?: boolean;
    disabled?: boolean;

    children: ReactNode;

    onClick?: () => void;
}

export function Button({
    submits,
    loading,
    disabled,
    children,
    onClick,
}: ButtonProps) {
    return (
        <button
            type={submits ? 'submit' : 'button'}
            onClick={
                loading || disabled
                    ? undefined
                    : event => {
                          if (onClick) {
                              event.stopPropagation();
                              event.preventDefault();
                              onClick();
                          }
                      }
            }
            disabled={disabled || loading}>
            {children}!
        </button>
    );
}
