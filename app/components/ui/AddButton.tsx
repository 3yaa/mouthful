import { Plus } from "lucide-react";

interface AddButtonProps {
  onClick: () => void;
  isVisible: boolean;
}

export function AddButton({ onClick, isVisible }: AddButtonProps) {
  return (
    <div
      className={`fixed lg:bottom-8 lg:right-10 bottom-2 right-2 z-10
      lg:translate-y-0 transition-transform duration-300 ease-in-out
      ${isVisible ? "translate-y-0" : "translate-y-24"}`}
    >
      <button
        onClick={onClick}
        aria-label="Add"
        className="flex items-center justify-center w-14 h-14 lg:w-14 lg:h-14 rounded-full 
        bg-linear-to-br from-zinc-transparent to-zinc-800/60 
        hover:bg-linear-to-br hover:from-zinc-800/60 hover:to-transparent
        backdrop-blur-xl shadow-md shadow-black/20
        hover:scale-105 active:scale-95 
        transition-all duration-200 relative z-10 hover:cursor-pointer focus:outline-none"
      >
        <Plus className="w-5 h-5 text-zinc-300" />
      </button>
    </div>
  );
}
