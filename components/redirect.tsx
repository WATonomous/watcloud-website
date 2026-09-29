'use client'

import { useEffect, type JSX } from 'react';
import { useRouter } from 'next/navigation';

const Redirect = ({
    to,
    delay_ms = 0,
    loading_indicator = null,
}: {
    to: string;
    delay_ms?: number;
    loading_indicator?: JSX.Element | null;
}) => {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
        router.replace(to); // replace the current route with the new route
    },  delay_ms);
  }, [router, to, delay_ms]);

  return loading_indicator;
};

export default Redirect;