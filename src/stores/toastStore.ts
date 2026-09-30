import { create } from 'zustand';

interface VisibleToast {
	id: number;
	message: string;
}

interface ToastState {
	visibleToast: VisibleToast | null;
	showToast: (message: string) => void;
	hideToast: () => void;
}

let lastShownToastID = 0;

export const useToastStore = create<ToastState>()(set => ({
	visibleToast: null,

	showToast(message: string) {
		lastShownToastID += 1;
		set({ visibleToast: { id: lastShownToastID, message } });
	},

	hideToast() {
		set({ visibleToast: null });
	},
}));
