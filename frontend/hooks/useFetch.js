import {useCallback, useEffect, useState} from 'react';

export function useFetch(fetcher, immediate = true) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(Boolean(immediate));
    const [error, setError] = useState(null);

    const run = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await fetcher();
            setData(result);
            return result;
        } catch (err) {
            const message = err?.message ?? 'Something went wrong';
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [fetcher]);

    useEffect(() => {
        if (immediate) {
            run();
        }
    }, [immediate, run]);

    return {data, isLoading, error, refetch: run};
}