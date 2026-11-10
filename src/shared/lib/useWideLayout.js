import { useEffect, useState } from 'react';

const WIDE_QUERY = '(min-width: 1024px)';

function readWide() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia(WIDE_QUERY).matches;
}

export function useWideLayout() {
  const [wide, setWide] = useState(readWide);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(WIDE_QUERY);
    function onChange() {
      setWide(media.matches);
    }
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return wide;
}
