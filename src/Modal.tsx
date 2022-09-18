import ReactDom from "react-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import "./css/modal.css";

export interface ModalProps {
	isOpen: boolean;
	onClose: any;
	children: any;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (isOpen) {
				switch (e.key) {
					case "Escape": {
						e.preventDefault();
						onClose();
					}
				}
			}
		};

		window.addEventListener("keydown", handler);
		return () => {
			window.removeEventListener("keydown", handler);
		};
	}, [isOpen]);

	return (
		<AnimatePresence mode="wait">
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="overflow-y-scroll flex items-center justify-center w-screen h-screen backdrop-blur-lg fixed top-0 left-0 z-[1000]"
				>
					<button
						className="w-full h-full z-[500] absolute top-0 left-0"
						onClick={onClose}
					/>
					<motion.div
						initial={{ x: -100 }}
						animate={{ x: 0 }}
						exit={{ x: 100 }}
						className="relative flex flex-col space-y-4 bg-white p-16 rounded-md border-[1px] shadow-lg sm:w-[40%] w-[80%] h-fit z-[600]"
					>
						{children}
						<motion.button
							whileHover={{ scale: 0.95, rotate: 90 }}
							whileTap={{ scale: 0.9, rotate: 180 }}
							onClick={onClose}
							className="absolute p-0 m-0 font-bold text-white bg-red-500 rounded-full top-2 right-4"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={1.5}
								stroke="currentColor"
								className="w-10 h-10"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</motion.button>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

export type ModalReturn = [() => void, JSX.Element];

export function useModal(contents: (props: ModalProps) => JSX.Element): ModalReturn {
	const [isOpen, setIsOpen] = useState(false);
	const onClose = () => {
		setIsOpen(false);
	};
	return [
		() => setIsOpen(true),
		<Modal
			isOpen={isOpen}
			onClose={onClose}
		>
			{contents({ isOpen, onClose, children: null })}
		</Modal>,
	];
}

export default Modal;
