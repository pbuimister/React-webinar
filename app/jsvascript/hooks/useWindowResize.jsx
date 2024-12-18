import { useCallback, useEffect } from 'react'

function useWindowResize(callback) {
  const memoizedCallback = useCallback(callback, [callback])

  useEffect(() => {
    const handleResize = () => {
      memoizedCallback()
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [memoizedCallback])
}

export default useWindowResize
