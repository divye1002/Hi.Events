import {useMutation, useQueryClient} from "@tanstack/react-query";
import {authClient} from "../api/auth.client.ts";
import {useAuthStore} from "../stores/auth.store.ts";
import {GET_ME_QUERY_KEY} from "../queries/useGetMe.ts";

export const useLogout = () => {
    const authStore = useAuthStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            try {
                await authClient.logout();
            } catch (error) {
                // Even if the logout API call fails, we still want to clear local auth
                console.warn('Logout API call failed, but clearing local auth:', error);
            }
        },
        onSuccess: () => {
            // Clear auth store
            authStore.clearAuth();
            
            // Clear all React Query cache
            queryClient.clear();
            
            // Redirect to login
            if (typeof window !== 'undefined') {
                window.location.href = '/auth/login';
            }
        }
    });
};
