import '../styles/global.css'
import type { AppProps } from 'next/app'

// Re-export the custom App component previously defined in components/_app_custom.tsx
import CustomApp from '@/components/_app_custom'

export default function App(props: AppProps) {
  return <CustomApp {...props} />
}