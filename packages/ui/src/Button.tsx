import * as React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

export const Button: React.FC<Props> = ({ variant = 'primary', style, ...rest }) => {
  const base: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid transparent',
    cursor: 'pointer',
    fontSize: 14,
  }
  const styles: Record<string, React.CSSProperties> = {
    primary: { ...base, background: '#0ea5e9', color: 'white' },
    secondary: { ...base, background: '#f1f5f9', color: '#0f172a', borderColor: '#e2e8f0' },
  }
  return <button {...rest} style={{ ...styles[variant], ...style }} />
}

